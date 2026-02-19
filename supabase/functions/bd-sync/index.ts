import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

async function fetchGalaUserInfo(uuid: string) {
  const BASE_URL = Deno.env.get("GALA_API_BASE_URL")!.replace(/\/+$/, "");
  const endpoint = "auth/login/uuid";
  const signPath = "api/newWebsite/" + endpoint;
  const headers = await getGalaHeaders("POST", signPath);
  const url = `${BASE_URL}/${endpoint}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uuid: uuid.trim() }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return null;
    return data.data;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = supabaseAdmin();

  try {
    // Get all active BD members
    const { data: members } = await sb
      .from("bd_members")
      .select("id, member_uuid, member_name, last_daily_charges, member_type, bd_uuid")
      .eq("is_active", true);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ message: "No active members", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get BD commission settings for commission percentages
    const bdUuids = [...new Set(members.map((m: any) => m.bd_uuid))];
    const { data: bdSettings } = await sb
      .from("bd_commission_settings")
      .select("bd_uuid, user_commission_pct, agency_commission_pct, host_commission_pct")
      .in("bd_uuid", bdUuids)
      .eq("is_active", true);

    const bdMap: Record<string, any> = {};
    (bdSettings || []).forEach((b: any) => { bdMap[b.bd_uuid] = b; });

    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    let updated = 0;
    let nameUpdates = 0;
    const commissionLogs: any[] = [];

    // Process members in batches of 5 to avoid rate limits
    for (let i = 0; i < members.length; i += 5) {
      const batch = members.slice(i, i + 5);
      const results = await Promise.all(
        batch.map(async (member: any) => {
          const userData = await fetchGalaUserInfo(member.member_uuid);
          if (!userData) return null;
          return { member, userData };
        })
      );

      for (const result of results) {
        if (!result) continue;
        const { member, userData } = result;
        const levelData = userData.level || {};
        const currentChargerNum = levelData.charger_num || 0;
        const currentName = userData.name || member.member_name;

        // Calculate daily charges diff
        const dailyDiff = currentChargerNum - (member.last_daily_charges || 0);

        // Build update object - always update name
        const updateObj: any = {
          last_daily_charges: currentChargerNum,
          type_user: userData.type_user || 0,
        };

        // Update name if changed
        if (currentName && currentName !== member.member_name) {
          updateObj.member_name = currentName;
          nameUpdates++;
        }

        // Calculate commission if there's new charges
        if (dailyDiff > 0) {
          const bd = bdMap[member.bd_uuid];
          if (bd) {
            let pct = 0;
            if (member.member_type === "supporter") pct = bd.user_commission_pct || 2;
            else if (member.member_type === "agency") pct = bd.agency_commission_pct || 5;

            const commissionAmount = (dailyDiff * pct) / 100;

            updateObj.monthly_charges = (member.monthly_charges || 0) + dailyDiff;
            updateObj.current_month_commission = (member.current_month_commission || 0) + commissionAmount;
            updateObj.total_commission = (member.total_commission || 0) + commissionAmount;

            commissionLogs.push({
              bd_uuid: member.bd_uuid,
              member_uuid: member.member_uuid,
              member_type: member.member_type,
              month,
              source_amount: dailyDiff,
              commission_pct: pct,
              amount: commissionAmount,
            });
          }
        }

        await sb.from("bd_members").update(updateObj).eq("id", member.id);
        updated++;
      }

      // Small delay between batches
      if (i + 5 < members.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Insert commission logs
    if (commissionLogs.length > 0) {
      await sb.from("bd_commission_logs").insert(commissionLogs);

      // Update BD earnings
      const bdEarnings: Record<string, number> = {};
      for (const log of commissionLogs) {
        bdEarnings[log.bd_uuid] = (bdEarnings[log.bd_uuid] || 0) + log.amount;
      }
      for (const [bdUuid, amount] of Object.entries(bdEarnings)) {
        const { data: bd } = await sb
          .from("bd_commission_settings")
          .select("current_month_earnings, total_earned")
          .eq("bd_uuid", bdUuid)
          .maybeSingle();
        if (bd) {
          await sb.from("bd_commission_settings").update({
            current_month_earnings: (bd.current_month_earnings || 0) + amount,
            total_earned: (bd.total_earned || 0) + amount,
          }).eq("bd_uuid", bdUuid);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        name_updates: nameUpdates,
        commissions_logged: commissionLogs.length,
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
