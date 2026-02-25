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

    // Fetch all active BD accounts
    const { data: bds, error: fetchErr } = await sb
      .from("bd_commission_settings")
      .select("id, bd_uuid, bd_name, current_month_earnings, available_balance, total_earned")
      .eq("is_active", true);

    if (fetchErr) throw fetchErr;
    if (!bds || bds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No active BDs found", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const closedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let updated = 0;
    const results: { bd_uuid: string; bd_name: string; added: number }[] = [];

    for (const bd of bds) {
      const monthEarnings = Number(bd.current_month_earnings || 0);
      if (monthEarnings <= 0) continue;

      const newBalance = Number(bd.available_balance || 0) + monthEarnings;

      const { error: updateErr } = await sb
        .from("bd_commission_settings")
        .update({
          available_balance: newBalance,
          current_month_earnings: 0,
        })
        .eq("id", bd.id);

      if (updateErr) {
        console.error(`Failed to update BD ${bd.bd_uuid}:`, updateErr);
        continue;
      }

      // Also reset all members' current_month_commission for this BD
      await sb
        .from("bd_members")
        .update({ current_month_commission: 0 })
        .eq("bd_uuid", bd.bd_uuid)
        .eq("is_active", true);

      results.push({
        bd_uuid: bd.bd_uuid,
        bd_name: bd.bd_name,
        added: monthEarnings,
      });
      updated++;
    }

    console.log(`Monthly reset completed for ${closedMonth}: ${updated} BDs updated`, results);

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
