import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import { Skeleton } from "@/components/ui/skeleton";

const Courses = () => {
  const { user } = useAuth();
  const [courseFilter, setcourseFilter] = useState<'all' | 'created'>('all');
  const { courses, isLoading } = useCourses(courseFilter === 'created' ? 'created' : undefined);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCourses = courses?.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/" aria-label="Volver al inicio">
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                </Button>
                <h1 className="text-2xl font-bold">Cursos</h1>
              </div>
              {user && (
                <Button asChild>
                  <Link to="/courses/create" aria-label="Crear Curso">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Curso
                  </Link>
                </Button>
              )}
            </div>
            
            <div className="flex gap-2 mb-3">
              <Badge
                variant={courseFilter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setcourseFilter('all')}
              >
                Todos
              </Badge>
              {user && (
                <Badge
                  variant={courseFilter === 'created' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setcourseFilter('created')}
                >
                  Mis Cursos
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cursos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : filteredCourses && filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((course) => (
                <Link key={course.id} to={`/courses/${course.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                    {course.cover_url && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={course.cover_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {course.category && (
                          <Badge variant="secondary" className="text-xs">
                            {course.category}
                          </Badge>
                        )}
                        {course.grade_level && (
                          <Badge variant="outline" className="text-xs">
                            {course.grade_level}
                          </Badge>
                        )}
                        {course.total_xp > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            ⚡ {course.total_xp} XP
                          </span>
                        )}
                        {course.status === "published" && (
                          <Badge className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                            Publicado
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">No hay cursos aún</h3>
              <p className="text-muted-foreground mb-4">
                {user ? "Crea tu primer curso" : "No hay cursos disponibles"}
              </p>
              {user && (
                <Button asChild>
                  <Link to="/courses/create" aria-label="Crear Curso">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Curso
                  </Link>
                </Button>
              )}
            </div>
          )}
        </main>
        
        <BottomNav />
      </div>
    </>
  );
};

export default Courses;
