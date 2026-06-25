import type {
	CreateReportInput,
	GeocodeResult,
	Report,
} from "@shared/types";

const RESCUER_TOKEN_KEY = "rescuer_token";
const QUEUE_KEY = "pending_reports";

export const getRescuerToken = () => localStorage.getItem(RESCUER_TOKEN_KEY) ?? "";
export const setRescuerToken = (t: string) => localStorage.setItem(RESCUER_TOKEN_KEY, t);

const rescuerHeaders = (): Record<string, string> => {
	const t = getRescuerToken();
	return t ? { "x-rescuer-token": t } : {};
};

// --- Cola offline: si no hay red, guardamos el reporte y reintentamos ---
const readQueue = (): CreateReportInput[] => {
	try {
		return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
	} catch {
		return [];
	}
};
const writeQueue = (q: CreateReportInput[]) =>
	localStorage.setItem(QUEUE_KEY, JSON.stringify(q));

export const pendingCount = () => readQueue().length;

export const flushQueue = async (): Promise<number> => {
	const q = readQueue();
	if (!q.length) return 0;
	const remaining: CreateReportInput[] = [];
	let sent = 0;
	for (const item of q) {
		try {
			const res = await fetch("/api/reports", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(item),
			});
			if (res.ok) sent++;
			else remaining.push(item);
		} catch {
			remaining.push(item);
		}
	}
	writeQueue(remaining);
	return sent;
};

export interface CreateResult {
	report?: Report;
	duplicate?: boolean;
	queued?: boolean;
}

export const createReport = async (input: CreateReportInput): Promise<CreateResult> => {
	try {
		const res = await fetch("/api/reports", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		if (!res.ok) {
			// 400 = datos inválidos: no encolar, error real.
			if (res.status === 400) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? "Datos inválidos");
			}
			throw new Error("server");
		}
		return (await res.json()) as CreateResult;
	} catch (err) {
		if (err instanceof Error && err.message !== "server") throw err;
		// Sin red / error de servidor → encolar para reintento.
		const q = readQueue();
		q.push(input);
		writeQueue(q);
		return { queued: true };
	}
};

export const listReports = async (params?: {
	status?: string;
	type?: string;
}): Promise<Report[]> => {
	const qs = new URLSearchParams();
	if (params?.status) qs.set("status", params.status);
	if (params?.type) qs.set("type", params.type);
	const res = await fetch(`/api/reports?${qs.toString()}`, {
		headers: rescuerHeaders(),
	});
	if (!res.ok) throw new Error("No se pudo cargar la lista");
	const data = await res.json();
	return data.reports as Report[];
};

export const searchByName = async (name: string): Promise<Report[]> => {
	const res = await fetch(`/api/reports/search?name=${encodeURIComponent(name)}`);
	if (!res.ok) throw new Error("No se pudo buscar");
	const data = await res.json();
	return data.reports as Report[];
};

export const updateReport = async (
	id: number,
	patch: { status?: string; verified?: boolean; claimedBy?: string | null },
): Promise<Report> => {
	const res = await fetch(`/api/reports/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json", ...rescuerHeaders() },
		body: JSON.stringify(patch),
	});
	if (res.status === 401) throw new Error("Token de rescatista inválido");
	if (!res.ok) throw new Error("No se pudo actualizar");
	const data = await res.json();
	return data.report as Report;
};

export const geocode = async (address: string): Promise<GeocodeResult> => {
	const res = await fetch("/api/geocode", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ address }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? "No se encontró la dirección");
	}
	const data = await res.json();
	return data.result as GeocodeResult;
};
