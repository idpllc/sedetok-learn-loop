import { useState, useEffect } from "react";
import { Share, Plus, Download, Smartphone, Check, Zap, WifiOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import sedefyLogo from "@/assets/sedefy-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const installed = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(installed);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } finally {
      setIsInstalling(false);
    }
  };

  const benefits = [
    {
      icon: Zap,
      title: "Carga instantánea",
      desc: "Abre la app en menos de un segundo desde tu pantalla de inicio"
    },
    {
      icon: WifiOff,
      title: "Funciona offline",
      desc: "Accede a tu contenido guardado sin conexión a internet"
    },
    {
      icon: Smartphone,
      title: "Experiencia nativa",
      desc: "Pantalla completa sin barras del navegador"
    },
    {
      icon: Bell,
      title: "Notificaciones",
      desc: "Recibe alertas de nuevos contenidos y resultados"
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Hero */}
      <div className="w-full max-w-sm text-center mb-8">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30">
              <img
                src={sedefyLogo}
                alt="SEDETOK"
                className="w-18 h-18 object-contain"
                style={{ width: '4.5rem', height: '4.5rem' }}
              />
            </div>
            {isInstalled && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isInstalled ? '¡Ya está instalada!' : 'Instala SEDETOK'}
        </h1>
        <p className="text-muted-foreground">
          {isInstalled
            ? 'SEDETOK ya está en tu pantalla de inicio. ¡A aprender!'
            : 'La mejor plataforma educativa, ahora como app en tu dispositivo'}
        </p>
      </div>

      {isInstalled ? (
        /* Estado instalado */
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-green-500 font-semibold">Instalación completa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Busca el icono de SEDETOK en tu pantalla de inicio
            </p>
          </div>
          <Button
            onClick={() => window.location.href = '/'}
            size="lg"
            className="w-full h-12 font-semibold"
          >
            Ir a SEDETOK
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-4">
          {/* Botón de instalación principal */}
          {!isIOS && deferredPrompt && (
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              size="lg"
              className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/25"
            >
              {isInstalling ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Instalando...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Instalar SEDETOK gratis
                </>
              )}
            </Button>
          )}

          {/* Instrucciones iOS */}
          {isIOS && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <p className="font-semibold text-foreground text-center">Cómo instalar en iPhone / iPad</p>
              <div className="space-y-3">
                {[
                  { num: 1, icon: Share, text: 'Toca el botón de Compartir', sub: 'En la barra inferior de Safari' },
                  { num: 2, icon: Plus, text: '"Añadir a pantalla de inicio"', sub: 'Desplázate abajo en el menú' },
                  { num: 3, icon: Check, text: 'Confirma tocando "Añadir"', sub: 'Esquina superior derecha' },
                ].map(({ num, icon: Icon, text, sub }) => (
                  <div key={num} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{num}</span>
                    </div>
                    <div className="flex items-start gap-2 flex-1">
                      <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{text}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback sin prompt */}
          {!isIOS && !deferredPrompt && (
            <div className="bg-card border border-border rounded-2xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Para instalar SEDETOK, abre el menú de tu navegador
              </p>
              <p className="text-sm font-medium text-foreground">
                y selecciona "Instalar aplicación" o "Añadir a pantalla de inicio"
              </p>
            </div>
          )}

          {/* Beneficios */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-card border border-border/50 rounded-xl p-4 space-y-2"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Gratuita · Sin publicidad · Segura
          </p>
        </div>
      )}
    </div>
  );
};

export default Install;
