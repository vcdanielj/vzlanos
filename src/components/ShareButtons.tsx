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

const SHARE_URL = "https://vzlanos.com";
const SHARE_TEXT =
	"Ayuda a localizar personas atrapadas o desaparecidas tras el terremoto 🇻🇪";
const enc = encodeURIComponent;

// Fila compacta de compartir, pensada para el footer.
export const ShareButtons = () => {
	const [copied, setCopied] = useState(false);

	const nativeShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({ title: "vzlanos", text: SHARE_TEXT, url: SHARE_URL });
			} catch {
				/* cancelado */
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
			/* sin permiso */
		}
	};

	const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

	// Instagram y TikTok no permiten publicar por URL: se usa el menú nativo.
	const items = [
		{
			label: "WhatsApp",
			icon: MessageCircle,
			tone: "bg-[#25D366]",
			onClick: () => open(`https://wa.me/?text=${enc(`${SHARE_TEXT} ${SHARE_URL}`)}`),
		},
		{
			label: "Facebook",
			icon: Facebook,
			tone: "bg-[#1877F2]",
			onClick: () => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(SHARE_URL)}`),
		},
		{ label: "Instagram", icon: Instagram, tone: "bg-[#E1306C]", onClick: nativeShare },
		{ label: "TikTok", icon: Music2, tone: "bg-black", onClick: nativeShare },
		{
			label: "Telegram",
			icon: Send,
			tone: "bg-[#229ED9]",
			onClick: () => open(`https://t.me/share/url?url=${enc(SHARE_URL)}&text=${enc(SHARE_TEXT)}`),
		},
	];

	return (
		<div className="flex flex-wrap items-center justify-center gap-2.5">
			{items.map((it) => (
				<button
					key={it.label}
					type="button"
					onClick={it.onClick}
					aria-label={`Compartir en ${it.label}`}
					className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 active:scale-95 ${it.tone}`}
				>
					<it.icon className="h-5 w-5" />
				</button>
			))}
			<button
				type="button"
				onClick={copyLink}
				aria-label="Copiar enlace"
				className="flex h-11 w-11 items-center justify-center rounded-full border bg-background text-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
			>
				{copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
			</button>
		</div>
	);
};
