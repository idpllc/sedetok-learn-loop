import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTriviaRankings } from "@/hooks/useTriviaGame";
import { Trophy, Medal, Award } from "lucide-react";

export const TriviaRanking = () => {
  const { globalRanking, isLoading } = useTriviaRankings();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Ranking Global
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {globalRanking?.map((entry, index) => {
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
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
                </div>
              </div>

              {/* Points */}
              <Badge className={`${getRankBadgeColor(position)} text-white text-lg px-4 py-2`}>
                {entry.total_points.toLocaleString()} pts
              </Badge>
            </div>
          );
        })}

        {(!globalRanking || globalRanking.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No hay jugadores en el ranking aún.</p>
            <p className="text-sm mt-2">¡Sé el primero en jugar!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
