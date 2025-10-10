import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
    
    if (isInstalled) return;

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    // Capture the beforeinstallprompt event and show prompt soon after
    const handler = (e: Event) => {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setDeferredPrompt(bip);
      // Surface the prompt shortly after the event fires
      setTimeout(() => setShowPrompt(true), 1000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Fallback: show prompt after 10s even if the event hasn't fired (will show tips)
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

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 md:left-auto md:right-4 md:max-w-md">
      <Card className="relative p-4 shadow-lg border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="flex items-start gap-3 pr-8">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Download className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              Instalar SEDETOK
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Instala la app para una mejor experiencia y acceso rápido desde tu dispositivo.
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={deferredPrompt ? handleInstall : undefined}
                size="sm"
                className="flex-1"
                disabled={!deferredPrompt}
              >
                Instalar
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
              >
                Ahora no
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
