import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.ts";
import { reports } from "../db/schema.ts";
import { isRescuer } from "../lib/auth.ts";

const app = new Hono();

const escapeXml = (s: string | null): string =>
	(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

// Mapea nuestro estado al status PFIF (note/status).
const pfifStatus = (status: string): string => {
	switch (status) {
		case "a_salvo":
		case "rescatado":
			return "is_note_author"; // alguien dio fe de que está localizado
		case "descartado":
			return "";
		default:
			return "believed_missing";
	}
};

// GET /export/pfif — registros PFIF 1.4 de personas buscadas, para que
// Protección Civil / Cruz Roja crucen con sus bases (reunificación oficial).
app.get("/pfif", async (c) => {
	// PII de víctimas: solo para autoridades/organizaciones con token (no scraping público).
	if (!isRescuer(c)) {
		return c.json({ error: "No autorizado. Requiere token de organización." }, 401);
	}
	const rows = await db
		.select()
		.from(reports)
		.where(eq(reports.type, "busqueda_persona"))
		.orderBy(desc(reports.updatedAt))
		.limit(5000);

	const domain = new URL(c.req.url).host;
	const persons = rows
		.map((r) => {
			const recordId = `${domain}/person.${r.id}`;
			const status = pfifStatus(r.status);
			const note =
				status === ""
					? ""
					: `
		<pfif:note>
			<pfif:note_record_id>${escapeXml(domain)}/note.${r.id}</pfif:note_record_id>
			<pfif:person_record_id>${escapeXml(recordId)}</pfif:person_record_id>
			<pfif:source_date>${r.updatedAt.toISOString()}</pfif:source_date>
			<pfif:status>${status}</pfif:status>
			<pfif:text>${escapeXml(r.description)}</pfif:text>
		</pfif:note>`;
			return `	<pfif:person>
		<pfif:person_record_id>${escapeXml(recordId)}</pfif:person_record_id>
		<pfif:source_date>${r.createdAt.toISOString()}</pfif:source_date>
		<pfif:full_name>${escapeXml(r.personName)}</pfif:full_name>
		<pfif:home_street>${escapeXml(r.lastKnownAddress)}</pfif:home_street>
		<pfif:author_name>${escapeXml(r.reporterName)}</pfif:author_name>
	</pfif:person>${note}`;
		})
		.join("\n");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<pfif:pfif xmlns:pfif="http://zesty.ca/pfif/1.4">
${persons}
</pfif:pfif>
`;

	return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
});

export default app;
