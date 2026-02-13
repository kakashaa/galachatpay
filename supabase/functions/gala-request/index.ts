import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const UUID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;
const ALLOWED_TYPES = new Set(["vip", "gift", "frame", "entry", "animated_photo", "bd", "change_id"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { uuid, type, value, user_name, type_user } = body as Record<string, unknown>;

    // Validate uuid
    if (!uuid || typeof uuid !== "string" || !UUID_REGEX.test(uuid.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid uuid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate type
    if (!type || typeof type !== "string" || !ALLOWED_TYPES.has(type)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedUuid = (uuid as string).trim();

    // For VIP requests, enforce limits in database
    if (type === "vip" && value) {
      const vipLevel = Number(value);
      if (isNaN(vipLevel) || vipLevel < 1 || vipLevel > 6) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid VIP level" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // VIP 6: blocked for everyone
      if (vipLevel === 6) {
        return new Response(
          JSON.stringify({ success: false, error: "VIP 6 غير متاح للطلب المباشر. يرجى التواصل مع الإدارة." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const isAgent = typeof type_user === "number" && type_user >= 3;

      // Get all requests this month for this user
      const { data: requests } = await sb
        .from("vip_requests")
        .select("id, vip_level")
        .eq("user_uuid", sanitizedUuid)
        .eq("request_month", currentMonth);

      const reqs = requests || [];

      // VIP 4-5: agents only, max 5 combined requests per month
      if (vipLevel >= 4 && vipLevel <= 5) {
        if (!isAgent) {
          return new Response(
            JSON.stringify({ success: false, error: "VIP 4-5 متاح للوكلاء فقط." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const highTierCount = reqs.filter((r: any) => r.vip_level === 4 || r.vip_level === 5).length;
        if (highTierCount >= 5) {
          return new Response(
            JSON.stringify({ success: false, error: "وصلت الحد الأقصى لطلبات VIP 4-5 (5 طلبات شهرياً)." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // VIP 1-3: regular users get 1/month, agents unlimited
      if (vipLevel >= 1 && vipLevel <= 3 && !isAgent) {
        if (reqs.length >= 1) {
          return new Response(
            JSON.stringify({ success: false, error: "لقد استخدمت طلبك هذا الشهر. الطلب متاح مرة واحدة شهرياً." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
      if (!BASE_URL) throw new Error("Server configuration error");

      const endpoint = "request/create";
      const signPath = "api/newWebsite/" + endpoint;
      const headers = await getGalaHeaders("POST", signPath);

      const requestBody = { uuid: sanitizedUuid, type, value: vipLevel };
      const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
      const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(requestBody) });

      const rawText = await response.text();

      let data;
      try { data = JSON.parse(rawText); } catch {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid API response" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!response.ok || !data.success) {
        return new Response(
          JSON.stringify({ success: false, error: data.message || data.error || "Request failed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sanitizedUserName = typeof user_name === "string" ? user_name.substring(0, 100) : "";
      await sb.from("vip_requests").insert({
        user_uuid: sanitizedUuid,
        user_name: sanitizedUserName,
        vip_level: vipLevel,
        request_month: currentMonth,
        type_user: typeof type_user === "number" ? type_user : 0,
      });

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Non-VIP requests
    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("Server configuration error");

    const endpoint = "request/create";
    const signPath = "api/newWebsite/" + endpoint;
    const headers = await getGalaHeaders("POST", signPath);

    const requestBody: Record<string, unknown> = { uuid: sanitizedUuid, type };
    if (value !== undefined && value !== null) {
      // Sanitize value
      if (typeof value === "string" && value.length > 500) {
        return new Response(
          JSON.stringify({ success: false, error: "Value too long" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      requestBody.value = value;
    }

    const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(requestBody) });

    const rawText = await response.text();

    let data;
    try { data = JSON.parse(rawText); } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API response" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok || !data.success) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || data.error || "Request failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-request error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
