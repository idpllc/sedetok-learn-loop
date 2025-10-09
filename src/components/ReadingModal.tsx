import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRef, useEffect } from "react";

interface ReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onReadComplete?: () => void;
}

export const ReadingModal = ({ isOpen, onClose, title, content, onReadComplete }: ReadingModalProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasReadRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasReadRef.current = false;
    }
  }, [isOpen]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    
    // Mark as read when scrolled to 95%
    if (scrollPercentage >= 0.95 && !hasReadRef.current && onReadComplete) {
      hasReadRef.current = true;
      onReadComplete();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4" onScrollCapture={handleScroll}>
          <div ref={scrollRef} className="prose prose-sm md:prose-base max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed text-foreground">
              {content}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
