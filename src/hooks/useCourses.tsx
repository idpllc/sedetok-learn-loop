import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type CategoryType = Database["public"]["Enums"]["category_type"];
type GradeLevel = Database["public"]["Enums"]["grade_level"];
type TipoAprendizaje = Database["public"]["Enums"]["tipo_aprendizaje"];

interface CourseData {
  title: string;
  description?: string;
  cover_url?: string;
  category: CategoryType;
  grade_level: GradeLevel;
  learning_types?: TipoAprendizaje[];
  tags?: string[];
  is_public?: boolean;
  status?: string;
  institutions?: string[];
}

interface CourseLevelData {
  name: string;
  description?: string;
  order_index: number;
  routes: CourseRouteData[];
}

interface CourseRouteData {
  path_id: string;
  order_index: number;
  is_required?: boolean;
}

export const useCourses = (filter?: "created" | "all") => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const coursesQuery = useQuery({
    queryKey: ["courses", filter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "created" && user) {
        query = query.eq("creator_id", user.id);
      } else if (!user) {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createCourse = useMutation({
    mutationFn: async ({ 
      courseData, 
      levels 
    }: { 
      courseData: CourseData; 
      levels: CourseLevelData[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Extract institutions from courseData
      const { institutions, ...courseDataWithoutInstitutions } = courseData;

      // Create course
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert([{
          ...courseDataWithoutInstitutions,
          creator_id: user.id,
        }])
        .select()
        .single();

      if (courseError) throw courseError;

      // Add levels and routes to course
      if (levels.length > 0) {
        for (const levelData of levels) {
          // Create level
          const { data: level, error: levelError } = await supabase
            .from("course_levels")
            .insert([{
              course_id: course.id,
              name: levelData.name,
              description: levelData.description,
              order_index: levelData.order_index,
            }])
            .select()
            .single();

          if (levelError) throw levelError;

          // Add routes to level
          if (levelData.routes.length > 0) {
            const routeInserts = levelData.routes.map(route => ({
              course_id: course.id,
              level_id: level.id,
              ...route
            }));

            const { error: routesError } = await supabase
              .from("course_routes")
              .insert(routeInserts);

            if (routesError) throw routesError;
          }
        }
      }

      // Add institutions if course is private
      if (!courseData.is_public && institutions && institutions.length > 0) {
        const institutionInserts = institutions.map(institutionId => ({
          course_id: course.id,
          institution_id: institutionId
        }));

        const { error: institutionsError } = await supabase
          .from("course_institutions")
          .insert(institutionInserts);

        if (institutionsError) throw institutionsError;
      }

      return course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "¡Curso creado!",
        description: "Tu curso ha sido creado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ 
      courseId, 
      courseData 
    }: { 
      courseId: string; 
      courseData: Partial<CourseData>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("courses")
        .update(courseData)
        .eq("id", courseId)
        .eq("creator_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "Curso actualizado",
        description: "Los cambios se guardaron correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId)
        .eq("creator_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "Curso eliminado",
        description: "El curso ha sido eliminado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    courses: coursesQuery.data,
    isLoading: coursesQuery.isLoading,
    createCourse,
    updateCourse,
    deleteCourse,
  };
};

export const useCourseRoutes = (courseId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const routesQuery = useQuery({
    queryKey: ["course-routes", courseId],
    queryFn: async () => {
      if (!courseId) return [];

      const { data, error } = await supabase
        .from("course_routes")
        .select(`
          *,
          learning_paths(*)
        `)
        .eq("course_id", courseId)
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const addRoute = useMutation({
    mutationFn: async (routeData: CourseRouteData & { course_id: string }) => {
      const { error } = await supabase
        .from("course_routes")
        .insert([routeData]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-routes"] });
    },
  });

  const removeRoute = useMutation({
    mutationFn: async (routeId: string) => {
      const { error } = await supabase
        .from("course_routes")
        .delete()
        .eq("id", routeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-routes"] });
    },
  });

  return {
    routes: routesQuery.data,
    isLoading: routesQuery.isLoading,
    addRoute,
    removeRoute,
  };
};
