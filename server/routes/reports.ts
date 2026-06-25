import { and, asc, desc, eq, gte, ilike, inArray, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Report, ReportTip } from "../../shared/types.ts";
import { db } from "../db/client.ts";
import { reports, type ReportRow, reportTips, type ReportTipRow } from "../db/schema.ts";
import { isRescuer } from "../lib/auth.ts";
import { haversineMeters } from "../lib/geo.ts";
import { moderate } from "../lib/moderation.ts";
import { notifyPersonSafe, notifyTipReceived } from "../lib/push.ts";
import { rateLimit } from "../lib/ratelimit.ts";
import {
	createReportSchema,
	createTipSchema,
	searchSchema,
	updateReportSchema,
} from "../lib/validation.ts";

const app = new Hono();

// Normaliza la cédula a solo dígitos (para cruce exacto y consistente).
const normCedula = (c: string | null | undefined): string | null => {
	if (!c) return null;
	const digits = c.replace(/\D/g, "");
	return digits.length >= 5 ? digits : null;
};
// Enmascara para mostrar en público (privacidad): V-••••1234.
const maskCedula = (c: string | null): string | null => {
	if (!c) return null;
	return c.length <= 4 ? "•••" : `••••${c.slice(-4)}`;
};

// Tipos cuyo contacto del reportante es público (la familia QUIERE ser contactada
// para reunificar). En SOS/tercero el contacto queda solo para rescatistas.
const isReunificationType = (type: string): boolean =>
	type === "busqueda_persona" || type === "encontrado";

// Convierte una fila DB a la forma pública.
// - `includeContact` (rescatista): ve cédula completa y contacto en todo reporte.
// - Público: cédula enmascarada; contacto visible solo en reunificación.
const toPublic = (row: ReportRow, includeContact: boolean, tipCount = 0): Report => {
	const contactVisible = includeContact || isReunificationType(row.type);
	return {
		id: row.id,
		type: row.type as Report["type"],
		lat: row.lat,
		lng: row.lng,
		accuracy: row.accuracy,
		peopleCount: row.peopleCount,
		floor: row.floor,
		injured: row.injured,
		foundAt: row.foundAt,
		description: row.description,
		status: row.status as Report["status"],
		verified: row.verified,
		claimedBy: row.claimedBy,
		personName: row.personName,
		// Cédula completa solo para rescatistas; enmascarada para el público.
		cedula: includeContact ? row.cedula : maskCedula(row.cedula),
		hasPhoto: !!(row.photo && row.photo.length > 0),
		age: row.age,
		sex: row.sex,
		lastSeen: row.lastSeen,
		lastKnownAddress: row.lastKnownAddress,
		relation: row.relation,
		reporterName: row.reporterName,
		reporterCountry: row.reporterCountry,
		...(contactVisible ? { reporterContact: row.reporterContact } : {}),
		tipCount,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
};

const toPublicTip = (row: ReportTipRow): ReportTip => ({
	id: row.id,
	reportId: row.reportId,
	message: row.message,
	contact: row.contact,
	name: row.name,
	createdAt: row.createdAt.toISOString(),
});

// Cuenta pistas por reporte en una sola query (evita N+1 en el tablero).
const tipCountsFor = async (ids: number[]): Promise<Map<number, number>> => {
	const map = new Map<number, number>();
	if (!ids.length) return map;
	const rows = await db
		.select({ reportId: reportTips.reportId, n: sql<number>`count(*)::int` })
		.from(reportTips)
		.where(inArray(reportTips.reportId, ids))
		.groupBy(reportTips.reportId);
	for (const r of rows) map.set(r.reportId, r.n);
	return map;
};

// POST /api/reports — crear (público)
app.post("/", async (c) => {
	const ip =
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
		c.req.header("x-real-ip") ??
		"unknown";
	if (!rateLimit(`report:${ip}`, 20, 60_000)) {
		return c.json({ error: "Demasiados envíos. Espera un momento." }, 429);
	}

	const body = await c.req.json().catch(() => null);
	const parsed = createReportSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
	}
	const data = parsed.data;

	// Dedupe: para SOS/tercero, si ya hay un reporte abierto a <40m en la última
	// hora, devolvemos ese en vez de crear un pin duplicado (anti-spam).
	if ((data.type === "sos" || data.type === "tercero") && data.lat != null && data.lng != null) {
		const sinceDate = new Date(Date.now() - 60 * 60 * 1000);
		const recent = await db
			.select()
			.from(reports)
			.where(and(eq(reports.type, data.type), gte(reports.createdAt, sinceDate)))
			.limit(200);
		const near = recent.find(
			(r) =>
				r.lat != null &&
				r.lng != null &&
				r.status !== "rescatado" &&
				r.status !== "descartado" &&
				// 25m: lo bastante cerca para ser el mismo punto, sin fusionar edificios contiguos.
				haversineMeters(data.lat as number, data.lng as number, r.lat, r.lng) < 25,
		);
		if (near) {
			return c.json({ report: toPublic(near, false), duplicate: true }, 200);
		}
	}

	const [inserted] = await db
		.insert(reports)
		.values({
			type: data.type,
			lat: data.lat ?? null,
			lng: data.lng ?? null,
			accuracy: data.accuracy ?? null,
			peopleCount: data.peopleCount ?? null,
			floor: data.floor ?? null,
			injured: data.injured ?? null,
			foundAt: data.foundAt ?? null,
			description: data.description ?? null,
			personName: data.personName ?? null,
			cedula: normCedula(data.cedula),
			age: data.age ?? null,
			sex: data.sex ?? null,
			lastSeen: data.lastSeen ?? null,
			photo: data.photo ?? null,
			photoMime: data.photoMime ?? null,
			lastKnownAddress: data.lastKnownAddress ?? null,
			relation: data.relation ?? null,
			reporterName: data.reporterName ?? null,
			reporterContact: data.reporterContact ?? null,
			reporterCountry: data.reporterCountry ?? null,
			// Único status fijable por el público: "a salvo" (auto-reporte). Resto = nuevo.
			...(data.selfSafe && data.type === "busqueda_persona" ? { status: "a_salvo" } : {}),
		})
		.returning();

	// Cruce de localización: cuando alguien se auto-reporta a salvo, o se reporta a una
	// persona ENCONTRADA (hospital/iglesia/albergue), marca los reportes abiertos del
	// mismo nombre y avisa por Web Push a quienes la buscaban.
	const isSelfSafe = data.selfSafe && data.type === "busqueda_persona";
	const isFound = data.type === "encontrado";
	if (isSelfSafe || isFound) {
		const newStatus = isFound ? "encontrado" : "a_salvo";
		const open = inArray(reports.status, ["nuevo", "en_progreso"]);
		let matches: { id: number }[] = [];
		let byCedula = false;
		if (inserted.cedula) {
			// Match exacto por cédula: único, sin riesgo de homónimos.
			matches = await db
				.select({ id: reports.id })
				.from(reports)
				.where(and(eq(reports.type, "busqueda_persona"), open, eq(reports.cedula, inserted.cedula)));
			byCedula = true;
		} else if (inserted.personName) {
			const norm = inserted.personName.trim().toLowerCase();
			matches = await db
				.select({ id: reports.id })
				.from(reports)
				.where(and(eq(reports.type, "busqueda_persona"), open, sql`lower(trim(${reports.personName})) = ${norm}`));
		}
		// Cédula = exacto (sin tope). Nombre = tope anti-homónimo (≤5).
		if (matches.length > 0 && (byCedula || matches.length <= 5)) {
			await db
				.update(reports)
				.set({ status: newStatus, updatedAt: new Date() })
				.where(
					inArray(
						reports.id,
						matches.map((m) => m.id),
					),
				);
			void notifyPersonSafe(inserted.personName, newStatus);
		}
	}

	return c.json({ report: toPublic(inserted, false) }, 201);
});

// GET /api/reports — listar para el mapa (rescatistas ven contactos)
app.get("/", async (c) => {
	const rescuer = isRescuer(c);
	const status = c.req.query("status");
	const type = c.req.query("type");

	const conditions = [];
	if (status) conditions.push(eq(reports.status, status));
	// Por defecto, el mapa no muestra los descartados (datos falsos/duplicados).
	else conditions.push(ne(reports.status, "descartado"));
	if (type) conditions.push(eq(reports.type, type));

	const rows = await db
		.select()
		.from(reports)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(reports.createdAt))
		.limit(2000);

	const tips = await tipCountsFor(rows.map((r) => r.id));
	return c.json({ reports: rows.map((r) => toPublic(r, rescuer, tips.get(r.id) ?? 0)) });
});

// GET /api/reports/search?name= — seguimiento por nombre (familiares)
app.get("/search", async (c) => {
	const ip =
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
		c.req.header("x-real-ip") ??
		"unknown";
	if (!rateLimit(`search:${ip}`, 40, 60_000)) {
		return c.json({ error: "Demasiadas búsquedas. Espera un momento." }, 429);
	}
	const parsed = searchSchema.safeParse({ name: c.req.query("name") });
	if (!parsed.success) {
		return c.json({ error: "Falta el nombre a buscar" }, 400);
	}
	// Escapa comodines LIKE (% _ \) para que un nombre no ensucie la búsqueda.
	const safe = parsed.data.name.replace(/[\\%_]/g, "\\$&");
	const rows = await db
		.select()
		.from(reports)
		.where(ilike(reports.personName, `%${safe}%`))
		.orderBy(desc(reports.updatedAt))
		.limit(100);
	const tips = await tipCountsFor(rows.map((r) => r.id));
	return c.json({ reports: rows.map((r) => toPublic(r, false, tips.get(r.id) ?? 0)) });
});

// GET /api/reports/:id/photo — sirve la foto del desaparecido (base64 → bytes)
app.get("/:id/photo", async (c) => {
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id)) return c.json({ error: "id inválido" }, 400);
	const [row] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
	if (!row?.photo) return c.json({ error: "Sin foto" }, 404);
	const bytes = Buffer.from(row.photo, "base64");
	// Allowlist de MIME: nunca servir HTML/SVG desde nuestro origen (anti-XSS almacenado).
	const safeMime =
		row.photoMime && /^image\/(jpeg|png|webp)$/.test(row.photoMime)
			? row.photoMime
			: "image/jpeg";
	return c.body(bytes, 200, {
		"Content-Type": safeMime,
		"Cache-Control": "public, max-age=3600",
	});
});

// POST /api/reports/:id/tip — alguien aporta una pista/avistamiento (público).
app.post("/:id/tip", async (c) => {
	const ip =
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
		c.req.header("x-real-ip") ??
		"unknown";
	if (!rateLimit(`tip:${ip}`, 10, 60_000)) {
		return c.json({ error: "Demasiadas pistas. Espera un momento." }, 429);
	}
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id)) return c.json({ error: "id inválido" }, 400);

	const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
	if (!report) return c.json({ error: "No encontrado" }, 404);
	// Solo tiene sentido aportar pistas sobre búsquedas / personas encontradas.
	if (!isReunificationType(report.type)) {
		return c.json({ error: "Este reporte no admite pistas." }, 400);
	}

	const body = await c.req.json().catch(() => null);
	const parsed = createTipSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Escribe la información que tienes." }, 400);
	}
	const mod = moderate(parsed.data.message);
	if (!mod.ok) {
		return c.json({ error: mod.reason ?? "Mensaje no permitido." }, 400);
	}

	const [tip] = await db
		.insert(reportTips)
		.values({
			reportId: id,
			message: parsed.data.message,
			contact: parsed.data.contact ?? null,
			name: parsed.data.name ?? null,
		})
		.returning();

	// Avisa por Web Push a la familia que vigila a esta persona.
	void notifyTipReceived(report.personName);

	return c.json({ tip: toPublicTip(tip) }, 201);
});

// GET /api/reports/:id/tips — ver las pistas recibidas (rescatista).
app.get("/:id/tips", async (c) => {
	if (!isRescuer(c)) return c.json({ error: "No autorizado" }, 401);
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id)) return c.json({ error: "id inválido" }, 400);
	const rows = await db
		.select()
		.from(reportTips)
		.where(eq(reportTips.reportId, id))
		.orderBy(asc(reportTips.createdAt))
		.limit(200);
	return c.json({ tips: rows.map(toPublicTip) });
});

// PATCH /api/reports/:id — mutar estado (rescatista)
app.patch("/:id", async (c) => {
	if (!isRescuer(c)) {
		return c.json({ error: "No autorizado" }, 401);
	}
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id)) {
		return c.json({ error: "id inválido" }, 400);
	}
	const body = await c.req.json().catch(() => null);
	const parsed = updateReportSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
	}

	const [updated] = await db
		.update(reports)
		.set({ ...parsed.data, updatedAt: new Date() })
		.where(eq(reports.id, id))
		.returning();

	if (!updated) {
		return c.json({ error: "No encontrado" }, 404);
	}

	// Al marcar a salvo / rescatado, avisa por Web Push a quienes la buscaban.
	if (
		(updated.status === "a_salvo" ||
			updated.status === "rescatado" ||
			updated.status === "encontrado") &&
		updated.personName
	) {
		void notifyPersonSafe(updated.personName, updated.status);
	}

	return c.json({ report: toPublic(updated, true) });
});

// DELETE /api/reports/:id — borrar un reporte (moderador con token).
app.delete("/:id", async (c) => {
	if (!isRescuer(c)) return c.json({ error: "No autorizado" }, 401);
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id)) return c.json({ error: "id inválido" }, 400);
	await db.delete(reports).where(eq(reports.id, id));
	return c.json({ ok: true });
});

export default app;
