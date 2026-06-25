import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import type { Report, ReportStatus } from "@shared/types";
import { STATUS_LABELS, TYPE_LABELS } from "@shared/types";

// Color por estado (sin assets externos: usamos divIcon con HTML).
const STATUS_COLOR: Record<ReportStatus, string> = {
	nuevo: "#dc2626",
	en_progreso: "#f59e0b",
	rescatado: "#059669",
	a_salvo: "#0ea5e9",
	descartado: "#9ca3af",
};

const pinIcon = (color: string) =>
	L.divIcon({
		className: "",
		html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 2px rgba(0,0,0,.25)"></div>`,
		iconSize: [18, 18],
		iconAnchor: [9, 9],
	});

// Caracas como centro por defecto (ajustar según el país afectado).
const DEFAULT_CENTER: [number, number] = [10.4806, -66.9036];

interface MapViewProps {
	reports: Report[];
	height?: number;
	onSelect?: (r: Report) => void;
}

export const MapView = ({ reports, height = 420, onSelect }: MapViewProps) => {
	const withCoords = reports.filter((r) => r.lat != null && r.lng != null);
	const center: [number, number] = withCoords.length
		? [withCoords[0].lat as number, withCoords[0].lng as number]
		: DEFAULT_CENTER;

	return (
		<div style={{ height }} className="overflow-hidden rounded-xl border">
			<MapContainer center={center} zoom={13} scrollWheelZoom>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				{withCoords.map((r) => (
					<Marker
						key={r.id}
						position={[r.lat as number, r.lng as number]}
						icon={pinIcon(STATUS_COLOR[r.status])}
						eventHandlers={onSelect ? { click: () => onSelect(r) } : undefined}
					>
						<Popup>
							<div className="space-y-1 text-sm">
								<div className="font-semibold">{TYPE_LABELS[r.type]}</div>
								{r.personName ? <div>Persona: {r.personName}</div> : null}
								{r.peopleCount != null ? (
									<div>Personas: {r.peopleCount}</div>
								) : null}
								{r.description ? <div>{r.description}</div> : null}
								<div className="text-xs text-muted-foreground">
									Estado: {STATUS_LABELS[r.status]}
								</div>
							</div>
						</Popup>
					</Marker>
				))}
			</MapContainer>
		</div>
	);
};

interface PickMapProps {
	value: { lat: number; lng: number } | null;
	onChange: (coords: { lat: number; lng: number }) => void;
	height?: number;
}

const ClickHandler = ({
	onChange,
}: { onChange: (c: { lat: number; lng: number }) => void }) => {
	useMapEvents({
		click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }),
	});
	return null;
};

// Mapa para elegir/ajustar una ubicación tocando el mapa.
export const PickMap = ({ value, onChange, height = 300 }: PickMapProps) => {
	const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
	return (
		<div style={{ height }} className="overflow-hidden rounded-xl border">
			<MapContainer center={center} zoom={value ? 16 : 12} scrollWheelZoom>
				<TileLayer
					attribution='&copy; OpenStreetMap'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<ClickHandler onChange={onChange} />
				{value ? (
					<Marker position={[value.lat, value.lng]} icon={pinIcon("#dc2626")} />
				) : null}
			</MapContainer>
		</div>
	);
};
