import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

const BD_API_URL = "http://18.219.229.240/website/bd-data-api.php";
const BD_API_KEY = "ghala2026actions";

const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) { await res.text(); return null; }
      return res;
    } catch (e) {
      console.error(`fetch attempt ${i + 1} failed for ${url}:`, e);
      if (i < retries) await new Promise(r => setTimeout(r, 1000));
    }
  }
  return null;
}

async function fetchAgencyIncome(uuid: string) {
  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${uuid}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

async function fetchUserCharges(uuid: string) {
  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=${uuid}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

// Launch date: accounts created before this are rejected
const LAUNCH_DATE = "2026-02-19T00:00:00Z";

async function loginGalaUser(uuid: string, password: string) {
  const BASE_URL = Deno.env.get("GALA_API_BASE_URL")!;
  const endpoint = "auth/login/uuid";
  const signPath = "api/newWebsite/" + endpoint;
  const headers = await getGalaHeaders("POST", signPath);
  const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ uuid: uuid.trim(), password }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) return null;
  return data.data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;
    const sb = supabaseAdmin();

    const json = (d: unknown, status = 200) =>
      new Response(JSON.stringify(d), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // ===================== USER ACTIONS =====================

    if (action === "register") {
      const { user_uuid, user_name, user_level } = params;
      if (!user_uuid) return json({ error: "user_uuid مطلوب" }, 400);

      // Check if already registered
      const { data: existing } = await sb
        .from("bd_registration_requests")
        .select("id, status")
        .eq("user_uuid", user_uuid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && (existing.status === "pending" || existing.status === "approved")) {
        return json({ error: "لديك طلب مسجل مسبقاً", existing_status: existing.status });
      }

      // Check if already a BD
      const { data: bdExists } = await sb
        .from("bd_commission_settings")
        .select("id")
        .eq("bd_uuid", user_uuid)
        .eq("is_approved", true)
        .eq("is_active", true)
        .maybeSingle();

      if (bdExists) return json({ error: "أنت مسجل كبيدي بالفعل" });

      const { error } = await sb.from("bd_registration_requests").insert({
        user_uuid,
        user_name: user_name || "",
        user_level: user_level || 0,
        status: "pending",
      });

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, message: "تم إرسال طلبك بنجاح" });
    }

    if (action === "check_status") {
      const { user_uuid } = params;
      if (!user_uuid) return json({ error: "user_uuid مطلوب" }, 400);

      // Check if approved BD
      const { data: bd } = await sb
        .from("bd_commission_settings")
        .select("*")
        .eq("bd_uuid", user_uuid)
        .eq("is_active", true)
        .maybeSingle();

      if (bd && bd.is_approved) {
        return json({ status: "approved", bd });
      }

      // Check registration request
      const { data: req2 } = await sb
        .from("bd_registration_requests")
        .select("*")
        .eq("user_uuid", user_uuid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (req2) {
        return json({ status: req2.status, request: req2 });
      }

      return json({ status: "none" });
    }

    if (action === "get_dashboard") {
      const { bd_uuid } = params;
      if (!bd_uuid) return json({ error: "bd_uuid مطلوب" }, 400);

      const [bdRes, membersRes, withdrawalsRes, settingsRes] = await Promise.all([
        sb.from("bd_commission_settings").select("*").eq("bd_uuid", bd_uuid).eq("is_active", true).maybeSingle(),
        sb.from("bd_members").select("*").eq("bd_uuid", bd_uuid).eq("is_active", true).order("created_at", { ascending: false }),
        sb.from("bd_withdrawals").select("*").eq("bd_uuid", bd_uuid).order("created_at", { ascending: false }).limit(50),
        sb.from("app_settings").select("*").in("key", ["bd_wallets_paused", "bd_auto_withdrawal"]),
      ]);

      const supporters = (membersRes.data || []).filter((m: any) => m.member_type === "supporter");
      const agents = (membersRes.data || []).filter((m: any) => m.member_type === "agency");

      const settings: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => { settings[s.key] = s.value; });

      return json({
        bd: bdRes.data,
        supporters,
        agents,
        withdrawals: withdrawalsRes.data || [],
        wallets_paused: settings.bd_wallets_paused === "true",
        auto_withdrawal: settings.bd_auto_withdrawal === "true",
      });
    }

    if (action === "invite_member") {
      const { bd_uuid, bd_name, member_uuid, member_type, referral_code } = params;
      if (!bd_uuid || !member_uuid || !member_type) {
        return json({ error: "بيانات ناقصة" }, 400);
      }

      if (!["supporter", "agency"].includes(member_type)) {
        return json({ error: "نوع العضو غير صحيح" }, 400);
      }

      // Check if member already in any BD
      const { data: existingMember } = await sb
        .from("bd_members")
        .select("id, bd_uuid")
        .eq("member_uuid", member_uuid)
        .eq("is_active", true)
        .maybeSingle();

      if (existingMember) {
        return json({ error: "هذا العضو مسجل لدى بيدي آخر بالفعل" });
      }

      // Check if already invited
      const { data: existingInvite } = await sb
        .from("bd_member_invitations")
        .select("id")
        .eq("bd_uuid", bd_uuid)
        .eq("member_uuid", member_uuid)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvite) {
        return json({ error: "يوجد دعوة معلقة لهذا العضو بالفعل" });
      }

      // Pre-validate: if inviting as agency, check if the user actually has an agency
      if (member_type === "agency") {
        const agencyData = await fetchAgencyIncome(member_uuid);
        if (!agencyData || !agencyData.commission) {
          return json({ error: "هذا الحساب لا يملك وكالة. لا يمكن دعوته كوكيل." });
        }
      }

      // Pre-validate levels: use user-charges to check if account has any levels > 0
      const preCheckData = await fetchUserCharges(member_uuid);
      if (preCheckData?.level) {
        const lvl = preCheckData.level;
        const rLvl = lvl.receiver_level || lvl.receiver || 0;
        const sLvl = lvl.sender_level || lvl.sender || 0;
        const cLvl = lvl.charger_level || lvl.charger || 0;
        if (rLvl > 0 || sLvl > 0 || cLvl > 0) {
          return json({ error: `لا يمكن دعوة هذا الحساب. المستويات ليست صفر (استقبال: ${rLvl}، إرسال: ${sLvl}، شحن: ${cLvl})` });
        }
      }

      const { error } = await sb.from("bd_member_invitations").insert({
        bd_uuid,
        bd_name: bd_name || "",
        bd_referral_code: referral_code || "",
        member_uuid,
        member_name: "", // Will be filled on accept
        member_type,
        status: "pending",
      });

      if (error) return json({ error: error.message }, 500);

      // Send notification to the member
      await sb.from("notifications").insert({
        user_uuid: member_uuid,
        title: "📩 دعوة انضمام لبيدي",
        body: `لقد تلقيت دعوة من ${bd_name || "بيدي"} (كود: ${referral_code || "---"}). قم بالدخول لقبول أو رفض الدعوة.`,
        target: "personal",
      });

      return json({ success: true, message: "تم إرسال الدعوة بنجاح" });
    }

    if (action === "get_invitations") {
      const { user_uuid } = params;
      if (!user_uuid) return json({ error: "user_uuid مطلوب" }, 400);

      const { data } = await sb
        .from("bd_member_invitations")
        .select("*")
        .eq("member_uuid", user_uuid)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      return json({ invitations: data || [] });
    }

    if (action === "respond_invite") {
      const { invitation_id, response: invResponse, user_uuid, password } = params;
      if (!invitation_id || !invResponse) return json({ error: "بيانات ناقصة" }, 400);

      const { data: invite } = await sb
        .from("bd_member_invitations")
        .select("*")
        .eq("id", invitation_id)
        .eq("status", "pending")
        .maybeSingle();

      if (!invite) return json({ error: "الدعوة غير موجودة أو تم الرد عليها" });

      if (invResponse === "reject") {
        await sb.from("bd_member_invitations").update({ status: "rejected" }).eq("id", invitation_id);
        return json({ success: true, message: "تم رفض الدعوة" });
      }

      // Accept flow - validate the account
      if (!password) {
        return json({ error: "الرمز السري مطلوب للتحقق من الحساب" }, 400);
      }

      const userData = await loginGalaUser(invite.member_uuid, password);
      if (!userData) {
        return json({ error: "فشل التحقق من الحساب. تأكد من الرمز السري." });
      }

      // Validate account conditions
      const levelData = userData.level || {};
      const receiverLevel = levelData.receiver_level || 0;
      const senderLevel = levelData.sender_level || 0;
      const chargerLevel = levelData.charger_level || 0;

      if (receiverLevel > 0 || senderLevel > 0 || chargerLevel > 0) {
        const reason = `الحساب ${userData.name || invite.member_uuid} غير مؤهل (المستويات: استقبال ${receiverLevel}، إرسال ${senderLevel}، شحن ${chargerLevel})`;
        // Delete the invitation since the account is not eligible
        await sb.from("bd_member_invitations").delete().eq("id", invitation_id);
        // Notify the BD about the rejection reason
        await sb.from("notifications").insert({
          title: "❌ فشل انضمام عضو",
          body: reason,
          target: "user",
          user_uuid: invite.bd_uuid,
        });
        return json({ error: "لا يمكن قبول الدعوة. يجب أن تكون جميع مستويات الحساب صفر.", dismissed: true });
      }

      // Check account creation date - must be after LAUNCH_DATE
      const createdAt = userData.created_at || userData.profile?.created_at || userData.register_date;
      if (createdAt) {
        const accountDate = new Date(createdAt);
        const launchDate = new Date(LAUNCH_DATE);
        if (accountDate < launchDate) {
          const reason = `الحساب ${userData.name || invite.member_uuid} قديم (تاريخ الإنشاء: ${createdAt}) - يجب أن يكون بعد ${LAUNCH_DATE.split("T")[0]}`;
          await sb.from("bd_member_invitations").delete().eq("id", invitation_id);
          await sb.from("notifications").insert([
            { title: "❌ فشل انضمام عضو", body: reason, target: "user", user_uuid: invite.bd_uuid },
            { title: "❌ تعذر قبول الدعوة", body: "لا يمكنك الانضمام لأن حسابك مُنشأ قبل تاريخ إطلاق النظام", target: "user", user_uuid: invite.member_uuid },
          ]);
          return json({ error: "لا يمكن الانضمام. الحساب مُنشأ قبل تاريخ إطلاق نظام البيدي.", dismissed: true });
        }
      }

      // Check if already member of another BD
      const { data: existingMember } = await sb
        .from("bd_members")
        .select("id")
        .eq("member_uuid", invite.member_uuid)
        .eq("is_active", true)
        .maybeSingle();

      if (existingMember) {
        const reason = `العضو ${userData.name || invite.member_uuid} مسجل لدى بيدي آخر بالفعل`;
        await sb.from("bd_member_invitations").delete().eq("id", invitation_id);
        await sb.from("notifications").insert({
          title: "❌ فشل انضمام عضو",
          body: reason,
          target: "user",
          user_uuid: invite.bd_uuid,
        });
        return json({ error: "هذا الحساب مسجل لدى بيدي آخر بالفعل", dismissed: true });
      }

      // If member_type is "agency", verify the user actually has an agency (type_user >= 2)
      const userType = userData.type_user || 0;
      if (invite.member_type === "agency" && userType < 2) {
        const reason = `العضو ${userData.name || invite.member_uuid} لا يملك وكالة (نوع الحساب: ${userType})، لا يمكن إضافته كوكيل`;
        await sb.from("bd_member_invitations").delete().eq("id", invitation_id);
        // Notify both BD and member
        await sb.from("notifications").insert([
          { title: "❌ فشل انضمام وكيل", body: reason, target: "user", user_uuid: invite.bd_uuid },
          { title: "❌ تعذر قبول الدعوة", body: "لا يمكنك الانضمام كوكيل لأن حسابك لا يملك وكالة حالياً", target: "user", user_uuid: invite.member_uuid },
        ]);
        return json({ error: "لا يمكن الانضمام كوكيل بدون وكالة في الحساب", dismissed: true });
      }

      // All validations passed - add member
      // For agencies: fetch agency income, for supporters: fetch user charges
      let initialMonthly = 0;
      let initialDaily = 0;

      if (invite.member_type === "agency") {
        const agencyData = await fetchAgencyIncome(invite.member_uuid);
        if (agencyData?.commission) {
          initialMonthly = agencyData.commission.month || 0;
          initialDaily = agencyData.commission.today || 0;
        }
      } else {
        const chargeData = await fetchUserCharges(invite.member_uuid);
        if (chargeData?.charges) {
          initialMonthly = chargeData.charges.month || 0;
          initialDaily = chargeData.charges.today || 0;
        }
      }

      const { error: memberError } = await sb.from("bd_members").insert({
        bd_uuid: invite.bd_uuid,
        member_uuid: invite.member_uuid,
        member_name: userData.name || "",
        member_type: invite.member_type,
        initial_charger_num: initialMonthly,
        monthly_charges: initialMonthly,
        last_daily_charges: initialDaily,
        type_user: userData.type_user || 0,
        is_active: true,
      });

      if (memberError) return json({ error: memberError.message }, 500);

      // Update invitation status
      await sb.from("bd_member_invitations").update({
        status: "accepted",
        member_name: userData.name || "",
        terms_accepted: true,
      }).eq("id", invitation_id);

      // Notify BD about new member joining
      await sb.from("notifications").insert({
        title: "👤 عضو جديد انضم",
        body: `انضم ${userData.name || "عضو"} (${invite.member_type === "agency" ? "وكالة" : "داعم"}) إلى فريقك عبر كود الإحالة الخاص بك`,
        target: "user",
        user_uuid: invite.bd_uuid,
      });

      return json({
        success: true,
        message: `تم قبول الدعوة بنجاح! مرحباً ${userData.name}`,
        member_name: userData.name,
      });
    }

    if (action === "withdraw") {
      const { bd_uuid, bd_name, amount, target_uuid } = params;
      if (!bd_uuid || !amount || !target_uuid) {
        return json({ error: "بيانات ناقصة" }, 400);
      }

      // Check wallet pause
      const { data: pauseSetting } = await sb
        .from("app_settings")
        .select("value")
        .eq("key", "bd_wallets_paused")
        .maybeSingle();

      if (pauseSetting?.value === "true") {
        return json({ error: "ليس وقت السحب الآن. المحافظ متوقفة مؤقتاً." });
      }

      // Check available balance
      const { data: bd } = await sb
        .from("bd_commission_settings")
        .select("available_balance")
        .eq("bd_uuid", bd_uuid)
        .eq("is_active", true)
        .maybeSingle();

      if (!bd || bd.available_balance < amount) {
        return json({ error: "الرصيد المتاح غير كافٍ" });
      }

      const coins = Math.floor(amount * 8500);

      // Check auto withdrawal setting
      const { data: autoSetting } = await sb
        .from("app_settings")
        .select("value")
        .eq("key", "bd_auto_withdrawal")
        .maybeSingle();

      const isAuto = autoSetting?.value === "true";

      // Create withdrawal record
      const { error: wError } = await sb.from("bd_withdrawals").insert({
        bd_uuid,
        bd_name: bd_name || "",
        amount,
        status: isAuto ? "completed" : "pending",
        transfer_type: "coins",
        recipient_name: target_uuid,
        completed_at: isAuto ? new Date().toISOString() : null,
      });

      if (wError) return json({ error: wError.message }, 500);

      // Deduct from available balance
      await sb
        .from("bd_commission_settings")
        .update({ available_balance: bd.available_balance - amount })
        .eq("bd_uuid", bd_uuid);

      if (isAuto) {
        // Auto-send coins via gala-actions
        try {
          const ACTIONS_URL = Deno.env.get("GALA_ACTIONS_URL");
          const ACTIONS_KEY = Deno.env.get("GALA_ACTIONS_KEY");
          if (ACTIONS_URL && ACTIONS_KEY) {
            const targetUrl = new URL(ACTIONS_URL);
            targetUrl.searchParams.set("key", ACTIONS_KEY);
            targetUrl.searchParams.set("action", "submit-request");
            await fetch(targetUrl.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "send_coins",
                target_uuid: target_uuid,
                amount: coins,
              }),
            });
          }
        } catch (e) {
          console.error("Auto-send coins error:", e);
        }
        return json({ success: true, message: `تم إرسال ${coins.toLocaleString()} كوينز بنجاح`, auto: true });
      }

      return json({ success: true, message: "تم رفع طلب السحب وسيتم مراجعته من المسؤول", auto: false });
    }

    // ===================== ADMIN ACTIONS =====================

    if (action === "admin_list_registrations") {
      const { data } = await sb
        .from("bd_registration_requests")
        .select("*")
        .order("created_at", { ascending: false });
      return json({ data: data || [] });
    }

    if (action === "admin_approve_registration") {
      const { request_id } = params;
      if (!request_id) return json({ error: "request_id مطلوب" }, 400);

      const { data: req2 } = await sb
        .from("bd_registration_requests")
        .select("*")
        .eq("id", request_id)
        .maybeSingle();

      if (!req2) return json({ error: "الطلب غير موجود" });

      // Create BD commission settings
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await sb.from("bd_commission_settings").upsert({
        bd_uuid: req2.user_uuid,
        bd_name: req2.user_name,
        is_approved: true,
        is_active: true,
        referral_code: referralCode,
        user_commission_pct: 2,
        agency_commission_pct: 5,
        available_balance: 0,
        total_earned: 0,
        current_month_earnings: 0,
      }, { onConflict: "bd_uuid" });

      await sb
        .from("bd_registration_requests")
        .update({ status: "approved" })
        .eq("id", request_id);

      // Notify user
      await sb.from("notifications").insert({
        user_uuid: req2.user_uuid,
        title: "✅ تمت الموافقة على طلب البيدي",
        body: `مبروك! تم قبولك كمطور أعمال (BD). كودك الخاص: ${referralCode}`,
        target: "personal",
      });

      return json({ success: true });
    }

    if (action === "admin_reject_registration") {
      const { request_id, admin_note } = params;
      if (!request_id) return json({ error: "request_id مطلوب" }, 400);

      const { data: req2 } = await sb
        .from("bd_registration_requests")
        .select("user_uuid")
        .eq("id", request_id)
        .maybeSingle();

      await sb
        .from("bd_registration_requests")
        .update({ status: "rejected", admin_note: admin_note || null })
        .eq("id", request_id);

      if (req2) {
        await sb.from("notifications").insert({
          user_uuid: req2.user_uuid,
          title: "❌ تم رفض طلب البيدي",
          body: admin_note || "تم رفض طلبك للانضمام كمطور أعمال.",
          target: "personal",
        });
      }

      return json({ success: true });
    }

    if (action === "admin_list_bds") {
      const { include_deleted } = params;
      const query = sb.from("bd_commission_settings").select("*").order("created_at", { ascending: false });
      
      if (include_deleted) {
        query.eq("is_active", false);
      } else {
        query.eq("is_active", true);
      }
      
      const { data: bds } = await query;

      const allBdUuids = (bds || []).map((b: any) => b.bd_uuid);
      const memberQuery = sb
        .from("bd_members")
        .select("*")
        .in("bd_uuid", allBdUuids.length ? allBdUuids : ["__none__"]);
      
      // Only show active members unless viewing deleted
      if (!include_deleted) {
        memberQuery.eq("is_active", true);
      }
      
      const { data: members } = await memberQuery;

      return json({ bds: bds || [], members: members || [] });
    }

    if (action === "admin_toggle_setting") {
      const { key, value: explicitValue } = params;
      if (!key || !["bd_wallets_paused", "bd_auto_withdrawal", "bd_sync_schedule"].includes(key)) {
        return json({ error: "مفتاح غير صالح" }, 400);
      }

      let newVal: string;
      if (key === "bd_sync_schedule") {
        newVal = explicitValue === "hourly" ? "hourly" : "daily";
        await sb.from("app_settings").upsert({ key, value: newVal }, { onConflict: "key" });

        // Update cron schedule
        try {
          // Remove existing cron jobs
          await sb.rpc("execute_sql" as any, {} as any).throwOnError().then(() => {}).catch(() => {});
          // We can't directly manage pg_cron from edge functions, 
          // but we store the setting so the next sync uses it
        } catch {}
      } else {
        const { data: current } = await sb.from("app_settings").select("value").eq("key", key).maybeSingle();
        newVal = current?.value === "true" ? "false" : "true";
        await sb.from("app_settings").upsert({ key, value: newVal }, { onConflict: "key" });
      }
      return json({ success: true, value: newVal });
    }

    if (action === "admin_remove_member") {
      const { member_id } = params;
      if (!member_id) return json({ error: "member_id مطلوب" }, 400);
      await sb.from("bd_members").update({ is_active: false }).eq("id", member_id);
      return json({ success: true });
    }

    if (action === "admin_add_member") {
      const { bd_uuid, member_uuid, member_name, member_type } = params;
      if (!bd_uuid || !member_uuid || !member_type) return json({ error: "بيانات ناقصة" }, 400);
      
      // Check if member already exists
      const { data: existing } = await sb.from("bd_members")
        .select("id")
        .eq("member_uuid", member_uuid)
        .eq("is_active", true)
        .maybeSingle();
      if (existing) return json({ error: "هذا العضو مسجل بالفعل لدى بيدي آخر" }, 400);

      // Try to fetch live data with a short timeout (5s, 1 retry)
      let initialMonthly = 0;
      let initialDaily = 0;

      try {
        const quickFetch = async (url: string) => {
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) return null;
          return await res.json();
        };

        if (member_type === "agency") {
          const agencyData = await quickFetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${member_uuid}`);
          if (agencyData?.commission) {
            initialMonthly = agencyData.commission.month || 0;
            initialDaily = agencyData.commission.today || 0;
          }
        } else {
          const chargeData = await quickFetch(`${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=${member_uuid}`);
          if (chargeData?.charges) {
            initialMonthly = chargeData.charges.month || 0;
            initialDaily = chargeData.charges.today || 0;
          }
        }
      } catch (e) {
        console.log("BD API fetch skipped on admin_add_member (timeout ok):", e);
      }

      const { error } = await sb.from("bd_members").insert({
        bd_uuid,
        member_uuid,
        member_name: member_name || "",
        member_type,
        initial_charger_num: initialMonthly,
        monthly_charges: initialMonthly,
        last_daily_charges: initialDaily,
        is_active: true,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, initial_monthly: initialMonthly });
    }

    if (action === "admin_update_bd") {
      const { bd_uuid, ...updates } = params;
      if (!bd_uuid) return json({ error: "bd_uuid مطلوب" }, 400);
      const allowed = ["user_commission_pct", "agency_commission_pct", "available_balance", "is_active", "current_month_earnings", "total_earned", "withdraw_exempt", "monthly_goal"];
      const filtered: any = {};
      for (const k of allowed) {
        if (updates[k] !== undefined) filtered[k] = updates[k];
      }
      await sb.from("bd_commission_settings").update(filtered).eq("bd_uuid", bd_uuid);
      return json({ success: true });
    }

    if (action === "admin_delete_bd") {
      const { bd_uuid } = params;
      if (!bd_uuid) return json({ error: "bd_uuid مطلوب" }, 400);
      await sb.from("bd_commission_settings").update({ is_active: false, is_approved: false }).eq("bd_uuid", bd_uuid);
      await sb.from("bd_members").update({ is_active: false }).eq("bd_uuid", bd_uuid);
      return json({ success: true });
    }

    if (action === "admin_restore_bd") {
      const { bd_uuid } = params;
      if (!bd_uuid) return json({ error: "bd_uuid مطلوب" }, 400);
      await sb.from("bd_commission_settings").update({ is_active: true, is_approved: true }).eq("bd_uuid", bd_uuid);
      // Restore all members too
      await sb.from("bd_members").update({ is_active: true }).eq("bd_uuid", bd_uuid);
      return json({ success: true });
    }

    return json({ error: "إجراء غير معروف" }, 400);
  } catch (error) {
    console.error("bd-manage error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "خطأ داخلي" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
