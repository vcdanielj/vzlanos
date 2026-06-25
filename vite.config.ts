import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@shared": path.resolve(__dirname, "./shared"),
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/api": "http://localhost:3000",
			"/export": "http://localhost:3000",
		},
	},
	build: {
		outDir: "dist",
		sourcemap: false,
	},
});
