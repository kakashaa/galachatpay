import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

const BD_API_URL = "http://18.219.229.240/website/bd-data-api.php";
const BD_API_KEY = "ghala2026actions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: Record<string, unknown> = {};

    // Test 1: agency-report
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-report&agency_id=181`, { signal: AbortSignal.timeout(15000) });
      results.agency_report = await res.json();
    } catch (e) { results.agency_report = { error: String(e) }; }

    // Test 2: agency-details
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-details&agency_id=181`, { signal: AbortSignal.timeout(15000) });
      results.agency_details = await res.json();
    } catch (e) { results.agency_details = { error: String(e) }; }

    // Test 3: agency-dashboard  
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-dashboard&uuid=7524002`, { signal: AbortSignal.timeout(15000) });
      results.agency_dashboard = await res.json();
    } catch (e) { results.agency_dashboard = { error: String(e) }; }

    // Test 4: host-agency-salary
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=host-agency-salary&agency_id=181`, { signal: AbortSignal.timeout(15000) });
      results.host_agency_salary = await res.json();
    } catch (e) { results.host_agency_salary = { error: String(e) }; }

    // Test 5: agency-income with uuid=7524002 (the agent owner)
    try {
      const res = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=7524002`, { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      // Only show relevant fields, not the full agencies list
      results.agency_income_7524002 = {
        ok: data.ok,
        commission: data.commission,
        salary_report: data.salary_report,
        month: data.month,
        year: data.year,
        agencies_count: data.agencies?.length,
        // Check if our agency is in the list
        agency_181_found: data.agencies?.some((a: any) => String(a['معرف']) === '181'),
      };
    } catch (e) { results.agency_income_7524002 = { error: String(e) }; }

    // Test 6: Try main API agency/get endpoint
    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (BASE_URL) {
      try {
        const endpoint = "agency/get";
        const signPath = "api/newWebsite/" + endpoint;
        const headers = await getGalaHeaders("POST", signPath);
        const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ agency_id: 181, uuid: "7524002" }),
          signal: AbortSignal.timeout(15000),
        });
        results.gala_agency_get = await res.json();
      } catch (e) { results.gala_agency_get = { error: String(e) }; }
    }

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
