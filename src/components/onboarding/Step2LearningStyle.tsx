import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MessageSquare, Calculator, Palette, Music, Activity, Users, User, Leaf, Lightbulb, Sparkles, Laptop, Heart, Video, FileText, CheckCircle2, BookOpen, Brain } from "lucide-react";

interface Step2Props {
  formData: any;
  updateFormData: (data: any) => void;
}

const learningTypes = [
  { value: "Lingüístico-Verbal", icon: MessageSquare, label: "Lingüístico-Verbal", description: "Aprendo con palabras" },
  { value: "Lógico-Matemática", icon: Calculator, label: "Lógico-Matemática", description: "Aprendo razonando" },
  { value: "Visual-Espacial", icon: Palette, label: "Visual-Espacial", description: "Aprendo viendo" },
  { value: "Musical", icon: Music, label: "Musical", description: "Aprendo con ritmos" },
  { value: "Corporal-Kinestésica", icon: Activity, label: "Corporal-Kinestésica", description: "Aprendo haciendo" },
  { value: "Interpersonal", icon: Users, label: "Interpersonal", description: "Aprendo con otros" },
  { value: "Intrapersonal", icon: User, label: "Intrapersonal", description: "Aprendo solo" },
  { value: "Naturalista", icon: Leaf, label: "Naturalista", description: "Aprendo con la naturaleza" },
  { value: "Existencial", icon: Lightbulb, label: "Existencial", description: "Aprendo reflexionando" },
  { value: "Creativa-Innovadora", icon: Sparkles, label: "Creativa-Innovadora", description: "Aprendo creando" },
  { value: "Digital-Tecnológica", icon: Laptop, label: "Digital-Tecnológica", description: "Aprendo con tecnología" },
  { value: "Emocional", icon: Heart, label: "Emocional", description: "Aprendo sintiendo" },
];

export const Step2LearningStyle = ({ formData, updateFormData }: Step2Props) => {
  const consumptionModes = [
    { value: "Videos", icon: Video, label: "Videos" },
    { value: "PDF", icon: FileText, label: "PDFs" },
    { value: "Quizzes", icon: CheckCircle2, label: "Quizzes" },
    { value: "Textos", icon: BookOpen, label: "Textos" },
    { value: "Mixto", icon: Brain, label: "Mixto" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">¿Cómo aprendes mejor?</h3>
        <p className="text-muted-foreground">Esto nos ayudará a adaptar el contenido a tu estilo</p>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Tipo de aprendizaje</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {learningTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = formData.tipo_aprendizaje === type.value;
            
            return (
              <Card
                key={type.value}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => updateFormData({ tipo_aprendizaje: type.value })}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <Icon className={`w-8 h-8 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-semibold">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Modo de consumo preferido</Label>
        <div className="grid grid-cols-3 gap-3">
          {consumptionModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = formData.modo_consumo_preferido === mode.value;
            
            return (
              <Card
                key={mode.value}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => updateFormData({ modo_consumo_preferido: mode.value })}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">{mode.label}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
