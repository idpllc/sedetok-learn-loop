import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTriviaRankings } from "@/hooks/useTriviaGame";
import { Trophy, Medal, Award, Building2, Swords } from "lucide-react";

export const TriviaRanking = () => {
  const { globalRanking, institutionalRanking, matchRanking, isLoading } = useTriviaRankings();

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-700" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getRankBadgeColor = (position: number) => {
    if (position === 1) return "bg-yellow-500";
    if (position === 2) return "bg-gray-400";
    if (position === 3) return "bg-amber-700";
    return "bg-primary";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Ranking Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const renderRankingList = (data: any[], showInstitution: boolean = false, is1v1: boolean = false) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No hay jugadores en el ranking aún.</p>
          <p className="text-sm mt-2">¡Sé el primero en jugar!</p>
        </div>
      );
    }

    return data.map((entry, index) => {
      const position = index + 1;
      const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
      
      return (
        <div
          key={entry.user_id}
          className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
            position <= 3 ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-2' : 'bg-muted/50'
          } ${position === 1 ? 'border-yellow-500' : position === 2 ? 'border-gray-400' : position === 3 ? 'border-amber-700' : 'border-transparent'}`}
        >
          {/* Rank */}
          <div className="flex-shrink-0 w-12 flex items-center justify-center">
            {getRankIcon(position)}
          </div>

          {/* Avatar */}
          <Avatar className={`w-12 h-12 ${position <= 3 ? 'ring-2' : ''} ${position === 1 ? 'ring-yellow-500' : position === 2 ? 'ring-gray-400' : position === 3 ? 'ring-amber-700' : ''}`}>
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>
              {(profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-lg truncate">
              {profile?.full_name || profile?.username || 'Usuario'}
            </h4>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {is1v1 ? (
                <>
                  <span className="text-green-600 font-medium">
                    {entry.wins} victoria{entry.wins !== 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <>
                  <span>{entry.total_matches} partidas</span>
                  <span>•</span>
                  <span className="text-green-600 font-medium">
                    {entry.total_correct} correctas
                  </span>
                  {entry.best_streak > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-orange-600 font-medium flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        Racha: {entry.best_streak}
                      </span>
                    </>
                  )}
                </>
              )}
              {showInstitution && profile?.institution && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {profile.institution}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Points/Wins */}
          <Badge className={`${getRankBadgeColor(position)} text-white text-lg px-4 py-2`}>
            {is1v1 ? (
              `${entry.wins} 🏆`
            ) : (
              `${entry.total_points.toLocaleString()} pts`
            )}
          </Badge>
        </div>
      );
    });
  };

  return (
    <Tabs defaultValue="global" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="global" className="flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Global
        </TabsTrigger>
        <TabsTrigger value="1v1" className="flex items-center gap-2">
          <Swords className="w-4 h-4" />
          1 vs 1
        </TabsTrigger>
        <TabsTrigger value="institutional" className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Institucional
        </TabsTrigger>
      </TabsList>

      {/* Global Ranking */}
      <TabsContent value="global">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Ranking Global
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Los mejores jugadores de Trivia de todos los tiempos
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {renderRankingList(globalRanking || [], false, false)}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 1v1 Ranking */}
      <TabsContent value="1v1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Swords className="w-8 h-8 text-primary" />
              Ranking 1 vs 1
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Jugadores con más victorias en partidas 1 contra 1
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {renderRankingList(matchRanking || [], false, true)}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Institutional Ranking */}
      <TabsContent value="institutional">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Building2 className="w-8 h-8 text-secondary" />
              Ranking Institucional
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Los mejores jugadores de tu institución
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {institutionalRanking ? (
              renderRankingList(institutionalRanking, true, false)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No estás asociado a ninguna institución.</p>
                <p className="text-sm mt-2">Completa tu perfil para ver el ranking de tu institución.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
