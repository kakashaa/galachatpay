import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/hmac.ts";

const BD_API_URLS = [
  "https://hola-chat.com/bd-data-api.php",
  "http://18.219.229.240/bd-data-api.php",
];
const TOP_CHARGERS_API_URLS = [
  "https://hola-chat.com/top-chargers-api.php",
  "http://18.219.229.240/top-chargers-api.php",
];
const AGENCY_TARGET_API_URLS = [
  "https://hola-chat.com/agency-target-api.php",
  "http://18.219.229.240/agency-target-api.php",
];
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

// ── Fetch with retry ────────────────────────────────────────────
async function fetchWithRetry(url: string, retries = 1): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[FETCH] ${url} failed with status ${res.status}: ${body.slice(0, 200)}`);
        return null;
      }
      return res;
    } catch (e) {
      console.error(`fetch attempt ${i + 1} failed for ${url}:`, e);
      if (i < retries) await new Promise(r => setTimeout(r, 1000));
    }
  }
  return null;
}

function isPageLoadFailedPayload(text: string): boolean {
  return text.toLowerCase().includes("page load failed");
}

// ── API 1: fetch monthly charges for ONE supporter ──
async function fetchMonthlyCharges(
  sb: ReturnType<typeof supabaseAdmin>,
  uuid: string,
  skipCache = false
): Promise<number | null> {
  const cacheKey = `monthly_charges_${uuid}`;
  if (!skipCache) {
    const cached = await getCached(sb, cacheKey);
    if (cached !== null && typeof cached === "number") return cached;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  for (const baseUrl of TOP_CHARGERS_API_URLS) {
    const url = `${baseUrl}?key=${BD_API_KEY}&action=top-chargers&uuids=${uuid}&year=${year}&month=${month}`;
    console.log(`[API] fetching charges for ${uuid} via ${baseUrl}`);
    const res = await fetchWithRetry(url, 2);
    if (!res) continue;

    try {
      const text = await res.text();
      if (isPageLoadFailedPayload(text)) continue;
      const data = JSON.parse(text);
      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      for (const entry of rows) {
        const entryUuid = String(entry?.uuid ?? entry?.user_uuid ?? "").trim();
        if (entryUuid === uuid || rows.length === 1) {
          const total = toNum(entry?.total_charges ?? entry?.total ?? 0);
          await setCache(sb, cacheKey, total);
          console.log(`[API] charges for ${uuid}: total_charges=${total}`);
          return total;
        }
      }
    } catch (e) {
      console.error(`[API] parse error for ${uuid} via ${baseUrl}:`, e);
    }
  }

  return null;
}

// ── API 2: agency-target (for agencies - uses total_user_salary) ──
async function fetchAgencyTarget(sb: ReturnType<typeof supabaseAdmin>, uuid: string, skipCache = false) {
  const cacheKey = `agency_target_${uuid}`;
  if (!skipCache) {
    const cached = await getCached(sb, cacheKey);
    if (cached) return cached;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  for (const baseUrl of AGENCY_TARGET_API_URLS) {
    const url = `${baseUrl}?key=${BD_API_KEY}&uuid=${uuid}&year=${year}&month=${month}`;
    console.log(`[API] agency-target URL: ${url}`);
    const res = await fetchWithRetry(url, 2);
    if (!res) continue;

    try {
      const text = await res.text();
      if (isPageLoadFailedPayload(text)) continue;

      const data = JSON.parse(text);
      console.log(`[API] agency-target response for ${uuid}:`, JSON.stringify(data).slice(0, 300));
      if (data?.status === "success" || data?.data?.status === "success") {
        const result = data?.data?.data || data?.data || data;
        await setCache(sb, cacheKey, result);
        return result;
      }
      if (data?.total_user_salary !== undefined) {
        await setCache(sb, cacheKey, data);
        return data;
      }
    } catch {
      // continue to next base URL
    }
  }

  return null;
}

// ── API 4: user-info ───────────────────────────────────────────
async function fetchUserInfo(sb: ReturnType<typeof supabaseAdmin>, uuid: string) {
  const cacheKey = `user_info_${uuid}`;
  const cached = await getCached(sb, cacheKey);
  if (cached) return cached;

  for (const baseUrl of BD_API_URLS) {
    const url = `${baseUrl}?key=${BD_API_KEY}&action=user-info&uuid=${uuid}`;
    const res = await fetchWithRetry(url, 1); // fewer retries for non-critical
    if (!res) continue;
    try {
      const text = await res.text();
      if (isPageLoadFailedPayload(text)) continue;
      const data = JSON.parse(text);

      const hasUsableIdentity = Boolean(
        data?.name ||
        data?.type_user ||
        data?.user?.["معرف"] ||
        data?.user?.id ||
        data?.user?.name
      );

      if (data?.ok === true && hasUsableIdentity) {
        await setCache(sb, cacheKey, data);
      } else {
        console.log(`[API] user-info for ${uuid} is not usable, skip cache`);
      }

      return data;
    } catch {
      // continue
    }
  }
  return null;
}

function parseNumericId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  const match = text.match(/\d+/);
  return match ? match[0] : null;
}

function normalizeNumericText(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^\d.,+-]/g, "")
    .replace(/\+/g, "")
    .replace(/,/g, "")
    .trim();
}

function toNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const normalized = normalizeNumericText(value);
    if (!normalized) return 0;

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;

    const matched = normalized.match(/-?\d+(?:\.\d+)?/);
    return matched ? Number(matched[0]) || 0 : 0;
  }

  if (value && typeof value === "object") {
    return toNum((value as any).total ?? (value as any).count ?? 0);
  }

  return 0;
}

function extractInternalUserId(userInfo: any): string | null {
  return (
    parseNumericId(userInfo?.user?.["معرف"]) ||
    parseNumericId(userInfo?.user?.id) ||
    parseNumericId(userInfo?.id) ||
    null
  );
}

// ── API: user-charges (fallback source for supporters) ─────────
async function fetchUserCharges(
  sb: ReturnType<typeof supabaseAdmin>,
  uuid: string,
  skipCache = false
): Promise<any | null> {
  const cacheKey = `user_charges_${uuid}`;
  if (!skipCache) {
    const cached = await getCached(sb, cacheKey);
    if (cached) return cached;
  }

  for (const baseUrl of BD_API_URLS) {
    const url = `${baseUrl}?key=${BD_API_KEY}&action=user-charges&uuid=${uuid}`;
    const res = await fetchWithRetry(url, 1);
    if (!res) continue;
    try {
      const text = await res.text();
      if (isPageLoadFailedPayload(text)) continue;
      const data = JSON.parse(text);
      if (data) {
        await setCache(sb, cacheKey, data);
        return data;
      }
    } catch {
      // continue
    }
  }
  return null;
}

// ── Build recent fallback map (single call, applies to all supporters) ──
async function buildRecentFallbackMap(
  sb: ReturnType<typeof supabaseAdmin>,
  month: string,
  seedMemberUuid: string | null,
  internalIdToMemberUuid: Map<string, string>
): Promise<Map<string, number>> {
  const fallbackByMember = new Map<string, number>();
  if (!seedMemberUuid || internalIdToMemberUuid.size === 0) return fallbackByMember;

  const userCharges = await fetchUserCharges(sb, seedMemberUuid, true);
  if (!userCharges) return fallbackByMember;

  const recentList = Array.isArray(userCharges?.recent)
    ? userCharges.recent
    : Array.isArray(userCharges?.recent_charges)
      ? userCharges.recent_charges
      : [];

  for (const entry of recentList) {
    const targetRef = (entry as any)?.["معرف المستخدم"]
      ?? (entry as any)?.user_id
      ?? (entry as any)?.target_user_id
      ?? (entry as any)?.target_id;

    const targetInternalId = parseNumericId(targetRef);
    if (!targetInternalId) continue;

    const memberUuid = internalIdToMemberUuid.get(targetInternalId);
    if (!memberUuid) continue;

    const chargeId = parseNumericId((entry as any)?.["معرف"] ?? (entry as any)?.id ?? (entry as any)?.charge_id);
    const chargeCoins = toNum((entry as any)?.["الكوينز"] ?? (entry as any)?.coins ?? (entry as any)?.amount);

    if (!chargeId || chargeCoins <= 0) continue;

    const dedupeKey = `bd_recent_charge_${month}_${memberUuid}_${chargeId}`;
    const seen = await getCached(sb, dedupeKey);
    if (seen) continue;

    fallbackByMember.set(memberUuid, (fallbackByMember.get(memberUuid) || 0) + chargeCoins);

    await sb.from("edge_function_cache").upsert(
      {
        key: dedupeKey,
        value: { processed: true, amount: chargeCoins },
        expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "key" }
    );
  }

  return fallbackByMember;
}

// ── API 5: host-salary (for hosts) ─────────────────────────────
async function fetchHostSalary(sb: ReturnType<typeof supabaseAdmin>, uuid: string) {
  const cacheKey = `host_salary_${uuid}`;
  const cached = await getCached(sb, cacheKey);
  if (cached) return cached;

  for (const baseUrl of BD_API_URLS) {
    const url = `${baseUrl}?key=${BD_API_KEY}&action=host-salary&uuid=${uuid}`;
    const res = await fetchWithRetry(url);
    if (!res) continue;
    try {
      const text = await res.text();
      if (isPageLoadFailedPayload(text)) continue;
      const data = JSON.parse(text);
      console.log(`[API] host-salary keys for ${uuid}: [${Object.keys(data || {}).join(", ")}]`);
      await setCache(sb, cacheKey, data);
      return data;
    } catch {
      // continue
    }
  }

  return null;
}

// ── API: BD profit ─────────────────────────────────────────────
async function fetchBDProfit(sb: ReturnType<typeof supabaseAdmin>, bdId: string) {
  const cacheKey = `bd_profit_${bdId}`;
  const cached = await getCached(sb, cacheKey);
  if (cached) return cached;

  for (const baseUrl of BD_API_URLS) {
    const url = `${baseUrl}?key=${BD_API_KEY}&action=get_bd_profit&bd_id=${bdId}`;
    const res = await fetchWithRetry(url);
    if (!res) continue;
    try {
      const text = await res.text();
      if (isPageLoadFailedPayload(text)) continue;
      const data = JSON.parse(text);
      if (data.status === "success") {
        await setCache(sb, cacheKey, data);
      }
      return data;
    } catch {
      // continue
    }
  }

  return null;
}

// ── Helper: extract numeric from API field ─────────────────────
function extractTotal(field: any): number {
  if (!field) return 0;
  if (typeof field === "object" && field.total !== undefined) return Number(field.total) || 0;
  return Number(field) || 0;
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

    // === SYNC LOCK ===
    const isManual = body?.manual === true;
    const { data: lockData } = await sb
      .from("edge_function_cache")
      .select("value, expires_at")
      .eq("key", "bd_sync_lock")
      .maybeSingle();

    if (lockData && new Date(lockData.expires_at) > new Date() && !isManual) {
      console.log("[LOCK] bd-sync already running, skipping");
      return new Response(JSON.stringify({ skipped: true, reason: "sync already running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Manual sync always proceeds - delete stale lock first
    if (isManual && lockData) {
      await sb.from("edge_function_cache").delete().eq("key", "bd_sync_lock");
      console.log("[LOCK] manual sync - cleared stale lock");
    }

    await sb.from("edge_function_cache").upsert(
      { key: "bd_sync_lock", value: { running: true }, expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString() },
      { onConflict: "key" }
    );

    // Check schedule for cron
    if (isCronCall) {
      const { data: scheduleSetting } = await sb
        .from("app_settings").select("value").eq("key", "bd_sync_schedule").maybeSingle();
      const schedule = scheduleSetting?.value || "hourly";
      if (schedule === "daily" && now.getUTCHours() !== 21) {
        return new Response(JSON.stringify({ skipped: true, reason: "daily schedule - not midnight UTC" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get all active BD members
    const { data: members } = await sb
      .from("bd_members")
      .select("id, member_uuid, member_name, last_daily_charges, initial_charger_num, member_type, bd_uuid, monthly_charges, current_month_commission, total_commission, last_processed_diamonds, type_user")
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

    // Check new month
    const { data: lastSyncSetting } = await sb
      .from("app_settings").select("value").eq("key", "bd_last_sync_month").maybeSingle();
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
          monthly_charges: 0, current_month_commission: 0, last_processed_diamonds: 0,
        }).eq("id", member.id);
        monthlyResets++;
      }
    }

    // === SYNC MEMBERS ===
    let synced = 0;
    let commissionUpdates = 0;
    let infoUpdates = 0;

    // ── Step 1: Identify supporter UUIDs ──
    const supporterUuids = members
      .filter((m: any) => m.member_type === "supporter")
      .map((m: any) => m.member_uuid);

    console.log(`[SYNC] ${supporterUuids.length} supporters to process via BATCH`);

    // Prefetch already-counted supporter source amounts for this month (for anti-rollback safety)
    const supporterSourceMap = new Map<string, number>();
    if (supporterUuids.length > 0) {
      const { data: supporterLogs } = await sb
        .from("bd_commission_logs")
        .select("member_uuid, source_amount")
        .eq("member_type", "supporter")
        .eq("month", month)
        .in("member_uuid", supporterUuids);

      for (const row of supporterLogs || []) {
        const memberUuid = String((row as any).member_uuid || "");
        const sourceAmount = toNum((row as any).source_amount);
        supporterSourceMap.set(memberUuid, (supporterSourceMap.get(memberUuid) || 0) + sourceAmount);
      }
    }

    // ── Step 2: Fetch all data in parallel batches (user-info + charges/agency/host) ──
    const BATCH_SIZE = 10;
    const memberDataMap = new Map<string, { userInfo: any; chargeData: number | null; agencyData: any; hostData: any }>();

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (member: any) => {
        const result: any = { userInfo: null, chargeData: null, agencyData: null, hostData: null };
        
        const tasks: Promise<void>[] = [];
        
        // Always fetch user-info
        tasks.push(
          fetchUserInfo(sb, member.member_uuid).then(d => { result.userInfo = d; }).catch(() => {})
        );

        // For supporters, fetch charges individually
        if (member.member_type === "supporter") {
          tasks.push(
            fetchMonthlyCharges(sb, member.member_uuid, isManual).then(d => { result.chargeData = d; }).catch(() => {})
          );
        } else if (member.member_type === "agency") {
          tasks.push(
            fetchAgencyTarget(sb, member.member_uuid, isManual).then(d => { result.agencyData = d; }).catch(() => {})
          );
        } else if (member.member_type === "host") {
          tasks.push(
            fetchHostSalary(sb, member.member_uuid).then(d => { result.hostData = d; }).catch(() => {})
          );
        }

        await Promise.all(tasks);
        memberDataMap.set(member.member_uuid, result);
      });

      await Promise.all(promises);
    }

    console.log(`[SYNC] pre-fetched data for ${memberDataMap.size} members`);

    // ── Step 3: Build fallback map for manual sync when aggregate API fails ──
    let recentFallbackByMember = new Map<string, number>();
    if (isManual && supporterUuids.length > 0) {
      const internalIdToMemberUuid = new Map<string, string>();

      for (const supporterUuid of supporterUuids) {
        const prefetched = memberDataMap.get(supporterUuid);
        if (!prefetched?.userInfo) continue;
        const internalUserId = extractInternalUserId(prefetched.userInfo);
        if (!internalUserId) continue;
        internalIdToMemberUuid.set(internalUserId, supporterUuid);
      }

      recentFallbackByMember = await buildRecentFallbackMap(
        sb,
        month,
        supporterUuids[0] || null,
        internalIdToMemberUuid
      );

      if (recentFallbackByMember.size > 0) {
        const totalRecovered = [...recentFallbackByMember.values()].reduce((sum, v) => sum + v, 0);
        console.log(`[SYNC] fallback map recovered ${totalRecovered} coins for ${recentFallbackByMember.size} supporters`);
      }
    }

    // Now process members sequentially (DB writes need ordering for commission safety)
    for (const member of members) {
      const bd = bdMap[member.bd_uuid];
      if (!bd) continue;
      const prefetched = memberDataMap.get(member.member_uuid);
      if (!prefetched) continue;

      // ── Update member info ──
      try {
        const userInfo = prefetched.userInfo;
        // Extract name: try direct .name, then .user.اسم (Arabic API), then .user.name
        const extractedName = userInfo?.name || userInfo?.user?.["اسم"] || userInfo?.user?.name || "";
        const extractedType = Number(userInfo?.type_user ?? userInfo?.user?.["معرف"] ?? 0) || member.type_user || 0;
        if (extractedName && extractedName !== member.member_name) {
          await sb.from("bd_members").update({
            member_name: extractedName,
            type_user: extractedType,
          }).eq("id", member.id);
          infoUpdates++;
          console.log(`[INFO] updated name for ${member.member_uuid}: "${member.member_name}" -> "${extractedName}"`);
        }
      } catch {}

      // ════════════════════════════════════════════════════════════
      // SUPPORTER
      // ════════════════════════════════════════════════════════════
      if (member.member_type === "supporter") {
        const isTestMode = body?.test_mode === true;
        const testCharges = body?.test_charges || 0;
        let monthlyCharges = 0;

        if (isTestMode && testCharges > 0) {
          monthlyCharges = testCharges;
        } else if (prefetched.chargeData === null) {
          if (!isManual) {
            console.log(`[SYNC] supporter ${member.member_uuid}: API failed, skipping`);
            continue;
          }
          // In manual sync, continue with baseline + fallback map even if aggregate API is down
          monthlyCharges = toNum(member.monthly_charges);
          console.log(`[SYNC] supporter ${member.member_uuid}: aggregate API unavailable, using baseline/fallback mode`);
        } else {
          monthlyCharges = prefetched.chargeData;
        }

        const { data: fresh } = await sb.from("bd_members")
          .select("monthly_charges, current_month_commission, total_commission")
          .eq("id", member.id).maybeSingle();

        const previousMonthly = toNum(fresh?.monthly_charges);
        const loggedSourceTotal = supporterSourceMap.get(member.member_uuid) || 0;
        const baselineMonthly = Math.max(previousMonthly, loggedSourceTotal);

        let effectiveMonthlyCharges = toNum(monthlyCharges);

        // Safety: never rollback supporter monthly charges because upstream API may temporarily return 0
        if (effectiveMonthlyCharges < baselineMonthly) {
          console.log(`[SYNC] supporter ${member.member_uuid}: stale API value ${effectiveMonthlyCharges}, keeping baseline ${baselineMonthly}`);
          effectiveMonthlyCharges = baselineMonthly;
        }

        // Manual-sync fallback: recover fresh charges from recent feed when aggregate API returns stale data
        if (isManual && effectiveMonthlyCharges <= baselineMonthly) {
          const fallbackIncrease = recentFallbackByMember.get(member.member_uuid) || 0;
          if (fallbackIncrease > 0) {
            effectiveMonthlyCharges = baselineMonthly + fallbackIncrease;
            console.log(`[SYNC] supporter ${member.member_uuid}: fallback +${fallbackIncrease}, total=${effectiveMonthlyCharges}`);
          }
        }

        // Anti-rollback only

        const chargeDiff = effectiveMonthlyCharges - baselineMonthly;

        console.log(`[SYNC] supporter ${member.member_uuid}: api=${monthlyCharges}, baseline=${baselineMonthly}, total=${effectiveMonthlyCharges}, diff=${chargeDiff}`);

        const updateObj: Record<string, unknown> = {
          monthly_charges: effectiveMonthlyCharges,
          last_daily_charges: effectiveMonthlyCharges,
        };

        if (chargeDiff > 0) {
          const { data: existingLog } = await sb.from("bd_commission_logs")
            .select("id")
            .eq("bd_uuid", member.bd_uuid).eq("member_uuid", member.member_uuid)
            .eq("month", month).eq("source_amount", chargeDiff)
            .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingLog) {
            const pct = bd.user_commission_pct || 2;
            // Convert coins to USD first (7500 coins = $1), then take commission %
            const chargeUSD = chargeDiff / 7500;
            const commissionAmount = Math.round((chargeUSD * pct / 100) * 100) / 100;

            updateObj.current_month_commission = (fresh?.current_month_commission || 0) + commissionAmount;
            updateObj.total_commission = (fresh?.total_commission || 0) + commissionAmount;

            await sb.from("bd_commission_logs").insert({
              bd_uuid: member.bd_uuid, member_uuid: member.member_uuid,
              member_type: "supporter", month,
              source_amount: chargeDiff, commission_pct: pct, amount: commissionAmount,
            });

            supporterSourceMap.set(member.member_uuid, loggedSourceTotal + chargeDiff);

            const { data: freshBd } = await sb.from("bd_commission_settings")
              .select("current_month_earnings, total_earned").eq("bd_uuid", member.bd_uuid).maybeSingle();
            await sb.from("bd_commission_settings").update({
              current_month_earnings: (freshBd?.current_month_earnings || 0) + commissionAmount,
              total_earned: (freshBd?.total_earned || 0) + commissionAmount,
            }).eq("bd_uuid", member.bd_uuid);

            await sb.from("notifications").insert({
              title: "💰 عمولة جديدة",
              body: `عمولة $${commissionAmount.toFixed(2)} من الداعم ${member.member_name} (${pct}% من ${chargeDiff.toLocaleString()} كونزه)`,
              target: "user", user_uuid: member.bd_uuid,
            });
            commissionUpdates++;
          }
        }

        await sb.from("bd_members").update(updateObj).eq("id", member.id);
        synced++;

      // ════════════════════════════════════════════════════════════
      // AGENCY
      // ════════════════════════════════════════════════════════════
      } else if (member.member_type === "agency") {
        const isTestMode = body?.test_mode === true;
        const testIncome = body?.test_agency_income || 0;
        let totalHostSalaries = 0;

        if (isTestMode && testIncome > 0) {
          totalHostSalaries = testIncome;
        } else {
          const agencyData = prefetched.agencyData;
          if (agencyData && agencyData.total_user_salary !== undefined) {
            totalHostSalaries = Number(agencyData.total_user_salary) || 0;
            console.log(`[SYNC] agency ${member.member_uuid}: total_user_salary=${totalHostSalaries}, agency_salary=${agencyData.agency_salary}`);
          } else {
            console.log(`[SYNC] agency ${member.member_uuid}: agency-target API failed or no data, skipping. Data:`, JSON.stringify(agencyData).slice(0, 200));
            continue;
          }
        }

        // Convert total_host_salaries (USD) to coins for storage consistency  
        const totalHostSalaryCoins = Math.round(totalHostSalaries * 7500);

        const { data: fresh } = await sb.from("bd_members")
          .select("last_processed_diamonds, current_month_commission, total_commission, monthly_charges")
          .eq("id", member.id).maybeSingle();
        const lastProcessed = fresh?.last_processed_diamonds || 0;
        // Use USD value for diff calculation (commission is % of USD)
        const salaryDiff = totalHostSalaries - lastProcessed;

        console.log(`[SYNC] agency ${member.member_uuid}: totalHostSalaries=$${totalHostSalaries}, prev=$${lastProcessed}, diff=$${salaryDiff}`);

        const updateObj: Record<string, unknown> = {
          monthly_charges: totalHostSalaryCoins,
          last_processed_diamonds: totalHostSalaries,
        };

        if (salaryDiff > 0) {
          const { data: existingLog } = await sb.from("bd_commission_logs")
            .select("id")
            .eq("bd_uuid", member.bd_uuid).eq("member_uuid", member.member_uuid)
            .eq("month", month).eq("source_amount", salaryDiff)
            .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingLog) {
            const pct = bd.agency_commission_pct || 2;
            // Commission = pct% of total_host_salaries (already in USD)
            const commissionAmount = Math.round((salaryDiff * pct / 100) * 100) / 100;

            updateObj.current_month_commission = (fresh?.current_month_commission || 0) + commissionAmount;
            updateObj.total_commission = (fresh?.total_commission || 0) + commissionAmount;

            await sb.from("bd_commission_logs").insert({
              bd_uuid: member.bd_uuid, member_uuid: member.member_uuid,
              member_type: "agency", month,
              source_amount: salaryDiff, commission_pct: pct, amount: commissionAmount,
            });

            const { data: freshBd } = await sb.from("bd_commission_settings")
              .select("current_month_earnings, total_earned").eq("bd_uuid", member.bd_uuid).maybeSingle();
            await sb.from("bd_commission_settings").update({
              current_month_earnings: (freshBd?.current_month_earnings || 0) + commissionAmount,
              total_earned: (freshBd?.total_earned || 0) + commissionAmount,
            }).eq("bd_uuid", member.bd_uuid);

            await sb.from("notifications").insert({
              title: "💰 عمولة وكالة",
              body: `عمولة $${commissionAmount.toFixed(2)} من الوكالة ${member.member_name} (${pct}% من $${salaryDiff.toFixed(2)} رواتب مضيفين)`,
              target: "user", user_uuid: member.bd_uuid,
            });
            commissionUpdates++;
          }
        }

        await sb.from("bd_members").update(updateObj).eq("id", member.id);
        synced++;

      // ════════════════════════════════════════════════════════════
      // HOST
      // ════════════════════════════════════════════════════════════
      } else if (member.member_type === "host") {
        const hostData = prefetched.hostData;
        if (!hostData) {
          console.log(`[SYNC] host ${member.member_uuid}: API returned null, skipping`);
          continue;
        }

        const monthlySalary = Number(hostData.salary) || Number(hostData.month_salary) || Number(hostData.total) || 0;
        const dailySalary = Number(hostData.today) || Number(hostData.daily) || 0;

        const { data: fresh } = await sb.from("bd_members")
          .select("last_processed_diamonds, current_month_commission, total_commission")
          .eq("id", member.id).maybeSingle();
        const lastProcessed = fresh?.last_processed_diamonds || 0;
        const salaryDiff = monthlySalary - lastProcessed;

        const updateObj: Record<string, unknown> = {
          monthly_charges: monthlySalary,
          last_daily_charges: dailySalary,
          last_processed_diamonds: monthlySalary,
        };

        if (salaryDiff > 0) {
          const { data: existingLog } = await sb.from("bd_commission_logs")
            .select("id")
            .eq("bd_uuid", member.bd_uuid).eq("member_uuid", member.member_uuid)
            .eq("month", month).eq("source_amount", salaryDiff)
            .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingLog) {
            const pct = bd.host_commission_pct || 0;
            // Convert coins to USD first (7500 coins = $1), then take commission %
            const salaryUSD = salaryDiff / 7500;
            const commissionAmount = Math.round((salaryUSD * pct / 100) * 100) / 100;

            updateObj.current_month_commission = (fresh?.current_month_commission || 0) + commissionAmount;
            updateObj.total_commission = (fresh?.total_commission || 0) + commissionAmount;

            await sb.from("bd_commission_logs").insert({
              bd_uuid: member.bd_uuid, member_uuid: member.member_uuid,
              member_type: "host", month,
              source_amount: salaryDiff, commission_pct: pct, amount: commissionAmount,
            });

            const { data: freshBd } = await sb.from("bd_commission_settings")
              .select("current_month_earnings, total_earned").eq("bd_uuid", member.bd_uuid).maybeSingle();
            await sb.from("bd_commission_settings").update({
              current_month_earnings: (freshBd?.current_month_earnings || 0) + commissionAmount,
              total_earned: (freshBd?.total_earned || 0) + commissionAmount,
            }).eq("bd_uuid", member.bd_uuid);

            await sb.from("notifications").insert({
              title: "💰 عمولة مضيف",
              body: `عمولة $${commissionAmount.toFixed(2)} من المضيف ${member.member_name} (${pct}% من ${salaryDiff.toLocaleString()} زيادة)`,
              target: "user", user_uuid: member.bd_uuid,
            });
            commissionUpdates++;
          }
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

    // Cleanup expired cache + release lock
    await sb.from("edge_function_cache").delete().lt("expires_at", new Date().toISOString());
    await sb.from("edge_function_cache").delete().eq("key", "bd_sync_lock");

    return new Response(
      JSON.stringify({
        success: true, month, is_new_month: isNewMonth,
        monthly_resets: monthlyResets, synced_members: synced,
        commission_updates: commissionUpdates, profit_synced: profitSynced,
        info_updates: infoUpdates,
        active_members: members.length, active_bds: bdUuids.length,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("bd-sync error:", error);
    try { await sb.from("edge_function_cache").delete().eq("key", "bd_sync_lock"); } catch {}
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "خطأ داخلي" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
