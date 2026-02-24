const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BAN_REPORT_API_URL = "https://hola-chat.com/ban-report-api.php";
const BAN_REPORT_API_KEY = "ghala2026actions";

const ALLOWED_ACTIONS = new Set([
  "submit-report",
  "my-reports",
  "search-bans",
  "ban-types",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = new URL(BAN_REPORT_API_URL);
    targetUrl.searchParams.set("key", BAN_REPORT_API_KEY);
    targetUrl.searchParams.set("action", action);

    // Forward query params (except action)
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "action" && key.length <= 50 && value.length <= 500) {
        targetUrl.searchParams.set(key, value);
      }
    }

    let response: Response;

    if (req.method === "POST") {
      const body = await req.text();
      if (body.length > 50000) {
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
        JSON.stringify({ success: false, error: "Invalid API response", raw: rawText.substring(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ban-report error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
