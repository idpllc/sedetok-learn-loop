import { Trophy, Award, Target, Coins, Users, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface Step5Props {
  formData: any;
  updateFormData: (data: any) => void;
}

export const Step5Gamification = ({ formData, updateFormData }: Step5Props) => {
  const rewards = [
    { value: "Insignias", icon: Award, label: "Insignias", desc: "Colecciona logros especiales" },
    { value: "Rankings", icon: Trophy, label: "Rankings", desc: "Compite por el primer lugar" },
    { value: "Retos", icon: Target, label: "Retos", desc: "Supera desafíos diarios" },
    { value: "Educoins", icon: Coins, label: "Educoins", desc: "Gana monedas virtuales" },
  ];

  const selectedRewards = formData.preferencia_recompensas
    ? formData.preferencia_recompensas.split(",").map((r: string) => r.trim())
    : [];

  const toggleReward = (reward: string) => {
    const current = [...selectedRewards];
    const index = current.indexOf(reward);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(reward);
    }
    updateFormData({ preferencia_recompensas: current.join(", ") });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">Gamifica tu aprendizaje 🎮</h3>
        <p className="text-muted-foreground">Elige cómo quieres que sea tu experiencia</p>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Preferencia de recompensas (selecciona varias)</Label>
        <div className="grid grid-cols-2 gap-3">
          {rewards.map((reward) => {
            const Icon = reward.icon;
            const isSelected = selectedRewards.includes(reward.value);
            
            return (
              <Card
                key={reward.value}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => toggleReward(reward.value)}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <Icon className={`w-8 h-8 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-semibold">{reward.label}</p>
                    <p className="text-xs text-muted-foreground">{reward.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold">Participar en tablas de clasificación</p>
              <p className="text-sm text-muted-foreground">Aparece en los rankings públicos</p>
            </div>
          </div>
          <Switch
            checked={formData.permitir_rankings || false}
            onCheckedChange={(checked) => updateFormData({ permitir_rankings: checked })}
          />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold">Activar modo competitivo</p>
              <p className="text-sm text-muted-foreground">Desafíos y duelos con otros usuarios</p>
            </div>
          </div>
          <Switch
            checked={formData.modo_competitivo || false}
            onCheckedChange={(checked) => updateFormData({ modo_competitivo: checked })}
          />
        </div>
      </Card>

      <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex items-start gap-3">
        <Trophy className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-accent-foreground">Consejo</p>
          <p className="text-muted-foreground">
            La gamificación hace el aprendizaje más divertido y te ayuda a mantener la motivación.
            Puedes cambiar estas preferencias en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
};
