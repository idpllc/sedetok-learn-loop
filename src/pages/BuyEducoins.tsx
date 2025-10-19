import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Check, ArrowLeft } from "lucide-react";
import { useEducoins } from "@/hooks/useEducoins";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
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

      // Get public key from environment
      const publicKey = import.meta.env.VITE_EPAYCO_PUBLIC_KEY || "";

      if (!publicKey) {
        toast.error("Error de configuración. Contacta al administrador.");
        return;
      }

      // Create transaction reference
      const transactionRef = `EDU-${Date.now()}-${user.id.slice(0, 8)}`;

      // Create pending transaction
      await createTransaction.mutateAsync({
        amount: price,
        educoins,
        transactionRef,
      });

      // Load ePayco script if not loaded
      if (!window.ePayco) {
        const script = document.createElement("script");
        script.src = "https://checkout.epayco.co/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // Initialize ePayco checkout
      const handler = window.ePayco.checkout.configure({
        key: publicKey,
        test: true, // Cambiar a false cuando estés en producción
      });

      const data = {
        name: `${educoins} Educoins`,
        description: `Paquete de ${educoins} Educoins para Sedefy`,
        invoice: transactionRef,
        currency: "cop",
        amount: price.toString(),
        tax_base: price.toString(),
        tax: "0",
        country: "co",
        lang: "es",
        external: "false",
        extra1: user.id,
        extra2: educoins.toString(),
        extra3: transactionRef,
        confirmation: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-epayco-payment`,
        response: `${window.location.origin}/achievements`,
        name_billing: user.user_metadata?.full_name || "Usuario",
        email_billing: user.email || "",
        type_person: "0",
        doc_type: "CC",
        doc_number: "1000000000",
      };

      handler.open(data);
    } catch (error) {
      console.error("Error al procesar compra:", error);
      toast.error("Error al procesar la compra. Intenta de nuevo.");
    } finally {
      setLoadingPackage(null);
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
                  disabled={loadingPackage !== null}
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
      </div>
    </div>
  );
}
