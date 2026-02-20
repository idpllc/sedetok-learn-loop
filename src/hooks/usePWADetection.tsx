import { useState, useEffect } from "react";

export type PWAState =
  | "standalone"      // Ya está corriendo como PWA instalada
  | "installed"       // Detectada como instalada (Chrome Android getInstalledRelatedApps)
  | "not-installed"   // No instalada
  | "unknown";        // iOS u otro navegador sin API

export interface PWADetectionResult {
  isStandalone: boolean;        // Corriendo en modo app (no en browser)
  isInstalled: boolean;         // PWA instalada y detectada
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  state: PWAState;
  currentPath: string;          // Ruta actual para el deep link
}

const isRunningStandalone = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
};

export const usePWADetection = (): PWADetectionResult => {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isMobile = isIOS || isAndroid;
  const currentPath = window.location.pathname + window.location.search;

  const [state, setState] = useState<PWAState>("unknown");

  useEffect(() => {
    // Si ya está en modo standalone no hay nada que hacer
    if (isRunningStandalone()) {
      setState("standalone");
      return;
    }

    // En Android Chrome intentamos detectar instalación real
    if (isAndroid && "getInstalledRelatedApps" in navigator) {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((apps: any[]) => {
          setState(apps && apps.length > 0 ? "installed" : "not-installed");
        })
        .catch(() => setState("not-installed"));
    } else {
      // iOS o navegadores sin la API
      setState("not-installed");
    }
  }, [isAndroid]);

  return {
    isStandalone: state === "standalone",
    isInstalled: state === "installed",
    isIOS,
    isAndroid,
    isMobile,
    state,
    currentPath,
  };
};
