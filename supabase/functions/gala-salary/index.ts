import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

const SALARY_API_URL = "https://hola-chat.com/db-proxy.php";
const SALARY_API_KEY = "ghala2026proxy";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uuid } = await req.json();
    if (!uuid) {
      return new Response(JSON.stringify({ ok: false, error: "uuid required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedUuid = String(uuid).trim();
    console.log(`[SALARY] Fetching salary for uuid=${trimmedUuid}`);

    const url = `${SALARY_API_URL}?key=${SALARY_API_KEY}&action=withdraw-status&uuid=${trimmedUuid}`;
    
    // Try up to 3 times with increasing timeout
    let lastError = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const timeout = attempt * 15000; // 15s, 30s, 45s
        console.log(`[SALARY] Attempt ${attempt} with timeout ${timeout}ms`);
        const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data.salary != null) {
            console.log(`[SALARY] Success: uuid=${trimmedUuid} salary=${data.salary}`);
            return new Response(JSON.stringify({ ok: true, salary: data.salary }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } else {
            console.log(`[SALARY] API returned:`, JSON.stringify(data));
            return new Response(JSON.stringify({ ok: false, error: data?.error || "No salary data" }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        lastError = `HTTP ${res.status}`;
      } catch (e) {
        lastError = String(e);
        console.log(`[SALARY] Attempt ${attempt} failed: ${lastError}`);
      }
    }

    return new Response(JSON.stringify({ ok: false, error: lastError }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
