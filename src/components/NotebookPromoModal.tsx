import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, Brain, FileText, MessagesSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "notebook_promo_dismissed_v1";
const EXCLUDED_PREFIXES = [
  "/auth",
  "/auto-login",
  "/reset-password",
  "/chat",
  "/notebook",
  "/admin",
  "/join",
  "/live-games/host",
  "/live-games/play",
  "/live-games/results",
  "/quiz-evaluation",
  "/game-evaluation",
  "/trivia-game",
];

export const NotebookPromoModal = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Mark as "seen" only when the user actually visits /notebook.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (location.pathname === "/notebook" || location.pathname.startsWith("/notebook/")) {
      try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    }
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(location.search);
    if (params.get("embed") === "1") return;
    if (EXCLUDED_PREFIXES.some((p) => location.pathname.startsWith(p))) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setOpen(true), 5000);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  // Closing the modal does NOT persist — it should reappear on future sessions
  // until the student actually visits Notebook.
  const handleClose = () => {
    setOpen(false);
  };

  const handleVisit = () => {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    setOpen(false);
    navigate("/notebook");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg">
            <BookOpen className="h-7 w-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Conoce Notebook Sedefy
          </DialogTitle>
          <DialogDescription className="text-center">
            Tu cuaderno inteligente para estudiar más rápido y recordar mejor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Resúmenes con IA</p>
              <p className="text-xs text-muted-foreground">
                Convierte tus apuntes y documentos en cápsulas de aprendizaje al instante.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Estudia activamente</p>
              <p className="text-xs text-muted-foreground">
                Genera quizzes, mapas mentales y juegos a partir de tus propias fuentes.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
            <MessagesSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Chatea con tus apuntes</p>
              <p className="text-xs text-muted-foreground">
                Pregunta lo que quieras y obtén respuestas basadas solo en tus documentos.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Todo en un solo lugar</p>
              <p className="text-xs text-muted-foreground">
                PDFs, enlaces, audios y notas organizados por tema, listos para repasar.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleVisit} className="w-full" size="lg">
            Visitar Notebook
          </Button>
          <Button onClick={handleClose} variant="ghost" className="w-full">
            Quizás más tarde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotebookPromoModal;
