import { Navigation, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const DONATIONS = [
	"Agua potable",
	"Alimentos no perecederos",
	"Medicamentos e insumos médicos",
	"Kits de primeros auxilios",
	"Mantas y cobijas",
	"Ropa en buen estado",
	"Artículos de higiene personal",
	"Abrigos y protección",
];

interface Center {
	name: string;
	address: string;
	org?: string;
}

const CENTERS: { region: string; items: Center[] }[] = [
	{
		region: "Caracas",
		items: [
			{ name: "Iglesia La Paz", address: "Montalbán I, Municipio Libertador" },
			{ name: "Iglesia San Bernardino de Siena", address: "Parroquia San Bernardino" },
			{ name: "Terrazas del Club Hípico", address: "Caracas", org: "Rotaract Caracas" },
			{
				name: "Quinta El Bejucal",
				address: "4ª av. de Altamira, entre 9ª y 10ª transversal",
			},
		],
	},
	{
		region: "Zulia",
		items: [
			{ name: "Un Nuevo Tiempo (UNT Zulia)", address: "Sede regional", org: "UNT" },
			{
				name: "Vente Zulia",
				address: "Calle 70 con Av. 15A y 15B, N° 15A-39 (paralela a Nebabrica)",
				org: "Vente",
			},
		],
	},
	{
		region: "Aragua",
		items: [
			{
				name: "C.C. La Capilla",
				address: "Piso 1, local 21, av. 19 de Abril",
				org: "Comando ConVzla",
			},
			{
				name: "Paseo de la Libertad",
				address: "Av. Las Delicias, frente al Centro Médico de Maracay",
				org: "Voluntad Popular",
			},
		],
	},
	{
		region: "Miranda",
		items: [
			{
				name: "Quinta El Bejucal",
				address: "4ª av. de Altamira, entre 9ª y 10ª transversal",
				org: "Comando ConVzla",
			},
		],
	},
	{
		region: "Monagas",
		items: [
			{
				name: "Antiguo restaurante El Oeste",
				address: "Calle 6 (antigua Bermúdez), casa N° 11, Maturín",
				org: "Voluntad Popular Monagas",
			},
		],
	},
	{
		region: "Táchira",
		items: [
			{ name: "Núcleo Táchira (ULA)", address: "Universidad de Los Andes", org: "ULA" },
		],
	},
];

const mapsUrl = (c: Center, region: string) =>
	`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
		`${c.name}, ${c.address}, ${region}, Venezuela`,
	)}`;

export const CentrosAcopio = () => (
	<div className="mx-auto max-w-2xl space-y-5">
		<div className="space-y-1 text-center">
			<h1 className="flex items-center justify-center gap-2 text-xl font-bold">
				<Package className="h-5 w-5 text-vzla-blue" /> Centros de acopio
			</h1>
			<p className="text-sm text-muted-foreground">
				Lleva tu donación a un centro oficial cercano y ayuda a los afectados por el terremoto.
			</p>
		</div>

		<Card>
			<CardContent className="space-y-2 p-4">
				<div className="text-sm font-semibold">¿Qué se puede donar?</div>
				<div className="flex flex-wrap gap-2">
					{DONATIONS.map((d) => (
						<span
							key={d}
							className="rounded-full border border-vzla-blue/20 bg-vzla-blue/5 px-3 py-1 text-xs text-foreground/80"
						>
							{d}
						</span>
					))}
				</div>
			</CardContent>
		</Card>

		{CENTERS.map((group) => (
			<div key={group.region} className="space-y-2">
				<h2 className="flex items-center gap-2 text-sm font-bold text-vzla-blue">
					<span className="inline-block h-2 w-2 rounded-full bg-vzla-red" /> {group.region}
				</h2>
				<div className="space-y-2">
					{group.items.map((c) => (
						<Card key={`${group.region}-${c.name}-${c.address}`}>
							<CardContent className="flex items-start justify-between gap-3 p-4">
								<div className="flex-1">
									<div className="font-semibold">{c.name}</div>
									<div className="text-sm text-muted-foreground">{c.address}</div>
									{c.org && (
										<div className="mt-1 inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
											{c.org}
										</div>
									)}
								</div>
								<a
									href={mapsUrl(c, group.region)}
									target="_blank"
									rel="noreferrer"
									className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-2 text-xs font-medium text-vzla-blue hover:bg-accent"
								>
									<Navigation className="h-4 w-4" /> Cómo llegar
								</a>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		))}

		<p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
			⚠️ Las direcciones pueden cambiar. Confirma el horario del centro antes de ir.
		</p>
	</div>
);
