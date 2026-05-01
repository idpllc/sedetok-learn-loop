import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Initialize Microsoft Clarity (script tag injection to avoid React duplication)
(function(c: any, l: Document, a: string, r: string, i: string) {
  c[a] = c[a] || function (...args: any[]) { (c[a].q = c[a].q || []).push(args); };
  const t = l.createElement(r) as HTMLScriptElement;
  t.async = true;
  t.src = "https://www.clarity.ms/tag/" + i;
  const y = l.getElementsByTagName(r)[0];
  y.parentNode?.insertBefore(t, y);
})(window, document, "clarity", "script", "wdsodbxujo");

// Register Service Worker for PWA
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Auto-actualizar para que los usuarios siempre vean la última versión
      console.log('[PWA] Nueva versión detectada, actualizando...');
      updateSW(true);
    },
    onOfflineReady() {
      console.log('App lista para funcionar offline');
    },
    onRegisteredSW(swScriptUrl, registration) {
      console.log('Service Worker registrado:', swScriptUrl);
      // Buscar actualizaciones cada 60s mientras la app está abierta
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Error al registrar Service Worker:', error);
    },
  });
}

const root = createRoot(document.getElementById("root")!);
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
root.render(app);
