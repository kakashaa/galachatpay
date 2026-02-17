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

        let { data: settingsData } = await supabase.from("bd_commission_settings").select("*").eq("bd_uuid", bd_uuid).single();

        let resolvedUuid = bd_uuid;
        if (!settingsData) {
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
              await Promise.all([
                supabase.from("bd_commission_settings").update({ bd_uuid: bd_uuid }).eq("bd_uuid", resolvedUuid),
                supabase.from("bd_members").update({ bd_uuid: bd_uuid }).eq("bd_uuid", resolvedUuid),
                supabase.from("bd_commission_logs").update({ bd_uuid: bd_uuid }).eq("bd_uuid", resolvedUuid),
                supabase.from("bd_events").update({ bd_uuid: bd_uuid }).eq("bd_uuid", resolvedUuid),
              ]);
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
        const [membersRes, logsRes, withdrawalsRes] = await Promise.all([
          supabase.from("bd_members").select("*").eq("bd_uuid", lookupUuid).order("created_at", { ascending: false }),
          supabase.from("bd_commission_logs").select("*").eq("bd_uuid", lookupUuid).order("created_at", { ascending: false }).limit(100),
          supabase.from("bd_withdrawals").select("*").eq("bd_uuid", lookupUuid).order("created_at", { ascending: false }),
        ]);

        const members = membersRes.data || [];
        const logs = logsRes.data || [];
        const withdrawals = withdrawalsRes.data || [];

        const agencies = members.filter(m => m.member_type === "agency");
        const hosts = members.filter(m => m.member_type === "host");
        const users = members.filter(m => m.member_type === "user");
        const supporters = members.filter(m => m.member_type === "supporter");

        const agencyTotal = agencies.reduce((s, m) => s + Number(m.total_commission), 0);
        const hostTotal = hosts.reduce((s, m) => s + Number(m.total_commission), 0);
        const userTotal = users.reduce((s, m) => s + Number(m.total_commission), 0);
        const supporterTotal = supporters.reduce((s, m) => s + Number(m.total_commission), 0);

        return json({
          success: true,
          data: {
            settings: settingsData,
            agencies,
            hosts,
            users,
            supporters,
            totals: { agency: agencyTotal, host: hostTotal, user: userTotal, supporter: supporterTotal },
            logs,
            withdrawals,
          },
        });
      }

      // Register member via referral
      case "register_referral": {
        const { referral_code, member_uuid } = params;
        if (!referral_code || !member_uuid) throw new Error("referral_code and member_uuid required");
        if (!/^\d+$/.test(member_uuid)) return json({ success: false, error: "الآيدي يجب أن يكون أرقام فقط" });

        const { data: bdSettings } = await supabase
          .from("bd_commission_settings")
          .select("*")
          .eq("referral_code", referral_code)
          .eq("is_approved", true)
          .single();

        if (!bdSettings) return json({ success: false, error: "رمز الدعوة غير صالح" });
        if (bdSettings.bd_uuid === member_uuid) return json({ success: false, error: "لا يمكنك تسجيل نفسك" });

        const { data: existing } = await supabase
          .from("bd_members")
          .select("id")
          .eq("member_uuid", member_uuid)
          .single();

        if (existing) return json({ success: false, error: "هذا الحساب مسجل بالفعل لدى BD آخر" });

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
                if (typeUser >= 2) memberType = "agency";
                else if (typeUser === 1) memberType = "host";
                else memberType = "user";
              }
            }
          }
        } catch (e) {
          console.error("Failed to get user info:", e);
        }

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

        const bds = data || [];
        const enriched = await Promise.all(
          bds.map(async (bd) => {
            const { data: members } = await supabase.from("bd_members").select("*").eq("bd_uuid", bd.bd_uuid).order("created_at", { ascending: false });
            const allMembers = members || [];
            const agencies = allMembers.filter(m => m.member_type === "agency");
            const hosts = allMembers.filter(m => m.member_type === "host");
            const users = allMembers.filter(m => m.member_type === "user");
            const supporters = allMembers.filter(m => m.member_type === "supporter");
            return {
              ...bd,
              agency_count: agencies.length,
              host_count: hosts.length,
              user_count: users.length,
              supporter_count: supporters.length,
              agencies,
              supporters,
              totals: {
                agency: agencies.reduce((s, m) => s + Number(m.total_commission), 0),
                user: users.reduce((s, m) => s + Number(m.total_commission), 0),
              },
            };
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

      // BD: Request withdrawal
      case "request_withdrawal": {
        const { bd_uuid, amount } = params;
        if (!bd_uuid) throw new Error("bd_uuid required");
        const numAmount = Number(amount);
        if (!numAmount || numAmount < 60) return json({ success: false, error: "الحد الأدنى للسحب 60 دولار" });

        // Check BD exists and has enough balance
        const { data: bdSettings } = await supabase
          .from("bd_commission_settings")
          .select("*")
          .eq("bd_uuid", bd_uuid)
          .single();

        if (!bdSettings) return json({ success: false, error: "حساب BD غير موجود" });
        if (Number(bdSettings.available_balance) < numAmount) return json({ success: false, error: "الرصيد المتاح غير كافٍ" });

        // Check no pending withdrawal
        const { data: pendingW } = await supabase
          .from("bd_withdrawals")
          .select("id")
          .eq("bd_uuid", bd_uuid)
          .in("status", ["pending", "approved"])
          .limit(1);

        if (pendingW && pendingW.length > 0) return json({ success: false, error: "لديك طلب سحب قيد المعالجة بالفعل" });

        // Create withdrawal & deduct balance
        const { error: wErr } = await supabase.from("bd_withdrawals").insert({
          bd_uuid,
          bd_name: bdSettings.bd_name,
          amount: numAmount,
          status: "pending",
        });
        if (wErr) throw wErr;

        // Deduct from available balance
        const newBalance = Number(bdSettings.available_balance) - numAmount;
        await supabase.from("bd_commission_settings").update({
          available_balance: newBalance,
          updated_at: new Date().toISOString(),
        }).eq("bd_uuid", bd_uuid);

        return json({ success: true });
      }

      // Admin: approve withdrawal → moves directly to "info_submitted" (بانتظار التحويل)
      case "approve_withdrawal": {
        const { withdrawal_id } = params;
        if (!withdrawal_id) throw new Error("withdrawal_id required");

        const { error } = await supabase.from("bd_withdrawals").update({
          status: "info_submitted",
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", withdrawal_id);

        if (error) throw error;

        // Get withdrawal to notify BD
        const { data: w } = await supabase.from("bd_withdrawals").select("*").eq("id", withdrawal_id).single();
        if (w) {
          await supabase.from("notifications").insert({
            user_uuid: w.bd_uuid,
            title: "✅ تمت الموافقة على طلب السحب",
            body: `تمت الموافقة على طلب السحب، يرجى انتظار التحويل.`,
            target: "personal",
          });
        }

        return json({ success: true });
      }

      // Admin: reject withdrawal
      case "reject_withdrawal": {
        const { withdrawal_id, admin_note } = params;
        if (!withdrawal_id) throw new Error("withdrawal_id required");

        const { data: w } = await supabase.from("bd_withdrawals").select("*").eq("id", withdrawal_id).single();
        if (!w) return json({ success: false, error: "الطلب غير موجود" });

        // Return balance
        const { data: bdSettings } = await supabase.from("bd_commission_settings").select("available_balance").eq("bd_uuid", w.bd_uuid).single();
        if (bdSettings) {
          await supabase.from("bd_commission_settings").update({
            available_balance: Number(bdSettings.available_balance) + Number(w.amount),
            updated_at: new Date().toISOString(),
          }).eq("bd_uuid", w.bd_uuid);
        }

        await supabase.from("bd_withdrawals").update({
          status: "rejected",
          admin_note: admin_note || null,
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", withdrawal_id);

        await supabase.from("notifications").insert({
          user_uuid: w.bd_uuid,
          title: "❌ تم رفض طلب السحب",
          body: `تم رفض طلب سحب $${Number(w.amount).toFixed(2)}.${admin_note ? " السبب: " + admin_note : ""}`,
          target: "personal",
        });

        return json({ success: true });
      }

      // BD: submit recipient info after approval
      case "submit_recipient_info": {
        const { withdrawal_id, recipient_name, recipient_phone, transfer_type, country } = params;
        if (!withdrawal_id || !recipient_name || !recipient_phone || !transfer_type || !country) {
          return json({ success: false, error: "جميع الحقول مطلوبة" });
        }

        const { error } = await supabase.from("bd_withdrawals").update({
          recipient_name,
          recipient_phone,
          transfer_type,
          country,
          status: "info_submitted",
          updated_at: new Date().toISOString(),
        }).eq("id", withdrawal_id).eq("status", "approved");

        if (error) throw error;
        return json({ success: true });
      }

      // Admin: complete transfer (add transfer number and receipt)
      case "complete_transfer": {
        const { withdrawal_id, transfer_number, receipt_url } = params;
        if (!withdrawal_id || !transfer_number) throw new Error("withdrawal_id and transfer_number required");

        const { error } = await supabase.from("bd_withdrawals").update({
          status: "completed",
          transfer_number,
          receipt_url: receipt_url || null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", withdrawal_id);

        if (error) throw error;

        // Notify BD with receipt info
        const { data: w } = await supabase.from("bd_withdrawals").select("*").eq("id", withdrawal_id).single();
        if (w) {
          const receiptInfo = w.receipt_url ? `\n📎 إيصال الشحن: ${w.receipt_url}` : "";
          await supabase.from("notifications").insert({
            user_uuid: w.bd_uuid,
            title: "💰 تم تحويل أرباحك",
            body: `تم تحويل $${Number(w.amount).toFixed(2)} بنجاح. طلبك مكتمل وتم التحويل.${receiptInfo}`,
            target: "personal",
          });
        }

        return json({ success: true });
      }

      // Admin: list all BD withdrawals
      case "list_bd_withdrawals": {
        const { data } = await supabase
          .from("bd_withdrawals")
          .select("*")
          .order("created_at", { ascending: false });

        return json({ success: true, data: data || [] });
      }

      // Public: get BD info by referral code
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

      // Admin: delete (deactivate) a BD
      case "delete_bd": {
        const { bd_uuid } = params;
        if (!bd_uuid) throw new Error("bd_uuid required");

        const { error } = await supabase
          .from("bd_commission_settings")
          .update({ is_approved: false, updated_at: new Date().toISOString() })
          .eq("bd_uuid", bd_uuid);

        if (error) throw error;

        // Notify the BD
        await supabase.from("notifications").insert({
          user_uuid: bd_uuid,
          title: "⛔ تم إلغاء حسابك كبيدي",
          body: "تم حذفك كبيدي من قبل الإدارة. تواصل مع الإدارة لمعرفة السبب.",
          target: "personal",
        });

        return json({ success: true });
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
