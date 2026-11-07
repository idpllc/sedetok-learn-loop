import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2, Clock, ArrowLeft } from "lucide-react";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/pagar-api`;

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

const callApi = async (action: string, payload: Record<string, unknown>) => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error || "Algo salió mal. Intenta de nuevo.", data?.code);
  return data;
};

const messageFor = (code?: string, fallback?: string) => {
  if (code === "INVALID_TOKEN" || code === "ORDER_NOT_FOUND" || code === "FAMILY_NOT_FOUND") {
    return "Este enlace ya no es válido. Pide uno nuevo en el portal de tu colegio.";
  }
  if (code === "RATE_LIMITED") return "Intenta de nuevo en un momento.";
  if (code === "INVALID_SCHOOL") return "Enlace no válido";
  return fallback || "Algo salió mal. Intenta de nuevo.";
};

type Plan = { code: string; name: string; monthly: number; annual: number };
type Child = {
  beneficiaryKey: string;
  name: string;
  detail?: string;
  activeStudent: boolean;
  currentPlan: { code: string; name: string; endsAt: string } | null;
};
type OrderItem = {
  beneficiaryKey: string;
  name: string;
  planCode: string;
  planName: string;
  billingCycle: string;
  cycleLabel: string;
  months: number;
  listPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
};
type OrderData = {
  id: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  expiresAt: string | null;
  paidAt: string | null;
  payer: { name: string; email: string };
  items: OrderItem[];
};
type SessionData =
  | { kind: "order"; school: { name: string; origin: string }; order: OrderData; returnUrl: string }
  | {
      kind: "family";
      school: { name: string; origin: string };
      payer: { name: string; email: string };
      plans: Plan[];
      children: Child[];
      returnUrl: string;
    };

type Quote = { subtotal: number; discount: number; total: number; lines?: unknown[] };

const Pagar = () => {
  const [params, setParams] = useSearchParams();
  const colegio = params.get("colegio") || "";
  const token = params.get("t") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);

  // Family selection state
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Payment state
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSession(null);
    setQuote(null);
    setSelection({});
    setPayError(null);
    (async () => {
      try {
        const data = await callApi("session", { colegio, t: token });
        if (cancelled) return;
        setSession(data);
        if (data?.kind === "order" && data.order?.payer?.email) setEmail(data.order.payer.email);
        if (data?.kind === "family" && data.payer?.email) setEmail(data.payer.email);
      } catch (e) {
        if (cancelled) return;
        const err = e as ApiError;
        setError(messageFor(err.code, err.message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [colegio, token]);

  const selectedItems = useCallback(() => {
    if (!session || session.kind !== "family") return [];
    return Object.entries(selection)
      .filter(([, plan]) => plan && plan !== "none")
      .map(([beneficiaryKey, planCode]) => ({ beneficiaryKey, planCode, billingCycle: cycle }));
  }, [session, selection, cycle]);

  // Re-quote whenever the selection or the billing cycle changes
  useEffect(() => {
    if (!session || session.kind !== "family") return;
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    const items = selectedItems();
    if (!items.length) {
      setQuote(null);
      setQuoting(false);
      return;
    }
    setQuoting(true);
    quoteTimer.current = setTimeout(async () => {
      try {
        const data = await callApi("quote", { colegio, t: token, items });
        setQuote({ subtotal: data.subtotal, discount: data.discount, total: data.total, lines: data.lines });
      } catch (e) {
        const err = e as ApiError;
        if (err.code === "INVALID_TOKEN" || err.code === "FAMILY_NOT_FOUND") {
          setError(messageFor(err.code, err.message));
        }
        setQuote(null);
      } finally {
        setQuoting(false);
      }
    }, 400);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [session, selection, cycle, colegio, token, selectedItems]);

  const handleContinue = async () => {
    const items = selectedItems();
    if (!items.length) return;
    setOrdering(true);
    setPayError(null);
    try {
      const data = await callApi("order", { colegio, t: token, items });
      if (!data?.token) throw new ApiError("No se pudo crear el pedido");
      setParams({ colegio, t: data.token });
    } catch (e) {
      const err = e as ApiError;
      setPayError(messageFor(err.code, err.message));
    } finally {
      setOrdering(false);
    }
  };

  const handlePay = async () => {
    if (!session || session.kind !== "order") return;
    const needsEmail = !session.order.payer?.email;
    if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPayError("Escribe un correo electrónico válido para el recibo");
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const data = await callApi("checkout", { colegio, t: token, payer_email: email || undefined });
      if (!data?.init_point) throw new ApiError("No se pudo crear el pago");
      // Keep the link locally (never in the DB) to offer "try again" after a rejection
      try {
        sessionStorage.setItem("pagar_retry", JSON.stringify({ colegio, t: token }));
      } catch (_) {}
      window.location.href = data.init_point;
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "ORDER_NOT_PAYABLE" || err.code === "ALREADY_IN_PROCESS" || err.code === "ORDER_EXPIRED") {
        // Refresh the session so the page shows the real order state
        window.location.reload();
        return;
      }
      setPayError(messageFor(err.code, err.message));
      setPaying(false);
    }
  };

  const schoolName = session?.school?.name || "tu colegio";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Helmet>
        <title>Pagar | Sedefy</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <span className="text-xl font-extrabold tracking-tight">
            SEDE<span className="text-[#F6339A]">FY</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4 text-[#F6339A]" /> Pago seguro
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#F6339A]" />
            <p className="text-sm">Cargando tu pedido…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-[#F6339A]" />
            <h1 className="mt-3 text-lg font-bold">No pudimos abrir este enlace</h1>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
          </div>
        )}

        {!loading && !error && session?.kind === "family" && (
          <FamilyStep
            session={session}
            cycle={cycle}
            setCycle={setCycle}
            selection={selection}
            setSelection={setSelection}
            quote={quote}
            quoting={quoting}
            ordering={ordering}
            payError={payError}
            onContinue={handleContinue}
          />
        )}

        {!loading && !error && session?.kind === "order" && (
          <OrderStep
            session={session}
            email={email}
            setEmail={setEmail}
            paying={paying}
            payError={payError}
            onPay={handlePay}
          />
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          Cobro procesado por MercadoPago para {schoolName}. Sedefy no guarda datos de los estudiantes.
        </p>
      </main>
    </div>
  );
};

/* ---------------- Family step: choose children and plans ---------------- */

const FamilyStep = ({
  session,
  cycle,
  setCycle,
  selection,
  setSelection,
  quote,
  quoting,
  ordering,
  payError,
  onContinue,
}: {
  session: Extract<SessionData, { kind: "family" }>;
  cycle: "monthly" | "yearly";
  setCycle: (c: "monthly" | "yearly") => void;
  selection: Record<string, string>;
  setSelection: (s: Record<string, string>) => void;
  quote: Quote | null;
  quoting: boolean;
  ordering: boolean;
  payError: string | null;
  onContinue: () => void;
}) => {
  const selectedCount = Object.values(selection).filter((v) => v && v !== "none").length;

  return (
    <div>
      <h1 className="text-xl font-bold">Planes Sedefy en {session.school.name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Hola{session.payer?.name ? `, ${session.payer.name}` : ""}. Elige el plan para cada hijo y paga todo en una sola transacción.
      </p>

      {/* Billing cycle toggle */}
      <div className="mt-5 grid grid-cols-2 rounded-xl bg-gray-200/70 p-1">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              cycle === c ? "bg-white text-gray-900 shadow" : "text-gray-500"
            }`}
          >
            {c === "monthly" ? "Mensual" : "Anual"}
          </button>
        ))}
      </div>

      {/* Children cards */}
      <div className="mt-4 space-y-3">
        {session.children.map((child) => {
          const current = selection[child.beneficiaryKey] || "none";
          const disabled = !child.activeStudent;
          return (
            <div key={child.beneficiaryKey} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{child.name}</p>
                  {child.detail && <p className="text-xs text-gray-500">{child.detail}</p>}
                </div>
                {child.currentPlan ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
                    {child.currentPlan.name} · vence {new Date(child.currentPlan.endsAt).toLocaleDateString("es-CO")}
                  </span>
                ) : disabled ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
                    Sin matrícula vigente
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[{ code: "none", name: "Ninguno" }, ...session.plans].map((plan) => {
                  const active = current === plan.code;
                  const price =
                    plan.code === "none" ? null : cycle === "monthly" ? (plan as Plan).monthly : (plan as Plan).annual;
                  return (
                    <button
                      key={plan.code}
                      type="button"
                      disabled={disabled && plan.code !== "none"}
                      onClick={() => setSelection({ ...selection, [child.beneficiaryKey]: plan.code })}
                      className={`rounded-xl border px-2 py-2 text-center transition-colors ${
                        active
                          ? "border-[#F6339A] bg-[#F6339A]/5 ring-1 ring-[#F6339A]"
                          : "border-gray-200 bg-white"
                      } ${disabled && plan.code !== "none" ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      <span className={`block text-xs font-semibold ${active ? "text-[#F6339A]" : "text-gray-700"}`}>
                        {plan.code === "none" ? "Ninguno" : plan.name.replace("Sedefy ", "")}
                      </span>
                      {price != null && (
                        <span className="mt-0.5 block text-[11px] text-gray-500">{fmtCOP(price)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live quote */}
      {selectedCount > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {quoting || !quote ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#F6339A]" /> Calculando total…
            </div>
          ) : (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{fmtCOP(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento por hermanos</span>
                  <span>-{fmtCOP(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                <span>Total</span>
                <span>{fmtCOP(quote.total)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {payError && <p className="mt-3 text-center text-sm text-red-600">{payError}</p>}

      <button
        type="button"
        onClick={onContinue}
        disabled={selectedCount === 0 || ordering || quoting}
        className="mt-5 w-full rounded-xl bg-[#F6339A] py-3.5 text-base font-bold text-white shadow-sm transition-opacity disabled:opacity-40"
      >
        {ordering ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Creando pedido…
          </span>
        ) : (
          "Continuar"
        )}
      </button>
    </div>
  );
};

/* ---------------- Order step: summary and pay ---------------- */

const OrderStep = ({
  session,
  email,
  setEmail,
  paying,
  payError,
  onPay,
}: {
  session: Extract<SessionData, { kind: "order" }>;
  email: string;
  setEmail: (v: string) => void;
  paying: boolean;
  payError: string | null;
  onPay: () => void;
}) => {
  const order = session.order;
  const expired = order.expiresAt ? new Date(order.expiresAt).getTime() < Date.now() : false;

  const stateCard = (icon: React.ReactNode, title: string, text: string, showBack = true) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
      {icon}
      <h1 className="mt-3 text-lg font-bold">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">{text}</p>
      {showBack && session.returnUrl && (
        <a
          href={session.returnUrl}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F6339A] py-3 text-base font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a mi colegio
        </a>
      )}
    </div>
  );

  if (order.status === "approved") {
    return stateCard(
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />,
      "Este pedido ya está pagado",
      "No necesitas hacer nada más.",
    );
  }
  if (order.status === "in_process") {
    return stateCard(
      <Clock className="mx-auto h-10 w-10 text-amber-500" />,
      "Tu pago está en proceso",
      "Te avisaremos cuando se confirme.",
    );
  }
  if (order.status === "refunded" || expired) {
    return stateCard(
      <AlertCircle className="mx-auto h-10 w-10 text-[#F6339A]" />,
      "Este pedido venció",
      "Vuelve al portal de tu colegio para crear otro.",
    );
  }

  const needsEmail = !order.payer?.email;

  return (
    <div>
      <h1 className="text-xl font-bold">Tu pedido en {session.school.name}</h1>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.beneficiaryKey} className="flex items-baseline justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.planName} {item.cycleLabel?.toLowerCase()}
                </p>
              </div>
              <span className="shrink-0 font-medium">{fmtCOP(item.listPrice)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Descuento por hermanos</span>
              <span>-{fmtCOP(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{fmtCOP(order.total)}</span>
          </div>
        </div>
      </div>

      {needsEmail && (
        <div className="mt-4">
          <label htmlFor="payer-email" className="text-sm font-medium text-gray-700">
            Correo para el recibo
          </label>
          <input
            id="payer-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#F6339A] focus:ring-1 focus:ring-[#F6339A]"
          />
        </div>
      )}

      {payError && <p className="mt-3 text-center text-sm text-red-600">{payError}</p>}

      <button
        type="button"
        onClick={onPay}
        disabled={paying}
        className="mt-5 w-full rounded-xl bg-[#F6339A] py-3.5 text-base font-bold text-white shadow-sm transition-opacity disabled:opacity-40"
      >
        {paying ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Redirigiendo a MercadoPago…
          </span>
        ) : (
          "Pagar con MercadoPago"
        )}
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
        <ShieldCheck className="h-3.5 w-3.5" /> Pago procesado de forma segura por MercadoPago
      </p>
    </div>
  );
};

export default Pagar;
