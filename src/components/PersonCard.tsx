import { MapPin, Navigation, Share2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TengoInfo } from "@/components/TengoInfo";
import {
	directionsUrl,
	shareSearchMessage,
	tipToFamilyMessage,
	toWhatsappNumber,
	whatsappShareUrl,
	whatsappToUrl,
} from "@/lib/share";
import type { Report, ReportStatus } from "@shared/types";
import { STATUS_LABELS } from "@shared/types";

const statusVariant = (
	s: ReportStatus,
): "default" | "success" | "warning" | "destructive" | "secondary" => {
	if (s === "a_salvo" || s === "rescatado" || s === "encontrado") return "success";
	if (s === "en_progreso") return "warning";
	if (s === "descartado") return "secondary";
	return "destructive";
};

// Etiqueta amigable: una búsqueda abierta dice "Buscando" en vez de "Nuevo".
const displayStatus = (r: Report): string => {
	if (r.type === "busqueda_persona" && (r.status === "nuevo" || r.status === "en_progreso")) {
		return "Buscando";
	}
	return STATUS_LABELS[r.status];
};

const sexLabel = (sex: string | null): string | null =>
	sex === "F" ? "Mujer" : sex === "M" ? "Hombre" : null;

// Tarjeta de una persona buscada/encontrada con acciones de reunificación:
// contactar a la familia, aportar una pista y difundir la búsqueda.
export const PersonCard = ({ report: r }: { report: Report }) => {
	const waNumber = toWhatsappNumber(r.reporterContact);
	const photoUrl = r.hasPhoto ? `/api/reports/${r.id}/photo` : null;
	const rasgos = [r.age != null ? `${r.age} años` : null, sexLabel(r.sex)]
		.filter(Boolean)
		.join(" · ");

	const onShare = () => {
		const origin = window.location.origin;
		const text = shareSearchMessage({
			personName: r.personName,
			age: r.age,
			sex: r.sex,
			lastSeen: r.lastSeen,
			lastKnownAddress: r.lastKnownAddress,
			photoUrl: photoUrl ? `${origin}${photoUrl}` : null,
			boardUrl: `${origin}/desaparecidos`,
		});
		window.open(whatsappShareUrl(text), "_blank", "noopener");
	};

	return (
		<Card>
			<CardContent className="space-y-3 p-4">
				<div className="flex items-start gap-3">
					{photoUrl ? (
						<img
							src={photoUrl}
							alt={r.personName ?? "Persona"}
							className="h-20 w-20 shrink-0 rounded-lg border object-cover"
							loading="lazy"
						/>
					) : (
						<div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
							<UserRound className="h-7 w-7" />
						</div>
					)}
					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-2">
							<span className="font-semibold leading-tight">
								{r.personName ?? "Persona no identificada"}
							</span>
							<Badge variant={statusVariant(r.status)} className="shrink-0">
								{displayStatus(r)}
							</Badge>
						</div>
						{rasgos && <div className="text-sm text-muted-foreground">{rasgos}</div>}
						{r.foundAt && (
							<div className="text-xs font-medium text-teal-700">
								✓ Encontrada en {r.foundAt}
							</div>
						)}
						{r.lastSeen && (
							<div className="mt-0.5 text-xs text-muted-foreground">
								Vista por última vez: {r.lastSeen}
							</div>
						)}
						{r.lastKnownAddress && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<MapPin className="h-3 w-3 shrink-0" /> {r.lastKnownAddress}
							</div>
						)}
					</div>
				</div>

				{r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}

				{r.tipCount > 0 && (
					<p className="text-xs font-medium text-sky-700">
						🔎 {r.tipCount} {r.tipCount === 1 ? "pista recibida" : "pistas recibidas"}
					</p>
				)}

				<div className="flex flex-wrap gap-2">
					{waNumber && (
						<Button
							size="sm"
							className="flex-1"
							onClick={() =>
								window.open(
									whatsappToUrl(waNumber, tipToFamilyMessage(r.personName)),
									"_blank",
									"noopener",
								)
							}
						>
							Contactar por WhatsApp
						</Button>
					)}
					{r.lat != null && r.lng != null && (
						<Button asChild size="sm" variant="outline">
							<a href={directionsUrl(r.lat, r.lng)} target="_blank" rel="noreferrer">
								<Navigation className="h-4 w-4" /> Cómo llegar
							</a>
						</Button>
					)}
					<Button size="sm" variant="outline" onClick={onShare}>
						<Share2 className="h-4 w-4" /> Compartir
					</Button>
				</div>

				<TengoInfo reportId={r.id} personName={r.personName} className="w-full" />
			</CardContent>
		</Card>
	);
};
