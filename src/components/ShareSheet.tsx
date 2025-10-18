import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Share2, Link2, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ShareSheetProps {
  contentId: string;
  contentTitle: string;
  isQuiz?: boolean;
  sharesCount?: number;
}

export const ShareSheet = ({ contentId, contentTitle, isQuiz, sharesCount = 0 }: ShareSheetProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const paramName = isQuiz ? 'quiz' : 'content';
  const shareUrl = `${window.location.origin}/?${paramName}=${contentId}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(contentTitle);

  const incrementShareCount = async () => {
    if (isQuiz) {
      // Para quizzes, simplemente llamamos la función sin incrementar en la DB
      await supabase.rpc('increment_shares_count', { quiz_id: contentId });
    } else {
      await supabase.rpc('increment_shares_count', { content_id: contentId });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      await incrementShareCount();
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace ha sido copiado al portapapeles",
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

  const handleWhatsAppShare = async () => {
    await incrementShareCount();
    const whatsappUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    window.open(whatsappUrl, '_blank');
    setOpen(false);
  };

  const handleFacebookShare = async () => {
    await incrementShareCount();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex flex-col items-center gap-1 transition-all hover:scale-110">
          <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white">
            <Share2 className="w-5 h-5 text-black" />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-lg">{sharesCount}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Compartir Contenido</SheetTitle>
          <SheetDescription>
            Comparte "{contentTitle}" con tus amigos
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-6">
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
      </SheetContent>
    </Sheet>
  );
};
