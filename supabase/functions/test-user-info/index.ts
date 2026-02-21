import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BD_API_URL = "http://18.219.229.240/website/bd-data-api.php";
  const BD_API_KEY = "ghala2026actions";
  const uuid = "3734853";

  const results: Record<string, unknown> = {};

  // Test 1: user-charges endpoint (30s timeout)
  try {
    const url = `${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=${uuid}`;
    console.log(`[TEST] Calling: ${url}`);
    const start = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const elapsed = Date.now() - start;
    const body = await res.text();
    results.user_charges = { status: res.status, elapsed_ms: elapsed, body: body.substring(0, 500) };
    console.log(`[TEST] user-charges: ${res.status} in ${elapsed}ms - ${body.substring(0, 200)}`);
  } catch (err) {
    results.user_charges = { error: String(err), type: (err as Error)?.constructor?.name };
    console.error(`[TEST] user-charges ERROR:`, err);
  }

  // Test 2: agency-income endpoint
  try {
    const url2 = `${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${uuid}`;
    const start2 = Date.now();
    const res2 = await fetch(url2, { signal: AbortSignal.timeout(30000) });
    const elapsed2 = Date.now() - start2;
    const body2 = await res2.text();
    results.agency_income = { status: res2.status, elapsed_ms: elapsed2, body: body2.substring(0, 500) };
    console.log(`[TEST] agency-income: ${res2.status} in ${elapsed2}ms - ${body2.substring(0, 200)}`);
  } catch (err2) {
    results.agency_income = { error: String(err2), type: (err2 as Error)?.constructor?.name };
    console.error(`[TEST] agency-income ERROR:`, err2);
  }

  // Test 3: Simple connectivity to the IP
  try {
    const start3 = Date.now();
    const res3 = await fetch(`http://18.219.229.240/`, { signal: AbortSignal.timeout(10000) });
    const elapsed3 = Date.now() - start3;
    results.ip_reachable = { status: res3.status, elapsed_ms: elapsed3 };
    await res3.text();
  } catch (err3) {
    results.ip_reachable = { error: String(err3), type: (err3 as Error)?.constructor?.name };
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
