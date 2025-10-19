import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EpaycoPayload {
  x_cust_id_cliente: string;
  x_ref_payco: string;
  x_id_invoice: string;
  x_transaction_id: string;
  x_amount: string;
  x_currency_code: string;
  x_transaction_state: string;
  x_approval_code: string;
  x_response: string;
  x_response_reason_text: string;
  x_extra1: string; // user_id
  x_extra2: string; // educoins
  x_extra3: string; // transaction_ref
  x_signature: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const epaycoPrivateKey = Deno.env.get("EPAYCO_PRIVATE_KEY")!;
    const epaycoPKey = Deno.env.get("EPAYCO_P_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: EpaycoPayload = await req.json();

    console.log("Received ePayco payment notification:", {
      ref_payco: payload.x_ref_payco,
      invoice: payload.x_id_invoice,
      state: payload.x_transaction_state,
      amount: payload.x_amount,
    });

    // Validate signature
    const signatureString = `${payload.x_cust_id_cliente}^${epaycoPKey}^${payload.x_ref_payco}^${payload.x_transaction_id}^${payload.x_amount}^${payload.x_currency_code}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedSignature = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (calculatedSignature !== payload.x_signature) {
      console.error("Invalid signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = payload.x_extra1;
    const educoins = parseInt(payload.x_extra2);
    const transactionRef = payload.x_extra3;
    const isApproved = payload.x_response === "Aceptada";

    // Update transaction status
    const { error: updateError } = await supabase
      .from("educoin_transactions")
      .update({
        payment_status: isApproved ? "completed" : "failed",
        epayco_ref: payload.x_ref_payco,
        completed_at: isApproved ? new Date().toISOString() : null,
      })
      .eq("transaction_ref", transactionRef);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
      throw updateError;
    }

    // If payment approved, add educoins to user
    if (isApproved) {
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
    console.error("Error processing ePayco payment:", error);
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
