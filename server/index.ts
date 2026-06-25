import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { ensureSchema } from "./db/ensure-schema.ts";
import chatRoutes from "./routes/chat.ts";
import geocodeRoutes from "./routes/geocode.ts";
import earthquakeRoutes from "./routes/earthquakes.ts";
import pfifRoutes from "./routes/pfif.ts";
import prayerRoutes from "./routes/prayers.ts";
import pushRoutes from "./routes/push.ts";
import reportRoutes from "./routes/reports.ts";

const app = new Hono();
app.use("*", logger());

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/reports", reportRoutes);
app.route("/api/geocode", geocodeRoutes);
app.route("/api/earthquakes", earthquakeRoutes);
app.route("/api/push", pushRoutes);
app.route("/api/prayers", prayerRoutes);
app.route("/api/chat", chatRoutes);
app.route("/export", pfifRoutes);

// En producción servimos el build de Vite (dist). Primero los archivos reales
// (index.html, /assets, og.png, manifest, sw.js, icon.svg); las rutas del SPA que
// no son un archivo caen a index.html.
const distDir = path.resolve(process.cwd(), "dist");
if (existsSync(distDir)) {
	const indexHtml = readFileSync(path.join(distDir, "index.html"), "utf8");
	app.use("*", serveStatic({ root: "./dist" }));
	// Fallback SPA: GET que no matcheó API/export ni un archivo estático.
	app.get("*", (c) => c.html(indexHtml));
}

const port = Number(process.env.PORT ?? 3000);

if (!process.env.RESCUER_TOKEN) {
	console.warn(
		"⚠️  RESCUER_TOKEN no está definido: los rescatistas NO podrán cambiar estados (PATCH).",
	);
}

// No bloquea el arranque: el server debe levantar aunque la DB tarde.
void ensureSchema();

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`emergencia server escuchando en :${info.port}`);
});
