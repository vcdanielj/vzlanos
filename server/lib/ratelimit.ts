// Rate limiter en memoria (ventana deslizante). Suficiente para un servicio de
// una sola instancia; no usa deps externas. Lenient para no bloquear a una
// familia que reporta varias personas, pero frena floods de spam.
const hits = new Map<string, number[]>();

export const rateLimit = (key: string, max: number, windowMs: number): boolean => {
	const now = Date.now();
	const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
	if (arr.length >= max) {
		hits.set(key, arr);
		return false;
	}
	arr.push(now);
	hits.set(key, arr);
	return true;
};
