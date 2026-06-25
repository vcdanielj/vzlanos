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

// GET /api/chat — últimos mensajes (orden cronológico para un chat).
app.get("/", async (c) => {
	const rows = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.hidden, false))
		.orderBy(asc(chatMessages.createdAt))
		.limit(80);
	return c.json({ messages: rows.map(toPublic) });
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
