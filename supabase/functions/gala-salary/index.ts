import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

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

    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("GALA_API_BASE_URL is not configured");

    const endpoint = "transaction/check";
    const signPath = "api/newWebsite/" + endpoint;
    const headers = await getGalaHeaders("POST", signPath);

    const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uuid, amount, type }),
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
