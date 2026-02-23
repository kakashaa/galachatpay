import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

const BASE = "http://18.219.229.240/website";
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

  const SUPPORTER_UUID = "3901126"; // The supporter with the discrepancy

  const results = await Promise.all([
    testEndpoint("1-NEW-monthly-charges-api", `${BASE}/monthly-charges-api.php?key=${KEY}&uuid=${SUPPORTER_UUID}`),
    testEndpoint("2-OLD-user-charges", `${BASE}/bd-data-api.php?key=${KEY}&action=user-charges&uuid=${SUPPORTER_UUID}`),
  ]);

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
