import { Shield, Eye, MessageSquare, Bell, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface Step6Props {
  formData: any;
  updateFormData: (data: any) => void;
}

export const Step6Privacy = ({ formData, updateFormData }: Step6Props) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">Privacidad y notificaciones</h3>
        <p className="text-muted-foreground">Controla tu información y comunicaciones</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Configuración de privacidad
        </Label>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Perfil público</p>
                <p className="text-sm text-muted-foreground">Otros usuarios pueden ver tu perfil</p>
              </div>
            </div>
            <Switch
              checked={formData.perfil_publico !== false}
              onCheckedChange={(checked) => updateFormData({ perfil_publico: checked })}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Permitir comentarios en mis rutas</p>
                <p className="text-sm text-muted-foreground">Los demás pueden comentar tu contenido</p>
              </div>
            </div>
            <Switch
              checked={formData.permitir_comentarios !== false}
              onCheckedChange={(checked) => updateFormData({ permitir_comentarios: checked })}
            />
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notificaciones
        </Label>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Notificaciones por correo</p>
                <p className="text-sm text-muted-foreground">Recibe actualizaciones importantes</p>
              </div>
            </div>
            <Switch
              checked={formData.notificaciones_correo !== false}
              onCheckedChange={(checked) => updateFormData({ notificaciones_correo: checked })}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Notificaciones push</p>
                <p className="text-sm text-muted-foreground">Alertas en tiempo real</p>
              </div>
            </div>
            <Switch
              checked={formData.notificaciones_push !== false}
              onCheckedChange={(checked) => updateFormData({ notificaciones_push: checked })}
            />
          </div>
        </Card>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold">Tu privacidad es importante</p>
          <p className="text-muted-foreground">
            Tus datos están protegidos y solo se usan para mejorar tu experiencia de aprendizaje.
            Puedes modificar estas configuraciones en cualquier momento desde tu perfil.
          </p>
        </div>
      </div>
    </div>
  );
};
