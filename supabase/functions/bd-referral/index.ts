import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_URL = "http://18.219.229.240/website/referral-api.php";
const API_KEY = "ghala2026actions";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    if (!action) {
      return new Response(JSON.stringify({ success: false, error: "action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Send invitation (creates pending invitation) ───
    if (action === "send_invitation") {
      const { bd_uuid, bd_name, bd_referral_code, member_uuid, member_type } = params;
      if (!bd_uuid || !member_uuid || !member_type) {
        return respond({ success: false, error: "بيانات ناقصة" });
      }

      const sb = getSupabase();

      // Check if member already exists in bd_members for ANY BD
      const { data: existingMember } = await sb
        .from("bd_members")
        .select("id, bd_uuid")
        .eq("member_uuid", member_uuid)
        .maybeSingle();

      if (existingMember) {
        return respond({ success: false, error: "هذا العضو مسجل بالفعل لدى بي دي آخر" });
      }

      // Check if there's already a pending invitation for this member
      const { data: existingInv } = await sb
        .from("bd_member_invitations")
        .select("id")
        .eq("member_uuid", member_uuid)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInv) {
        return respond({ success: false, error: "يوجد دعوة معلقة لهذا العضو بالفعل" });
      }

      // Verify the member account via external API to check eligibility
      const formData = new URLSearchParams();
      formData.append("key", API_KEY);
      formData.append("action", "check_member");
      formData.append("uuid", member_uuid);
      const apiRes = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });
      const apiData = await apiRes.json();

      // Get member name from API
      const memberName = apiData?.name || member_uuid;

      // Create invitation
      const { error: insertErr } = await sb
        .from("bd_member_invitations")
        .insert({
          bd_uuid,
          bd_name: bd_name || "",
          bd_referral_code: bd_referral_code || "",
          member_uuid,
          member_name: memberName,
          member_type,
          status: "pending",
        });

      if (insertErr) {
        return respond({ success: false, error: "فشل إرسال الدعوة: " + insertErr.message });
      }

      return respond({ success: true, name: memberName });
    }

    // ─── Respond to invitation (accept/reject) ───
    if (action === "respond_invitation") {
      const { invitation_id, response: invResponse } = params;
      if (!invitation_id || !invResponse) {
        return respond({ success: false, error: "بيانات ناقصة" });
      }

      const sb = getSupabase();

      // Get invitation
      const { data: inv } = await sb
        .from("bd_member_invitations")
        .select("*")
        .eq("id", invitation_id)
        .eq("status", "pending")
        .maybeSingle();

      if (!inv) {
        return respond({ success: false, error: "الدعوة غير موجودة أو تمت معالجتها" });
      }

      if (invResponse === "reject") {
        await sb
          .from("bd_member_invitations")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", invitation_id);
        return respond({ success: true, message: "تم رفض الدعوة" });
      }

      if (invResponse === "accept") {
        // Call external API to add member
        const formData = new URLSearchParams();
        formData.append("key", API_KEY);
        formData.append("action", "add_member");
        formData.append("bidi_uuid", inv.bd_uuid);
        formData.append("member_uuid", inv.member_uuid);
        formData.append("member_type", inv.member_type);
        
        const apiRes = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
        const apiData = await apiRes.json();
        console.log("[bd-referral] accept API response:", JSON.stringify(apiData));

        // Check if external API failed AND it's NOT an "already registered" scenario
        const isAlreadyRegistered = apiData?.error && (
          apiData.error.includes("مسجل") || apiData.error.includes("registered")
        );

        if (!apiData?.success && !apiData?.ok && !isAlreadyRegistered) {
          return respond({ success: false, error: apiData?.error || apiData?.message || "فشل إضافة العضو" });
        }

        // Update invitation status
        await sb
          .from("bd_member_invitations")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", invitation_id);

        // Add member to bd_members table
        const { error: memberInsertError } = await sb
          .from("bd_members")
          .upsert({
            bd_uuid: inv.bd_uuid,
            member_uuid: inv.member_uuid,
            member_name: inv.member_name,
            member_type: inv.member_type,
            type_user: 0,
            monthly_charges: 0,
            current_month_commission: 0,
            total_commission: 0,
          }, { onConflict: "bd_uuid,member_uuid", ignoreDuplicates: true });

        if (memberInsertError) {
          console.error("[bd-referral] Failed to insert into bd_members:", memberInsertError);
        }

        return respond({ success: true, message: "تم قبول الدعوة بنجاح" });
      }

      return respond({ success: false, error: "نوع الاستجابة غير صالح" });
    }

    // ─── Get pending invitations for a user ───
    if (action === "get_invitations") {
      const { member_uuid } = params;
      if (!member_uuid) {
        return respond({ success: false, error: "UUID مطلوب" });
      }

      const sb = getSupabase();
      const { data: invitations } = await sb
        .from("bd_member_invitations")
        .select("*")
        .eq("member_uuid", member_uuid)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      return respond({ success: true, data: invitations || [] });
    }

    // ─── Default: proxy to external API ───
    const formData = new URLSearchParams();
    formData.append("key", API_KEY);
    formData.append("action", action);

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        formData.append(k, String(v));
      }
    }

    console.log(`[bd-referral] Proxying action="${action}" params=`, JSON.stringify(params));
    const apiRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const rawText = await apiRes.text();
    console.log(`[bd-referral] API response for action="${action}":`, rawText);
    
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { success: false, error: "Invalid API response", raw: rawText };
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function respond(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
