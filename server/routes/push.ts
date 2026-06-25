import { Hono } from "hono";
import { z } from "zod";
import { pushEnabled, saveSubscription, vapidPublicKey } from "../lib/push.ts";
import { rateLimit } from "../lib/ratelimit.ts";

const app = new Hono();

const subSchema = z.object({
	personName: z.string().trim().min(2).max(200),
	subscription: z.object({
		endpoint: z.string().url(),
		keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
	}),
});

// Clave pública VAPID para que el cliente se suscriba.
app.get("/vapid", (c) => c.json({ publicKey: vapidPublicKey(), enabled: pushEnabled() }));

// Registrar una suscripción de aviso por una persona.
app.post("/subscribe", async (c) => {
	const ip =
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
		c.req.header("x-real-ip") ??
		"unknown";
	if (!rateLimit(`push:${ip}`, 30, 60_000)) {
		return c.json({ error: "Demasiados intentos." }, 429);
	}
	const body = await c.req.json().catch(() => null);
	const parsed = subSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Suscripción inválida" }, 400);
	}
	await saveSubscription(parsed.data.subscription, parsed.data.personName);
	return c.json({ ok: true }, 201);
});

export default app;
