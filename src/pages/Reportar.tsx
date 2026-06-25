import { CheckCircle2, Crosshair, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PickMap } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReport } from "@/lib/api";

export const Reportar = () => {
	const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
	const [people, setPeople] = useState("");
	const [description, setDescription] = useState("");
	const [contact, setContact] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState<null | { duplicate?: boolean; queued?: boolean }>(null);
	const [error, setError] = useState("");

	const useMyLocation = () => {
		if (!("geolocation" in navigator)) return;
		navigator.geolocation.getCurrentPosition(
			(pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
			() => setError("No se pudo obtener tu ubicación. Toca el mapa para marcar el punto."),
			{ enableHighAccuracy: true, timeout: 15000 },
		);
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
				peopleCount: people ? Number(people) : null,
				description: description.trim() || null,
				reporterContact: contact.trim() || null,
			});
			setDone({ duplicate: res.duplicate, queued: res.queued });
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
							{done.duplicate ? "Ya había un reporte aquí" : "Reporte enviado"}
						</h2>
						<p className="text-muted-foreground">
							{done.queued
								? "Sin conexión: se enviará al volver la señal."
								: done.duplicate
									? "Detectamos un reporte muy cercano y reciente. Los rescatistas ya lo tienen en el mapa."
									: "Gracias. El punto ya aparece en el mapa de rescate."}
						</p>
						<div className="flex gap-2">
							<Button asChild variant="outline" className="flex-1">
								<Link to="/mapa">Ver mapa</Link>
							</Button>
							<Button
								className="flex-1"
								onClick={() => {
									setDone(null);
									setCoords(null);
									setPeople("");
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
						Toca el mapa donde están las personas atrapadas, o usa tu ubicación actual.
					</p>

					<Button variant="outline" className="w-full" onClick={useMyLocation}>
						<Crosshair className="h-4 w-4" /> Usar mi ubicación
					</Button>

					<PickMap value={coords} onChange={setCoords} />

					<div className="space-y-2">
						<Label htmlFor="people">¿Cuántas personas? (si lo sabes)</Label>
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
						<Label htmlFor="desc">Detalles</Label>
						<Textarea
							id="desc"
							placeholder="Edificio, dirección, situación…"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="contact">Tu teléfono (opcional)</Label>
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
						size="lg"
						className="w-full"
						disabled={submitting}
						onClick={submit}
					>
						{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar reporte"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};
