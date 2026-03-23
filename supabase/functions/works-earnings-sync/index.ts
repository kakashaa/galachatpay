import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WARES_API = "https://hola-chat.com/wares-api.php?key=ghala2026actions";

const toNumber = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

async function syncOneAccount(supabase: any, account: any) {
  const { data: members } = await supabase
    .from("works_members")
    .select("*")
    .eq("works_id", account.id)
    .eq("status", "active");

  if (!members || members.length === 0) {
    await supabase.from("works_accounts").update({
      last_earnings_sync_at: new Date().toISOString(),
    }).eq("id", account.id);
    return 0;
  }

  const supporterPct = toNumber(account.supporter_commission_pct || 2);
  const agentPct = toNumber(account.agent_commission_pct || 5);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayDate = now.toISOString().slice(0, 10);

  let totalEarningsUsd = 0;

  // Process members ONE BY ONE to avoid overwhelming the API
  for (const m of members) {
    const memberType = String(m.member_type || "").toLowerCase() === "agency" ? "agent" : String(m.member_type || "").toLowerCase();
    let commissionUsd = 0;
    let memberActivityUsd = 0;
    let source = memberType;

    try {
      if (memberType === "supporter") {
        const res = await fetch(`${WARES_API}&action=user-monthly-charges&uuid=${m.member_uuid}&month=${currentMonth}`, {
          signal: AbortSignal.timeout(45000),
        });
        const json = await res.json();
        const charges = toNumber(json?.data?.total_charges ?? json?.data?.charges ?? json?.total_charges ?? json?.charges ?? 0);
        const pct = toNumber(m.commission_pct ?? supporterPct);
        memberActivityUsd = charges / 7500;
        commissionUsd = memberActivityUsd * (pct / 100);
      } else if (memberType === "agent" && m.agency_id) {
        const res = await fetch(`${WARES_API}&action=agency-salary&uuid=${m.member_uuid}&agency_id=${m.agency_id}`, {
          signal: AbortSignal.timeout(45000),
        });
        const json = await res.json();
        const salary = toNumber(
          json?.data?.agency_salary ?? json?.data?.net_salary ?? json?.data?.salary ??
          json?.data?.total_user_salary ?? json?.net_salary ?? json?.salary ?? 0
        );
        const pct = toNumber(m.commission_pct ?? agentPct);
        memberActivityUsd = salary;
        commissionUsd = salary * (pct / 100);
      }
    } catch (e) {
      console.error(`[works-sync] Failed for member ${m.member_uuid}:`, e);
      // Skip this member on error
      continue;
    }

    totalEarningsUsd += commissionUsd;

    // Save earnings history row
    if (commissionUsd > 0) {
      await supabase.from("works_earnings").upsert({
        works_id: account.id,
        member_id: m.id,
        member_uuid: m.member_uuid,
        period_date: todayDate,
        member_activity_usd: Math.round(memberActivityUsd * 100) / 100,
        commission_pct: toNumber(m.commission_pct ?? (memberType === "supporter" ? supporterPct : agentPct)),
        commission_usd: Math.round(commissionUsd * 100) / 100,
        source,
      }, {
        onConflict: "works_id,member_uuid,period_date",
        ignoreDuplicates: false,
      }).then(({ error }) => {
        if (error) {
          // Fallback: insert without upsert
          supabase.from("works_earnings").insert({
            works_id: account.id,
            member_id: m.id,
            member_uuid: m.member_uuid,
            period_date: todayDate,
            member_activity_usd: Math.round(memberActivityUsd * 100) / 100,
            commission_pct: toNumber(m.commission_pct ?? (memberType === "supporter" ? supporterPct : agentPct)),
            commission_usd: Math.round(commissionUsd * 100) / 100,
            source,
          });
        }
      });
    }

    // Small delay between members to avoid hammering the API
    await new Promise(r => setTimeout(r, 500));
  }

  const finalEarnings = Math.round(totalEarningsUsd * 100) / 100;

  // Only update earnings if we actually got data; otherwise just update sync timestamp
  const updatePayload: any = {
    last_earnings_sync_at: new Date().toISOString(),
  };
  if (finalEarnings > 0) {
    updatePayload.total_earnings_usd = finalEarnings;
  }
  await supabase.from("works_accounts").update(updatePayload).eq("id", account.id);

  return finalEarnings;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const singleAccountId = body?.account_id;

    if (singleAccountId) {
      // Manual refresh: single account
      const { data: account, error } = await supabase
        .from("works_accounts")
        .select("*")
        .eq("id", singleAccountId)
        .single();
      if (error || !account) throw new Error("Account not found");

      const earnings = await syncOneAccount(supabase, account);
      return new Response(JSON.stringify({ success: true, earnings, synced_at: new Date().toISOString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full cron: all active accounts sequentially
    const { data: accounts, error } = await supabase
      .from("works_accounts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log(`[works-sync] Starting sync for ${accounts?.length || 0} accounts`);
    const results: any[] = [];

    for (const account of (accounts || [])) {
      try {
        const earnings = await syncOneAccount(supabase, account);
        results.push({ id: account.id, code: account.works_code, earnings, ok: true });
        console.log(`[works-sync] ✅ ${account.works_code}: $${earnings}`);
      } catch (e) {
        results.push({ id: account.id, code: account.works_code, error: e.message, ok: false });
        console.error(`[works-sync] ❌ ${account.works_code}:`, e);
      }
      // 2 second delay between accounts
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`[works-sync] Done. ${results.filter(r => r.ok).length}/${results.length} succeeded`);

    return new Response(JSON.stringify({ success: true, synced: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[works-sync] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
