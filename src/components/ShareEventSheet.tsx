import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Share2, Link2, Check, QrCode } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";

interface ShareEventSheetProps {
  accessCode: string;
  eventTitle: string;
  eventType: "quiz" | "game";
  trigger?: React.ReactNode;
}

export const ShareEventSheet = ({ accessCode, eventTitle, eventType, trigger }: ShareEventSheetProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = eventType === "quiz" 
    ? `${window.location.origin}/quiz-evaluation/${accessCode}`
    : `${window.location.origin}/game-evaluation?code=${accessCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace del evento ha sido copiado al portapapeles",
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
    const message = `¡Participa en este evento de evaluación! 📝\n\n${eventTitle}\nCódigo: ${accessCode}\n\n${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setOpen(false);
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Compartir Evento de Evaluación</SheetTitle>
          <SheetDescription>
            Comparte "{eventTitle}" con tus estudiantes
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Código de acceso:</p>
            <p className="text-2xl font-bold font-mono tracking-wider">{accessCode}</p>
          </div>

          <Button
            variant="outline"
            className="w-full h-14 text-left justify-start gap-3"
            onClick={handleCopyLink}
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
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium text-center">Escanea para acceder:</p>
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCode value={shareUrl} size={180} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
