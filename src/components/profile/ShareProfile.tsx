import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Linkedin, Facebook, Twitter } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

interface ShareProfileProps {
  profile: any;
}

export const ShareProfile = ({ profile }: ShareProfileProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!profile) {
    return null;
  }

  const profileUrl = profile.custom_url 
    ? `${window.location.origin}/u/${profile.custom_url}`
    : `${window.location.origin}/profile/${profile.id}`;

  const shareText = `¡Mira mi perfil profesional en SEDETOK! ${profile.full_name || profile.username}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({ title: "¡Enlace copiado!" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ 
        title: "Error al copiar", 
        variant: "destructive" 
      });
    }
  };

  const shareToNetwork = (network: string) => {
    let shareUrl = "";
    
    switch (network) {
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + profileUrl)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Compartir Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            value={profileUrl} 
            readOnly 
            className="flex-1"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Compartir en:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => shareToNetwork("linkedin")}
              className="justify-start"
            >
              <Linkedin className="w-4 h-4 mr-2 text-blue-600" />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => shareToNetwork("facebook")}
              className="justify-start"
            >
              <Facebook className="w-4 h-4 mr-2 text-blue-500" />
              Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => shareToNetwork("twitter")}
              className="justify-start"
            >
              <Twitter className="w-4 h-4 mr-2 text-sky-500" />
              Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => shareToNetwork("whatsapp")}
              className="justify-start"
            >
              <SiWhatsapp className="w-4 h-4 mr-2 text-green-600" />
              WhatsApp
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            🔍 <strong>{profile.profile_views || 0}</strong> personas han visitado tu perfil
          </p>
        </div>
      </CardContent>
    </Card>
  );
};