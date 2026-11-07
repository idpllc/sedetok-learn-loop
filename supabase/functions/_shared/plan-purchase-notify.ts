import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Notifies platform admins (roles admin/superadmin) plus the agency inbox
 * when someone starts a plan checkout or actually pays for one.
 * Uses the project's existing SendGrid channel (same as send-email-notification).
 */

const EXTRA_RECIPIENTS = ["jeff@idpagency.co"];
const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

export interface PlanPurchaseEvent {
  kind: "attempt" | "paid";
  source: string; // "Sedefy" or "Colegio: <name>"
  planName: string;
  buyerName?: string | null;
  buyerEmail?: string | null;
  billingCycle?: string | null;
  amountCop?: number | null;
}

const fmtCop = (n?: number | null) =>
  n != null
    ? "$" + Math.round(n).toLocaleString("es-CO") + " COP"
    : "—";

/** Fire-and-forget: keeps running after the response when the runtime allows it. */
export const runInBackground = (p: Promise<unknown>) => {
    p.catch((err) => console.error("plan-purchase-notify failed:", err));
  try {
    (globalThis as { EdgeRuntime?: { waitUntil?: (q: Promise<unknown>) => void } }).EdgeRuntime
      ?.waitUntil?.(p);
  } catch {
    // EdgeRuntime not available — the promise is already running with its own catch.
  }
};

const adminEmails = async (supabaseAdmin: ReturnType<typeof createClient>): Promise<string[]> => {
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "superadmin"]);
  if (error) {
    console.error("plan-purchase-notify: could not read admin roles", error);
    return [];
  }
  const ids = [...new Set((roles || []).map((r: { user_id: string }) => r.user_id))].slice(0, 50);
  const emails = await Promise.all(
    ids.map(async (id) => {
      try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        return data?.user?.email || null;
      } catch {
        return null;
      }
    }),
  );
  return emails.filter((e): e is string => Boolean(e));
};

const row = (label: string, value: string) => `
  <tr>
    <td style="padding:8px 12px;color:#666;font-size:14px;white-space:nowrap;">${label}</td>
    <td style="padding:8px 12px;color:#111;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;

export const notifyPlanPurchase = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  event: PlanPurchaseEvent,
) => {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!apiKey) {
    console.warn("plan-purchase-notify: SENDGRID_API_KEY not configured, skipping");
    return;
  }

  const recipients = [...new Set([...(await adminEmails(supabaseAdmin)), ...EXTRA_RECIPIENTS])];
  if (!recipients.length) return;

  const isPaid = event.kind === "paid";
  const subject = isPaid
    ? `✅ Pago confirmado: ${event.planName} — ${event.source}`
    : `🛒 Intento de compra: ${event.planName} — ${event.source}`;
  const heading = isPaid ? "Un plan fue pagado" : "Un usuario intenta comprar un plan";
  const accent = isPaid ? "#0f9d58" : "#d97706";
  const when = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

  const html = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background-color:#f5f5f5;">
    <div style="background:linear-gradient(135deg,hsl(165,89%,14%) 0%,hsl(165,89%,24%) 100%);padding:24px 20px;border-radius:10px 10px 0 0;text-align:center;">
      <span style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:2px;">SEDEFY</span>
    </div>
    <div style="background:#fff;padding:28px;border-radius:0 0 10px 10px;">
      <div style="display:inline-block;background:${accent};color:#fff;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:bold;margin-bottom:12px;">
        ${isPaid ? "PAGO CONFIRMADO" : "INTENTO DE COMPRA"}
      </div>
      <h2 style="color:hsl(165,89%,14%);margin:0 0 16px;font-size:20px;">${heading}</h2>
      <table style="border-collapse:collapse;width:100%;background:#fafafa;border-radius:8px;">
        ${row("Plan", event.planName)}
        ${row("Fuente", event.source)}
        ${event.buyerName ? row("Comprador", event.buyerName) : ""}
        ${event.buyerEmail ? row("Correo", event.buyerEmail) : ""}
        ${event.billingCycle ? row("Ciclo", event.billingCycle) : ""}
        ${row("Monto", fmtCop(event.amountCop))}
        ${row("Fecha", when)}
      </table>
      <p style="margin-top:24px;font-size:12px;color:#888;text-align:center;">
        Notificación automática de pagos de Sedefy.
      </p>
    </div>
  </body>
</html>`;

  const res = await fetch(SENDGRID_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // One personalization per recipient so addresses stay private between them.
      personalizations: recipients.map((email) => ({ to: [{ email }], subject })),
      from: {
        email: Deno.env.get("SENDGRID_FROM_EMAIL") || "info@sedefy.com",
        name: Deno.env.get("SENDGRID_FROM_NAME") || "SEDEFY",
      },
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) {
    console.error("plan-purchase-notify SendGrid error:", res.status, await res.text());
  } else {
    console.log("plan-purchase-notify sent:", { kind: event.kind, plan: event.planName, recipients: recipients.length });
  }
};
