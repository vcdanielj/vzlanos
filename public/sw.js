// Service worker mínimo: cachea el shell para que la app abra sin conexión.
// El POST de reportes lo maneja la cola en localStorage (lib/api.ts), no aquí.
const CACHE = "rescate-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
			),
	);
	self.clients.claim();
});

// Web Push: aviso "encontraron a tu familiar".
self.addEventListener("push", (event) => {
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch {
		data = {};
	}
	event.waitUntil(
		self.registration.showNotification(data.title || "vzlanos", {
			body: data.body || "",
			icon: "/icon-192.png",
			badge: "/icon-192.png",
			data: { url: data.url || "/" },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = (event.notification.data && event.notification.data.url) || "/";
	event.waitUntil(
		self.clients.matchAll({ type: "window" }).then((list) => {
			for (const c of list) {
				if ("focus" in c) {
					c.navigate(url);
					return c.focus();
				}
			}
			return self.clients.openWindow(url);
		}),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	// Nunca cachear API ni export: deben ir siempre a la red.
	const url = new URL(request.url);
	if (request.method !== "GET" || url.pathname.startsWith("/api") || url.pathname.startsWith("/export")) {
		return;
	}
	// Network-first con fallback a cache (para que el mapa muestre tiles/datos frescos).
	event.respondWith(
		fetch(request)
			.then((res) => {
				const copy = res.clone();
				caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
				return res;
			})
			.catch(() => caches.match(request).then((r) => r ?? caches.match("/index.html"))),
	);
});
