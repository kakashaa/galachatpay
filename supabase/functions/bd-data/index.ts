import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BD_DATA_URL = "http://18.219.229.240/website/bd-data-api.php";
const API_KEY = "ghala2026actions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ ok: false, error: "action required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query string
    const qp = new URLSearchParams();
    qp.append("key", API_KEY);
    qp.append("action", action);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qp.append(k, String(v));
    }

    const url = `${BD_DATA_URL}?${qp.toString()}`;
    console.log(`[bd-data] GET ${url}`);

    const apiRes = await fetch(url);
    const rawText = await apiRes.text();
    console.log(`[bd-data] Response for action="${action}":`, rawText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { ok: false, error: "Invalid API response", raw: rawText.substring(0, 200) };
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
