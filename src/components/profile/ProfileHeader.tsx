import { Camera, MapPin, Calendar, Mail, Phone, Share2, Linkedin, Instagram, Facebook, Twitter, Github, Copy, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";
import { FaTiktok } from "react-icons/fa";
import { SiWhatsapp } from "react-icons/si";
import { RequestVerification } from "@/components/profile/RequestVerification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProfileHeaderProps {
  profile: any;
  isOwnProfile: boolean;
  onUpdateCover?: (url: string) => void;
  onUpdateAvatar?: (url: string) => void;
}

export const ProfileHeader = ({ profile, isOwnProfile, onUpdateCover, onUpdateAvatar }: ProfileHeaderProps) => {
  const { uploadFile, uploading } = useCloudinary();
  const { toast } = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "image");
      if (url && onUpdateCover) {
        await onUpdateCover(url);
        toast({ title: "Portada actualizada correctamente" });
      }
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast({ 
        title: "Error al subir portada", 
        description: error instanceof Error ? error.message : "Intenta de nuevo",
        variant: "destructive" 
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "image");
      if (url && onUpdateAvatar) {
        await onUpdateAvatar(url);
        toast({ title: "Foto de perfil actualizada correctamente" });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({ 
        title: "Error al subir foto", 
        description: error instanceof Error ? error.message : "Intenta de nuevo",
        variant: "destructive" 
      });
    }
  };

  const getInitials = () => {
    const name = profile?.full_name || profile?.username || "U";
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const age = profile?.fecha_nacimiento 
    ? new Date().getFullYear() - new Date(profile.fecha_nacimiento).getFullYear()
    : null;

  const socialLinks = profile?.social_links || {};
  const hasSocialLinks = Object.values(socialLinks).some(link => link);

  // Generar URL del perfil
  const appDomain = window.location.origin;
  const profileUrl = profile?.custom_url 
    ? `${appDomain}/u/${profile.custom_url}`
    : `${appDomain}/profile/${profile?.id}`;
  
  const shareText = `¡Mira mi perfil profesional en SEDETOK! ${profile?.full_name || profile?.username}`;

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
    <div className="relative">
      {/* Portada */}
      <div className="relative h-32 md:h-48 bg-gradient-to-r from-primary to-secondary rounded-t-lg overflow-hidden">
        {profile?.cover_image_url && (
          <img 
            src={profile.cover_image_url} 
            alt="Portada" 
            className="w-full h-full object-cover"
          />
        )}
        {isOwnProfile && (
          <div className="absolute top-2 right-2 md:top-4 md:right-4">
            <Button variant="secondary" size="sm" disabled={uploading} onClick={() => coverInputRef.current?.click()}>
              <Camera className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
              <span className="hidden md:inline">{uploading ? "Subiendo..." : "Cambiar portada"}</span>
            </Button>
            <input
              ref={coverInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleCoverUpload}
              disabled={uploading}
            />
          </div>
        )}
      </div>

      {/* Información del perfil */}
      <div className="px-3 pb-3 md:px-6 md:pb-6">
        {/* Avatar y acciones */}
        <div className="flex items-start gap-2 md:gap-4 -mt-10 md:-mt-16 mb-2 md:mb-4">
          <div className="relative">
            <Avatar className="w-20 h-20 md:w-32 md:h-32 border-2 md:border-4 border-background">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-lg md:text-2xl">{getInitials()}</AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2">
                <Button size="icon" variant="secondary" className="rounded-full shadow-lg h-7 w-7 md:h-10 md:w-10" disabled={uploading} onClick={() => avatarInputRef.current?.click()}>
                  <Camera className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
            )}
          </div>

          {/* Redes sociales y compartir */}
          <div className="flex items-center gap-1 md:gap-2 mt-auto">
            {hasSocialLinks && (
              <div className="flex items-center gap-0.5 md:gap-1">
                {socialLinks.linkedin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" asChild>
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.instagram && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" asChild>
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                      <Instagram className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.facebook && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" asChild>
                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                      <Facebook className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.twitter && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" asChild>
                    <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                      <Twitter className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.tiktok && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" asChild>
                    <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer">
                      <FaTiktok className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.github && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" asChild>
                    <a href={socialLinks.github} target="_blank" rel="noopener noreferrer">
                      <Github className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </a>
                  </Button>
                )}
              </div>
            )}
            
            {/* Modal de compartir */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" title="Compartir perfil">
                  <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Compartir Perfil
                  </DialogTitle>
                  <DialogDescription>
                    Comparte tu perfil profesional en redes sociales
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* URL con botón de copiar */}
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

                  {/* Compartir en redes sociales */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Compartir en:</p>
                    <div className="grid grid-cols-2 gap-2">
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

                  {/* Estadísticas de visitas */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      🔍 <strong>{profile?.profile_views || 0}</strong> personas han visitado tu perfil
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Nombre y título */}
        <div className="space-y-1 md:space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-xl md:text-3xl font-bold">{profile?.full_name || profile?.username}</h1>
              {profile?.bio && (
                <p className="text-sm md:text-base text-muted-foreground mt-0.5 md:mt-1">{profile.bio}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isOwnProfile && (
                <RequestVerification isVerified={profile?.is_verified || false} />
              )}
              {!isOwnProfile && profile?.is_verified && (
                <Badge variant="default" className="text-xs">
                  ✓ Verificado
                </Badge>
              )}
            </div>
          </div>

          {/* Información básica */}
          <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
            {profile?.institution && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                <span className="line-clamp-1">{profile.institution}</span>
              </div>
            )}
            {(profile?.pais || profile?.municipio) && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                <span className="line-clamp-1">{[profile.municipio, profile.departamento, profile.pais].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {age && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                {age} años
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 md:w-4 md:h-4" />
                <span className="line-clamp-1">{profile.email}</span>
              </div>
            )}
            {profile?.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 md:w-4 md:h-4" />
                {profile.phone}
              </div>
            )}
          </div>

          {/* Se removieron las estadísticas debajo de "Mi Perfil" a solicitud del usuario */}
        </div>
      </div>
    </div>
  );
};