import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MindMapViewer } from "./MindMapViewer";
import { MindMapData } from "./types";
import { useEffect } from "react";

interface MindMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: MindMapData;
  onReadComplete?: () => void;
}

export const MindMapModal = ({ isOpen, onClose, title, data, onReadComplete }: MindMapModalProps) => {
  useEffect(() => {
    if (isOpen && onReadComplete) {
      const t = setTimeout(() => onReadComplete(), 3000);
      return () => clearTimeout(t);
    }
  }, [isOpen, onReadComplete]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col z-[90]">
        <DialogHeader>
          <DialogTitle className="break-words">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-[70vh]">
          <MindMapViewer data={data} height="100%" />
        </div>
      </DialogContent>
    </Dialog>
  );
};
