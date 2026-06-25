import {
	Check,
	Copy,
	Facebook,
	Instagram,
	MessageCircle,
	Music2,
	Send,
	Share2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const SHARE_URL = "https://vzlanos.com";
const SHARE_TEXT =
	"Ayuda a localizar personas atrapadas o desaparecidas tras el terremoto 🇻🇪";
const enc = encodeURIComponent;

export const ShareButtons = () => {
	const [copied, setCopied] = useState(false);

	const nativeShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({ title: "vzlanos", text: SHARE_TEXT, url: SHARE_URL });
			} catch {
				// el usuario canceló
			}
		} else {
			copyLink();
		}
	};

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(SHARE_URL);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// algunos navegadores bloquean sin gesto
		}
	};

	const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

	// Instagram y TikTok no permiten publicar por URL: se usa el menú nativo o copiar.
	const items = [
		{
			label: "WhatsApp",
			icon: MessageCircle,
			tone: "text-white bg-[#25D366]",
			onClick: () => open(`https://wa.me/?text=${enc(`${SHARE_TEXT} ${SHARE_URL}`)}`),
		},
		{
			label: "Facebook",
			icon: Facebook,
			tone: "text-white bg-[#1877F2]",
			onClick: () => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(SHARE_URL)}`),
		},
		{
			label: "Instagram",
			icon: Instagram,
			tone: "text-white bg-[#E1306C]",
			onClick: nativeShare,
		},
		{
			label: "TikTok",
			icon: Music2,
			tone: "text-white bg-black",
			onClick: nativeShare,
		},
		{
			label: "X",
			icon: Send,
			tone: "text-white bg-black",
			onClick: () =>
				open(`https://twitter.com/intent/tweet?text=${enc(SHARE_TEXT)}&url=${enc(SHARE_URL)}`),
		},
		{
			label: "Telegram",
			icon: Send,
			tone: "text-white bg-[#229ED9]",
			onClick: () => open(`https://t.me/share/url?url=${enc(SHARE_URL)}&text=${enc(SHARE_TEXT)}`),
		},
	];

	return (
		<div className="rounded-xl border border-vzla-blue/20 bg-vzla-blue/5 p-4">
			<div className="mb-3 flex items-center justify-between gap-2">
				<p className="text-sm font-semibold">
					Comparte vzlanos — ayuda a que más gente la use
				</p>
				<Button size="sm" onClick={nativeShare} className="shrink-0">
					<Share2 className="h-4 w-4" /> Compartir
				</Button>
			</div>
			<div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
				{items.map((it) => (
					<button
						key={it.label}
						type="button"
						onClick={it.onClick}
						className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-accent"
						aria-label={`Compartir en ${it.label}`}
					>
						<span className={`flex h-10 w-10 items-center justify-center rounded-full ${it.tone}`}>
							<it.icon className="h-5 w-5" />
						</span>
						{it.label}
					</button>
				))}
				<button
					type="button"
					onClick={copyLink}
					className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-accent"
					aria-label="Copiar enlace"
				>
					<span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
						{copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
					</span>
					{copied ? "Copiado" : "Copiar"}
				</button>
			</div>
		</div>
	);
};
