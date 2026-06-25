import { HandHeart, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { VersesBanner } from "@/components/VersesBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPrayer, listPrayers, prayFor } from "@/lib/api";
import type { Prayer } from "@shared/types";

const timeAgo = (iso: string): string => {
	const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (s < 60) return "hace un momento";
	const m = Math.floor(s / 60);
	if (m < 60) return `hace ${m} min`;
	const h = Math.floor(m / 60);
	if (h < 24) return `hace ${h} h`;
	return `hace ${Math.floor(h / 24)} d`;
};

const prayedKey = "prayed_ids";
const getPrayed = (): number[] => {
	try {
		return JSON.parse(localStorage.getItem(prayedKey) ?? "[]");
	} catch {
		return [];
	}
};

export const Oracion = () => {
	const [prayers, setPrayers] = useState<Prayer[]>([]);
	const [name, setName] = useState("");
	const [text, setText] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [prayed, setPrayed] = useState<number[]>(getPrayed());

	const load = useCallback(async () => {
		try {
			setPrayers(await listPrayers());
		} catch {
			/* reintenta en el polling */
		}
	}, []);

	useEffect(() => {
		load();
		let id: ReturnType<typeof setInterval> | undefined = setInterval(load, 12000);
		const onVis = () => {
			if (document.hidden) {
				if (id) clearInterval(id);
				id = undefined;
			} else {
				load();
				if (!id) id = setInterval(load, 12000);
			}
		};
		document.addEventListener("visibilitychange", onVis);
		return () => {
			if (id) clearInterval(id);
			document.removeEventListener("visibilitychange", onVis);
		};
	}, [load]);

	const submit = async () => {
		if (text.trim().length < 3) {
			setError("Escribe tu mensaje.");
			return;
		}
		setError("");
		setSubmitting(true);
		try {
			const p = await createPrayer({ name: name.trim() || null, text: text.trim() });
			setPrayers((prev) => [p, ...prev]);
			setText("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "No se pudo publicar.");
		} finally {
			setSubmitting(false);
		}
	};

	const pray = async (id: number) => {
		if (prayed.includes(id)) return;
		const next = [...prayed, id];
		setPrayed(next);
		localStorage.setItem(prayedKey, JSON.stringify(next));
		setPrayers((prev) =>
			prev.map((p) => (p.id === id ? { ...p, prayCount: p.prayCount + 1 } : p)),
		);
		try {
			await prayFor(id);
		} catch {
			/* optimista; el polling corrige */
		}
	};

	return (
		<div className="mx-auto max-w-md space-y-4">
			<div className="space-y-1 text-center">
				<h1 className="flex items-center justify-center gap-2 text-xl font-bold">
					<HandHeart className="h-5 w-5 text-vzla-blue" /> Sala de oración
				</h1>
				<p className="text-sm text-muted-foreground">
					Comparte tu petición o una palabra de aliento. Oramos juntos por Venezuela 🇻🇪
				</p>
			</div>

			<VersesBanner />

			<Card>
				<CardContent className="space-y-3 p-4">
					<Input
						placeholder="Tu nombre (opcional)"
						value={name}
						maxLength={80}
						onChange={(e) => setName(e.target.value)}
					/>
					<Textarea
						placeholder="Escribe tu petición o mensaje de aliento…"
						value={text}
						maxLength={1000}
						onChange={(e) => setText(e.target.value)}
					/>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<Button className="w-full" disabled={submitting} onClick={submit}>
						{submitting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<>
								<Send className="h-4 w-4" /> Publicar
							</>
						)}
					</Button>
				</CardContent>
			</Card>

			<div className="space-y-2">
				{prayers.length === 0 && (
					<p className="py-6 text-center text-sm text-muted-foreground">
						Sé el primero en compartir una petición.
					</p>
				)}
				{prayers.map((p) => (
					<Card key={p.id}>
						<CardContent className="space-y-2 p-4">
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm font-semibold">{p.name || "Un hermano/a"}</span>
								<span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
							</div>
							<p className="whitespace-pre-wrap text-sm">{p.text}</p>
							<button
								type="button"
								onClick={() => pray(p.id)}
								disabled={prayed.includes(p.id)}
								className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
									prayed.includes(p.id)
										? "border-vzla-blue/30 bg-vzla-blue/5 text-vzla-blue"
										: "hover:bg-accent"
								}`}
							>
								🙏 {prayed.includes(p.id) ? "Oraste" : "Orar"}{" "}
								<span className="font-semibold">{p.prayCount}</span>
							</button>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
};
