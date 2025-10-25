import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface GameStep1Props {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export const GameStep1 = ({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: GameStep1Props) => {
  return (
    <div className="space-y-6">
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
