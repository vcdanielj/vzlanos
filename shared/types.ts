// Tipos compartidos entre cliente y servidor (sin runtime).

export const REPORT_TYPES = ["sos", "tercero", "busqueda_persona"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = [
	"nuevo",
	"en_progreso",
	"rescatado",
	"a_salvo",
	"descartado",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface Report {
	id: number;
	type: ReportType;
	lat: number | null;
	lng: number | null;
	accuracy: number | null;
	peopleCount: number | null;
	description: string | null;
	status: ReportStatus;
	verified: boolean;
	claimedBy: string | null;
	// Reunificación (busqueda_persona)
	personName: string | null;
	lastKnownAddress: string | null;
	relation: string | null;
	reporterName: string | null;
	reporterCountry: string | null;
	// reporterContact solo se expone a rescatistas
	reporterContact?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateReportInput {
	type: ReportType;
	lat?: number | null;
	lng?: number | null;
	accuracy?: number | null;
	peopleCount?: number | null;
	description?: string | null;
	personName?: string | null;
	lastKnownAddress?: string | null;
	relation?: string | null;
	reporterName?: string | null;
	reporterContact?: string | null;
	reporterCountry?: string | null;
}

export interface GeocodeResult {
	lat: number;
	lng: number;
	displayName: string;
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
	nuevo: "Nuevo",
	en_progreso: "En progreso",
	rescatado: "Rescatado",
	a_salvo: "A salvo",
	descartado: "Descartado",
};

export const TYPE_LABELS: Record<ReportType, string> = {
	sos: "SOS — atrapado",
	tercero: "Reporte de terceros",
	busqueda_persona: "Búsqueda de persona",
};
