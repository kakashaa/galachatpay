import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ACTIONS_URL = Deno.env.get("GALA_ACTIONS_URL");
    const ACTIONS_KEY = Deno.env.get("GALA_ACTIONS_KEY");
    if (!ACTIONS_URL) throw new Error("GALA_ACTIONS_URL is not configured");
    if (!ACTIONS_KEY) throw new Error("GALA_ACTIONS_KEY is not configured");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    if (!action) throw new Error("Missing 'action' parameter");

    // Build target URL
    const targetUrl = new URL(ACTIONS_URL);
    targetUrl.searchParams.set("key", ACTIONS_KEY);
    targetUrl.searchParams.set("action", action);

    // Forward additional query params for GET requests
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "action") {
        targetUrl.searchParams.set(key, value);
      }
    }

    let response: Response;

    if (req.method === "POST") {
      const body = await req.text();
      response = await fetch(targetUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } else {
      response = await fetch(targetUrl.toString(), {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
    }

    const rawText = await response.text();
    console.log(`gala-actions [${action}] status:`, response.status);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API response", raw: rawText.substring(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-actions error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
