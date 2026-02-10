import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createHmacSignature } from "../_shared/hmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uuid, password } = await req.json();

    if (!uuid || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "uuid and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_SECRET = Deno.env.get("GALA_API_SECRET");
    if (!API_SECRET) throw new Error("GALA_API_SECRET is not configured");

    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("GALA_API_BASE_URL is not configured");

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ uuid, password });
    const signature = await createHmacSignature(API_SECRET, body + timestamp);

    const response = await fetch(`${BASE_URL}/api/newWebsite/auth/login/uuid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_SECRET}`,
        "X-SIGNATURE": signature,
        "X-TIMESTAMP": timestamp,
      },
      body,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Non-JSON response:", text.substring(0, 200));
      return new Response(
        JSON.stringify({ success: false, error: "API returned invalid response. Check BASE_URL." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok || !data.success) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || "Login failed" }),
        { status: response.status === 200 ? 401 : response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-login error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
