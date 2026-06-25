// Suscripción a Web Push para recibir aviso cuando aparezca novedad de una persona.

const urlBase64ToUint8Array = (base64: string): Uint8Array => {
	const padding = "=".repeat((4 - (base64.length % 4)) % 4);
	const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(b64);
	const arr = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
	return arr;
};

export const pushSupported = () =>
	"serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const subscribeForPerson = async (personName: string): Promise<void> => {
	if (!pushSupported()) {
		throw new Error("Tu navegador no soporta avisos. Instala la app para recibirlos.");
	}
	const res = await fetch("/api/push/vapid");
	const { publicKey, enabled } = (await res.json()) as {
		publicKey: string;
		enabled: boolean;
	};
	if (!enabled || !publicKey) throw new Error("Los avisos no están disponibles ahora.");

	const perm = await Notification.requestPermission();
	if (perm !== "granted") throw new Error("Activa los permisos de notificación para recibir avisos.");

	const reg = await navigator.serviceWorker.ready;
	const existing = await reg.pushManager.getSubscription();
	const sub =
		existing ??
		(await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
		}));

	const r = await fetch("/api/push/subscribe", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ personName, subscription: sub.toJSON() }),
	});
	if (!r.ok) throw new Error("No se pudo registrar el aviso.");
};
