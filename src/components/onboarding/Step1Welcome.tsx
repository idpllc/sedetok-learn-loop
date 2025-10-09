import { Sparkles } from "lucide-react";

export const Step1Welcome = () => {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      
      <div className="space-y-3">
        <h2 className="text-3xl font-bold">
          Construyamos tu perfil 360° de aprendizaje 🎓
        </h2>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Queremos conocerte mejor para ofrecerte rutas de aprendizaje hechas a tu medida.
          Solo te tomará unos minutos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
        <div className="p-4 bg-primary/10 rounded-lg">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-sm font-medium">Contenido personalizado</p>
        </div>
        <div className="p-4 bg-secondary/10 rounded-lg">
          <div className="text-3xl mb-2">🚀</div>
          <p className="text-sm font-medium">Rutas adaptadas</p>
        </div>
        <div className="p-4 bg-accent/10 rounded-lg">
          <div className="text-3xl mb-2">🏆</div>
          <p className="text-sm font-medium">Gamificación</p>
        </div>
        <div className="p-4 bg-purple-500/10 rounded-lg">
          <div className="text-3xl mb-2">📈</div>
          <p className="text-sm font-medium">Seguimiento</p>
        </div>
      </div>
    </div>
  );
};
