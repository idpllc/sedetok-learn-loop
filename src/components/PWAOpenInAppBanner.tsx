import { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";
import { usePWADetection } from "@/hooks/usePWADetection";

const DISMISSED_KEY = "pwa-banner-dismissed-v1";

/**
 * Muestra un banner en móvil cuando la PWA está instalada (Android) o
 * cuando se está en iOS (sugiriendo abrir desde la app).
 *
 * En Android con PWA instalada, el botón "Abrir en la app" abre la misma
 * URL → el SO intercepta y lanza la PWA en esa ruta.
 *
 * En iOS no hay API de detección; el banner aparece siempre en móvil
 * (excepto cuando ya se está en standalone).
 */
export const PWAOpenInAppBanner = () => {
  const { isStandalone, isInstalled, isIOS, isMobile, state } = usePWADetection();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // No mostrar si: ya es standalone, no es móvil, o fue descartado recientemente
    if (isStandalone || !isMobile) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Esperar a que se resuelva la detección
    if (state === "unknown") return;

    // Mostrar: si instalada (Android) o si iOS (sugerencia)
    if (isInstalled || isIOS) {
      setVisible(true);
    }
  }, [state, isStandalone, isInstalled, isIOS, isMobile]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  const openInApp = () => {
    // Misma URL actual → el OS Android la intercepta y abre la PWA
    const currentUrl = window.location.href;
    window.location.href = currentUrl;
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] safe-area-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-3 mb-3 rounded-2xl bg-card border border-border shadow-2xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {isIOS ? (
            <>
              <p className="text-sm font-semibold text-foreground leading-tight">
                Abre SEDETOK como app
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Toca <span className="font-medium">Compartir →</span>{" "}
                "Añadir a inicio" para abrir sin navegador
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground leading-tight">
                Tienes SEDETOK instalado
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Abre directamente en la app
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isIOS && (
            <button
              onClick={openInApp}
              className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              Abrir
            </button>
          )}
          <button
            onClick={dismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
