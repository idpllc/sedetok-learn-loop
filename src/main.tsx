import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import Clarity from '@microsoft/clarity';

// Initialize Microsoft Clarity
Clarity.init('wdsodbxujo');

// Register Service Worker for PWA
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
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

const root = createRoot(document.getElementById("root")!);
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
root.render(app);
