import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BD_API_URL = "https://hola-chat.com/bd-data-api.php";
const BD_API_KEY = "ghala2026actions";

serve(async (req) => {
  // Allow GET for webhook setup verification
  if (req.method === "GET") {
    return new Response("OK", { status: 200 });
  }

  try {
    const update = await req.json();
    console.log("Telegram update:", JSON.stringify(update));

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data as string;
      const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Parse callback data
      if (data.startsWith("bd_w_approve:")) {
        // Format: bd_w_approve:withdrawalId:targetUuid:coins:bdUuid
        const parts = data.split(":");
        const withdrawalId = parts[1];
        const targetUuid = parts[2];
        const coins = parseInt(parts[3]);
        const bdUuid = parts[4];

        // Check if already processed
        const { data: withdrawal } = await sb
          .from("bd_withdrawals")
          .select("id, status, bd_name, amount")
          .eq("id", withdrawalId)
          .maybeSingle();

        if (!withdrawal) {
          await answerCallback(BOT_TOKEN, cb.id, "❌ الطلب غير موجود");
          return ok();
        }

        if (withdrawal.status !== "pending") {
          await answerCallback(BOT_TOKEN, cb.id, `⚠️ الطلب تمت معالجته مسبقاً (${withdrawal.status})`);
          return ok();
        }

        // Update status to completed
        await sb.from("bd_withdrawals").update({
          status: "completed",
          approved_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }).eq("id", withdrawalId);

        // Send coins via gala-actions
        try {
          const ACTIONS_URL = Deno.env.get("GALA_ACTIONS_URL");
          const ACTIONS_KEY = Deno.env.get("GALA_ACTIONS_KEY");
          if (ACTIONS_URL && ACTIONS_KEY) {
            const targetUrl = new URL(ACTIONS_URL);
            targetUrl.searchParams.set("key", ACTIONS_KEY);
            targetUrl.searchParams.set("action", "submit-request");
            await fetch(targetUrl.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "send_coins",
                target_uuid: targetUuid,
                amount: coins,
              }),
            });
          }
        } catch (e) {
          console.error("Auto-send coins error:", e);
        }

        // Notify BD user
        await sb.from("notifications").insert({
          user_uuid: bdUuid,
          title: "✅ تم قبول طلب السحب",
          body: `تم قبول طلبك وإرسال ${coins.toLocaleString()} كوينز بنجاح`,
          target: "personal",
        });

        // Update the Telegram message to show it's been approved
        await editMessage(BOT_TOKEN, cb.message.chat.id, cb.message.message_id,
          cb.message.text + "\n\n✅ <b>تم القبول</b> ✅");

        await answerCallback(BOT_TOKEN, cb.id, "✅ تم قبول الطلب وإرسال الكوينز");
        return ok();
      }

      if (data.startsWith("bd_w_reject:")) {
        // Format: bd_w_reject:withdrawalId:bdUuid:amount
        const parts = data.split(":");
        const withdrawalId = parts[1];
        const bdUuid = parts[2];
        const amount = parseFloat(parts[3]);

        // Check if already processed
        const { data: withdrawal } = await sb
          .from("bd_withdrawals")
          .select("id, status")
          .eq("id", withdrawalId)
          .maybeSingle();

        if (!withdrawal) {
          await answerCallback(BOT_TOKEN, cb.id, "❌ الطلب غير موجود");
          return ok();
        }

        if (withdrawal.status !== "pending") {
          await answerCallback(BOT_TOKEN, cb.id, `⚠️ الطلب تمت معالجته مسبقاً (${withdrawal.status})`);
          return ok();
        }

        // Update status to rejected
        await sb.from("bd_withdrawals").update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
        }).eq("id", withdrawalId);

        // Refund balance back to BD
        if (amount > 0) {
          const { data: bd } = await sb
            .from("bd_commission_settings")
            .select("available_balance")
            .eq("bd_uuid", bdUuid)
            .maybeSingle();

          if (bd) {
            await sb.from("bd_commission_settings")
              .update({ available_balance: (bd.available_balance || 0) + amount })
              .eq("bd_uuid", bdUuid);
          }
        }

        // Notify BD user
        await sb.from("notifications").insert({
          user_uuid: bdUuid,
          title: "❌ تم رفض طلب السحب",
          body: `تم رفض طلب السحب الخاص بك ($${amount}). تم إرجاع المبلغ إلى رصيدك المتاح.`,
          target: "personal",
        });

        // Update the Telegram message
        await editMessage(BOT_TOKEN, cb.message.chat.id, cb.message.message_id,
          cb.message.text + "\n\n❌ <b>تم الرفض</b> ❌");

        await answerCallback(BOT_TOKEN, cb.id, "❌ تم رفض الطلب وإرجاع الرصيد");
        return ok();
      }

      // Unknown callback
      await answerCallback(BOT_TOKEN, cb.id, "⚠️ إجراء غير معروف");
      return ok();
    }

    return ok();
  } catch (error) {
    console.error("Webhook error:", error);
    return ok(); // Always return 200 to Telegram
  }
});

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function answerCallback(token: string, callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: true }),
  });
}

async function editMessage(token: string, chatId: number, messageId: number, newText: string) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: "HTML",
    }),
  });
}
