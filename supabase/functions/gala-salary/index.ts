import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createHmacSignature } from "../_shared/hmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uuid, amount, type } = await req.json();

    if (!uuid || !amount || !type) {
      return new Response(
        JSON.stringify({ success: false, error: "uuid, amount, and type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_SECRET = Deno.env.get("GALA_API_SECRET");
    if (!API_SECRET) throw new Error("GALA_API_SECRET is not configured");

    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("GALA_API_BASE_URL is not configured");

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ uuid, amount, type });
    const signature = await createHmacSignature(API_SECRET, body + timestamp);

    const response = await fetch(`${BASE_URL}/api/newWebsite/transaction/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SIGNATURE": signature,
        "X-TIMESTAMP": timestamp,
      },
      body,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || "Transaction check failed" }),
        { status: response.status === 200 ? 400 : response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-salary error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
