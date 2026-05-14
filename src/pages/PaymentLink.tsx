import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles, Crown, ShieldCheck, CalendarDays } from "lucide-react";
import { toast } from "sonner";

const FEATURES: Record<string, string[]> = {
  premium: [
    "100 Educoins mensuales",
    "Hasta 10 Cuadernos de estudio",
    "50 fuentes por Cuaderno",
    "Chat conversacional con voz",
    "Lectura por agente ilimitada",
    "Notificaciones de avance vía WhatsApp",
  ],
  ultra: [
    "300 Educoins mensuales",
    "Cuadernos de estudio ilimitados",
    "Fuentes ilimitadas",
    "Chat conversacional con voz",
    "Lectura por agente ilimitada",
    "Acceso a cursos Premium y tutorías",
    "Perfil vocacional avanzado",
  ],
};

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export default function PaymentLink() {
  const { subscriptionId } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  const status = params.get("status");

  useEffect(() => {
    if (!subscriptionId) return;
    (async () => {
      const { data: row, error } = await supabase.rpc("get_payment_link" as any, {
        _subscription_id: subscriptionId,
      });
      if (error || !row) {
        setError("Enlace de pago no encontrado o expirado");
      } else {
        setData(row);
      }
      setLoading(false);
    })();
  }, [subscriptionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F6339A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Enlace no disponible</h1>
          <p className="text-muted-foreground">{error || "Este enlace de pago no existe."}</p>
        </Card>
      </div>
    );
  }

  const planCode = data.plan_code as string;
  const benefits = FEATURES[planCode] || [];
  const cycleLabel = data.billing_cycle === "yearly" ? "Anual" : "Mensual";
  const amount = data.amount_cop || 0;
  const discount = data.discount_amount_cop || 0;
  const isPaid = data.status === "active";
  const Icon = planCode === "ultra" ? Crown : Sparkles;
  const monthlyAmount = data.monthly_amount_cop || 0;
  const yearlyAmount = data.yearly_amount_cop || 0;
  const yearlyEquivMonthly = monthlyAmount * 12;
  const yearlySavings = yearlyEquivMonthly > yearlyAmount ? yearlyEquivMonthly - yearlyAmount : 0;
  const yearlyDiscountPct = yearlyEquivMonthly > 0
    ? Math.round((yearlySavings / yearlyEquivMonthly) * 100)
    : 0;
  const showYearlyOption = data.billing_cycle !== "yearly" && yearlyAmount > 0 && yearlySavings > 0;

  const handleYearly = async () => {
    setYearlyLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke(
        "payment-link-create-yearly",
        { body: { source_subscription_id: subscriptionId } },
      );
      if (error) {
        let msg = error.message || "No se pudo generar el pago anual";
        const ctx = (error as any).context;
        if (ctx?.json) {
          try { const b = await ctx.json(); msg = b?.error || msg; } catch {}
        }
        throw new Error(msg);
      }
      if (!res?.init_point) throw new Error(res?.error || "No se pudo generar el pago anual");
      window.location.href = res.init_point;
    } catch (e: any) {
      toast.error(e.message || "No se pudo generar el pago anual");
      setYearlyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-background to-purple-50 dark:from-background dark:to-background py-8 px-4">
      <Helmet>
        <title>Pagar suscripción {data.plan_name} | Sedefy</title>
        <meta name="description" content={`Activa tu plan ${data.plan_name} en Sedefy.`} />
      </Helmet>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-full bg-[#F6339A]/10 items-center justify-center mb-2">
            <Icon className="w-7 h-7 text-[#F6339A]" />
          </div>
          <h1 className="text-3xl font-bold">Pagar suscripción</h1>
          <p className="text-muted-foreground">
            Plan <span className="font-semibold">{data.plan_name}</span> · {cycleLabel}
          </p>
        </div>

        {status === "success" || isPaid ? (
          <Card className="p-6 border-green-500/40 bg-green-50/40 dark:bg-green-950/10 text-center">
            <ShieldCheck className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <h2 className="text-lg font-semibold">¡Pago recibido!</h2>
            <p className="text-sm text-muted-foreground">
              La suscripción está activa para {data.beneficiary_name}.
            </p>
          </Card>
        ) : (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Beneficiario</p>
                <p className="font-semibold">{data.beneficiary_name}</p>
                {data.beneficiary_email && (
                  <p className="text-xs text-muted-foreground">{data.beneficiary_email}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-[#F6339A]">{fmtCOP(amount)}</p>
                {discount > 0 && (
                  <p className="text-xs text-green-600">-{fmtCOP(discount)} de descuento</p>
                )}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-[#F6339A] hover:bg-[#F6339A]/90 text-white text-base h-12"
              disabled={!data.init_point}
              onClick={() => {
                if (data.init_point) window.location.href = data.init_point;
              }}
            >
              Pagar ahora
            </Button>

            {showYearlyOption && (
              <Button
                variant="outline"
                size="lg"
                className="w-full border-[#F6339A]/40 hover:bg-[#F6339A]/5 text-base h-auto py-3 flex-col gap-1"
                disabled={yearlyLoading}
                onClick={handleYearly}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {yearlyLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarDays className="w-4 h-4 text-[#F6339A]" />
                  )}
                  Pagar anual · {fmtCOP(yearlyAmount)}
                  <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[#F6339A]/10 text-[#F6339A] font-bold">
                    -{yearlyDiscountPct}%
                  </span>
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  Ahorra {fmtCOP(yearlySavings)} al año
                </span>
              </Button>
            )}
            {status === "failure" && (
              <p className="text-sm text-red-600 text-center">
                El pago no se completó. Puedes intentarlo de nuevo.
              </p>
            )}
            {status === "pending" && (
              <p className="text-sm text-amber-600 text-center">
                Tu pago está pendiente de confirmación.
              </p>
            )}
            <p className="text-xs text-center text-muted-foreground">
              Pago seguro procesado por Mercado Pago
            </p>
          </Card>
        )}

        <Card className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F6339A]" />
            ¿Qué incluye tu plan {data.plan_name}?
          </h3>
          <ul className="space-y-2">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
