import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uuid } = await req.json();
    if (!uuid) throw new Error("uuid required");

    const BASE_URL = Deno.env.get("GALA_API_BASE_URL")!.replace(/\/+$/, "");
    const endpoint = "auth/login/uuid";
    const signPath = "api/newWebsite/" + endpoint;
    const headers = await getGalaHeaders("POST", signPath);
    const url = `${BASE_URL}/${endpoint}`;

    const apiRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uuid }),
    });
    const data = await apiRes.json();

    return new Response(JSON.stringify(data, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
