import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DescriptionSheetProps {
  title: string;
  description: string;
  creator: string;
  institution?: string;
  tags: string[];
  creatorAvatar?: string;
  questionsCount?: number;
  difficulty?: string;
  contentType?: string;
}

export function DescriptionSheet({ 
  title, 
  description, 
  creator, 
  institution, 
  tags,
  creatorAvatar,
  questionsCount,
  difficulty,
  contentType
}: DescriptionSheetProps) {
  const truncatedDescription = description.length > 80 
    ? `${description.slice(0, 80)}...` 
    : description;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="text-sm text-white/90 text-left">
          {truncatedDescription}
          {description.length > 80 && (
            <span className="ml-1 font-semibold">más</span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={creatorAvatar} />
              <AvatarFallback>{creator.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{creator}</div>
              {institution && (
                <div className="text-sm text-muted-foreground">{institution}</div>
              )}
            </div>
          </div>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          <div>
            <SheetTitle className="text-lg mb-2">{title}</SheetTitle>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{description}</p>
            
            {/* Quiz metadata badges */}
            {contentType === 'quiz' && (questionsCount || difficulty) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {questionsCount && (
                  <Badge variant="secondary" className="text-xs">
                    📝 {questionsCount} {questionsCount === 1 ? 'Pregunta' : 'Preguntas'}
                  </Badge>
                )}
                {difficulty && (
                  <Badge variant="secondary" className="text-xs">
                    {difficulty === 'basico' ? '⭐ Básico' : 
                     difficulty === 'intermedio' ? '⭐⭐ Intermedio' : 
                     '⭐⭐⭐ Avanzado'}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
