import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uuid, password } = await req.json();

    if (!uuid || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "uuid and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase for login attempts tracking
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if this UUID is blocked
    const { data: attempt } = await supabase
      .from("login_attempts")
      .select("*")
      .eq("target_uuid", uuid.trim())
      .maybeSingle();

    if (attempt) {
      // Check permanent block
      if (attempt.is_permanently_blocked) {
        return new Response(
          JSON.stringify({
            success: false,
            blocked: true,
            permanent: true,
            error: "تم حظر هذا الحساب نهائياً بسبب محاولات دخول متكررة خاطئة. تواصل مع الإدارة لفك الحظر.",
            block_count: attempt.block_count,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check temporary block
      if (attempt.blocked_until) {
        const blockedUntil = new Date(attempt.blocked_until);
        const now = new Date();
        if (now < blockedUntil) {
          const remainingMs = blockedUntil.getTime() - now.getTime();
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          const hours = Math.floor(remainingMinutes / 60);
          const mins = remainingMinutes % 60;
          const timeStr = hours > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${mins} دقيقة`;

          return new Response(
            JSON.stringify({
              success: false,
              blocked: true,
              permanent: false,
              error: `تم حظر هذا الحساب مؤقتاً بسبب محاولات دخول خاطئة متكررة. يُفك الحظر بعد ${timeStr}.`,
              blocked_until: attempt.blocked_until,
              block_count: attempt.block_count,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Proceed with actual login
    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("GALA_API_BASE_URL is not configured");

    const endpoint = "auth/login/uuid";
    const signPath = "api/newWebsite/" + endpoint;
    const headers = await getGalaHeaders("POST", signPath);

    const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uuid: uuid.trim(), password }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Non-JSON response:", text.substring(0, 200));
      return new Response(
        JSON.stringify({ success: false, error: "API returned invalid response. Check BASE_URL." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok || !data.success) {
      // Login failed — increment failed attempts
      const currentAttempts = attempt?.failed_attempts || 0;
      const currentBlockCount = attempt?.block_count || 0;
      const newAttempts = currentAttempts + 1;

      let blocked_until: string | null = null;
      let is_permanently_blocked = false;
      let newBlockCount = currentBlockCount;
      let warningMsg = "";

      if (newAttempts >= 5) {
        newBlockCount = currentBlockCount + 1;

        if (newBlockCount === 1) {
          // First block: 3 hours
          const dt = new Date();
          dt.setHours(dt.getHours() + 3);
          blocked_until = dt.toISOString();
          warningMsg = "⚠️ تحذير أول: تم حظر الحساب لمدة 3 ساعات بسبب 5 محاولات دخول خاطئة.";
        } else if (newBlockCount === 2) {
          // Second block: 10 hours
          const dt = new Date();
          dt.setHours(dt.getHours() + 10);
          blocked_until = dt.toISOString();
          warningMsg = "⚠️ تحذير ثاني: تم حظر الحساب لمدة 10 ساعات. المحاولة القادمة ستؤدي لحظر دائم!";
        } else {
          // Third+ block: permanent
          is_permanently_blocked = true;
          warningMsg = "🚫 تم حظر الحساب نهائياً. تواصل مع الإدارة لفك الحظر.";
        }

        // Upsert with reset attempts to 0 and new block
        await supabase.from("login_attempts").upsert({
          target_uuid: uuid.trim(),
          failed_attempts: 0,
          block_count: newBlockCount,
          blocked_until,
          is_permanently_blocked,
        }, { onConflict: "target_uuid" });

        return new Response(
          JSON.stringify({
            success: false,
            blocked: true,
            permanent: is_permanently_blocked,
            error: warningMsg,
            blocked_until,
            block_count: newBlockCount,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Not yet 5 attempts, just increment
      const remaining = 5 - newAttempts;
      await supabase.from("login_attempts").upsert({
        target_uuid: uuid.trim(),
        failed_attempts: newAttempts,
        block_count: currentBlockCount,
        blocked_until: attempt?.blocked_until || null,
        is_permanently_blocked: false,
      }, { onConflict: "target_uuid" });

      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || data.error || "Login failed",
          api_status: response.status,
          remaining_attempts: remaining,
          warning: remaining <= 2 ? `⚠️ تبقى لك ${remaining} محاولة فقط قبل حظر الحساب!` : null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Login succeeded — reset attempts
    if (attempt) {
      await supabase.from("login_attempts").update({
        failed_attempts: 0,
        blocked_until: null,
      }).eq("target_uuid", uuid.trim());
    }

    // Derive storage base URL from API base URL
    const storageBase = BASE_URL.replace(/\/api\/newWebsite\/?$/, "").replace(/\/+$/, "") + "/storage/";

    const fullUrl = (path: string | null | undefined): string => {
      if (!path) return "";
      if (path.startsWith("http")) return path;
      return storageBase + path;
    };

    if (data.data) {
      const d = data.data;
      console.log("FULL API RESPONSE KEYS:", JSON.stringify(Object.keys(d)));
      console.log("type_user:", d.type_user, "| type:", d.type, "| user_type:", d.user_type, "| account_type:", d.account_type);
      console.log("FULL DATA DUMP:", JSON.stringify(d).substring(0, 500));
      if (d.profile?.image) d.profile.image = fullUrl(d.profile.image);
      if (d.profile?.cover) d.profile.cover = fullUrl(d.profile.cover);
      if (d.level?.receiver_img) d.level.receiver_img = fullUrl(d.level.receiver_img);
      if (d.level?.sender_img) d.level.sender_img = fullUrl(d.level.sender_img);
      if (d.level?.charger_img) d.level.charger_img = fullUrl(d.level.charger_img);
      if (d.country?.flag) d.country.flag = fullUrl(d.country.flag);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-login error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
