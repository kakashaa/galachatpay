import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/hmac.ts";

const BD_API_URLS = [
  "https://hola-chat.com/bd-data-api.php",
  "http://18.219.229.240/bd-data-api.php",
];
const BD_API_KEY = "ghala2026actions";
const CACHE_TTL_MS = 5 * 60 * 1000;

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
  if (data && new Date(data.expires_at) > new Date()) return data.value;
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
      if (!res.ok) return null;
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

// ── API: user-info (for name/type updates only) ───────────────
async function fetchUserInfo(sb: ReturnType<typeof supabaseAdmin>, uuid: string) {
  const cacheKey = `user_info_${uuid}`;
  const cached = await getCached(sb, cacheKey);
  if (cached) return cached;

  for (const baseUrl of BD_API_URLS) {
    const url = `${baseUrl}?key=${BD_API_KEY}&action=user-info&uuid=${uuid}`;
    const res = await fetchWithRetry(url, 1);
    if (!res) continue;
    try {
      const text = await res.text();
      if (isPageLoadFailedPayload(text)) continue;
      const data = JSON.parse(text);
      const hasUsableIdentity = Boolean(
        data?.name || data?.type_user || data?.user?.["اسم"] || data?.user?.name
      );
      if (data?.ok === true && hasUsableIdentity) {
        await setCache(sb, cacheKey, data);
      }
      return data;
    } catch { /* continue */ }
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
    } catch { /* continue */ }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = supabaseAdmin();
  await req.json().catch(() => ({}));

  try {
    // === SYNC LOCK ===
    const { data: lockData } = await sb
      .from("edge_function_cache")
      .select("value, expires_at")
      .eq("key", "bd_sync_lock")
      .maybeSingle();

    if (lockData && new Date(lockData.expires_at) > new Date()) {
      return new Response(JSON.stringify({ skipped: true, reason: "sync already running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb.from("edge_function_cache").upsert(
      { key: "bd_sync_lock", value: { running: true }, expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() },
      { onConflict: "key" }
    );

    // Get all active BD members
    const { data: members } = await sb
      .from("bd_members")
      .select("id, member_uuid, member_name, member_type, bd_uuid, type_user")
      .eq("is_active", true);

    if (!members || members.length === 0) {
      await sb.from("edge_function_cache").delete().eq("key", "bd_sync_lock");
      return new Response(JSON.stringify({ message: "No active members", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === SYNC MEMBER INFO (names only) ===
    let infoUpdates = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (member: any) => {
        try {
          const userInfo = await fetchUserInfo(sb, member.member_uuid);
          if (!userInfo) return;

          const extractedName = userInfo?.name || userInfo?.user?.["اسم"] || userInfo?.user?.name || "";
          const extractedType = Number(userInfo?.type_user ?? 0) || member.type_user || 0;

          if (extractedName && extractedName !== member.member_name) {
            await sb.from("bd_members").update({
              member_name: extractedName,
              type_user: extractedType,
            }).eq("id", member.id);
            infoUpdates++;
            console.log(`[INFO] updated name: "${member.member_name}" -> "${extractedName}"`);
          }
        } catch {}
      }));
    }

    // === SYNC BD PROFIT ===
    const bdUuids = [...new Set(members.map((m: any) => m.bd_uuid))];
    let profitSynced = 0;

    for (const bdUuid of bdUuids) {
      try {
        const profitData = await fetchBDProfit(sb, bdUuid);
        if (profitData?.status === "success" && profitData?.profit) {
          const totalProfit = Number(profitData.profit.total_profit) || 0;
          const availableProfit = Number(profitData.profit.available_profit) || 0;
          const pendingProfit = Number(profitData.profit.pending_profit) || 0;

          const { data: current } = await sb.from("bd_commission_settings")
            .select("external_total_profit")
            .eq("bd_uuid", bdUuid).maybeSingle();

          const prevTotal = Number(current?.external_total_profit) || 0;
          const diff = totalProfit - prevTotal;

          await sb.from("bd_commission_settings").update({
            external_total_profit: totalProfit,
            external_available_profit: availableProfit,
            external_pending_profit: pendingProfit,
            external_profit_difference: diff,
            external_profit_status: diff > 0 ? "increase" : diff < 0 ? "decrease" : "no_change",
            external_last_update: new Date().toISOString(),
          }).eq("bd_uuid", bdUuid);

          profitSynced++;
        }
      } catch {}
    }

    // Release lock
    await sb.from("edge_function_cache").delete().eq("key", "bd_sync_lock");

    const result = {
      synced_members: members.length,
      info_updates: infoUpdates,
      profit_synced: profitSynced,
      commission_updates: 0,
      mode: "manual_only",
    };

    console.log(`[SYNC] done:`, JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await sb.from("edge_function_cache").delete().eq("key", "bd_sync_lock").catch(() => {});
    console.error("[SYNC] fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
