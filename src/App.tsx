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
			<div className="min-h-screen bg-background">
				<header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
					<div className="container flex h-14 items-center justify-between">
						<Link to="/" className="font-bold tracking-tight">
							🆘 Rescate
						</Link>
						<nav className="flex items-center gap-4 text-sm">
							<Link to="/buscar" className="text-muted-foreground hover:text-foreground">
								Buscar
							</Link>
							<Link to="/ayuda" className="text-muted-foreground hover:text-foreground">
								Ayuda
							</Link>
							<Link to="/mapa" className="text-muted-foreground hover:text-foreground">
								Mapa
							</Link>
						</nav>
					</div>
				</header>
				<main className="container py-6">
					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/sos" element={<Sos />} />
						<Route path="/reportar" element={<Reportar />} />
						<Route path="/buscar" element={<Buscar />} />
						<Route path="/ayuda" element={<Ayuda />} />
						<Route path="/mapa" element={<Mapa />} />
					</Routes>
				</main>
				<footer className="border-t py-6 text-center text-xs text-muted-foreground">
					Herramienta comunitaria de emergencia. Si hay vidas en riesgo, llama también a
					los servicios de emergencia.
				</footer>
			</div>
		</Router>
	);
};
