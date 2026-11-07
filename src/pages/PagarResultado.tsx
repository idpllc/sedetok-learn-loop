import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, CheckCircle2, Clock, XCircle, ArrowLeft, RotateCcw } from "lucide-react";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/pagar-api`;

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

type OrderStatus = {
  id: string;
  status: string;
  amount: number;
  school_name: string | null;
  return_url: string | null;
};

const PagarResultado = () => {
  const [params] = useSearchParams();
  const pedido = params.get("pedido") || "";

  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryLink, setRetryLink] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pagar_retry");
      if (raw) {
        const { colegio, t } = JSON.parse(raw);
        if (colegio && t) setRetryLink(`/pagar?colegio=${encodeURIComponent(colegio)}&t=${encodeURIComponent(t)}`);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!pedido) {
      setError("Enlace inválido");
      return;
    }
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", pedido }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error === "Pedido no encontrado" ? "No encontramos este pedido" : "No pudimos consultar el estado del pago");
          return;
        }
        setOrder(data.order);
        // Keep polling while the payment is not final
        if (["pending", "in_process"].includes(data.order?.status)) {
          pollTimer.current = setTimeout(fetchStatus, 5000);
        }
      } catch (_) {
        if (!cancelled) pollTimer.current = setTimeout(fetchStatus, 8000);
      }
    };
    fetchStatus();
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [pedido]);

  const backButton = order?.return_url ? (
    <a
      href={order.return_url}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F6339A] py-3 text-base font-bold text-white"
    >
      <ArrowLeft className="h-4 w-4" /> Volver a mi colegio
    </a>
  ) : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Helmet>
        <title>Resultado del pago | Sedefy</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <span className="text-xl font-extrabold tracking-tight">
            SEDE<span className="text-[#F6339A]">FY</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-10">
        {!order && !error && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#F6339A]" />
            <p className="text-sm">Consultando el estado de tu pago…</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <XCircle className="mx-auto h-10 w-10 text-[#F6339A]" />
            <h1 className="mt-3 text-lg font-bold">{error}</h1>
          </div>
        )}

        {order && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            {order.status === "approved" && (
              <>
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                <h1 className="mt-3 text-xl font-bold">¡Pago aprobado!</h1>
                <p className="mt-2 text-sm text-gray-600">
                  {order.school_name ? `${order.school_name} activará el plan de inmediato.` : "El colegio activará el plan de inmediato."}
                </p>
                <p className="mt-1 text-sm font-semibold">{fmtCOP(order.amount)}</p>
                {backButton}
              </>
            )}

            {(order.status === "pending" || order.status === "in_process") && (
              <>
                <Clock className="mx-auto h-12 w-12 text-amber-500" />
                <h1 className="mt-3 text-xl font-bold">Tu pago está en proceso</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Estamos esperando la confirmación. Esta página se actualiza sola.
                </p>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando…
                </p>
                {backButton}
              </>
            )}

            {(order.status === "rejected" || order.status === "cancelled") && (
              <>
                <XCircle className="mx-auto h-12 w-12 text-red-500" />
                <h1 className="mt-3 text-xl font-bold">El pago no se completó</h1>
                <p className="mt-2 text-sm text-gray-600">No se realizó ningún cobro. Puedes intentarlo de nuevo.</p>
                {retryLink && (
                  <Link
                    to={retryLink}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F6339A] py-3 text-base font-bold text-white"
                  >
                    <RotateCcw className="h-4 w-4" /> Intentar de nuevo
                  </Link>
                )}
                {backButton}
              </>
            )}

            {(order.status === "refunded" || order.status === "charged_back") && (
              <>
                <XCircle className="mx-auto h-12 w-12 text-[#F6339A]" />
                <h1 className="mt-3 text-xl font-bold">Pago reembolsado</h1>
                <p className="mt-2 text-sm text-gray-600">El dinero fue devuelto. Si tienes dudas, habla con tu colegio.</p>
                {backButton}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PagarResultado;
