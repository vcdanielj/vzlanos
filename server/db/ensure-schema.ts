import postgres from "postgres";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const createSchema = async () => {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL no está definida");
	const sql = postgres(url, { max: 1, connect_timeout: 10 });
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

// Asegura el esquema con reintentos. NO tumba el server si falla: el sitio debe
// cargar igual (la cola offline del cliente reintenta los reportes) y seguimos
// intentando crear la tabla en segundo plano hasta lograrlo.
export const ensureSchema = async (): Promise<boolean> => {
	for (let attempt = 1; attempt <= 12; attempt++) {
		try {
			await createSchema();
			console.log("Esquema de la DB asegurado.");
			return true;
		} catch (err) {
			console.error(`ensureSchema intento ${attempt}/12 falló:`, (err as Error).message);
			await sleep(5000);
		}
	}
	console.error("ensureSchema: no se pudo asegurar el esquema tras 12 intentos. El server arranca igual y reintentará en background.");
	// Reintento perezoso en background (cada 30s) por si la DB aparece luego.
	void (async () => {
		while (true) {
			await sleep(30000);
			try {
				await createSchema();
				console.log("Esquema de la DB asegurado (reintento background).");
				return;
			} catch {
				// sigue intentando
			}
		}
	})();
	return false;
};
