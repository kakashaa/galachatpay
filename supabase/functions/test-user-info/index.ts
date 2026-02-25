import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

const BASE = "https://hola-chat.com";
const KEY = "ghala2026actions";

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

  const body = await req.json().catch(() => ({}));
  const uuid = body?.uuid || "80001";
  const year = body?.year || 2026;
  const month = body?.month || 2;

  const results = await Promise.all([
    testEndpoint("agency-target-api", `${BASE}/agency-target-api.php?key=${KEY}&uuid=${uuid}&year=${year}&month=${month}`),
    testEndpoint("bd-data-user-charges", `${BASE}/bd-data-api.php?key=${KEY}&action=user-charges&uuid=${uuid}&year=${year}&month=${month}`),
    testEndpoint("bd-data-user-charges-no-date", `${BASE}/bd-data-api.php?key=${KEY}&action=user-charges&uuid=${uuid}`),
    testEndpoint("top-chargers-api", `${BASE}/top-chargers-api.php?key=${KEY}&action=top-chargers&uuids=${uuid}&year=${year}&month=${month}`),
    testEndpoint("bd-data-user-info", `${BASE}/bd-data-api.php?key=${KEY}&action=user-info&uuid=${uuid}`),
    testEndpoint("bd-data-user-profile", `${BASE}/bd-data-api.php?key=${KEY}&action=user-profile&uuid=${uuid}`),
  ]);

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
