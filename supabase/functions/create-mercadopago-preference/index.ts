import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PreferenceRequest {
  title: string;
  description: string;
  unit_price: number;
  quantity: number;
  external_reference: string;
  payer: {
    name: string;
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
  notification_url: string;
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mercadoPagoAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    if (!mercadoPagoAccessToken) {
      throw new Error("MercadoPago access token not configured");
    }

    const preferenceData: PreferenceRequest = await req.json();

    console.log("Creating MercadoPago preference:", {
      title: preferenceData.title,
      external_reference: preferenceData.external_reference,
    });

    // Crear la preferencia de pago en MercadoPago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: preferenceData.title,
            description: preferenceData.description,
            unit_price: preferenceData.unit_price,
            quantity: preferenceData.quantity,
            currency_id: "COP",
          },
        ],
        payer: preferenceData.payer,
        external_reference: preferenceData.external_reference,
        notification_url: preferenceData.notification_url,
        back_urls: preferenceData.back_urls,
        auto_return: preferenceData.auto_return,
        statement_descriptor: "SEDEFY",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("MercadoPago API error:", error);
      throw new Error(`MercadoPago API error: ${error}`);
    }

    const preference = await response.json();

    console.log("Preference created successfully:", preference.id);

    return new Response(
      JSON.stringify({ 
        preference_id: preference.id,
        init_point: preference.init_point,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating MercadoPago preference:", error);
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
