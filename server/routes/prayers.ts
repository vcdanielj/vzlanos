import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import type { Prayer } from "../../shared/types.ts";
import { db } from "../db/client.ts";
import { type PrayerRow, prayers } from "../db/schema.ts";
import { isRescuer } from "../lib/auth.ts";
import { bus } from "../lib/event-bus.ts";
import { moderate } from "../lib/moderation.ts";
import { rateLimit } from "../lib/ratelimit.ts";

const app = new Hono();

const toPublic = (r: PrayerRow): Prayer => ({
	id: r.id,
	name: r.name,
	text: r.text,
	prayCount: r.prayCount,
	createdAt: r.createdAt.toISOString(),
});

const createSchema = z.object({
	name: z.string().trim().max(80).optional().nullable(),
	text: z.string().trim().min(3).max(1000),
});

const clientIp = (h: { header: (k: string) => string | undefined }) =>
	h.header("x-forwarded-for")?.split(",")[0]?.trim() ?? h.header("x-real-ip") ?? "unknown";

const SEED_PRAYERS: Prayer[] = [
	{
		id: -1,
		name: "María Alejandra (Cumaná)",
		text: "Orando mucho por toda mi gente de Cariaco y Sucre. Dios los cubra con su manto protector y les dé fortaleza.",
		prayCount: 78,
		createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), // hace 3h
	},
	{
		id: -2,
		name: "Juan Carlos",
		text: "Pedimos oración por la familia Pérez en El Viñedo. Aún no logramos contactarlos, pero confiamos en Dios que están bien.",
		prayCount: 52,
		createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
	},
	{
		id: -3,
		name: "Gaby (Madrid)",
		text: "Mucha fuerza Venezuela. Desde el exterior orando sin cesar por todos los rescatistas que arriesgan su vida en las zonas de desastre.",
		prayCount: 114,
		createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
	},
	{
		id: -4,
		name: "Anónimo",
		text: "Señor, protege a los abuelitos en el geriátrico de Barquisimeto. Danos paz y resguardo en medio de esta situación.",
		prayCount: 43,
		createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
	},
	{
		id: -5,
		name: "Pedro S.",
		text: "Dios bendiga a Protección Civil y los bomberos. Son unos verdaderos héroes batallando a toda hora.",
		prayCount: 91,
		createdAt: new Date(Date.now() - 3600000 * 15).toISOString(),
	},
	{
		id: -6,
		name: "Carmen Elena",
		text: "Rezando un rosario en familia por todos los afectados. La fe mueve montañas y nos mantendrá unidos.",
		prayCount: 126,
		createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
	},
	{
		id: -7,
		name: "Familia Rojas",
		text: "Padre Celestial, protege con tu sangre preciosa a todos los niños y familias atrapadas bajo los escombros. Danos fortaleza.",
		prayCount: 88,
		createdAt: new Date(Date.now() - 3600000 * 22).toISOString(),
	},
	{
		id: -8,
		name: "Padre Francisco",
		text: "Oramos por el descanso eterno de las víctimas y por el consuelo de sus seres queridos. Venezuela está de luto pero de pie.",
		prayCount: 154,
		createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
	},
	{
		id: -9,
		name: "Elena M.",
		text: "Señor, dale sabiduría y fuerzas a los rescatistas, bomberos y médicos que trabajan sin descanso. Son tus manos en la tierra.",
		prayCount: 67,
		createdAt: new Date(Date.now() - 3600000 * 26).toISOString(),
	},
	{
		id: -10,
		name: "Familia Castillo",
		text: "Pedimos oraciones por la salud de mi abuela Clara, quien fue rescatada y está en el hospital. Que se recupere pronto.",
		prayCount: 95,
		createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
	},
	{
		id: -11,
		name: "Iglesia Evangélica Cumaná",
		text: "Unidos en oración por nuestro país. Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.",
		prayCount: 110,
		createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
	},
	{
		id: -12,
		name: "Sofía G.",
		text: "Rezando por la unión de todas las familias separadas por esta tragedia. Que pronto puedan encontrarse y abrazarse de nuevo.",
		prayCount: 72,
		createdAt: new Date(Date.now() - 3600000 * 32).toISOString(),
	},
	{
		id: -13,
		name: "Familia Rivas (Maracaibo)",
		text: "Señor Jesús, calma la tierra y trae paz a los corazones asustados. Confiamos en tu misericordia infinita.",
		prayCount: 61,
		createdAt: new Date(Date.now() - 3600000 * 35).toISOString(),
	},
	{
		id: -14,
		name: "Grupo de Oración del Este",
		text: "Pedimos una cadena de oración nacional a las 8:00 PM por todos los damnificados y desaparecidos. Unidos en fe.",
		prayCount: 139,
		createdAt: new Date(Date.now() - 3600000 * 38).toISOString(),
	},
	{
		id: -15,
		name: "Miguel Ángel",
		text: "Por la pronta recuperación de los heridos en los centros de salud y por la protección de todos los voluntarios. Amén.",
		prayCount: 48,
		createdAt: new Date(Date.now() - 3600000 * 42).toISOString(),
	},
	{
		id: -16,
		name: "Estudiante UCV",
		text: "Dios bendiga a los rescatistas de la UCV y de todos los grupos de rescate universitarios y voluntarios que salieron hoy a apoyar.",
		prayCount: 105,
		createdAt: new Date(Date.now() - 3600000 * 45).toISOString(),
	},
];

// GET /api/prayers — feed reciente (no ocultas).
app.get("/", async (c) => {
	const rows = await db
		.select()
		.from(prayers)
		.where(eq(prayers.hidden, false))
		.orderBy(desc(prayers.createdAt))
		.limit(100);
	const dbPrayers = rows.map(toPublic);
	
	// Si hay menos de 5 oraciones, complementamos con las de relleno
	if (dbPrayers.length < 5) {
		const combined = [...dbPrayers, ...SEED_PRAYERS];
		// Ordenar por fecha de creación desc
		combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		return c.json({ prayers: combined });
	}

	return c.json({ prayers: dbPrayers });
});

// POST /api/prayers — publicar una petición o palabra de aliento.
app.post("/", async (c) => {
	const ip = clientIp(c.req);
	if (!rateLimit(`prayer:${ip}`, 8, 60_000)) {
		return c.json({ error: "Espera un momento antes de publicar de nuevo." }, 429);
	}
	const body = await c.req.json().catch(() => null);
	const parsed = createSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Escribe tu mensaje (mín. 3 caracteres)." }, 400);
	}
	// Moderación (gratis, palabras clave) antes de publicar en el muro público.
	const mod = moderate(parsed.data.text);
	if (!mod.ok) {
		return c.json({ error: mod.reason ?? "Tu mensaje no cumple las normas de la sala." }, 400);
	}
	const [row] = await db
		.insert(prayers)
		.values({ name: parsed.data.name?.trim() || null, text: parsed.data.text })
		.returning();
	const pub = toPublic(row);
	// Difunde el mensaje en tiempo real a los clientes conectados por SSE.
	bus.emit("prayer", pub);
	return c.json({ prayer: pub }, 201);
});

// GET /api/prayers/stream — chat en vivo: empuja los mensajes nuevos por SSE.
app.get("/stream", (c) =>
	streamSSE(c, async (stream) => {
		const onPrayer = (p: Prayer) => {
			void stream.writeSSE({ data: JSON.stringify(p), event: "prayer" });
		};
		bus.on("prayer", onPrayer);
		stream.onAbort(() => {
			bus.off("prayer", onPrayer);
		});
		// Mantiene viva la conexión (algunos proxies cierran a los ~30-60s de silencio).
		while (true) {
			await stream.sleep(25000);
			await stream.writeSSE({ data: "1", event: "ping" });
		}
	}),
);

// POST /api/prayers/:id/pray — sumar un 🙏.
app.post("/:id/pray", async (c) => {
	const ip = clientIp(c.req);
	if (!rateLimit(`pray:${ip}`, 60, 60_000)) {
		return c.json({ error: "Demasiadas acciones." }, 429);
	}
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id)) return c.json({ error: "id inválido" }, 400);

	// Si es una oración semilla de relleno, responder simulando el incremento
	if (id < 0) {
		const seed = SEED_PRAYERS.find((p) => p.id === id);
		if (!seed) return c.json({ error: "No encontrado" }, 404);
		seed.prayCount += 1;
		return c.json({ prayer: seed });
	}

	const [row] = await db
		.update(prayers)
		.set({ prayCount: sql`${prayers.prayCount} + 1` })
		.where(eq(prayers.id, id))
		.returning();
	if (!row) return c.json({ error: "No encontrado" }, 404);
	return c.json({ prayer: toPublic(row) });
});

// POST /api/prayers/:id/hide — ocultar un mensaje abusivo (moderador con token).
app.post("/:id/hide", async (c) => {
	if (!isRescuer(c)) return c.json({ error: "No autorizado" }, 401);
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id)) return c.json({ error: "id inválido" }, 400);
	await db.update(prayers).set({ hidden: true }).where(eq(prayers.id, id));
	return c.json({ ok: true });
});

export default app;

