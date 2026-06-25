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
	uniqueIndex,
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
		floor: text("floor"),
		injured: boolean("injured"),
		// Dónde se encontró a la persona (hospital / iglesia / albergue / calle).
		foundAt: text("found_at"),
		description: text("description"),
		// nuevo | en_progreso | rescatado | a_salvo | descartado
		status: text("status").notNull().default("nuevo"),
		verified: boolean("verified").notNull().default(false),
		claimedBy: text("claimed_by"),
		// Reunificación
		personName: text("person_name"),
		// Foto del desaparecido: base64 (sin prefijo) + mime. Se sirve por /photo, no en listas.
		photo: text("photo"),
		photoMime: text("photo_mime"),
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

// Suscripciones Web Push: avisar a la familia cuando aparezca novedad de una persona.
export const pushSubs = pgTable(
	"push_subs",
	{
		id: serial("id").primaryKey(),
		endpoint: text("endpoint").notNull(),
		p256dh: text("p256dh").notNull(),
		auth: text("auth").notNull(),
		// Nombre (normalizado, minúsculas) de la persona por la que quieren aviso.
		personName: text("person_name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	(t) => ({
		nameIdx: index("push_subs_name_idx").on(t.personName),
		// Una suscripción por (navegador, persona): permite vigilar varias personas.
		endpointPersonIdx: uniqueIndex("push_subs_endpoint_person_idx").on(
			t.endpoint,
			t.personName,
		),
	}),
);

export type PushSubRow = typeof pushSubs.$inferSelect;

// Sala de oración: peticiones y palabras de aliento de la comunidad.
export const prayers = pgTable(
	"prayers",
	{
		id: serial("id").primaryKey(),
		name: text("name"),
		text: text("text").notNull(),
		prayCount: integer("pray_count").notNull().default(0),
		hidden: boolean("hidden").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	(t) => ({
		createdIdx: index("prayers_created_idx").on(t.createdAt),
	}),
);

export type PrayerRow = typeof prayers.$inferSelect;

// Chat en vivo comunitario (conversacional, tiempo real por SSE).
export const chatMessages = pgTable(
	"chat_messages",
	{
		id: serial("id").primaryKey(),
		name: text("name"),
		text: text("text").notNull(),
		hidden: boolean("hidden").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	(t) => ({
		createdIdx: index("chat_created_idx").on(t.createdAt),
	}),
);

export type ChatRow = typeof chatMessages.$inferSelect;
