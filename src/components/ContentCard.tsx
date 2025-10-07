import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ContentCardProps {
  id: string;
  title: string;
  creator: string;
  institution?: string;
  tags: string[];
  category: string;
  thumbnail?: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  grade: string;
}

export const ContentCard = ({
  title,
  creator,
  institution,
  tags,
  category,
  thumbnail,
  likes: initialLikes,
  comments: initialComments,
  grade,
}: ContentCardProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(initialLikes);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  return (
    <div className="relative h-screen w-full snap-start snap-always flex items-center justify-center bg-muted/50">
      {/* Thumbnail/Video container */}
      <div className="relative w-full max-w-md h-[85vh] bg-card rounded-3xl overflow-hidden shadow-[var(--shadow-card)]">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground">Contenido educativo</p>
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-transparent to-transparent pointer-events-none" />

        {/* Category badge */}
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-primary text-primary-foreground font-semibold">{category}</Badge>
        </div>

        {/* Grade badge */}
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="secondary" className="font-semibold">{grade}</Badge>
        </div>

        {/* Content info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">{title}</h2>
              <p className="text-sm text-foreground/80">
                {creator}
                {institution && <span className="text-muted-foreground"> · {institution}</span>}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons - floating on the right */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-4 z-20">
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              liked ? 'bg-destructive' : 'bg-background/90'
            } backdrop-blur-sm`}>
              <Heart 
                className={`w-6 h-6 ${liked ? 'fill-primary-foreground text-primary-foreground' : 'text-foreground'}`}
              />
            </div>
            <span className="text-xs font-semibold text-foreground">{likes}</span>
          </button>

          <button className="flex flex-col items-center gap-1 transition-all hover:scale-110">
            <div className="w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-xs font-semibold text-foreground">{initialComments}</span>
          </button>

          <button 
            onClick={() => setSaved(!saved)}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              saved ? 'bg-accent' : 'bg-background/90'
            } backdrop-blur-sm`}>
              <Bookmark 
                className={`w-6 h-6 ${saved ? 'fill-accent-foreground text-accent-foreground' : 'text-foreground'}`}
              />
            </div>
          </button>

          <button className="flex flex-col items-center gap-1 transition-all hover:scale-110">
            <div className="w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center">
              <Share2 className="w-6 h-6 text-foreground" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
