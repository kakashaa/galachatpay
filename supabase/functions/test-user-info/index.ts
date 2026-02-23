import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: Record<string, unknown> = {};

    // Test HTTP
    try {
      const res = await fetch("http://18.219.229.240/website/salary-api.php?key=ghala2026actions&uuid=80001", { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      results.http_status = res.status;
      try { results.http_data = JSON.parse(text); } catch { results.http_raw = text.substring(0, 500); }
    } catch (e) { results.http_error = String(e); }

    // Test HTTPS
    try {
      const res = await fetch("https://18.219.229.240/website/salary-api.php?key=ghala2026actions&uuid=80001", { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      results.https_status = res.status;
      try { results.https_data = JSON.parse(text); } catch { results.https_raw = text.substring(0, 500); }
    } catch (e) { results.https_error = String(e); }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
