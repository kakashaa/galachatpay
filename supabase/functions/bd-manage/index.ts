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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      // Get BD info with members and commissions
      case "get_bd_info": {
        const { bd_uuid } = params;
        if (!bd_uuid) throw new Error("bd_uuid required");

        // First try direct lookup
        let { data: settingsData } = await supabase.from("bd_commission_settings").select("*").eq("bd_uuid", bd_uuid).single();

        // If not found, check if user changed their ID and find old BD uuid
        let resolvedUuid = bd_uuid;
        if (!settingsData) {
          // Look through id_changes chain to find the original BD uuid
          let currentUuid = bd_uuid;
          for (let i = 0; i < 10; i++) {
            const { data: change } = await supabase
              .from("id_changes")
              .select("user_uuid")
              .eq("new_id", currentUuid)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            if (!change) break;
            const { data: found } = await supabase
              .from("bd_commission_settings")
              .select("*")
              .eq("bd_uuid", change.user_uuid)
              .single();
            if (found) {
              settingsData = found;
              resolvedUuid = change.user_uuid;
              // Migrate BD uuid to new one
              await Promise.all([
                supabase.from("bd_commission_settings").update({ bd_uuid: bd_uuid }).eq("bd_uuid", resolvedUuid),
                supabase.from("bd_members").update({ bd_uuid: bd_uuid }).eq("bd_uuid", resolvedUuid),
                supabase.from("bd_commission_logs").update({ bd_uuid: bd_uuid }).eq("bd_uuid", resolvedUuid),
                supabase.from("bd_events").update({ bd_uuid: bd_uuid }).eq("bd_uuid", resolvedUuid),
              ]);
              // Update the settings data with new uuid
              settingsData.bd_uuid = bd_uuid;
              break;
            }
            currentUuid = change.user_uuid;
          }
        }

        if (!settingsData) {
          return json({ success: false, error: "BD not found" });
        }

        const lookupUuid = settingsData.bd_uuid;
        const [membersRes, logsRes] = await Promise.all([
          supabase.from("bd_members").select("*").eq("bd_uuid", lookupUuid).order("created_at", { ascending: false }),
          supabase.from("bd_commission_logs").select("*").eq("bd_uuid", lookupUuid).order("created_at", { ascending: false }).limit(100),
        ]);

        const members = membersRes.data || [];
        const logs = logsRes.data || [];

        const agencies = members.filter(m => m.member_type === "agency");
        const hosts = members.filter(m => m.member_type === "host");
        const users = members.filter(m => m.member_type === "user");

        const agencyTotal = agencies.reduce((s, m) => s + Number(m.total_commission), 0);
        const hostTotal = hosts.reduce((s, m) => s + Number(m.total_commission), 0);
        const userTotal = users.reduce((s, m) => s + Number(m.total_commission), 0);

        return json({
          success: true,
          data: {
            settings: settingsData,
            agencies,
            hosts,
            users,
            totals: { agency: agencyTotal, host: hostTotal, user: userTotal },
            logs,
          },
        });
      }

      // Register member via referral
      case "register_referral": {
        const { referral_code, member_uuid } = params;
        if (!referral_code || !member_uuid) throw new Error("referral_code and member_uuid required");
        if (!/^\d+$/.test(member_uuid)) return json({ success: false, error: "الآيدي يجب أن يكون أرقام فقط" });

        // Find BD by referral code
        const { data: bdSettings } = await supabase
          .from("bd_commission_settings")
          .select("*")
          .eq("referral_code", referral_code)
          .eq("is_approved", true)
          .single();

        if (!bdSettings) return json({ success: false, error: "رمز الدعوة غير صالح" });
        if (bdSettings.bd_uuid === member_uuid) return json({ success: false, error: "لا يمكنك تسجيل نفسك" });

        // Check if already registered
        const { data: existing } = await supabase
          .from("bd_members")
          .select("id")
          .eq("member_uuid", member_uuid)
          .single();

        if (existing) return json({ success: false, error: "هذا الحساب مسجل بالفعل لدى BD آخر" });

        // Get user type from external API
        let memberName = "";
        let typeUser = 0;
        let memberType = "user";

        try {
          const GALA_API_BASE_URL = Deno.env.get("GALA_API_BASE_URL");
          const GALA_API_KEY = Deno.env.get("GALA_API_KEY");
          const GALA_API_SECRET = Deno.env.get("GALA_API_SECRET");

          if (GALA_API_BASE_URL && GALA_API_KEY && GALA_API_SECRET) {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const nonce = crypto.randomUUID();
            const path = "api/newWebsite/getUserInfo";
            const message = `GET${path}${timestamp}${nonce}`;

            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey("raw", encoder.encode(GALA_API_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
            const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
            const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

            const url = `${GALA_API_BASE_URL}/${path}?uuid=${member_uuid}`;
            const apiRes = await fetch(url, {
              method: "GET",
              headers: {
                "X-API-KEY": GALA_API_KEY,
                "X-SIGNATURE": signature,
                "X-TIMESTAMP": timestamp,
                "X-NONCE": nonce,
                Accept: "application/json",
              },
            });

            if (apiRes.ok) {
              const apiData = await apiRes.json();
              if (apiData?.data) {
                memberName = apiData.data.name || apiData.data.nickname || "";
                typeUser = Number(apiData.data.type_user || 0);
                // type_user: 0=user, 1=host, 2=agent_hosts, 3=agent_charge, 4=agent_both, 5=agent_charge_host, 6=all
                if (typeUser >= 2) memberType = "agency";
                else if (typeUser === 1) memberType = "host";
                else memberType = "user";
              }
            }
          }
        } catch (e) {
          console.error("Failed to get user info:", e);
        }

        // Insert member
        const { error: insertErr } = await supabase.from("bd_members").insert({
          bd_uuid: bdSettings.bd_uuid,
          member_uuid,
          member_name: memberName || member_uuid,
          member_type: memberType,
          type_user: typeUser,
        });

        if (insertErr) throw insertErr;

        return json({
          success: true,
          data: { member_name: memberName, member_type: memberType, type_user: typeUser, bd_name: bdSettings.bd_name },
        });
      }

      // Admin: list all BDs with settings
      case "list_all_bds": {
        const { data } = await supabase
          .from("bd_commission_settings")
          .select("*")
          .order("created_at", { ascending: false });

        // Get member counts for each BD
        const bds = data || [];
        const enriched = await Promise.all(
          bds.map(async (bd) => {
            const { count: agencyCount } = await supabase.from("bd_members").select("id", { count: "exact", head: true }).eq("bd_uuid", bd.bd_uuid).eq("member_type", "agency");
            const { count: hostCount } = await supabase.from("bd_members").select("id", { count: "exact", head: true }).eq("bd_uuid", bd.bd_uuid).eq("member_type", "host");
            const { count: userCount } = await supabase.from("bd_members").select("id", { count: "exact", head: true }).eq("bd_uuid", bd.bd_uuid).eq("member_type", "user");
            return { ...bd, agency_count: agencyCount || 0, host_count: hostCount || 0, user_count: userCount || 0 };
          })
        );

        return json({ success: true, data: enriched });
      }

      // Admin: update BD commission settings
      case "update_bd_settings": {
        const { bd_uuid, agency_commission_pct, host_commission_pct, user_commission_pct, available_balance, total_earned } = params;
        if (!bd_uuid) throw new Error("bd_uuid required");

        const updates: any = { updated_at: new Date().toISOString() };
        if (agency_commission_pct !== undefined) updates.agency_commission_pct = agency_commission_pct;
        if (host_commission_pct !== undefined) updates.host_commission_pct = host_commission_pct;
        if (user_commission_pct !== undefined) updates.user_commission_pct = user_commission_pct;
        if (available_balance !== undefined) updates.available_balance = available_balance;
        if (total_earned !== undefined) updates.total_earned = total_earned;

        const { error } = await supabase
          .from("bd_commission_settings")
          .update(updates)
          .eq("bd_uuid", bd_uuid);

        if (error) throw error;
        return json({ success: true });
      }

      // Public: get BD info by referral code (no sensitive data)
      case "get_bd_public_info": {
        const { referral_code } = params;
        if (!referral_code) throw new Error("referral_code required");

        const { data: bdSettings } = await supabase
          .from("bd_commission_settings")
          .select("bd_name, bd_uuid, referral_code")
          .eq("referral_code", referral_code)
          .eq("is_approved", true)
          .single();

        if (!bdSettings) return json({ success: false, error: "رمز الدعوة غير صالح" });

        const { data: members } = await supabase
          .from("bd_members")
          .select("member_name, member_type, type_user, created_at")
          .eq("bd_uuid", bdSettings.bd_uuid)
          .order("created_at", { ascending: false });

        const allMembers = members || [];
        const agencies = allMembers.filter(m => m.member_type === "agency");
        const hosts = allMembers.filter(m => m.member_type === "host");
        const users = allMembers.filter(m => m.member_type === "user");

        return json({
          success: true,
          data: {
            bd_name: bdSettings.bd_name,
            total_members: allMembers.length,
            agencies_count: agencies.length,
            hosts_count: hosts.length,
            users_count: users.length,
            members: allMembers.map(m => ({
              name: m.member_name,
              type: m.member_type,
              type_user: m.type_user,
              joined: m.created_at,
            })),
          },
        });
      }

      default:
        return json({ success: false, error: "Unknown action" }, 400);
    }
  } catch (err) {
    return json({ success: false, error: (err as Error).message || "Unknown error" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
