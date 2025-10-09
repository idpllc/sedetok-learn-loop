import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
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
