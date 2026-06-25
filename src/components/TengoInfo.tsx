import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendTip } from "@/lib/api";

// Form inline (expandible) para aportar una pista/avistamiento sobre una persona
// buscada. La pista la ven los rescatistas; la familia recibe un aviso por push.
export const TengoInfo = ({
	reportId,
	personName,
	className,
}: { reportId: number; personName: string | null; className?: string }) => {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [contact, setContact] = useState("");
	const [name, setName] = useState("");
	const [state, setState] = useState<"idle" | "loading" | "done">("idle");
	const [error, setError] = useState("");

	const submit = async () => {
		if (message.trim().length < 3) {
			setError("Escribe la información que tienes.");
			return;
		}
		setError("");
		setState("loading");
		try {
			await sendTip(reportId, {
				message: message.trim(),
				contact: contact.trim() || null,
				name: name.trim() || null,
			});
			setState("done");
		} catch (e) {
			setState("idle");
			setError(e instanceof Error ? e.message : "No se pudo enviar.");
		}
	};

	if (state === "done") {
		return (
			<p className="flex items-center justify-center gap-1 text-sm text-emerald-700">
				<CheckCircle2 className="h-4 w-4" /> Gracias. Tu pista fue enviada a la familia.
			</p>
		);
	}

	if (!open) {
		return (
			<Button
				variant="outline"
				size="sm"
				className={className}
				onClick={() => setOpen(true)}
			>
				<Info className="h-4 w-4" /> Tengo información
			</Button>
		);
	}

	return (
		<div className="space-y-2 rounded-lg border bg-muted/30 p-3">
			<p className="text-xs font-medium text-muted-foreground">
				Cuéntanos qué sabes de {personName ?? "esta persona"}. Llegará a su familia.
			</p>
			<Textarea
				placeholder="La vi en… / está en el hospital… / la atiende…"
				value={message}
				onChange={(e) => setMessage(e.target.value)}
			/>
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1">
					<Label className="text-xs">Tu nombre (opcional)</Label>
					<Input value={name} onChange={(e) => setName(e.target.value)} />
				</div>
				<div className="space-y-1">
					<Label className="text-xs">Tu contacto (opcional)</Label>
					<Input
						placeholder="Tel / WhatsApp"
						value={contact}
						onChange={(e) => setContact(e.target.value)}
					/>
				</div>
			</div>
			{error && <p className="text-xs text-destructive">{error}</p>}
			<div className="flex gap-2">
				<Button
					size="sm"
					className="flex-1"
					onClick={submit}
					disabled={state === "loading"}
				>
					{state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar pista"}
				</Button>
				<Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
					Cancelar
				</Button>
			</div>
		</div>
	);
};
