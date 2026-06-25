import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Link,
	Navigate,
	Route,
	BrowserRouter as Router,
	Routes,
} from "react-router-dom";
import { flushQueue, pendingCount } from "./lib/api";
import { Ayuda } from "./pages/Ayuda";
import { Buscar } from "./pages/Buscar";
import { Compartir } from "./pages/Compartir";
import { Home } from "./pages/Home";
import { Mapa } from "./pages/Mapa";
import { Reportar } from "./pages/Reportar";

export const App = () => {
	const [pending, setPending] = useState(pendingCount());

	// Al recuperar conexión, reintentar los reportes encolados offline y refrescar
	// el contador de pendientes (que se muestra como banner mientras haya cola).
	useEffect(() => {
		const refresh = async () => {
			await flushQueue();
			setPending(pendingCount());
		};
		const tick = () => setPending(pendingCount());
		window.addEventListener("online", refresh);
		refresh();
		const id = setInterval(tick, 5000);
		return () => {
			window.removeEventListener("online", refresh);
			clearInterval(id);
		};
	}, []);

	return (
		<Router>
			<div className="flex min-h-screen flex-col bg-background">
				<header className="safe-top sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
					{/* Tricolor de la bandera de Venezuela */}
					<div className="flex h-1 w-full">
						<div className="flex-1 bg-vzla-yellow" />
						<div className="flex-1 bg-vzla-blue" />
						<div className="flex-1 bg-vzla-red" />
					</div>
					<div className="container flex h-14 items-center justify-between gap-2">
						<Link to="/" className="flex shrink-0 items-center gap-2">
							<img
								src="/flag.svg"
								alt="Venezuela"
								className="h-5 w-[30px] rounded-sm shadow-sm ring-1 ring-black/10"
							/>
							<span className="text-lg font-bold tracking-tight">vzlanos</span>
						</Link>
						<div className="flex items-center gap-2 md:gap-4">
							<nav className="flex items-center gap-2 text-xs md:gap-4 md:text-sm">
								<Link
									to="/buscar"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									Buscar
								</Link>
								<Link
									to="/ayuda"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									Ayuda
								</Link>
								<Link
									to="/mapa"
									className="text-muted-foreground transition-colors hover:text-foreground"
								>
									Mapa
								</Link>
							</nav>
							<Link
								to="/reportar"
								className="inline-flex h-9 items-center gap-1.5 rounded-full bg-destructive px-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
								aria-label="Reportar personas atrapadas"
							>
								<MapPin className="h-4 w-4" /> Reportar
							</Link>
						</div>
					</div>
				</header>
				{pending > 0 && (
					<div
						role="status"
						aria-live="polite"
						className="bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white"
					>
						{pending} reporte{pending > 1 ? "s" : ""} pendiente
						{pending > 1 ? "s" : ""} de enviar — se reintentará al volver la conexión.
					</div>
				)}
				<main className="container flex w-full flex-1 flex-col py-6">
					<Routes>
						<Route path="/" element={<Home />} />
						{/* /sos se fusionó en /reportar: redirigir enlaces viejos. */}
						<Route path="/sos" element={<Navigate to="/reportar" replace />} />
						<Route path="/reportar" element={<Reportar />} />
						<Route path="/compartir" element={<Compartir />} />
						<Route path="/buscar" element={<Buscar />} />
						<Route path="/ayuda" element={<Ayuda />} />
						<Route path="/mapa" element={<Mapa />} />
					</Routes>
				</main>
				<footer className="safe-bottom border-t py-6 text-center text-xs text-muted-foreground">
					<div className="container space-y-2">
						<p className="font-medium text-foreground/80">
							Hecho con <span className="text-vzla-red">❤</span> por venezolanos, para
							venezolanos 🇻🇪
						</p>
						<p>
							Herramienta comunitaria de emergencia. Si hay vidas en riesgo, llama también a
							los servicios de emergencia.
						</p>
						<p className="text-[10px] text-muted-foreground/50">
							powered by{" "}
							<a
								href="https://arizon.ai"
								target="_blank"
								rel="noreferrer"
								className="underline-offset-2 hover:underline"
							>
								arizon.ai
							</a>
						</p>
					</div>
				</footer>
			</div>
		</Router>
	);
};
