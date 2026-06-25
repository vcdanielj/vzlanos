import { Hono } from "hono";
import { z } from "zod";
import type { EarthquakeEvent } from "../../shared/types.ts";
import { rateLimit } from "../lib/ratelimit.ts";

const app = new Hono();

const querySchema = z.object({
	hours: z.coerce.number().int().min(1).max(24 * 30).default(24 * 7),
});

const VENEZUELA_BOUNDS = {
	minLatitude: 0,
	maxLatitude: 13.8,
	minLongitude: -73.8,
	maxLongitude: -59.2,
};

interface UsgsFeatureCollection {
	features?: UsgsFeature[];
}

interface UsgsFeature {
	id?: string;
	properties?: {
		title?: string | null;
		place?: string | null;
		mag?: number | null;
		time?: number | null;
		updated?: number | null;
		sig?: number | null;
		felt?: number | null;
		tsunami?: number | null;
		net?: string | null;
		url?: string | null;
	};
	geometry?: {
		coordinates?: [number, number, number?];
	};
}

interface EarthquakeResponse {
	earthquakes: EarthquakeEvent[];
	source: "USGS";
	updatedAt: string;
}

const CACHE_TTL_MS = 60_000;
const responseCache = new Map<string, { expiresAt: number; payload: EarthquakeResponse }>();

const clientIp = (h: { header: (k: string) => string | undefined }) =>
	h.header("x-forwarded-for")?.split(",")[0]?.trim() ?? h.header("x-real-ip") ?? "unknown";

const toEvent = (feature: UsgsFeature): EarthquakeEvent | null => {
	const id = feature.id?.trim();
	const props = feature.properties;
	const coords = feature.geometry?.coordinates;
	if (!id || !coords || typeof coords[0] !== "number" || typeof coords[1] !== "number") return null;

	const lng = coords[0];
	const lat = coords[1];
	const depthKm = coords[2];

	return {
		id,
		title: props?.title?.trim() || "Sismo registrado",
		place: props?.place?.trim() || "Ubicación no especificada",
		magnitude: typeof props?.mag === "number" ? props.mag : null,
		depthKm: typeof depthKm === "number" ? depthKm : null,
		lat,
		lng,
		time:
			typeof props?.time === "number" ? new Date(props.time).toISOString() : new Date().toISOString(),
		updatedAt:
			typeof props?.updated === "number"
				? new Date(props.updated).toISOString()
				: typeof props?.time === "number"
					? new Date(props.time).toISOString()
					: new Date().toISOString(),
		significance: typeof props?.sig === "number" ? props.sig : null,
		feltReports: typeof props?.felt === "number" ? props.felt : null,
		tsunami: props?.tsunami === 1,
		source: props?.net?.trim() || null,
		url: props?.url?.trim() || "https://earthquake.usgs.gov/",
	};
};

app.get("/", async (c) => {
	const ip = clientIp(c.req);
	if (!rateLimit(`quakes:${ip}`, 30, 60_000)) {
		return c.json({ error: "Demasiadas solicitudes. Espera un momento." }, 429);
	}

	const parsed = querySchema.safeParse({
		hours: c.req.query("hours"),
		limit: c.req.query("limit"),
	});
	if (!parsed.success) {
		return c.json({ error: "Parámetros inválidos" }, 400);
	}

	const { hours } = parsed.data;
	const cacheKey = `${hours}`;
	const cached = responseCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		c.header("Cache-Control", "public, max-age=60");
		return c.json(cached.payload);
	}

	const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
	const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
	url.searchParams.set("format", "geojson");
	url.searchParams.set("orderby", "time");
	// Sin parámetro "limit": USGS devuelve todos los eventos en el área/período (hasta 20.000)
	url.searchParams.set("limit", "20000");
	url.searchParams.set("starttime", startTime);
	url.searchParams.set("minlatitude", String(VENEZUELA_BOUNDS.minLatitude));
	url.searchParams.set("maxlatitude", String(VENEZUELA_BOUNDS.maxLatitude));
	url.searchParams.set("minlongitude", String(VENEZUELA_BOUNDS.minLongitude));
	url.searchParams.set("maxlongitude", String(VENEZUELA_BOUNDS.maxLongitude));

	try {
		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
				"User-Agent": "vzlanos/1.0 (consulta sísmica Venezuela)",
			},
			signal: AbortSignal.timeout(15_000),
		});
		if (!res.ok) {
			return c.json({ error: "Servicio sísmico no disponible" }, 502);
		}

		const data = (await res.json()) as UsgsFeatureCollection;
		const earthquakes = (data.features ?? [])
			.map(toEvent)
			.filter((e): e is EarthquakeEvent => e !== null);
		const payload: EarthquakeResponse = {
			earthquakes,
			source: "USGS",
			updatedAt: new Date().toISOString(),
		};
		responseCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
		c.header("Cache-Control", "public, max-age=60");
		return c.json(payload);
	} catch {
		return c.json({ error: "No se pudo consultar el listado de temblores" }, 502);
	}
});

export default app;
