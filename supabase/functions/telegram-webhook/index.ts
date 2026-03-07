import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "GET") {
    return new Response("OK", { status: 200 });
  }

  try {
    const update = await req.json();
    console.log("Telegram update:", JSON.stringify(update));

    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data as string;

      // ===== TICKET CLOSE from Telegram =====
      if (data.startsWith("tc:")) {
        const ticketId = data.substring(3);
        const { data: ticket } = await sb
          .from("support_tickets")
          .select("id, status, user_uuid, subject")
          .eq("id", ticketId)
          .maybeSingle();

        if (!ticket) {
          await answerCallback(BOT_TOKEN, cb.id, "❌ التذكرة غير موجودة");
          return ok();
        }
        if (ticket.status === "closed") {
          await answerCallback(BOT_TOKEN, cb.id, "⚠️ التذكرة مغلقة مسبقاً");
          return ok();
        }

        // Delete all replies for this ticket
        await sb.from("ticket_replies").delete().eq("ticket_id", ticketId);

        await sb.from("support_tickets").update({
          status: "closed",
          updated_at: new Date().toISOString(),
        }).eq("id", ticketId);

        await sb.from("notifications").insert({
          user_uuid: ticket.user_uuid,
          title: "✅ تم إغلاق التذكرة",
          body: `تم إنهاء تذكرة "${ticket.subject}". شكراً لتواصلك.`,
          target: "personal",
        });

        // Delete the Telegram message completely
        await deleteMessage(BOT_TOKEN, cb.message.chat.id, cb.message.message_id);

        await answerCallback(BOT_TOKEN, cb.id, "✅ تم إغلاق التذكرة بنجاح");
        return ok();
      }

      // ===== BD WITHDRAWAL approve/reject =====
      if (data.startsWith("bwa:") || data.startsWith("bwr:")) {
        const isApprove = data.startsWith("bwa:");
        const withdrawalId = data.substring(4);

        const { data: withdrawal } = await sb
          .from("bd_withdrawals")
          .select("id, status, bd_name, bd_uuid, amount, recipient_name")
          .eq("id", withdrawalId)
          .maybeSingle();

        if (!withdrawal) {
          await answerCallback(BOT_TOKEN, cb.id, "❌ الطلب غير موجود");
          return ok();
        }
        if (withdrawal.status !== "pending") {
          await answerCallback(BOT_TOKEN, cb.id, `⚠️ تمت معالجته (${withdrawal.status})`);
          return ok();
        }

        const bdUuid = withdrawal.bd_uuid;
        const amount = withdrawal.amount;
        const targetUuid = withdrawal.recipient_name;
        const coins = Math.floor(amount * 8500);

        if (isApprove) {
          await sb.from("bd_withdrawals").update({
            status: "completed",
            approved_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          }).eq("id", withdrawalId);

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
                body: JSON.stringify({ type: "send_coins", target_uuid: targetUuid, amount: coins }),
              });
            }
          } catch (e) {
            console.error("Auto-send coins error:", e);
          }

          await sb.from("notifications").insert({
            user_uuid: bdUuid,
            title: "✅ تم قبول طلب السحب",
            body: `تم قبول طلبك وإرسال ${coins.toLocaleString()} كوينز بنجاح`,
            target: "personal",
          });

          await editMessage(BOT_TOKEN, cb.message.chat.id, cb.message.message_id,
            cb.message.text + "\n\n✅ <b>تم القبول</b> ✅");
          await answerCallback(BOT_TOKEN, cb.id, "✅ تم قبول الطلب وإرسال الكوينز");
        } else {
          await sb.from("bd_withdrawals").update({
            status: "rejected",
            rejected_at: new Date().toISOString(),
          }).eq("id", withdrawalId);

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

          await sb.from("notifications").insert({
            user_uuid: bdUuid,
            title: "❌ تم رفض طلب السحب",
            body: `تم رفض طلب السحب ($${amount}). تم إرجاع المبلغ.`,
            target: "personal",
          });

          await editMessage(BOT_TOKEN, cb.message.chat.id, cb.message.message_id,
            cb.message.text + "\n\n❌ <b>تم الرفض</b> ❌");
          await answerCallback(BOT_TOKEN, cb.id, "❌ تم رفض الطلب وإرجاع الرصيد");
        }
        return ok();
      }

      if (data.startsWith("bd_w_approve:") || data.startsWith("bd_w_reject:")) {
        await answerCallback(BOT_TOKEN, cb.id, "⚠️ صيغة قديمة");
        return ok();
      }

      await answerCallback(BOT_TOKEN, cb.id, "⚠️ إجراء غير معروف");
      return ok();
    }

    // ===== HANDLE TEXT REPLIES to ticket messages =====
    if (update.message?.reply_to_message && update.message?.text) {
      const replyToMsgId = update.message.reply_to_message.message_id;
      const chatId = update.message.chat.id;
      const adminText = update.message.text;
      const adminName = update.message.from?.first_name || "الإدارة";

      // Look up the ticket from cache
      const { data: cached } = await sb
        .from("edge_function_cache")
        .select("value")
        .eq("key", `tg_msg_ticket:${replyToMsgId}:${chatId}`)
        .maybeSingle();

      if (cached?.value) {
        const { ticket_id, user_uuid, subject } = cached.value as any;

        // Check ticket exists and not closed
        const { data: ticket } = await sb
          .from("support_tickets")
          .select("id, status")
          .eq("id", ticket_id)
          .maybeSingle();

        if (!ticket) {
          await sendMessage(BOT_TOKEN, chatId, "❌ التذكرة غير موجودة", update.message.message_id);
          return ok();
        }
        if (ticket.status === "closed") {
          await sendMessage(BOT_TOKEN, chatId, "⚠️ التذكرة مغلقة مسبقاً", update.message.message_id);
          return ok();
        }

        // Save reply
        await sb.from("ticket_replies").insert({
          ticket_id,
          sender_type: "admin",
          sender_name: `${adminName} (تلجرام)`,
          message: adminText,
        });

        // Update ticket status
        await sb.from("support_tickets").update({
          status: "replied",
          admin_reply: adminText,
          admin_username: `${adminName} (تلجرام)`,
          replied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", ticket_id);

        // Notify user
        await sb.from("notifications").insert({
          user_uuid,
          title: "💬 رد على تذكرتك",
          body: `تم الرد على تذكرة "${subject}" من فريق الدعم.`,
          target: "personal",
        });

        // Confirm to admin
        await sendMessage(BOT_TOKEN, chatId, `✅ تم إرسال ردك على تذكرة "${subject}"`, update.message.message_id);
        return ok();
      }
    }

    return ok();
  } catch (error) {
    console.error("Webhook error:", error);
    return ok();
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

async function sendMessage(token: string, chatId: number, text: string, replyToId?: number) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(replyToId ? { reply_to_message_id: replyToId } : {}),
    }),
  });
}
