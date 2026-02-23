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

async function fetchWithRetry(url: string, retries = 2, timeoutMs = 15000): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) { await res.text(); return null; }
      return res;
    } catch (e) {
      console.error(`fetch attempt ${i + 1} failed for ${url}:`, e);
      if (i < retries) await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

async function fetchAgencyIncome(uuid: string, quick = false) {
  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${uuid}`;
  const res = await fetchWithRetry(url, quick ? 0 : 2, quick ? 5000 : 15000);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

async function fetchUserCharges(uuid: string, quick = false) {
  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=${uuid}`;
  const res = await fetchWithRetry(url, quick ? 0 : 2, quick ? 5000 : 15000);
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
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uuid: uuid.trim(), password }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return null;
    return data.data;
  } catch (e) {
    console.error("loginGalaUser timeout/error:", e);
    return null;
  }
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

      // Check if already a BD
      const { data: bdExists } = await sb
        .from("bd_commission_settings")
        .select("id")
        .eq("bd_uuid", user_uuid)
        .eq("is_approved", true)
        .eq("is_active", true)
        .maybeSingle();

      if (bdExists) return json({ status: "approved", already: true });

      // Auto-approve if level >= 10
      const level = user_level || 0;
      if (level >= 10) {
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await sb.from("bd_commission_settings").upsert({
          bd_uuid: user_uuid,
          bd_name: user_name || "",
          is_approved: true,
          is_active: true,
          referral_code: referralCode,
          user_commission_pct: 2,
          agency_commission_pct: 5,
          available_balance: 0,
          total_earned: 0,
          current_month_earnings: 0,
        }, { onConflict: "bd_uuid" });

        // Also mark any pending registration as approved
        await sb.from("bd_registration_requests")
          .update({ status: "approved" })
          .eq("user_uuid", user_uuid)
          .eq("status", "pending");

        return json({ success: true, status: "approved", referral_code: referralCode });
      }

      // Fallback: shouldn't reach here if UI enforces level >= 10
      return json({ error: "المستوى غير كافي" }, 400);
    }

    if (action === "check_status") {
      const { user_uuid } = params;
      if (!user_uuid) return json({ error: "user_uuid مطلوب" }, 400);

      // Check if BD exists (active or banned)
      const { data: bd } = await sb
        .from("bd_commission_settings")
        .select("*")
        .eq("bd_uuid", user_uuid)
        .maybeSingle();

      // Check if banned (inactive with banned_at set)
      if (bd && bd.banned_at && (!bd.is_active || !bd.is_approved)) {
        const bannedAt = new Date(bd.banned_at);
        const unbanDate = new Date(bannedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        
        if (now >= unbanDate) {
          // 30 days passed - auto-unban
          await sb.from("bd_commission_settings")
            .update({ is_active: true, is_approved: true, banned_at: null })
            .eq("bd_uuid", user_uuid);
          // Clear violations
          await sb.from("bd_violations").delete().eq("bd_uuid", user_uuid);
          // Re-activate members
          await sb.from("bd_members")
            .update({ is_active: true })
            .eq("bd_uuid", user_uuid);
          
          const { data: updatedBd } = await sb
            .from("bd_commission_settings")
            .select("*")
            .eq("bd_uuid", user_uuid)
            .maybeSingle();
          return json({ status: "approved", bd: updatedBd, violation_count: 0 });
        }
        
        // Still banned
        return json({ 
          status: "banned", 
          banned_at: bd.banned_at,
          unban_date: unbanDate.toISOString(),
          days_remaining: Math.ceil((unbanDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        });
      }

      if (bd && bd.is_active && bd.is_approved) {
        const { data: viol } = await sb.from("bd_violations").select("id").eq("bd_uuid", user_uuid);
        return json({ status: "approved", bd, violation_count: viol?.length || 0 });
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

      // Check if BD is banned (3+ violations)
      const { data: violations } = await sb
        .from("bd_violations")
        .select("id")
        .eq("bd_uuid", bd_uuid);

      const violationCount = violations?.length || 0;
      if (violationCount >= 3) {
        return json({ error: "تم إيقاف صلاحية البيدي الخاصة بك بسبب تكرار المخالفات (3 إنذارات). لا يمكنك دعوة أعضاء جدد." });
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

      // Pre-validate: fetch user data to check charger level
      const preCheckData = await fetchUserCharges(member_uuid, true);
      console.log("[BD-INVITE] preCheckData for", member_uuid, ":", JSON.stringify(preCheckData));
      if (!preCheckData) {
        return json({ error: "تعذر التحقق من بيانات العضو. حاول مرة أخرى." });
      }

      // Also try user-info API for more complete level data
      const userInfoUrl = `${BD_API_URL}?key=${BD_API_KEY}&action=user-info&uuid=${member_uuid}`;
      let userInfoData: any = null;
      try {
        const uiRes = await fetch(userInfoUrl, { signal: AbortSignal.timeout(8000) });
        if (uiRes.ok) userInfoData = await uiRes.json();
      } catch { /* ignore */ }
      console.log("[BD-INVITE] userInfoData for", member_uuid, ":", JSON.stringify(userInfoData));

      // Check agency role if inviting as agency
      if (member_type === "agency") {
        // The user-info API returns Arabic keys; check "معرف الوكالة" (agency ID)
        const userObj = userInfoData?.user || {};
        const agencyId = userObj["معرف الوكالة"] ?? "";
        const memberTypeUser = preCheckData.type_user ?? preCheckData.user?.type_user ?? userInfoData?.type_user ?? -1;
        
        console.log("[BD-INVITE] Agency check:", { agencyId, memberTypeUser, userObj });
        
        // If agency ID is empty/falsy, user doesn't have an agency yet
        if (!agencyId || agencyId === "" || agencyId === "0") {
          return json({ error: "⚠️ هذا المستخدم لسا ما عنده وكالة! لازم ينشئ وكالة أول قبل ما ترسل له دعوة كوكيل.", no_agency: true });
        }
        
        // Also check numeric type if available
        if (memberTypeUser >= 0 && memberTypeUser < 2) {
          return json({ error: "هذا الحساب لا يملك وكالة (نوع الحساب: مستخدم عادي أو مضيف). لا يمكن دعوته كوكيل." });
        }
      }

      // CRITICAL: Check if account is old/active
      // Check levels from API data
      const lvl = preCheckData.level || userInfoData?.level || {};
      const chargerLevel = lvl.charger_level ?? lvl.charger ?? preCheckData.charger_num ?? userInfoData?.charger_num ?? 0;
      const senderLevel = lvl.sender_level ?? lvl.sender ?? 0;
      const receiverLevel = lvl.receiver_level ?? lvl.receiver ?? 0;
      
      // Check charge activity using ONLY the aggregated counts (today/week/month)
      // NOTE: The "recent" array from the API returns GLOBAL charges, NOT user-specific ones,
      // so we must NOT use it as an indicator of account activity.
      const recentCharges = preCheckData.charges || {};
      const hasChargeActivity = (
        (recentCharges.today?.count > 0 || recentCharges.today?.total > 0) ||
        (recentCharges.week?.count > 0 || recentCharges.week?.total > 0) ||
        (recentCharges.month?.count > 0 || recentCharges.month?.total > 0)
      );
      
      const isOldAccount = chargerLevel > 0 || senderLevel > 0 || receiverLevel > 0 || hasChargeActivity;
      console.log("[BD-INVITE] Check:", { chargerLevel, senderLevel, receiverLevel, hasChargeActivity, charges: recentCharges, isOldAccount });

      if (isOldAccount) {
        const details = hasChargeActivity 
          ? `حساب نشط (شحنات: يوم=${recentCharges.today?.count||0} أسبوع=${recentCharges.week?.count||0} شهر=${recentCharges.month?.count||0})`
          : `شحن: ${chargerLevel}، إرسال: ${senderLevel}، استقبال: ${receiverLevel}`;
        // Log violation
        await sb.from("bd_violations").insert({
          bd_uuid,
          bd_name: bd_name || "",
          violation_type: "ineligible_invite",
          member_uuid,
          member_name: preCheckData.name || preCheckData.user?.name || member_uuid,
          details: `محاولة دعوة حساب قديم (${details})`,
        });

        // Re-count violations after insert
        const { data: updatedViolations } = await sb
          .from("bd_violations")
          .select("id")
          .eq("bd_uuid", bd_uuid);
        const newCount = updatedViolations?.length || 0;

        // Auto-ban on 3rd violation
        if (newCount >= 3) {
          await sb.from("bd_commission_settings")
            .update({ is_active: false, is_approved: false, banned_at: new Date().toISOString() })
            .eq("bd_uuid", bd_uuid);
          await sb.from("bd_members")
            .update({ is_active: false })
            .eq("bd_uuid", bd_uuid);
          await sb.from("notifications").insert({
            user_uuid: bd_uuid,
            title: "🚫 تم إيقاف حساب البيدي",
            body: "تم إيقاف صلاحية البيدي الخاصة بك نهائياً بسبب 3 مخالفات (محاولة دعوة حسابات قديمة).",
            target: "personal",
          });
          return json({
            error: "⛔ إنذار ثالث! تم إيقاف حساب البيدي الخاص بك نهائياً بسبب تكرار محاولة دعوة حسابات قديمة.",
            banned: true,
          });
        }

        const remaining = 3 - newCount;
        return json({
          error: `⚠️ المستخدم الذي تريد دعوته قديم في البرنامج (${details}). هذا تحذير لك! إذا حبيت تدعو شخص، ادعو شخص جديد على التطبيق واكسب نسبتك. عندك هذا إنذار ${newCount} من 3. متبقي ${remaining} إنذار(ات) قبل إيقاف البيدي.`,
          violation: true,
          violation_count: newCount,
        });
      }

      const { error } = await sb.from("bd_member_invitations").insert({
        bd_uuid,
        bd_name: bd_name || "",
        bd_referral_code: referral_code || "",
        member_uuid,
        member_name: "",
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

      // Accept flow - validate the referral code
      if (!password) {
        return json({ error: "كود الإحالة مطلوب للتحقق" }, 400);
      }

      // Validate referral code matches the BD's referral code
      const enteredCode = password.trim().toUpperCase();
      const expectedCode = (invite.bd_referral_code || "").trim().toUpperCase();
      
      console.log("[BD-INVITE] Referral code check:", { entered: enteredCode, expected: expectedCode });
      
      if (!expectedCode || enteredCode !== expectedCode) {
        return json({ error: "كود الإحالة غير صحيح. تأكد من الكود الذي أعطاك إياه البيدي." });
      }

      // Fetch user data via user-info API (instead of login)
      const userInfoUrl2 = `${BD_API_URL}?key=${BD_API_KEY}&action=user-info&uuid=${invite.member_uuid}`;
      let userData: any = null;
      try {
        const uiRes = await fetch(userInfoUrl2, { signal: AbortSignal.timeout(10000) });
        if (uiRes.ok) {
          const uiData = await uiRes.json();
          userData = uiData?.user || uiData;
        }
      } catch (e) {
        console.error("user-info fetch error:", e);
      }

      // Fallback: try login API if user-info failed
      if (!userData) {
        // We can't login without a real password, so try to build minimal data from precheck
        const preData = await fetchUserCharges(invite.member_uuid, true);
        if (preData) {
          userData = {
            name: preData.name || preData.user?.name || "",
            type_user: preData.type_user ?? preData.user?.type_user ?? 0,
            level: preData.level || {},
            created_at: preData.created_at || preData.user?.created_at,
          };
        }
      }

      if (!userData) {
        return json({ error: "تعذر جلب بيانات الحساب. حاول مرة أخرى." });
      }

      // Validate account conditions - handle both English and Arabic API keys
      const levelData = userData.level || {};
      const receiverLevel = levelData.receiver_level || levelData.receiver || parseInt(userData["مستوى الاستقبال"] || "0") || 0;
      const senderLevel = levelData.sender_level || levelData.sender || parseInt(userData["مستوى الارسال"] || "0") || 0;
      const chargerLevel = levelData.charger_level || levelData.charger || parseInt(userData["مستوى الشحن"] || "0") || 0;
      const userName = userData.name || userData["الاسم"] || invite.member_uuid;
      const userTypeNum = (userData.type_user != null ? userData.type_user : (parseInt(userData["نوع المستخدم"] || "0") || 0));
      
      console.log("[BD-INVITE] Accept validation:", { receiverLevel, senderLevel, chargerLevel, userName, userTypeNum });

      if (receiverLevel > 0 || senderLevel > 0 || chargerLevel > 0) {
        const reason = `الحساب ${userName} غير مؤهل (المستويات: استقبال ${receiverLevel}، إرسال ${senderLevel}، شحن ${chargerLevel})`;
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
      const createdAt = userData.created_at || userData.profile?.created_at || userData.register_date || userData["تاريخ الانشاء"];
      if (createdAt) {
        const accountDate = new Date(createdAt);
        const launchDate = new Date(LAUNCH_DATE);
        if (accountDate < launchDate) {
          const reason = `الحساب ${userName} قديم (تاريخ الإنشاء: ${createdAt}) - يجب أن يكون بعد ${LAUNCH_DATE.split("T")[0]}`;
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
        const reason = `العضو ${userName} مسجل لدى بيدي آخر بالفعل`;
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
      if (invite.member_type === "agency" && userTypeNum < 2) {
        const reason = `العضو ${userName} لا يملك وكالة (نوع الحساب: ${userTypeNum})، لا يمكن إضافته كوكيل`;
        await sb.from("bd_member_invitations").delete().eq("id", invitation_id);
        // Notify both BD and member
        await sb.from("notifications").insert([
          { title: "❌ فشل انضمام وكيل", body: reason, target: "user", user_uuid: invite.bd_uuid },
          { title: "❌ تعذر قبول الدعوة", body: "لا يمكنك الانضمام كوكيل لأن حسابك لا يملك وكالة حالياً", target: "user", user_uuid: invite.member_uuid },
        ]);
        return json({ error: "لا يمكن الانضمام كوكيل بدون وكالة في الحساب", dismissed: true });
      }

      // All validations passed - add member
      // Fetch the cumulative charger_num from user-info API to use as baseline
      // This ensures commission is only calculated on NEW charges after joining
      let baselineChargerNum = 0;

      if (invite.member_type === "agency") {
        // For agencies, fetch agency income baseline
        const agencyData = await fetchAgencyIncome(invite.member_uuid, true);
        if (agencyData?.commission) {
          const m = agencyData.commission.month;
          baselineChargerNum = typeof m === "object" ? (m?.total ?? m?.count ?? 0) : (m || 0);
        }
      } else {
        // For supporters: use charger_num from user-info as the baseline
        // charger_num is the cumulative total - we set it as initial so only new charges count
        const userInfo = await (async () => {
          const uiUrl = `${BD_API_URL}?key=${BD_API_KEY}&action=user-info&uuid=${invite.member_uuid}`;
          try {
            const r = await fetch(uiUrl, { signal: AbortSignal.timeout(10000) });
            if (r.ok) return await r.json();
          } catch { /* ignore */ }
          return null;
        })();
        
        const chargerNum = Number(userInfo?.user?.charger_num ?? userInfo?.charger_num ?? 0);
        baselineChargerNum = chargerNum;
        console.log(`[BD-INVITE] Supporter baseline for ${invite.member_uuid}: charger_num=${chargerNum}`);
      }

      const { error: memberError } = await sb.from("bd_members").insert({
        bd_uuid: invite.bd_uuid,
        member_uuid: invite.member_uuid,
        member_name: userName,
        member_type: invite.member_type,
        initial_charger_num: baselineChargerNum,
        monthly_charges: 0,
        last_daily_charges: baselineChargerNum,
        last_processed_diamonds: baselineChargerNum,
        type_user: userTypeNum,
        is_active: true,
      });

      if (memberError) return json({ error: memberError.message }, 500);

      // Update invitation status
      await sb.from("bd_member_invitations").update({
        status: "accepted",
        member_name: userName,
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

        // Helper to extract numeric value from API responses
        // API may return numbers OR objects like {count: 0, total: 0}
        const toNum = (v: unknown): number => {
          if (typeof v === "number") return v;
          if (v && typeof v === "object" && "total" in (v as any)) return Number((v as any).total) || 0;
          if (v && typeof v === "object" && "count" in (v as any)) return Number((v as any).count) || 0;
          return Number(v) || 0;
        };

        if (member_type === "agency") {
          const agencyData = await quickFetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${member_uuid}`);
          if (agencyData?.commission) {
            initialMonthly = toNum(agencyData.commission.month);
            initialDaily = toNum(agencyData.commission.today);
          }
        } else {
          const chargeData = await quickFetch(`${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=${member_uuid}`);
          if (chargeData?.charges) {
            initialMonthly = toNum(chargeData.charges.month);
            initialDaily = toNum(chargeData.charges.today);
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
