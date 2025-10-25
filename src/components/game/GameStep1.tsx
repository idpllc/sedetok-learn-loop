import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Tipo de Juego</Label>
        <RadioGroup value={gameType} onValueChange={onGameTypeChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="word_order" id="word_order" />
            <Label htmlFor="word_order" className="font-normal cursor-pointer">
              Ordenar Palabras - Construye oraciones ordenando palabras
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="column_match" id="column_match" />
            <Label htmlFor="column_match" className="font-normal cursor-pointer">
              Conectar Columnas - Conecta items de la izquierda con la derecha
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="word_wheel" id="word_wheel" />
            <Label htmlFor="word_wheel" className="font-normal cursor-pointer">
              Ruleta de Palabras - Adivina palabras según su letra inicial
            </Label>
          </div>
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
    </div>
  );
};
