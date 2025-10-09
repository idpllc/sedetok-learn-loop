import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Send, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  
  const { comments, isLoading, addComment, deleteComment } = useComments(contentId, handleCommentAdded);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment({ comment_text: newComment });
    setNewComment("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <SheetTitle className="text-base">Información</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Tabs defaultValue="info" className="h-[calc(100%-60px)]">
          <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10">
            <TabsTrigger value="info">Descripción</TabsTrigger>
            <TabsTrigger value="comments">Comentarios ({commentsCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="h-[calc(100%-40px)] m-0">
            <ScrollArea className="h-full px-4 py-4">
              <div className="space-y-4">
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
                  <div className="flex flex-wrap gap-2 pt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="h-[calc(100%-40px)] m-0">
            <div className="flex flex-col h-full">
              {/* Comments list */}
              <ScrollArea className="flex-1 px-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando comentarios...</div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay comentarios aún. ¡Sé el primero en comentar!
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
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
              <div className="p-4 border-t">
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
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
