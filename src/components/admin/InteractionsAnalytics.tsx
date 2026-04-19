import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MessageCircle, Bookmark, Share2, UserPlus, Eye, Trophy, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "#F6339A", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B"];

const useInteractionStats = () => {
  return useQuery({
    queryKey: ["admin-interactions"],
    queryFn: async () => {
      const [likesRes, commentsRes, savesRes, followsRes, viewsRes] = await Promise.all([
        supabase.from("likes").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("saves").select("*", { count: "exact", head: true }),
        supabase.from("follows").select("*", { count: "exact", head: true }),
        supabase.from("content").select("views_count, shares_count"),
      ]);

      let totalViews = 0;
      let totalShares = 0;
      viewsRes.data?.forEach((c: any) => {
        totalViews += c.views_count || 0;
        totalShares += c.shares_count || 0;
      });

      // Distribución de likes por tipo
      const { data: likesByType } = await supabase
        .from("likes")
        .select("content_id, quiz_id, game_id");
      const likesContent = likesByType?.filter((l) => l.content_id).length || 0;
      const likesQuiz = likesByType?.filter((l) => l.quiz_id).length || 0;
      const likesGame = likesByType?.filter((l) => l.game_id).length || 0;

      // Recent activity (last 30 days) — likes per day
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: recentLikes } = await supabase
        .from("likes")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());
      const { data: recentComments } = await supabase
        .from("comments")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());
      const { data: recentFollows } = await supabase
        .from("follows")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const dailyMap: Record<string, { date: string; likes: number; comments: number; follows: number }> = {};
      const fmt = (d: string) => new Date(d).toISOString().slice(0, 10);
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dailyMap[key] = { date: key.slice(5), likes: 0, comments: 0, follows: 0 };
      }
      recentLikes?.forEach((l: any) => { const k = fmt(l.created_at); if (dailyMap[k]) dailyMap[k].likes++; });
      recentComments?.forEach((l: any) => { const k = fmt(l.created_at); if (dailyMap[k]) dailyMap[k].comments++; });
      recentFollows?.forEach((l: any) => { const k = fmt(l.created_at); if (dailyMap[k]) dailyMap[k].follows++; });

      return {
        totalLikes: likesRes.count || 0,
        totalComments: commentsRes.count || 0,
        totalSaves: savesRes.count || 0,
        totalFollows: followsRes.count || 0,
        totalViews,
        totalShares,
        likesByType: [
          { name: "Cápsulas", value: likesContent },
          { name: "Quizzes", value: likesQuiz },
          { name: "Juegos", value: likesGame },
        ],
        dailyActivity: Object.values(dailyMap),
      };
    },
  });
};

const useTopContent = () => {
  return useQuery({
    queryKey: ["admin-top-content"],
    queryFn: async () => {
      const [topLiked, topCommented, topViewed, topSaved, topShared] = await Promise.all([
        supabase.from("content").select("id, title, likes_count, content_type").order("likes_count", { ascending: false }).limit(10),
        supabase.from("content").select("id, title, comments_count, content_type").order("comments_count", { ascending: false }).limit(10),
        supabase.from("content").select("id, title, views_count, content_type").order("views_count", { ascending: false }).limit(10),
        supabase.from("content").select("id, title, saves_count, content_type").order("saves_count", { ascending: false }).limit(10),
        supabase.from("content").select("id, title, shares_count, content_type").order("shares_count", { ascending: false }).limit(10),
      ]);

      return {
        topLiked: topLiked.data || [],
        topCommented: topCommented.data || [],
        topViewed: topViewed.data || [],
        topSaved: topSaved.data || [],
        topShared: topShared.data || [],
      };
    },
  });
};

const useTopCreators = () => {
  return useQuery({
    queryKey: ["admin-top-creators"],
    queryFn: async () => {
      const { data: follows } = await supabase.from("follows").select("following_id");
      const followCount: Record<string, number> = {};
      follows?.forEach((f: any) => {
        followCount[f.following_id] = (followCount[f.following_id] || 0) + 1;
      });
      const topIds = Object.entries(followCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id);

      if (topIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", topIds);

      return topIds.map((id) => {
        const p = profiles?.find((p: any) => p.id === id);
        return { ...p, followers: followCount[id] };
      });
    },
  });
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{label}</CardTitle>
      <Icon className="h-4 w-4" style={{ color }} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value?.toLocaleString() ?? "..."}</div>
    </CardContent>
  </Card>
);

const TopList = ({ items, valueKey, valueLabel }: { items: any[]; valueKey: string; valueLabel: string }) => (
  <div className="space-y-2">
    {items.length === 0 && <p className="text-sm text-muted-foreground">Sin datos</p>}
    {items.map((item, i) => (
      <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {i + 1}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{item.title}</p>
            {item.content_type && <p className="text-xs text-muted-foreground capitalize">{item.content_type}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold">{(item[valueKey] || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{valueLabel}</p>
        </div>
      </div>
    ))}
  </div>
);

export const InteractionsAnalytics = () => {
  const { data: stats, isLoading } = useInteractionStats();
  const { data: topContent } = useTopContent();
  const { data: topCreators } = useTopCreators();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen de interacciones */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Heart} label="Likes" value={stats?.totalLikes} color="#F6339A" />
        <StatCard icon={MessageCircle} label="Comentarios" value={stats?.totalComments} color="#8B5CF6" />
        <StatCard icon={Bookmark} label="Guardados" value={stats?.totalSaves} color="#06B6D4" />
        <StatCard icon={Share2} label="Compartidos" value={stats?.totalShares} color="#10B981" />
        <StatCard icon={UserPlus} label="Suscripciones" value={stats?.totalFollows} color="#F59E0B" />
        <StatCard icon={Eye} label="Visualizaciones" value={stats?.totalViews} color="hsl(var(--primary))" />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Actividad de los últimos 30 días
            </CardTitle>
            <CardDescription>Likes, comentarios y suscripciones diarias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Line type="monotone" dataKey="likes" stroke="#F6339A" strokeWidth={2} name="Likes" />
                <Line type="monotone" dataKey="comments" stroke="#8B5CF6" strokeWidth={2} name="Comentarios" />
                <Line type="monotone" dataKey="follows" stroke="#F59E0B" strokeWidth={2} name="Suscripciones" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Distribución de Likes
            </CardTitle>
            <CardDescription>Por tipo de contenido</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.likesByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.likesByType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Contenido con más interacciones
          </CardTitle>
          <CardDescription>Top 10 cápsulas por categoría</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="liked">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4">
              <TabsTrigger value="liked"><Heart className="w-4 h-4 mr-1" /> Likes</TabsTrigger>
              <TabsTrigger value="commented"><MessageCircle className="w-4 h-4 mr-1" /> Comentarios</TabsTrigger>
              <TabsTrigger value="viewed"><Eye className="w-4 h-4 mr-1" /> Vistas</TabsTrigger>
              <TabsTrigger value="saved"><Bookmark className="w-4 h-4 mr-1" /> Guardados</TabsTrigger>
              <TabsTrigger value="shared"><Share2 className="w-4 h-4 mr-1" /> Compartidos</TabsTrigger>
            </TabsList>
            <TabsContent value="liked"><TopList items={topContent?.topLiked || []} valueKey="likes_count" valueLabel="likes" /></TabsContent>
            <TabsContent value="commented"><TopList items={topContent?.topCommented || []} valueKey="comments_count" valueLabel="comentarios" /></TabsContent>
            <TabsContent value="viewed"><TopList items={topContent?.topViewed || []} valueKey="views_count" valueLabel="vistas" /></TabsContent>
            <TabsContent value="saved"><TopList items={topContent?.topSaved || []} valueKey="saves_count" valueLabel="guardados" /></TabsContent>
            <TabsContent value="shared"><TopList items={topContent?.topShared || []} valueKey="shares_count" valueLabel="compartidos" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top creadores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Creadores con más suscriptores
          </CardTitle>
          <CardDescription>Top 10 usuarios por seguidores</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(280, (topCreators?.length || 0) * 36)}>
            <BarChart data={topCreators} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis dataKey="full_name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Bar dataKey="followers" fill="#F6339A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
