import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const ReadingModal = ({ isOpen, onClose, title, content }: ReadingModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold pr-8">{title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="prose prose-sm md:prose-base max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed text-foreground">
              {content}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
