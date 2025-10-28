import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Share2, Link2, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";

interface SharePathSheetProps {
  pathId: string;
  pathTitle: string;
  isPublic: boolean;
  trigger?: React.ReactNode;
}

export const SharePathSheet = ({ pathId, pathTitle, isPublic, trigger }: SharePathSheetProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = `${window.location.origin}/?path=${pathId}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(`🎓 ${pathTitle}`);

  const handleCopyLink = async () => {
    if (!isPublic) {
      toast({
        title: "Ruta privada",
        description: "Solo puedes compartir rutas públicas",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace de la ruta ha sido copiado al portapapeles",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    if (!isPublic) {
      toast({
        title: "Ruta privada",
        description: "Solo puedes compartir rutas públicas",
        variant: "destructive",
      });
      return;
    }

    const message = `¡Mira esta ruta de aprendizaje! 📚\n\n${pathTitle}\n\n${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setOpen(false);
  };

  const handleFacebookShare = () => {
    if (!isPublic) {
      toast({
        title: "Ruta privada",
        description: "Solo puedes compartir rutas públicas",
        variant: "destructive",
      });
      return;
    }

    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" className="rounded-full">
            <Share2 className="w-5 h-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Compartir Ruta de Aprendizaje</SheetTitle>
          <SheetDescription>
            {isPublic 
              ? `Comparte "${pathTitle}" con tus amigos` 
              : "Esta ruta es privada. Solo puedes compartir rutas públicas."}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-6">
          <Button
            variant="outline"
            className="w-full h-14 text-left justify-start gap-3"
            onClick={handleCopyLink}
            disabled={!isPublic}
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Link2 className="w-5 h-5" />
            )}
            <div>
              <div className="font-semibold">Copiar enlace</div>
              <div className="text-xs text-muted-foreground">
                Copia el enlace al portapapeles
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-14 text-left justify-start gap-3"
            onClick={handleWhatsAppShare}
            disabled={!isPublic}
          >
            <div className="w-5 h-5 text-green-600">💬</div>
            <div>
              <div className="font-semibold">WhatsApp</div>
              <div className="text-xs text-muted-foreground">
                Compartir por WhatsApp
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-14 text-left justify-start gap-3"
            onClick={handleFacebookShare}
            disabled={!isPublic}
          >
            <div className="w-5 h-5 text-blue-600">📘</div>
            <div>
              <div className="font-semibold">Facebook</div>
              <div className="text-xs text-muted-foreground">
                Compartir en Facebook
              </div>
            </div>
          </Button>
        </div>

        {/* QR Code Section */}
        {isPublic && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium text-center">Escanea para compartir:</p>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCode value={shareUrl} size={180} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
