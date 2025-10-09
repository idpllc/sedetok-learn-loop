import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Send, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useComments } from "@/hooks/useComments";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";

interface ContentInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  title: string;
  description: string;
  creator: string;
  institution?: string;
  tags: string[];
  creatorAvatar?: string;
  commentsCount: number;
}

export function ContentInfoSheet({ 
  open,
  onOpenChange,
  contentId,
  title, 
  description, 
  creator, 
  institution, 
  tags,
  creatorAvatar,
  commentsCount
}: ContentInfoSheetProps) {
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const { awardXP } = useXP();
  
  const handleCommentAdded = () => {
    awardXP(contentId, 'comment');
  };
  
  const { comments, isLoading, addComment, deleteComment } = useComments(contentId, false, handleCommentAdded);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment({ comment_text: newComment });
    setNewComment("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 flex flex-col">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">Información</SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Scrollable content area */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-6 py-4">
              {/* Creator info */}
              <div className="flex items-center gap-3 pb-4 border-b">
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
              
              {/* Title and description */}
              <div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{description}</p>
              </div>
              
              {/* Tags */}
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Comments section */}
              <div className="pt-4 border-t">
                <h4 className="text-base font-semibold mb-4">Comentarios ({commentsCount})</h4>
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
              </div>
            </div>
          </ScrollArea>

          {/* Add comment - fixed at bottom */}
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t bg-background">
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none flex-1 min-h-[60px] max-h-[100px]"
                rows={1}
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
                className="flex-shrink-0 h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
