import { useState } from "react";
import { Search as SearchIcon, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { useContent, useUserLikes, useUserSaves } from "@/hooks/useContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "@/integrations/supabase/types";
import { Heart, MessageCircle, Bookmark, Eye, Play, FileText, ClipboardCheck, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ContentType = Database["public"]["Enums"]["content_type"];

const Search = () => {
  const navigate = useNavigate();
  const { content, isLoading, likeMutation, saveMutation } = useContent();
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ContentType | "all">("all");

  const contentTypes = [
    { id: "all" as const, label: "Todo", icon: "🎯" },
    { id: "video" as ContentType, label: "Videos", icon: "🎥" },
    { id: "document" as ContentType, label: "Documentos", icon: "📄" },
    { id: "quiz" as ContentType, label: "Quizzes", icon: "📝" },
  ];

  const filteredContent = content?.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = selectedType === "all" || item.content_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const getContentIcon = (type: ContentType) => {
    switch (type) {
      case "video":
        return <Play className="w-5 h-5" />;
      case "document":
        return <FileText className="w-5 h-5" />;
      case "quiz":
        return <ClipboardCheck className="w-5 h-5" />;
    }
  };

  const handleLike = (contentId: string, isLiked: boolean) => {
    likeMutation.mutate({ contentId, isLiked });
  };

  const handleSave = (contentId: string, isSaved: boolean) => {
    saveMutation.mutate({ contentId, isSaved });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Explorar Contenido</h1>
          </div>
          
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por título, descripción o etiquetas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {contentTypes.map((type) => (
              <Badge
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedType(type.id)}
              >
                <span className="mr-1">{type.icon}</span>
                {type.label}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredContent && filteredContent.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredContent.length} {filteredContent.length === 1 ? "resultado" : "resultados"}
              </p>
            </div>
            {filteredContent.map((item) => {
              const isLiked = likes.has(item.id);
              const isSaved = saves.has(item.id);
              const profile = item.profiles as any;
              
              return (
                <Card 
                  key={item.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/?content=${item.id}`)}
                >
                  <CardContent className="p-0">
                    {/* Thumbnail/Preview */}
                    <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20">
                      {item.thumbnail_url ? (
                        <img 
                          src={item.thumbnail_url} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-5xl mb-2">
                              {item.content_type === 'video' ? '🎥' : item.content_type === 'document' ? '📄' : '📝'}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Content type badge */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-primary text-primary-foreground gap-1">
                          {getContentIcon(item.content_type)}
                          <span className="capitalize">{item.content_type === 'video' ? 'Video' : item.content_type === 'document' ? 'Documento' : 'Quiz'}</span>
                        </Badge>
                      </div>

                      {/* Category badge */}
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="capitalize">
                          {item.category}
                        </Badge>
                      </div>
                    </div>

                    {/* Content Info */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg mb-1 line-clamp-2">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        )}
                      </div>

                      {/* Creator info */}
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold">{profile?.username?.[0]?.toUpperCase() || 'U'}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {profile?.username || 'Usuario'}
                          {profile?.institution && <span className="text-xs"> · {profile.institution}</span>}
                        </span>
                        {profile?.is_verified && <span className="text-xs">✓</span>}
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                            <span>{item.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{item.comments_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{item.views_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Share2 className="w-4 h-4" />
                            <span>{item.shares_count || 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(item.id, isLiked);
                            }}
                          >
                            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSave(item.id, isSaved);
                            }}
                          >
                            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No se encontraron resultados</h3>
            <p className="text-muted-foreground max-w-sm">
              {searchQuery 
                ? "Intenta con otros términos de búsqueda o cambia los filtros"
                : "No hay contenido disponible en este momento"}
            </p>
            {(searchQuery || selectedType !== "all") && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedType("all");
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Search;
