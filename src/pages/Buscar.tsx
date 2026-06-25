import { Camera, CheckCircle2, Loader2, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { PickMap } from "@/components/MapView";
import { NotifyButton } from "@/components/NotifyButton";
import { PersonCard } from "@/components/PersonCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createReport, geocode, searchByName } from "@/lib/api";
import { fileToResizedBase64 } from "@/lib/image";
import { SitiosAliados } from "@/components/SitiosAliados";
import type { Report } from "@shared/types";
import { SEX_OPTIONS } from "@shared/types";

const SEX_LABELS: Record<string, string> = { F: "Mujer", M: "Hombre", otro: "Otro" };

const ReportarDesaparecido = () => {
	const [name, setName] = useState("");
	const [cedula, setCedula] = useState("");
	const [age, setAge] = useState("");
	const [sex, setSex] = useState<string>("");
	const [lastSeen, setLastSeen] = useState("");
	const [address, setAddress] = useState("");
	const [relation, setRelation] = useState("");
	const [reporterName, setReporterName] = useState("");
	const [contact, setContact] = useState("");
	const [country, setCountry] = useState("");
	const [description, setDescription] = useState("");
	const [photo, setPhoto] = useState<{ base64: string; mime: string } | null>(null);
	const [photoPreview, setPhotoPreview] = useState("");
	const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState(false);
	// null = sin dirección; true = ubicada en mapa; false = no se pudo ubicar.
	const [located, setLocated] = useState<boolean | null>(null);
	const [error, setError] = useState("");

	const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const r = await fileToResizedBase64(file);
			setPhoto(r);
			setPhotoPreview(`data:${r.mime};base64,${r.base64}`);
		} catch {
			setError("No se pudo procesar la foto.");
		}
	};

	const submit = async () => {
		if (!name.trim()) {
			setError("Escribe el nombre de la persona.");
			return;
		}
		if (!contact.trim()) {
			setError("Deja un contacto (WhatsApp) para que te avisen si la encuentran.");
			return;
		}
		setError("");
		setSubmitting(true);
		try {
			// Prioridad: pin manual en el mapa. Si no, geocodifica la dirección.
			let coords: { lat: number; lng: number } | null = pin;
			if (!coords && address.trim()) {
				try {
					const g = await geocode(address.trim());
					coords = { lat: g.lat, lng: g.lng };
					setLocated(true);
				} catch {
					coords = null; // si falla, igual guardamos el texto de la dirección
					setLocated(false);
				}
			}
			const parsedAge = age.trim() ? Number.parseInt(age.trim(), 10) : null;
			const safeAge =
				parsedAge != null && Number.isFinite(parsedAge) && parsedAge >= 0 && parsedAge <= 130
					? parsedAge
					: null;
			await createReport({
				type: "busqueda_persona",
				personName: name.trim(),
				cedula: cedula.trim() || null,
				age: safeAge,
				sex: sex || null,
				lastSeen: lastSeen.trim() || null,
				photo: photo?.base64 ?? null,
				photoMime: photo?.mime ?? null,
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
					{located === true
						? "La búsqueda quedó registrada y la dirección aparece en el mapa de rescate."
						: located === false
							? "La búsqueda quedó registrada, pero no pudimos ubicar la dirección en el mapa. Intenta de nuevo con una dirección más específica si puedes."
							: "La búsqueda quedó registrada."}{" "}
					Vuelve a esta página y busca por el nombre para seguir el estado.
				</p>
				<NotifyButton personName={name} className="w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{/* --- La persona --- */}
			<section className="space-y-3">
				<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					La persona
				</h4>
				<div className="space-y-2">
					<Label htmlFor="name">Nombre completo *</Label>
					<Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-2">
						<Label htmlFor="dp-age">Edad</Label>
						<Input
							id="dp-age"
							inputMode="numeric"
							placeholder="Años"
							value={age}
							onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
						/>
					</div>
					<div className="space-y-2">
						<Label>Sexo</Label>
						<div className="flex gap-1.5">
							{SEX_OPTIONS.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => setSex(sex === s ? "" : s)}
									className={`flex-1 rounded-md border px-2 py-2 text-sm ${
										sex === s ? "border-vzla-blue bg-vzla-blue text-white" : "hover:bg-accent"
									}`}
								>
									{SEX_LABELS[s]}
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="dp-ced">Cédula (si la sabes)</Label>
					<Input
						id="dp-ced"
						inputMode="numeric"
						placeholder="V-12345678"
						value={cedula}
						onChange={(e) => setCedula(e.target.value)}
					/>
					<p className="text-xs text-muted-foreground">
						Con la cédula, si la persona se reporta a salvo, tu búsqueda se actualiza sola.
					</p>
				</div>

				<div className="space-y-2">
					<Label>Foto (ayuda a identificarla)</Label>
					<div className="flex items-center gap-3">
						{photoPreview ? (
							<img
								src={photoPreview}
								alt="Foto"
								className="h-20 w-20 rounded-lg border object-cover"
							/>
						) : (
							<div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
								<Camera className="h-6 w-6" />
							</div>
						)}
						<label className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-accent">
							{photoPreview ? "Cambiar foto" : "Subir foto"}
							<input
								type="file"
								accept="image/*"
								capture="environment"
								className="hidden"
								onChange={onPhoto}
							/>
						</label>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="desc">Señas / qué llevaba puesto</Label>
					<Textarea
						id="desc"
						placeholder="Ropa, estatura, señas particulares, condición médica…"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>
			</section>

			{/* --- Última vez vista --- */}
			<section className="space-y-3">
				<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Última vez vista
				</h4>
				<div className="space-y-2">
					<Label htmlFor="dp-lastseen">¿Cuándo y dónde la viste por última vez?</Label>
					<Input
						id="dp-lastseen"
						placeholder="Ej. ayer en la tarde, cerca de la plaza…"
						value={lastSeen}
						onChange={(e) => setLastSeen(e.target.value)}
					/>
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
						La ubicamos en el mapa, o marca el punto exacto abajo.
					</p>
				</div>
				<div className="space-y-1">
					<Label>Marcar última ubicación en el mapa (opcional)</Label>
					<PickMap
						value={pin}
						onChange={setPin}
						className="h-[32vh] min-h-[200px] md:h-[260px]"
					/>
				</div>
			</section>

			{/* --- Cómo contactarte --- */}
			<section className="space-y-3">
				<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Cómo contactarte
				</h4>
				<div className="space-y-2">
					<Label htmlFor="contact">Tu WhatsApp *</Label>
					<Input
						id="contact"
						inputMode="tel"
						placeholder="Ej. 0412 1234567"
						value={contact}
						onChange={(e) => setContact(e.target.value)}
					/>
					<p className="text-xs text-muted-foreground">
						Quien la encuentre podrá escribirte aquí. Aparece como botón, no como texto.
					</p>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-2">
						<Label htmlFor="rname">Tu nombre</Label>
						<Input
							id="rname"
							value={reporterName}
							onChange={(e) => setReporterName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="rel">Parentesco</Label>
						<Input
							id="rel"
							placeholder="Madre, hermano…"
							value={relation}
							onChange={(e) => setRelation(e.target.value)}
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="country">Tu país (si estás fuera)</Label>
					<Input
						id="country"
						placeholder="España, EE.UU.…"
						value={country}
						onChange={(e) => setCountry(e.target.value)}
					/>
				</div>
			</section>

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

			<div className="space-y-3">
				{results?.map((r) => (
					<PersonCard key={r.id} report={r} />
				))}
			</div>

			{results && results.length > 0 && (
				<NotifyButton personName={query} className="w-full" />
			)}
		</div>
	);
};

const MarcarASalvo = () => {
	const [name, setName] = useState("");
	const [note, setNote] = useState("");
	const [cedula, setCedula] = useState("");
	const [photo, setPhoto] = useState<{ base64: string; mime: string } | null>(null);
	const [photoPreview, setPhotoPreview] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState(false);
	const [error, setError] = useState("");

	const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const r = await fileToResizedBase64(file);
			setPhoto(r);
			setPhotoPreview(`data:${r.mime};base64,${r.base64}`);
		} catch {
			setError("No se pudo procesar la foto.");
		}
	};

	const submit = async () => {
		if (!name.trim()) {
			setError("Escribe tu nombre.");
			return;
		}
		if (!cedula.trim() && !photo) {
			setError("Agrega tu cédula o una foto para validar que eres tú.");
			return;
		}
		setError("");
		setSubmitting(true);
		try {
			await createReport({
				type: "busqueda_persona",
				personName: name.trim(),
				cedula: cedula.trim() || null,
				photo: photo?.base64 ?? null,
				photoMime: photo?.mime ?? null,
				description: note.trim() || "Se reportó a salvo.",
				selfSafe: true,
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
				<h3 className="font-bold">Te marcaste a salvo</h3>
				<p className="text-sm text-muted-foreground">
					Tu familia puede verlo buscando tu nombre en esta página.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<p className="text-sm text-muted-foreground">
				Si estás bien, repórtalo para que tu familia deje de buscarte. Agrega tu cédula o una
				foto para que sepan que de verdad eres tú.
			</p>
			<div className="space-y-2">
				<Label htmlFor="safe-name">Tu nombre completo *</Label>
				<Input id="safe-name" value={name} onChange={(e) => setName(e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label htmlFor="safe-ced">Cédula (para validar)</Label>
				<Input
					id="safe-ced"
					inputMode="numeric"
					placeholder="V-12345678"
					value={cedula}
					onChange={(e) => setCedula(e.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Foto tuya (evidencia)</Label>
				<div className="flex items-center gap-3">
					{photoPreview ? (
						<img
							src={photoPreview}
							alt="Foto"
							className="h-20 w-20 rounded-lg border object-cover"
						/>
					) : (
						<div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
							<Camera className="h-6 w-6" />
						</div>
					)}
					<label className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-accent">
						{photoPreview ? "Cambiar foto" : "Tomar / subir foto"}
						<input
							type="file"
							accept="image/*"
							capture="user"
							className="hidden"
							onChange={onPhoto}
						/>
					</label>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="safe-note">Mensaje (opcional)</Label>
				<Textarea
					id="safe-note"
					placeholder="Estoy bien, en casa de…"
					value={note}
					onChange={(e) => setNote(e.target.value)}
				/>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<Button className="w-full" size="lg" disabled={submitting} onClick={submit}>
				{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Marcarme a salvo"}
			</Button>
		</div>
	);
};

export const Buscar = () => (
	<div className="mx-auto max-w-md space-y-4">
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Search className="h-5 w-5" /> Buscar a un familiar
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="seguir">
					<TabsList className="grid w-full grid-cols-3 gap-1">
						<TabsTrigger value="seguir">Buscar</TabsTrigger>
						<TabsTrigger value="reportar">
							<UserPlus className="mr-1 h-4 w-4" /> Reportar
						</TabsTrigger>
						<TabsTrigger value="salvo">A salvo</TabsTrigger>
					</TabsList>
					<TabsContent value="seguir">
						<SeguirEstado />
					</TabsContent>
					<TabsContent value="reportar">
						<ReportarDesaparecido />
					</TabsContent>
					<TabsContent value="salvo">
						<MarcarASalvo />
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
		<SitiosAliados />
	</div>
);
