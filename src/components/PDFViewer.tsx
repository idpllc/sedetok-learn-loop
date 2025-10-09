import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "./ui/button";
import { Maximize2, Loader2 } from "lucide-react";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
  onExpandClick: () => void;
}

export const PDFViewer = ({ fileUrl, onExpandClick }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setLoading(false);
  };

  return (
    <div className="relative w-full bg-muted rounded-md overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      
      <div className="relative w-full h-48 overflow-hidden">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <Page
            pageNumber={1}
            width={400}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      <div className="absolute bottom-2 right-2 z-20">
        <Button
          size="sm"
          onClick={onExpandClick}
          className="flex items-center gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          Ampliar lectura
        </Button>
      </div>

      {numPages && (
        <div className="absolute bottom-2 left-2 z-20">
          <div className="bg-background/90 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-medium">
            {numPages} {numPages === 1 ? "página" : "páginas"}
          </div>
        </div>
      )}
    </div>
  );
};
