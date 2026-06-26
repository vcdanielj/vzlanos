import { Hono } from "hono";
import { rateLimit } from "../lib/ratelimit.ts";

// Proxy del registro externo de desaparecidos (desaparecidosterremotovenezuela.com).
// Su API exige ahora un token reCAPTCHA v3 (cabecera `x-recaptcha-token`) y no
// envía cabeceras CORS para nuestro origen, así que el navegador no puede
// llamarla directo. La servimos desde nuestro origen en /api/personas y
// reenviamos el token que el cliente genera con la site key del registro.
const UPSTREAM = "https://desaparecidos-terremoto-api.theempire.tech/api";

const app = new Hono();

const clientIp = (h: { header: (k: string) => string | undefined }) =>
	h.header("x-forwarded-for")?.split(",")[0]?.trim() ?? h.header("x-real-ip") ?? "unknown";

// Reenvía el token reCAPTCHA si el cliente lo mandó (el upstream lo exige).
const recaptchaHeader = (c: {
	req: { header: (k: string) => string | undefined };
}): Record<string, string> => {
	const t = c.req.header("x-recaptcha-token");
	return t ? { "x-recaptcha-token": t } : {};
};

// Timeout duro para no colgar la request si el upstream tarda.
const fetchUpstream = async (url: string, init?: RequestInit): Promise<Response> => {
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), 12_000);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(t);
	}
};

// GET /api/personas?page&pageSize&estado&q — listado paginado.
app.get("/", async (c) => {
	const ip = clientIp(c.req);
	if (!rateLimit(`personas:${ip}`, 60, 60_000)) {
		return c.json({ error: "Demasiadas solicitudes. Espera un momento." }, 429);
	}
	const qs = c.req.url.includes("?") ? c.req.url.slice(c.req.url.indexOf("?")) : "";
	try {
		const res = await fetchUpstream(`${UPSTREAM}/personas${qs}`, {
			headers: { ...recaptchaHeader(c) },
		});
		const body = await res.text();
		return c.body(body, res.status as 200, {
			"Content-Type": res.headers.get("content-type") ?? "application/json",
		});
	} catch {
		return c.json({ error: "No se pudo cargar el listado externo." }, 502);
	}
});

// PATCH /api/personas/:id — marcar como recuperado (escribe en el sistema externo).
app.patch("/:id", async (c) => {
	const ip = clientIp(c.req);
	if (!rateLimit(`personas-patch:${ip}`, 20, 60_000)) {
		return c.json({ error: "Demasiadas solicitudes. Espera un momento." }, 429);
	}
	const id = encodeURIComponent(c.req.param("id"));
	const body = await c.req.text();
	try {
		const res = await fetchUpstream(`${UPSTREAM}/personas/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...recaptchaHeader(c) },
			body,
		});
		const out = await res.text();
		return c.body(out, res.status as 200, {
			"Content-Type": res.headers.get("content-type") ?? "application/json",
		});
	} catch {
		return c.json({ error: "No se pudo actualizar en el sistema externo." }, 502);
	}
});

export default app;
