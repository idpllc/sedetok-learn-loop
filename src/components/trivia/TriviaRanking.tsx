import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalRanking, useInstitutionalRanking, useMatchRanking } from "@/hooks/useTriviaGame";
import { Trophy, Medal, Building2, Swords, Star, Users } from "lucide-react";

export const TriviaRanking = () => {
  const [activeTab, setActiveTab] = useState("global");
  const { data: globalRanking, isLoading: loadingGlobal } = useGlobalRanking(activeTab === "global");
  const { data: institutionalRanking, isLoading: loadingInstitutional } = useInstitutionalRanking(activeTab === "institutional");
  const { data: matchRanking, isLoading: loadingMatches } = useMatchRanking(activeTab === "1v1");
  const isLoading = (activeTab === "global" && loadingGlobal) || (activeTab === "institutional" && loadingInstitutional) || (activeTab === "1v1" && loadingMatches);

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

  const renderPodium = (data: any[], is1v1: boolean = false) => {
    const topThree = data.slice(0, 3);
    
    if (topThree.length === 0) return null;

    return (
      <div className="grid grid-cols-3 gap-3 mb-6 px-2">
        {/* Second Place */}
        {topThree[1] && (
          <div className="flex flex-col items-center pt-8">
            <Avatar className="w-16 h-16 ring-4 ring-gray-400 ring-offset-2 mb-2">
              <AvatarImage src={(Array.isArray(topThree[1].profiles) ? topThree[1].profiles[0] : topThree[1].profiles)?.avatar_url} />
              <AvatarFallback className="text-lg font-bold">
                {((Array.isArray(topThree[1].profiles) ? topThree[1].profiles[0] : topThree[1].profiles)?.full_name || (Array.isArray(topThree[1].profiles) ? topThree[1].profiles[0] : topThree[1].profiles)?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="w-full bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-xl p-3 text-center">
              <Medal className="w-6 h-6 mx-auto mb-1 text-white" />
              <div className="text-xs text-white/80 truncate max-w-full px-1">
                {(Array.isArray(topThree[1].profiles) ? topThree[1].profiles[0] : topThree[1].profiles)?.full_name || (Array.isArray(topThree[1].profiles) ? topThree[1].profiles[0] : topThree[1].profiles)?.username || 'Usuario'}
              </div>
              <div className="text-lg font-bold text-white mt-1">
                {is1v1 ? topThree[1].wins : topThree[1].total_points}
              </div>
              <div className="text-[10px] text-white/70">{is1v1 ? 'victorias' : 'puntos'}</div>
            </div>
          </div>
        )}

        {/* First Place */}
        {topThree[0] && (
          <div className="flex flex-col items-center">
            <Avatar className="w-20 h-20 ring-4 ring-yellow-500 ring-offset-2 mb-2">
              <AvatarImage src={(Array.isArray(topThree[0].profiles) ? topThree[0].profiles[0] : topThree[0].profiles)?.avatar_url} />
              <AvatarFallback className="text-xl font-bold">
                {((Array.isArray(topThree[0].profiles) ? topThree[0].profiles[0] : topThree[0].profiles)?.full_name || (Array.isArray(topThree[0].profiles) ? topThree[0].profiles[0] : topThree[0].profiles)?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="w-full bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-xl p-3 text-center">
              <Trophy className="w-7 h-7 mx-auto mb-1 text-white" />
              <div className="text-xs text-white/90 font-medium truncate max-w-full px-1">
                {(Array.isArray(topThree[0].profiles) ? topThree[0].profiles[0] : topThree[0].profiles)?.full_name || (Array.isArray(topThree[0].profiles) ? topThree[0].profiles[0] : topThree[0].profiles)?.username || 'Usuario'}
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {is1v1 ? topThree[0].wins : topThree[0].total_points}
              </div>
              <div className="text-[10px] text-white/70">{is1v1 ? 'victorias' : 'puntos'}</div>
            </div>
          </div>
        )}

        {/* Third Place */}
        {topThree[2] && (
          <div className="flex flex-col items-center pt-12">
            <Avatar className="w-14 h-14 ring-4 ring-amber-700 ring-offset-2 mb-2">
              <AvatarImage src={(Array.isArray(topThree[2].profiles) ? topThree[2].profiles[0] : topThree[2].profiles)?.avatar_url} />
              <AvatarFallback className="text-base font-bold">
                {((Array.isArray(topThree[2].profiles) ? topThree[2].profiles[0] : topThree[2].profiles)?.full_name || (Array.isArray(topThree[2].profiles) ? topThree[2].profiles[0] : topThree[2].profiles)?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="w-full bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-xl p-3 text-center">
              <Medal className="w-5 h-5 mx-auto mb-1 text-white" />
              <div className="text-xs text-white/80 truncate max-w-full px-1">
                {(Array.isArray(topThree[2].profiles) ? topThree[2].profiles[0] : topThree[2].profiles)?.full_name || (Array.isArray(topThree[2].profiles) ? topThree[2].profiles[0] : topThree[2].profiles)?.username || 'Usuario'}
              </div>
              <div className="text-base font-bold text-white mt-1">
                {is1v1 ? topThree[2].wins : topThree[2].total_points}
              </div>
              <div className="text-[10px] text-white/70">{is1v1 ? 'victorias' : 'puntos'}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlayerRankingList = (data: any[], showInstitution: boolean = false, is1v1: boolean = false) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aún no hay jugadores con puntos o aciertos.</p>
          <p className="text-sm mt-1">Responde correctamente para entrar al ranking.</p>
        </div>
      );
    }

    const restOfPlayers = data.slice(3);

    return (
      <>
        {renderPodium(data, is1v1)}
        
        {restOfPlayers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-1 mb-3">
              Resto del ranking
            </h3>
            {restOfPlayers.map((entry, index) => {
              const position = index + 4;
              const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
              const displayName = profile?.full_name || profile?.username || 'Usuario';
              const points = is1v1 ? entry.wins : entry.total_points;

              return (
                <div
                  key={entry.user_id || index}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 transition-all hover:bg-muted/50"
                >
                  <div className="flex-shrink-0 w-8 flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">#{position}</span>
                  </div>

                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-sm font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

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
                          <span className="font-medium">{points} pts</span>
                          <span>·</span>
                          <span>{entry.total_matches} partida{entry.total_matches !== 1 ? 's' : ''}</span>
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

                  <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-full w-14 h-14 bg-primary text-white font-bold">
                    <span className="text-base leading-none">{is1v1 ? entry.wins : (points >= 1000 ? `${(points / 1000).toFixed(1)}k` : points)}</span>
                    <span className="text-[10px] opacity-90 leading-none mt-0.5">{is1v1 ? '🏆' : 'pts'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const renderInstitutionalPodium = (data: any[]) => {
    const topThree = data.slice(0, 3);
    
    if (topThree.length === 0) return null;

    return (
      <div className="grid grid-cols-3 gap-3 mb-6 px-2">
        {/* Second Place */}
        {topThree[1] && (
          <div className="flex flex-col items-center pt-8">
            <Avatar className="w-16 h-16 ring-4 ring-gray-400 ring-offset-2 mb-2">
              <AvatarImage src={topThree[1].logo_url} />
              <AvatarFallback className="text-lg font-bold">
                {topThree[1].name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="w-full bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-xl p-3 text-center">
              <Medal className="w-6 h-6 mx-auto mb-1 text-white" />
              <div className="text-xs text-white/80 truncate max-w-full px-1">
                {topThree[1].name}
              </div>
              <div className="text-lg font-bold text-white mt-1">
                {topThree[1].total_points}
              </div>
              <div className="text-[10px] text-white/70">puntos</div>
            </div>
          </div>
        )}

        {/* First Place */}
        {topThree[0] && (
          <div className="flex flex-col items-center">
            <Avatar className="w-20 h-20 ring-4 ring-yellow-500 ring-offset-2 mb-2">
              <AvatarImage src={topThree[0].logo_url} />
              <AvatarFallback className="text-xl font-bold">
                {topThree[0].name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="w-full bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-xl p-3 text-center">
              <Trophy className="w-7 h-7 mx-auto mb-1 text-white" />
              <div className="text-xs text-white/90 font-medium truncate max-w-full px-1">
                {topThree[0].name}
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {topThree[0].total_points}
              </div>
              <div className="text-[10px] text-white/70">puntos</div>
            </div>
          </div>
        )}

        {/* Third Place */}
        {topThree[2] && (
          <div className="flex flex-col items-center pt-12">
            <Avatar className="w-14 h-14 ring-4 ring-amber-700 ring-offset-2 mb-2">
              <AvatarImage src={topThree[2].logo_url} />
              <AvatarFallback className="text-base font-bold">
                {topThree[2].name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="w-full bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-xl p-3 text-center">
              <Medal className="w-5 h-5 mx-auto mb-1 text-white" />
              <div className="text-xs text-white/80 truncate max-w-full px-1">
                {topThree[2].name}
              </div>
              <div className="text-base font-bold text-white mt-1">
                {topThree[2].total_points}
              </div>
              <div className="text-[10px] text-white/70">puntos</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInstitutionalRanking = (data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay instituciones con puntos o aciertos aún.</p>
          <p className="text-sm mt-1">Las instituciones aparecerán cuando sus estudiantes puntúen.</p>
        </div>
      );
    }

    const restOfInstitutions = data.slice(3);

    return (
      <>
        {renderInstitutionalPodium(data)}
        
        {restOfInstitutions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-1 mb-3">
              Resto del ranking
            </h3>
            {restOfInstitutions.map((entry, index) => {
              const position = index + 4;

              return (
                <div
                  key={entry.institution_id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 transition-all hover:bg-muted/50"
                >
                  <div className="flex-shrink-0 w-8 flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">#{position}</span>
                  </div>

                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={entry.logo_url} />
                    <AvatarFallback className="text-sm font-bold">
                      {entry.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate leading-tight">
                      {entry.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" />
                        {entry.total_students} estudiante{entry.total_students !== 1 ? 's' : ''}
                      </span>
                      <span>·</span>
                      <span>{entry.total_matches} partida{entry.total_matches !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span className="text-green-600 font-medium">
                        {entry.total_correct} ✓
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-full w-14 h-14 bg-primary text-white font-bold">
                    <span className="text-base leading-none">{entry.total_points >= 1000 ? `${(entry.total_points / 1000).toFixed(1)}k` : entry.total_points}</span>
                    <span className="text-[10px] opacity-90 leading-none mt-0.5">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
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
              Criterio: puntos totales → aciertos → partidas (solo con puntos o aciertos)
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderPlayerRankingList(globalRanking || [], false, false)}
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
              Criterio: victorias totales (si hay empate, se mantiene orden de registro)
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderPlayerRankingList(matchRanking || [], false, true)}
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
              Criterio: puntos acumulados → aciertos → partidas (solo instituciones con rendimiento)
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderInstitutionalRanking(institutionalRanking || [])}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
