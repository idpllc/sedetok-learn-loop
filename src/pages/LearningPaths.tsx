import { useState } from "react";

import { Link } from "react-router-dom";
import { Plus, Search, Filter, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { PathCard } from "@/components/learning-paths/PathCard";
import { PathFilters } from "@/components/learning-paths/PathFilters";
import { Skeleton } from "@/components/ui/skeleton";

const LearningPaths = () => {
  
  const { user } = useAuth();
  const [pathFilter, setPathFilter] = useState<'all' | 'created' | 'taken'>('all');
  const { paths, isLoading } = useLearningPaths(user?.id, pathFilter);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    status: "",
    visibility: "",
  });

  const filteredPaths = paths?.filter((path) => {
    const matchesSearch = path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      path.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = !filters.subject || (path.subject || path.category) === filters.subject;
    const matchesGrade = !filters.grade || path.grade_level === filters.grade;
    const matchesStatus = !filters.status || (path.status || 'draft') === filters.status;
    const matchesVisibility = !filters.visibility || 
      (filters.visibility === "public" ? path.is_public : !path.is_public);
    
    return matchesSearch && matchesSubject && matchesGrade && matchesStatus && matchesVisibility;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/" aria-label="Volver al inicio">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Mis Rutas de Aprendizaje</h1>
            </div>
            <Button asChild>
              <Link to="/learning-paths/create" aria-label="Crear Ruta">
                <Plus className="w-4 h-4 mr-2" />
                Crear Ruta
              </Link>
            </Button>
          </div>
          
          <div className="flex gap-2 mb-3">
            <Badge
              variant={pathFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setPathFilter('all')}
            >
              Todas
            </Badge>
            <Badge
              variant={pathFilter === 'created' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setPathFilter('created')}
            >
              Mis Rutas
            </Badge>
            <Badge
              variant={pathFilter === 'taken' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setPathFilter('taken')}
            >
              En Progreso
            </Badge>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar rutas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {showFilters && (
        <PathFilters filters={filters} onFiltersChange={setFilters} />
      )}

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredPaths && filteredPaths.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPaths.map((path) => (
              <PathCard key={path.id} path={path} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold mb-2">No hay rutas aún</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primera ruta de aprendizaje
            </p>
            <Button asChild>
              <Link to="/learning-paths/create" aria-label="Crear Ruta">
                <Plus className="w-4 h-4 mr-2" />
                Crear Ruta
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default LearningPaths;
