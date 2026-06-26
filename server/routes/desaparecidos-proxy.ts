import { Hono } from "hono";
import { type SQL, and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { reports } from "../db/schema.ts";
import { rateLimit } from "../lib/ratelimit.ts";

// Registro externo de desaparecidos (desaparecidosterremotovenezuela.com).
// Su API exige ahora un token reCAPTCHA v3 (cabecera `x-recaptcha-token`) y no
// envía cabeceras CORS para nuestro origen, así que el navegador no puede
// llamarla directo: la servimos desde /api/personas reenviando el token que el
// cliente genera con la site key del registro.
//
// Si el upstream falla (red, 403 reCAPTCHA o 5xx) caemos al listado LOCAL:
// los reportes de búsqueda cargados por la propia app (type busqueda_persona).
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

// ─── Fallback local ────────────────────────────────────────────────────────
// Listado paginado de los reportes propios de la app (mismo shape que el API
// externo) para cuando el upstream no responde.
async function localListado(c: {
	req: { query: (k: string) => string | undefined };
}) {
	const q = c.req.query("q");
	const estado = c.req.query("estado") ?? "todos";
	const pageVal = Number(c.req.query("page") ?? "1");
	const pageSizeVal = Number(c.req.query("pageSize") ?? "20");
	const offsetVal = (pageVal - 1) * pageSizeVal;

	const conditions: (SQL | undefined)[] = [eq(reports.type, "busqueda_persona")];

	if (q?.trim()) {
		const safeQ = `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`;
		conditions.push(or(ilike(reports.personName, safeQ), ilike(reports.lastKnownAddress, safeQ)));
	}

	if (estado === "sin-contacto") {
		conditions.push(
			and(
				ne(reports.status, "a_salvo"),
				ne(reports.status, "rescatado"),
				ne(reports.status, "encontrado"),
				ne(reports.status, "descartado"),
			),
		);
	} else if (estado === "localizado") {
		conditions.push(
			or(
				eq(reports.status, "a_salvo"),
				eq(reports.status, "rescatado"),
				eq(reports.status, "encontrado"),
			),
		);
	} else {
		conditions.push(ne(reports.status, "descartado"));
	}

	try {
		const allCounts = await db
			.select({ status: reports.status, count: sql<number>`count(*)::int` })
			.from(reports)
			.where(and(eq(reports.type, "busqueda_persona"), ne(reports.status, "descartado")))
			.groupBy(reports.status);

		let sinContacto = 0;
		let localizado = 0;
		for (const r of allCounts) {
			if (r.status === "a_salvo" || r.status === "rescatado" || r.status === "encontrado") {
				localizado += r.count;
			} else {
				sinContacto += r.count;
			}
		}
		const total = sinContacto + localizado;

		const rows = await db
			.select()
			.from(reports)
			.where(and(...conditions))
			.orderBy(desc(reports.createdAt))
			.limit(pageSizeVal)
			.offset(offsetVal);

		const [{ count: filteredCount }] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(reports)
			.where(and(...conditions));

		const totalPages = Math.ceil(filteredCount / pageSizeVal);

		const items = rows.map((row) => ({
			id: String(row.id),
			nombre: row.personName || "Desconocido",
			edad: row.age,
			ubicacion: row.lastKnownAddress,
			fecha: row.createdAt.toISOString(),
			descripcion: row.description,
			contacto: row.reporterContact,
			foto: row.photo ? `/api/reports/${row.id}/photo` : null,
			estado:
				row.status === "a_salvo" || row.status === "rescatado" || row.status === "encontrado"
					? "localizado"
					: "sin-contacto",
			localizadoPor:
				row.claimedBy || (row.status === "a_salvo" ? row.reporterName || "Auto-reporte" : null),
			localizadoContacto: row.status === "a_salvo" ? row.reporterContact : null,
			localizadoRelacion: row.status === "a_salvo" ? row.relation : null,
			localizadoNota: row.foundAt,
			createdAt: row.createdAt.getTime(),
		}));

		return {
			items,
			total: filteredCount,
			page: pageVal,
			pageSize: pageSizeVal,
			totalPages,
			counts: { total, sinContacto, localizado },
		};
	} catch (err) {
		console.error("Fallback local de personas falló:", err);
		return {
			items: [],
			total: 0,
			page: pageVal,
			pageSize: pageSizeVal,
			totalPages: 0,
			counts: { total: 0, sinContacto: 0, localizado: 0 },
		};
	}
}

// GET /api/personas?page&pageSize&estado&q — externo primero, local de respaldo.
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
		if (res.ok) {
			const body = await res.text();
			return c.body(body, 200, {
				"Content-Type": res.headers.get("content-type") ?? "application/json",
			});
		}
	} catch {
		// red/timeout: caemos al listado local
	}
	// El upstream no respondió un listado válido → reportes propios de la app.
	return c.json(await localListado(c));
});

// PATCH /api/personas/:id — externo primero; si falla, actualiza el reporte local.
app.patch("/:id", async (c) => {
	const ip = clientIp(c.req);
	if (!rateLimit(`personas-patch:${ip}`, 20, 60_000)) {
		return c.json({ error: "Demasiadas solicitudes. Espera un momento." }, 429);
	}
	const rawId = c.req.param("id");
	const body = await c.req.text();

	try {
		const res = await fetchUpstream(`${UPSTREAM}/personas/${encodeURIComponent(rawId)}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...recaptchaHeader(c) },
			body,
		});
		if (res.ok) {
			const out = await res.text();
			return c.body(out, 200, {
				"Content-Type": res.headers.get("content-type") ?? "application/json",
			});
		}
	} catch {
		// red/timeout: intentamos en local
	}

	// Fallback: marcar como encontrado el reporte local (id numérico).
	const idVal = Number(rawId);
	if (!Number.isInteger(idVal)) {
		return c.json({ error: "No se pudo actualizar en el sistema externo." }, 502);
	}
	const payload = JSON.parse(body || "{}") as {
		localizadoPor?: string;
		localizadoContacto?: string;
		localizadoRelacion?: string;
		localizadoNota?: string;
	};
	try {
		const [updated] = await db
			.update(reports)
			.set({
				status: "encontrado",
				claimedBy: payload.localizadoPor || null,
				reporterContact: payload.localizadoContacto || undefined,
				relation: payload.localizadoRelacion || undefined,
				foundAt: payload.localizadoNota || undefined,
				updatedAt: new Date(),
			})
			.where(eq(reports.id, idVal))
			.returning();
		if (!updated) {
			return c.json({ error: "Reporte no encontrado." }, 404);
		}
		return c.json({ ok: true });
	} catch (err) {
		console.error("Fallback local de PATCH personas falló:", err);
		return c.json({ error: "No se pudo actualizar el registro." }, 500);
	}
});

export default app;
