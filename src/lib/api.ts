import type {
	ChatMessage,
	CreateReportInput,
	EarthquakeEvent,
	GeocodeResult,
	Prayer,
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

// --- Sala de oración ---
export const listPrayers = async (): Promise<Prayer[]> => {
	const res = await fetch("/api/prayers");
	if (!res.ok) throw new Error("No se pudo cargar la sala de oración");
	const data = await res.json();
	return data.prayers as Prayer[];
};

export const createPrayer = async (input: {
	name?: string | null;
	text: string;
}): Promise<Prayer> => {
	const res = await fetch("/api/prayers", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? "No se pudo publicar");
	}
	const data = await res.json();
	return data.prayer as Prayer;
};

// Conexión en vivo (SSE): recibe cada mensaje nuevo al instante.
export const openPrayerStream = (onPrayer: (p: Prayer) => void): (() => void) => {
	const es = new EventSource("/api/prayers/stream");
	es.addEventListener("prayer", (e) => {
		try {
			onPrayer(JSON.parse((e as MessageEvent).data) as Prayer);
		} catch {
			/* mensaje malformado */
		}
	});
	return () => es.close();
};

export const prayFor = async (id: number): Promise<Prayer> => {
	const res = await fetch(`/api/prayers/${id}/pray`, { method: "POST" });
	if (!res.ok) throw new Error("No se pudo registrar");
	const data = await res.json();
	return data.prayer as Prayer;
};

// --- Chat en vivo ---
export const listChat = async (): Promise<ChatMessage[]> => {
	const res = await fetch("/api/chat");
	if (!res.ok) throw new Error("No se pudo cargar el chat");
	const data = await res.json();
	return data.messages as ChatMessage[];
};

export const sendChat = async (input: {
	name?: string | null;
	text: string;
}): Promise<ChatMessage> => {
	const res = await fetch("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? "No se pudo enviar");
	}
	const data = await res.json();
	return data.message as ChatMessage;
};

export const openChatStream = (onMsg: (m: ChatMessage) => void): (() => void) => {
	const es = new EventSource("/api/chat/stream");
	es.addEventListener("chat", (e) => {
		try {
			onMsg(JSON.parse((e as MessageEvent).data) as ChatMessage);
		} catch {
			/* malformado */
		}
	});
	return () => es.close();
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

export const listEarthquakes = async (params?: {
	hours?: number;
	limit?: number;
}): Promise<EarthquakeEvent[]> => {
	const qs = new URLSearchParams();
	if (params?.hours != null) qs.set("hours", String(params.hours));
	if (params?.limit != null) qs.set("limit", String(params.limit));
	const suffix = qs.toString();
	const res = await fetch(`/api/earthquakes${suffix ? `?${suffix}` : ""}`);
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? "No se pudo cargar el listado de temblores");
	}
	const data = await res.json();
	return data.earthquakes as EarthquakeEvent[];
};
