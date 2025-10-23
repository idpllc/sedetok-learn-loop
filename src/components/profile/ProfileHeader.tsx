import { Camera, MapPin, Calendar, Mail, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useToast } from "@/hooks/use-toast";

interface ProfileHeaderProps {
  profile: any;
  isOwnProfile: boolean;
  onUpdateCover?: (url: string) => void;
  onUpdateAvatar?: (url: string) => void;
}

export const ProfileHeader = ({ profile, isOwnProfile, onUpdateCover, onUpdateAvatar }: ProfileHeaderProps) => {
  const { uploadFile, uploading } = useCloudinary();
  const { toast } = useToast();

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "raw");
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
      const url = await uploadFile(file, "raw");
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
          <label className="absolute top-4 right-4 cursor-pointer">
            <Button variant="secondary" size="sm" disabled={uploading}>
              <Camera className="w-4 h-4 mr-2" />
              {uploading ? "Subiendo..." : "Cambiar portada"}
            </Button>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleCoverUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Información del perfil */}
      <div className="px-6 pb-6">
        {/* Avatar */}
        <div className="relative -mt-16 mb-4">
          <Avatar className="w-32 h-32 border-4 border-background">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
          </Avatar>
          {isOwnProfile && (
            <label className="absolute bottom-0 right-0 cursor-pointer">
              <Button size="icon" variant="secondary" className="rounded-full" disabled={uploading}>
                <Camera className="w-4 h-4" />
              </Button>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </label>
          )}
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