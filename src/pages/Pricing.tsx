import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Crown, Loader2, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

declare global {
  interface Window {
    ePayco?: any;
  }
}

const FEATURES: Record<string, { items: string[] }> = {
  free: {
    items: [
      "20 Educoins mensuales",
      "1 Notebook",
      "3 fuentes por Notebook",
      "Acceso a SedeTok y rutas",
      "Sin chat conversacional con voz",
      "Sin lectura por agente",
    ],
  },
  premium: {
    items: [
      "100 Educoins mensuales",
      "Hasta 20 Notebooks",
      "50 fuentes por Notebook",
      "Chat conversacional con voz",
      "Lectura por agente ilimitada",
    ],
  },
  ultra: {
    items: [
      "300 Educoins mensuales",
      "Notebooks ilimitados",
      "Fuentes ilimitadas",
      "Chat conversacional con voz",
      "Lectura por agente ilimitada",
      "Acceso a cursos Premium",
    ],
  },
};

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { plans, myPlan, mySubscription, subscribe, cancel } = useSubscription();
  const [selected, setSelected] = useState<"premium" | "ultra" | null>(null);
  const [card, setCard] = useState({ number: "", name: "", exp_month: "", exp_year: "", cvc: "", email: "", phone: "", doc_number: "" });
  const [submitting, setSubmitting] = useState(false);

  // Load ePayco SDK
  useEffect(() => {
    if (window.ePayco) return;
    const script = document.createElement("script");
    script.src = "https://checkout.epayco.co/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleSubscribe = async (planCode: "premium" | "ultra") => {
    if (!user) {
      navigate("/auth?redirect=/pricing");
      return;
    }
    setSelected(planCode);
  };

  const tokenizeCard = async (): Promise<string> => {
    const publicKey = import.meta.env.VITE_EPAYCO_PUBLIC_KEY || (window as any).EPAYCO_PUBLIC_KEY;
    if (!publicKey) {
      // Fallback: ask backend (simpler) — but for MVP we send PAN to a tokenization helper
      throw new Error("Falta configurar VITE_EPAYCO_PUBLIC_KEY");
    }
    // ePayco token-card endpoint
    const res = await fetch(`https://api.secure.payco.co/v1/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(publicKey + ":")}` },
      body: JSON.stringify({
        "card[number]": card.number.replace(/\s/g, ""),
        "card[exp_year]": card.exp_year,
        "card[exp_month]": card.exp_month,
        "card[cvc]": card.cvc,
        hasCvv: true,
      }),
    });
    const data = await res.json();
    if (!data?.id) throw new Error(data?.message || "No se pudo tokenizar la tarjeta");
    return data.id;
  };

  const handleConfirmPayment = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const token = await tokenizeCard();
      await subscribe.mutateAsync({
        plan_code: selected,
        token_card: token,
        card_holder: card.name,
        card_email: card.email || user?.email,
        card_phone: card.phone,
        doc_type: "CC",
        doc_number: card.doc_number,
      });
      toast.success("¡Suscripción activada!");
      setSelected(null);
    } catch (err: any) {
      toast.error(err.message || "No se pudo procesar el pago");
    } finally {
      setSubmitting(false);
    }
  };

  const currentCode = myPlan.data?.code || "free";
  const sub = mySubscription.data as any;

  const planCard = (code: "free" | "premium" | "ultra", price: number, label: string) => {
    const isCurrent = currentCode === code;
    const accent = code === "ultra" ? "border-[#F6339A]" : code === "premium" ? "border-primary" : "";
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
          <span className="text-3xl font-bold">${price.toLocaleString("es-CO")}</span>
          <span className="text-muted-foreground"> COP/mes</span>
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
            className={code === "ultra" ? "bg-[#F6339A] hover:bg-[#F6339A]/90" : ""}
          >
            Suscribirme
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
          <header className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Elige tu plan</h1>
            <p className="text-muted-foreground">Potencia tu aprendizaje con más Educoins, Notebooks, voz y agentes lectores.</p>
            {currentCode !== "free" && sub && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm bg-primary/10 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-primary" />
                Plan <strong>{myPlan.data?.name}</strong> activo
                {sub.current_period_end && <> hasta {format(new Date(sub.current_period_end), "dd/MM/yyyy")}</>}
                {sub.cancel_at_period_end && <span className="text-orange-500"> (cancelación pendiente)</span>}
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planCard("free", 0, "Free")}
            {planCard("premium", 14900, "Premium")}
            {planCard("ultra", 29500, "Ultra")}
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar plan {selected}</DialogTitle>
            <DialogDescription>Tu tarjeta se cobrará automáticamente cada mes. Puedes cancelar cuando quieras.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Número de tarjeta</Label>
              <Input inputMode="numeric" maxLength={19} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4575 6231 8229 0326" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Mes</Label>
                <Input inputMode="numeric" maxLength={2} value={card.exp_month} onChange={(e) => setCard({ ...card, exp_month: e.target.value })} placeholder="12" />
              </div>
              <div>
                <Label>Año</Label>
                <Input inputMode="numeric" maxLength={4} value={card.exp_year} onChange={(e) => setCard({ ...card, exp_year: e.target.value })} placeholder="2030" />
              </div>
              <div>
                <Label>CVC</Label>
                <Input inputMode="numeric" maxLength={4} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="123" />
              </div>
            </div>
            <div>
              <Label>Nombre en la tarjeta</Label>
              <Input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Email</Label>
                <Input type="email" value={card.email} onChange={(e) => setCard({ ...card, email: e.target.value })} placeholder={user?.email || ""} />
              </div>
              <div>
                <Label>Documento</Label>
                <Input value={card.doc_number} onChange={(e) => setCard({ ...card, doc_number: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={card.phone} onChange={(e) => setCard({ ...card, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={handleConfirmPayment} disabled={submitting} className="bg-[#F6339A] hover:bg-[#F6339A]/90">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Pagar ${selected === "ultra" ? "29.500" : "14.900"} COP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Pricing;
