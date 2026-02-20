import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/hmac.ts";

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

async function fetchUserCharges(uuid: string) {
  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=${uuid}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

async function fetchAgencyIncome(uuid: string) {
  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${uuid}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const isCronCall = body?.time === "cron-auto";

  try {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // Check schedule setting for cron calls
    if (isCronCall) {
      const { data: scheduleSetting } = await sb
        .from("app_settings")
        .select("value")
        .eq("key", "bd_sync_schedule")
        .maybeSingle();
      const schedule = scheduleSetting?.value || "daily";

      if (schedule === "daily" && now.getUTCHours() !== 21) {
        return new Response(JSON.stringify({ skipped: true, reason: "daily schedule - not midnight UTC" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // If hourly, always proceed
    }

    // Get all active BD members
    const { data: members } = await sb
      .from("bd_members")
      .select("id, member_uuid, member_name, last_daily_charges, initial_charger_num, member_type, bd_uuid, monthly_charges, current_month_commission, total_commission")
      .eq("is_active", true);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ message: "No active members", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get BD commission settings
    const bdUuids = [...new Set(members.map((m: any) => m.bd_uuid))];
    const { data: bdSettings } = await sb
      .from("bd_commission_settings")
      .select("bd_uuid, user_commission_pct, agency_commission_pct, host_commission_pct, current_month_earnings, total_earned, available_balance")
      .in("bd_uuid", bdUuids)
      .eq("is_active", true);

    const bdMap: Record<string, any> = {};
    (bdSettings || []).forEach((b: any) => { bdMap[b.bd_uuid] = b; });

    // Check if it's a new month
    const { data: lastSyncSetting } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "bd_last_sync_month")
      .maybeSingle();

    const lastSyncMonth = lastSyncSetting?.value || "";
    const isNewMonth = lastSyncMonth !== "" && lastSyncMonth !== month;

    let monthlyResets = 0;

    if (isNewMonth) {
      // Transfer current_month_earnings to available_balance for all BDs
      for (const [bdUuid, bd] of Object.entries(bdMap)) {
        const monthEarnings = (bd as any).current_month_earnings || 0;
        if (monthEarnings > 0) {
          await sb.from("bd_commission_settings").update({
            available_balance: ((bd as any).available_balance || 0) + monthEarnings,
            current_month_earnings: 0,
          }).eq("bd_uuid", bdUuid);
        }
      }

      // Reset monthly charges and commissions for all members
      for (const member of members) {
        await sb.from("bd_members").update({
          monthly_charges: 0,
          current_month_commission: 0,
        }).eq("id", member.id);
        monthlyResets++;
      }
    }

    // === REAL-TIME SYNC: Fetch live data from BD API and calculate commissions ===
    let synced = 0;
    let commissionUpdates = 0;

    for (const member of members) {
      const bd = bdMap[member.bd_uuid];
      if (!bd) continue;

      // Add small delay to avoid rate limiting
      if (synced > 0) await new Promise(r => setTimeout(r, 200));

      if (member.member_type === "supporter") {
        // For supporters: fetch their charges
        const isTestMode = body?.test_mode === true;
        const testCharges = body?.test_charges || 0;
        let chargeData: any = null;
        
        if (isTestMode && testCharges > 0) {
          chargeData = { charges: { month: { total: testCharges }, today: { total: 0 } } };
        } else {
          chargeData = await fetchUserCharges(member.member_uuid);
        }
        console.log(`[SYNC] supporter ${member.member_uuid} API response:`, JSON.stringify(chargeData));
        if (!chargeData || !chargeData.charges) continue;

        const rawMonthly = typeof chargeData.charges.month === 'object' ? chargeData.charges.month.total : chargeData.charges.month;
        const monthlyCharges = rawMonthly || 0;
        const previousMonthly = member.monthly_charges || 0;
        const chargeDiff = monthlyCharges - previousMonthly;

        const updateObj: Record<string, unknown> = {
          monthly_charges: monthlyCharges,
          last_daily_charges: typeof chargeData.charges.today === 'object' ? (chargeData.charges.today.total || 0) : (chargeData.charges.today || 0),
        };

        if (chargeDiff > 0) {
          const pct = bd.user_commission_pct || 2;
          const commissionAmount = (chargeDiff * pct) / 100;

          updateObj.current_month_commission = (member.current_month_commission || 0) + commissionAmount;
          updateObj.total_commission = (member.total_commission || 0) + commissionAmount;

          // Log commission
          await sb.from("bd_commission_logs").insert({
            bd_uuid: member.bd_uuid,
            member_uuid: member.member_uuid,
            member_type: member.member_type,
            month,
            source_amount: chargeDiff,
            commission_pct: pct,
            amount: commissionAmount,
          });

          // Update BD earnings
          await sb.from("bd_commission_settings").update({
            current_month_earnings: (bd.current_month_earnings || 0) + commissionAmount,
            total_earned: (bd.total_earned || 0) + commissionAmount,
          }).eq("bd_uuid", member.bd_uuid);

          // Notify BD about new commission
          await sb.from("notifications").insert({
            title: "💰 عمولة جديدة",
            body: `تم احتساب عمولة $${commissionAmount.toFixed(2)} من الداعم ${member.member_name} (${pct}% من $${chargeDiff.toFixed(2)})`,
            target: "user",
            user_uuid: member.bd_uuid,
          });

          commissionUpdates++;
        }

        const { error: memberUpdateError } = await sb.from("bd_members").update(updateObj).eq("id", member.id);
        console.log(`[SYNC] member update ${member.member_uuid}:`, JSON.stringify(updateObj), "error:", memberUpdateError);
        synced++;

      } else if (member.member_type === "agency") {
        // For agencies: fetch agency income
        const isTestModeAgency = body?.test_mode === true;
        const testIncome = body?.test_agency_income || 0;
        let incomeData: any = null;

        if (isTestModeAgency && testIncome > 0) {
          incomeData = { commission: { month: { total: testIncome }, today: { total: 0 } }, salary_this_month: 0 };
        } else {
          incomeData = await fetchAgencyIncome(member.member_uuid);
        }
        console.log(`[SYNC] agency ${member.member_uuid} API response:`, JSON.stringify(incomeData));
        if (!incomeData || !incomeData.commission) continue;

        const rawMonthlyIncome = typeof incomeData.commission.month === 'object' ? incomeData.commission.month.total : incomeData.commission.month;
        const monthlyIncome = rawMonthlyIncome || 0;
        const previousMonthly = member.monthly_charges || 0;
        const incomeDiff = monthlyIncome - previousMonthly;

        const updateObj: Record<string, unknown> = {
          monthly_charges: monthlyIncome,
          last_daily_charges: typeof incomeData.commission.today === 'object' ? (incomeData.commission.today.total || 0) : (incomeData.commission.today || 0),
        };

        if (incomeDiff > 0) {
          const pct = bd.agency_commission_pct || 5;
          const commissionAmount = (incomeDiff * pct) / 100;

          updateObj.current_month_commission = (member.current_month_commission || 0) + commissionAmount;
          updateObj.total_commission = (member.total_commission || 0) + commissionAmount;

          // Log commission
          await sb.from("bd_commission_logs").insert({
            bd_uuid: member.bd_uuid,
            member_uuid: member.member_uuid,
            member_type: member.member_type,
            month,
            source_amount: incomeDiff,
            commission_pct: pct,
            amount: commissionAmount,
          });

          // Update BD earnings
          await sb.from("bd_commission_settings").update({
            current_month_earnings: (bd.current_month_earnings || 0) + commissionAmount,
            total_earned: (bd.total_earned || 0) + commissionAmount,
          }).eq("bd_uuid", member.bd_uuid);

          // Notify BD about new commission
          await sb.from("notifications").insert({
            title: "💰 عمولة جديدة",
            body: `تم احتساب عمولة $${commissionAmount.toFixed(2)} من الوكالة ${member.member_name} (${pct}% من $${incomeDiff.toFixed(2)})`,
            target: "user",
            user_uuid: member.bd_uuid,
          });

          commissionUpdates++;
        }

        await sb.from("bd_members").update(updateObj).eq("id", member.id);
        synced++;
      }
    }

    // Update last sync month
    await sb.from("app_settings").upsert({
      key: "bd_last_sync_month",
      value: month,
    }, { onConflict: "key" });

    return new Response(
      JSON.stringify({
        success: true,
        month,
        is_new_month: isNewMonth,
        monthly_resets: monthlyResets,
        synced_members: synced,
        commission_updates: commissionUpdates,
        active_members: members.length,
        active_bds: bdUuids.length,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("bd-sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "خطأ داخلي" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
