import { useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { useComments } from "@/hooks/useComments";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface CommentsSheetProps {
  contentId: string;
  commentsCount: number;
}

export const CommentsSheet = ({ contentId, commentsCount }: CommentsSheetProps) => {
  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const { awardXP } = useXP();
  
  const handleCommentAdded = () => {
    awardXP(contentId, 'comment');
  };
  
  const { comments, isLoading, addComment, deleteComment } = useComments(contentId, handleCommentAdded);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment({ comment_text: newComment });
    setNewComment("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex flex-col items-center gap-1 transition-all hover:scale-110">
          <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <MessageCircle className="w-6 h-6 text-black" />
          </div>
          <span className="text-xs font-semibold text-white">{commentsCount}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] bg-background">
        <SheetHeader>
          <SheetTitle>Comentarios ({commentsCount})</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100%-60px)] mt-4">
          {/* Comments list */}
          <ScrollArea className="flex-1 pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando comentarios...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay comentarios aún. ¡Sé el primero en comentar!
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {comment.profiles?.avatar_url ? (
                          <img
                            src={comment.profiles.avatar_url}
                            alt={comment.profiles.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-primary font-semibold">
                            {comment.profiles?.username?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">
                            {comment.profiles?.full_name || comment.profiles?.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>
                        {user?.id === comment.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteComment(comment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="mt-2 text-sm">{comment.comment_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Add comment */}
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                size="icon"
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
