import { Camera, MapPin, Calendar, Mail, Phone, Share2, Linkedin, Instagram, Facebook, Twitter, Github } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";
import { FaTiktok } from "react-icons/fa";

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

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Perfil de ${profile?.full_name || profile?.username}`,
        url: url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Enlace copiado al portapapeles" });
    }
  };

  const socialLinks = profile?.social_links || {};
  const hasSocialLinks = Object.values(socialLinks).some(link => link);

  return (
    <div className="relative">
      {/* Portada */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary to-secondary rounded-t-lg overflow-hidden">
        {profile?.cover_image_url && (
          <img 
            src={profile.cover_image_url} 
            alt="Portada" 
            className="w-full h-full object-cover"
          />
        )}
        {isOwnProfile && (
          <div className="absolute top-4 right-4">
            <Button variant="secondary" size="sm" disabled={uploading} onClick={() => coverInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-2" />
              {uploading ? "Subiendo..." : "Cambiar portada"}
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
      <div className="px-6 pb-6">
        {/* Avatar y acciones */}
        <div className="flex items-start gap-4 -mt-16 mb-4">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-background">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <div className="absolute -top-2 -right-2">
                <Button size="icon" variant="secondary" className="rounded-full shadow-lg" disabled={uploading} onClick={() => avatarInputRef.current?.click()}>
                  <Camera className="w-4 h-4" />
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
          <div className="flex items-center gap-2 mt-auto">
            {hasSocialLinks && (
              <div className="flex items-center gap-1">
                {socialLinks.linkedin && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.instagram && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                      <Instagram className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.facebook && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                      <Facebook className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.twitter && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                    <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                      <Twitter className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.tiktok && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                    <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer">
                      <FaTiktok className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.github && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                    <a href={socialLinks.github} target="_blank" rel="noopener noreferrer">
                      <Github className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            )}
            
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleShare} title="Compartir perfil">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Nombre y título */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{profile?.full_name || profile?.username}</h1>
              {profile?.bio && (
                <p className="text-muted-foreground mt-1">{profile.bio}</p>
              )}
            </div>
            {profile?.is_verified && (
              <Badge variant="default" className="ml-2">
                ✓ Verificado
              </Badge>
            )}
          </div>

          {/* Información básica */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {profile?.institution && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.institution}
              </div>
            )}
            {(profile?.pais || profile?.municipio) && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {[profile.municipio, profile.departamento, profile.pais].filter(Boolean).join(", ")}
              </div>
            )}
            {age && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {age} años
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {profile.email}
              </div>
            )}
            {profile?.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {profile.phone}
              </div>
            )}
          </div>

          {/* Estadísticas rápidas */}
          <div className="flex gap-6 pt-4">
            <div>
              <div className="text-2xl font-bold text-primary">{profile?.experience_points || 0}</div>
              <div className="text-xs text-muted-foreground">XP</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{profile?.followers_count || 0}</div>
              <div className="text-xs text-muted-foreground">Seguidores</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{profile?.following_count || 0}</div>
              <div className="text-xs text-muted-foreground">Siguiendo</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{profile?.profile_views || 0}</div>
              <div className="text-xs text-muted-foreground">Visitas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};