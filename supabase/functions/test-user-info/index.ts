import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ACTIONS_URL = Deno.env.get("GALA_ACTIONS_URL") || "http://18.219.229.240/website/admin-actions.php";
  const ACTIONS_KEY = Deno.env.get("GALA_ACTIONS_KEY") || "";
  const BD_API_KEY = "ghala2026actions";
  const uuid = "3734853";

  const results: Record<string, unknown> = {};
  results.config = {
    actions_url: ACTIONS_URL,
    actions_key_set: !!ACTIONS_KEY,
    actions_key_preview: ACTIONS_KEY ? ACTIONS_KEY.substring(0, 4) + "..." : "NOT SET",
  };

  // Test 1: admin-actions.php with GALA_ACTIONS_KEY (POST form-urlencoded)
  try {
    const start = Date.now();
    const body = new URLSearchParams({
      key: ACTIONS_KEY,
      action: "user-charges",
      uuid: uuid,
    });
    console.log(`[TEST] POST ${ACTIONS_URL} with GALA_ACTIONS_KEY action=user-charges`);
    const res = await fetch(ACTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(30000),
    });
    const elapsed = Date.now() - start;
    const text = await res.text();
    results.admin_actions_with_env_key = { status: res.status, elapsed_ms: elapsed, body: text.substring(0, 500) };
    console.log(`[TEST] admin-actions GALA_ACTIONS_KEY: ${res.status} in ${elapsed}ms - ${text.substring(0, 300)}`);
  } catch (err) {
    results.admin_actions_with_env_key = { error: String(err), type: (err as Error)?.constructor?.name };
    console.error(`[TEST] admin-actions GALA_ACTIONS_KEY ERROR:`, err);
  }

  // Test 2: admin-actions.php with ghala2026actions key (POST form-urlencoded)
  try {
    const start2 = Date.now();
    const body2 = new URLSearchParams({
      key: BD_API_KEY,
      action: "user-charges",
      uuid: uuid,
    });
    const res2 = await fetch(ACTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body2.toString(),
      signal: AbortSignal.timeout(30000),
    });
    const elapsed2 = Date.now() - start2;
    const text2 = await res2.text();
    results.admin_actions_with_bd_key = { status: res2.status, elapsed_ms: elapsed2, body: text2.substring(0, 500) };
    console.log(`[TEST] admin-actions ghala2026actions: ${res2.status} in ${elapsed2}ms - ${text2.substring(0, 300)}`);
  } catch (err2) {
    results.admin_actions_with_bd_key = { error: String(err2), type: (err2 as Error)?.constructor?.name };
    console.error(`[TEST] admin-actions ghala2026actions ERROR:`, err2);
  }

  // Test 3: agency-income with GALA_ACTIONS_KEY
  try {
    const start3 = Date.now();
    const body3 = new URLSearchParams({
      key: ACTIONS_KEY,
      action: "agency-income",
      uuid: uuid,
    });
    const res3 = await fetch(ACTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body3.toString(),
      signal: AbortSignal.timeout(30000),
    });
    const elapsed3 = Date.now() - start3;
    const text3 = await res3.text();
    results.agency_income_env_key = { status: res3.status, elapsed_ms: elapsed3, body: text3.substring(0, 500) };
    console.log(`[TEST] agency-income GALA_ACTIONS_KEY: ${res3.status} in ${elapsed3}ms - ${text3.substring(0, 300)}`);
  } catch (err3) {
    results.agency_income_env_key = { error: String(err3), type: (err3 as Error)?.constructor?.name };
    console.error(`[TEST] agency-income GALA_ACTIONS_KEY ERROR:`, err3);
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
