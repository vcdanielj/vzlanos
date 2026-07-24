# 🚨 Rescate — Plataforma de Emergencia y Localizador de Personas

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-4.6-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.36-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

**Rescate** es una aplicación web progresiva (PWA) de respuesta rápida diseñada para emergencias sísmicas y catástrofes naturales. Permite a los ciudadanos enviar alertas SOS de un solo toque, reportar personas atrapadas, buscar a familiares no localizados, monitorear la actividad sísmica en tiempo real y coordinar labores de auxilio comunitario.

---

## 🌟 Características Principales

- 🚨 **Alerta SOS de Un Tap (`/sos`)**: Captura rápida de coordenadas GPS y generación de Plus Codes (`open-location-code`) para enviar una señal de auxilio inmediata sin formularios extensos.
- 📍 **Reporte de Atrapados (`/reportar`)**: Formulario interactivo geolocalizado para que testigos o familiares ubiquen exactamente en el mapa a personas atrapadas, indicando nivel de urgencia y cantidad de afectados.
- 🗺️ **Mapa Operativo para Rescatistas (`/mapa`)**: Panel de control interactivo para brigadas y cuerpos de socorro con clustering de marcadores, filtros por estado (*Pendiente*, *En progreso*, *Rescatado*) y autenticación rápida mediante token de rescatista.
- 🔎 **Registro y Búsqueda de Desaparecidos (`/buscar` / `/desaparecidos`)**: Publicación de reportes de personas no localizadas, geocodificación automática de la última dirección vista (mediante OpenStreetMap / Nominatim) y búsqueda pública por nombre o documento.
- 📈 **Monitoreo Sísmico en Tiempo Real (`/temblores`)**: Integración con APIs sísmicas de servicios geológicos (USGS, Funvisis) para visualización inmediata de epicentros, magnitud y profundidad.
- 📦 **Centros de Acopio y Donaciones (`/centros-acopio` / `/reunir`)**: Mapa y lista coordinada de puntos oficiales de recolección de víveres, insumos médicos y refugios temporales.
- 💬 **Chat de Respuesta Comunitaria (`/chat`)**: Sala de comunicación y coordinación en tiempo real para voluntariado y auxilio local.
- 🙏 **Muro de Apoyo y Solidaridad (`/oracion`)**: Espacio comunitario para publicar mensajes de aliento y peticiones de oración.
- ☎️ **Directorio de Ayuda Directa (`/ayuda`)**: Directorio interactivo con acceso a marcación directa a líneas de emergencia (Protección Civil, Bomberos, Cruz Roja, Policía).
- 🔄 **Interoperabilidad PFIF (`/export/pfif`)**: Exportación estandarizada en formato **PFIF** (*People Finder Interchange Format*) para sincronizar datos con la Cruz Roja, Protección Civil u organizaciones internacionales.
- 🔔 **Notificaciones Push Web**: Alertas críticas a rescatistas y ciudadanos vía Web Push API (VAPID).

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** React 18 + Vite
- **Lenguaje:** TypeScript
- **Estilos & Componentes:** Tailwind CSS + Radix UI / shadcn/ui + Lucide Icons
- **Mapas:** Leaflet + React-Leaflet + Leaflet MarkerCluster
- **Geocodificación:** Plus Codes (`open-location-code`) + OpenStreetMap / Nominatim

### Backend & Base de Datos
- **Servidor Web & API:** Hono (servidor unificado servible sobre Node.js)
- **ORM & Migraciones:** Drizzle ORM + Drizzle Kit
- **Base de Datos:** PostgreSQL
- **Validación de Esquemas:** Zod
- **Alertas Push:** `web-push`

---

## 🚀 Inicio Rápido en Desarrollo

### Prerrequisitos
- **Node.js** v18+ y `npm`
- **PostgreSQL** corriendo localmente o mediante contenedor Docker

### 1. Clonar e Instalar Dependencias
```bash
git clone https://github.com/vcdanielj/vzlanos.git
cd vzlanos
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo `.env.example` a `.env`:
```bash
cp .env.example .env
```

Ajusta los valores en `.env`:
```env
DATABASE_URL=postgres://emergencia:emergencia@localhost:5432/emergencia
RESCUER_TOKEN=mi-token-secreto-rescatista
PORT=3000
NOMINATIM_EMAIL=contacto@tu-dominio.com
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contacto@tu-dominio.com
```

> **Nota:** Para generar las claves VAPID para notificaciones Web Push, ejecuta:
> `npx web-push generate-vapid-keys`

### 3. Crear Tablas en la Base de Datos
Ejecuta la migración de esquemas con Drizzle Kit:
```bash
npm run db:push
```

### 4. Iniciar el Entorno de Desarrollo
```bash
npm run dev
```
Este comando ejecutará en paralelo:
- **Frontend (Vite):** `http://localhost:5173`
- **Backend API (Hono):** `http://localhost:3000` (con proxy `/api` integrado desde Vite)

---

## 🐳 Despliegue en Producción

### Opción 1: Docker / Docker Compose
El proyecto incluye la configuración para Docker:

```bash
docker compose up -d --build
```

### Opción 2: Coolify / VPS
1. Conecta este repositorio en Coolify como servicio Dockerfile.
2. Configura las variables de entorno en el panel (`DATABASE_URL`, `RESCUER_TOKEN`, `NOMINATIM_EMAIL`, `PORT`).
3. Asigna un dominio con **HTTPS** (necesario para el acceso al GPS del navegador y funcionamiento de PWA).
4. Ejecuta `npm run db:push` una vez contra la base de datos de producción para generar las tablas.

### Opción 3: Build Manual con Node.js
```bash
npm run build
npm run start
```

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia [MIT](LICENSE).

---

> ⚠️ **Importante:** Antes de desplegar o difundir en producción, verifica y actualiza los números telefónicos de emergencia en `src/pages/Ayuda.tsx` según el país o región donde se utilice.

