import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

const BASE = "http://18.219.229.240/website";
const KEY = "ghala2026actions";
const UUID = "2315321";

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

  const BD_UUID = "3734853";
  const AGENT_UUID = "2315321";

  const results = await Promise.all([
    testEndpoint("1-agent-user-info", `${BASE}/bd-data-api.php?key=${KEY}&action=user-info&uuid=${AGENT_UUID}`),
    testEndpoint("2-bd-user-info", `${BASE}/bd-data-api.php?key=${KEY}&action=user-info&uuid=${BD_UUID}`),
    testEndpoint("3-agent-agency-income", `${BASE}/bd-data-api.php?key=${KEY}&action=agency-income&uuid=${AGENT_UUID}`),
    testEndpoint("4-bd-agency-income", `${BASE}/bd-data-api.php?key=${KEY}&action=agency-income&uuid=${BD_UUID}`),
    testEndpoint("5-agent-charges", `${BASE}/bd-data-api.php?key=${KEY}&action=user-charges&uuid=${AGENT_UUID}`),
    testEndpoint("6-bd-charges", `${BASE}/bd-data-api.php?key=${KEY}&action=user-charges&uuid=${BD_UUID}`),
    testEndpoint("7-agent-salary", `${BASE}/salary-api.php?key=${KEY}&uuid=${AGENT_UUID}`),
    testEndpoint("8-bd-salary", `${BASE}/salary-api.php?key=${KEY}&uuid=${BD_UUID}`),
  ]);

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
