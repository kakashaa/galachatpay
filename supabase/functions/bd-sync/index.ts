import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/hmac.ts";

const BD_API_URL = "http://18.219.229.240/website/bd-data-api.php";
const BD_API_KEY = "ghala2026actions";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

// ── Cache helpers ──────────────────────────────────────────────
async function getCached(sb: ReturnType<typeof supabaseAdmin>, key: string) {
  const { data } = await sb
    .from("edge_function_cache")
    .select("value, expires_at")
    .eq("key", key)
    .maybeSingle();
  if (data && new Date(data.expires_at) > new Date()) {
    console.log(`[CACHE] hit: ${key}`);
    return data.value;
  }
  return null;
}

async function setCache(sb: ReturnType<typeof supabaseAdmin>, key: string, value: unknown) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  await sb.from("edge_function_cache").upsert(
    { key, value, expires_at: expiresAt },
    { onConflict: "key" }
  );
}

// ── Fetch with retry (60s timeout) ─────────────────────────────
async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) { await res.text(); return null; }
      return res;
    } catch (e) {
      console.error(`fetch attempt ${i + 1} failed for ${url}:`, e);
      if (i < retries) await new Promise(r => setTimeout(r, 1500));
    }
  }
  return null;
}

// ── API calls with cache layer ─────────────────────────────────
async function fetchUserCharges(sb: ReturnType<typeof supabaseAdmin>, uuid: string) {
  const cacheKey = `user_charges_${uuid}`;
  const cached = await getCached(sb, cacheKey);
  if (cached) return cached;

  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=${uuid}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  try {
    const data = await res.json();
    await setCache(sb, cacheKey, data);
    return data;
  } catch { return null; }
}

async function fetchBDProfit(sb: ReturnType<typeof supabaseAdmin>, bdId: string) {
  const cacheKey = `bd_profit_${bdId}`;
  const cached = await getCached(sb, cacheKey);
  if (cached) return cached;

  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=get_bd_profit&bd_id=${bdId}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  try {
    const data = await res.json();
    if (data.status === "success") {
      await setCache(sb, cacheKey, data);
    }
    return data;
  } catch { return null; }
}

async function fetchAgencyIncome(sb: ReturnType<typeof supabaseAdmin>, uuid: string) {
  const cacheKey = `agency_income_${uuid}`;
  const cached = await getCached(sb, cacheKey);
  if (cached) return cached;

  const url = `${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${uuid}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  try {
    const data = await res.json();
    await setCache(sb, cacheKey, data);
    return data;
  } catch { return null; }
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
    }

    // Get all active BD members
    const { data: members } = await sb
      .from("bd_members")
      .select("id, member_uuid, member_name, last_daily_charges, initial_charger_num, member_type, bd_uuid, monthly_charges, current_month_commission, total_commission, last_processed_diamonds")
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
      for (const [bdUuid, bd] of Object.entries(bdMap)) {
        const monthEarnings = (bd as any).current_month_earnings || 0;
        if (monthEarnings > 0) {
          await sb.from("bd_commission_settings").update({
            available_balance: ((bd as any).available_balance || 0) + monthEarnings,
            current_month_earnings: 0,
          }).eq("bd_uuid", bdUuid);
        }
      }

      for (const member of members) {
        await sb.from("bd_members").update({
          monthly_charges: 0,
          current_month_commission: 0,
        }).eq("id", member.id);
        monthlyResets++;
      }
    }

    // === SYNC: Fetch live data with caching & 60s timeout ===
    let synced = 0;
    let commissionUpdates = 0;
    let cacheHits = 0;

    for (const member of members) {
      const bd = bdMap[member.bd_uuid];
      if (!bd) continue;

      if (synced > 0) await new Promise(r => setTimeout(r, 200));

      if (member.member_type === "supporter") {
        const isTestMode = body?.test_mode === true;
        const testCharges = body?.test_charges || 0;
        let chargeData: any = null;
        
        if (isTestMode && testCharges > 0) {
          chargeData = { charges: { month: { total: testCharges }, today: { total: 0 } } };
        } else {
          chargeData = await fetchUserCharges(sb, member.member_uuid);
        }
        console.log(`[SYNC] supporter ${member.member_uuid} response:`, JSON.stringify(chargeData));
        
        if (!chargeData || !chargeData.charges) {
          // Fallback: use initial_charger_num if API fails
          console.log(`[SYNC] Fallback for supporter ${member.member_uuid}: using charger_num=${member.initial_charger_num}`);
          continue;
        }

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
          const commissionCoins = (chargeDiff * pct) / 100;
          const commissionAmount = Math.round((commissionCoins / 8500) * 100) / 100;

          updateObj.current_month_commission = (member.current_month_commission || 0) + commissionAmount;
          updateObj.total_commission = (member.total_commission || 0) + commissionAmount;

          await sb.from("bd_commission_logs").insert({
            bd_uuid: member.bd_uuid, member_uuid: member.member_uuid,
            member_type: member.member_type, month,
            source_amount: chargeDiff, commission_pct: pct, amount: commissionAmount,
          });

          await sb.from("bd_commission_settings").update({
            current_month_earnings: (bd.current_month_earnings || 0) + commissionAmount,
            total_earned: (bd.total_earned || 0) + commissionAmount,
          }).eq("bd_uuid", member.bd_uuid);

          await sb.from("notifications").insert({
            title: "💰 عمولة جديدة",
            body: `تم احتساب عمولة $${commissionAmount.toFixed(2)} (${commissionCoins.toLocaleString()} كونزه) من الداعم ${member.member_name} (${pct}% من ${chargeDiff.toLocaleString()} كونزه)`,
            target: "user", user_uuid: member.bd_uuid,
          });

          commissionUpdates++;
        }

        await sb.from("bd_members").update(updateObj).eq("id", member.id);
        synced++;

      } else if (member.member_type === "agency") {
        const isTestModeAgency = body?.test_mode === true;
        const testIncome = body?.test_agency_income || 0;
        let incomeData: any = null;

        if (isTestModeAgency && testIncome > 0) {
          incomeData = { commission: { month: { total: testIncome }, today: { total: 0 } }, salary_this_month: 0 };
        } else {
          incomeData = await fetchAgencyIncome(sb, member.member_uuid);
        }
        console.log(`[SYNC] agency ${member.member_uuid} response:`, JSON.stringify(incomeData));
        
        if (!incomeData || !incomeData.commission) {
          console.log(`[SYNC] Fallback for agency ${member.member_uuid}: using charger_num=${member.initial_charger_num}`);
          continue;
        }

        const rawMonthlyIncome = typeof incomeData.commission.month === 'object' ? incomeData.commission.month.total : incomeData.commission.month;
        const currentDiamonds = rawMonthlyIncome || 0;
        const lastProcessed = member.last_processed_diamonds || 0;
        const diamondDiff = currentDiamonds - lastProcessed;

        console.log(`[SYNC] agency ${member.member_uuid}: currentDiamonds=${currentDiamonds}, lastProcessed=${lastProcessed}, diff=${diamondDiff}`);

        const updateObj: Record<string, unknown> = {
          monthly_charges: currentDiamonds,
          last_daily_charges: typeof incomeData.commission.today === 'object' ? (incomeData.commission.today.total || 0) : (incomeData.commission.today || 0),
          last_processed_diamonds: currentDiamonds,
        };

        // Only create commission if there's an actual increase in diamonds
        if (diamondDiff > 0) {
          const pct = bd.agency_commission_pct || 5;
          const commissionCoins = (diamondDiff * pct) / 100;
          const commissionAmount = Math.round((commissionCoins / 8500) * 100) / 100;

          updateObj.current_month_commission = (member.current_month_commission || 0) + commissionAmount;
          updateObj.total_commission = (member.total_commission || 0) + commissionAmount;

          await sb.from("bd_commission_logs").insert({
            bd_uuid: member.bd_uuid, member_uuid: member.member_uuid,
            member_type: member.member_type, month,
            source_amount: diamondDiff, commission_pct: pct, amount: commissionAmount,
          });

          await sb.from("bd_commission_settings").update({
            current_month_earnings: (bd.current_month_earnings || 0) + commissionAmount,
            total_earned: (bd.total_earned || 0) + commissionAmount,
          }).eq("bd_uuid", member.bd_uuid);

          await sb.from("notifications").insert({
            title: "💰 عمولة جديدة",
            body: `تم احتساب عمولة $${commissionAmount.toFixed(2)} (${commissionCoins.toLocaleString()} ماسة) من الوكالة ${member.member_name} (${pct}% من ${diamondDiff.toLocaleString()} ماسة زيادة)`,
            target: "user", user_uuid: member.bd_uuid,
          });

          commissionUpdates++;
          console.log(`[SYNC] agency ${member.member_uuid}: commission created $${commissionAmount} from ${diamondDiff} diamond increase`);
        } else {
          console.log(`[SYNC] agency ${member.member_uuid}: no diamond increase, skipping commission`);
        }

        await sb.from("bd_members").update(updateObj).eq("id", member.id);
        synced++;
      }
    }

    // === SYNC BD PROFIT from external API ===
    let profitSynced = 0;
    for (const bdUuid of bdUuids) {
      const profitData = await fetchBDProfit(sb, bdUuid);
      if (profitData?.status === "success" && profitData.profit) {
        const p = profitData.profit;
        const ps = profitData.profit_status || {};
        await sb.from("bd_commission_settings").update({
          external_total_profit: p.total_profit || 0,
          external_available_profit: p.available_profit || 0,
          external_pending_profit: p.pending_profit || 0,
          external_profit_status: ps.type || "no_change",
          external_profit_difference: ps.difference || 0,
          external_last_update: profitData.last_update || null,
        }).eq("bd_uuid", bdUuid);
        profitSynced++;
        console.log(`[PROFIT] synced BD ${bdUuid}: total=$${p.total_profit}, available=$${p.available_profit}`);
      }
    }

    // Update last sync month
    await sb.from("app_settings").upsert({
      key: "bd_last_sync_month", value: month,
    }, { onConflict: "key" });

    // Cleanup expired cache entries
    await sb.from("edge_function_cache").delete().lt("expires_at", new Date().toISOString());

    return new Response(
      JSON.stringify({
        success: true, month, is_new_month: isNewMonth,
        monthly_resets: monthlyResets, synced_members: synced,
        commission_updates: commissionUpdates, profit_synced: profitSynced,
        active_members: members.length,
        active_bds: bdUuids.length, timestamp: now.toISOString(),
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
