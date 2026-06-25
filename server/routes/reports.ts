import { and, desc, eq, gte, ilike } from "drizzle-orm";
import { Hono } from "hono";
import type { Report } from "../../shared/types.ts";
import { db } from "../db/client.ts";
import { reports, type ReportRow } from "../db/schema.ts";
import { isRescuer } from "../lib/auth.ts";
import { haversineMeters } from "../lib/geo.ts";
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
	description: row.description,
	status: row.status as Report["status"],
	verified: row.verified,
	claimedBy: row.claimedBy,
	personName: row.personName,
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
				haversineMeters(data.lat as number, data.lng as number, r.lat, r.lng) < 40,
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
			description: data.description ?? null,
			personName: data.personName ?? null,
			lastKnownAddress: data.lastKnownAddress ?? null,
			relation: data.relation ?? null,
			reporterName: data.reporterName ?? null,
			reporterContact: data.reporterContact ?? null,
			reporterCountry: data.reporterCountry ?? null,
		})
		.returning();

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
	return c.json({ report: toPublic(updated, true) });
});

export default app;
