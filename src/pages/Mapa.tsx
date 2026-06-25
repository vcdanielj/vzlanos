import { BadgeCheck, Loader2, Navigation, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MapView } from "@/components/MapView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	getRescuerToken,
	listReports,
	setRescuerToken,
	updateReport,
} from "@/lib/api";
import { toPlusCode } from "@/lib/pluscode";
import { directionsUrl } from "@/lib/share";
import type { Report, ReportStatus } from "@shared/types";
import { STATUS_LABELS, TYPE_LABELS } from "@shared/types";

const FILTERS: Array<{ key: string; label: string }> = [
	{ key: "", label: "Todos" },
	{ key: "nuevo", label: "Nuevos" },
	{ key: "en_progreso", label: "En progreso" },
	{ key: "rescatado", label: "Rescatados" },
];

const NEXT_STATUS: Partial<Record<ReportStatus, { to: ReportStatus; label: string }>> = {
	nuevo: { to: "en_progreso", label: "Tomar (en progreso)" },
	en_progreso: { to: "rescatado", label: "Marcar rescatado" },
};

export const Mapa = () => {
	const [reports, setReports] = useState<Report[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState("");
	const [token, setTokenState] = useState(getRescuerToken());
	const [savedToken, setSavedToken] = useState(getRescuerToken());
	const [actionError, setActionError] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setReports(await listReports(filter ? { status: filter } : undefined));
		} catch {
			// silencioso; reintenta con el polling
		} finally {
			setLoading(false);
		}
	}, [filter]);

	// Polling cada 15s para ver reportes nuevos. Se pausa si la pestaña está
	// oculta (ahorra batería/datos) y refresca al volver a primer plano.
	useEffect(() => {
		let id: ReturnType<typeof setInterval> | undefined;
		const start = () => {
			if (id == null) id = setInterval(load, 15000);
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

	const saveToken = () => {
		setRescuerToken(token.trim());
		setSavedToken(token.trim());
		load();
	};

	const mutate = async (r: Report, to: ReportStatus) => {
		setActionError("");
		try {
			await updateReport(r.id, { status: to });
			load();
		} catch (e) {
			setActionError(e instanceof Error ? e.message : "No se pudo actualizar");
			setTimeout(() => setActionError(""), 4000);
		}
	};

	const verify = async (r: Report) => {
		setActionError("");
		try {
			await updateReport(r.id, { verified: true });
			load();
		} catch (e) {
			setActionError(e instanceof Error ? e.message : "No se pudo verificar");
			setTimeout(() => setActionError(""), 4000);
		}
	};

	const isRescuer = savedToken.length > 0;
	const counts = {
		total: reports.length,
		nuevo: reports.filter((r) => r.status === "nuevo").length,
		en_progreso: reports.filter((r) => r.status === "en_progreso").length,
		rescatado: reports.filter((r) => r.status === "rescatado").length,
	};

	return (
		<div className="mx-auto max-w-3xl space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-bold">Mapa de rescate</h1>
				<Button variant="outline" size="sm" onClick={load} disabled={loading}>
					{loading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="h-4 w-4" />
					)}
					Actualizar
				</Button>
			</div>

			<MapView reports={reports} />

			{actionError && (
				<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
					{actionError}
				</div>
			)}

			<div className="flex flex-wrap gap-2">
				{FILTERS.map((f) => (
					<Button
						key={f.key}
						size="sm"
						variant={filter === f.key ? "default" : "outline"}
						onClick={() => setFilter(f.key)}
					>
						{f.label}
					</Button>
				))}
			</div>

			<div className="flex flex-wrap gap-2 text-xs">
				<span className="rounded-md bg-muted px-2 py-1">Total: {counts.total}</span>
				<span className="rounded-md bg-destructive/10 px-2 py-1 text-destructive">
					Nuevos: {counts.nuevo}
				</span>
				<span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-700">
					En progreso: {counts.en_progreso}
				</span>
				<span className="rounded-md bg-emerald-600/10 px-2 py-1 text-emerald-700">
					Rescatados: {counts.rescatado}
				</span>
			</div>

			<Card>
				<CardContent className="flex items-end gap-2 p-4">
					<div className="flex-1 space-y-1">
						<div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<ShieldCheck className="h-3.5 w-3.5" /> Acceso de rescatista (token)
						</div>
						<Input
							type="password"
							placeholder="Token para cambiar estados"
							value={token}
							onChange={(e) => setTokenState(e.target.value)}
						/>
					</div>
					<Button onClick={saveToken}>Guardar</Button>
				</CardContent>
			</Card>

			<div className="space-y-2">
				{reports.length === 0 && !loading && (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Sin reportes en este filtro.
					</p>
				)}
				{reports.map((r) => {
					const next = NEXT_STATUS[r.status];
					return (
						<Card key={r.id}>
							<CardContent className="space-y-2 p-4">
								<div className="flex items-start justify-between gap-2">
									<div>
										<div className="text-xs font-medium text-muted-foreground">
											{TYPE_LABELS[r.type]}
										</div>
										<div className="font-semibold">
											{r.personName ??
												(r.peopleCount != null
													? `${r.peopleCount} persona(s)`
													: "Reporte")}
										</div>
									</div>
									<div className="flex shrink-0 items-center gap-1">
										{r.verified && (
											<Badge variant="secondary" className="gap-1">
												<BadgeCheck className="h-3 w-3" /> Verificado
											</Badge>
										)}
										<Badge
											variant={
												r.status === "rescatado" ||
												r.status === "a_salvo" ||
												r.status === "encontrado"
													? "success"
													: r.status === "en_progreso"
														? "warning"
														: "destructive"
											}
										>
											{STATUS_LABELS[r.status]}
										</Badge>
									</div>
								</div>
								{r.cedula && (
									<p className="text-xs text-muted-foreground">🪪 Cédula: {r.cedula}</p>
								)}
								{(r.injured || r.floor) && (
									<div className="flex flex-wrap gap-1.5">
										{r.injured && <Badge variant="destructive">Hay heridos</Badge>}
										{r.floor && <Badge variant="outline">Piso: {r.floor}</Badge>}
									</div>
								)}
								{r.description && (
									<p className="text-sm text-muted-foreground">{r.description}</p>
								)}
								{r.lastKnownAddress && (
									<p className="text-sm text-muted-foreground">📍 {r.lastKnownAddress}</p>
								)}
								{r.lat != null && r.lng != null && (
									<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
										<code className="font-mono">{toPlusCode(r.lat, r.lng)}</code>
										<a
											className="inline-flex items-center gap-1 text-sky-700 underline"
											href={directionsUrl(r.lat, r.lng)}
											target="_blank"
											rel="noreferrer"
										>
											<Navigation className="h-3 w-3" /> Cómo llegar
										</a>
									</div>
								)}
								{isRescuer && r.reporterContact && (
									<p className="text-sm">
										📞{" "}
										<a className="underline" href={`tel:${r.reporterContact}`}>
											{r.reporterContact}
										</a>
									</p>
								)}
								{isRescuer && (next || !r.verified) && (
									<div className="flex gap-2">
										{!r.verified && (
											<Button
												size="sm"
												variant="outline"
												className="flex-1"
												onClick={() => verify(r)}
											>
												<BadgeCheck className="h-4 w-4" /> Verificar
											</Button>
										)}
										{next && (
											<Button size="sm" className="flex-1" onClick={() => mutate(r, next.to)}>
												{next.label}
											</Button>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
};
