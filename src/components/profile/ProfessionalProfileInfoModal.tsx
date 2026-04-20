import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, Sparkles, GraduationCap, Infinity as InfinityIcon, Info } from "lucide-react";

const STORAGE_KEY = "professional_profile_info_seen_v1";

interface ProfessionalProfileInfoModalProps {
  /** If provided, controls the modal externally (used by the "info" button). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, auto-opens the first time the user visits (uncontrolled mode). */
  autoShow?: boolean;
}

export const ProfessionalProfileInfoModal = ({
  open: controlledOpen,
  onOpenChange,
  autoShow = false,
}: ProfessionalProfileInfoModalProps) => {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);

  useEffect(() => {
    if (isControlled || !autoShow) return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setInternalOpen(true);
    } catch {
      setInternalOpen(true);
    }
  }, [isControlled, autoShow]);

  const open = isControlled ? !!controlledOpen : internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    }
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-2">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">
            Tu Perfil Profesional te acompañará toda la vida
          </DialogTitle>
          <DialogDescription className="text-center">
            Es tu identidad académica y profesional dentro de SEDEFY: evoluciona contigo año tras año.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
            <InfinityIcon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Un perfil para toda la vida</p>
              <p className="text-xs text-muted-foreground">
                Conserva tu historial académico, logros y experiencias en un solo lugar, accesible siempre que lo necesites.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Aprendizaje personalizado</p>
              <p className="text-xs text-muted-foreground">
                Con esta información, el sistema te recomienda las mejores formas de aprender según tus fortalezas, intereses e inteligencias múltiples.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border bg-amber-500/5 border-amber-500/30">
            <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Importante: Plan de Estudios</p>
              <p className="text-xs text-muted-foreground">
                Para que las recomendaciones sean precisas, es fundamental que tu plan de estudios sea importado correctamente desde tu institución. Verifica con tu colegio o universidad que la información esté actualizada.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)} className="w-full">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { Info as ProfessionalProfileInfoIcon };
