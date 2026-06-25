import { Camera, CheckCircle2, HeartHandshake, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PickMap } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReport } from "@/lib/api";
import { fileToResizedBase64 } from "@/lib/image";

const PLACES = ["Hospital", "Iglesia", "Albergue", "En la calle", "Otro"];

export const EncontrarPersona = () => {
	const [name, setName] = useState("");
	const [foundAt, setFoundAt] = useState("Hospital");
	const [placeName, setPlaceName] = useState("");
	const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
	const [description, setDescription] = useState("");
	const [contact, setContact] = useState("");
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

	const useMyLocation = () => {
		if (!("geolocation" in navigator)) return;
		navigator.geolocation.getCurrentPosition(
			(pos) => setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
			() => setError("No se pudo obtener la ubicación. Toca el mapa para marcarla."),
			{ enableHighAccuracy: true, timeout: 15000 },
		);
	};

	const submit = async () => {
		setError("");
		setSubmitting(true);
		try {
			const place = placeName.trim() ? `${foundAt} — ${placeName.trim()}` : foundAt;
			await createReport({
				type: "encontrado",
				personName: name.trim() || "No identificada",
				foundAt: place,
				photo: photo?.base64 ?? null,
				photoMime: photo?.mime ?? null,
				lat: pin?.lat ?? null,
				lng: pin?.lng ?? null,
				description: description.trim() || null,
				reporterContact: contact.trim() || null,
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
			<div className="mx-auto max-w-md text-center">
				<Card>
					<CardContent className="space-y-3 p-8">
						<CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
						<h2 className="text-xl font-bold">Persona registrada 🙏</h2>
						<p className="text-muted-foreground">
							Gracias. Si su familia la está buscando por su nombre, será avisada y verá que
							fue encontrada. Aparece también en la búsqueda y el mapa.
						</p>
						<Button asChild variant="outline" className="w-full">
							<Link to="/">Volver al inicio</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-md space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HeartHandshake className="h-5 w-5 text-vzla-blue" /> Encontré a una persona
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Para hospitales, iglesias, albergues o cualquiera que reciba a una persona (aunque
						no sepas su nombre). Ayuda a reunirla con su familia.
					</p>

					<div className="space-y-2">
						<Label htmlFor="name">Nombre (si lo sabes)</Label>
						<Input
							id="name"
							placeholder="Déjalo vacío si no la han identificado"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Foto (clave para identificarla)</Label>
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
						<Label>¿Dónde la encontraste?</Label>
						<div className="flex flex-wrap gap-2">
							{PLACES.map((p) => (
								<button
									key={p}
									type="button"
									onClick={() => setFoundAt(p)}
									className={`rounded-full border px-3 py-1.5 text-sm ${
										foundAt === p
											? "border-vzla-blue bg-vzla-blue text-white"
											: "hover:bg-accent"
									}`}
								>
									{p}
								</button>
							))}
						</div>
						<Input
							placeholder="Nombre del lugar (ej. Hospital Vargas)"
							value={placeName}
							onChange={(e) => setPlaceName(e.target.value)}
						/>
					</div>

					<div className="space-y-1">
						<Label>Ubicación del lugar</Label>
						<Button variant="outline" size="sm" className="w-full" onClick={useMyLocation}>
							Usar mi ubicación
						</Button>
						<PickMap value={pin} onChange={setPin} className="h-[32vh] min-h-[200px] md:h-[260px]" />
					</div>

					<div className="space-y-2">
						<Label htmlFor="desc">Descripción / estado</Label>
						<Textarea
							id="desc"
							placeholder="Edad aprox., ropa, condición, señas particulares…"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="contact">Contacto del lugar (opcional)</Label>
						<Input
							id="contact"
							placeholder="Teléfono para coordinar con la familia"
							value={contact}
							onChange={(e) => setContact(e.target.value)}
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<Button size="lg" className="w-full" disabled={submitting} onClick={submit}>
						{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registrar persona encontrada"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};
