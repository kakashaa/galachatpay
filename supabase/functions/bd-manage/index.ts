import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

const BD_API_URL = "https://hola-chat.com/bd-data-api.php";
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

async function fetchUserProfile(uuid: string, quick = false) {
  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=user-profile&uuid=${uuid}`;
  const res = await fetchWithRetry(url, quick ? 0 : 2, quick ? 5000 : 15000);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

async function fetchAgencyTarget(uuid: string, quick = false) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const url = `https://hola-chat.com/agency-target-api.php?key=${BD_API_KEY}&uuid=${uuid}&year=${year}&month=${month}`;
  const res = await fetchWithRetry(url, quick ? 0 : 2, quick ? 5000 : 15000);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

// Launch date: accounts created before this are rejected
const LAUNCH_DATE = "2026-02-19T00:00:00Z";

const extractAgencyId = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = raw.match(/\d+/);
  return match?.[0] ?? "";
};

const hasValidAgencyId = (value: unknown): boolean => {
  const agencyId = extractAgencyId(value);
  return agencyId !== "" && agencyId !== "0";
};

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

// Helper: Check if any user on the same device is a BD member (under another BD)
async function checkDeviceIsBdMember(sb: any, userUuid: string): Promise<string | null> {
  const { data: userDevice } = await sb
    .from("user_devices")
    .select("device_id")
    .eq("user_uuid", userUuid)
    .maybeSingle();
  if (!userDevice?.device_id) return null;

  const { data: sameDeviceUsers } = await sb
    .from("user_devices")
    .select("user_uuid")
    .eq("device_id", userDevice.device_id);
  if (!sameDeviceUsers || sameDeviceUsers.length === 0) return null;

  const allUuids = sameDeviceUsers.map((d: any) => d.user_uuid);

  // Check works_members first (new system)
  const { data: worksMembers } = await sb
    .from("works_members")
    .select("member_uuid")
    .in("member_uuid", allUuids)
    .eq("status", "active");

  if (worksMembers && worksMembers.length > 0) {
    return "member_exists";
  }

  // Fallback: check bd_members (legacy)
  const { data: existingMembers } = await sb
    .from("bd_members")
    .select("member_uuid, bd_uuid")
    .in("member_uuid", allUuids)
    .eq("is_active", true);

  if (existingMembers && existingMembers.length > 0) {
    return "member_exists";
  }
  return null;
}

// Helper: Check if any user on the same device is a BD
async function checkDeviceIsBd(sb: any, userUuid: string): Promise<string | null> {
  const { data: userDevice } = await sb
    .from("user_devices")
    .select("device_id")
    .eq("user_uuid", userUuid)
    .maybeSingle();
  if (!userDevice?.device_id) return null;

  const { data: sameDeviceUsers } = await sb
    .from("user_devices")
    .select("user_uuid")
    .eq("device_id", userDevice.device_id);
  if (!sameDeviceUsers || sameDeviceUsers.length === 0) return null;

  const allUuids = sameDeviceUsers.map((d: any) => d.user_uuid);

  // Check works_accounts first (new system)
  const { data: worksAccs } = await sb
    .from("works_accounts")
    .select("user_uuid")
    .in("user_uuid", allUuids)
    .eq("status", "active");

  if (worksAccs && worksAccs.length > 0) {
    return "bd_exists";
  }

  // Fallback: check bd_commission_settings (legacy)
  const { data: existingBDs } = await sb
    .from("bd_commission_settings")
    .select("bd_uuid")
    .in("bd_uuid", allUuids)
    .eq("is_active", true)
    .eq("is_approved", true);

  if (existingBDs && existingBDs.length > 0) {
    return "bd_exists";
  }
  return null;
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

      // Check if already a BD (works_accounts first, then bd_commission_settings)
      const { data: worksExists } = await sb
        .from("works_accounts")
        .select("id")
        .eq("user_uuid", user_uuid)
        .eq("status", "active")
        .maybeSingle();

      if (worksExists) return json({ status: "approved", already: true });

      const { data: bdExists } = await sb
        .from("bd_commission_settings")
        .select("id")
        .eq("bd_uuid", user_uuid)
        .eq("is_approved", true)
        .eq("is_active", true)
        .maybeSingle();

      if (bdExists) return json({ status: "approved", already: true });

      // Device check: prevent same device from having multiple BD accounts
      const { data: userDevice } = await sb
        .from("user_devices")
        .select("device_id")
        .eq("user_uuid", user_uuid)
        .maybeSingle();

      if (userDevice?.device_id) {
        // Find all users on this device
        const { data: sameDeviceUsers } = await sb
          .from("user_devices")
          .select("user_uuid")
          .eq("device_id", userDevice.device_id);

        if (sameDeviceUsers && sameDeviceUsers.length > 0) {
          const otherUuids = sameDeviceUsers
            .map((d: any) => d.user_uuid)
            .filter((u: string) => u !== user_uuid);

          if (otherUuids.length > 0) {
            // Check if any of these other users are active BDs
            const { data: existingBDs } = await sb
              .from("bd_commission_settings")
              .select("bd_uuid, bd_name")
              .in("bd_uuid", otherUuids)
              .eq("is_active", true)
              .eq("is_approved", true);

            if (existingBDs && existingBDs.length > 0) {
              console.log("[BD-REGISTER] Device conflict:", { device_id: userDevice.device_id, user_uuid, existing_bds: existingBDs.map((b: any) => b.bd_uuid) });
              return json({ error: "⚠️ لا يمكن تسجيل أكثر من حساب بيدي على نفس الجهاز. يوجد بيدي آخر مسجل من هذا الجهاز." });
            }
          }
        }
      }

      // Check if device already has a BD member (cannot be BD and member on same device)
      const deviceMemberCheck = await checkDeviceIsBdMember(sb, user_uuid);
      if (deviceMemberCheck === "member_exists") {
        console.log("[BD-REGISTER] Device has BD member, blocking BD registration:", user_uuid);
        return json({ error: "⚠️ لا يمكنك التسجيل كبيدي لأن هذا الجهاز مسجل عليه عضو ضمن بيدي آخر. يجب اختيار أحدهما فقط." });
      }

      // Send pending request to admin for approval
      const level = user_level || 0;
      if (level < 10) {
        return json({ error: "المستوى غير كافي" }, 400);
      }

      // Check if there's already a pending request
      const { data: existingReq } = await sb
        .from("bd_registration_requests")
        .select("id, status")
        .eq("user_uuid", user_uuid)
        .eq("status", "pending")
        .maybeSingle();

      if (existingReq) {
        return json({ status: "pending", already: true });
      }

      // Create pending registration request
      await sb.from("bd_registration_requests").insert({
        user_uuid,
        user_name: user_name || "",
        user_level: level,
        status: "pending",
      });

      return json({ success: true, status: "pending" });
    }

    if (action === "check_status") {
      const { user_uuid } = params;
      if (!user_uuid) return json({ error: "user_uuid مطلوب" }, 400);

      // Check works_accounts first (new system)
      const { data: worksAcc } = await sb
        .from("works_accounts")
        .select("*")
        .eq("user_uuid", user_uuid)
        .maybeSingle();

      if (worksAcc && worksAcc.status === "active") {
        // Map to BD-compatible format for frontend
        const bdCompat = {
          bd_uuid: worksAcc.user_uuid,
          bd_name: worksAcc.user_name,
          referral_code: worksAcc.works_code,
          is_active: true,
          is_approved: true,
          available_balance: worksAcc.balance_usd || 0,
          total_earned: worksAcc.total_earnings_usd || 0,
          user_commission_pct: worksAcc.supporter_commission_pct || 2,
          agency_commission_pct: worksAcc.agent_commission_pct || 5,
          current_month_earnings: 0,
        };
        const { data: viol } = await sb.from("bd_violations").select("id").eq("bd_uuid", user_uuid);
        return json({ status: "approved", bd: bdCompat, violation_count: viol?.length || 0 });
      }

      if (worksAcc && worksAcc.status === "frozen") {
        return json({ status: "banned", banned_at: worksAcc.updated_at, unban_date: null, days_remaining: 0 });
      }

      // Fallback: Check bd_commission_settings (legacy)
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
          await sb.from("bd_commission_settings")
            .update({ is_active: true, is_approved: true, banned_at: null })
            .eq("bd_uuid", user_uuid);
          await sb.from("bd_violations").delete().eq("bd_uuid", user_uuid);
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

      // Try works_accounts first
      const { data: worksAcc } = await sb
        .from("works_accounts")
        .select("*")
        .eq("user_uuid", bd_uuid)
        .eq("status", "active")
        .maybeSingle();

      let bdData: any;
      let membersData: any[];

      if (worksAcc) {
        // Use works system
        bdData = {
          bd_uuid: worksAcc.user_uuid,
          bd_name: worksAcc.user_name,
          referral_code: worksAcc.works_code,
          is_active: true,
          is_approved: true,
          available_balance: worksAcc.balance_usd || 0,
          total_earned: worksAcc.total_earnings_usd || 0,
          user_commission_pct: worksAcc.supporter_commission_pct || 2,
          agency_commission_pct: worksAcc.agent_commission_pct || 5,
          current_month_earnings: 0,
        };

        const { data: wMembers } = await sb
          .from("works_members").select("*")
          .eq("works_id", worksAcc.id).eq("status", "active")
          .order("created_at", { ascending: false });

        // Map works_members to bd_members compatible format
        membersData = (wMembers || []).map((m: any) => ({
          ...m,
          bd_uuid: bd_uuid,
          member_type: m.member_type === "agent" ? "agency" : m.member_type,
          is_active: m.status === "active",
          total_commission: m.total_commission_usd || 0,
        }));
      } else {
        // Fallback: legacy bd tables
        const { data: bdLegacy } = await sb
          .from("bd_commission_settings").select("*")
          .eq("bd_uuid", bd_uuid).eq("is_active", true).maybeSingle();
        bdData = bdLegacy;

        const { data: legacyMembers } = await sb
          .from("bd_members").select("*")
          .eq("bd_uuid", bd_uuid).eq("is_active", true)
          .order("created_at", { ascending: false });
        membersData = legacyMembers || [];
      }

      const [withdrawalsRes, settingsRes] = await Promise.all([
        sb.from("bd_withdrawals").select("*").eq("bd_uuid", bd_uuid).order("created_at", { ascending: false }).limit(50),
        sb.from("app_settings").select("*").in("key", ["bd_wallets_paused", "bd_auto_withdrawal"]),
      ]);

      const supporters = (membersData).filter((m: any) => m.member_type === "supporter");
      const agents = (membersData).filter((m: any) => m.member_type === "agency" || m.member_type === "agent");

      const settings: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => { settings[s.key] = s.value; });

      return json({
        bd: bdData,
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

      // Check if member already in any BD (works_members + bd_members)
      const { data: existingWorksMem } = await sb
        .from("works_members").select("id")
        .eq("member_uuid", member_uuid).eq("status", "active").maybeSingle();
      const { data: existingBdMem } = await sb
        .from("bd_members").select("id, bd_uuid")
        .eq("member_uuid", member_uuid).eq("is_active", true).maybeSingle();

      if (existingWorksMem || existingBdMem) {
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

      // Check if member's device already has a BD (cannot be BD and member on same device)
      const deviceBdCheck = await checkDeviceIsBd(sb, member_uuid);
      if (deviceBdCheck === "bd_exists") {
        console.log("[BD-INVITE] Member's device has BD, blocking invite:", member_uuid);
        return json({ error: "⚠️ لا يمكن دعوة هذا العضو لأن جهازه مسجل عليه حساب بيدي. لا يمكن أن يكون الجهاز بيدي وعضو ضمن بيدي آخر في نفس الوقت." });
      }

      // Also check if the member is already a BD themselves
      const { data: memberIsBd } = await sb
        .from("bd_commission_settings")
        .select("id")
        .eq("bd_uuid", member_uuid)
        .eq("is_active", true)
        .eq("is_approved", true)
        .maybeSingle();

      if (memberIsBd) {
        return json({ error: "⚠️ هذا المستخدم مسجل كبيدي بالفعل. لا يمكن أن يكون بيدي وعضو ضمن بيدي آخر في نفس الوقت." });
      }

      // Pre-validate: fetch user data from MULTIPLE sources for reliable checks
      const [preCheckData, userProfileData, agencyTargetData] = await Promise.all([
        fetchUserCharges(member_uuid, true),
        fetchUserProfile(member_uuid, true),
        member_type === "agency" ? fetchAgencyTarget(member_uuid, true) : Promise.resolve(null),
      ]);
      
      // Also try user-info API for agency ID check
      const userInfoUrl = `${BD_API_URL}?key=${BD_API_KEY}&action=user-info&uuid=${member_uuid}`;
      let userInfoData: any = null;
      try {
        const uiRes = await fetch(userInfoUrl, { signal: AbortSignal.timeout(8000) });
        if (uiRes.ok) userInfoData = await uiRes.json();
      } catch { /* ignore */ }
      
      console.log("[BD-INVITE] preCheckData for", member_uuid, ":", JSON.stringify(preCheckData));
      console.log("[BD-INVITE] userProfileData for", member_uuid, ":", JSON.stringify(userProfileData ? { charges_count: userProfileData.charges_count, ok: userProfileData.ok } : null));
      console.log("[BD-INVITE] agencyTargetData for", member_uuid, ":", JSON.stringify(agencyTargetData ? { agency_salary: agencyTargetData.data?.agency_salary, total_user_salary: agencyTargetData.data?.total_user_salary } : null));
      console.log("[BD-INVITE] userInfoData for", member_uuid, ":", JSON.stringify(userInfoData));

      if (!preCheckData && !userProfileData) {
        return json({ error: "تعذر التحقق من بيانات العضو. حاول مرة أخرى." });
      }

      // Check agency existence if inviting as agency (before sending invite)
      if (member_type === "agency") {
        const userObj = userInfoData?.user || userProfileData?.user || {};
        const agencyIdRaw = userObj["معرف الوكالة"] ?? "";
        const agencyId = extractAgencyId(agencyIdRaw);
        const hasAgency = hasValidAgencyId(agencyIdRaw);

        console.log("[BD-INVITE] Agency check:", {
          agencyIdRaw: String(agencyIdRaw).substring(0, 50),
          agencyId,
          hasAgency,
        });

        if (!hasAgency) {
          return json({ error: "⚠️ هذا المستخدم لسا ما عنده وكالة! لازم ينشئ وكالة أول قبل ما ترسل له دعوة كوكيل.", no_agency: true });
        }
      }

      // ====== ELIGIBILITY CHECK ======
      // Agency invites: only agency existence is checked before sending.
      // Supporter invites: eligibility is checked before sending.
      // Levels are checked again at accept flow.

      // Agency activity check
      const agencySalary = agencyTargetData?.data?.agency_salary ?? 0;
      const agencyTotalUserSalary = agencyTargetData?.data?.total_user_salary ?? 0;
      const hasAgencyActivity = agencySalary > 0 || agencyTotalUserSalary > 0;

      // Level checks (from any available source)
      const lvl = preCheckData?.level || userInfoData?.level || {};
      const chargerLevel = lvl.charger_level ?? lvl.charger ?? preCheckData?.charger_num ?? userInfoData?.charger_num ?? 0;
      const senderLevel = lvl.sender_level ?? lvl.sender ?? 0;
      const receiverLevel = lvl.receiver_level ?? lvl.receiver ?? 0;
      const hasNonZeroLevels = chargerLevel > 0 || senderLevel > 0 || receiverLevel > 0;

      const shouldEnforceInviteEligibility = member_type !== "agency";
      const isOldAccount = shouldEnforceInviteEligibility && (hasAgencyActivity || hasNonZeroLevels);

      console.log("[BD-INVITE] Eligibility:", {
        member_type,
        shouldEnforceInviteEligibility,
        hasAgencyActivity,
        agencySalary,
        agencyTotalUserSalary,
        chargerLevel,
        senderLevel,
        receiverLevel,
        hasNonZeroLevels,
        isOldAccount,
      });

      if (isOldAccount) {
        const detailParts: string[] = [];
        if (hasAgencyActivity) detailParts.push(`راتب وكالة: $${agencySalary}`);
        if (hasNonZeroLevels) detailParts.push(`مستويات: شحن ${chargerLevel} إرسال ${senderLevel} استقبال ${receiverLevel}`);
        const details = detailParts.length > 0 ? detailParts.join("، ") : "حساب غير مؤهل";
        
        // Log violation
        await sb.from("bd_violations").insert({
          bd_uuid,
          bd_name: bd_name || "",
          violation_type: "ineligible_invite",
          member_uuid,
          member_name: userProfileData?.user?.["اسم"] || preCheckData?.name || preCheckData?.user?.name || member_uuid,
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
      const { invitation_id, response: invResponse, user_uuid, password, account_password } = params;
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

      // Check device exclusivity: member's device cannot have a BD on it
      const acceptDeviceBdCheck = await checkDeviceIsBd(sb, invite.member_uuid);
      if (acceptDeviceBdCheck === "bd_exists") {
        await sb.from("bd_member_invitations").delete().eq("id", invitation_id);
        return json({ error: "لا يمكن قبول الدعوة لأن جهازك مسجل عليه حساب بيدي. لا يمكن أن يكون الجهاز بيدي وعضو ضمن بيدي آخر.", dismissed: true });
      }

      // Check if the member is already a BD
      const { data: acceptMemberIsBd } = await sb
        .from("bd_commission_settings")
        .select("id")
        .eq("bd_uuid", invite.member_uuid)
        .eq("is_active", true)
        .eq("is_approved", true)
        .maybeSingle();

      if (acceptMemberIsBd) {
        await sb.from("bd_member_invitations").delete().eq("id", invitation_id);
        return json({ error: "لا يمكن قبول الدعوة لأنك مسجل كبيدي بالفعل. لا يمكن أن تكون بيدي وعضو ضمن بيدي آخر.", dismissed: true });
      }

      // Fetch user data from MULTIPLE sources for reliable accept validation
      const [acceptUserInfoRes, acceptProfileData, acceptChargeData, acceptAgencyData] = await Promise.all([
        fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=user-info&uuid=${invite.member_uuid}`, { signal: AbortSignal.timeout(10000) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetchUserProfile(invite.member_uuid, true),
        fetchUserCharges(invite.member_uuid, true),
        invite.member_type === "agency" ? fetchAgencyTarget(invite.member_uuid, true) : Promise.resolve(null),
      ]);

      // Fetch levels via Gala Login API (most accurate source)
      let loginData: any = null;
      if (account_password) {
        try {
          loginData = await loginGalaUser(invite.member_uuid, account_password);
        } catch (e) {
          console.error("[BD-INVITE] Login API failed for level check:", e);
        }
      }

      if (!loginData) {
        return json({ error: "تعذر التحقق من حسابك. تأكد من كلمة سر حسابك وحاول مرة أخرى." });
      }

      const userData = acceptUserInfoRes?.user || acceptProfileData?.user || acceptChargeData?.user || null;

      if (!userData && !acceptProfileData && !acceptChargeData && !loginData) {
        return json({ error: "تعذر جلب بيانات الحساب. حاول مرة أخرى." });
      }

      const userName = loginData?.name || userData?.["اسم"] || userData?.name || acceptChargeData?.name || invite.member_uuid;
      const userTypeNum = loginData?.type_user ?? acceptChargeData?.type_user ?? acceptChargeData?.user?.type_user ?? (parseInt(userData?.["نوع المستخدم"] || "0") || 0);

      // ====== ACCEPT ELIGIBILITY CHECK ======
      const acceptAgencySalary = acceptAgencyData?.data?.agency_salary ?? 0;
      const acceptAgencyTotalSalary = acceptAgencyData?.data?.total_user_salary ?? 0;
      const acceptHasAgencyActivity = acceptAgencySalary > 0 || acceptAgencyTotalSalary > 0;

      // Extract levels from login API (most accurate)
      const loginLevel = loginData?.level || {};
      const acceptLvl = acceptChargeData?.level || {};
      
      const acceptChargerLevel = loginLevel.charger_level ?? acceptLvl.charger_level ?? acceptLvl.charger ?? acceptChargeData?.charger_num ?? 0;
      const acceptSenderLevel = loginLevel.sender_level ?? acceptLvl.sender_level ?? acceptLvl.sender ?? 0;
      const acceptReceiverLevel = loginLevel.receiver_level ?? acceptLvl.receiver_level ?? acceptLvl.receiver ?? 0;
      const hasNonZeroAcceptLevels = acceptChargerLevel > 0 || acceptSenderLevel > 0 || acceptReceiverLevel > 0;

      console.log("[BD-INVITE] Raw data sources:", {
        loginLevel: JSON.stringify(loginLevel),
        chargeDataLevel: JSON.stringify(acceptLvl),
        chargeDataKeys: acceptChargeData ? Object.keys(acceptChargeData) : "null",
      });

      // Agency accept: reject only if any level > 0
      // Other member types: keep agency activity + levels checks
      const isIneligible = invite.member_type === "agency"
        ? hasNonZeroAcceptLevels
        : (acceptHasAgencyActivity || hasNonZeroAcceptLevels);

      console.log("[BD-INVITE] Accept eligibility:", {
        member_type: invite.member_type,
        acceptHasAgencyActivity,
        acceptAgencySalary,
        acceptAgencyTotalSalary,
        acceptChargerLevel,
        acceptSenderLevel,
        acceptReceiverLevel,
        hasNonZeroAcceptLevels,
        isIneligible,
        userName,
        userTypeNum,
      });

      if (isIneligible) {
        const detailParts: string[] = [];
        if (hasNonZeroAcceptLevels) detailParts.push(`مستويات: شحن ${acceptChargerLevel} إرسال ${acceptSenderLevel} استقبال ${acceptReceiverLevel}`);
        if (invite.member_type !== "agency" && acceptHasAgencyActivity) detailParts.push(`راتب وكالة: $${acceptAgencySalary}`);

        const details = detailParts.length > 0 ? detailParts.join("، ") : "الحساب غير مؤهل";
        const reason = `الحساب ${userName} غير مؤهل (${details})`;
        const memberRejectBody = invite.member_type === "agency"
          ? `لا يمكنك الانضمام كوكيل لأن جميع المستويات يجب أن تكون 0 (${details})`
          : `لا يمكنك الانضمام: حسابك نشط بالفعل (${details})`;

        await sb.from("bd_member_invitations").delete().eq("id", invitation_id);
        await sb.from("notifications").insert([
          { title: "❌ فشل انضمام عضو", body: reason, target: "user", user_uuid: invite.bd_uuid },
          { title: "❌ تعذر قبول الدعوة", body: memberRejectBody, target: "user", user_uuid: invite.member_uuid },
        ]);

        const responseError = invite.member_type === "agency"
          ? `لا يمكن قبول الدعوة كوكيل. جميع المستويات يجب أن تكون 0 (${details}).`
          : `لا يمكن قبول الدعوة. الحساب نشط بالفعل (${details}).`;

        return json({ error: responseError, dismissed: true });
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

      // Check if already member of another BD (works_members + bd_members)
      const { data: existingWorksMember } = await sb
        .from("works_members")
        .select("id")
        .eq("member_uuid", invite.member_uuid)
        .eq("status", "active")
        .maybeSingle();

      const { data: existingMember } = await sb
        .from("bd_members")
        .select("id")
        .eq("member_uuid", invite.member_uuid)
        .eq("is_active", true)
        .maybeSingle();

      const alreadyMember = existingWorksMember || existingMember;

      if (alreadyMember) {
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

      // If member_type is "agency", verify the user actually has an agency
      const agencyIdField = userData["معرف الوكالة"] || "";
      const normalizedAgencyId = extractAgencyId(agencyIdField);
      const hasAgencyFromApi = hasValidAgencyId(agencyIdField);

      console.log("[BD-INVITE] Accept agency check:", {
        agencyIdField: agencyIdField ? agencyIdField.substring(0, 50) : "",
        normalizedAgencyId,
        hasAgencyFromApi,
      });

      if (invite.member_type === "agency" && !hasAgencyFromApi) {
        const reason = `العضو ${userName} لا يملك وكالة (معرف الوكالة غير صالح)، لا يمكن إضافته كوكيل`;
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
        const agencyData = await fetchAgencyIncome(invite.member_uuid, true);
        if (agencyData?.commission) {
          const m = agencyData.commission.month;
          const d = agencyData.commission.today;
          initialMonthly = typeof m === "object" ? (m?.total ?? m?.count ?? 0) : (m || 0);
          initialDaily = typeof d === "object" ? (d?.total ?? d?.count ?? 0) : (d || 0);
        }
      } else {
        const chargeData = await fetchUserCharges(invite.member_uuid, true);
        if (chargeData?.charges) {
          const m = chargeData.charges.month;
          const d = chargeData.charges.today;
          initialMonthly = typeof m === "object" ? (m?.total ?? m?.count ?? 0) : (m || 0);
          initialDaily = typeof d === "object" ? (d?.total ?? d?.count ?? 0) : (d || 0);
        }
      }

      const { error: memberError } = await sb.from("bd_members").upsert({
        bd_uuid: invite.bd_uuid,
        member_uuid: invite.member_uuid,
        member_name: userName,
        member_type: invite.member_type,
        initial_charger_num: initialMonthly,
        monthly_charges: initialMonthly,
        last_daily_charges: initialDaily,
        type_user: userTypeNum,
        is_active: true,
      }, { onConflict: "bd_uuid,member_uuid", ignoreDuplicates: false });

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
        // Send Telegram notification for auto withdrawal
        try {
          const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
          const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
          if (BOT_TOKEN && CHAT_ID) {
            let targetName = target_uuid;
            try {
              const uiUrl = `${BD_API_URL}?key=${BD_API_KEY}&action=user-info&uuid=${target_uuid}`;
              const uiRes2 = await fetch(uiUrl, { signal: AbortSignal.timeout(5000) });
              if (uiRes2.ok) {
                const uiData2 = await uiRes2.json();
                targetName = uiData2?.user?.["الاسم"] || uiData2?.user?.name || uiData2?.name || target_uuid;
              }
            } catch { /* ignore */ }

            const time = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
            const message =
              `💸 <b>سحب BD تلقائي ✅</b>\n` +
              `👤 اسم البيدي: ${bd_name || "-"}\n` +
              `🆔 آيدي البيدي: ${bd_uuid}\n` +
              `📛 اسم المستقبل: ${targetName}\n` +
              `🎯 آيدي المستقبل: ${target_uuid}\n` +
              `🪙 إجمالي الكوينزات: ${coins.toLocaleString()}\n` +
              `💵 المبلغ: $${amount}\n` +
              `⏰ ${time}`;

            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML" }),
            });
          }
        } catch (e2) {
          console.error("Telegram notify failed:", e2);
        }

        return json({ success: true, message: `تم إرسال ${coins.toLocaleString()} كوينز بنجاح`, auto: true });
      }

      // Send Telegram notification for withdrawal
      try {
        const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
        const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
        if (BOT_TOKEN && CHAT_ID) {
          // Fetch target user name
          let targetName = target_uuid;
          try {
            const uiUrl = `${BD_API_URL}?key=${BD_API_KEY}&action=user-info&uuid=${target_uuid}`;
            const uiRes = await fetch(uiUrl, { signal: AbortSignal.timeout(5000) });
            if (uiRes.ok) {
              const uiData = await uiRes.json();
              targetName = uiData?.user?.["الاسم"] || uiData?.user?.name || uiData?.name || target_uuid;
            }
          } catch { /* ignore */ }

          const time = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
          const message =
            `💸 <b>طلب سحب BD</b>\n` +
            `👤 اسم البيدي: ${bd_name || "-"}\n` +
            `🆔 آيدي البيدي: ${bd_uuid}\n` +
            `📛 اسم المستقبل: ${targetName}\n` +
            `🎯 آيدي المستقبل: ${target_uuid}\n` +
            `🪙 إجمالي الكوينزات: ${coins.toLocaleString()}\n` +
            `💵 المبلغ: $${amount}\n` +
            `⏰ ${time}`;

          // Get the withdrawal ID from the most recent insertion
          const { data: latestW } = await sb.from("bd_withdrawals")
            .select("id")
            .eq("bd_uuid", bd_uuid)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const withdrawalId = latestW?.id || "unknown";

          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: CHAT_ID,
              text: message,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "✅ قبول", callback_data: `bwa:${withdrawalId}` },
                    { text: "❌ رفض", callback_data: `bwr:${withdrawalId}` },
                  ],
                ],
              },
            }),
          });
        }
      } catch (e) {
        console.error("Telegram notify failed:", e);
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
          // We can't directly manage pg_cron from edge functions
          // but we store the setting so the next sync uses it
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

      const { error } = await sb.from("bd_members").upsert({
        bd_uuid,
        member_uuid,
        member_name: member_name || "",
        member_type,
        initial_charger_num: initialMonthly,
        monthly_charges: initialMonthly,
        last_daily_charges: initialDaily,
        is_active: true,
      }, { onConflict: "bd_uuid,member_uuid", ignoreDuplicates: false });
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
