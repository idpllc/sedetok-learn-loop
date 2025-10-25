import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface GameStep3Props {
  config: {
    time_limit?: number;
    random_order: boolean;
  };
  onChange: (config: any) => void;
}

export const GameStep3 = ({ config, onChange }: GameStep3Props) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="time-limit">Límite de Tiempo (segundos)</Label>
        <Input
          id="time-limit"
          type="number"
          min="0"
          value={config.time_limit || ""}
          onChange={(e) => onChange({ ...config, time_limit: parseInt(e.target.value) || undefined })}
          placeholder="Opcional - deja vacío para sin límite"
        />
        <p className="text-xs text-muted-foreground">
          Si está vacío, el juego no tendrá límite de tiempo
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="random-order">Orden Aleatorio</Label>
          <p className="text-xs text-muted-foreground">
            Las palabras aparecerán en orden aleatorio para cada intento
          </p>
        </div>
        <Switch
          id="random-order"
          checked={config.random_order}
          onCheckedChange={(checked) => onChange({ ...config, random_order: checked })}
        />
      </div>
    </div>
  );
};
