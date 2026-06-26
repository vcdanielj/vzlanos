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

interface FunvisisFeatureCollection {
	type?: string;
	features?: FunvisisFeature[];
}

interface FunvisisFeature {
	type?: string;
	geometry?: {
		type?: string;
		coordinates?: [number, number];
	};
	properties?: {
		phoneFormatted?: string | null; // depth (e.g. "4.7 km")
		phone?: string | null;          // magnitude (e.g. "3.3")
		address?: string | null;        // place (e.g. "9 km al suroeste de Naiguata")
		city?: string | null;           // time (e.g. "11:07")
		country?: string | null;
		postalCode?: string | null;     // date (e.g. "26-06-2026")
		state?: string | null;
		lat?: string | null;
		long?: string | null;
	};
}

interface EarthquakeResponse {
	earthquakes: EarthquakeEvent[];
	source: string;
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

const parseFunvisisDate = (postalCode: string, city: string): string => {
	const dateParts = postalCode.trim().split("-");
	const timeParts = city.trim().split(":");
	if (dateParts.length === 3 && timeParts.length === 2) {
		const day = parseInt(dateParts[0], 10);
		const month = parseInt(dateParts[1], 10);
		const year = parseInt(dateParts[2], 10);
		const hour = parseInt(timeParts[0], 10);
		const minute = parseInt(timeParts[1], 10);

		if (!isNaN(day) && !isNaN(month) && !isNaN(year) && !isNaN(hour) && !isNaN(minute)) {
			// Las fechas/horas de FUNVISIS son en hora local de Venezuela (UTC-4)
			const pad = (n: number) => String(n).padStart(2, "0");
			const localISO = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-04:00`;
			try {
				const d = new Date(localISO);
				if (!isNaN(d.getTime())) {
					return d.toISOString();
				}
			} catch {
				// ignorar y retornar fecha actual
			}
		}
	}
	return new Date().toISOString();
};

const toFunvisisEvent = (feature: FunvisisFeature): EarthquakeEvent | null => {
	const props = feature.properties;
	const coords = feature.geometry?.coordinates;
	if (!props || !coords || typeof coords[0] !== "number" || typeof coords[1] !== "number") {
		return null;
	}

	const magnitude = props.phone ? parseFloat(props.phone) : null;
	const depthStr = props.phoneFormatted?.replace(" km", "")?.trim();
	const depthKm = depthStr ? parseFloat(depthStr) : null;

	const lat = typeof coords[1] === "number" ? coords[1] : (props.lat ? parseFloat(props.lat) : 0);
	const lng = typeof coords[0] === "number" ? coords[0] : (props.long ? parseFloat(props.long) : 0);

	const dateStr = props.postalCode || "";
	const timeStr = props.city || "";
	const eventTime = parseFunvisisDate(dateStr, timeStr);

	const id = `funvisis-${dateStr}-${timeStr}-${lat.toFixed(4)}-${lng.toFixed(4)}`;

	return {
		id,
		title: `Sismo M ${magnitude != null ? magnitude.toFixed(1) : "s/d"}`,
		place: props.address?.trim() || "Venezuela",
		magnitude: isNaN(magnitude as number) ? null : magnitude,
		depthKm: isNaN(depthKm as number) ? null : depthKm,
		lat,
		lng,
		time: eventTime,
		updatedAt: eventTime,
		significance: null,
		feltReports: null,
		tsunami: false,
		source: "FUNVISIS",
		url: "http://www.funvisis.gob.ve/",
	};
};

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
	const R = 6371; // radio de la Tierra en km
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
};

const areDuplicates = (e1: EarthquakeEvent, e2: EarthquakeEvent): boolean => {
	const timeDiffMs = Math.abs(new Date(e1.time).getTime() - new Date(e2.time).getTime());
	const distKm = distanceKm(e1.lat, e1.lng, e2.lat, e2.lng);
	// Duplicado si ocurre en menos de 3 minutos y a menos de 25 km de distancia
	return timeDiffMs < 3 * 60 * 1000 && distKm < 25;
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

	// 1. Obtener sismos de FUNVISIS
	let funvisisEvents: EarthquakeEvent[] = [];
	try {
		const res = await fetch("http://www.funvisis.gob.ve/maravilla.json", {
			headers: {
				Accept: "application/json",
				"User-Agent": "vzlanos/1.0 (consulta sismica Venezuela)",
			},
			signal: AbortSignal.timeout(8_000),
		});
		if (res.ok) {
			const data = (await res.json()) as FunvisisFeatureCollection;
			funvisisEvents = (data.features ?? [])
				.map(toFunvisisEvent)
				.filter((e): e is EarthquakeEvent => e !== null);
		} else {
			console.warn("FUNVISIS API retorno status:", res.status);
		}
	} catch (err) {
		console.error("Error consultando FUNVISIS:", err);
	}

	// 2. Obtener sismos de USGS
	const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
	const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
	url.searchParams.set("format", "geojson");
	url.searchParams.set("orderby", "time");
	url.searchParams.set("limit", "20000");
	url.searchParams.set("starttime", startTime);
	url.searchParams.set("minlatitude", String(VENEZUELA_BOUNDS.minLatitude));
	url.searchParams.set("maxlatitude", String(VENEZUELA_BOUNDS.maxLatitude));
	url.searchParams.set("minlongitude", String(VENEZUELA_BOUNDS.minLongitude));
	url.searchParams.set("maxlongitude", String(VENEZUELA_BOUNDS.maxLongitude));

	let usgsEvents: EarthquakeEvent[] = [];
	try {
		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
				"User-Agent": "vzlanos/1.0 (consulta sísmica Venezuela)",
			},
			signal: AbortSignal.timeout(10_000),
		});
		if (res.ok) {
			const data = (await res.json()) as UsgsFeatureCollection;
			usgsEvents = (data.features ?? [])
				.map(toEvent)
				.filter((e): e is EarthquakeEvent => e !== null);
		} else {
			console.warn("USGS API retorno status:", res.status);
		}
	} catch (err) {
		console.error("Error consultando USGS:", err);
	}

	if (funvisisEvents.length === 0 && usgsEvents.length === 0) {
		return c.json({ error: "No se pudo consultar el listado de temblores" }, 502);
	}

	// Fusionar y deduplicar: preferir FUNVISIS si hay solapamiento
	const merged = [...funvisisEvents];
	for (const usgs of usgsEvents) {
		const isDup = merged.some((f) => areDuplicates(f, usgs));
		if (!isDup) {
			merged.push(usgs);
		}
	}

	// Filtrar por el rango de tiempo de la consulta original y ordenar
	const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
	const earthquakes = merged
		.filter((e) => new Date(e.time) >= cutoffTime)
		.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

	const activeSources = [];
	if (funvisisEvents.length > 0) activeSources.push("FUNVISIS");
	if (usgsEvents.length > 0) activeSources.push("USGS");

	const payload: EarthquakeResponse = {
		earthquakes,
		source: activeSources.join(" + "),
		updatedAt: new Date().toISOString(),
	};

	responseCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
	c.header("Cache-Control", "public, max-age=60");
	return c.json(payload);
});

export default app;
