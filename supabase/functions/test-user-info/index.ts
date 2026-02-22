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

    // Test 1: user-info for 7524002
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=user-info&uuid=7524002`, { signal: AbortSignal.timeout(15000) });
      results.user_info = await res.json();
    } catch (e) { results.user_info = { error: String(e) }; }

    // Test 2: host-salary for 7524002
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=host-salary&uuid=7524002`, { signal: AbortSignal.timeout(15000) });
      results.host_salary = await res.json();
    } catch (e) { results.host_salary = { error: String(e) }; }

    // Test 3: agency-income for 7524002
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=7524002`, { signal: AbortSignal.timeout(15000) });
      results.agency_income = await res.json();
    } catch (e) { results.agency_income = { error: String(e) }; }

    // Test 4: user-charges for 7524002
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=7524002`, { signal: AbortSignal.timeout(15000) });
      results.user_charges = await res.json();
    } catch (e) { results.user_charges = { error: String(e) }; }

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
