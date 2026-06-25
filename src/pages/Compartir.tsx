import { Check, Copy, Loader2, MapPin, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PickMap } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toPlusCode } from "@/lib/pluscode";
import { buildLocationMessage, whatsappShareUrl } from "@/lib/share";

type GeoState =
	| { status: "idle" }
	| { status: "locating" }
	| { status: "ok"; lat: number; lng: number; accuracy: number }
	| { status: "error"; message: string };

export const Compartir = () => {
	const [geo, setGeo] = useState<GeoState>({ status: "idle" });
	const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
	const [copied, setCopied] = useState(false);

	const locate = () => {
		if (!("geolocation" in navigator)) {
			setGeo({ status: "error", message: "Tu dispositivo no permite ubicación." });
			return;
		}
		setGeo({ status: "locating" });
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setGeo({
					status: "ok",
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
					accuracy: pos.coords.accuracy,
				});
				setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
			},
			(err) =>
				setGeo({
					status: "error",
					message:
						err.code === err.PERMISSION_DENIED
							? "Permiso de ubicación denegado. Actívalo para compartir dónde estás."
							: "No se pudo obtener tu ubicación. Reintenta.",
				}),
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
		);
	};

	useEffect(() => {
		locate();
	}, []);

	const plusCode = coords ? toPlusCode(coords.lat, coords.lng) : "";

	const copyCode = async () => {
		if (!plusCode) return;
		try {
			await navigator.clipboard.writeText(plusCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// algunos navegadores bloquean clipboard sin gesto; se ignora
		}
	};

	const sendWhatsApp = () => {
		if (!coords) return;
		const msg = buildLocationMessage(coords.lat, coords.lng);
		window.open(whatsappShareUrl(msg), "_blank");
	};

	return (
		<div className="mx-auto max-w-md space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Share2 className="h-5 w-5" /> Compartir mi ubicación
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Envía dónde estás a tu familia por WhatsApp. Pueden pedir ayuda y reportarte en el
						mapa de rescate.
					</p>

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

					{coords && (
						<>
							{geo.status === "ok" && geo.accuracy > 50 && (
								<p className="text-xs text-amber-600">
									La precisión es baja. Arrastra el mapa para ajustar el punto exacto.
								</p>
							)}
							<PickMap value={coords} onChange={setCoords} />

							<div className="space-y-1">
								<div className="text-xs font-medium text-muted-foreground">
									Plus Code (puedes dictarlo por teléfono)
								</div>
								<div className="flex items-center gap-2">
									<code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
										{plusCode}
									</code>
									<Button size="icon" variant="outline" onClick={copyCode} aria-label="Copiar">
										{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
									</Button>
								</div>
							</div>

							<Button
								size="xl"
								className="w-full bg-emerald-600 hover:bg-emerald-700"
								onClick={sendWhatsApp}
							>
								<Share2 className="h-5 w-5" /> Enviar por WhatsApp
							</Button>
						</>
					)}

					<Button asChild variant="outline" className="w-full">
						<Link to="/reportar">También reportar en el mapa de rescate</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};
