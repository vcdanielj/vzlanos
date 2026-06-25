import { CheckCircle2, Crosshair, Loader2, MapPin, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PickMap } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReport } from "@/lib/api";
import { parseLocationInput, toPlusCode } from "@/lib/pluscode";
import { buildLocationMessage, whatsappShareUrl } from "@/lib/share";

export const Reportar = () => {
	const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
	const [accuracy, setAccuracy] = useState<number | null>(null);
	const [locInput, setLocInput] = useState("");
	const [people, setPeople] = useState("");
	const [floor, setFloor] = useState("");
	const [injured, setInjured] = useState(false);
	const [description, setDescription] = useState("");
	const [contact, setContact] = useState("");
	const [website, setWebsite] = useState(""); // honeypot
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState<null | { duplicate?: boolean; queued?: boolean }>(null);
	const [error, setError] = useState("");

	const useMyLocation = () => {
		if (!("geolocation" in navigator)) return;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				setAccuracy(pos.coords.accuracy);
			},
			() => setError("No se pudo obtener tu ubicación. Toca el mapa para marcar el punto."),
			{ enableHighAccuracy: true, timeout: 15000 },
		);
	};

	// Pide la ubicación apenas entra (la mayoría reporta dónde está parado).
	useEffect(() => {
		useMyLocation();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const applyLocInput = () => {
		const parsed = parseLocationInput(locInput, coords ?? undefined);
		if (!parsed) {
			setError("Plus Code o coordenadas no válidos.");
			return;
		}
		setError("");
		setCoords(parsed);
		setAccuracy(null);
	};

	const onMapChange = (c: { lat: number; lng: number }) => {
		setCoords(c);
		setAccuracy(null); // ajuste manual: la precisión del GPS ya no aplica
	};

	const submit = async () => {
		if (!coords) {
			setError("Marca la ubicación en el mapa.");
			return;
		}
		setError("");
		setSubmitting(true);
		try {
			const res = await createReport({
				type: "tercero",
				lat: coords.lat,
				lng: coords.lng,
				accuracy: accuracy ?? null,
				peopleCount: people ? Number(people) : null,
				floor: floor.trim() || null,
				injured,
				description: description.trim() || null,
				reporterContact: contact.trim() || null,
				...(website ? { website } : {}),
			});
			setDone({ duplicate: res.duplicate, queued: res.queued });
		} catch (e) {
			setError(e instanceof Error ? e.message : "No se pudo enviar.");
		} finally {
			setSubmitting(false);
		}
	};

	const shareWhatsApp = () => {
		if (!coords) return;
		window.open(
			whatsappShareUrl(buildLocationMessage(coords.lat, coords.lng, "Personas atrapadas aquí.")),
			"_blank",
		);
	};

	if (done) {
		const plus = coords ? toPlusCode(coords.lat, coords.lng) : "";
		return (
			<div className="mx-auto max-w-md text-center">
				<Card>
					<CardContent className="space-y-3 p-8">
						<CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
						<h2 className="text-xl font-bold">
							{done.duplicate ? "Ya había un reporte aquí" : "Reporte enviado"}
						</h2>
						<p className="text-muted-foreground">
							{done.queued
								? "Sin conexión: se enviará al volver la señal."
								: done.duplicate
									? "Detectamos un reporte muy cercano y reciente. Los rescatistas ya lo tienen en el mapa."
									: "Gracias. El punto ya aparece en el mapa de rescate."}
						</p>
						{plus && (
							<p className="text-sm text-muted-foreground">
								Plus Code: <code className="font-mono">{plus}</code>
							</p>
						)}
						<div className="flex gap-2">
							<Button asChild variant="outline" className="flex-1">
								<Link to="/mapa">Ver mapa</Link>
							</Button>
							<Button
								className="flex-1"
								onClick={() => {
									setDone(null);
									setCoords(null);
									setAccuracy(null);
									setPeople("");
									setFloor("");
									setInjured(false);
									setDescription("");
								}}
							>
								Otro reporte
							</Button>
						</div>
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
						<MapPin className="h-5 w-5" /> Reportar personas atrapadas
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Marca dónde hay personas atrapadas (tú u otra persona). Usa tu ubicación, toca el
						mapa, o pega un Plus Code que te enviaron por WhatsApp.
					</p>

					<Button variant="outline" className="w-full" onClick={useMyLocation}>
						<Crosshair className="h-4 w-4" /> Usar mi ubicación
					</Button>

					<div className="flex gap-2">
						<Input
							placeholder="Plus Code o lat,lng"
							value={locInput}
							onChange={(e) => setLocInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && applyLocInput()}
						/>
						<Button variant="outline" onClick={applyLocInput}>
							Aplicar
						</Button>
					</div>

					<PickMap value={coords} onChange={onMapChange} accuracy={accuracy} />
					{coords && accuracy != null && accuracy > 50 && (
						<p className="text-xs text-amber-600">
							Precisión baja (±{Math.round(accuracy)} m). Arrastra el pin para ajustar el punto exacto.
						</p>
					)}

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="people">¿Cuántas personas?</Label>
							<Input
								id="people"
								type="number"
								inputMode="numeric"
								min={0}
								value={people}
								onChange={(e) => setPeople(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="floor">Piso / nivel</Label>
							<Input
								id="floor"
								placeholder="PB, 3, sótano…"
								value={floor}
								onChange={(e) => setFloor(e.target.value)}
							/>
						</div>
					</div>

					<button
						type="button"
						onClick={() => setInjured((v) => !v)}
						aria-pressed={injured}
						className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm ${
							injured ? "border-destructive bg-destructive/10 text-destructive" : ""
						}`}
					>
						<span>¿Hay personas heridas?</span>
						<span className="font-semibold">{injured ? "Sí" : "No"}</span>
					</button>

					<div className="space-y-2">
						<Label htmlFor="desc">Detalles</Label>
						<Textarea
							id="desc"
							placeholder="Edificio, dirección, situación…"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="contact">Teléfono de contacto (opcional)</Label>
						<Input
							id="contact"
							type="tel"
							inputMode="tel"
							placeholder="+58…"
							value={contact}
							onChange={(e) => setContact(e.target.value)}
						/>
					</div>

					{/* Honeypot anti-bot: oculto a humanos. */}
					<input
						type="text"
						tabIndex={-1}
						autoComplete="off"
						value={website}
						onChange={(e) => setWebsite(e.target.value)}
						className="hidden"
						aria-hidden="true"
					/>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<Button size="lg" className="w-full" disabled={submitting} onClick={submit}>
						{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar reporte"}
					</Button>

					{coords && (
						<Button
							variant="outline"
							className="w-full"
							onClick={shareWhatsApp}
						>
							<Share2 className="h-4 w-4" /> Compartir esta ubicación por WhatsApp
						</Button>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
