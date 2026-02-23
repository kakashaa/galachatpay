import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

const BD_API_URL = "http://18.219.229.240/website/bd-data-api.php";
const BD_API_KEY = "ghala2026actions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: Record<string, unknown> = {};

    // Test 1: user-charges (known working action)
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=7524002`, { signal: AbortSignal.timeout(30000) });
      const text = await res.text();
      try { results.user_charges = JSON.parse(text); } catch { results.user_charges = { raw: text.substring(0, 500) }; }
    } catch (e) { results.user_charges = { error: String(e) }; }

    // Test 2: agency-income (known working action)
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=7524002`, { signal: AbortSignal.timeout(30000) });
      const text = await res.text();
      try { 
        const data = JSON.parse(text);
        results.agency_income = {
          ok: data.ok,
          keys: Object.keys(data),
          commission: data.commission,
          salary_report: data.salary_report,
          month: data.month,
          year: data.year,
        };
      } catch { results.agency_income = { raw: text.substring(0, 500) }; }
    } catch (e) { results.agency_income = { error: String(e) }; }

    // Test 3: get_bd_profit
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=get_bd_profit&bd_id=7524002`, { signal: AbortSignal.timeout(30000) });
      const text = await res.text();
      try { results.bd_profit = JSON.parse(text); } catch { results.bd_profit = { raw: text.substring(0, 500) }; }
    } catch (e) { results.bd_profit = { error: String(e) }; }

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
