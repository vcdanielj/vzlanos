import { Loader2, RefreshCw, Search, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PersonCard } from "@/components/PersonCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listReports } from "@/lib/api";
import type { Report } from "@shared/types";

// Tablero público de reunificación: personas reportadas en vzlanos (búsquedas y
// encontrados). Cada tarjeta trae foto, datos y acciones (contactar familia,
// dejar una pista, compartir). Distinto del listado externo en /desaparecidos.
export const Reunir = () => {
	const [reports, setReports] = useState<Report[]>([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const all = await listReports();
			// Solo búsquedas y personas encontradas (los atrapados viven en /mapa).
			setReports(
				all.filter((r) => r.type === "busqueda_persona" || r.type === "encontrado"),
			);
		} catch {
			// silencioso; el polling reintenta
		} finally {
			setLoading(false);
		}
	}, []);

	// Polling cada 30s, pausado cuando la pestaña está oculta.
	useEffect(() => {
		let id: ReturnType<typeof setInterval> | undefined;
		const start = () => {
			if (id == null) id = setInterval(load, 30000);
		};
		const stop = () => {
			if (id != null) {
				clearInterval(id);
				id = undefined;
			}
		};
		const onVisibility = () => {
			if (document.hidden) stop();
			else {
				load();
				start();
			}
		};
		load();
		start();
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			stop();
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [load]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return reports;
		return reports.filter((r) => (r.personName ?? "").toLowerCase().includes(q));
	}, [reports, query]);

	const buscando = filtered.filter(
		(r) => r.status === "nuevo" || r.status === "en_progreso",
	).length;

	return (
		<div className="mx-auto max-w-2xl space-y-4">
			<div className="flex items-start justify-between gap-2">
				<div>
					<h1 className="text-xl font-bold">Reúne a los tuyos</h1>
					<p className="text-sm text-muted-foreground">
						Personas reportadas aquí en vzlanos. Si reconoces a alguien, deja una pista o
						contacta a su familia.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={load} disabled={loading}>
					{loading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="h-4 w-4" />
					)}
				</Button>
			</div>

			<div className="flex items-center gap-2 rounded-lg border bg-background px-3">
				<Search className="h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Buscar por nombre…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="border-0 px-0 focus-visible:ring-0"
				/>
			</div>

			<div className="flex flex-wrap gap-2 text-xs">
				<span className="rounded-md bg-muted px-2 py-1">Total: {filtered.length}</span>
				<span className="rounded-md bg-destructive/10 px-2 py-1 text-destructive">
					Buscando: {buscando}
				</span>
			</div>

			{!loading && filtered.length === 0 && (
				<div className="space-y-3 py-10 text-center">
					<p className="text-sm text-muted-foreground">
						{query
							? "Sin resultados para esa búsqueda."
							: "No hay personas reportadas como desaparecidas por ahora."}
					</p>
					<Button asChild variant="outline">
						<Link to="/buscar">
							<UserPlus className="h-4 w-4" /> Reportar una desaparición
						</Link>
					</Button>
				</div>
			)}

			<div className="space-y-3">
				{filtered.map((r) => (
					<PersonCard key={r.id} report={r} />
				))}
			</div>
		</div>
	);
};
