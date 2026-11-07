import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MP_BASE = "https://api.mercadopago.com";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeOrigin = (value: unknown) =>
  String(value || "").trim().replace(/\/+$/, "");

const normalizeBaseUrl = (value?: string) => {
  const cleaned = (value || "https://sedefy.com").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
};

/**
 * Looks up the school in the allow-list. Any call to a school API MUST go
 * through this first: `colegio` comes from the URL and without this check
 * anyone could point our server at an arbitrary domain (SSRF).
 */
const getActiveSchool = async (admin: any, originRaw: unknown) => {
  const origin = normalizeOrigin(originRaw);
  if (!origin || !/^https:\/\//i.test(origin)) return null;
  const { data } = await admin
    .from("school_endpoints")
    .select("origin, name, active")
    .eq("origin", origin)
    .maybeSingle();
  if (!data || !data.active) return null;
  return data as { origin: string; name: string; active: boolean };
};

/** Calls the school's public plans API. Never logs the token nor the payload. */
const callSchool = async (
  origin: string,
  token: string,
  init?: { method?: string; body?: unknown },
) => {
  const res = await fetch(`${origin}/api/planes/pago-externo`, {
    method: init?.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(12000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

/** Passes the school's error through so the page can show the right message. */
const schoolError = (status: number, data: any) =>
  json(
    {
      error: data?.error || "No se pudo validar la información con el colegio",
      code: data?.code || undefined,
    },
    status === 200 ? 502 : status,
  );

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const token = String(body.t || "").trim();

    // ---- status: public read of a checkout order (id is an unguessable uuid) ----
    if (action === "status") {
      const pedido = String(body.pedido || "").trim();
      if (!/^[0-9a-fA-F-]{36}$/.test(pedido)) return json({ error: "Pedido inválido" }, 400);
      const { data: co } = await admin
        .from("checkout_orders")
        .select("id, status, amount, school_name, return_url, mp_payment_id, created_at, updated_at")
        .eq("id", pedido)
        .maybeSingle();
      if (!co) return json({ error: "Pedido no encontrado", code: "ORDER_NOT_FOUND" }, 404);
      return json({ order: co });
    }

    // Everything below needs colegio + token
    if (!token) return json({ error: "Falta el token", code: "INVALID_TOKEN" }, 400);

    const school = await getActiveSchool(admin, body.colegio);
    if (!school) {
      // No request leaves the server when the school is not allow-listed.
      return json({ error: "Enlace no válido", code: "INVALID_SCHOOL" }, 400);
    }

    // ---- session: fetch order or family data from the school ----
    if (action === "session") {
      const { status, data } = await callSchool(school.origin, token);
      if (status !== 200) return schoolError(status, data);
      return json(data);
    }

    // ---- quote: price a selection (family token) ----
    if (action === "quote") {
      const items = Array.isArray(body.items) ? body.items : [];
      const { status, data } = await callSchool(school.origin, token, {
        method: "POST",
        body: { action: "quote", items },
      });
      if (status !== 200) return schoolError(status, data);
      return json(data);
    }

    // ---- order: create the order at the school (family token) ----
    if (action === "order") {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return json({ error: "Selecciona al menos un hijo" }, 400);
      const { status, data } = await callSchool(school.origin, token, {
        method: "POST",
        body: { action: "order", items },
      });
      if (status !== 200) return schoolError(status, data);
      return json(data);
    }

    // ---- checkout: create the MercadoPago preference ----
    if (action === "checkout") {
      const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (!mpToken) return json({ error: "Configuración de pagos incompleta" }, 500);

      // 1. Re-validate the order with the school. Amount ALWAYS comes from here.
      const { status: gs, data } = await callSchool(school.origin, token);
      if (gs !== 200) return schoolError(gs, data);
      if (data?.kind !== "order" || !data?.order) {
        return json({ error: "Este enlace no corresponde a un pedido" }, 400);
      }
      const order = data.order;

      if (!["pending", "rejected", "cancelled"].includes(order.status)) {
        return json({ error: "Este pedido no se puede pagar", code: "ORDER_NOT_PAYABLE", order_status: order.status }, 400);
      }
      if (order.expiresAt && new Date(order.expiresAt).getTime() < Date.now()) {
        return json({ error: "Este pedido venció. Vuelve al portal de tu colegio para crear otro.", code: "ORDER_EXPIRED" }, 400);
      }

      // 2. Do not create a second charge if one is already running or approved.
      const { data: existing } = await admin
        .from("checkout_orders")
        .select("id, status")
        .eq("school_origin", school.origin)
        .eq("school_order_id", String(order.id))
        .in("status", ["in_process", "approved"])
        .maybeSingle();
      if (existing) {
        return json({ error: "Este pedido ya tiene un pago en curso o aprobado", code: "ALREADY_IN_PROCESS", order_status: existing.status }, 409);
      }

      const total = Math.round(Number(order.total));
      if (!Number.isFinite(total) || total <= 0) return json({ error: "Monto inválido" }, 400);

      const payerEmail = isValidEmail(String(body.payer_email || ""))
        ? String(body.payer_email).trim()
        : (isValidEmail(String(order.payer?.email || "")) ? String(order.payer.email).trim() : null);
      if (!payerEmail) return json({ error: "Necesitamos tu correo electrónico para el recibo", code: "EMAIL_REQUIRED" }, 400);

      // 3. Create the checkout order row.
      const { data: co, error: coErr } = await admin
        .from("checkout_orders")
        .insert({
          school_origin: school.origin,
          school_order_id: String(order.id),
          school_name: data.school?.name || school.name,
          return_url: typeof data.returnUrl === "string" ? data.returnUrl : null,
          payer_email: payerEmail,
          amount: total,
          status: "pending",
        })
        .select("id")
        .single();
      if (coErr || !co) throw coErr || new Error("No se pudo crear el pedido");

      // 4. Create the MercadoPago preference — one line per child, no child names.
      const lines = Array.isArray(order.items) ? order.items : [];
      let items = lines
        .filter((i: any) => Number(i?.finalPrice) > 0)
        .map((i: any) => ({
          title: `${i.planName || "Sedefy"} ${i.cycleLabel || ""}`.trim(),
          quantity: 1,
          currency_id: "COP",
          unit_price: Math.round(Number(i.finalPrice)),
        }));
      if (!items.length) {
        items = [{ title: `Sedefy - ${data.school?.name || school.name}`, quantity: 1, currency_id: "COP", unit_price: total }];
      }

      const base = normalizeBaseUrl(Deno.env.get("CUSTOM_DOMAIN"));
      const preferencePayload: Record<string, unknown> = {
        items,
        payer: { email: payerEmail },
        external_reference: co.id,
        notification_url: `${supabaseUrl}/functions/v1/mp-checkout-webhook`,
        back_urls: {
          success: `${base}/pagar/resultado?pedido=${co.id}`,
          failure: `${base}/pagar/resultado?pedido=${co.id}`,
          pending: `${base}/pagar/resultado?pedido=${co.id}`,
        },
        auto_return: "approved",
        statement_descriptor: "SEDEFY",
        metadata: { checkout_order_id: co.id },
      };

      const mpRes = await fetch(`${MP_BASE}/checkout/preferences`, {
        method: "POST",
        headers: { Authorization: `Bearer ${mpToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(preferencePayload),
      });
      const mpData = await mpRes.json().catch(() => ({}));
      console.log("pagar-api mp preference:", { status: mpRes.status, id: mpData?.id });

      if (!mpRes.ok || !mpData?.id) {
        await admin.from("checkout_orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", co.id);
        return json({ error: "No se pudo crear el pago con MercadoPago" }, 502);
      }

      return json({ success: true, pedido: co.id, init_point: mpData.init_point || mpData.sandbox_init_point });
    }

    return json({ error: "Acción inválida" }, 400);
  } catch (err) {
    console.error("pagar-api error:", (err as Error).message);
    return json({ error: "Error interno. Intenta de nuevo." }, 500);
  }
});
