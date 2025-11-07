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

  if (loadingReceived || loadingSent) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Invitaciones de Trivia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received" className="gap-2">
              <Mail className="w-4 h-4" />
              Recibidas ({receivedInvitations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <MailCheck className="w-4 h-4" />
              Enviadas ({sentInvitations?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Received Invitations */}
          <TabsContent value="received">
            <ScrollArea className="h-[400px]">
              {!receivedInvitations || receivedInvitations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No tienes invitaciones pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={invitation.sender?.avatar_url || ''} />
                          <AvatarFallback>
                            {(invitation.sender?.full_name || invitation.sender?.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold">
                                {invitation.sender?.full_name || invitation.sender?.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                te ha retado a una partida
                              </p>
                            </div>
                            {getLevelBadge(invitation.level)}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Hace {formatDistanceToNow(new Date(invitation.created_at), { 
                              locale: es,
                              addSuffix: false 
                            })}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => acceptInvitation.mutate(invitation.id)}
                              disabled={acceptInvitation.isPending}
                              className="flex-1 gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Aceptar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectInvitation.mutate(invitation.id)}
                              disabled={rejectInvitation.isPending}
                              className="flex-1 gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Rechazar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Sent Invitations */}
          <TabsContent value="sent">
            <ScrollArea className="h-[400px]">
              {!sentInvitations || sentInvitations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MailCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No has enviado invitaciones</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="p-4 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={invitation.receiver?.avatar_url || ''} />
                          <AvatarFallback>
                            {(invitation.receiver?.full_name || invitation.receiver?.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold">
                                {invitation.receiver?.full_name || invitation.receiver?.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {invitation.status === 'accepted' 
                                  ? '✅ Aceptó tu reto' 
                                  : '⏳ Esperando respuesta'}
                              </p>
                            </div>
                            {getLevelBadge(invitation.level)}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Hace {formatDistanceToNow(new Date(invitation.created_at), { 
                              locale: es,
                              addSuffix: false 
                            })}
                          </div>

                          {invitation.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelInvitation.mutate(invitation.id)}
                              disabled={cancelInvitation.isPending}
                              className="w-full gap-2"
                            >
                              <X className="w-4 h-4" />
                              Cancelar invitación
                            </Button>
                          )}

                          {invitation.status === 'accepted' && invitation.match_id && (
                            <Button
                              size="sm"
                              onClick={() => window.location.href = `/trivia-game?match=${invitation.match_id}`}
                              className="w-full"
                            >
                              Ir a la partida
                            </Button>
                          )}
                        </div>
                      </div>
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
