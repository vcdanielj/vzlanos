import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL no está definida");
}

// max bajo: servicio pequeño, evita agotar conexiones de Postgres en prod.
const queryClient = postgres(connectionString, { max: 8 });

export const db = drizzle(queryClient, { schema });
export { schema };
