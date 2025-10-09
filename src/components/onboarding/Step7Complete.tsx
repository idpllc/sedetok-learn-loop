import { Sparkles, Rocket, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Step7Props {
  onComplete: () => Promise<void>;
}

export const Step7Complete = ({ onComplete }: Step7Props) => {
  const navigate = useNavigate();

  const handleExplore = async () => {
    await onComplete();
    navigate("/");
  };

  const handleProfile = async () => {
    await onComplete();
    navigate("/profile");
  };

  return (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center animate-scale-in">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
      
      <div className="space-y-3">
        <h2 className="text-3xl font-bold">
          ¡Tu perfil 360° está listo para impulsar tu aprendizaje! 🚀
        </h2>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          A partir de ahora, tus rutas se adaptarán a tu forma de aprender.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
        <div className="p-6 bg-primary/10 rounded-lg">
          <Target className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="font-semibold mb-1">Contenido personalizado</p>
          <p className="text-sm text-muted-foreground">
            Según tu estilo de aprendizaje
          </p>
        </div>
        <div className="p-6 bg-secondary/10 rounded-lg">
          <Rocket className="w-8 h-8 text-secondary mx-auto mb-3" />
          <p className="font-semibold mb-1">Rutas adaptadas</p>
          <p className="text-sm text-muted-foreground">
            A tu ritmo y objetivos
          </p>
        </div>
        <div className="p-6 bg-accent/10 rounded-lg">
          <Sparkles className="w-8 h-8 text-accent mx-auto mb-3" />
          <p className="font-semibold mb-1">Gamificación activa</p>
          <p className="text-sm text-muted-foreground">
            Aprende jugando
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
        <Button size="lg" onClick={handleExplore} className="gap-2">
          <Rocket className="w-5 h-5" />
          Explorar mis rutas personalizadas
        </Button>
        <Button size="lg" variant="outline" onClick={handleProfile}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
};
