import { MindMapViewer } from "./MindMapViewer";
import { MindMapData } from "./types";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur shrink-0">
        <h2 className="text-base sm:text-lg font-semibold truncate flex-1 min-w-0">
          {title}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar"
          className="shrink-0"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Full-screen canvas with built-in zoom/pan/fit toolbar */}
      <div className="flex-1 min-h-0 w-full">
        <MindMapViewer data={data} height="100%" />
      </div>

      {/* Hint */}
      <div className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border bg-background/95 text-center shrink-0">
        Arrastra para mover · Ctrl + rueda para zoom · Botones de la esquina superior derecha para acercar, alejar y ajustar
      </div>
    </div>
  );
};
