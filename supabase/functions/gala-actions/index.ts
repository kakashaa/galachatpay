import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowlist of valid actions to prevent arbitrary API calls
const ALLOWED_ACTIONS = new Set([
  "list-wares", "list-requests", "submit-request", "update-request",
  "get-user", "get-stats",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ACTIONS_URL = Deno.env.get("GALA_ACTIONS_URL");
    const ACTIONS_KEY = Deno.env.get("GALA_ACTIONS_KEY");
    if (!ACTIONS_URL) throw new Error("Server configuration error");
    if (!ACTIONS_KEY) throw new Error("Server configuration error");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    if (!action || typeof action !== "string" || action.length > 50) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid 'action' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate action against allowlist
    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Action not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build target URL
    const targetUrl = new URL(ACTIONS_URL);
    targetUrl.searchParams.set("key", ACTIONS_KEY);
    targetUrl.searchParams.set("action", action);

    // Forward additional query params for GET requests (sanitize)
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "action" && key.length <= 50 && value.length <= 500) {
        targetUrl.searchParams.set(key, value);
      }
    }

    let response: Response;

    if (req.method === "POST") {
      const body = await req.text();
      // Limit body size
      if (body.length > 10000) {
        return new Response(
          JSON.stringify({ success: false, error: "Request body too large" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-actions error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
