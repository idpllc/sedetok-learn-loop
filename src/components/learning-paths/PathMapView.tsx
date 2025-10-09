import { useNavigate } from "react-router-dom";
import { Book, Video, FileText, Brain, Star, Lock, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PathMapViewProps {
  pathTitle: string;
  pathDescription?: string;
  contents: any[];
  completedIds?: Set<string>;
  onContentClick: (contentId: string, index: number) => void;
}

const getContentIcon = (contentType: string, isCompleted: boolean) => {
  const iconClass = cn(
    "w-6 h-6 transition-colors",
    isCompleted ? "text-primary" : "text-muted-foreground"
  );
  
  switch (contentType) {
    case "Video":
      return <Video className={iconClass} />;
    case "Documento":
      return <FileText className={iconClass} />;
    case "Lectura":
      return <Book className={iconClass} />;
    case "Quiz":
      return <Brain className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
};

export const PathMapView = ({ 
  pathTitle, 
  pathDescription,
  contents, 
  completedIds = new Set(),
  onContentClick 
}: PathMapViewProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-24">
      {/* Header with path title */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-primary to-primary/95 text-primary-foreground shadow-lg">
        <div className="max-w-md mx-auto px-4 py-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">RUTA DE APRENDIZAJE</p>
          <h1 className="text-2xl font-bold">{pathTitle}</h1>
          {pathDescription && (
            <p className="text-sm opacity-90 mt-2 line-clamp-2">{pathDescription}</p>
          )}
        </div>
      </div>

      {/* Path Map */}
      <div className="relative max-w-md mx-auto px-4">
        {/* Vertical connecting line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-border -translate-x-1/2 z-0" />

        {/* Content nodes */}
        <div className="relative z-10 space-y-8">
          {contents.map((content, index) => {
            const isCompleted = completedIds.has(content.id);
            const isFirst = index === 0;
            const isLocked = false; // You can add logic for locked content
            const progress = Math.floor((completedIds.size / contents.length) * 100);

            return (
              <div
                key={content.id}
                className={cn(
                  "flex items-center gap-4",
                  index % 2 === 0 ? "flex-row" : "flex-row-reverse"
                )}
              >
                {/* Spacer for alternating layout */}
                <div className="flex-1" />

                {/* Content node */}
                <button
                  onClick={() => !isLocked && onContentClick(content.id, index)}
                  disabled={isLocked}
                  className={cn(
                    "relative group transition-all duration-300",
                    isLocked && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {/* Node circle */}
                  <div
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border-4",
                      isCompleted
                        ? "bg-primary border-primary scale-105 shadow-primary/50"
                        : isFirst
                        ? "bg-muted border-primary/50 animate-pulse"
                        : "bg-muted border-border hover:scale-110"
                    )}
                  >
                    {isLocked ? (
                      <Lock className="w-8 h-8 text-muted-foreground" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
                    ) : (
                      getContentIcon(content.content_type, false)
                    )}
                  </div>

                  {/* Start badge for first uncompleted item */}
                  {isFirst && !isCompleted && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-background border-2 border-primary rounded-full px-3 py-1 text-xs font-bold text-primary whitespace-nowrap flex items-center gap-1 shadow-md">
                      <Play className="w-3 h-3" />
                      START
                    </div>
                  )}

                  {/* Content type badge */}
                  {!isFirst && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-sm">
                      {content.content_type}
                    </div>
                  )}
                </button>

                {/* Content info */}
                <div
                  className={cn(
                    "flex-1 text-sm",
                    index % 2 === 0 ? "text-left" : "text-right"
                  )}
                >
                  <p className="font-medium line-clamp-2">{content.title}</p>
                  {content.description && (
                    <p className="text-muted-foreground text-xs line-clamp-1 mt-1">
                      {content.description}
                    </p>
                  )}
                  {/* Category and Grade Level */}
                  <div className={cn(
                    "flex gap-2 mt-2 flex-wrap",
                    index % 2 === 0 ? "justify-start" : "justify-end"
                  )}>
                    {content.category && (
                      <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                        {content.category}
                      </span>
                    )}
                    {content.grade_level && (
                      <span className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                        {content.grade_level}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress indicator at bottom */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-card border rounded-full px-6 py-3 shadow-sm">
            <Star className="w-5 h-5 text-primary fill-primary" />
            <span className="font-bold text-lg">
              {completedIds.size}/{contents.length}
            </span>
            <span className="text-sm text-muted-foreground">completadas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
