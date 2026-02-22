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

    // Test 1: agency-salaries without month/year
    try {
      const res1 = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-salaries&agency_id=181`, { signal: AbortSignal.timeout(15000) });
      results.agency_salaries_no_date = await res1.json();
    } catch (e) { results.agency_salaries_no_date = { error: String(e) }; }

    // Test 2: agency-salaries for Jan 2026
    try {
      const res2 = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-salaries&agency_id=181&month=1&year=2026`, { signal: AbortSignal.timeout(15000) });
      results.agency_salaries_jan = await res2.json();
    } catch (e) { results.agency_salaries_jan = { error: String(e) }; }

    // Test 3: host-stats for 7524002
    try {
      const res3 = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=host-stats&uuid=7524002`, { signal: AbortSignal.timeout(15000) });
      results.host_stats = await res3.json();
    } catch (e) { results.host_stats = { error: String(e) }; }

    // Test 4: agency-income for a known agency owner (uuid 996060 owns agency 1)
    // Just to verify the endpoint works with correct data
    try {
      const res4 = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=996060`, { signal: AbortSignal.timeout(15000) });
      const data4 = await res4.json();
      const { agencies, ...rest4 } = data4;
      results.agency_income_996060 = { ...rest4, agencies_count: agencies?.length };
    } catch (e) { results.agency_income_996060 = { error: String(e) }; }

    // Test 5: bd-dashboard
    try {
      const res5 = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=bd-dashboard&month=2&year=2026`, { signal: AbortSignal.timeout(15000) });
      const data5 = await res5.json();
      // Just get top-level keys and summary
      results.bd_dashboard = { keys: Object.keys(data5), ok: data5.ok };
    } catch (e) { results.bd_dashboard = { error: String(e) }; }

    // Test 6: agency-salaries for agency 2 (which we know has salary $1078.60)
    try {
      const res6 = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-salaries&agency_id=2&month=2&year=2026`, { signal: AbortSignal.timeout(15000) });
      results.agency_salaries_2 = await res6.json();
    } catch (e) { results.agency_salaries_2 = { error: String(e) }; }

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
