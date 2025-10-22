import { useState, useEffect } from "react";
import { Share, Plus, Download, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import sedefyLogo from "@/assets/sedefy-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const installed = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true;
    setIsInstalled(installed);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iOS);

    // For Android/Chrome: Capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setDeferredPrompt(bip);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Hide prompt once app is installed
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

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center">
              <img 
                src={sedefyLogo} 
                alt="Sedefy - logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold mb-3">
              Instalar SEDETOK
            </CardTitle>
            <CardDescription className="text-lg">
              Obtén la mejor experiencia de aprendizaje instalando nuestra app
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4 py-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">¡Ya está instalada!</h3>
                <p className="text-muted-foreground">
                  SEDETOK ya está instalada en tu dispositivo
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Benefits section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Beneficios de instalar:</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                    <span>Acceso rápido desde tu pantalla de inicio</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Download className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                    <span>Funciona sin conexión a internet</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                    <span>Experiencia optimizada como aplicación nativa</span>
                  </li>
                </ul>
              </div>

              {/* Install button for Android/Chrome */}
              {!isIOS && deferredPrompt && (
                <Button
                  onClick={handleInstall}
                  size="lg"
                  className="w-full h-14 text-lg font-semibold"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Instalar SEDETOK
                </Button>
              )}

              {/* Instructions for iOS */}
              {isIOS && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-semibold text-lg">Instrucciones para iOS:</h3>
                    <div className="space-y-4 text-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Share className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">1. Toca el botón de compartir</p>
                          <p className="text-xs text-muted-foreground">(ubicado en la parte inferior de Safari)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">2. Selecciona "Añadir a pantalla de inicio"</p>
                          <p className="text-xs text-muted-foreground">Busca esta opción en el menú</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">3. Confirma la instalación</p>
                          <p className="text-xs text-muted-foreground">Toca "Añadir" en la esquina superior derecha</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fallback for browsers without install prompt */}
              {!isIOS && !deferredPrompt && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center">
                      Para instalar SEDETOK, abre el menú de tu navegador y busca la opción 
                      "Instalar aplicación" o "Añadir a pantalla de inicio"
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
