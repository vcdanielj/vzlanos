import {
	HandHeart,
	HeartHandshake,
	LifeBuoy,
	MapPin,
	Package,
	PhoneCall,
	Search,
	Share2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { InstallPrompt } from "@/components/InstallPrompt";
import { VersesBanner } from "@/components/VersesBanner";
import { Card, CardContent } from "@/components/ui/card";

const actions = [
	{
		to: "/reportar",
		icon: MapPin,
		title: "Reportar personas atrapadas",
		desc: "Marca en el mapa dónde hay alguien atrapado (tú u otra persona).",
		tone: "bg-vzla-yellow text-vzla-blue",
	},
	{
		to: "/compartir",
		icon: Share2,
		title: "Compartir mi ubicación",
		desc: "Envía dónde estás a tu familia por WhatsApp para que pidan ayuda.",
		tone: "bg-vzla-yellow text-vzla-blue",
	},
	{
		to: "/buscar",
		icon: Search,
		title: "Buscar a un familiar",
		desc: "Reporta o sigue a un ser querido desaparecido.",
		tone: "bg-vzla-blue text-white",
	},
	{
		to: "/encontrar",
		icon: HeartHandshake,
		title: "Encontré a una persona",
		desc: "Hospitales, iglesias o albergues: registra a quien recibiste, con foto.",
		tone: "bg-vzla-blue text-white",
	},
	{
		to: "/acopio",
		icon: Package,
		title: "Centros de acopio",
		desc: "Dónde llevar donaciones (agua, comida, medicinas) por región.",
		tone: "bg-vzla-blue text-white",
	},
	{
		to: "/ayuda",
		icon: PhoneCall,
		title: "¿A quién contacto?",
		desc: "Líneas de emergencia, Cruz Roja, Protección Civil.",
		tone: "bg-vzla-red text-white",
	},
	{
		to: "/oracion",
		icon: HandHeart,
		title: "Sala de oración",
		desc: "Comparte tu petición y ora junto a la comunidad por Venezuela.",
		tone: "bg-vzla-red text-white",
	},
];

export const Home = () => (
	<div className="mx-auto w-full max-w-2xl space-y-5 py-2">
		<VersesBanner />
		<div className="space-y-2 text-center">
			<div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
				<LifeBuoy className="h-3.5 w-3.5" /> Respuesta a la emergencia 🇻🇪
			</div>
			<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
				Encuentra y reúne a los tuyos
			</h1>
			<p className="text-muted-foreground">
				Reporta a quien necesita rescate, comparte tu ubicación o busca a un ser querido. Cada
				reporte llega a los equipos de rescate.
			</p>
		</div>

		<div className="grid gap-3 sm:grid-cols-2">
			{actions.map((a) => (
				<Link key={a.to} to={a.to} aria-label={a.title}>
					<Card className="transition-shadow hover:shadow-md">
						<CardContent className="flex items-start gap-4 p-5">
							<div
								className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${a.tone}`}
							>
								<a.icon className="h-6 w-6" />
							</div>
							<div>
								<div className="font-semibold">{a.title}</div>
								<div className="text-sm text-muted-foreground">{a.desc}</div>
							</div>
						</CardContent>
					</Card>
				</Link>
			))}
		</div>

		<InstallPrompt />
	</div>
);
