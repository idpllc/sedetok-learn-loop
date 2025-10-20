import { useState, useEffect } from "react";
import { X, Search, Clock, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { subjects } from "@/lib/subjects";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const getSuggestedTopics = (gradeLevel?: string) => {
  // Sugerencias basadas en el nivel educativo
  const basicTopics = [
    "Matemáticas básicas",
    "Lectura",
    "Ciencias naturales",
    "Geografía",
  ];
  
  const intermediateTopics = [
    "Álgebra",
    "Literatura",
    "Química",
    "Historia mundial",
    "Biología",
  ];
  
  const advancedTopics = [
    "Cálculo",
    "Física avanzada",
    "Programación",
    "Filosofía",
    "Economía",
  ];

  const universityTopics = [
    "Investigación científica",
    "Análisis de datos",
    "Metodología",
    "Tesis",
    "Innovación",
  ];

  // Agregar algunas materias del sistema
  const systemSubjects = subjects.slice(0, 6).map(s => typeof s === 'string' ? s : s.label);

  if (gradeLevel === "universidad" || gradeLevel === "posgrado") {
    return [...universityTopics, ...systemSubjects];
  } else if (gradeLevel === "media" || gradeLevel === "libre") {
    return [...advancedTopics, ...systemSubjects];
  } else if (gradeLevel === "basica_secundaria") {
    return [...intermediateTopics, ...systemSubjects];
  } else {
    return [...basicTopics, ...systemSubjects];
  }
};

export const SearchModal = ({ isOpen, onClose, initialQuery = "" }: SearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const navigate = useNavigate();
  const { history, loading, addSearch, deleteSearch, clearHistory } = useSearchHistory();
  const { user } = useAuth();
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [gradeLevel, setGradeLevel] = useState<string | undefined>();

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("nivel_educativo")
          .eq("id", user.id)
          .single();
        
        if (data) {
          setGradeLevel(data.nivel_educativo);
        }
      }
    };

    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && gradeLevel) {
      const topics = getSuggestedTopics(gradeLevel);
      setSuggestedTopics(topics);
    }
  }, [isOpen, gradeLevel]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    await addSearch(query);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    onClose();
    setSearchQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleHistoryClick = (query: string) => {
    handleSearch(query);
  };

  const handleSuggestionClick = (topic: string) => {
    handleSearch(topic);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Panel */}
      <div className="relative ml-auto w-full max-w-md bg-card border-l border-border shadow-2xl animate-slide-in-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <form onSubmit={handleSubmit} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar contenido..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                  autoFocus
                />
              </div>
            </form>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            {/* Recent Searches */}
            {history.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Búsquedas recientes</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="text-xs h-auto p-1 text-muted-foreground hover:text-foreground"
                  >
                    Borrar todo
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                      onClick={() => handleHistoryClick(item.query)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{item.query}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSearch(item.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Topics */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Podría interesarte</span>
              </div>
              
              <div className="space-y-2">
                {suggestedTopics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(topic)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                  >
                    <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">{topic}</span>
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
