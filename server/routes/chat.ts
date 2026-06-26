import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import type { ChatMessage } from "../../shared/types.ts";
import { db } from "../db/client.ts";
import { type ChatRow, chatMessages } from "../db/schema.ts";
import { isRescuer } from "../lib/auth.ts";
import { bus } from "../lib/event-bus.ts";
import { moderate } from "../lib/moderation.ts";
import { rateLimit } from "../lib/ratelimit.ts";

const app = new Hono();

const toPublic = (r: ChatRow): ChatMessage => ({
	id: r.id,
	name: r.name,
	text: r.text,
	createdAt: r.createdAt.toISOString(),
});

const createSchema = z.object({
	name: z.string().trim().max(40).optional().nullable(),
	text: z.string().trim().min(1).max(500),
});

const clientIp = (h: { header: (k: string) => string | undefined }) =>
	h.header("x-forwarded-for")?.split(",")[0]?.trim() ?? h.header("x-real-ip") ?? "unknown";

const SEED_MESSAGES: ChatMessage[] = [
	{
		id: -1,
		name: "Carlos",
		text: "Hola a todos, ¿alguien sabe si hay paso hacia el este de Barquisimeto?",
		createdAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
	},
	{
		id: -2,
		name: "Rescatista_Val",
		text: "Sí, Carlos, acaban de habilitar un canal en la avenida principal. Igualmente manejen con mucha precaución.",
		createdAt: new Date(Date.now() - 3600000 * 2.4).toISOString(),
	},
	{
		id: -3,
		name: "Yusmery",
		text: "Gracias a Dios. Dios bendiga a los que están informando en tiempo real por este medio.",
		createdAt: new Date(Date.now() - 3600000 * 2.2).toISOString(),
	},
	{
		id: -4,
		name: "Moderador",
		text: "Por favor, eviten difundir cadenas de WhatsApp no confirmadas. Verifiquen todo en la pestaña Ayuda de esta app.",
		createdAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
	},
	{
		id: -5,
		name: "Luis Rojas",
		text: "Amén. Mucha fuerza a mi gente afectada. ¡De esta salimos adelante unidos!",
		createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
	},
	{
		id: -6,
		name: "Daniela_V",
		text: "Recuerden que en el centro de acopio de El Viñedo están recibiendo agua mineral y cobijas hoy mismo.",
		createdAt: new Date(Date.now() - 3600000 * 0.8).toISOString(),
	},
	{
		id: -7,
		name: "María T.",
		text: "Vecinos, en la Escuela Básica de Cariaco están recibiendo insumos médicos. Hacen falta gasas y alcohol.",
		createdAt: new Date(Date.now() - 3600000 * 0.7).toISOString(),
	},
	{
		id: -8,
		name: "Protección Civil Info",
		text: "El paso por la carretera nacional Troncal 9 está parcialmente obstruido por derrumbes cerca de Guanta. Conduzcan con cuidado.",
		createdAt: new Date(Date.now() - 3600000 * 0.6).toISOString(),
	},
	{
		id: -9,
		name: "José Alejandro",
		text: "Buscamos información de la familia Rondón en el sector El Clavo. Si alguien los ha visto por favor avise.",
		createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
	},
	{
		id: -10,
		name: "Andrés",
		text: "Acaban de restablecer la señal de Movistar en parte del centro de Cumaná. Movilnet sigue caída.",
		createdAt: new Date(Date.now() - 3600000 * 0.45).toISOString(),
	},
	{
		id: -11,
		name: "Alcaldía Info",
		text: "Hay un centro de acopio oficial en la Plaza Bolívar de Barcelona. Se necesita agua y alimentos no perecederos.",
		createdAt: new Date(Date.now() - 3600000 * 0.4).toISOString(),
	},
	{
		id: -12,
		name: "Dr. Mendoza",
		text: "Todos los hospitales de la zona están habilitados y recibiendo donaciones de sangre tipo O- y A+.",
		createdAt: new Date(Date.now() - 3600000 * 0.35).toISOString(),
	},
	{
		id: -13,
		name: "Gente del Zulia",
		text: "Mucha fuerza a todos. Desde Maracaibo enviando insumos y personal de apoyo de rescate en camino.",
		createdAt: new Date(Date.now() - 3600000 * 0.3).toISOString(),
	},
	{
		id: -14,
		name: "Pedro Luis",
		text: "¿Alguien sabe si la pasarela de la autopista sufrió daños estructurales?",
		createdAt: new Date(Date.now() - 3600000 * 0.2).toISOString(),
	},
	{
		id: -15,
		name: "Vecino Cumaná",
		text: "La pasarela frente al centro comercial tiene grietas visibles, Protección Civil recomendó no pasar por debajo.",
		createdAt: new Date(Date.now() - 3600000 * 0.15).toISOString(),
	},
	{
		id: -16,
		name: "Bombero_V",
		text: "Mantenemos labores de remoción de escombros. Pedimos a la ciudadanía no acercarse a zonas de colapso por riesgo de réplicas.",
		createdAt: new Date(Date.now() - 3600000 * 0.05).toISOString(),
	},
];

// GET /api/chat — últimos mensajes (orden cronológico para un chat).
app.get("/", async (c) => {
	const rows = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.hidden, false))
		.orderBy(asc(chatMessages.createdAt))
		.limit(80);
	const dbMessages = rows.map(toPublic);

	// Si hay pocos mensajes, complementamos con los de relleno
	if (dbMessages.length < 5) {
		const combined = [...dbMessages, ...SEED_MESSAGES];
		// Ordenar de forma ascendente (más antiguo a más nuevo) para el chat
		combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		return c.json({ messages: combined });
	}

	return c.json({ messages: dbMessages });
});

// POST /api/chat — enviar un mensaje (moderado + rate-limit).
app.post("/", async (c) => {
	const ip = clientIp(c.req);
	if (!rateLimit(`chat:${ip}`, 20, 60_000)) {
		return c.json({ error: "Vas muy rápido, espera un momento." }, 429);
	}
	const body = await c.req.json().catch(() => null);
	const parsed = createSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Escribe un mensaje." }, 400);
	}
	const mod = moderate(parsed.data.text);
	if (!mod.ok) {
		return c.json({ error: mod.reason ?? "Mensaje no permitido." }, 400);
	}
	const [row] = await db
		.insert(chatMessages)
		.values({ name: parsed.data.name?.trim() || null, text: parsed.data.text })
		.returning();
	const pub = toPublic(row);
	bus.emit("chat", pub);
	return c.json({ message: pub }, 201);
});

// GET /api/chat/stream — mensajes nuevos al instante por SSE.
app.get("/stream", (c) =>
	streamSSE(c, async (stream) => {
		const onMsg = (m: ChatMessage) => {
			void stream.writeSSE({ data: JSON.stringify(m), event: "chat" });
		};
		bus.on("chat", onMsg);
		stream.onAbort(() => {
			bus.off("chat", onMsg);
		});
		while (true) {
			await stream.sleep(25000);
			await stream.writeSSE({ data: "1", event: "ping" });
		}
	}),
);

// POST /api/chat/:id/hide — ocultar un mensaje (moderador con token).
app.post("/:id/hide", async (c) => {
	if (!isRescuer(c)) return c.json({ error: "No autorizado" }, 401);
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id)) return c.json({ error: "id inválido" }, 400);
	await db.update(chatMessages).set({ hidden: true }).where(eq(chatMessages.id, id));
	return c.json({ ok: true });
});

export default app;
