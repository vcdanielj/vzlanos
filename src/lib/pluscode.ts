import { OpenLocationCode } from "open-location-code";

// Plus Codes (Open Location Code, Apache-2.0): código corto y dictable derivado de
// lat/lng, 100% offline. Un atrapado puede dictarlo por teléfono a un rescatista.
const olc = new OpenLocationCode();

// Código completo de 10 dígitos (~14×14 m), globalmente único y sin ambigüedad.
export const toPlusCode = (lat: number, lng: number): string => {
	try {
		return olc.encode(lat, lng, 10);
	} catch {
		return "";
	}
};

export const isValidPlusCode = (code: string): boolean => {
	try {
		return olc.isValid(code.trim().toUpperCase());
	} catch {
		return false;
	}
};

// Decodifica un Plus Code a coordenadas. Acepta código completo; si es corto,
// necesita una referencia cercana (ej. el centro del mapa) para recuperarlo.
export const fromPlusCode = (
	code: string,
	ref?: { lat: number; lng: number },
): { lat: number; lng: number } | null => {
	const c = code.trim().toUpperCase();
	try {
		if (!olc.isValid(c)) return null;
		let full = c;
		if (!olc.isFull(c)) {
			if (!ref) return null;
			full = olc.recoverNearest(c, ref.lat, ref.lng);
		}
		const area = olc.decode(full);
		return { lat: area.latitudeCenter, lng: area.longitudeCenter };
	} catch {
		return null;
	}
};

// Acepta "Plus Code" o "lat,lng" (texto libre que la familia pega desde WhatsApp).
export const parseLocationInput = (
	input: string,
	ref?: { lat: number; lng: number },
): { lat: number; lng: number } | null => {
	const raw = input.trim();
	if (!raw) return null;
	// "lat, lng"
	const m = raw.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
	if (m) {
		const lat = Number(m[1]);
		const lng = Number(m[2]);
		if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
		return null;
	}
	return fromPlusCode(raw, ref);
};
