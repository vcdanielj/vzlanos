// Tipos compartidos entre cliente y servidor (sin runtime).

export const REPORT_TYPES = [
	"sos",
	"tercero",
	"busqueda_persona",
	"encontrado",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = [
	"nuevo",
	"en_progreso",
	"rescatado",
	"a_salvo",
	"encontrado",
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
	floor: string | null;
	injured: boolean | null;
	foundAt: string | null;
	description: string | null;
	status: ReportStatus;
	verified: boolean;
	claimedBy: string | null;
	// Reunificación (busqueda_persona)
	personName: string | null;
	hasPhoto: boolean;
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
	floor?: string | null;
	injured?: boolean | null;
	foundAt?: string | null;
	description?: string | null;
	personName?: string | null;
	photo?: string | null; // base64 sin prefijo
	photoMime?: string | null;
	lastKnownAddress?: string | null;
	relation?: string | null;
	reporterName?: string | null;
	reporterContact?: string | null;
	reporterCountry?: string | null;
	selfSafe?: boolean; // auto-reporte "estoy a salvo" (fija status a_salvo)
}

export interface GeocodeResult {
	lat: number;
	lng: number;
	displayName: string;
}

export interface Prayer {
	id: number;
	name: string | null;
	text: string;
	prayCount: number;
	createdAt: string;
}

export interface EarthquakeEvent {
	id: string;
	title: string;
	place: string;
	magnitude: number | null;
	depthKm: number | null;
	lat: number;
	lng: number;
	time: string;
	updatedAt: string;
	significance: number | null;
	feltReports: number | null;
	tsunami: boolean;
	source: string | null;
	url: string;
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
	nuevo: "Nuevo",
	en_progreso: "En progreso",
	rescatado: "Rescatado",
	a_salvo: "A salvo",
	encontrado: "Encontrada",
	descartado: "Descartado",
};

export const TYPE_LABELS: Record<ReportType, string> = {
	sos: "SOS — atrapado",
	tercero: "Reporte de terceros",
	busqueda_persona: "Búsqueda de persona",
	encontrado: "Persona encontrada",
};
