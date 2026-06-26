// reCAPTCHA v3 del registro externo de desaparecidos
// (desaparecidosterremotovenezuela.com). Su API ahora exige un token reCAPTCHA
// en la cabecera `x-recaptcha-token`. Generamos el token en el navegador con la
// MISMA site key pública del registro y lo enviamos a nuestro proxy
// (/api/personas), que lo reenvía al upstream.
//
// La site key es pública (viaja en el JS del sitio original); no es un secreto.
const SITE_KEY = "6LeBfDUtAAAAAMw1Wtkd58bst6vEnLOi3_NAjGD0";

declare global {
	interface Window {
		grecaptcha?: {
			ready: (cb: () => void) => void;
			execute: (siteKey: string, opts: { action: string }) => Promise<string>;
		};
	}
}

let scriptPromise: Promise<void> | null = null;

// Inyecta el script de Google reCAPTCHA v3 una sola vez.
const loadScript = (): Promise<void> => {
	if (scriptPromise) return scriptPromise;
	scriptPromise = new Promise<void>((resolve, reject) => {
		if (window.grecaptcha) {
			resolve();
			return;
		}
		const s = document.createElement("script");
		s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
		s.async = true;
		s.defer = true;
		s.onload = () => resolve();
		s.onerror = () => {
			scriptPromise = null; // permitir reintento en la próxima llamada
			reject(new Error("No se pudo cargar reCAPTCHA"));
		};
		document.head.appendChild(s);
	});
	return scriptPromise;
};

// Devuelve un token reCAPTCHA v3 para la acción dada, o null si falla
// (el proxy responderá entonces el error del upstream sin tumbar la app).
export const getRecaptchaToken = async (
	action = "submit",
): Promise<string | null> => {
	try {
		await loadScript();
		const g = window.grecaptcha;
		if (!g) return null;
		await new Promise<void>((r) => g.ready(() => r()));
		return await g.execute(SITE_KEY, { action });
	} catch {
		return null;
	}
};
