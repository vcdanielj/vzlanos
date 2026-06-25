import { ExternalLink, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ENLACES = [
	{ name: "venezuelareporta.org", url: "https://venezuelareporta.org" },
	{ name: "sosvenezuela2026.com", url: "https://sosvenezuela2026.com" },
	{ name: "terremotovenezuela.com", url: "https://terremotovenezuela.com" },
	{ name: "venezuelatebusca.com", url: "https://venezuelatebusca.com" },
	{ name: "desaparecidosterremotovenezuela.com", url: "https://desaparecidosterremotovenezuela.com" },
];

export const SitiosAliados = () => {
	return (
		<Card className="border-vzla-blue/20 bg-vzla-blue/5">
			<CardContent className="p-4 space-y-3">
				<div className="flex items-center gap-2 text-vzla-blue">
					<Link2 className="h-4 w-4 shrink-0" />
					<h3 className="font-semibold text-sm">Encuentra a tu familia en otras plataformas</h3>
				</div>
				<p className="text-xs text-muted-foreground leading-relaxed">
					Si no encuentras información aquí, te recomendamos consultar y registrar también en estas iniciativas ciudadanas aliadas para aumentar la visibilidad del reporte:
				</p>
				<div className="grid gap-2 sm:grid-cols-2">
					{ENLACES.map((enlace) => (
						<a
							key={enlace.name}
							href={enlace.url}
							target="_blank"
							rel="noreferrer"
							className="flex items-center justify-between p-2 rounded-lg bg-background border hover:border-vzla-blue/40 transition-colors text-xs font-medium group"
						>
							<span className="truncate group-hover:text-vzla-blue transition-colors">
								{enlace.name}
							</span>
							<ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-vzla-blue transition-colors ml-1" />
						</a>
					))}
				</div>
			</CardContent>
		</Card>
	);
};
