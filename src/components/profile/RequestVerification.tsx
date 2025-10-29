import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useVerificationRequest } from "@/hooks/useVerificationRequest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface RequestVerificationProps {
  isVerified: boolean;
}

export const RequestVerification = ({ isVerified }: RequestVerificationProps) => {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const { request, isLoading, createRequest } = useVerificationRequest();

  const handleSubmit = async () => {
    await createRequest.mutateAsync(reason);
    setReason("");
    setOpen(false);
  };

  if (isVerified) {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Cuenta Verificada
      </Badge>
    );
  }

  if (request) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Verificación Pendiente
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Solicitar Verificación
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Verificación de Cuenta</DialogTitle>
          <DialogDescription>
            Explica por qué deberías tener una cuenta verificada. Las cuentas verificadas
            tienen mayor credibilidad en la plataforma.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Razón de la solicitud</Label>
            <Textarea
              id="reason"
              placeholder="Explica por qué solicitas la verificación..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || createRequest.isPending}
            className="w-full"
          >
            {createRequest.isPending ? "Enviando..." : "Enviar Solicitud"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
