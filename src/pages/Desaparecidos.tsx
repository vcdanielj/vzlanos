import {
	CheckCircle2,
	ExternalLink,
	Loader2,
	RefreshCw,
	Search,
	UserCheck,
	Users,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SitiosAliados } from "@/components/SitiosAliados";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Persona {
	id: string;
	nombre: string;
	edad: number | null;
	ubicacion: string | null;
	fecha: string | null;
	descripcion: string | null;
	contacto: string | null;
	foto: string | null;
	estado: "sin-contacto" | "localizado";
	localizadoPor: string | null;
	localizadoContacto: string | null;
	localizadoRelacion: string | null;
	localizadoNota: string | null;
	createdAt: number;
}

interface ApiResponse {
	items: Persona[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	counts: {
		total: number;
		sinContacto: number;
		localizado: number;
	};
}

// ─── API helpers ──────────────────────────────────────────────────────────────

// Mismo origen: pasa por nuestro proxy backend (/api/personas) para evitar el
// bloqueo CORS de la API externa (que no envía Access-Control-Allow-Origin).
const API = "/api";
const PAGE_SIZE = 20;

async function fetchPersonas(
	page: number,
	q: string,
	estado: string,
): Promise<ApiResponse> {
	const params = new URLSearchParams({
		page: String(page),
		pageSize: String(PAGE_SIZE),
		estado,
	});
	if (q.trim()) params.set("q", q.trim());
	const res = await fetch(`${API}/personas?${params}`);
	if (!res.ok) throw new Error("No se pudo cargar el listado");
	return res.json() as Promise<ApiResponse>;
}

async function marcarLocalizado(
	id: string,
	body: {
		localizadoPor: string;
		localizadoContacto: string;
		localizadoRelacion: string;
		localizadoNota: string;
	},
): Promise<void> {
	const res = await fetch(`${API}/personas/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ estado: "localizado", ...body }),
	});
	if (!res.ok) throw new Error("No se pudo actualizar el registro");
}

// ─── Formato ─────────────────────────────────────────────────────────────────

const formatDate = (v: string | null | number) => {
	if (!v) return null;
	const d = typeof v === "number" ? new Date(v) : new Date(v);
	return new Intl.DateTimeFormat("es-VE", {
		dateStyle: "medium",
	}).format(d);
};

// ─── Dialogo de recuperación ──────────────────────────────────────────────────

interface RecoverDialogProps {
	persona: Persona;
	onClose: () => void;
	onSuccess: (id: string) => void;
}

const RecoverDialog = ({ persona, onClose, onSuccess }: RecoverDialogProps) => {
	const [por, setPor] = useState("");
	const [contacto, setContacto] = useState("");
	const [relacion, setRelacion] = useState("");
	const [nota, setNota] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const backdropRef = useRef<HTMLDivElement>(null);

	const submit = async () => {
		if (!por.trim()) {
			setError("Ingresa tu nombre.");
			return;
		}
		setError("");
		setLoading(true);
		try {
			await marcarLocalizado(persona.id, {
				localizadoPor: por.trim(),
				localizadoContacto: contacto.trim(),
				localizadoRelacion: relacion.trim(),
				localizadoNota: nota.trim(),
			});
			onSuccess(persona.id);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Error al actualizar");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			ref={backdropRef}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={(e) => {
				if (e.target === backdropRef.current) onClose();
			}}
		>
			<div className="w-full max-w-md rounded-xl border bg-background shadow-xl">
				<div className="flex items-center justify-between border-b px-5 py-4">
					<h2 className="font-semibold">Marcar como recuperado</h2>
					<button
						onClick={onClose}
						className="rounded-md p-1 hover:bg-accent"
						aria-label="Cerrar"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
				<div className="space-y-3 p-5">
					<p className="text-sm text-muted-foreground">
						Confirmar que{" "}
						<span className="font-semibold text-foreground">{persona.nombre}</span>{" "}
						fue localizado/a.
					</p>
					<div className="space-y-1">
						<label className="text-xs font-medium">Tu nombre *</label>
						<Input
							placeholder="Nombre de quien reporta"
							value={por}
							onChange={(e) => setPor(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium">Tu teléfono / contacto</label>
						<Input
							placeholder="WhatsApp, teléfono…"
							value={contacto}
							onChange={(e) => setContacto(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium">Relación con la persona</label>
						<Input
							placeholder="Hijo, vecino, rescatista…"
							value={relacion}
							onChange={(e) => setRelacion(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium">Nota adicional</label>
						<Input
							placeholder="Cómo fue localizado/a…"
							value={nota}
							onChange={(e) => setNota(e.target.value)}
						/>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<div className="flex gap-2 pt-1">
						<Button variant="outline" className="flex-1" onClick={onClose}>
							Cancelar
						</Button>
						<Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={loading}>
							{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
							Confirmar
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

// ─── Tarjeta de persona ───────────────────────────────────────────────────────

interface PersonaCardProps {
	persona: Persona;
	onRecover: (p: Persona) => void;
	recovered: boolean;
}

const PersonaCard = ({ persona, onRecover, recovered }: PersonaCardProps) => {
	const isLocalizado = persona.estado === "localizado" || recovered;

	return (
		<Card className={isLocalizado ? "border-emerald-300 bg-emerald-50/50" : ""}>
			<CardContent className="flex gap-3 p-4">
				{/* Foto */}
				{persona.foto ? (
					<img
						src={persona.foto}
						alt={persona.nombre}
						className="h-16 w-16 shrink-0 rounded-lg border object-cover"
						loading="lazy"
						onError={(e) => {
							(e.currentTarget as HTMLImageElement).style.display = "none";
						}}
					/>
				) : (
					<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted">
						<Users className="h-6 w-6 text-muted-foreground" />
					</div>
				)}

				{/* Info */}
				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex flex-wrap items-start justify-between gap-2">
						<div>
							<p className="font-semibold leading-tight">{persona.nombre}</p>
							{persona.edad && (
								<p className="text-xs text-muted-foreground">{persona.edad} años</p>
							)}
						</div>
						<Badge
							variant={isLocalizado ? "default" : "destructive"}
							className={isLocalizado ? "bg-emerald-600" : ""}
						>
							{isLocalizado ? "Recuperado" : "Desaparecido"}
						</Badge>
					</div>

					{persona.ubicacion && (
						<p className="text-xs text-muted-foreground">📍 {persona.ubicacion}</p>
					)}
					{persona.descripcion && (
						<p className="line-clamp-2 text-xs text-muted-foreground">
							{persona.descripcion}
						</p>
					)}
					{persona.contacto && (
						<p className="text-xs font-medium">Contacto: {persona.contacto}</p>
					)}
					{isLocalizado && persona.localizadoPor && (
						<p className="text-xs font-medium text-emerald-700">
							✓ Localizado por {persona.localizadoPor}
							{persona.localizadoNota ? ` — ${persona.localizadoNota}` : ""}
						</p>
					)}
					{persona.fecha && (
						<p className="text-xs text-muted-foreground">
							Reportado: {formatDate(persona.fecha)}
						</p>
					)}

					{/* Acciones */}
					{!isLocalizado && (
						<div className="flex flex-wrap gap-2 pt-1">
							<Button
								size="sm"
								variant="outline"
								className="h-7 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
								onClick={() => onRecover(persona)}
							>
								<UserCheck className="mr-1 h-3.5 w-3.5" />
								Marcar recuperado
							</Button>
							<a
								href={`https://desaparecidosterremotovenezuela.com/?id=${persona.id}`}
								target="_blank"
								rel="noreferrer"
								className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs hover:bg-accent"
							>
								<ExternalLink className="h-3 w-3" />
								Ver en sitio
							</a>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

// ─── Página principal ─────────────────────────────────────────────────────────

const ESTADOS = [
	{ value: "todos", label: "Todos" },
	{ value: "sin-contacto", label: "Desaparecidos" },
	{ value: "localizado", label: "Recuperados" },
] as const;

const isSpam = (p: Persona) => {
	const fields = [p.nombre, p.contacto, p.descripcion, p.ubicacion].map(f => (f || "").toLowerCase());
	return fields.some(f =>
		f.includes("infinityhotel") ||
		f.includes("infinity hotel") ||
		f.includes("trustedf57") ||
		f.includes("ibb.co/0jqhcqkw") ||
		f.includes("padfdbffa2180")
	);
};

export const Desaparecidos = () => {
	const [personas, setPersonas] = useState<Persona[]>([]);
	const [total, setTotal] = useState(0);
	const [counts, setCounts] = useState({ total: 0, sinContacto: 0, localizado: 0 });
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [q, setQ] = useState("");
	const [draftQ, setDraftQ] = useState("");
	const [estado, setEstado] = useState<string>("todos");
	const [dialog, setDialog] = useState<Persona | null>(null);
	const [recoveredIds, setRecoveredIds] = useState<Set<string>>(new Set());

	const visiblePersonas = useMemo(() => personas.filter(p => !isSpam(p)), [personas]);
	const hiddenSpamCount = personas.length - visiblePersonas.length;

	const load = useCallback(async (p: number, query: string, est: string) => {
		setLoading(true);
		setError("");
		try {
			const data = await fetchPersonas(p, query, est);
			setPersonas(data.items);
			setTotal(data.total);
			setTotalPages(data.totalPages);
			setCounts(data.counts);
			setPage(data.page);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Error al cargar");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load(1, q, estado);
	}, [load, q, estado]);

	const search = () => {
		setQ(draftQ);
		setPage(1);
	};

	const changePage = (next: number) => {
		void load(next, q, estado);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const changeEstado = (e: string) => {
		setEstado(e);
		setPage(1);
	};

	const onRecoverSuccess = (id: string) => {
		setRecoveredIds((prev) => new Set(prev).add(id));
		setDialog(null);
		// Actualizar el estado en la lista local también
		setPersonas((prev) =>
			prev.map((p) => (p.id === id ? { ...p, estado: "localizado" } : p)),
		);
	};

	return (
		<div className="mx-auto max-w-3xl space-y-4">
			{/* Header */}
			<div className="space-y-1">
				<h1 className="flex items-center gap-2 text-xl font-bold">
					<Users className="h-5 w-5 text-vzla-red" />
					Desaparecidos — Terremoto Venezuela
				</h1>
				<p className="text-sm text-muted-foreground">
					Listado de personas reportadas desaparecidas. Fuente:{" "}
					<a
						href="https://desaparecidosterremotovenezuela.com"
						target="_blank"
						rel="noreferrer"
						className="underline underline-offset-2 hover:text-foreground"
					>
						desaparecidosterremotovenezuela.com
					</a>
				</p>
			</div>

			{/* Estadísticas */}
			<div className="flex flex-wrap gap-2 text-xs">
				<span className="rounded-md bg-muted px-2 py-1 font-medium">
					Total: {counts.total.toLocaleString("es-VE")}
				</span>
				<span className="rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive">
					Desaparecidos: {counts.sinContacto.toLocaleString("es-VE")}
				</span>
				<span className="rounded-md bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
					Recuperados: {counts.localizado.toLocaleString("es-VE")}
				</span>
			</div>

			{/* Filtros */}
			<Card>
				<CardContent className="space-y-3 p-4">
					{/* Búsqueda */}
					<div className="flex gap-2">
						<Input
							placeholder="Buscar por nombre o ubicación…"
							value={draftQ}
							onChange={(e) => setDraftQ(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && search()}
						/>
						<Button onClick={search} disabled={loading} variant="outline">
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Search className="h-4 w-4" />
							)}
						</Button>
						{q && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									setDraftQ("");
									setQ("");
								}}
							>
								<X className="h-4 w-4" />
							</Button>
						)}
					</div>

					{/* Estado */}
					<div className="flex flex-wrap gap-2">
						{ESTADOS.map((e) => (
							<Button
								key={e.value}
								size="sm"
								variant={estado === e.value ? "default" : "outline"}
								onClick={() => changeEstado(e.value)}
							>
								{e.label}
							</Button>
						))}
						<Button
							size="sm"
							variant="ghost"
							onClick={() => void load(page, q, estado)}
							disabled={loading}
							className="ml-auto"
						>
							<RefreshCw className="h-3.5 w-3.5" />
						</Button>
					</div>

					{/* Conteo de resultados */}
					{!loading && (
						<p className="text-xs text-muted-foreground">
							{q
								? `${total.toLocaleString("es-VE")} resultados para "${q}"`
								: `${total.toLocaleString("es-VE")} personas`}{" "}
							· Página {page} de {totalPages.toLocaleString("es-VE")}
						</p>
					)}
				</CardContent>
			</Card>

			{/* Error */}
			{error && (
				<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			)}

			{/* Alerta de spam ocultado */}
			{!loading && hiddenSpamCount > 0 && (
				<div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 flex items-center justify-between">
					<span>
						⚠️ Se ocultaron {hiddenSpamCount} reporte(s) sospechoso(s) de spam detectados automáticamente en esta página.
					</span>
				</div>
			)}

			{/* Lista */}
			{loading ? (
				<div className="flex justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : visiblePersonas.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center text-sm text-muted-foreground">
						No hay resultados válidos en esta página.
					</CardContent>
				</Card>
			) : (
				<div className="space-y-3">
					{visiblePersonas.map((p) => (
						<PersonaCard
							key={p.id}
							persona={p}
							onRecover={setDialog}
							recovered={recoveredIds.has(p.id)}
						/>
					))}
				</div>
			)}

			{/* Paginación */}
			{totalPages > 1 && !loading && (
				<div className="flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => changePage(page - 1)}
					>
						← Anterior
					</Button>
					<span className="text-xs text-muted-foreground">
						{page.toLocaleString("es-VE")} / {totalPages.toLocaleString("es-VE")}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= totalPages}
						onClick={() => changePage(page + 1)}
					>
						Siguiente →
					</Button>
				</div>
			)}

			<SitiosAliados />

			<p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
				Los datos son provistos por{" "}
				<a
					href="https://desaparecidosterremotovenezuela.com"
					target="_blank"
					rel="noreferrer"
					className="underline underline-offset-2"
				>
					desaparecidosterremotovenezuela.com
				</a>
				. Al marcar una persona como recuperada, la información se actualiza en ese
				sistema.
			</p>

			{/* Diálogo de recuperación */}
			{dialog && (
				<RecoverDialog
					persona={dialog}
					onClose={() => setDialog(null)}
					onSuccess={onRecoverSuccess}
				/>
			)}
		</div>
	);
};
