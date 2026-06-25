import { Loader2, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { listChat, openChatStream, sendChat } from "@/lib/api";
import type { ChatMessage } from "@shared/types";

const NAME_KEY = "chat_name";

const timeShort = (iso: string) => {
	const d = new Date(iso);
	return d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
};

export const Chat = () => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
	const [text, setText] = useState("");
	const [sending, setSending] = useState(false);
	const [error, setError] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	};

	useEffect(() => {
		let active = true;
		listChat()
			.then((m) => {
				if (active) {
					setMessages(m);
					setTimeout(scrollToBottom, 50);
				}
			})
			.catch(() => {});
		const close = openChatStream((m) => {
			setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
		});
		return () => {
			active = false;
			close();
		};
	}, []);

	// Auto-scroll al recibir mensajes nuevos.
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
		if (nearBottom) scrollToBottom();
	}, [messages]);

	const send = async () => {
		const t = text.trim();
		if (!t) return;
		setError("");
		setSending(true);
		try {
			if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
			const msg = await sendChat({ name: name.trim() || null, text: t });
			setText("");
			setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
			setTimeout(scrollToBottom, 30);
		} catch (e) {
			setError(e instanceof Error ? e.message : "No se pudo enviar.");
		} finally {
			setSending(false);
		}
	};

	const myName = name.trim().toLowerCase();

	return (
		<div className="mx-auto flex h-[calc(100dvh-9rem)] max-w-md flex-col">
			<div className="flex items-center justify-center gap-2 pb-2">
				<h1 className="flex items-center gap-2 text-lg font-bold">
					<MessageCircle className="h-5 w-5 text-vzla-blue" /> Chat en vivo
				</h1>
				<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
					<span className="relative flex h-2 w-2">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
						<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
					</span>
					En vivo
				</span>
			</div>

			<div
				ref={scrollRef}
				className="flex-1 space-y-2 overflow-y-auto rounded-xl border bg-muted/20 p-3"
			>
				{messages.length === 0 && (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Sé el primero en escribir. Anímense unos a otros 🇻🇪
					</p>
				)}
				{messages.map((m) => {
					const mine = !!myName && m.name?.trim().toLowerCase() === myName;
					return (
						<div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
							<div
								className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
									mine
										? "bg-vzla-blue text-white"
										: "border bg-background text-foreground"
								}`}
							>
								<div className="flex items-baseline gap-2">
									<span className={`text-xs font-semibold ${mine ? "text-white/90" : "text-vzla-blue"}`}>
										{m.name || "Anónimo"}
									</span>
									<span className={`text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>
										{timeShort(m.createdAt)}
									</span>
								</div>
								<p className="whitespace-pre-wrap break-words">{m.text}</p>
							</div>
						</div>
					);
				})}
			</div>

			{error && <p className="pt-1 text-center text-xs text-destructive">{error}</p>}

			<div className="safe-bottom space-y-2 pt-2">
				<Input
					placeholder="Tu nombre (opcional)"
					value={name}
					maxLength={40}
					onChange={(e) => setName(e.target.value)}
					className="h-9 text-sm"
				/>
				<div className="flex gap-2">
					<Input
						placeholder="Escribe un mensaje…"
						value={text}
						maxLength={500}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								send();
							}
						}}
						enterKeyHint="send"
					/>
					<button
						type="button"
						onClick={send}
						disabled={sending || !text.trim()}
						aria-label="Enviar"
						className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-vzla-blue text-white disabled:opacity-50"
					>
						{sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
					</button>
				</div>
			</div>
		</div>
	);
};
