import { Hono } from "hono";
import { geocodeSchema } from "../lib/validation.ts";

const app = new Hono();

// POST /api/geocode — dirección → lat/lng vía Nominatim (OSM).
// Para familiares en el exterior que no tienen GPS de la ubicación.
app.post("/", async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = geocodeSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Dirección inválida" }, 400);
	}

	const email = process.env.NOMINATIM_EMAIL ?? "contacto@example.com";
	const url = new URL("https://nominatim.openstreetmap.org/search");
	url.searchParams.set("q", parsed.data.address);
	url.searchParams.set("format", "jsonv2");
	url.searchParams.set("limit", "1");
	url.searchParams.set("addressdetails", "0");

	try {
		const res = await fetch(url, {
			headers: {
				// Nominatim exige un User-Agent identificable.
				"User-Agent": `RescateEmergencia/1.0 (${email})`,
				"Accept-Language": "es",
			},
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) {
			return c.json({ error: "Servicio de geocodificación no disponible" }, 502);
		}
		const results = (await res.json()) as Array<{
			lat: string;
			lon: string;
			display_name: string;
		}>;
		if (!results.length) {
			return c.json({ error: "No se encontró la dirección" }, 404);
		}
		const first = results[0];
		const lat = Number(first.lat);
		const lng = Number(first.lon);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
			return c.json({ error: "La dirección no devolvió coordenadas válidas" }, 404);
		}
		return c.json({
			result: { lat, lng, displayName: first.display_name },
		});
	} catch {
		return c.json({ error: "No se pudo geocodificar la dirección" }, 502);
	}
});

export default app;
