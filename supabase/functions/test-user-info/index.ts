import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

const SALARY_API_URL = "http://18.219.229.240/website/salary-api.php";
const API_KEY = "ghala2026actions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: Record<string, unknown> = {};

    // Test salary-api.php for uuid 7524002
    try {
      const url = `${SALARY_API_URL}?key=${API_KEY}&uuid=7524002`;
      results.request_url = url;
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const text = await res.text();
      results.status = res.status;
      try { results.salary_data = JSON.parse(text); } catch { results.salary_raw = text.substring(0, 2000); }
    } catch (e) { results.salary_error = String(e); }

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
