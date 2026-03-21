import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HelpCircle, BookOpen, FlaskConical, Languages, Calculator, Globe, Music } from "lucide-react";

const gameTypeInfo: Record<string, { title: string; description: string; subjects: string[]; idealTopics: string[] }> = {
  word_order: {
    title: "Ordenar Palabras",
    description: "Los estudiantes deben reorganizar palabras desordenadas para formar oraciones correctas. Ideal para practicar gramática, sintaxis y comprensión lectora.",
    subjects: ["Lengua Castellana", "Inglés", "Francés", "Portugués", "Idiomas en general"],
    idealTopics: [
      "Estructura de oraciones gramaticales",
      "Orden de palabras en diferentes tiempos verbales",
      "Traducción y comprensión de frases",
      "Vocabulario en contexto",
      "Formación de definiciones científicas",
    ],
  },
  column_match: {
    title: "Conectar Columnas",
    description: "Los estudiantes conectan elementos de una columna izquierda con su correspondiente en la columna derecha. Perfecto para evaluar relaciones, asociaciones y correspondencias.",
    subjects: ["Ciencias Naturales", "Ciencias Sociales", "Matemáticas", "Biología", "Historia", "Química"],
    idealTopics: [
      "Países y capitales",
      "Autores y obras literarias",
      "Órganos y funciones del cuerpo",
      "Fechas históricas y eventos",
      "Fórmulas químicas y nombres de compuestos",
      "Vocabulario en otro idioma y su traducción",
    ],
  },
  word_wheel: {
    title: "Ruleta de Palabras",
    description: "Un juego tipo 'Pasapalabra' donde los estudiantes deben adivinar palabras que comienzan con cada letra del abecedario a partir de pistas. Excelente para reforzar vocabulario.",
    subjects: ["Lengua Castellana", "Ciencias Naturales", "Ciencias Sociales", "Inglés", "Cualquier asignatura"],
    idealTopics: [
      "Vocabulario específico de una unidad temática",
      "Terminología científica o técnica",
      "Repaso general de un tema amplio",
      "Conceptos clave de un período histórico",
      "Glosario de una asignatura completa",
    ],
  },
  interactive_image: {
    title: "Imagen Interactiva",
    description: "Los estudiantes deben identificar y señalar puntos específicos sobre una imagen. Ideal para anatomía, geografía, arte y cualquier tema visual.",
    subjects: ["Biología", "Geografía", "Arte", "Anatomía", "Educación Física", "Tecnología"],
    idealTopics: [
      "Partes del cuerpo humano o de un animal",
      "Ubicación de países, ríos o montañas en un mapa",
      "Elementos de una obra de arte",
      "Componentes de una máquina o circuito",
      "Identificación de elementos en un laboratorio",
    ],
  },
};

const subjectIcons: Record<string, React.ReactNode> = {
  default: <BookOpen className="h-3.5 w-3.5" />,
};

interface GameStep1Props {
  title: string;
  description: string;
  gameType: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onGameTypeChange: (value: string) => void;
}

export const GameStep1 = ({
  title,
  description,
  gameType,
  onTitleChange,
  onDescriptionChange,
  onGameTypeChange,
}: GameStep1Props) => {
  const [infoModal, setInfoModal] = useState<string | null>(null);
  const info = infoModal ? gameTypeInfo[infoModal] : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Tipo de Juego</Label>
        <RadioGroup value={gameType} onValueChange={onGameTypeChange}>
          {Object.entries(gameTypeInfo).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={key} id={key} />
                <Label htmlFor={key} className="font-normal cursor-pointer">
                  {val.title} - {gameTypeInfo[key].description.split(".")[0]}
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-primary shrink-0 ml-2"
                onClick={() => setInfoModal(key)}
              >
                <HelpCircle className="h-3.5 w-3.5 mr-1" />
                ¿Cómo funciona?
              </Button>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="game-title">Título del Juego</Label>
        <Input
          id="game-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ej: Ordena las palabras en inglés"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="game-description">Descripción</Label>
        <Textarea
          id="game-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe el objetivo del juego..."
          rows={4}
        />
      </div>

      <Dialog open={!!infoModal} onOpenChange={() => setInfoModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {info?.title}
            </DialogTitle>
          </DialogHeader>
          {info && (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">{info.description}</p>

              <div>
                <h4 className="font-semibold mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Asignaturas recomendadas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {info.subjects.map((s) => (
                    <span key={s} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5 flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Temas ideales
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {info.idealTopics.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
