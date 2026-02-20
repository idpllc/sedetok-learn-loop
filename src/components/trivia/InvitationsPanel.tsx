import { useTriviaInvitations } from "@/hooks/useTriviaInvitations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MailCheck, Clock, X, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function InvitationsPanel() {
  const {
    receivedInvitations,
    sentInvitations,
    loadingReceived,
    loadingSent,
    acceptInvitation,
    rejectInvitation,
    cancelInvitation
  } = useTriviaInvitations();

  const getLevelBadge = (level: string) => {
    const levels: Record<string, { icon: string; color: string }> = {
      libre: { icon: "🎯", color: "bg-blue-500" },
      basico: { icon: "📚", color: "bg-green-500" },
      intermedio: { icon: "🎓", color: "bg-orange-500" },
      avanzado: { icon: "🏆", color: "bg-red-500" }
    };
    const config = levels[level] || levels.libre;
    return (
      <Badge className={`${config.color} text-white`}>
        {config.icon} {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    );
  };

  const totalReceived = receivedInvitations?.length || 0;
  const totalSent = sentInvitations?.length || 0;

  // Si no hay invitaciones y no está cargando, no mostramos el panel vacío gigante
  if (!loadingReceived && !loadingSent && totalReceived === 0 && totalSent === 0) {
    return (
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <Mail className="w-3.5 h-3.5 opacity-50" />
        <span>Sin invitaciones de trivia pendientes</span>
      </div>
    );
  }

  if (loadingReceived || loadingSent) {
    return (
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Cargando invitaciones...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4" />
          Invitaciones de Trivia
          {totalReceived > 0 && (
            <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">{totalReceived}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <Tabs defaultValue={totalReceived > 0 ? "received" : "sent"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="received" className="gap-1 text-xs h-7">
              <Mail className="w-3 h-3" />
              Recibidas ({totalReceived})
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-1 text-xs h-7">
              <MailCheck className="w-3 h-3" />
              Enviadas ({totalSent})
            </TabsTrigger>
          </TabsList>

          {/* Received Invitations */}
          <TabsContent value="received" className="mt-2">
            <ScrollArea className="max-h-[200px]">
              {!receivedInvitations || totalReceived === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  <p>No tienes invitaciones pendientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {receivedInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2"
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={invitation.sender?.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {(invitation.sender?.full_name || invitation.sender?.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {invitation.sender?.full_name || invitation.sender?.username}
                        </p>
                        <p className="text-[10px] text-muted-foreground">te retó · {getLevelBadge(invitation.level)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" onClick={() => acceptInvitation.mutate(invitation.id)} disabled={acceptInvitation.isPending} className="h-7 px-2 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />Aceptar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectInvitation.mutate(invitation.id)} disabled={rejectInvitation.isPending} className="h-7 px-2 text-xs">
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Sent Invitations */}
          <TabsContent value="sent" className="mt-2">
            <ScrollArea className="max-h-[200px]">
              {!sentInvitations || totalSent === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  <p>No has enviado invitaciones</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sentInvitations.map((invitation) => (
                    <div key={invitation.id} className="p-3 rounded-lg bg-muted/50 border flex items-center gap-2">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={invitation.receiver?.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {(invitation.receiver?.full_name || invitation.receiver?.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {invitation.receiver?.full_name || invitation.receiver?.username}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {invitation.status === 'accepted' ? '✅ Aceptó' : '⏳ Esperando'}
                        </p>
                      </div>
                      {invitation.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => cancelInvitation.mutate(invitation.id)} disabled={cancelInvitation.isPending} className="h-7 px-2 text-xs shrink-0">
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                      {invitation.status === 'accepted' && invitation.match_id && (
                        <Button size="sm" onClick={() => window.location.href = `/trivia-game?match=${invitation.match_id}`} className="h-7 px-2 text-xs shrink-0">
                          Ir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
