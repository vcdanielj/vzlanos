import { and, desc, eq, gte, ilike, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Report } from "../../shared/types.ts";
import { db } from "../db/client.ts";
import { reports, type ReportRow } from "../db/schema.ts";
import { isRescuer } from "../lib/auth.ts";
import { haversineMeters } from "../lib/geo.ts";
import { notifyPersonSafe } from "../lib/push.ts";
import { rateLimit } from "../lib/ratelimit.ts";
import {
	createReportSchema,
	searchSchema,
	updateReportSchema,
} from "../lib/validation.ts";

const app = new Hono();

// Convierte una fila DB a la forma pública; oculta el contacto salvo rescatistas.
const toPublic = (row: ReportRow, includeContact: boolean): Report => ({
	id: row.id,
	type: row.type as Report["type"],
	lat: row.lat,
	lng: row.lng,
	accuracy: row.accuracy,
	peopleCount: row.peopleCount,
	floor: row.floor,
	injured: row.injured,
	description: row.description,
	status: row.status as Report["status"],
	verified: row.verified,
	claimedBy: row.claimedBy,
	personName: row.personName,
	hasPhoto: !!(row.photo && row.photo.length > 0),
	lastKnownAddress: row.lastKnownAddress,
	relation: row.relation,
	reporterName: row.reporterName,
	reporterCountry: row.reporterCountry,
	...(includeContact ? { reporterContact: row.reporterContact } : {}),
	createdAt: row.createdAt.toISOString(),
	updatedAt: row.updatedAt.toISOString(),
});

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

	// Honeypot: si el campo oculto viene lleno, es un bot. Respondemos OK sin insertar.
	if (data.website && data.website.trim().length > 0) {
		return c.json({ report: null, ok: true }, 201);
	}

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
			description: data.description ?? null,
			personName: data.personName ?? null,
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

	// Si alguien se auto-reporta a salvo, CRUZA con los reportes abiertos del mismo
	// nombre y márcalos a salvo (así la búsqueda de la familia se actualiza sola),
	// y avisa por Web Push a quienes lo buscaban.
	if (data.selfSafe && data.type === "busqueda_persona" && inserted.personName) {
		const norm = inserted.personName.trim().toLowerCase();
		await db
			.update(reports)
			.set({ status: "a_salvo", updatedAt: new Date() })
			.where(
				and(
					eq(reports.type, "busqueda_persona"),
					inArray(reports.status, ["nuevo", "en_progreso"]),
					sql`lower(trim(${reports.personName})) = ${norm}`,
				),
			);
		void notifyPersonSafe(inserted.personName, "a_salvo");
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
	if (type) conditions.push(eq(reports.type, type));

	const rows = await db
		.select()
		.from(reports)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(reports.createdAt))
		.limit(2000);

	return c.json({ reports: rows.map((r) => toPublic(r, rescuer)) });
});

// GET /api/reports/search?name= — seguimiento por nombre (familiares)
app.get("/search", async (c) => {
	const parsed = searchSchema.safeParse({ name: c.req.query("name") });
	if (!parsed.success) {
		return c.json({ error: "Falta el nombre a buscar" }, 400);
	}
	const rows = await db
		.select()
		.from(reports)
		.where(ilike(reports.personName, `%${parsed.data.name}%`))
		.orderBy(desc(reports.updatedAt))
		.limit(100);
	return c.json({ reports: rows.map((r) => toPublic(r, false)) });
});

// GET /api/reports/:id/photo — sirve la foto del desaparecido (base64 → bytes)
app.get("/:id/photo", async (c) => {
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id)) return c.json({ error: "id inválido" }, 400);
	const [row] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
	if (!row?.photo) return c.json({ error: "Sin foto" }, 404);
	const bytes = Buffer.from(row.photo, "base64");
	return c.body(bytes, 200, {
		"Content-Type": row.photoMime ?? "image/jpeg",
		"Cache-Control": "public, max-age=3600",
	});
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
		(updated.status === "a_salvo" || updated.status === "rescatado") &&
		updated.personName
	) {
		void notifyPersonSafe(updated.personName, updated.status);
	}

	return c.json({ report: toPublic(updated, true) });
});

export default app;
