import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, User, GraduationCap, Calendar, BookOpen, Store, Building2, Smartphone, FileEdit, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MoreModal = ({ open, onOpenChange }: MoreModalProps) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const menuItems = [
    {
      icon: ClipboardList,
      label: "Actividad",
      path: "/profile?tab=activity",
      description: "Ver tu actividad: me gusta, guardados y compartidos",
    },
    {
      icon: User,
      label: "Perfil profesional",
      path: "/profile/professional",
    },
    {
      icon: GraduationCap,
      label: "Perfil vocacional",
      path: "/profile/vocational",
      description: "Recomendaciones de carreras basadas en tu desempeño",
    },
    {
      icon: Calendar,
      label: "Eventos de evaluación",
      path: "/quiz-evaluations",
      description: "Gestiona tus eventos de evaluación con quizzes",
    },
    {
      icon: BookOpen,
      label: "Crear curso",
      path: "/courses/create",
      description: "Agrupa múltiples rutas de aprendizaje en un curso",
    },
    {
      icon: Store,
      label: "Rutas Sede Market",
      path: "/learning-paths",
      description: "Explora y descubre rutas de aprendizaje",
    },
    {
      icon: Building2,
      label: "Sede Instituciones",
      path: "/institution-dashboard",
      description: "Panel de gestión institucional",
    },
    {
      icon: Smartphone,
      label: "Sede App Store",
      path: "/install",
      description: "Instala la aplicación en tu dispositivo",
    },
    {
      icon: FileEdit,
      label: "Registrar institución",
      path: "/register-institution",
      description: "Registra tu institución educativa",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border p-0 gap-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Más</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="py-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted transition-colors text-left"
              >
                <Icon className="w-6 h-6 text-foreground" />
                <div className="flex-1">
                  <div className="text-base font-medium">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
