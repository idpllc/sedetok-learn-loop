import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, BookOpen, Trophy, Activity, Share2, Check, Link2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import NotFound from "@/pages/NotFound";

export default function InstitutionProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: institution, isLoading } = useQuery({
    queryKey: ["institution-by-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await (supabase as any).rpc("get_institution_by_slug", { _slug: slug });
      if (error) throw error;
      return Array.isArray(data) ? data[0] || null : data;
    },
    enabled: !!slug,
  });

  const institutionId = institution?.id;

  // Cursos + Rutas asociadas
  const { data: coursesAndPaths } = useQuery({
    queryKey: ["institution-feed-content", institutionId],
    queryFn: async () => {
      if (!institutionId) return { paths: [], courses: [] };

      const [pathsLinks, coursesLinks] = await Promise.all([
        (supabase as any)
          .from("learning_path_institutions")
          .select("path_id")
          .eq("institution_id", institutionId),
        (supabase as any)
          .from("course_institutions")
          .select("course_id")
          .eq("institution_id", institutionId),
      ]);

      const pathIds = (pathsLinks.data || []).map((r: any) => r.path_id);
      const courseIds = (coursesLinks.data || []).map((r: any) => r.course_id);

      const [pathsRes, coursesRes] = await Promise.all([
        pathIds.length > 0
          ? supabase
              .from("learning_paths")
              .select("id, title, description, cover_url, path_type, creator_id, total_xp, profiles:creator_id(username, full_name, avatar_url)")
              .in("id", pathIds)
              .neq("status", "draft")
              .order("created_at", { ascending: false })
          : { data: [] as any[] },
        courseIds.length > 0
          ? supabase
              .from("courses")
              .select("id, title, description, cover_url, creator_id")
              .in("id", courseIds)
              .order("created_at", { ascending: false })
          : { data: [] as any[] },
      ]);

      return { paths: pathsRes.data || [], courses: coursesRes.data || [] };
    },
    enabled: !!institutionId,
  });

  // Contenido de miembros
  const { data: memberContent } = useQuery({
    queryKey: ["institution-member-content", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data: members } = await (supabase as any)
        .from("institution_members")
        .select("user_id")
        .eq("institution_id", institutionId)
        .eq("status", "active");

      const ids = (members || []).map((m: any) => m.user_id);
      if (ids.length === 0) return [];

      const { data } = await (supabase as any)
        .from("content")
        .select("id, title, thumbnail_url, content_type, creator_id, created_at, profiles:creator_id(username, full_name, avatar_url)")
        .in("creator_id", ids)
        .eq("is_draft", false)
        .order("created_at", { ascending: false })
        .limit(24);
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Ranking interno
  const { data: ranking, isLoading: rankingLoading } = useQuery({
    queryKey: ["institution-ranking", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await (supabase as any).rpc("get_institution_xp_ranking", {
        _institution_id: institutionId,
        _limit: 50,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Actividad reciente (XP recientes de los miembros en cursos/rutas de la institución)
  const { data: activity } = useQuery({
    queryKey: ["institution-activity", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];

      const { data: pathLinks } = await (supabase as any)
        .from("learning_path_institutions")
        .select("path_id")
        .eq("institution_id", institutionId);
      const { data: courseLinks } = await (supabase as any)
        .from("course_routes")
        .select("path_id, courses!inner(id, course_institutions!inner(institution_id))")
        .eq("courses.course_institutions.institution_id", institutionId);

      const pathIds = [
        ...((pathLinks || []).map((r: any) => r.path_id)),
        ...((courseLinks || []).map((r: any) => r.path_id)),
      ];

      if (pathIds.length === 0) return [];

      const { data } = await (supabase as any)
        .from("user_xp_log")
        .select("id, user_id, action_type, xp_amount, created_at, path_id, profiles:user_id(username, full_name, avatar_url)")
        .in("path_id", pathIds)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!institutionId,
  });

  useEffect(() => {
    if (institution) document.title = `${institution.name} · Sedefy`;
  }, [institution]);

  const handleShare = async () => {
    const url = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "¡Enlace copiado!", description: url });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Error", description: "No se pudo copiar el enlace", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!institution) return <NotFound />;

  const actionLabel = (action: string) => {
    if (action === "path_complete") return "completó una ruta";
    if (action === "quiz_complete") return "aprobó un quiz";
    if (action === "game_complete") return "completó un juego";
    if (action === "path_creation") return "creó una ruta";
    if (action === "content_upload") return "publicó contenido";
    return action.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen pb-12">
      <Helmet>
        <title>{institution.name} · Sedefy</title>
        <meta name="description" content={institution.description || `Perfil público de ${institution.name} en Sedefy`} />
        <link rel="canonical" href={`${window.location.origin}/${slug}`} />
        <meta property="og:title" content={`${institution.name} · Sedefy`} />
        <meta property="og:description" content={institution.description || ""} />
        {institution.cover_url && <meta property="og:image" content={institution.cover_url} />}
      </Helmet>

      {/* Cover */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 to-secondary/20">
        {institution.cover_url && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${institution.cover_url})` }}
          />
        )}
      </div>

      <div className="container -mt-16 md:-mt-20 space-y-6">
        {/* Header */}
        <div className="relative bg-card rounded-lg border shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-lg border-4 border-background bg-muted overflow-hidden">
                {institution.logo_url ? (
                  <img
                    src={institution.logo_url}
                    alt={institution.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={128}
                    height={128}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-14 h-14 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{institution.name}</h1>
                  {institution.description && (
                    <p className="text-muted-foreground mt-1">{institution.description}</p>
                  )}
                </div>
                <Button onClick={handleShare} variant="outline" className="gap-2">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                  Compartir
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {(institution.city || institution.country) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span>{[institution.city, institution.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" />
                  <span className="font-mono">sedefy.com/{slug}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="contenido-academico" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="contenido-academico" className="gap-1.5">
              <BookOpen className="w-4 h-4" /> Cursos y Rutas
            </TabsTrigger>
            <TabsTrigger value="miembros-contenido" className="gap-1.5">
              <BookOpen className="w-4 h-4" /> Contenido
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1.5">
              <Trophy className="w-4 h-4" /> Ranking
            </TabsTrigger>
            <TabsTrigger value="actividad" className="gap-1.5">
              <Activity className="w-4 h-4" /> Actividad
            </TabsTrigger>
          </TabsList>

          {/* Cursos y rutas */}
          <TabsContent value="contenido-academico" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cursos</CardTitle>
                <CardDescription>Cursos institucionales</CardDescription>
              </CardHeader>
              <CardContent>
                {coursesAndPaths?.courses && coursesAndPaths.courses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coursesAndPaths.courses.map((c: any) => (
                      <Link
                        to={`/courses/${c.id}`}
                        key={c.id}
                        className="block rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {c.cover_url ? (
                          <img
                            src={c.cover_url}
                            alt={c.title}
                            className="w-full h-32 object-cover"
                            loading="lazy"
                            width={400}
                            height={128}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="font-semibold line-clamp-1">{c.title}</p>
                          {c.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin cursos institucionales todavía</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rutas de aprendizaje</CardTitle>
              </CardHeader>
              <CardContent>
                {coursesAndPaths?.paths && coursesAndPaths.paths.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coursesAndPaths.paths.map((p: any) => (
                      <Link
                        to={`/learning-paths/view/${p.id}`}
                        key={p.id}
                        className="block rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {p.cover_url ? (
                          <img
                            src={p.cover_url}
                            alt={p.title}
                            className="w-full h-32 object-cover"
                            loading="lazy"
                            width={400}
                            height={128}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold line-clamp-1">{p.title}</p>
                            <Badge variant="outline" className="text-[10px]">{p.path_type || "ruta"}</Badge>
                          </div>
                          {p.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin rutas institucionales todavía</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contenido de miembros */}
          <TabsContent value="miembros-contenido">
            <Card>
              <CardHeader>
                <CardTitle>Contenido reciente de miembros</CardTitle>
              </CardHeader>
              <CardContent>
                {memberContent && memberContent.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {memberContent.map((c: any) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => navigate(`/sedetok?content=${c.id}`)}
                        className="text-left rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {c.thumbnail_url ? (
                          <img
                            src={c.thumbnail_url}
                            alt={c.title}
                            className="w-full h-32 object-cover"
                            loading="lazy"
                            width={300}
                            height={128}
                          />
                        ) : (
                          <div className="w-full h-32 bg-muted" />
                        )}
                        <div className="p-2">
                          <p className="text-sm font-medium line-clamp-2">{c.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.profiles?.full_name || c.profiles?.username}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin contenido publicado por miembros</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ranking */}
          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle>Ranking interno por XP</CardTitle>
                <CardDescription>Puntos obtenidos en cursos y rutas de esta institución</CardDescription>
              </CardHeader>
              <CardContent>
                {rankingLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : ranking && ranking.length > 0 ? (
                  <div className="space-y-2">
                    {ranking.map((r: any, idx: number) => (
                      <div
                        key={r.user_id}
                        className="flex items-center gap-3 p-3 rounded border hover:bg-muted/40 transition-colors"
                      >
                        <div className="w-7 text-center font-bold text-muted-foreground">{idx + 1}</div>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={r.avatar_url} />
                          <AvatarFallback>{(r.full_name || r.username || "U")[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.full_name || r.username || "Usuario"}</p>
                          <p className="text-xs text-muted-foreground capitalize">{r.member_role}</p>
                        </div>
                        <Badge variant="secondary" className="font-semibold">{Number(r.xp || 0).toLocaleString()} XP</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Aún no hay XP registrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actividad */}
          <TabsContent value="actividad">
            <Card>
              <CardHeader>
                <CardTitle>Actividad reciente</CardTitle>
              </CardHeader>
              <CardContent>
                {activity && activity.length > 0 ? (
                  <div className="space-y-2">
                    {activity.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded border">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={a.profiles?.avatar_url} />
                          <AvatarFallback>{(a.profiles?.full_name || a.profiles?.username || "U")[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{a.profiles?.full_name || a.profiles?.username || "Usuario"}</span>
                            <span className="text-muted-foreground"> · {actionLabel(a.action_type)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(a.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                          </p>
                        </div>
                        <Badge variant="outline">+{a.xp_amount} XP</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin actividad reciente</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
