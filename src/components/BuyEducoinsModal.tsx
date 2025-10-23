import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Coins, Check } from "lucide-react";
import { useEducoins } from "@/hooks/useEducoins";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const PACKAGES = [
  {
    educoins: 100,
    price: 10000,
    description: "Paquete básico",
    features: ["100 Educoins", "Compra instantánea"],
  },
  {
    educoins: 500,
    price: 45000,
    description: "Paquete popular",
    popular: true,
    features: ["500 Educoins", "Ahorra 5.000 COP", "Compra instantánea"],
  },
  {
    educoins: 1000,
    price: 80000,
    description: "Mejor valor",
    features: ["1.000 Educoins", "Ahorra 20.000 COP", "Compra instantánea"],
  },
];

interface BuyEducoinsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredAmount?: number;
}

export function BuyEducoinsModal({ open, onOpenChange, requiredAmount }: BuyEducoinsModalProps) {
  const navigate = useNavigate();
  const { balance, createTransaction } = useEducoins();
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const { profile, updateProfile } = useProfileUpdate();
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState<string>("");
  const [docNumber, setDocNumber] = useState<string>("");
  const [pendingPurchase, setPendingPurchase] = useState<{ educoins: number; price: number } | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);

  const docSchema = z.object({
    docType: z.enum(["CC", "CE", "TI", "NIT", "PP"], { required_error: "Selecciona el tipo de documento" }),
    docNumber: z
      .string()
      .trim()
      .min(5, "Número de documento demasiado corto")
      .max(20, "Número de documento demasiado largo")
      .regex(/^[0-9A-Za-z-]+$/, "Sólo números, letras y guiones"),
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const startCheckout = async (
    educoins: number,
    price: number,
    userDocType: string,
    userDocNumber: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión para comprar Educoins");
        navigate("/auth");
        return;
      }

      const transactionRef = `EDU-${Date.now()}-${user.id.slice(0, 8)}`;

      await createTransaction.mutateAsync({
        amount: price,
        educoins,
        transactionRef,
      });

      const { data: preferenceData, error: preferenceError } = await supabase.functions.invoke(
        'create-mercadopago-preference',
        {
          body: {
            title: `${educoins} Educoins`,
            description: `Paquete de ${educoins} Educoins para Sedefy`,
            unit_price: price,
            quantity: 1,
            external_reference: transactionRef,
            payer: {
              name: user.user_metadata?.full_name || "Usuario",
              email: user.email || "",
              identification: {
                type: userDocType,
                number: userDocNumber,
              },
            },
            notification_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-mercadopago-payment`,
            back_urls: {
              success: `${window.location.origin}/achievements?status=success`,
              failure: `${window.location.origin}${window.location.pathname}?status=failure`,
              pending: `${window.location.origin}/achievements?status=pending`,
            },
            auto_return: "approved",
          },
        }
      );

      if (preferenceError) {
        throw new Error(preferenceError.message);
      }

      if (preferenceData?.init_point) {
        window.location.href = preferenceData.init_point;
      } else {
        throw new Error("No se recibió la URL de pago");
      }
    } catch (error) {
      console.error("Error al iniciar checkout:", error);
      toast.error("Error al procesar la compra. Intenta de nuevo.");
      setLoadingPackage(null);
    }
  };

  const handleBuy = async (educoins: number, price: number) => {
    setLoadingPackage(educoins);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión para comprar Educoins");
        navigate("/auth");
        return;
      }

      const profileDocType = profile?.tipo_documento ? String(profile.tipo_documento) : "";
      const profileDocNumber = profile?.numero_documento ? String(profile.numero_documento) : "";

      if (!profileDocType || !profileDocNumber) {
        setPendingPurchase({ educoins, price });
        setDocType(profileDocType || "");
        setDocNumber(profileDocNumber || "");
        setDocModalOpen(true);
        setLoadingPackage(null);
        return;
      }

      await startCheckout(educoins, price, profileDocType, profileDocNumber);
    } catch (error) {
      console.error("Error al procesar compra:", error);
      toast.error("Error al procesar la compra. Intenta de nuevo.");
      setLoadingPackage(null);
    }
  };

  const handleSaveDoc = async () => {
    if (!pendingPurchase) return;
    try {
      setSavingDoc(true);
      const parsed = docSchema.parse({ docType, docNumber });
      try {
        await updateProfile({ tipo_documento: parsed.docType, numero_documento: parsed.docNumber });
        toast.success("Datos guardados correctamente");
      } catch (e: any) {
        console.error("No se pudo guardar en perfil, se continuará con la compra:", e);
      }
      setDocModalOpen(false);
      setLoadingPackage(pendingPurchase.educoins);
      await startCheckout(pendingPurchase.educoins, pendingPurchase.price, parsed.docType, parsed.docNumber);
      setPendingPurchase(null);
    } catch (e: any) {
      const msg = e?.message || "Datos inválidos";
      toast.error(msg);
    } finally {
      setSavingDoc(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="h-8 w-8 text-primary" />
              <DialogTitle className="text-2xl">Comprar Educoins</DialogTitle>
            </div>
            <DialogDescription className="text-center">
              {requiredAmount ? (
                <span className="text-destructive font-semibold">
                  Necesitas al menos {requiredAmount} Educoins para continuar
                </span>
              ) : (
                "Los Educoins te permiten acceder a funciones premium"
              )}
            </DialogDescription>
            {balance !== undefined && (
              <p className="text-center font-semibold mt-2">
                Balance actual: <span className="text-primary">{balance} Educoins</span>
              </p>
            )}
          </DialogHeader>

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {PACKAGES.map((pkg) => (
              <Card
                key={pkg.educoins}
                className={`relative ${
                  pkg.popular ? "border-primary shadow-md" : ""
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    Más Popular
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-center mb-2">
                    <Coins className="h-12 w-12 text-primary" />
                  </div>
                  <CardTitle className="text-center text-2xl">
                    {pkg.educoins}
                  </CardTitle>
                  <CardDescription className="text-center text-lg font-semibold">
                    {formatPrice(pkg.price)}
                  </CardDescription>
                  <p className="text-center text-xs text-muted-foreground">
                    {pkg.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 mb-4">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-xs">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleBuy(pkg.educoins, pkg.price)}
                    disabled={loadingPackage === pkg.educoins}
                    className="w-full"
                    size="sm"
                    variant={pkg.popular ? "default" : "outline"}
                  >
                    {loadingPackage === pkg.educoins ? "Procesando..." : "Comprar"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            <p>Pago seguro procesado por MercadoPago</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={docModalOpen}
        onOpenChange={(open) => {
          setDocModalOpen(open);
          if (!open) {
            setPendingPurchase(null);
            setLoadingPackage(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Datos de identificación</DialogTitle>
            <DialogDescription>
              Para continuar con el pago necesitamos tu tipo y número de documento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                  <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                  <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                  <SelectItem value="NIT">NIT</SelectItem>
                  <SelectItem value="PP">Pasaporte (PP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número de documento</Label>
              <Input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Ingresa tu número de documento"
                inputMode="numeric"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDocModalOpen(false);
                setPendingPurchase(null);
                setLoadingPackage(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveDoc} disabled={savingDoc || !docType || !docNumber}>
              {savingDoc ? "Guardando..." : "Guardar y continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
