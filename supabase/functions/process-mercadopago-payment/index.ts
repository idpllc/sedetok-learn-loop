import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MercadoPagoNotification {
  id: string;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: string;
  user_id: string;
  version: string;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mercadoPagoAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // MercadoPago envía notificaciones del tipo "payment"
    const notification: MercadoPagoNotification = await req.json();

    console.log("Received MercadoPago notification:", notification);

    // Solo procesar notificaciones de pago
    if (notification.type !== "payment") {
      return new Response(JSON.stringify({ success: true, message: "Not a payment notification" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener detalles del pago
    const paymentId = notification.data.id;
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mercadoPagoAccessToken}`,
        },
      }
    );

    if (!paymentResponse.ok) {
      throw new Error("Error fetching payment details");
    }

    const payment = await paymentResponse.json();

    console.log("Payment details:", {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
    });

    const transactionRef = payment.external_reference;
    const isApproved = payment.status === "approved";

    // Buscar la transacción en la base de datos
    const { data: transaction, error: transactionError } = await supabase
      .from("educoin_transactions")
      .select("*")
      .eq("transaction_ref", transactionRef)
      .single();

    if (transactionError || !transaction) {
      console.error("Transaction not found:", transactionRef);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Actualizar el estado de la transacción
    const { error: updateError } = await supabase
      .from("educoin_transactions")
      .update({
        payment_status: isApproved ? "completed" : payment.status === "rejected" ? "failed" : "pending",
        epayco_ref: payment.id.toString(),
        completed_at: isApproved ? new Date().toISOString() : null,
      })
      .eq("transaction_ref", transactionRef);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
      throw updateError;
    }

    // Si el pago está aprobado, agregar educoins al usuario
    if (isApproved) {
      const userId = transaction.user_id;
      const educoins = transaction.educoins;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("educoins")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      const currentBalance = profile.educoins || 0;
      const newBalance = currentBalance + educoins;

      const { error: updateBalanceError } = await supabase
        .from("profiles")
        .update({ educoins: newBalance })
        .eq("id", userId);

      if (updateBalanceError) throw updateBalanceError;

      console.log(`Successfully added ${educoins} educoins to user ${userId}`);
    }

    return new Response(
      JSON.stringify({ success: true, approved: isApproved }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing MercadoPago payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
