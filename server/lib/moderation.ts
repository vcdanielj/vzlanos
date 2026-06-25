// Moderación gratuita por palabras clave + heurísticas (sin IA, costo cero).
// Suficiente como primera línea para el muro/chat de oración. Ari (Vertex) puede
// añadirse después como segunda capa para casos sutiles.

const BAD_WORDS = [
	// insultos / vulgaridad comunes (es)
	"mierda",
	"puta",
	"puto",
	"coño",
	"carajo",
	"marico",
	"maricón",
	"maricon",
	"verga",
	"pendejo",
	"imbécil",
	"imbecil",
	"estúpido",
	"estupido",
	"idiota",
	"malparido",
	"hijueputa",
	"hp",
	"perra",
	"zorra",
	"culo",
	"cabrón",
	"cabron",
	// odio / amenazas
	"matar",
	"muérete",
	"muerete",
	// inglés frecuente
	"fuck",
	"shit",
	"bitch",
	"asshole",
];

export const moderate = (text: string): { ok: boolean; reason?: string } => {
	const lower = text.toLowerCase();
	// Palabra completa (evita falsos positivos dentro de otras palabras).
	for (const w of BAD_WORDS) {
		const re = new RegExp(`(^|[^a-záéíóúñü])${w}([^a-záéíóúñü]|$)`, "i");
		if (re.test(lower)) return { ok: false, reason: "Evita lenguaje ofensivo." };
	}
	// Enlaces / promoción (anti-spam).
	if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|xyz|info|biz|ru|click|shop)\b)/i.test(text)) {
		return { ok: false, reason: "No se permiten enlaces." };
	}
	// Spam por repetición excesiva de un carácter.
	if (/(.)\1{9,}/.test(text)) {
		return { ok: false, reason: "Mensaje detectado como spam." };
	}
	// Número de teléfono repetido (anti difusión masiva): más de 1 secuencia larga de dígitos.
	const digitRuns = text.match(/\d{7,}/g);
	if (digitRuns && digitRuns.length > 2) {
		return { ok: false, reason: "Demasiados números." };
	}
	return { ok: true };
};
