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

// GET /api/prayers — feed reciente (no ocultas).
app.get("/", async (c) => {
	const rows = await db
		.select()
		.from(prayers)
		.where(eq(prayers.hidden, false))
		.orderBy(desc(prayers.createdAt))
		.limit(100);
	return c.json({ prayers: rows.map(toPublic) });
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

