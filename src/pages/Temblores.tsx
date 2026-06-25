import {
	Activity,
	ExternalLink,
	Loader2,
	Navigation,
	RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listEarthquakes } from "@/lib/api";
import type { EarthquakeEvent } from "@shared/types";

const WINDOWS = [
	{ hours: 24, label: "24 horas" },
	{ hours: 24 * 7, label: "7 días" },
] as const;

const formatDate = (value: string) =>
	new Intl.DateTimeFormat("es-VE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));

const magnitudeTone = (magnitude: number | null) => {
	if (magnitude == null) return "bg-muted text-muted-foreground";
	if (magnitude >= 5) return "bg-destructive text-destructive-foreground";
	if (magnitude >= 4) return "bg-amber-500/15 text-amber-700";
	return "bg-vzla-blue/10 text-vzla-blue";
};

const mapsUrl = (event: EarthquakeEvent) =>
	`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
		`${event.lat},${event.lng}`,
	)}`;

export const Temblores = () => {
	const [earthquakes, setEarthquakes] = useState<EarthquakeEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [hours, setHours] = useState<(typeof WINDOWS)[number]["hours"]>(24);
	const [lastUpdated, setLastUpdated] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const data = await listEarthquakes({ hours });
			setEarthquakes(data);
			setLastUpdated(new Date().toISOString());
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo cargar el listado");
		} finally {
			setLoading(false);
		}
	}, [hours]);

	useEffect(() => {
		let id: ReturnType<typeof setInterval> | undefined;
		const start = () => {
			if (id == null) id = setInterval(load, 60_000);
		};
		const stop = () => {
			if (id != null) {
				clearInterval(id);
				id = undefined;
			}
		};
		const onVisibility = () => {
			if (document.hidden) {
				stop();
			} else {
				void load();
				start();
			}
		};
		void load();
		start();
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			stop();
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [load]);

	const strongest = useMemo(
		() =>
			earthquakes.reduce<number | null>(
				(max: number | null, event: EarthquakeEvent) =>
					event.magnitude == null ? max : Math.max(max ?? event.magnitude, event.magnitude),
				null,
			),
		[earthquakes],
	);

	return (
		<div className="mx-auto max-w-3xl space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<h1 className="flex items-center gap-2 text-xl font-bold">
						<Activity className="h-5 w-5 text-vzla-red" /> Temblores en Venezuela
					</h1>
					<p className="text-sm text-muted-foreground">
						Listado reciente de sismos detectados en Venezuela con consulta casi en tiempo real.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
					{loading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="h-4 w-4" />
					)}
					Actualizar
				</Button>
			</div>

			<Card>
				<CardContent className="space-y-3 p-4">
					<div className="flex flex-wrap gap-2">
						{WINDOWS.map((window) => (
							<Button
								key={window.hours}
								size="sm"
								variant={hours === window.hours ? "default" : "outline"}
								onClick={() => setHours(window.hours)}
							>
								{window.label}
							</Button>
						))}
					</div>
					<div className="flex flex-wrap gap-2 text-xs">
						<span className="rounded-md bg-muted px-2 py-1">
							Eventos: {earthquakes.length}
						</span>
						<span className="rounded-md bg-vzla-blue/10 px-2 py-1 text-vzla-blue">
							Más fuerte: {strongest != null ? `M ${strongest.toFixed(1)}` : "Sin dato"}
						</span>
						{lastUpdated && (
							<span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
								Actualizado: {formatDate(lastUpdated)}
							</span>
						)}
					</div>
				</CardContent>
			</Card>

			{error && (
				<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			)}

			<div className="space-y-3">
				{!loading && earthquakes.length === 0 && !error && (
					<Card>
						<CardContent className="py-8 text-center text-sm text-muted-foreground">
							No hay temblores reportados para esta ventana de tiempo.
						</CardContent>
					</Card>
				)}

				{earthquakes.map((event: EarthquakeEvent) => (
					<Card key={event.id}>
						<CardContent className="space-y-3 p-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div className="space-y-1">
									<div className="flex flex-wrap items-center gap-2">
										<span
											className={`rounded-full px-2.5 py-1 text-xs font-semibold ${magnitudeTone(event.magnitude)}`}
										>
											{event.magnitude != null ? `M ${event.magnitude.toFixed(1)}` : "Magnitud s/d"}
										</span>
										<span className="text-xs text-muted-foreground">
											{formatDate(event.time)}
										</span>
									</div>
									<div className="font-semibold">{event.place}</div>
									<div className="text-sm text-muted-foreground">{event.title}</div>
								</div>
								<div className="flex shrink-0 flex-wrap gap-2">
									<a
										href={mapsUrl(event)}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1 rounded-md border px-2.5 py-2 text-xs font-medium text-vzla-blue hover:bg-accent"
									>
										<Navigation className="h-4 w-4" /> Ver mapa
									</a>
									<a
										href={event.url}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1 rounded-md border px-2.5 py-2 text-xs font-medium hover:bg-accent"
									>
										<ExternalLink className="h-4 w-4" /> Fuente
									</a>
								</div>
							</div>

							<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
								<span className="rounded-md bg-muted px-2 py-1">
									Profundidad: {event.depthKm != null ? `${event.depthKm.toFixed(1)} km` : "s/d"}
								</span>
								<span className="rounded-md bg-muted px-2 py-1">
									Red: {event.source ?? "USGS"}
								</span>
								{event.significance != null && (
									<span className="rounded-md bg-muted px-2 py-1">
										Significancia: {event.significance}
									</span>
								)}
								{event.feltReports != null && (
									<span className="rounded-md bg-muted px-2 py-1">
										Reportes de percepción: {event.feltReports}
									</span>
								)}
								{event.tsunami && (
									<span className="rounded-md bg-destructive/10 px-2 py-1 text-destructive">
										<Activity className="mr-1 inline h-3.5 w-3.5" /> Posible alerta de tsunami
									</span>
								)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
				Fuente: USGS. La publicación puede tardar algunos minutos desde el evento real.
			</p>
		</div>
	);
};
