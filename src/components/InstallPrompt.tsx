import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: string }>;
};

// Invita a instalar la PWA: botón nativo en Android/Chrome, instrucciones en iOS.
export const InstallPrompt = () => {
	const [deferred, setDeferred] = useState<BIPEvent | null>(null);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		const h = (e: Event) => {
			e.preventDefault();
			setDeferred(e as BIPEvent);
		};
		window.addEventListener("beforeinstallprompt", h);
		return () => window.removeEventListener("beforeinstallprompt", h);
	}, []);

	const isStandalone =
		window.matchMedia("(display-mode: standalone)").matches ||
		(navigator as unknown as { standalone?: boolean }).standalone === true;
	const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

	if (isStandalone || dismissed) return null;
	if (!deferred && !isIOS) return null;

	return (
		<div className="flex items-center gap-3 rounded-xl border border-vzla-blue/20 bg-vzla-blue/5 p-3">
			<Download className="h-5 w-5 shrink-0 text-vzla-blue" />
			{deferred ? (
				<>
					<p className="flex-1 text-sm">
						Instala <span className="font-semibold">vzlanos</span> para abrirla rápido y
						recibir avisos.
					</p>
					<Button
						size="sm"
						onClick={async () => {
							await deferred.prompt();
							setDeferred(null);
						}}
					>
						Instalar
					</Button>
				</>
			) : (
				<p className="flex-1 text-sm">
					Para instalar: toca <Share className="inline h-4 w-4" /> Compartir y luego “Añadir a
					pantalla de inicio”.
				</p>
			)}
			<button type="button" onClick={() => setDismissed(true)} aria-label="Cerrar">
				<X className="h-4 w-4 text-muted-foreground" />
			</button>
		</div>
	);
};
