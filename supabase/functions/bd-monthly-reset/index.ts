import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all active works accounts
    const { data: accounts, error: fetchErr } = await sb
      .from("works_accounts")
      .select("id, user_uuid, user_name, balance_usd, total_earnings_usd")
      .eq("status", "active");

    if (fetchErr) throw fetchErr;
    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No active accounts found", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const closedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let updated = 0;
    const results: { user_uuid: string; user_name: string; added: number }[] = [];

    // For works system, monthly earnings are tracked in works_earnings table
    // Reset is handled differently - we just log the month closure
    for (const acc of accounts) {
      // Calculate this month's earnings from works_earnings
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: earnings } = await sb
        .from("works_earnings")
        .select("commission_usd")
        .eq("works_id", acc.id)
        .gte("period_date", monthStart);

      const monthEarnings = (earnings || []).reduce(
        (sum: number, r: any) => sum + Number(r.commission_usd || 0), 0
      );

      if (monthEarnings <= 0) continue;

      // Add month earnings to available balance
      const newBalance = Number(acc.balance_usd || 0) + monthEarnings;

      const { error: updateErr } = await sb
        .from("works_accounts")
        .update({ balance_usd: newBalance })
        .eq("id", acc.id);

      if (updateErr) {
        console.error(`Failed to update account ${acc.user_uuid}:`, updateErr);
        continue;
      }

      results.push({
        user_uuid: acc.user_uuid,
        user_name: acc.user_name,
        added: monthEarnings,
      });
      updated++;
    }

    console.log(`Monthly reset completed for ${closedMonth}: ${updated} accounts updated`, results);

    return new Response(
      JSON.stringify({
        ok: true,
        month: closedMonth,
        updated,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Monthly reset error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});