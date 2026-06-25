import { Globe, Phone, PhoneCall } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Contactos de emergencia. VERIFICAR y ajustar al país afectado antes de difundir.
const contacts = [
	{ name: "Emergencias (línea única)", phone: "911", note: "Policía / bomberos / ambulancia" },
	{ name: "Protección Civil", phone: "0212-6620644", note: "Gestión de desastres" },
	{ name: "Bomberos", phone: "171", note: "Rescate y atención de incendios" },
	{ name: "Cruz Roja", phone: "0212-5714380", note: "Atención humanitaria y reunificación" },
];

const links = [
	{
		name: "Google Person Finder",
		url: "https://google.org/personfinder/global/home.html",
		note: "Registro internacional de personas — buscar / reportar",
	},
	{
		name: "CICR — Restablecimiento del contacto familiar",
		url: "https://familylinks.icrc.org/",
		note: "Cruz Roja Internacional: reunificación de familias",
	},
];

export const Ayuda = () => (
	<div className="mx-auto max-w-md space-y-4">
		<div className="space-y-1">
			<h1 className="flex items-center gap-2 text-xl font-bold">
				<PhoneCall className="h-5 w-5" /> ¿A quién contacto?
			</h1>
			<p className="text-sm text-muted-foreground">
				Líneas de emergencia y organizaciones de ayuda. Si hay vidas en peligro inmediato,
				llama primero a emergencias.
			</p>
		</div>

		<div className="space-y-2">
			{contacts.map((c) => (
				<a key={c.name} href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}>
					<Card className="transition-shadow hover:shadow-md">
						<CardContent className="flex items-center gap-4 p-4">
							<div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
								<Phone className="h-5 w-5" />
							</div>
							<div className="flex-1">
								<div className="font-semibold">{c.name}</div>
								<div className="text-sm text-muted-foreground">{c.note}</div>
							</div>
							<div className="font-mono text-sm">{c.phone}</div>
						</CardContent>
					</Card>
				</a>
			))}
		</div>

		<h2 className="pt-2 text-sm font-semibold text-muted-foreground">
			Para familiares en el exterior
		</h2>
		<div className="space-y-2">
			{links.map((l) => (
				<a key={l.name} href={l.url} target="_blank" rel="noreferrer">
					<Card className="transition-shadow hover:shadow-md">
						<CardContent className="flex items-center gap-4 p-4">
							<div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-white">
								<Globe className="h-5 w-5" />
							</div>
							<div className="flex-1">
								<div className="font-semibold">{l.name}</div>
								<div className="text-sm text-muted-foreground">{l.note}</div>
							</div>
						</CardContent>
					</Card>
				</a>
			))}
		</div>

		<p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
			⚠️ Verifica estos números con las autoridades locales: pueden variar según la región.
		</p>
	</div>
);
