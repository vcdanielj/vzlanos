import { BookOpenText } from "lucide-react";
import { useEffect, useState } from "react";

// Versículos de consuelo y esperanza para acompañar a quienes usan la app.
const VERSES: { text: string; ref: string }[] = [
	{
		text: "Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu.",
		ref: "Salmos 34:18",
	},
	{
		text: "Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.",
		ref: "Salmos 46:1",
	},
	{
		text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo.",
		ref: "Isaías 41:10",
	},
	{
		text: "Él sana a los quebrantados de corazón, y venda sus heridas.",
		ref: "Salmos 147:3",
	},
	{
		text: "Aunque ande en valle de sombra de muerte, no temeré mal alguno, porque tú estarás conmigo.",
		ref: "Salmos 23:4",
	},
	{
		text: "Bienaventurados los que lloran, porque ellos recibirán consolación.",
		ref: "Mateo 5:4",
	},
	{
		text: "Esfuérzate y sé valiente; porque Jehová tu Dios estará contigo dondequiera que vayas.",
		ref: "Josué 1:9",
	},
	{
		text: "Alzaré mis ojos a los montes; mi socorro viene de Jehová, que hizo los cielos y la tierra.",
		ref: "Salmos 121:1-2",
	},
];

export const VersesBanner = () => {
	const [i, setI] = useState(0);
	useEffect(() => {
		const id = setInterval(() => setI((p) => (p + 1) % VERSES.length), 8000);
		return () => clearInterval(id);
	}, []);
	const v = VERSES[i];
	return (
		<div
			className="rounded-xl border border-vzla-blue/15 bg-vzla-blue/5 px-4 py-3"
			aria-live="polite"
		>
			<div className="flex items-start gap-2.5">
				<BookOpenText className="mt-0.5 h-4 w-4 shrink-0 text-vzla-blue" />
				<p className="text-sm italic text-foreground/80">
					“{v.text}” <span className="font-semibold not-italic text-vzla-blue">— {v.ref}</span>
				</p>
			</div>
		</div>
	);
};
