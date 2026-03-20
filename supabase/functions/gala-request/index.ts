import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const UUID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;
const ALLOWED_TYPES = new Set(["vip", "gift", "frame", "entry", "animated_photo", "bd", "change_id", "uuid"]);

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

    const { uuid, type, value, user_name, type_user, recipient_uuid } = body as Record<string, unknown>;

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
      if (isNaN(vipLevel) || vipLevel < 1 || vipLevel > 5) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid VIP level. VIP 6 غير متاح." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const userType = typeof type_user === "number" ? type_user : 0;
      const isAgent = userType >= 2; // types 2-6 are agents

      // Validate recipient_uuid if provided
      let sanitizedRecipient: string | null = null;
      if (recipient_uuid && typeof recipient_uuid === "string" && recipient_uuid.trim()) {
        if (!UUID_REGEX.test(recipient_uuid.trim())) {
          return new Response(
            JSON.stringify({ success: false, error: "معرف المستلم غير صالح" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        sanitizedRecipient = recipient_uuid.trim();
      }

      // Regular users (type 0, 1): only VIP 1-3, no gifting
      if (!isAgent) {
        if (vipLevel > 3) {
          return new Response(
            JSON.stringify({ success: false, error: "مستوى VIP 4-5 متاح فقط للوكلاء." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (sanitizedRecipient) {
          return new Response(
            JSON.stringify({ success: false, error: "خاصية الإهداء متاحة فقط للوكلاء." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check 1 request per month
        const { data: requests } = await sb
          .from("vip_requests")
          .select("id")
          .eq("user_uuid", sanitizedUuid)
          .eq("request_month", currentMonth);

        if ((requests?.length || 0) >= 1) {
          return new Response(
            JSON.stringify({ success: false, error: "لقد استخدمت طلبك هذا الشهر. الطلب متاح مرة واحدة شهرياً." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Agents (type 2-6)
      if (isAgent) {
        const { data: allVipRequests } = await sb
          .from("vip_requests")
          .select("vip_level, recipient_uuid")
          .eq("user_uuid", sanitizedUuid)
          .eq("request_month", currentMonth);

        const allReqs = allVipRequests || [];

        if (sanitizedRecipient) {
          // === GIFTING MODE: per-level limits apply ===
          const { data: override } = await sb
            .from("agent_vip_overrides")
            .select("vip4_limit, vip5_limit, vip6_limit")
            .eq("agent_uuid", sanitizedUuid)
            .maybeSingle();

          const vip4Limit = override?.vip4_limit ?? 3;
          const vip5Limit = override?.vip5_limit ?? 5;

          // Total gifting limit: 100/month (only for non-TOP agents)
          const totalGifts = allReqs.filter(r => r.recipient_uuid).length;
          if (!override && totalGifts >= 100) {
            return new Response(
              JSON.stringify({ success: false, error: "لقد استخدمت الحد الأقصى (100 إهداء) هذا الشهر." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          if (vipLevel >= 4) {
            const usedPerLevel: Record<number, number> = { 4: 0, 5: 0 };
            for (const r of allReqs) {
              if (r.vip_level >= 4 && r.vip_level <= 5 && r.recipient_uuid) usedPerLevel[r.vip_level] = (usedPerLevel[r.vip_level] || 0) + 1;
            }
            const limitForLevel = vipLevel === 4 ? vip4Limit : vip5Limit;
            const usedForLevel = usedPerLevel[vipLevel] || 0;

            if (limitForLevel <= 0) {
              return new Response(
                JSON.stringify({ success: false, error: `VIP ${vipLevel} غير متاح لك حالياً.` }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            if (usedForLevel >= limitForLevel) {
              return new Response(
                JSON.stringify({ success: false, error: `لقد استخدمت حد الـ ${limitForLevel} إهداءات لـ VIP ${vipLevel} هذا الشهر.` }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        } else {
          // === SELF MODE: one request per month for VIP 1-5 ===
          const selfRequests = allReqs.filter(r => !r.recipient_uuid).length;
          if (selfRequests >= 1) {
            return new Response(
              JSON.stringify({ success: false, error: "لقد استخدمت طلبك الشخصي هذا الشهر. يمكنك الطلب لنفسك مرة واحدة شهرياً." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Gift validation: can't gift same ID more than once per month
        if (sanitizedRecipient) {
          const { data: giftedAlready } = await sb
            .from("vip_requests")
            .select("id")
            .eq("user_uuid", sanitizedUuid)
            .eq("recipient_uuid", sanitizedRecipient)
            .eq("request_month", currentMonth);

          if ((giftedAlready?.length || 0) >= 1) {
            return new Response(
              JSON.stringify({ success: false, error: "لقد أهديت هذا المستخدم بالفعل هذا الشهر. يمكنك إهداء كل مستخدم مرة واحدة فقط شهرياً." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Call external API
      const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
      if (!BASE_URL) throw new Error("Server configuration error");

      const endpoint = "request/create";
      const signPath = "api/newWebsite/" + endpoint;
      const headers = await getGalaHeaders("POST", signPath);

      // Send to API with the target uuid (recipient if gift, self otherwise)
      const targetUuid = sanitizedRecipient || sanitizedUuid;
      const requestBody = { uuid: targetUuid, type, value: vipLevel };
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

      // Record in database
      const sanitizedUserName = typeof user_name === "string" ? user_name.substring(0, 100) : "";
      await sb.from("vip_requests").insert({
        user_uuid: sanitizedUuid,
        user_name: sanitizedUserName,
        vip_level: vipLevel,
        request_month: currentMonth,
        type_user: userType,
        recipient_uuid: sanitizedRecipient,
      });

      // Send notification to gift recipient
      if (sanitizedRecipient) {
        await sb.from("notifications").insert({
          user_uuid: sanitizedRecipient,
          title: `🎁 هدية VIP ${vipLevel}`,
          body: `قام المستخدم ${sanitizedUserName || sanitizedUuid} بإهدائك VIP ${vipLevel} لمدة 10 أيام!`,
          target: "user",
        });
      }

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
    console.log(`[gala-request] type=${type} value=${value} status=${response.status} response=${rawText.substring(0, 500)}`);

    let data;
    try { data = JSON.parse(rawText); } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API response" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok || !data.success) {
      const errMsg = data.message || data.error || "Request failed";
      console.log(`[gala-request] FAILED: ${errMsg}`);
      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
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
