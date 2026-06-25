# Rescate — Localizador de personas atrapadas

App web de emergencia para localizar personas atrapadas tras un terremoto. Permite:

- **SOS** (`/sos`): una persona atrapada envía su ubicación GPS de un toque.
- **Reportar** (`/reportar`): terceros marcan en el mapa dónde hay atrapados.
- **Buscar familiar** (`/buscar`): familiares en el exterior reportan a un desaparecido
  (geocodificando su última dirección) y siguen su estado por nombre.
- **Ayuda** (`/ayuda`): directorio de contactos de emergencia.
- **Mapa de rescate** (`/mapa`): los rescatistas ven todo en un mapa y marcan estados
  (en progreso / rescatado). Requiere un token de rescatista.

Export **PFIF** en `/export/pfif` para interoperar con Protección Civil / Cruz Roja.

## Stack

React + Vite + Tailwind + shadcn/ui + Leaflet (frontend) · Hono + Drizzle + Postgres (backend).
Un solo servicio: el server Hono sirve la API y el build de Vite.

## Desarrollo

```bash
npm install
cp .env.example .env        # ajustar DATABASE_URL y RESCUER_TOKEN
npm run db:push             # crear tablas
npm run dev                 # web :5173 (proxy /api → :3000), api :3000
```

## Producción

`npm run build && npm run start`, o vía Docker:

```bash
docker compose up --build
```

En Coolify: app desde este repo (Dockerfile), variables `DATABASE_URL`, `RESCUER_TOKEN`,
`NOMINATIM_EMAIL`, y un dominio con HTTPS (necesario para GPS y PWA). Correr `npm run db:push`
una vez contra la DB de prod para crear las tablas.

> ⚠️ Verificar los teléfonos de `/ayuda` (src/pages/Ayuda.tsx) según el país antes de difundir.
