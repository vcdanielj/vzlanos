import postgres from "postgres";

// Crea la tabla en el arranque (idempotente). Evita depender de drizzle-kit
// en runtime y de acceso externo a la DB (es interna al server en prod).
export const ensureSchema = async () => {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL no está definida");
	const sql = postgres(url, { max: 1 });
	try {
		await sql`
			CREATE TABLE IF NOT EXISTS reports (
				id serial PRIMARY KEY,
				type text NOT NULL,
				lat double precision,
				lng double precision,
				accuracy double precision,
				people_count integer,
				description text,
				status text NOT NULL DEFAULT 'nuevo',
				verified boolean NOT NULL DEFAULT false,
				claimed_by text,
				person_name text,
				last_known_address text,
				relation text,
				reporter_name text,
				reporter_contact text,
				reporter_country text,
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now()
			)
		`;
		await sql`CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status)`;
		await sql`CREATE INDEX IF NOT EXISTS reports_type_idx ON reports (type)`;
		await sql`CREATE INDEX IF NOT EXISTS reports_created_idx ON reports (created_at)`;
	} finally {
		await sql.end();
	}
};
