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
        const chatId = cb.message.chat.id;
        const topicId = cb.message?.message_thread_id;

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

        // Try to delete the entire Forum Topic (which removes all messages inside)
        if (topicId) {
          const delTopicRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteForumTopic`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, message_thread_id: topicId }),
          });
          const delTopicResult = await delTopicRes.json();
          console.log(`[telegram-webhook] deleteForumTopic result:`, JSON.stringify(delTopicResult));

          if (!delTopicResult.ok) {
            // Fallback: close the topic and delete the button message
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/closeForumTopic`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, message_thread_id: topicId }),
            });
            await deleteMessage(BOT_TOKEN, chatId, cb.message.message_id);
          }
        } else {
          // No topic (old-style single message), just delete it
          await deleteMessage(BOT_TOKEN, chatId, cb.message.message_id);
        }

        // Clean up all caches for this ticket
        await sb.from("edge_function_cache").delete().eq("key", `ticket_topic:${ticketId}`);
        if (topicId) {
          await sb.from("edge_function_cache").delete().eq("key", `ticket_topic_reverse:${topicId}`);
        }
        await sb.from("edge_function_cache").delete().eq("key", `ticket_tg_msg:${ticketId}`);

        // Clean old-style message caches
        const { data: cachedMsgs } = await sb
          .from("edge_function_cache")
          .select("key")
          .like("key", "tg_msg_ticket:%")
          .filter("value->>ticket_id", "eq", ticketId);
        if (cachedMsgs && cachedMsgs.length > 0) {
          for (const c of cachedMsgs) {
            await sb.from("edge_function_cache").delete().eq("key", c.key);
          }
        }

        await answerCallback(BOT_TOKEN, cb.id, "✅ تم إغلاق وحذف التذكرة بنجاح");
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

      // ===== BAN REPORT approve/reject =====
      if (data.startsWith("ban_ok_") || data.startsWith("ban_no_")) {
        const isApprove = data.startsWith("ban_ok_");
        const reportId = data.substring(7); // remove "ban_ok_" or "ban_no_"
        const chatId = cb.message.chat.id;

        try {
          const BAN_API = "https://hola-chat.com/ban-report-api.php";
          const API_KEY = "ghala2026actions";
          const newAction = isApprove ? "approve-report" : "reject-report";

          const formData = new URLSearchParams();
          formData.append("action", newAction);
          formData.append("id", reportId);

          const apiRes = await fetch(`${BAN_API}?key=${API_KEY}&action=${newAction}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          });
          const result = await apiRes.text();
          console.log(`[telegram-webhook] Ban ${newAction} result:`, result.substring(0, 300));

          // Update the Telegram message to show the result
          const statusEmoji = isApprove ? "✅" : "❌";
          const statusText = isApprove ? "تم قبول الحظر" : "تم رفض البلاغ";
          const originalText = cb.message.caption || cb.message.text || "";

          if (cb.message.caption) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageCaption`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: cb.message.message_id,
                caption: originalText + `\n\n${statusEmoji} <b>${statusText}</b> ${statusEmoji}`,
                parse_mode: "HTML",
              }),
            });
          } else {
            await editMessage(BOT_TOKEN, chatId, cb.message.message_id,
              originalText + `\n\n${statusEmoji} <b>${statusText}</b> ${statusEmoji}`);
          }

          await answerCallback(BOT_TOKEN, cb.id, `${statusEmoji} ${statusText} - بلاغ #${reportId}`);
        } catch (e) {
          console.error("[telegram-webhook] Ban approve/reject error:", e);
          await answerCallback(BOT_TOKEN, cb.id, "❌ فشل تحديث البلاغ");
        }
        return ok();
      }

      // ===== WARES REQUEST approve/reject (entry, frame, etc.) =====
      if (data.startsWith("req_ok_") || data.startsWith("req_no_")) {
        const isApprove = data.startsWith("req_ok_");
        const requestId = data.substring(isApprove ? 7 : 7); // remove "req_ok_" or "req_no_"
        const chatId = cb.message.chat.id;

        try {
          const WARES_API = "https://hola-chat.com/wares-api.php";
          const API_KEY = "ghala2026actions";
          const newStatus = isApprove ? "approved" : "rejected";

          const formData = new URLSearchParams();
          formData.append("action", "update-status");
          formData.append("request_id", requestId);
          formData.append("status", newStatus);

          const apiRes = await fetch(`${WARES_API}?key=${API_KEY}&action=update-status`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          });
          const result = await apiRes.text();
          console.log(`[telegram-webhook] Wares update-status result:`, result.substring(0, 300));

          // Update the Telegram message to show the result
          const statusEmoji = isApprove ? "✅" : "❌";
          const statusText = isApprove ? "تم القبول" : "تم الرفض";
          const originalText = cb.message.caption || cb.message.text || "";
          
          if (cb.message.caption) {
            // Message with media (video/photo) - edit caption
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageCaption`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: cb.message.message_id,
                caption: originalText + `\n\n${statusEmoji} <b>${statusText}</b> ${statusEmoji}`,
                parse_mode: "HTML",
              }),
            });
          } else {
            // Text-only message
            await editMessage(BOT_TOKEN, chatId, cb.message.message_id,
              originalText + `\n\n${statusEmoji} <b>${statusText}</b> ${statusEmoji}`);
          }

          await answerCallback(BOT_TOKEN, cb.id, `${statusEmoji} ${statusText} - طلب #${requestId}`);
        } catch (e) {
          console.error("[telegram-webhook] Wares approve/reject error:", e);
          await answerCallback(BOT_TOKEN, cb.id, "❌ فشل تحديث الطلب");
        }
        return ok();
      }

      // ===== LIVE CHAT END from Telegram =====
      if (data.startsWith("end_chat_")) {
        const chatKey = data.substring(9); // remove "end_chat_"
        const chatId = cb.message.chat.id;
        const topicId = cb.message?.message_thread_id;
        console.log(`[telegram-webhook] Ending live chat: ${chatKey}, topic: ${topicId}`);

        try {
          // 1) End the chat via hola-chat API
          const API_BASE = "https://hola-chat.com/support-chat-api.php";
          const formData = new URLSearchParams();
          formData.append("action", "end");
          formData.append("chat_key", chatKey);

          const apiRes = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          });
          const result = await apiRes.text();
          console.log(`[telegram-webhook] End chat response:`, result.substring(0, 200));

          // 2) Delete the forum topic entirely (this removes ALL messages inside it)
          if (topicId) {
            // Try deleteForumTopic first - it deletes the topic AND all messages inside
            const delTopicRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteForumTopic`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, message_thread_id: topicId }),
            });
            const delTopicResult = await delTopicRes.json();
            console.log(`[telegram-webhook] deleteForumTopic result:`, JSON.stringify(delTopicResult));

            if (!delTopicResult.ok) {
              console.log(`[telegram-webhook] deleteForumTopic failed, trying closeForumTopic...`);
              // Fallback: close topic then delete messages manually
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/closeForumTopic`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, message_thread_id: topicId }),
              });

              // Delete the button message at least
              await deleteMessage(BOT_TOKEN, chatId, cb.message.message_id);
            }

            // Clean up all cached messages for this topic
            const { data: cachedMsgs } = await sb
              .from("edge_function_cache")
              .select("key")
              .like("key", `live_chat_msg:${topicId}:%`);

            if (cachedMsgs && cachedMsgs.length > 0) {
              for (const c of cachedMsgs) {
                await sb.from("edge_function_cache").delete().eq("key", c.key);
              }
            }

            // Clean up topic cache
            await sb.from("edge_function_cache").delete().eq("key", `live_chat_topic:${topicId}`);
          } else {
            // No topic, just delete the button message
            await deleteMessage(BOT_TOKEN, chatId, cb.message.message_id);
          }

          // 5) Notify the user (extract uuid from chat_key: normal_UUID_timestamp)
          const keyParts = chatKey.split("_");
          if (keyParts.length >= 2) {
            const userUuid = keyParts[1];
            await sb.from("notifications").insert({
              user_uuid: userUuid,
              title: "✅ تم إنهاء المحادثة",
              body: "تم إنهاء محادثتك المباشرة من قبل فريق الدعم. شكراً لتواصلك.",
              target: "personal",
            });
          }

          await answerCallback(BOT_TOKEN, cb.id, "✅ تم إنهاء وحذف المحادثة بنجاح");
        } catch (e) {
          console.error("[telegram-webhook] End chat error:", e);
          await answerCallback(BOT_TOKEN, cb.id, "❌ فشل إنهاء المحادثة");
        }
        return ok();
      }

      await answerCallback(BOT_TOKEN, cb.id, "⚠️ إجراء غير معروف");
      return ok();
    }

    // ===== HANDLE TEXT MESSAGES (ticket replies + live chat forwarding) =====
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const adminText = update.message.text;
      const adminName = update.message.from?.first_name || "الإدارة";
      const topicId = update.message.message_thread_id;

      // 1) Check if it's a reply to a specific ticket message
      if (update.message.reply_to_message) {
        const replyToMsgId = update.message.reply_to_message.message_id;

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

      // 2) Check if message is in a ticket topic → save reply to DB
      if (topicId) {
        const { data: ticketTopicCache } = await sb
          .from("edge_function_cache")
          .select("value")
          .eq("key", `ticket_topic_reverse:${topicId}`)
          .maybeSingle();

        if (ticketTopicCache?.value) {
          const { ticket_id, user_uuid, subject } = ticketTopicCache.value as any;

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

          await sendMessage(BOT_TOKEN, chatId, `✅ تم إرسال ردك على تذكرة "${subject}"`, update.message.message_id);
          return ok();
        }
      }

      // 3) Check if message is in a live chat topic → forward to hola-chat API
      if (topicId) {
        const { data: liveChatCache } = await sb
          .from("edge_function_cache")
          .select("value")
          .eq("key", `live_chat_topic:${topicId}`)
          .maybeSingle();

        if (liveChatCache?.value) {
          const { chat_key } = liveChatCache.value as any;
          console.log(`[telegram-webhook] Forwarding admin reply to live chat: topic=${topicId}, chat_key=${chat_key}`);

          try {
            const API_BASE = "https://hola-chat.com/support-chat-api.php";
            const formData = new URLSearchParams();
            formData.append("action", "send");
            formData.append("chat_key", chat_key);
            formData.append("message", adminText);
            formData.append("sender_type", "admin");
            formData.append("sender_name", adminName);

            const apiRes = await fetch(API_BASE, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: formData.toString(),
            });
            const result = await apiRes.text();
            console.log(`[telegram-webhook] hola-chat API response:`, result.substring(0, 200));

            await sendMessage(BOT_TOKEN, chatId, `✅ تم إرسال ردك للمستخدم`, update.message.message_id);
          } catch (e) {
            console.error("[telegram-webhook] Failed to forward to hola-chat:", e);
            await sendMessage(BOT_TOKEN, chatId, `❌ فشل إرسال الرد`, update.message.message_id);
          }
          return ok();
        }
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

async function deleteMessage(token: string, chatId: number, messageId: number) {
  await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    }),
  });
}
