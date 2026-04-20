import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mail, FileText, Calendar, Building2, Coins, Award, Phone, Globe } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserDetailDialogProps {
  userId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDialog({ userId, open, onOpenChange }: UserDetailDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("admin_get_user_detail", { _user_id: userId });
      if (error) throw error;
      return data as any;
    },
    enabled: !!userId && open,
  });

  const profile = data?.profile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalle del Usuario</DialogTitle>
          <DialogDescription>Información completa del perfil</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{profile?.full_name?.[0] || profile?.username?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{profile?.full_name || "Sin nombre"}</h3>
                  <p className="text-muted-foreground">@{profile?.username}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {data.roles?.map((r: string) => (
                      <Badge key={r} variant="secondary">{r}</Badge>
                    ))}
                    {profile?.is_verified && <Badge variant="default">Verificado</Badge>}
                  </div>
                </div>
              </div>

              {/* Datos básicos */}
              <Card className="p-4 space-y-2">
                <h4 className="font-semibold mb-2">Datos de cuenta</h4>
                <Field icon={<Mail className="w-4 h-4" />} label="Email" value={data.email} />
                <Field icon={<FileText className="w-4 h-4" />} label="Documento" value={`${profile?.tipo_documento || ""} ${profile?.numero_documento || "—"}`} />
                <Field icon={<Phone className="w-4 h-4" />} label="Teléfono" value={profile?.phone} />
                <Field icon={<Calendar className="w-4 h-4" />} label="Registrado" value={profile?.created_at ? format(new Date(profile.created_at), "PPP", { locale: es }) : "—"} />
                <Field icon={<Calendar className="w-4 h-4" />} label="Último login" value={data.last_sign_in_at ? format(new Date(data.last_sign_in_at), "PPP p", { locale: es }) : "Nunca"} />
                <Field icon={<Calendar className="w-4 h-4" />} label="Email confirmado" value={data.email_confirmed_at ? "Sí" : "No"} />
              </Card>

              {/* Personal */}
              <Card className="p-4 space-y-2">
                <h4 className="font-semibold mb-2">Personal</h4>
                <Field label="Género" value={profile?.genero} />
                <Field label="Fecha nacimiento" value={profile?.fecha_nacimiento} />
                <Field icon={<Globe className="w-4 h-4" />} label="Ubicación" value={[profile?.municipio, profile?.departamento, profile?.pais].filter(Boolean).join(", ")} />
                <Field label="Tipo usuario" value={profile?.tipo_usuario} />
                <Field label="Nivel educativo" value={profile?.nivel_educativo} />
                <Field label="Grado actual" value={profile?.grado_actual} />
              </Card>

              {/* Métricas */}
              <Card className="p-4">
                <h4 className="font-semibold mb-2">Métricas</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat icon={<Award />} label="XP" value={profile?.experience_points || 0} />
                  <Stat icon={<Coins />} label="Educoins" value={profile?.educoins || 0} />
                  <Stat label="Seguidores" value={profile?.followers_count || 0} />
                  <Stat label="Siguiendo" value={profile?.following_count || 0} />
                  <Stat label="Contenidos" value={data.content_count || 0} />
                  <Stat label="Juegos" value={data.games_count || 0} />
                  <Stat label="Quizzes" value={data.quizzes_count || 0} />
                  <Stat label="Rutas" value={data.paths_count || 0} />
                </div>
              </Card>

              {/* Instituciones */}
              {data.institutions?.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Instituciones
                  </h4>
                  <div className="space-y-2">
                    {data.institutions.map((i: any) => (
                      <div key={i.institution_id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                        <span>{i.institution_name || i.institution_id}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline">{i.member_role}</Badge>
                          <Badge variant={i.status === "active" ? "default" : "secondary"}>{i.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Bio */}
              {profile?.bio && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: any }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <span className="text-muted-foreground min-w-[120px]">{label}:</span>
      <span className="font-medium break-all">{value || "—"}</span>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/50">
      {icon && <span className="text-muted-foreground mb-1">{icon}</span>}
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
