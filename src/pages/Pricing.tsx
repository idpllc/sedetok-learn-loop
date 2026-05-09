import { Helmet } from "react-helmet-async";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Sparkles, Crown, Loader2, X, Tag } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type PlanBenefits = {
  items: string[];
  students: string[];
  parents: string[];
};

const FEATURES: Record<string, PlanBenefits> = {
  free: {
    items: [
      "20 Educoins mensuales",
      "1 Cuaderno de estudio",
      "3 fuentes por Cuaderno",
      "Acceso a SedeTok y rutas",
      "Sin chat conversacional con voz",
      "Sin lectura por agente",
    ],
    students: [
      "1 cuaderno digital de estudio",
      "Búsqueda básica de fuentes de aprendizaje",
      "Créditos Educoins limitados (20)",
    ],
    parents: [
      "Seguimiento básico del avance del hijo",
    ],
  },
  premium: {
    items: [
      "100 Educoins mensuales",
      "Hasta 10 Cuadernos de estudio",
      "50 fuentes por Cuaderno",
      "Chat conversacional con voz",
      "Lectura por agente ilimitada",
    ],
    students: [
      "Hasta 10 cuadernos digitales de estudio",
      "Búsqueda de fuentes de aprendizaje",
      "Variedad en formatos de aprendizaje",
      "Créditos Educoins para servicios adicionales (100)",
    ],
    parents: [
      "Notificaciones vía WhatsApp:",
      "• Avances en estudio (Cartillas en curso, formatos de aprendizaje aplicados)",
      "• Notas (Materia en riesgo o reprobada)",
      "Recomendación de estudios profesionales — primer acercamiento al perfil profesional para el hijo",
    ],
  },
  ultra: {
    items: [
      "300 Educoins mensuales",
      "Cuadernos de estudio ilimitados",
      "Fuentes ilimitadas",
      "Chat conversacional con voz",
      "Lectura por agente ilimitada",
      "Acceso a cursos Premium",
    ],
    students: [
      "Hasta 20 cuadernos digitales de estudio",
      "Búsqueda de fuentes de aprendizaje",
      "Variedad en formatos de aprendizaje",
      "Créditos Educoins para servicios adicionales (300)",
      "Acceso a cursos premium y tutorías (dos tutorías virtuales con expertos)",
    ],
    parents: [
      "Notificaciones vía WhatsApp:",
      "• Avances en estudio (Cuadernos en curso, formatos de aprendizaje aplicados)",
      "• Notas (Materia en riesgo o reprobada)",
      "• Eventos de inasistencia",
      "• Observaciones de disciplina",
      "• Becas y posibilidades de estudio para tu hijo",
      "Perfil vocacional actualizado por avances del hijo",
      "Recomendación de estudios profesionales del hijo",
    ],
  },
};

const PRICES: Record<string, { monthly: number; yearly: number }> = {
  premium: { monthly: 14900, yearly: 149000 },
  ultra: { monthly: 29500, yearly: 295000 },
};

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { myPlan, mySubscription, subscribe, cancel, validateDiscount } = useSubscription();
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discount_amount_cop: number;
    discount_value: number;
    discount_type: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const status = searchParams.get("subscription");
    if (!status || !user) return;

    if (status === "failure") {
      toast.error("El pago no pudo completarse");
      setSearchParams({}, { replace: true });
      return;
    }

    if (status === "success" || status === "pending") {
      setSyncing(true);
      let cancelled = false;
      let attempts = 0;
      const maxAttempts = 12;

      const poll = async () => {
        while (!cancelled && attempts < maxAttempts) {
          attempts++;
          try {
            const { data } = await supabase.functions.invoke("mp-sync-checkout", { body: {} });
            if (data?.synced && data?.status === "active") {
              toast.success("¡Suscripción activada!");
              await qc.invalidateQueries({ queryKey: ["my-plan"] });
              await qc.invalidateQueries({ queryKey: ["my-subscription"] });
              setSyncing(false);
              setSearchParams({}, { replace: true });
              return;
            }
          } catch (e) {
            console.error("sync error:", e);
          }
          await new Promise((r) => setTimeout(r, 2500));
        }
        if (!cancelled) {
          setSyncing(false);
          toast.info("Estamos confirmando tu pago. Refresca en unos segundos.");
          setSearchParams({}, { replace: true });
        }
      };
      poll();
      return () => { cancelled = true; };
    }
  }, [searchParams, user?.id]);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setValidating(true);
    try {
      // Validate against premium monthly base for preview; actual check happens at checkout
      const referencePlan = "premium";
      const amount = PRICES[referencePlan][cycle];
      const result = await validateDiscount({
        code: discountCode.trim(),
        plan_code: referencePlan,
        billing_cycle: cycle,
        amount_cop: amount,
      });
      if (!result?.valid) {
        toast.error(result?.error || "Código inválido");
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount({
          code: result.code,
          discount_amount_cop: result.discount_amount_cop,
          discount_value: result.discount_value,
          discount_type: result.discount_type,
        });
        toast.success("Código aplicado");
      }
    } catch (e: any) {
      toast.error(e.message || "Error validando el código");
    } finally {
      setValidating(false);
    }
  };

  const handleSubscribe = async (planCode: "premium" | "ultra") => {
    if (!user) {
      navigate("/auth?redirect=/pricing");
      return;
    }
    setLoadingCode(planCode);
    try {
      const data = await subscribe.mutateAsync({
        plan_code: planCode,
        billing_cycle: cycle,
        discount_code: appliedDiscount?.code,
        payer_email: user.email,
      });
      window.location.href = data.init_point;
    } catch (err: any) {
      toast.error(err.message || "No se pudo iniciar el pago");
      setLoadingCode(null);
    }
  };

  const currentCode = myPlan.data?.code || "free";
  const sub = mySubscription.data as any;

  const computeDisplayPrice = (basePrice: number) => {
    if (!appliedDiscount) return { final: basePrice, original: basePrice };
    let discount = 0;
    if (appliedDiscount.discount_type === "percent") {
      discount = Math.floor(basePrice * (appliedDiscount.discount_value / 100));
    } else {
      discount = Math.min(appliedDiscount.discount_value, basePrice);
    }
    return { final: Math.max(basePrice - discount, 0), original: basePrice };
  };

  const planCard = (code: "free" | "premium" | "ultra", label: string) => {
    const isCurrent = currentCode === code;
    const accent = code === "ultra" ? "border-[#F6339A]" : code === "premium" ? "border-primary" : "";
    const isLoading = loadingCode === code;
    const basePrice = code === "free" ? 0 : PRICES[code][cycle];
    const { final, original } = computeDisplayPrice(basePrice);
    const hasDiscount = appliedDiscount && code !== "free" && final < original;

    return (
      <Card key={code} className={`p-6 flex flex-col gap-4 relative ${accent} ${code !== "free" ? "border-2" : ""}`}>
        {code === "ultra" && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F6339A] text-white text-xs font-semibold px-3 py-1 rounded-full">
            Más completo
          </span>
        )}
        <div className="flex items-center gap-2">
          {code === "ultra" ? <Crown className="w-5 h-5 text-[#F6339A]" /> : code === "premium" ? <Sparkles className="w-5 h-5 text-primary" /> : null}
          <h3 className="text-xl font-bold">{label}</h3>
        </div>
        <div>
          {hasDiscount && (
            <div className="text-sm text-muted-foreground line-through">
              ${original.toLocaleString("es-CO")} COP
            </div>
          )}
          <span className="text-3xl font-bold">${final.toLocaleString("es-CO")}</span>
          <span className="text-muted-foreground"> COP/{cycle === "yearly" ? "año" : "mes"}</span>
          {cycle === "yearly" && code !== "free" && (
            <div className="text-xs text-green-600 mt-1">Ahorra ~17% vs mensual</div>
          )}
        </div>
        <ul className="space-y-2 flex-1">
          {FEATURES[code].items.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              {f.startsWith("Sin ") ? <X className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {isCurrent ? (
          <Button disabled variant="outline">Plan actual</Button>
        ) : code === "free" ? (
          <Button variant="outline" disabled>Plan gratuito</Button>
        ) : (
          <Button
            onClick={() => handleSubscribe(code as "premium" | "ultra")}
            disabled={isLoading}
            className={code === "ultra" ? "bg-[#F6339A] hover:bg-[#F6339A]/90" : ""}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Pagar con MercadoPago
          </Button>
        )}
      </Card>
    );
  };

  return (
    <>
      <Helmet>
        <title>Planes y Suscripciones | Sedefy</title>
        <meta name="description" content="Elige tu plan: Free, Premium o Ultra. Más Educoins, Notebooks ilimitados, voz y lectura por agente." />
      </Helmet>
      <Sidebar />
      <main className="ml-0 md:ml-[var(--sidebar-width,16rem)] data-[sidebar-collapsed=true]:md:ml-[var(--sidebar-collapsed-width,4rem)] transition-all">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {syncing && (
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <p className="font-semibold">Confirmando tu pago...</p>
                <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos.</p>
              </div>
            </div>
          )}
          <header className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Elige tu plan</h1>
            <p className="text-muted-foreground">Potencia tu aprendizaje con más Educoins, Notebooks, voz y agentes lectores.</p>
            <p className="text-xs text-muted-foreground mt-2">Pagos seguros con MercadoPago: tarjetas, PSE, Nequi, Daviplata y más.</p>
            {currentCode !== "free" && sub && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm bg-primary/10 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-primary" />
                Plan <strong>{myPlan.data?.name}</strong> activo
                {sub.current_period_end && <> hasta {format(new Date(sub.current_period_end), "dd/MM/yyyy")}</>}
                {sub.cancel_at_period_end && <span className="text-orange-500"> (cancelación pendiente)</span>}
              </div>
            )}
          </header>

          {/* Cycle toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex p-1 bg-muted rounded-lg">
              <button
                onClick={() => setCycle("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${cycle === "monthly" ? "bg-background shadow" : "text-muted-foreground"}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setCycle("yearly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${cycle === "yearly" ? "bg-background shadow" : "text-muted-foreground"}`}
              >
                Anual <span className="ml-1 text-xs text-green-600">-17%</span>
              </button>
            </div>
          </div>

          {/* Discount code */}
          <div className="max-w-md mx-auto mb-8">
            <Label htmlFor="discount" className="text-sm flex items-center gap-1 mb-1">
              <Tag className="w-4 h-4" /> Código de descuento (opcional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="discount"
                placeholder="Ej: BIENVENIDO20"
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value.toUpperCase());
                  if (appliedDiscount) setAppliedDiscount(null);
                }}
              />
              <Button
                variant="outline"
                onClick={handleApplyDiscount}
                disabled={validating || !discountCode.trim()}
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>
            {appliedDiscount && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Código <strong>{appliedDiscount.code}</strong> aplicado
                {appliedDiscount.discount_type === "percent"
                  ? ` (-${appliedDiscount.discount_value}%)`
                  : ` (-$${appliedDiscount.discount_value.toLocaleString("es-CO")} COP)`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planCard("free", "Free")}
            {planCard("premium", "Premium")}
            {planCard("ultra", "Ultra")}
          </div>

          {currentCode !== "free" && sub && !sub.cancel_at_period_end && (
            <div className="text-center mt-8">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={async () => {
                  if (!confirm("¿Cancelar la suscripción al final del ciclo actual?")) return;
                  try {
                    await cancel.mutateAsync();
                    toast.success("Suscripción cancelada al final del ciclo");
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
              >
                Cancelar suscripción
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Pricing;
