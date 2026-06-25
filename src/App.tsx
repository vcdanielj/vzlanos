import { Siren } from "lucide-react";
import { useEffect } from "react";
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { flushQueue } from "./lib/api";
import { Ayuda } from "./pages/Ayuda";
import { Buscar } from "./pages/Buscar";
import { Home } from "./pages/Home";
import { Mapa } from "./pages/Mapa";
import { Reportar } from "./pages/Reportar";
import { Sos } from "./pages/Sos";

export const App = () => {
	// Al recuperar conexión, reintentar los reportes encolados offline.
	useEffect(() => {
		const onOnline = () => {
			flushQueue();
		};
		window.addEventListener("online", onOnline);
		flushQueue();
		return () => window.removeEventListener("online", onOnline);
	}, []);

	return (
		<Router>
			<div className="flex min-h-screen flex-col bg-background">
				<header className="safe-top sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
					<div className="container flex h-14 items-center justify-between gap-2">
						<Link to="/" className="flex shrink-0 items-baseline gap-1.5">
							<span className="text-lg font-bold tracking-tight">vzlanos</span>
							<span className="hidden text-xs text-muted-foreground sm:inline">Rescate</span>
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
								to="/sos"
								className="inline-flex h-9 items-center gap-1.5 rounded-full bg-destructive px-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
								aria-label="Pedir ayuda SOS"
							>
								<Siren className="h-4 w-4" /> SOS
							</Link>
						</div>
					</div>
				</header>
				<main className="container flex w-full flex-1 flex-col py-6">
					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/sos" element={<Sos />} />
						<Route path="/reportar" element={<Reportar />} />
						<Route path="/buscar" element={<Buscar />} />
						<Route path="/ayuda" element={<Ayuda />} />
						<Route path="/mapa" element={<Mapa />} />
					</Routes>
				</main>
				<footer className="safe-bottom border-t py-6 text-center text-xs text-muted-foreground">
					<div className="container">
						Herramienta comunitaria de emergencia. Si hay vidas en riesgo, llama también a
						los servicios de emergencia.
					</div>
				</footer>
			</div>
		</Router>
	);
};
