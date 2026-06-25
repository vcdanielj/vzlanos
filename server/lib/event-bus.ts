import { EventEmitter } from "node:events";

// Bus en proceso para difundir mensajes nuevos a los clientes SSE conectados.
// Suficiente para una sola instancia (no escala horizontalmente).
export const bus = new EventEmitter();
bus.setMaxListeners(2000);
