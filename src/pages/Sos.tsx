import { CheckCircle2, Loader2, MapPin, Siren } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReport } from "@/lib/api";

type GeoState =
	| { status: "idle" }
	| { status: "locating" }
	| { status: "ok"; lat: number; lng: number; accuracy: number }
	| { status: "error"; message: string };

export const Sos = () => {
	const [geo, setGeo] = useState<GeoState>({ status: "idle" });
	const [people, setPeople] = useState("1");
	const [description, setDescription] = useState("");
	const [contact, setContact] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState<null | { queued?: boolean }>(null);
	const [error, setError] = useState("");

	const locate = () => {
		if (!("geolocation" in navigator)) {
			setGeo({ status: "error", message: "Tu dispositivo no permite ubicación." });
			return;
		}
		setGeo({ status: "locating" });
		navigator.geolocation.getCurrentPosition(
			(pos) =>
				setGeo({
					status: "ok",
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
					accuracy: pos.coords.accuracy,
				}),
			(err) =>
				setGeo({
					status: "error",
					message:
						err.code === err.PERMISSION_DENIED
							? "Permiso de ubicación denegado. Actívalo para enviar tu SOS."
							: "No se pudo obtener tu ubicación. Reintenta.",
				}),
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
		);
	};

	// Pide la ubicación apenas entra a la pantalla (clave en pánico).
	useEffect(() => {
		locate();
	}, []);

	const submit = async () => {
		if (geo.status !== "ok") {
			setError("Necesitamos tu ubicación para enviar el SOS.");
			return;
		}
		setError("");
		setSubmitting(true);
		try {
			const res = await createReport({
				type: "sos",
				lat: geo.lat,
				lng: geo.lng,
				accuracy: geo.accuracy,
				peopleCount: Number(people) || 1,
				description: description.trim() || null,
				reporterContact: contact.trim() || null,
			});
			setDone({ queued: res.queued });
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
						<h2 className="text-xl font-bold">
							{done.queued ? "Guardado, se enviará al volver la señal" : "SOS enviado"}
						</h2>
						<p className="text-muted-foreground">
							{done.queued
								? "No hay conexión ahora. Tu SOS se enviará automáticamente cuando vuelva el internet. No cierres la app."
								: "Tu ubicación fue enviada a los equipos de rescate. Mantén el teléfono contigo."}
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
			<Card className="border-destructive/40">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<Siren className="h-5 w-5" /> Estoy atrapado — pedir ayuda
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-lg border bg-muted/40 p-3 text-sm">
						{geo.status === "locating" && (
							<span className="flex items-center gap-2 text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" /> Obteniendo tu ubicación…
							</span>
						)}
						{geo.status === "ok" && (
							<span className="flex items-center gap-2 text-emerald-700">
								<MapPin className="h-4 w-4" /> Ubicación lista (precisión ±
								{Math.round(geo.accuracy)} m)
							</span>
						)}
						{geo.status === "error" && (
							<div className="space-y-2">
								<span className="text-destructive">{geo.message}</span>
								<Button size="sm" variant="outline" onClick={locate} className="w-full">
									Reintentar ubicación
								</Button>
							</div>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="people">¿Cuántas personas están contigo?</Label>
						<Input
							id="people"
							type="number"
							inputMode="numeric"
							min={1}
							value={people}
							onChange={(e) => setPeople(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="desc">Detalles (opcional)</Label>
						<Textarea
							id="desc"
							placeholder="Piso, referencias, heridos, ruidos que puedan oír…"
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

					{error && <p className="text-sm text-destructive">{error}</p>}

					<Button
						size="xl"
						variant="destructive"
						className="w-full"
						disabled={submitting || geo.status === "locating"}
						onClick={submit}
					>
						{submitting ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<>
								<Siren className="h-5 w-5" /> Enviar SOS
							</>
						)}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};
