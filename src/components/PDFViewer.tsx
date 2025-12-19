import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "./ui/button";
import { Maximize2, Loader2, Download } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker for pdfjs-dist 5.x
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  `pdfjs-dist/build/pdf.worker.min.mjs`,
  import.meta.url
).toString();

interface PDFViewerProps {
  fileUrl: string;
  onExpandClick: () => void;
  showDownloadButton?: boolean;
}

export const PDFViewer = ({ fileUrl, onExpandClick, showDownloadButton = false }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      setPdfData(null);
      setNumPages(null);

      try {
        const res = await fetch(fileUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        if (!cancelled) setPdfData(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Error fetching PDF:", { fileUrl, error: msg });
        if (!cancelled) {
          setErrorMessage("Se ha producido un error al cargar el documento PDF.");
          setLoading(false);
        }
      }
    };

    if (fileUrl) load();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF (react-pdf):", { fileUrl, error });
    setErrorMessage("Se ha producido un error al cargar el documento PDF.");
    setLoading(false);
  };

  const handleDownload = async () => {
    const filename = decodeURIComponent(fileUrl.split("/").pop()?.split("?")[0] || "documento.pdf");

    try {
      const arrayBuffer = pdfData ?? (await (await fetch(fileUrl)).arrayBuffer());
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="relative w-full bg-muted rounded-md overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      <div className="relative w-full h-[500px] overflow-hidden flex items-center justify-center bg-muted">
        {errorMessage ? (
          <div className="px-6 text-center text-sm text-muted-foreground">{errorMessage}</div>
        ) : (
          <Document
            file={pdfData ? { data: pdfData } : null}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }
            error={<div className="px-6 text-center text-sm text-muted-foreground">Se ha producido un error al cargar el documento PDF.</div>}
            noData={<div className="px-6 text-center text-sm text-muted-foreground">Cargando documento…</div>}
          >
            <Page pageNumber={1} width={Math.min(window.innerWidth * 0.8, 800)} renderTextLayer renderAnnotationLayer={false} />
          </Document>
        )}
      </div>

      <div className="absolute bottom-4 right-4 z-20 flex gap-2">
        {showDownloadButton && (
          <Button
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2 shadow-lg bg-secondary hover:bg-secondary/80"
          >
            <Download className="w-4 h-4" />
            Descargar
          </Button>
        )}
        <Button size="sm" onClick={onExpandClick} className="flex items-center gap-2 shadow-lg bg-primary hover:bg-primary/90">
          <Maximize2 className="w-4 h-4" />
          Ampliar recurso
        </Button>
      </div>

      {numPages && !errorMessage && (
        <div className="absolute bottom-4 left-4 z-20">
          <div className="bg-background/90 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-medium shadow-md">
            {numPages} {numPages === 1 ? "página" : "páginas"}
          </div>
        </div>
      )}
    </div>
  );
};

