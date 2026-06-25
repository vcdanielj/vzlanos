import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
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

	// Polling cada 15s para ver reportes nuevos sin recargar.
	useEffect(() => {
		load();
		const id = setInterval(load, 15000);
		return () => clearInterval(id);
	}, [load]);

	const saveToken = () => {
		setRescuerToken(token.trim());
		setSavedToken(token.trim());
		load();
	};

	const mutate = async (r: Report, to: ReportStatus) => {
		try {
			await updateReport(r.id, { status: to });
			load();
		} catch (e) {
			alert(e instanceof Error ? e.message : "No se pudo actualizar");
		}
	};

	const isRescuer = savedToken.length > 0;

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

			<MapView reports={reports} height={360} />

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
									<Badge
										variant={
											r.status === "rescatado" || r.status === "a_salvo"
												? "success"
												: r.status === "en_progreso"
													? "warning"
													: "destructive"
										}
									>
										{STATUS_LABELS[r.status]}
									</Badge>
								</div>
								{r.description && (
									<p className="text-sm text-muted-foreground">{r.description}</p>
								)}
								{r.lastKnownAddress && (
									<p className="text-sm text-muted-foreground">📍 {r.lastKnownAddress}</p>
								)}
								{isRescuer && r.reporterContact && (
									<p className="text-sm">
										📞{" "}
										<a className="underline" href={`tel:${r.reporterContact}`}>
											{r.reporterContact}
										</a>
									</p>
								)}
								{isRescuer && next && (
									<Button size="sm" className="w-full" onClick={() => mutate(r, next.to)}>
										{next.label}
									</Button>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
};
