import { toPlusCode } from "./pluscode";

// Link de "cómo llegar" (navegación). Google Maps universal funciona en iOS y Android
// y abre la app nativa si está instalada.
export const directionsUrl = (lat: number, lng: number): string =>
	`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

// Link a un punto en el mapa (abre la app de mapas en el sitio).
export const mapPointUrl = (lat: number, lng: number): string =>
	`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

// Mensaje de WhatsApp con la ubicación: Plus Code dictable + link al mapa + coords.
export const buildLocationMessage = (lat: number, lng: number, note?: string): string => {
	const plus = toPlusCode(lat, lng);
	const lines = [
		"🆘 Ubicación de emergencia",
		note ? note : "Aquí estoy / aquí hay personas atrapadas.",
		`Plus Code: ${plus}`,
		`Mapa: ${mapPointUrl(lat, lng)}`,
		`Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
	];
	return lines.filter(Boolean).join("\n");
};

// Abre WhatsApp (app o web) con el mensaje prellenado, sin destinatario fijo
// (el usuario elige a quién enviarlo: su familia).
export const whatsappShareUrl = (text: string): string =>
	`https://wa.me/?text=${encodeURIComponent(text)}`;
