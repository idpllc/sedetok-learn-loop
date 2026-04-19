import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Circle, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getDisplayName } from "@/lib/displayName";

interface PathEnrollmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathId: string;
  pathTitle: string;
  pathType?: "ruta" | "curso";
}

export const PathEnrollmentsDialog = ({
  open,
  onOpenChange,
  pathId,
  pathTitle,
  pathType = "ruta",
}: PathEnrollmentsDialogProps) => {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const isCourse = pathType === "curso";
  const entityLabel = isCourse ? "curso" : "ruta";

  // For courses: get all child path IDs first
  const { data: coursePathIds } = useQuery({
    queryKey: ["course-path-ids", pathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_routes")
        .select("path_id")
        .eq("course_id", pathId);
      if (error) throw error;
      return (data || []).map((r: any) => r.path_id).filter(Boolean);
    },
    enabled: open && isCourse && !!pathId,
  });

  const targetPathIds = isCourse ? (coursePathIds || []) : [pathId];

  // Get all enrollments (for course: across all child paths, deduped per user)
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["path-enrollments", pathId, isCourse, targetPathIds.join(",")],
    queryFn: async () => {
      if (targetPathIds.length === 0) return [];
      const { data, error } = await supabase
        .from("path_enrollments")
        .select("*")
        .in("path_id", targetPathIds)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      if (!isCourse) return data;
      // Dedupe by user_id, keep earliest enrollment date
      const map = new Map<string, any>();
      for (const e of data || []) {
        const existing = map.get(e.user_id);
        if (!existing || new Date(e.enrolled_at) < new Date(existing.enrolled_at)) {
          map.set(e.user_id, e);
        }
      }
      return Array.from(map.values());
    },
    enabled: open && (isCourse ? !!coursePathIds : !!pathId),
  });

  // Get profiles for enrolled users
  const userIds = enrollments?.map((e: any) => e.user_id) || [];
  const { data: profiles } = useQuery({
    queryKey: ["enrolled-profiles", pathId, userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, institution")
        .in("id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: open && userIds.length > 0,
  });

  // Get institution memberships for enrolled users
  const { data: memberships } = useQuery({
    queryKey: ["enrolled-memberships", pathId, userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("institution_members")
        .select("user_id, member_role, status, institution:institution_id (id, name, logo_url)")
        .in("user_id", userIds)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: open && userIds.length > 0,
  });

  const membershipMap: Record<string, any> = {};
  (memberships || []).forEach((m: any) => {
    membershipMap[m.user_id] = m;
  });

  // Get path content items
  const { data: pathContent } = useQuery({
    queryKey: ["path-content-for-progress", pathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_path_content")
        .select(`
          id, order_index, section_name, is_required,
          content:content_id (id, title, content_type),
          quiz:quiz_id (id, title),
          game:game_id (id, title)
        `)
        .eq("path_id", pathId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: open && !!pathId,
  });

  // Get all progress records for this path from all enrolled users
  const { data: allProgress } = useQuery({
    queryKey: ["all-users-path-progress", pathId, userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("user_path_progress")
        .select("*")
        .eq("path_id", pathId)
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: open && userIds.length > 0,
  });

  const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
  const totalItems = pathContent?.length || 0;

  const getUserProgress = (userId: string) => {
    const userProg = (allProgress || []).filter((p: any) => p.user_id === userId && p.completed);
    return userProg;
  };

  const getUserCompletionCount = (userId: string) => {
    return getUserProgress(userId).length;
  };

  if (enrollmentsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando...</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Avance de Estudiantes
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{pathTitle}</p>
        </DialogHeader>

        {(!enrollments || enrollments.length === 0) ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Ningún estudiante ha empezado esta ruta aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {enrollments.length} estudiante{enrollments.length !== 1 ? "s" : ""} inscrito{enrollments.length !== 1 ? "s" : ""}
            </p>

            {enrollments.map((enrollment: any) => {
              const profile = profileMap[enrollment.user_id];
              const membership = membershipMap[enrollment.user_id];
              const completed = getUserCompletionCount(enrollment.user_id);
              const percentage = totalItems > 0 ? (completed / totalItems) * 100 : 0;
              const isExpanded = expandedUser === enrollment.user_id;
              const userProgressItems = getUserProgress(enrollment.user_id);

              return (
                <Card key={enrollment.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setExpandedUser(isExpanded ? null : enrollment.user_id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback>
                          {(profile?.full_name || profile?.username || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {getDisplayName(profile)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Inscrito: {new Date(enrollment.enrolled_at).toLocaleDateString("es")}
                        </p>
                        {membership?.institution && (
                          <p className="text-xs text-muted-foreground truncate">
                            🏫 {(membership.institution as any).name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={percentage === 100 ? "default" : "secondary"} className="text-xs">
                          {completed}/{totalItems}
                        </Badge>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(0)}% completado</p>
                    </div>

                    {isExpanded && pathContent && (
                      <div className="mt-4 space-y-2 border-t pt-3">
                        {pathContent.map((item: any) => {
                          const itemId = item.content?.id || item.quiz?.id || item.game?.id;
                          const itemTitle = item.content?.title || item.quiz?.title || item.game?.title || "Sin título";
                          const itemType = item.content ? item.content.content_type : item.quiz ? "quiz" : "juego";
                          const isCompleted = userProgressItems.some(
                            (p: any) => p.content_id === item.content?.id || p.quiz_id === item.quiz?.id
                          );

                          return (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <span className={isCompleted ? "text-foreground" : "text-muted-foreground"}>
                                {itemTitle}
                              </span>
                              <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                                {itemType}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
