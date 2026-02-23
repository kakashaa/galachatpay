import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

const BASE = "http://18.219.229.240/website";
const KEY = "ghala2026actions";
const UUID = "80001";

async function testEndpoint(name: string, url: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text.substring(0, 500); }
    return { name, status: res.status, data: parsed };
  } catch (e) {
    return { name, error: String(e) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results = await Promise.all([
    testEndpoint("1-agency-salary", `${BASE}/salary-api.php?key=${KEY}&uuid=${UUID}`),
    testEndpoint("2-agency-income", `${BASE}/bd-data-api.php?key=${KEY}&action=agency-income&uuid=${UUID}`),
    testEndpoint("3-user-charges", `${BASE}/bd-data-api.php?key=${KEY}&action=user-charges&uuid=${UUID}`),
    testEndpoint("4-user-info", `${BASE}/bd-data-api.php?key=${KEY}&action=user-info&uuid=${UUID}`),
    testEndpoint("5-host-salary", `${BASE}/bd-data-api.php?key=${KEY}&action=host-salary&uuid=${UUID}`),
  ]);

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
