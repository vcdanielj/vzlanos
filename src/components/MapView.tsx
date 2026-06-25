import L from "leaflet";
import "leaflet.markercluster";
import { useEffect } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Report, ReportStatus } from "@shared/types";
import { STATUS_LABELS, TYPE_LABELS } from "@shared/types";
import { toPlusCode } from "@/lib/pluscode";
import { directionsUrl } from "@/lib/share";

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

const esc = (s: string | null | undefined): string =>
	(s ?? "").replace(/[&<>"]/g, (c) =>
		c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
	);

// Recalcula el tamaño del mapa al montar y en resize/orientación (evita tiles grises).
const InvalidateOnResize = () => {
	const map = useMap();
	useEffect(() => {
		const fix = () => map.invalidateSize();
		const t = setTimeout(fix, 50);
		window.addEventListener("resize", fix);
		window.addEventListener("orientationchange", fix);
		return () => {
			clearTimeout(t);
			window.removeEventListener("resize", fix);
			window.removeEventListener("orientationchange", fix);
		};
	}, [map]);
	return null;
};

// Capa de marcadores agrupados (clustering). Usa leaflet.markercluster directo
// (patrón useMap) para que el mapa siga usable con cientos de pines.
const ClusterLayer = ({ reports }: { reports: Report[] }) => {
	const map = useMap();
	useEffect(() => {
		const group = L.markerClusterGroup({ maxClusterRadius: 50 });
		for (const r of reports) {
			if (r.lat == null || r.lng == null) continue;
			const plus = toPlusCode(r.lat, r.lng);
			const popup = `
				<div style="font-size:13px;line-height:1.4">
					<div style="font-weight:600">${esc(TYPE_LABELS[r.type])}</div>
					${r.personName ? `<div>Persona: ${esc(r.personName)}</div>` : ""}
					${r.peopleCount != null ? `<div>Personas: ${r.peopleCount}</div>` : ""}
					${r.description ? `<div>${esc(r.description)}</div>` : ""}
					<div style="color:#64748b">Estado: ${esc(STATUS_LABELS[r.status])}</div>
					<div style="color:#64748b;font-family:monospace">${esc(plus)}</div>
					<a href="${directionsUrl(r.lat, r.lng)}" target="_blank" rel="noreferrer"
						style="display:inline-block;margin-top:4px;color:#2563eb">Cómo llegar →</a>
				</div>`;
			L.marker([r.lat, r.lng], { icon: pinIcon(STATUS_COLOR[r.status]) })
				.bindPopup(popup)
				.addTo(group);
		}
		map.addLayer(group);
		return () => {
			map.removeLayer(group);
		};
	}, [map, reports]);
	return null;
};

interface MapViewProps {
	reports: Report[];
	className?: string;
}

export const MapView = ({
	reports,
	className = "h-[45vh] min-h-[260px] md:h-[420px]",
}: MapViewProps) => {
	const withCoords = reports.filter((r) => r.lat != null && r.lng != null);
	const center: [number, number] = withCoords.length
		? [withCoords[0].lat as number, withCoords[0].lng as number]
		: DEFAULT_CENTER;

	return (
		<div className={`overflow-hidden rounded-xl border ${className}`}>
			<MapContainer center={center} zoom={13} scrollWheelZoom>
				<InvalidateOnResize />
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<ClusterLayer reports={reports} />
			</MapContainer>
		</div>
	);
};

interface PickMapProps {
	value: { lat: number; lng: number } | null;
	onChange: (coords: { lat: number; lng: number }) => void;
	accuracy?: number | null;
	className?: string;
}

const ClickHandler = ({
	onChange,
}: { onChange: (c: { lat: number; lng: number }) => void }) => {
	useMapEvents({
		click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }),
	});
	return null;
};

// Mapa para elegir/ajustar una ubicación: toca el mapa o arrastra el marcador.
export const PickMap = ({
	value,
	onChange,
	accuracy,
	className = "h-[40vh] min-h-[240px] md:h-[320px]",
}: PickMapProps) => {
	const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
	return (
		<div className={`overflow-hidden rounded-xl border ${className}`}>
			<MapContainer center={center} zoom={value ? 16 : 12} scrollWheelZoom>
				<InvalidateOnResize />
				<TileLayer
					attribution="&copy; OpenStreetMap"
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<ClickHandler onChange={onChange} />
				{value && accuracy ? (
					<Circle
						center={[value.lat, value.lng]}
						radius={accuracy}
						pathOptions={{ color: "#dc2626", weight: 1, fillOpacity: 0.08 }}
					/>
				) : null}
				{value ? (
					<Marker
						position={[value.lat, value.lng]}
						icon={pinIcon("#dc2626")}
						draggable
						eventHandlers={{
							dragend: (e) => {
								const p = e.target.getLatLng();
								onChange({ lat: p.lat, lng: p.lng });
							},
						}}
					/>
				) : null}
			</MapContainer>
		</div>
	);
};
