import { useState, useEffect } from "react";
import { Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import sedefyLogo from "@/assets/sedefy-logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
    
    if (isInstalled) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iOS);

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    // For Android/Chrome: Capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setDeferredPrompt(bip);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS or fallback: show prompt after 10s
    const timer = setTimeout(() => {
      if (!isInstalled && !dismissed) {
        setShowPrompt(true);
      }
    }, 10000);

    // Hide prompt once app is installed
    const installedHandler = () => {
      localStorage.setItem('pwa-install-dismissed', 'true');
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      localStorage.setItem('pwa-install-dismissed', 'true');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowPrompt(false);
  };

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center gap-6 py-4">
          {/* Logo */}
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center">
            <img 
              src={sedefyLogo} 
              alt="Sedefy - logo" 
              className="w-12 h-12 object-contain"
            />
          </div>

          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold">
              Obtén la experiencia completa
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Disfruta más contenido educativo y funciones increíbles en la app
            </DialogDescription>
          </DialogHeader>

          <div className="w-full space-y-3">
            {/* Install button for Android/Chrome */}
            {!isIOS && deferredPrompt && (
              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full h-12 text-base font-semibold"
              >
                Abrir SEDETOK
              </Button>
            )}

            {/* Instructions for iOS */}
            {isIOS && (
              <div className="space-y-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Para instalar en iOS:</p>
                <div className="flex items-start gap-3 text-left">
                  <Share className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>1. Toca el botón de compartir</p>
                    <p className="text-xs opacity-75">(abajo en Safari)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-left">
                  <Plus className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>2. Selecciona "Añadir a pantalla de inicio"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Not now button */}
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="lg"
              className="w-full h-12 text-base"
            >
              Ahora no
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
