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

// Find agency in the agencies list by owner UUID and get income data
async function fetchAgencyIncomeForMember(sb: ReturnType<typeof supabaseAdmin>, memberUuid: string) {
  const agencyData = await fetchAgencyIncome(sb, memberUuid);
  if (!agencyData || !agencyData.agencies || !Array.isArray(agencyData.agencies)) {
    return null;
  }

  // Find the agency owned by this member
  const agency = agencyData.agencies.find((a: any) => 
    String(a["المعرف المميز لصاحب الوكالة"]) === String(memberUuid)
  );

  if (!agency) {
    console.log(`[SYNC] agency ${memberUuid}: not found in agencies list (${agencyData.agencies.length} agencies)`);
    // Log all owner UUIDs for debugging
    const ownerUuids = agencyData.agencies.map((a: any) => a["المعرف المميز لصاحب الوكالة"]).join(", ");
    console.log(`[SYNC] Available owner UUIDs: ${ownerUuids}`);
    return null;
  }

  console.log(`[SYNC] Found agency for ${memberUuid}: name=${agency["الاسم"]}, salary=${agency["الراتب"]}, hostGoal=${agency["إجمالي الهدف للمضيفين"]}, hosts=${agency["عدد المضيفين"]}`);
  
  // Try to get detailed income using agency-salaries endpoint
  const agencyId = agency["العميل الصغير"] || agency["معرف"];
  if (agencyId) {
    const detailUrl = `${BD_API_URL}?key=${BD_API_KEY}&action=agency-salaries&agency_id=${agencyId}`;
    const detailRes = await fetchWithRetry(detailUrl);
    if (detailRes) {
      try {
        const detailData = await detailRes.json();
        console.log(`[SYNC] agency-salaries response for agency ${agencyId}:`, JSON.stringify(detailData).substring(0, 500));
        if (detailData && detailData.commission) {
          return detailData;
        }
        // Return raw detail data for parsing
        return { ...detailData, _agency_info: agency, _source: "agency-salaries" };
      } catch { /* continue */ }
    }
  }

  // Return agency info for salary-based calculation
  return { _agency_info: agency, _source: "agency-list" };
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

    // === SYNC LOCK: prevent concurrent runs causing duplicate commissions ===
    const { data: lockData } = await sb
      .from("edge_function_cache")
      .select("value, expires_at")
      .eq("key", "bd_sync_lock")
      .maybeSingle();

    if (lockData && new Date(lockData.expires_at) > new Date()) {
      console.log("[LOCK] bd-sync already running, skipping");
      return new Response(JSON.stringify({ skipped: true, reason: "sync already running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set lock for 5 minutes max
    await sb.from("edge_function_cache").upsert(
      { key: "bd_sync_lock", value: { running: true }, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
      { onConflict: "key" }
    );

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
          console.log(`[SYNC] Fallback for supporter ${member.member_uuid}: using charger_num=${member.initial_charger_num}`);
          continue;
        }

        const rawMonthly = typeof chargeData.charges.month === 'object' ? chargeData.charges.month.total : chargeData.charges.month;
        const monthlyCharges = rawMonthly || 0;

        // RE-READ fresh member data to prevent duplicate commissions from concurrent runs
        const { data: freshMember } = await sb.from("bd_members").select("monthly_charges, current_month_commission, total_commission").eq("id", member.id).maybeSingle();
        const previousMonthly = freshMember?.monthly_charges || 0;
        const chargeDiff = monthlyCharges - previousMonthly;

        const updateObj: Record<string, unknown> = {
          monthly_charges: monthlyCharges,
          last_daily_charges: typeof chargeData.charges.today === 'object' ? (chargeData.charges.today.total || 0) : (chargeData.charges.today || 0),
        };

        if (chargeDiff > 0) {
          // DEDUP CHECK: look for existing commission log this sync cycle
          const { data: existingLog } = await sb.from("bd_commission_logs")
            .select("id")
            .eq("bd_uuid", member.bd_uuid)
            .eq("member_uuid", member.member_uuid)
            .eq("month", month)
            .eq("source_amount", chargeDiff)
            .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .maybeSingle();

          if (existingLog) {
            console.log(`[SYNC] DEDUP: skipping duplicate commission for supporter ${member.member_uuid}, diff=${chargeDiff}`);
          } else {
            const pct = bd.user_commission_pct || 2;
            const commissionCoins = (chargeDiff * pct) / 100;
            const commissionAmount = Math.round((commissionCoins / 8500) * 100) / 100;

            updateObj.current_month_commission = (freshMember?.current_month_commission || 0) + commissionAmount;
            updateObj.total_commission = (freshMember?.total_commission || 0) + commissionAmount;

            await sb.from("bd_commission_logs").insert({
              bd_uuid: member.bd_uuid, member_uuid: member.member_uuid,
              member_type: member.member_type, month,
              source_amount: chargeDiff, commission_pct: pct, amount: commissionAmount,
            });

            // RE-READ BD settings for accurate accumulation
            const { data: freshBd } = await sb.from("bd_commission_settings").select("current_month_earnings, total_earned").eq("bd_uuid", member.bd_uuid).maybeSingle();
            await sb.from("bd_commission_settings").update({
              current_month_earnings: (freshBd?.current_month_earnings || 0) + commissionAmount,
              total_earned: (freshBd?.total_earned || 0) + commissionAmount,
            }).eq("bd_uuid", member.bd_uuid);

            await sb.from("notifications").insert({
              title: "💰 عمولة جديدة",
              body: `تم احتساب عمولة $${commissionAmount.toFixed(2)} (${commissionCoins.toLocaleString()} كونزه) من الداعم ${member.member_name} (${pct}% من ${chargeDiff.toLocaleString()} كونزه)`,
              target: "user", user_uuid: member.bd_uuid,
            });

            commissionUpdates++;
          }
        }

        await sb.from("bd_members").update(updateObj).eq("id", member.id);
        synced++;

      } else if (member.member_type === "agency") {
        // === AGENCY SYNC: try multiple data sources ===
        const isTestModeAgency = body?.test_mode === true;
        const testIncome = body?.test_agency_income || 0;

        let agencyMonthlyIncome = 0;
        let agencyDailyIncome = 0;
        let dataSource = "none";

        if (isTestModeAgency && testIncome > 0) {
          agencyMonthlyIncome = testIncome;
          dataSource = "test_mode";
        } else {
          // Strategy 1: Try agency-income list to find this member's agency
          const agencyResult = await fetchAgencyIncomeForMember(sb, member.member_uuid);
          
          if (agencyResult) {
            if (agencyResult.commission) {
              // Direct commission data from agency-salaries
              const rawMonthly = typeof agencyResult.commission.month === 'object' 
                ? agencyResult.commission.month.total : agencyResult.commission.month;
              agencyMonthlyIncome = rawMonthly || 0;
              agencyDailyIncome = typeof agencyResult.commission.today === 'object'
                ? (agencyResult.commission.today.total || 0) : (agencyResult.commission.today || 0);
              dataSource = "agency-salaries-commission";
            } else if (agencyResult._source === "agency-salaries" && agencyResult.salary_this_month !== undefined) {
              // Salary data from agency-salaries (in USD, convert to coins)
              agencyMonthlyIncome = (agencyResult.salary_this_month || 0) * 8500;
              dataSource = "agency-salaries-usd";
            } else if (agencyResult._agency_info) {
              // Fallback: use salary from agencies list
              const salary = parseFloat(agencyResult._agency_info["الراتب"] || "0");
              const hostGoal = parseFloat(agencyResult._agency_info["إجمالي الهدف للمضيفين"] || "0");
              console.log(`[SYNC] agency ${member.member_uuid}: from list - salary=$${salary}, hostGoal=${hostGoal}`);
              // Use hostGoal as income in coins (diamonds)
              if (hostGoal > 0) {
                agencyMonthlyIncome = hostGoal * 8500; // Convert USD to coins
                dataSource = "agency-list-hostGoal";
              } else if (salary > 0) {
                agencyMonthlyIncome = salary * 8500; // Convert USD to coins
                dataSource = "agency-list-salary";
              }
            }
          }

          // Strategy 2: If agency-income failed, try user-charges as fallback
          if (agencyMonthlyIncome === 0) {
            const chargesData = await fetchUserCharges(sb, member.member_uuid);
            if (chargesData?.charges) {
              const monthTotal = typeof chargesData.charges.month === 'object'
                ? (chargesData.charges.month.total || 0) : (chargesData.charges.month || 0);
              agencyDailyIncome = typeof chargesData.charges.today === 'object'
                ? (chargesData.charges.today.total || 0) : (chargesData.charges.today || 0);
              if (monthTotal > 0) {
                agencyMonthlyIncome = monthTotal;
                dataSource = "user-charges";
              }
            }
          }
        }

        console.log(`[SYNC] agency ${member.member_uuid}: income=${agencyMonthlyIncome}, source=${dataSource}`);

        if (agencyMonthlyIncome === 0 && !isTestModeAgency) {
          console.log(`[SYNC] agency ${member.member_uuid}: no income data from any source, skipping`);
          continue;
        }

        const currentDiamonds = agencyMonthlyIncome;

        // RE-READ fresh member data to prevent duplicate commissions
        const { data: freshAgencyMember } = await sb.from("bd_members")
          .select("last_processed_diamonds, current_month_commission, total_commission")
          .eq("id", member.id).maybeSingle();
        const lastProcessed = freshAgencyMember?.last_processed_diamonds || 0;
        const diamondDiff = currentDiamonds - lastProcessed;

        console.log(`[SYNC] agency ${member.member_uuid}: currentDiamonds=${currentDiamonds}, lastProcessed=${lastProcessed}, diff=${diamondDiff}`);

        const updateObj: Record<string, unknown> = {
          monthly_charges: currentDiamonds,
          last_daily_charges: agencyDailyIncome,
          last_processed_diamonds: currentDiamonds,
        };

        // Only create commission if there's an actual increase in diamonds
        if (diamondDiff > 0) {
          // DEDUP CHECK
          const { data: existingAgencyLog } = await sb.from("bd_commission_logs")
            .select("id")
            .eq("bd_uuid", member.bd_uuid)
            .eq("member_uuid", member.member_uuid)
            .eq("month", month)
            .eq("source_amount", diamondDiff)
            .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .maybeSingle();

          if (existingAgencyLog) {
            console.log(`[SYNC] DEDUP: skipping duplicate commission for agency ${member.member_uuid}, diff=${diamondDiff}`);
          } else {
            const pct = bd.agency_commission_pct || 5;
            const commissionCoins = (diamondDiff * pct) / 100;
            const commissionAmount = Math.round((commissionCoins / 8500) * 100) / 100;

            updateObj.current_month_commission = (freshAgencyMember?.current_month_commission || 0) + commissionAmount;
            updateObj.total_commission = (freshAgencyMember?.total_commission || 0) + commissionAmount;

            await sb.from("bd_commission_logs").insert({
              bd_uuid: member.bd_uuid, member_uuid: member.member_uuid,
              member_type: member.member_type, month,
              source_amount: diamondDiff, commission_pct: pct, amount: commissionAmount,
            });

            const { data: freshBdAgency } = await sb.from("bd_commission_settings")
              .select("current_month_earnings, total_earned")
              .eq("bd_uuid", member.bd_uuid).maybeSingle();
            await sb.from("bd_commission_settings").update({
              current_month_earnings: (freshBdAgency?.current_month_earnings || 0) + commissionAmount,
              total_earned: (freshBdAgency?.total_earned || 0) + commissionAmount,
            }).eq("bd_uuid", member.bd_uuid);

            await sb.from("notifications").insert({
              title: "💰 عمولة جديدة",
              body: `تم احتساب عمولة $${commissionAmount.toFixed(2)} (${commissionCoins.toLocaleString()} ماسة) من الوكالة ${member.member_name} (${pct}% من ${diamondDiff.toLocaleString()} ماسة زيادة)`,
              target: "user", user_uuid: member.bd_uuid,
            });

            commissionUpdates++;
            console.log(`[SYNC] agency ${member.member_uuid}: commission created $${commissionAmount} from ${diamondDiff} diamond increase`);
          }
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

    // Cleanup expired cache entries + release sync lock
    await sb.from("edge_function_cache").delete().lt("expires_at", new Date().toISOString());
    await sb.from("edge_function_cache").delete().eq("key", "bd_sync_lock");

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
    // Release lock on error
    try { await sb.from("edge_function_cache").delete().eq("key", "bd_sync_lock"); } catch {}
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "خطأ داخلي" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
