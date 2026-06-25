import { PhoneCall, Phone, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

// Contactos de emergencia. VERIFICAR y ajustar al país afectado antes de difundir.
const contacts = [
	{ name: "Emergencias (VEN 911)", phone: "911", note: "Policía / bomberos / ambulancia · nacional" },
	{
		name: "Protección Civil",
		phone: "0800-7248451",
		note: "Gestión de desastres · gratuito nacional (también 166)",
	},
	{ name: "Bomberos", phone: "167", note: "Rescate y atención de incendios" },
	{
		name: "Cruz Roja Venezolana",
		phone: "0212-5714380",
		note: "Atención humanitaria · WhatsApp 0424-2190429",
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
							<div className="flex h-11 w-11 items-center justify-center rounded-full bg-vzla-blue text-white">
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
			¿Buscas a un familiar?
		</h2>
		<Link to="/buscar">
			<Card className="transition-shadow hover:shadow-md">
				<CardContent className="flex items-center gap-4 p-4">
					<div className="flex h-11 w-11 items-center justify-center rounded-full bg-vzla-yellow text-vzla-blue">
						<Search className="h-5 w-5" />
					</div>
					<div className="flex-1">
						<div className="font-semibold">Buscar o reportar un desaparecido</div>
						<div className="text-sm text-muted-foreground">
							Aquí mismo en vzlanos: reporta a tu ser querido con foto y sigue su estado.
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>

		<p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
			⚠️ Verifica estos números con las autoridades locales: pueden variar según la región.
		</p>
	</div>
);
