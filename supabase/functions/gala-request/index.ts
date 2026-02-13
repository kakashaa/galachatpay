import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uuid, type, value, user_name, type_user } = await req.json();

    if (!uuid || !type) {
      return new Response(
        JSON.stringify({ success: false, error: "uuid and type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For VIP requests, enforce once-per-month limit in database
    if (type === "vip" && value) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Check if user already requested VIP this month
      const isAgent = type_user >= 3;
      const limit = isAgent ? 5 : 1; // Agents: 5 requests/month, Regular users: 1 request/month
      
      const { data: requests } = await sb
        .from("vip_requests")
        .select("id", { count: "exact" })
        .eq("user_uuid", uuid)
        .eq("request_month", currentMonth);

      const requestCount = requests?.length || 0;
      if (requestCount >= limit) {
        const limitText = isAgent 
          ? "لقد استخدمت حد الـ 5 طلبات لهذا الشهر." 
          : "لقد استخدمت طلبك هذا الشهر. الطلب متاح مرة واحدة شهرياً.";
        return new Response(
          JSON.stringify({ success: false, error: limitText }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Call external API
      const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
      if (!BASE_URL) throw new Error("GALA_API_BASE_URL is not configured");

      const endpoint = "request/create";
      const signPath = "api/newWebsite/" + endpoint;
      const headers = await getGalaHeaders("POST", signPath);

      const requestBody: Record<string, unknown> = { uuid, type, value };
      const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
      const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(requestBody) });

      const rawText = await response.text();
      console.log("gala-request VIP API response status:", response.status);
      console.log("gala-request VIP API response body:", rawText);

      let data;
      try { data = JSON.parse(rawText); } catch {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid API response: " + rawText.substring(0, 200) }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!response.ok || !data.success) {
        return new Response(
          JSON.stringify({ success: false, error: data.message || data.error || "Request failed", api_status: response.status }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record VIP request in database
      await sb.from("vip_requests").insert({
        user_uuid: uuid,
        user_name: user_name || "",
        vip_level: value,
        request_month: currentMonth,
        type_user: type_user || 0,
      });

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Non-VIP requests: pass through as before
    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("GALA_API_BASE_URL is not configured");

    const endpoint = "request/create";
    const signPath = "api/newWebsite/" + endpoint;
    const headers = await getGalaHeaders("POST", signPath);

    const requestBody: Record<string, unknown> = { uuid, type };
    if (value) requestBody.value = value;

    const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(requestBody) });

    const rawText = await response.text();
    console.log("gala-request API response status:", response.status);
    console.log("gala-request API response body:", rawText);

    let data;
    try { data = JSON.parse(rawText); } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API response: " + rawText.substring(0, 200) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok || !data.success) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || data.error || "Request failed", api_status: response.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-request error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
