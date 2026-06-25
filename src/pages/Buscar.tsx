import { CheckCircle2, Loader2, MapPin, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createReport, geocode, searchByName } from "@/lib/api";
import type { Report, ReportStatus } from "@shared/types";
import { STATUS_LABELS } from "@shared/types";

const statusVariant = (
	s: ReportStatus,
): "default" | "success" | "warning" | "destructive" | "secondary" => {
	if (s === "a_salvo" || s === "rescatado") return "success";
	if (s === "en_progreso") return "warning";
	if (s === "descartado") return "secondary";
	return "destructive";
};

const ReportarDesaparecido = () => {
	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [relation, setRelation] = useState("");
	const [reporterName, setReporterName] = useState("");
	const [contact, setContact] = useState("");
	const [country, setCountry] = useState("");
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState(false);
	const [error, setError] = useState("");

	const submit = async () => {
		if (!name.trim()) {
			setError("Escribe el nombre de la persona.");
			return;
		}
		setError("");
		setSubmitting(true);
		try {
			// Geocodifica la dirección (best-effort) para ubicarla en el mapa.
			let coords: { lat: number; lng: number } | null = null;
			if (address.trim()) {
				try {
					const g = await geocode(address.trim());
					coords = { lat: g.lat, lng: g.lng };
				} catch {
					coords = null; // si falla, igual guardamos el texto de la dirección
				}
			}
			await createReport({
				type: "busqueda_persona",
				personName: name.trim(),
				lastKnownAddress: address.trim() || null,
				relation: relation.trim() || null,
				reporterName: reporterName.trim() || null,
				reporterContact: contact.trim() || null,
				reporterCountry: country.trim() || null,
				description: description.trim() || null,
				lat: coords?.lat ?? null,
				lng: coords?.lng ?? null,
			});
			setDone(true);
		} catch (e) {
			setError(e instanceof Error ? e.message : "No se pudo enviar.");
		} finally {
			setSubmitting(false);
		}
	};

	if (done) {
		return (
			<div className="space-y-3 p-2 text-center">
				<CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
				<h3 className="font-bold">Reporte registrado</h3>
				<p className="text-sm text-muted-foreground">
					La búsqueda quedó registrada y, si pudimos ubicar la dirección, aparece en el mapa
					de rescate. Vuelve a esta página y busca por el nombre para seguir el estado.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				<Label htmlFor="name">Nombre completo de la persona *</Label>
				<Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label htmlFor="addr">Última dirección conocida</Label>
				<Input
					id="addr"
					placeholder="Calle, edificio, ciudad…"
					value={address}
					onChange={(e) => setAddress(e.target.value)}
				/>
				<p className="text-xs text-muted-foreground">
					La ubicamos en el mapa para los rescatistas.
				</p>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-2">
					<Label htmlFor="rel">Parentesco</Label>
					<Input
						id="rel"
						placeholder="Madre, hermano…"
						value={relation}
						onChange={(e) => setRelation(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="country">Tu país</Label>
					<Input
						id="country"
						placeholder="España, EE.UU.…"
						value={country}
						onChange={(e) => setCountry(e.target.value)}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="rname">Tu nombre</Label>
				<Input
					id="rname"
					value={reporterName}
					onChange={(e) => setReporterName(e.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="contact">Tu contacto (teléfono / email / WhatsApp)</Label>
				<Input
					id="contact"
					placeholder="Para que te avisen si la encuentran"
					value={contact}
					onChange={(e) => setContact(e.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="desc">Datos útiles</Label>
				<Textarea
					id="desc"
					placeholder="Edad, ropa, señas, condición médica…"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<Button className="w-full" size="lg" disabled={submitting} onClick={submit}>
				{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registrar búsqueda"}
			</Button>
		</div>
	);
};

const SeguirEstado = () => {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<Report[] | null>(null);
	const [loading, setLoading] = useState(false);

	const run = async () => {
		if (query.trim().length < 2) return;
		setLoading(true);
		try {
			setResults(await searchByName(query.trim()));
		} catch {
			setResults([]);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex gap-2">
				<Input
					placeholder="Nombre de la persona…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && run()}
				/>
				<Button onClick={run} disabled={loading}>
					{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
				</Button>
			</div>

			{results && results.length === 0 && (
				<p className="py-6 text-center text-sm text-muted-foreground">
					Sin resultados. Si aún no la reportaste, hazlo en la pestaña "Reportar".
				</p>
			)}

			<div className="space-y-2">
				{results?.map((r) => (
					<Card key={r.id}>
						<CardContent className="flex items-start justify-between gap-3 p-4">
							<div>
								<div className="font-semibold">{r.personName}</div>
								{r.lastKnownAddress && (
									<div className="flex items-center gap-1 text-xs text-muted-foreground">
										<MapPin className="h-3 w-3" /> {r.lastKnownAddress}
									</div>
								)}
								{r.description && (
									<div className="mt-1 text-sm text-muted-foreground">{r.description}</div>
								)}
							</div>
							<Badge variant={statusVariant(r.status)}>{STATUS_LABELS[r.status]}</Badge>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
};

export const Buscar = () => (
	<div className="mx-auto max-w-md">
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Search className="h-5 w-5" /> Buscar a un familiar
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="seguir">
					<TabsList className="grid w-full grid-cols-2 gap-1">
						<TabsTrigger value="seguir">Buscar / seguir</TabsTrigger>
						<TabsTrigger value="reportar">
							<UserPlus className="mr-1 h-4 w-4" /> Reportar
						</TabsTrigger>
					</TabsList>
					<TabsContent value="seguir">
						<SeguirEstado />
					</TabsContent>
					<TabsContent value="reportar">
						<ReportarDesaparecido />
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	</div>
);
