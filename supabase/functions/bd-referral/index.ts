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

      // ── Device-based restriction: check if member's device already has another user registered with a different BD ──
      const { data: memberDevice } = await sb
        .from("user_devices")
        .select("device_id")
        .eq("user_uuid", member_uuid)
        .maybeSingle();

      if (memberDevice?.device_id) {
        // Find all users on the same device
        const { data: sameDeviceUsers } = await sb
          .from("user_devices")
          .select("user_uuid")
          .eq("device_id", memberDevice.device_id);

        if (sameDeviceUsers && sameDeviceUsers.length > 0) {
          const deviceUuids = sameDeviceUsers.map(u => u.user_uuid);
          // Check if any of these users are already a member of a different BD
          const { data: existingMembers } = await sb
            .from("bd_members")
            .select("member_uuid, bd_uuid")
            .in("member_uuid", deviceUuids);

          if (existingMembers && existingMembers.length > 0) {
            return respond({ success: false, error: "هذا الجهاز مسجل كعضو لدى بيدي آخر. لا يمكن التسجيل لدى أكثر من بيدي بنفس الجهاز" });
          }
        }
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

      // Verify the member account via referral API
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
      const memberName = apiData?.name || member_uuid;

      // NOTE: Level and account-age validation cannot be done server-side
      // because the external Gala API does not expose a getUserInfo endpoint.
      // These checks must be enforced on the frontend before sending the invitation.

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
        // ── Device-based restriction on accept ──
        const { data: memberDevice } = await sb
          .from("user_devices")
          .select("device_id")
          .eq("user_uuid", inv.member_uuid)
          .maybeSingle();

        if (memberDevice?.device_id) {
          const { data: sameDeviceUsers } = await sb
            .from("user_devices")
            .select("user_uuid")
            .eq("device_id", memberDevice.device_id);

          if (sameDeviceUsers && sameDeviceUsers.length > 0) {
            const deviceUuids = sameDeviceUsers.map(u => u.user_uuid);
            const { data: existingMembers } = await sb
              .from("bd_members")
              .select("member_uuid")
              .in("member_uuid", deviceUuids);

            if (existingMembers && existingMembers.length > 0) {
              await sb
                .from("bd_member_invitations")
                .update({ status: "rejected", updated_at: new Date().toISOString() })
                .eq("id", invitation_id);
              return respond({ success: false, error: "هذا الجهاز مسجل كعضو لدى بيدي آخر. لا يمكن التسجيل لدى أكثر من بيدي بنفس الجهاز" });
            }
          }
        }
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

    // ─── BD Withdraw Coins: validate balance, proxy as "withdraw", update DB ───
    if (action === "bd_withdraw_coins") {
      const { uuid, amount, recipient_uuid } = params;
      if (!uuid || !amount || !recipient_uuid) {
        return respond({ success: false, error: "بيانات ناقصة" });
      }

      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return respond({ success: false, error: "مبلغ غير صالح" });
      }

      const sb = getSupabase();

      // Check available balance and exemption status
      const { data: settings } = await sb
        .from("bd_commission_settings")
        .select("available_balance, bd_name, withdraw_exempt")
        .eq("bd_uuid", uuid)
        .maybeSingle();

      if (!settings) {
        return respond({ success: false, error: "حساب BD غير موجود" });
      }

      const availableBalance = Number(settings.available_balance) || 0;
      if (parsedAmount > availableBalance) {
        return respond({ success: false, error: "الرصيد غير كافي" });
      }

      const coinsAmount = Math.round(parsedAmount * 8500);

      // ─── Call external API to actually charge coins ───
      const formData = new URLSearchParams();
      formData.append("key", API_KEY);
      formData.append("action", "withdraw");
      formData.append("uuid", String(uuid));
      formData.append("recipient_uuid", String(recipient_uuid));
      formData.append("amount", String(parsedAmount));
      formData.append("coins", String(coinsAmount));
      // If BD is exempt from date restriction, pass bypass flag
      if (settings.withdraw_exempt) {
        formData.append("bypass_date", "1");
      }

      console.log(`[bd-referral] Calling external API: withdraw_coins for ${uuid} -> ${recipient_uuid}, $${parsedAmount} (${coinsAmount} coins)`);

      let apiSuccess = false;
      let apiError = "";
      try {
        const apiRes = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
        const apiRaw = await apiRes.text();
        console.log(`[bd-referral] withdraw_coins API response:`, apiRaw);
        
        let apiData;
        try { apiData = JSON.parse(apiRaw); } catch { apiData = {}; }
        
        if (apiData?.success || apiData?.ok) {
          apiSuccess = true;
        } else {
          apiError = apiData?.error || apiData?.message || "فشل الشحن من السيرفر";
        }
      } catch (e) {
        apiError = (e as Error).message || "خطأ في الاتصال بالسيرفر";
        console.error(`[bd-referral] withdraw_coins API error:`, apiError);
      }

      if (!apiSuccess) {
        await sendTelegram(`❌ فشل سحب BD\n${settings.bd_name || uuid} حاول شحن ${coinsAmount.toLocaleString()} كوينز ($${parsedAmount}) للآيدي ${recipient_uuid}\nالسبب: ${apiError}`);
        return respond({ success: false, error: apiError || "فشل شحن الكوينزات تلقائياً" });
      }

      // ─── API succeeded → deduct balance + log ───
      const newBalance = availableBalance - parsedAmount;
      await sb
        .from("bd_commission_settings")
        .update({ available_balance: newBalance, updated_at: new Date().toISOString() })
        .eq("bd_uuid", uuid);

      // Log the withdrawal as completed
      await sb
        .from("bd_withdrawals")
        .insert({
          bd_uuid: String(uuid),
          bd_name: settings.bd_name || "",
          amount: parsedAmount,
          status: "completed",
          completed_at: new Date().toISOString(),
          recipient_name: String(recipient_uuid),
          transfer_type: "coins",
          admin_note: `✅ تم شحن ${coinsAmount.toLocaleString()} كوينز تلقائياً للآيدي ${recipient_uuid}`,
        });

      // Notify admin
      await sb.from("notifications").insert({
        title: "✅ سحب BD تلقائي",
        body: `${settings.bd_name || uuid} شحن ${coinsAmount.toLocaleString()} كوينز ($${parsedAmount}) للآيدي ${recipient_uuid} — تم تلقائياً`,
        target: "admin",
      });

      // Notify BD user
      await sb.from("notifications").insert({
        user_uuid: String(uuid),
        title: "⚡ تم شحن الكوينزات",
        body: `تم شحن ${coinsAmount.toLocaleString()} كوينز ($${parsedAmount}) للآيدي ${recipient_uuid} بنجاح!`,
        target: "personal",
      });

      // Send Telegram notification
      await sendTelegram(`✅ سحب BD تلقائي\n${settings.bd_name || uuid} شحن ${coinsAmount.toLocaleString()} كوينز ($${parsedAmount}) للآيدي ${recipient_uuid}`);

      console.log(`[bd-referral] Auto withdraw success: $${parsedAmount} (${coinsAmount} coins) to ${recipient_uuid}. New balance: $${newBalance}`);

      return respond({ success: true, new_balance: newBalance });
    }

    // ─── Test Telegram ───
    if (action === "test_telegram") {
      const result = await sendTelegram("🔔 رسالة اختبار من نظام BD\nإذا وصلت هذه الرسالة فالإعدادات صحيحة ✅");
      return respond({ success: true, telegram_result: result });
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

async function sendTelegram(text: string): Promise<Record<string, unknown>> {
  try {
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    console.log(`[bd-referral] sendTelegram: token=${token ? "SET(" + token.length + " chars)" : "MISSING"}, chatId=${chatId || "MISSING"}`);
    if (!token || !chatId) return { sent: false, reason: "missing_env", token_set: !!token, chat_id_set: !!chatId };
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json();
    console.log(`[bd-referral] Telegram API response:`, JSON.stringify(data));
    return { sent: true, status: res.status, ok: data.ok, description: data.description || null };
  } catch (e) {
    console.error("[bd-referral] Telegram error:", e);
    return { sent: false, error: (e as Error).message };
  }
}
