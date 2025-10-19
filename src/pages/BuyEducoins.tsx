import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Check, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useEducoins } from "@/hooks/useEducoins";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

declare global {
  interface Window {
    ePayco: any;
  }
}

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

export default function BuyEducoins() {
  const navigate = useNavigate();
  const { balance, createTransaction } = useEducoins();
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const { profile, updateProfile } = useProfileUpdate();
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState<string>("");
  const [docNumber, setDocNumber] = useState<string>("");
  const [pendingPurchase, setPendingPurchase] = useState<{ educoins: number; price: number } | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);

  // Preload ePayco checkout script once to avoid modal hang on first open
  useEffect(() => {
    if (!(window as any).ePayco) {
      const script = document.createElement("script");
      script.src = "https://checkout.epayco.co/checkout.js";
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => console.debug("ePayco script loaded");
      script.onerror = () => console.error("Error cargando ePayco checkout.js");
    }
  }, []);

  const mapDocTypeToEpayco = (t: string): string => {
    const normalized = (t || "").toUpperCase();
    if (["CC", "CEDULA", "CÉDULA", "CEDULA DE CIUDADANIA", "CÉDULA DE CIUDADANÍA"].includes(normalized)) return "CC";
    if (["CE", "CEDULA DE EXTRANJERIA", "CÉDULA DE EXTRANJERÍA"].includes(normalized)) return "CE";
    if (["TI", "TARJETA DE IDENTIDAD"].includes(normalized)) return "TI";
    if (["NIT"].includes(normalized)) return "NIT";
    if (["PP", "PASAPORTE", "PASSPORT"].includes(normalized)) return "PP";
    return "CC";
  };

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

      const publicKey = import.meta.env.VITE_EPAYCO_PUBLIC_KEY || "";
      if (!publicKey) {
        toast.error("Error de configuración. Contacta al administrador.");
        return;
      }

      const transactionRef = `EDU-${Date.now()}-${user.id.slice(0, 8)}`;

      await createTransaction.mutateAsync({
        amount: price,
        educoins,
        transactionRef,
      });

      if (!(window as any).ePayco) {
        const script = document.createElement("script");
        script.src = "https://checkout.epayco.co/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve as any;
        });
      }

      const handler = (window as any).ePayco.checkout.configure({
        key: publicKey,
        test: true, // Cambiar a false en producción
      });

      const data = {
        name: `${educoins} Educoins`,
        description: `Paquete de ${educoins} Educoins para Sedefy`,
        invoice: transactionRef,
        currency: "COP",
        amount: price.toString(),
        tax_base: "0",
        tax: "0",
        country: "co",
        lang: "es",
        external: "false",
        extra1: user.id,
        extra2: educoins.toString(),
        extra3: transactionRef,
        confirmation: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-epayco-payment`,
        method_confirmation: "POST",
        response: `${window.location.origin}/achievements`,
        name_billing: user.user_metadata?.full_name || "Usuario",
        email_billing: user.email || "",
        type_person: "0",
        doc_type: mapDocTypeToEpayco(userDocType),
        doc_number: userDocNumber,
      } as any;

      console.debug("ePayco checkout payload", data);
      handler.open(data);
    } catch (error) {
      console.error("Error al iniciar checkout:", error);
      toast.error("Error al procesar la compra. Intenta de nuevo.");
    } finally {
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
        // Abrir modal para capturar datos faltantes
        setPendingPurchase({ educoins, price });
        setDocType(profileDocType ? mapDocTypeToEpayco(profileDocType) : "");
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
      // Intentar guardar en el perfil para futuras compras
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Coins className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">Comprar Educoins</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Los Educoins te permiten acceder a funciones premium como generar quizzes con IA
          </p>
          {balance !== undefined && (
            <p className="text-lg font-semibold mt-2">
              Balance actual: <span className="text-primary">{balance} Educoins</span>
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PACKAGES.map((pkg) => (
            <Card
              key={pkg.educoins}
              className={`relative ${
                pkg.popular ? "border-primary shadow-lg scale-105" : ""
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Más Popular
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <Coins className="h-16 w-16 text-primary" />
                </div>
                <CardTitle className="text-center text-3xl">
                  {pkg.educoins}
                </CardTitle>
                <CardDescription className="text-center text-xl font-semibold">
                  {formatPrice(pkg.price)}
                </CardDescription>
                <p className="text-center text-sm text-muted-foreground">
                  {pkg.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleBuy(pkg.educoins, pkg.price)}
                  disabled={loadingPackage === pkg.educoins}
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                >
                  {loadingPackage === pkg.educoins ? "Procesando..." : "Comprar ahora"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Pago seguro procesado por ePayco</p>
          <p className="mt-2">
            Los Educoins se agregarán automáticamente a tu cuenta una vez confirmado el pago
          </p>
        </div>

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
      </div>
    </div>
  );
}
