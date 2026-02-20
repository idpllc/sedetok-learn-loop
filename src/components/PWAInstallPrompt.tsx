import { useState, useEffect } from "react";
import { Share, Plus, Download, Smartphone, Zap, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import sedefyLogo from "@/assets/sedefy-logo.png";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isInstalled) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iOS);

    // Check if prompt was already shown this session
    const sessionKey = user ? `pwa-prompt-shown-${user.id}` : 'pwa-prompt-shown-guest';
    const shownThisSession = sessionStorage.getItem(sessionKey);
    if (shownThisSession) return;

    // Check if user permanently dismissed
    const permanentlyDismissed = localStorage.getItem('pwa-install-dismissed');
    if (permanentlyDismissed) return;

    // For Android/Chrome: Capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show prompt after 5 seconds
    const timer = setTimeout(() => {
      sessionStorage.setItem(sessionKey, 'true');
      setShowPrompt(true);
    }, 5000);

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
  }, [user]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          localStorage.setItem('pwa-install-dismissed', 'true');
          setShowPrompt(false);
        }
      } finally {
        setDeferredPrompt(null);
        setIsInstalling(false);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowPrompt(false);
  };

  const benefits = [
    { icon: Zap, text: "Carga instantánea" },
    { icon: WifiOff, text: "Funciona offline" },
    { icon: Smartphone, text: "Como app nativa" },
  ];

  return (
    <Dialog open={showPrompt} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-border/50">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background px-6 pt-8 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
              <img
                src={sedefyLogo}
                alt="SEDETOK"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            Instala SEDETOK
          </h2>
          <p className="text-sm text-muted-foreground">
            Aprende más rápido con la app instalada
          </p>
        </div>

        {/* Benefits */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-3 mb-5">
            {benefits.map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground leading-tight">{text}</span>
              </div>
            ))}
          </div>

          {/* Botón de instalación Android/Chrome */}
          {!isIOS && deferredPrompt && (
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              size="lg"
              className="w-full h-12 text-base font-semibold mb-3 shadow-md shadow-primary/20"
            >
              {isInstalling ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Instalando...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Instalar ahora
                </>
              )}
            </Button>
          )}

          {/* Instrucciones iOS */}
          {isIOS && (
            <div className="bg-muted/50 rounded-xl p-4 mb-3 space-y-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Para instalar en iPhone:</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">1</div>
                  <span>Toca <Share className="w-3.5 h-3.5 inline mx-0.5" /> compartir en Safari</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">2</div>
                  <span>Toca <Plus className="w-3.5 h-3.5 inline mx-0.5" /> "Añadir a inicio"</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">3</div>
                  <span>Confirma tocando "Añadir"</span>
                </div>
              </div>
            </div>
          )}

          {/* Fallback navegadores sin prompt */}
          {!isIOS && !deferredPrompt && (
            <div className="bg-muted/50 rounded-xl p-3 mb-3 text-center">
              <p className="text-xs text-muted-foreground">
                Abre el menú de tu navegador y selecciona<br />
                <strong className="text-foreground">"Instalar aplicación"</strong> o <strong className="text-foreground">"Añadir a inicio"</strong>
              </p>
            </div>
          )}

          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
