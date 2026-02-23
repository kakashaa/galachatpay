import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/hmac.ts";

const SALARY_API_URL = "http://18.219.229.240/website/salary-api.php";
const API_KEY = "ghala2026actions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: Record<string, unknown> = {};

    // Test 1: GET request
    try {
      const url = `${SALARY_API_URL}?key=${API_KEY}&uuid=80001`;
      results.get_url = url;
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const text = await res.text();
      results.get_status = res.status;
      results.get_headers = Object.fromEntries(res.headers.entries());
      try { results.get_data = JSON.parse(text); } catch { results.get_raw = text.substring(0, 3000); }
    } catch (e) { results.get_error = String(e); }

    // Test 2: POST request with JSON body
    try {
      const res = await fetch(SALARY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: API_KEY, uuid: "80001" }),
        signal: AbortSignal.timeout(30000),
      });
      const text = await res.text();
      results.post_status = res.status;
      try { results.post_data = JSON.parse(text); } catch { results.post_raw = text.substring(0, 3000); }
    } catch (e) { results.post_error = String(e); }

    // Test 3: POST with form data
    try {
      const formData = new URLSearchParams();
      formData.append("key", API_KEY);
      formData.append("uuid", "80001");
      const res = await fetch(SALARY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        signal: AbortSignal.timeout(30000),
      });
      const text = await res.text();
      results.form_status = res.status;
      try { results.form_data = JSON.parse(text); } catch { results.form_raw = text.substring(0, 3000); }
    } catch (e) { results.form_error = String(e); }

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
