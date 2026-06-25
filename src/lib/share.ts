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

// Normaliza un contacto de texto libre a un número WhatsApp (solo dígitos con
// código de país). Devuelve null si no parece un teléfono (ej. un email).
// Venezuela: "0412xxxxxxx" (11 díg, empieza por 0) → "58" + resto sin el 0.
export const toWhatsappNumber = (contact: string | null | undefined): string | null => {
	if (!contact) return null;
	if (contact.includes("@")) return null; // es un email
	const digits = contact.replace(/\D/g, "");
	if (digits.length < 7) return null;
	if (digits.startsWith("58")) return digits;
	if (digits.length === 11 && digits.startsWith("0")) return `58${digits.slice(1)}`;
	if (digits.length === 10 && digits.startsWith("4")) return `58${digits}`;
	return digits; // ya viene con código de país (otro país)
};

// Link a WhatsApp hacia un número concreto con texto prellenado.
export const whatsappToUrl = (number: string, text: string): string =>
	`https://wa.me/${number}?text=${encodeURIComponent(text)}`;

// Mensaje para quien tiene información y quiere escribirle a la familia que reporta.
export const tipToFamilyMessage = (personName: string | null): string =>
	`Hola, tengo información sobre ${personName ?? "la persona"} que reportaste en vzlanos.com 🇻🇪`;

// Flyer de difusión de una búsqueda (para reenviar por WhatsApp y grupos).
export const shareSearchMessage = (opts: {
	personName: string | null;
	age: number | null;
	sex: string | null;
	lastSeen: string | null;
	lastKnownAddress: string | null;
	photoUrl?: string | null;
	boardUrl: string;
}): string => {
	const sexo = opts.sex === "F" ? "Mujer" : opts.sex === "M" ? "Hombre" : null;
	const rasgos = [opts.age != null ? `${opts.age} años` : null, sexo]
		.filter(Boolean)
		.join(", ");
	const lines = [
		`🔎 SE BUSCA: ${opts.personName ?? "Persona desaparecida"}`,
		rasgos || null,
		opts.lastSeen ? `Vista por última vez: ${opts.lastSeen}` : null,
		opts.lastKnownAddress ? `Zona: ${opts.lastKnownAddress}` : null,
		opts.photoUrl ? `Foto: ${opts.photoUrl}` : null,
		"Si la has visto, deja una pista o contacta a su familia en:",
		opts.boardUrl,
		"Ayúdanos a reunirla con su familia 🇻🇪",
	];
	return lines.filter(Boolean).join("\n");
};
