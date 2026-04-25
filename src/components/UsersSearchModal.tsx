import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";

interface UsersSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
}

export const UsersSearchModal = ({ open, onOpenChange, initialQuery = "" }: UsersSearchModalProps) => {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: users, isLoading } = useSearchUsers(query);
  const { followingIds, toggleFollow, isToggling } = useFollow();

  const handleVisit = (username: string) => {
    onOpenChange(false);
    navigate(`/profile/${username}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Buscar usuarios
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, usuario o documento..."
            className="pl-10"
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !query.trim() ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Escribe para buscar usuarios
            </p>
          ) : users && users.length > 0 ? (
            <div className="space-y-2 py-2">
              {users.map((profile: any) => {
                const isFollowing = followingIds?.includes(profile.id);
                const isMe = user?.id === profile.id;
                return (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <button
                      onClick={() => handleVisit(profile.username)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={profile.avatar_url || ""} alt={profile.full_name || profile.username} />
                        <AvatarFallback>
                          {(profile.full_name || profile.username || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {profile.full_name || profile.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{profile.username} · {profile.followers_count || 0} seguidores
                        </p>
                      </div>
                    </button>
                    {!isMe && user && (
                      <Button
                        size="sm"
                        variant={isFollowing ? "outline" : "default"}
                        onClick={() => toggleFollow(profile.id)}
                        disabled={isToggling}
                        className="shrink-0"
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="w-4 h-4 mr-1" />
                            Siguiendo
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-1" />
                            Seguir
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleVisit(profile.username)}
                      className="shrink-0"
                    >
                      Ver perfil
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              No se encontraron usuarios
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
