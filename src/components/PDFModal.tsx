import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, Download } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker for pdfjs-dist 5.x
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  `pdfjs-dist/build/pdf.worker.min.mjs`,
  import.meta.url
).toString();

interface PDFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  title: string;
  onDownload?: () => void;
}

export const PDFModal = ({ open, onOpenChange, fileUrl, title, onDownload }: PDFModalProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleDownload = async () => {
    const filename = fileUrl.split("/").pop() || "documento.pdf";

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Failed to fetch");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (onDownload) onDownload();
    } catch (error) {
      console.error("Error downloading PDF:", error);
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setPageNumber(1);
      setScale(1.0);
      setLoading(true);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </Button>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              Página {pageNumber} de {numPages || "..."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= (numPages || 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.6}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 2.0}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          <div className="flex justify-center">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
