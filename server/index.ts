import { existsSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { ensureSchema } from "./db/ensure-schema.ts";
import geocodeRoutes from "./routes/geocode.ts";
import pfifRoutes from "./routes/pfif.ts";
import reportRoutes from "./routes/reports.ts";

const app = new Hono();
app.use("*", logger());

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/reports", reportRoutes);
app.route("/api/geocode", geocodeRoutes);
app.route("/export", pfifRoutes);

// En producción servimos el build de Vite (dist). El SPA hace fallback a index.html.
const distDir = path.resolve(process.cwd(), "dist");
if (existsSync(distDir)) {
	app.use("/assets/*", serveStatic({ root: "./dist" }));
	app.use(
		"*",
		serveStatic({
			root: "./dist",
			// Fallback SPA: cualquier ruta no-API devuelve index.html
			rewriteRequestPath: (p) =>
				p.startsWith("/api") || p.startsWith("/export") ? p : "/index.html",
		}),
	);
}

const port = Number(process.env.PORT ?? 3000);

await ensureSchema().catch((err) => {
	console.error("Error asegurando el esquema de la DB:", err);
	process.exit(1);
});

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`emergencia server escuchando en :${info.port}`);
});
