import { Bell, BellRing, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { pushSupported, subscribeForPerson } from "@/lib/push";

// Botón para suscribirse a avisos (Web Push) por una persona.
export const NotifyButton = ({
	personName,
	className,
}: { personName: string; className?: string }) => {
	const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
	const [msg, setMsg] = useState("");

	if (personName.trim().length < 2) return null;
	if (!pushSupported()) {
		return (
			<p className="text-center text-xs text-muted-foreground">
				Para recibir avisos, instala la app (Compartir → “Añadir a inicio”).
			</p>
		);
	}

	const go = async () => {
		setState("loading");
		setMsg("");
		try {
			await subscribeForPerson(personName.trim());
			setState("done");
		} catch (e) {
			setState("error");
			setMsg(e instanceof Error ? e.message : "No se pudo activar el aviso.");
		}
	};

	if (state === "done") {
		return (
			<p className="flex items-center justify-center gap-1 text-sm text-emerald-700">
				<BellRing className="h-4 w-4" /> Te avisaremos cuando haya novedades.
			</p>
		);
	}

	return (
		<div className="space-y-1">
			<Button
				variant="outline"
				className={className}
				onClick={go}
				disabled={state === "loading"}
			>
				{state === "loading" ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Bell className="h-4 w-4" />
				)}
				Avísame cuando haya novedades
			</Button>
			{state === "error" && <p className="text-xs text-destructive">{msg}</p>}
		</div>
	);
};
