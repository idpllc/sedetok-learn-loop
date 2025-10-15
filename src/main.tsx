import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
// vite-plugin-pwa genera y gestiona el service worker automáticamente
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Muestra un prompt al usuario cuando hay una nueva versión
      if (confirm('Nueva versión disponible. ¿Actualizar ahora?')) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log('App lista para funcionar offline');
    },
    onRegisteredSW(swScriptUrl) {
      console.log('Service Worker registrado:', swScriptUrl);
    },
    onRegisterError(error) {
      console.error('Error al registrar Service Worker:', error);
    }
  });
}


createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
