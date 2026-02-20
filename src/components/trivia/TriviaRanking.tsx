import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTriviaRankings } from "@/hooks/useTriviaGame";
import { Trophy, Medal, Award, Building2, Swords, Star } from "lucide-react";

export const TriviaRanking = () => {
  const { globalRanking, institutionalRanking, matchRanking, isLoading } = useTriviaRankings();

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getCardBorder = (position: number) => {
    if (position === 1) return "border-yellow-500";
    if (position === 2) return "border-gray-400";
    if (position === 3) return "border-amber-700";
    return "border-border";
  };

  const getPointsBg = (position: number) => {
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
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
              <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
              <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-16 rounded-full flex-shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const renderRankingList = (data: any[], showInstitution: boolean = false, is1v1: boolean = false) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay jugadores en el ranking aún.</p>
          <p className="text-sm mt-1">¡Sé el primero en jugar!</p>
        </div>
      );
    }

    return data.map((entry, index) => {
      const position = index + 1;
      const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
      const displayName = profile?.full_name || profile?.username || 'Usuario';
      const points = is1v1 ? entry.wins : entry.total_points;

      return (
        <div
          key={entry.user_id || index}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
            position <= 3
              ? `bg-gradient-to-r from-primary/5 to-secondary/5 ${getCardBorder(position)}`
              : "bg-muted/30 border-transparent"
          }`}
        >
          {/* Rank icon */}
          <div className="flex-shrink-0 w-8 flex items-center justify-center">
            {getRankIcon(position)}
          </div>

          {/* Avatar */}
          <Avatar className={`w-10 h-10 flex-shrink-0 ${position <= 3 ? `ring-2 ring-offset-1 ${position === 1 ? 'ring-yellow-500' : position === 2 ? 'ring-gray-400' : 'ring-amber-700'}` : ''}`}>
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate leading-tight">
              {displayName}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mt-0.5">
              {is1v1 ? (
                <span className="text-green-600 font-medium">
                  {entry.wins} victoria{entry.wins !== 1 ? 's' : ''}
                </span>
              ) : (
                <>
                  <span>{entry.total_matches} partidas</span>
                  <span>·</span>
                  <span className="text-green-600 font-medium">
                    {entry.total_correct} ✓
                  </span>
                  {entry.best_streak > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-orange-500 font-medium flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" />
                        {entry.best_streak}
                      </span>
                    </>
                  )}
                </>
              )}
              {showInstitution && profile?.institution && (
                <span className="hidden sm:flex items-center gap-0.5 text-muted-foreground">
                  · <Building2 className="w-2.5 h-2.5" /> {profile.institution}
                </span>
              )}
            </div>
          </div>

          {/* Points badge */}
          <div className={`flex-shrink-0 flex flex-col items-center justify-center rounded-full w-14 h-14 text-white font-bold ${getPointsBg(position)}`}>
            <span className="text-base leading-none">{is1v1 ? entry.wins : (points >= 1000 ? `${(points / 1000).toFixed(1)}k` : points)}</span>
            <span className="text-[10px] opacity-90 leading-none mt-0.5">{is1v1 ? '🏆' : 'pts'}</span>
          </div>
        </div>
      );
    });
  };

  return (
    <Tabs defaultValue="global" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-1">
        <TabsTrigger value="global" className="flex items-center gap-1 text-xs sm:text-sm">
          <Trophy className="w-3.5 h-3.5" />
          Global
        </TabsTrigger>
        <TabsTrigger value="1v1" className="flex items-center gap-1 text-xs sm:text-sm">
          <Swords className="w-3.5 h-3.5" />
          1 vs 1
        </TabsTrigger>
        <TabsTrigger value="institutional" className="flex items-center gap-1 text-xs sm:text-sm">
          <Building2 className="w-3.5 h-3.5" />
          Institución
        </TabsTrigger>
      </TabsList>

      {/* Global Ranking */}
      <TabsContent value="global">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Ranking Global
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Los mejores jugadores de Trivia de todos los tiempos
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderRankingList(globalRanking || [], false, false)}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 1v1 Ranking */}
      <TabsContent value="1v1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Swords className="w-6 h-6 text-primary" />
              Ranking 1 vs 1
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Jugadores con más victorias en partidas 1 contra 1
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderRankingList(matchRanking || [], false, true)}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Institutional Ranking */}
      <TabsContent value="institutional">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-6 h-6 text-secondary" />
              Ranking Institucional
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Los mejores jugadores de tu institución
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {institutionalRanking === null ? (
              <div className="text-center py-10 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No estás asociado a ninguna institución.</p>
                <p className="text-sm mt-1">Completa tu perfil para ver el ranking institucional.</p>
              </div>
            ) : (
              renderRankingList(institutionalRanking, true, false)
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
