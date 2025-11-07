import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTriviaInvitations } from "@/hooks/useTriviaInvitations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Swords, Search, Users, UserCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChallengeFriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChallengeFriendsModal({ open, onOpenChange }: ChallengeFriendsModalProps) {
  const { user } = useAuth();
  const { sendInvitation } = useTriviaInvitations();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("libre");

  // Get followers
  const { data: followers } = useQuery({
    queryKey: ['followers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles:follower_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('following_id', user.id);
      
      if (error) throw error;
      return data.map(f => f.profiles).filter(Boolean);
    },
    enabled: !!user && open
  });

  // Get following
  const { data: following } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles:following_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('follower_id', user.id);
      
      if (error) throw error;
      return data.map(f => f.profiles).filter(Boolean);
    },
    enabled: !!user && open
  });

  const handleChallenge = async (userId: string) => {
    await sendInvitation.mutateAsync({
      receiverId: userId,
      level: selectedLevel
    });
  };

  const filterUsers = (users: any[]) => {
    if (!searchQuery) return users;
    return users.filter(u => 
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderUserList = (users: any[], emptyMessage: string) => {
    const filteredUsers = filterUsers(users || []);

    if (filteredUsers.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredUsers.map((profile: any) => (
          <div
            key={profile.id}
            className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{profile.full_name || profile.username}</p>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleChallenge(profile.id)}
              disabled={sendInvitation.isPending}
              className="gap-2"
            >
              <Swords className="w-4 h-4" />
              Retar
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Swords className="w-6 h-6" />
            Retar a Amigos
          </DialogTitle>
          <DialogDescription>
            Reta a tus seguidores o a quienes sigues a una partida de trivia
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Level selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Nivel:</label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="libre">🎯 Libre</SelectItem>
                <SelectItem value="basico">📚 Básico</SelectItem>
                <SelectItem value="intermedio">🎓 Intermedio</SelectItem>
                <SelectItem value="avanzado">🏆 Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs for followers/following */}
          <Tabs defaultValue="followers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="followers" className="gap-2">
                <Users className="w-4 h-4" />
                Seguidores ({followers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="following" className="gap-2">
                <UserCheck className="w-4 h-4" />
                Siguiendo ({following?.length || 0})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="followers" className="mt-0">
                {renderUserList(followers || [], "No tienes seguidores aún")}
              </TabsContent>

              <TabsContent value="following" className="mt-0">
                {renderUserList(following || [], "No sigues a nadie aún")}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
