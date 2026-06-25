import { sql } from "drizzle-orm";
import {
	boolean,
	doublePrecision,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const reports = pgTable(
	"reports",
	{
		id: serial("id").primaryKey(),
		// sos | tercero | busqueda_persona
		type: text("type").notNull(),
		lat: doublePrecision("lat"),
		lng: doublePrecision("lng"),
		accuracy: doublePrecision("accuracy"),
		peopleCount: integer("people_count"),
		description: text("description"),
		// nuevo | en_progreso | rescatado | a_salvo | descartado
		status: text("status").notNull().default("nuevo"),
		verified: boolean("verified").notNull().default(false),
		claimedBy: text("claimed_by"),
		// Reunificación
		personName: text("person_name"),
		lastKnownAddress: text("last_known_address"),
		relation: text("relation"),
		reporterName: text("reporter_name"),
		reporterContact: text("reporter_contact"),
		reporterCountry: text("reporter_country"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	(t) => ({
		statusIdx: index("reports_status_idx").on(t.status),
		typeIdx: index("reports_type_idx").on(t.type),
		createdIdx: index("reports_created_idx").on(t.createdAt),
	}),
);

export type ReportRow = typeof reports.$inferSelect;
export type NewReportRow = typeof reports.$inferInsert;
