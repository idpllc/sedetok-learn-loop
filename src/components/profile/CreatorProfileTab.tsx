import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, FileText, HelpCircle, Users, Eye, Heart, Map } from "lucide-react";

interface CreatorProfileTabProps {
  stats: {
    contentCount: number;
    pathCount: number;
    totalLikes: number;
    totalViews: number;
    followers: number;
  };
  avatar: string;
  username: string;
  xp: number;
  levelIcon: string;
  levelName: string;
}

export const CreatorProfileTab = ({ stats, avatar, username, xp, levelIcon, levelName }: CreatorProfileTabProps) => {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          {/* Avatar y nivel */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative">
              <img 
                src={avatar} 
                alt={username}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 md:border-4 border-primary/20 object-cover"
              />
            </div>
            <div className="text-3xl md:text-5xl">
              {levelIcon}
            </div>
          </div>

          {/* Info del creador */}
          <div className="flex-1 text-center md:text-left space-y-2 md:space-y-3">
            <div>
              <h3 className="text-lg md:text-xl font-bold">{levelName}</h3>
              <p className="text-sm md:text-base text-muted-foreground">{xp.toLocaleString()} XP</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4 pt-2">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="text-lg md:text-xl font-bold">{stats.contentCount}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Cápsulas</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Map className="w-4 h-4 text-secondary" />
                </div>
                <div className="text-lg md:text-xl font-bold">{stats.pathCount}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Rutas</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Heart className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-lg md:text-xl font-bold">{stats.totalLikes}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Likes</div>
              </div>
              
              <div className="text-center md:block hidden">
                <div className="flex items-center justify-center mb-1">
                  <Eye className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-lg md:text-xl font-bold">{stats.totalViews}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Vistas</div>
              </div>
              
              <div className="text-center md:block hidden">
                <div className="flex items-center justify-center mb-1">
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-lg md:text-xl font-bold">{stats.followers}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Seguidores</div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1 md:gap-2 justify-center md:justify-start">
              <Badge variant="secondary" className="text-xs">
                Badge de explorador
              </Badge>
              <Badge variant="outline" className="text-xs">
                Acceso a rutas de aprendizaje
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
