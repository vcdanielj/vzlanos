import { eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "../db/client.ts";
import { pushSubs } from "../db/schema.ts";

const PUB = process.env.VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:soporte@vzlanos.com";

let configured = false;
if (PUB && PRIV) {
	webpush.setVapidDetails(SUBJECT, PUB, PRIV);
	configured = true;
}

export const pushEnabled = () => configured;
export const vapidPublicKey = () => PUB ?? "";

const norm = (s: string) => s.trim().toLowerCase();

export interface BrowserSub {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

export const saveSubscription = async (sub: BrowserSub, personName: string) => {
	// Unicidad por (endpoint, persona): un mismo navegador puede vigilar a VARIOS
	// familiares sin sobrescribir las suscripciones anteriores.
	await db
		.insert(pushSubs)
		.values({
			endpoint: sub.endpoint,
			p256dh: sub.keys.p256dh,
			auth: sub.keys.auth,
			personName: norm(personName),
		})
		.onConflictDoNothing();
};

// Envía un payload a todos los suscriptores de una persona (match exacto normalizado).
const notifyPerson = async (
	personName: string | null,
	payload: { title: string; body: string; url: string },
) => {
	if (!configured || !personName) return;
	const subs = await db
		.select()
		.from(pushSubs)
		.where(eq(pushSubs.personName, norm(personName)));
	if (!subs.length) return;
	const json = JSON.stringify(payload);
	await Promise.all(
		subs.map(async (s) => {
			try {
				await webpush.sendNotification(
					{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
					json,
				);
			} catch (e) {
				const code = (e as { statusCode?: number }).statusCode;
				if (code === 404 || code === 410) {
					await db.delete(pushSubs).where(eq(pushSubs.endpoint, s.endpoint));
				}
			}
		}),
	);
};

// Aviso "buenas noticias" cuando la persona aparece a salvo / encontrada / rescatada.
export const notifyPersonSafe = async (personName: string | null, status: string) => {
	if (!configured || !personName) return;
	const verb =
		status === "a_salvo"
			? "reportada A SALVO"
			: status === "encontrado"
				? "ENCONTRADA"
				: "rescatada";
	await notifyPerson(personName, {
		title: "vzlanos — buenas noticias 🇻🇪",
		body: `“${personName}” fue ${verb}. Toca para ver el estado.`,
		url: "/buscar",
	});
};

// Aviso a la familia cuando alguien aporta una pista / avistamiento.
export const notifyTipReceived = async (personName: string | null) => {
	if (!configured || !personName) return;
	await notifyPerson(personName, {
		title: "vzlanos — alguien tiene información 🔎",
		body: `Recibimos una pista sobre “${personName}”. Toca para verla.`,
		url: "/desaparecidos",
	});
};
