import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface XPLogEntry {
  id: string;
  action_type: string;
  xp_amount: number;
  created_at: string;
  content_id?: string;
  quiz_id?: string;
  path_id?: string;
}

const XPHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [xpLog, setXpLog] = useState<XPLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalGained, setTotalGained] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth", { state: { from: "/xp-history" } });
      return;
    }

    const loadXPHistory = async () => {
      // Get date from 1 month ago
      const oneMonthAgo = subMonths(new Date(), 1).toISOString();
      
      const { data, error } = await supabase
        .from("user_xp_log")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", oneMonthAgo) // Only last month
        .order("created_at", { ascending: false });

      if (!error && data) {
        setXpLog(data);
        
        // Calcular totales
        const gained = data.filter(entry => entry.xp_amount > 0).reduce((sum, entry) => sum + entry.xp_amount, 0);
        const spent = data.filter(entry => entry.xp_amount < 0).reduce((sum, entry) => sum + Math.abs(entry.xp_amount), 0);
        
        setTotalGained(gained);
        setTotalSpent(spent);
      }

      setLoading(false);
    };

    loadXPHistory();
  }, [user, navigate, authLoading]);

  const getActionLabel = (actionType: string): string => {
    const labels: Record<string, string> = {
      'view_complete': 'Video completado',
      'like': 'Me gusta',
      'save': 'Video guardado',
      'comment': 'Comentario publicado',
      'path_complete': 'Ruta completada',
      'quiz_complete': 'Quiz completado',
      'content_created': 'Contenido creado',
      'quiz_created': 'Quiz creado',
      'path_created': 'Ruta creada',
      'game_complete': 'Juego completado',
      'profile_360_complete': 'Perfil 360 completado',
      'social_link_added': 'Red social agregada',
      'formal_education_added': 'Educación formal agregada',
      'complementary_education_added': 'Formación complementaria agregada',
      'work_experience_added': 'Experiencia laboral agregada',
      'technical_skill_added': 'Habilidad técnica agregada',
      'soft_skill_added': 'Habilidad blanda agregada',
      'project_added': 'Proyecto agregado',
      'award_added': 'Premio agregado',
      'cv_variation_created': 'Hoja de vida creada',
      'Retroceder después de fallar': 'Retroceder en quiz',
      'Ver respuestas correctas': 'Ver respuestas',
      'Extender tiempo +1 minuto': 'Extender tiempo de quiz',
    };
    return labels[actionType] || actionType;
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <History className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Historial de XP</h1>
                <p className="text-sm text-muted-foreground">
                  Tus ganancias y gastos de experiencia
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <p className="text-sm text-muted-foreground">Total Ganado</p>
                </div>
                <p className="text-2xl font-bold text-green-500">+{totalGained.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-muted-foreground">Total Gastado</p>
                </div>
                <p className="text-2xl font-bold text-red-500">-{totalSpent.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Historial */}
          <Card>
            <CardHeader>
              <CardTitle>Transacciones</CardTitle>
              <CardDescription>
                Últimos 30 días de actividad
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Cargando historial...</p>
              ) : xpLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aún no tienes transacciones de XP
                </p>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {xpLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full ${entry.xp_amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {entry.xp_amount > 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {getActionLabel(entry.action_type)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={entry.xp_amount > 0 ? "default" : "destructive"}
                          className="ml-2"
                        >
                          {entry.xp_amount > 0 ? '+' : ''}{entry.xp_amount} XP
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </main>

        <BottomNav />
      </div>
    </>
  );
};

export default XPHistory;
