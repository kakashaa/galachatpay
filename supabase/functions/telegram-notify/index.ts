import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Topic thread IDs for the main forum group
const TOPIC_THREAD_IDS: Record<string, number> = {
  salary_request: 982,
  bd_commission: 983,
  ban_report: 984,
  vip_request: 985,
  id_change: 986,
  bd_registration: 987,
  custom_gift: 988,
  entry_effect: 989,
  frame: 990,
  animated_photo: 991,
  hair_selection: 992,
  star_cashout: 993,
  support_ticket: 1847,
  ticket_reply: 1847,
  quick_support: 1890,
  vip_chat: 1892,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")?.match(/^-?\d+$/)
      ? Deno.env.get("TELEGRAM_CHAT_ID")!
      : "-1003556311692";

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return new Response(JSON.stringify({ error: "Missing config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, record } = await req.json();

    // ===== Handle ticket_closed: edit Telegram message =====
    if (type === "ticket_closed" && record?.ticket_id) {
      const sb2 = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: cached } = await sb2
        .from("edge_function_cache")
        .select("value")
        .eq("key", `ticket_tg_msg:${record.ticket_id}`)
        .maybeSingle();

      if (cached?.value) {
        const { message_id, chat_id } = cached.value as any;
        // Edit the original message to show closed status
        try {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chat_id,
              message_id: message_id,
              text: `✅ <b>تم إغلاق التذكرة</b>\n\n🎫 التذكرة: ${record.subject || "—"}\n👤 ${record.user_name || "—"}\n\n<i>تم الإغلاق من التطبيق</i>`,
              parse_mode: "HTML",
            }),
          });
        } catch (e) {
          // If editMessageText fails (e.g. media message), try editMessageCaption
          try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageCaption`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chat_id,
                message_id: message_id,
                caption: `✅ <b>تم إغلاق التذكرة</b>\n\n🎫 التذكرة: ${record.subject || "—"}\n👤 ${record.user_name || "—"}\n\n<i>تم الإغلاق من التطبيق</i>`,
                parse_mode: "HTML",
              }),
            });
          } catch (e2) {
            console.error("Failed to edit caption:", e2);
          }
        }
        // Clean up cache
        await sb2.from("edge_function_cache").delete().eq("key", `ticket_tg_msg:${record.ticket_id}`);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const threadId = TOPIC_THREAD_IDS[type];
    const threadParam = threadId ? { message_thread_id: threadId } : {};

    console.log(`[telegram-notify] type=${type}, CHAT_ID=${CHAT_ID}, thread=${threadId || "general"}`);

    const message = formatMessage(type, record);

    if (!message) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build inline keyboard for support tickets
    const ticketButtons = (type === "support_ticket" && record?.id) ? {
      reply_markup: JSON.stringify({
        inline_keyboard: [[
          { text: "❌ إغلاق التذكرة", callback_data: `tc:${record.id}` }
        ]]
      })
    } : {};

    const replyHint = (type === "support_ticket")
      ? "\n\n💡 <i>للرد: اعمل Reply على هذه الرسالة واكتب ردك</i>"
      : "";

    let data: any = { ok: true };

    // ===== SUPPORT TICKET / TICKET REPLY with attachment =====
    if ((type === "support_ticket" || type === "ticket_reply") && record?.attachment_url) {
      const attachUrl = record.attachment_url;
      const ext = (attachUrl.split(".").pop() || "").toLowerCase().split("?")[0];
      const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
      const captionText = message + replyHint;

      let mediaRes;
      if (isImage) {
        mediaRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, photo: attachUrl, caption: captionText, parse_mode: "HTML", ...threadParam, ...ticketButtons }),
        });
      } else {
        mediaRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, document: attachUrl, caption: captionText, parse_mode: "HTML", ...threadParam, ...ticketButtons }),
        });
      }
      data = await mediaRes.json();
      console.log("Ticket media response:", JSON.stringify(data));

      // Cache message mapping for reply tracking
      if (data.ok && data.result?.message_id && record?.id) {
        const ticketId = type === "support_ticket" ? record.id : record.ticket_id;
        if (ticketId) {
          try {
            await sb.from("edge_function_cache").upsert({
              key: `tg_msg_ticket:${data.result.message_id}:${CHAT_ID}`,
              value: { ticket_id: ticketId, user_uuid: record.user_uuid, user_name: record.user_name, subject: record.subject },
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
            // Reverse cache: ticket_id -> message_id for cleanup on close
            await sb.from("edge_function_cache").upsert({
              key: `ticket_tg_msg:${ticketId}`,
              value: { message_id: data.result.message_id, chat_id: CHAT_ID },
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
          } catch (e) {
            console.error("Failed to cache message mapping:", e);
          }
        }
      }

    // ===== SUPPORT TICKET / TICKET REPLY without attachment =====
    } else if (type === "support_ticket" || type === "ticket_reply") {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message + replyHint,
          parse_mode: "HTML",
          ...threadParam,
          ...ticketButtons,
        }),
      });
      data = await res.json();
      console.log("Telegram text response:", JSON.stringify(data));

      // Cache for reply tracking
      if (data.ok && data.result?.message_id) {
        const ticketId = type === "support_ticket" ? record.id : record.ticket_id;
        if (ticketId) {
          try {
            await sb.from("edge_function_cache").upsert({
              key: `tg_msg_ticket:${data.result.message_id}:${CHAT_ID}`,
              value: { ticket_id: ticketId, user_uuid: record.user_uuid, user_name: record.user_name, subject: record.subject },
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
            // Reverse cache: ticket_id -> message_id for cleanup on close
            await sb.from("edge_function_cache").upsert({
              key: `ticket_tg_msg:${ticketId}`,
              value: { message_id: data.result.message_id, chat_id: CHAT_ID },
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
          } catch (e) {
            console.error("Failed to cache message mapping:", e);
          }
        }
      }

    // ===== ANIMATED PHOTO =====
    } else if (type === "animated_photo" && record?.gif_url) {
      const animRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAnimation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, animation: record.gif_url, caption: message, parse_mode: "HTML", ...threadParam }),
      });
      const animData = await animRes.json();
      console.log("Animated photo response:", JSON.stringify(animData));
      if (!animData.ok) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, photo: record.gif_url, caption: message, parse_mode: "HTML", ...threadParam }),
        });
      }

    // ===== HAIR SELECTION (SVGA) =====
    } else if (type === "hair_selection" && record?.file_url) {
      try {
        const fileRes = await fetch(record.file_url);
        const fileBlob = await fileRes.blob();
        const fileName = record.hair_title ? `${record.hair_title}.svga` : "hair.svga";
        const formData = new FormData();
        formData.append("chat_id", CHAT_ID);
        if (threadId) formData.append("message_thread_id", String(threadId));
        formData.append("document", fileBlob, fileName);
        formData.append("caption", message!);
        formData.append("parse_mode", "HTML");
        const docRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: "POST", body: formData });
        const docData = await docRes.json();
        console.log("Hair SVGA response:", JSON.stringify(docData));
      } catch (dlErr) {
        console.error("Failed to download/upload SVGA:", dlErr);
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, text: message + `\n📎 ${record.file_url}`, parse_mode: "HTML", ...threadParam }),
        });
      }

    // ===== CUSTOM GIFT =====
    } else if (type === "custom_gift" && (record?.video_url || record?.thumbnail_url)) {
      const media: any[] = [];
      if (record.video_url) {
        const ext = (record.video_url.split(".").pop() || "").toLowerCase().split("?")[0];
        const isVideo = ["mp4", "webm", "mov"].includes(ext);
        media.push({ type: isVideo ? "video" : "document", media: record.video_url, caption: message, parse_mode: "HTML" });
      }
      if (record.thumbnail_url) {
        media.push({ type: "photo", media: record.thumbnail_url, ...(media.length === 0 ? { caption: message, parse_mode: "HTML" } : {}) });
      }
      if (media.length > 1) {
        const groupRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, media, ...threadParam }),
        });
        console.log("MediaGroup response:", JSON.stringify(await groupRes.json()));
      } else if (media.length === 1) {
        const item = media[0];
        const endpoint = item.type === "video" ? "sendVideo" : item.type === "photo" ? "sendPhoto" : "sendDocument";
        const fieldName = item.type === "video" ? "video" : item.type === "photo" ? "photo" : "document";
        const singleRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, [fieldName]: item.media, caption: message, parse_mode: "HTML", ...threadParam }),
        });
        console.log("Single media response:", JSON.stringify(await singleRes.json()));
      }

    // ===== ALL OTHER TYPES (text only) =====
    } else {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML", ...threadParam }),
      });
      data = await res.json();
      console.log("Telegram response:", JSON.stringify(data));
    }

    return new Response(JSON.stringify({ ok: data.ok ?? true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatMessage(type: string, record: any): string | null {
  const time = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });

  const subjectLabel = (sub: string) => {
    const map: Record<string, string> = {
      tech: "مشكلة تقنية", balance: "رصيد/شحن", account: "حساب",
      gifts: "هدايا", voice: "صوت/غرف", report: "بلاغ", inquiry: "استفسار",
    };
    return map[sub] || sub;
  };

  switch (type) {
    case "support_ticket":
      return (
        `🎫 <b>تذكرة دعم جديدة</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المستخدم:</b> ${record.user_name || "-"}\n` +
        `🆔 <b>UUID:</b> <code>${record.user_uuid || "-"}</code>\n` +
        `📋 <b>الموضوع:</b> ${subjectLabel(record.subject)}\n` +
        `🏷 <b>النوع:</b> ${record.ticket_type || "أخرى"}\n` +
        `🔴 <b>الأولوية:</b> ${record.priority || "عادي"}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `📝 <b>الوصف:</b>\n${record.description?.substring(0, 500) || "-"}\n` +
        `━━━━━━━━━━━━━━━\n` +
        (record.attachment_url ? `📎 <b>مرفق:</b> <a href="${record.attachment_url}">عرض المرفق</a>\n` : `📎 <b>مرفق:</b> لا يوجد\n`) +
        `⏰ ${time}`
      );

    case "ticket_reply":
      return (
        `💬 <b>رد جديد على تذكرة</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المرسل:</b> ${record.user_name || "-"}\n` +
        `📋 <b>الموضوع:</b> ${subjectLabel(record.subject)}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `📝 <b>الرسالة:</b>\n${record.message?.substring(0, 500) || "-"}\n` +
        `━━━━━━━━━━━━━━━\n` +
        (record.attachment_url ? `📎 <b>مرفق:</b> <a href="${record.attachment_url}">عرض المرفق</a>\n` : '') +
        `⏰ ${time}`
      );

    case "vip_chat":
      if (record.status !== "waiting") return null;
      return (
        `💬 <b>طلب شات VIP</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المستخدم:</b> ${record.user_name}\n` +
        `⭐ <b>المستوى:</b> VIP ${record.vip_level}\n` +
        `⏰ ${time}`
      );

    case "salary_request":
      if (record.status !== "pending") return null;
      return (
        `💰 <b>طلب سحب راتب</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المستخدم:</b> ${record.user_name}\n` +
        `🆔 <b>UUID:</b> <code>${record.user_uuid || "-"}</code>\n` +
        `💵 <b>المبلغ:</b> ${record.amount_usd}$\n` +
        `🏦 <b>طريقة الدفع:</b> ${record.payment_method}\n` +
        `📋 <b>تفاصيل الدفع:</b> ${record.payment_details || "-"}\n` +
        `👤 <b>اسم المستلم:</b> ${record.recipient_name || "-"}\n` +
        `🌍 <b>الدولة:</b> ${record.recipient_country}\n` +
        (record.user_phone ? `📞 <b>الهاتف:</b> ${record.user_phone}\n` : '') +
        `📌 <b>النوع:</b> ${record.request_type || "-"}\n` +
        `⏰ ${time}`
      );

    case "animated_photo":
      if (record.status !== "pending") return null;
      return (
        `📸 <b>طلب صورة متحركة</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المستخدم:</b> ${record.user_name}\n` +
        `🆔 <b>UUID:</b> <code>${record.user_uuid || "-"}</code>\n` +
        `⏱ <b>المدة:</b> ${record.duration_label}\n` +
        `📊 <b>أعلى مستوى:</b> ${record.max_level || 0}\n` +
        (record.description ? `📝 <b>الوصف:</b> ${record.description.substring(0, 200)}\n` : '') +
        `⏰ ${time}`
      );

    case "quick_support":
      if (record.status !== "pending") return null;
      const typeMap: Record<string, string> = {
        admin_presence: "حضور إداري", report: "بلاغ", complaint: "شكوى", contact: "طلب تواصل",
      };
      return (
        `⚡ <b>دعم سريع: ${typeMap[record.request_type] || record.request_type}</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المستخدم:</b> ${record.user_name}\n` +
        `🆔 <b>UUID:</b> <code>${record.user_uuid || "-"}</code>\n` +
        (record.room_code ? `🏠 <b>كود الغرفة:</b> ${record.room_code}\n` : '') +
        `📝 <b>الوصف:</b> ${record.description?.substring(0, 200) || "-"}\n` +
        (record.phone_number ? `📞 <b>الهاتف:</b> ${record.phone_number}\n` : '') +
        (record.attachment_url ? `📎 <a href="${record.attachment_url}">مرفق</a>\n` : '') +
        `⏰ ${time}`
      );

    case "custom_gift":
      if (record.status !== "pending") return null;
      return (
        `🎁 <b>طلب هدية مخصصة</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المستخدم:</b> ${record.user_name}\n` +
        `🆔 <b>UUID:</b> <code>${record.user_uuid || "-"}</code>\n` +
        (record.user_gala_id ? `🔖 <b>Gala ID:</b> ${record.user_gala_id}\n` : '') +
        `📛 <b>الاسم:</b> ${record.title}\n` +
        `⏱ <b>مدة الفيديو:</b> ${record.video_duration || 0} ثانية\n` +
        `📊 <b>مستوى الشاحن:</b> ${record.charger_level_at_upload || 0}\n` +
        (record.phone_number ? `📞 <b>الهاتف:</b> ${record.phone_number}\n` : '') +
        `⏰ ${time}`
      );

    case "hair_selection":
      return (
        `💇 <b>طلب شعار جديد</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المستخدم:</b> ${record.user_name || "-"}\n` +
        `🆔 <b>UUID:</b> <code>${record.user_uuid || "-"}</code>\n` +
        `📛 <b>الشعار:</b> ${record.hair_title || "-"}\n` +
        `⭐ <b>التكلفة:</b> ${record.star_cost || 0} نجمة\n` +
        `⏰ ${time}`
      );

    case "ban_report":
      return (
        `🚫 <b>بلاغ حظر جديد</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المبلّغ:</b> ${record.reporter_gala_id}\n` +
        `🎯 <b>المبلّغ عنه:</b> ${record.reported_user_id}\n` +
        `📋 <b>النوع:</b> ${record.ban_type}\n` +
        `📝 <b>الوصف:</b> ${record.description?.substring(0, 200) || "-"}\n` +
        `📎 <b>نوع الدليل:</b> ${record.evidence_type || "صورة"}\n` +
        (record.evidence_url ? `🔗 <a href="${record.evidence_url}">عرض الدليل</a>\n` : '') +
        `⏰ ${time}`
      );

    case "bd_registration":
      if (record.status !== "pending") return null;
      return (
        `📋 <b>طلب تسجيل BD</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المستخدم:</b> ${record.user_name}\n` +
        `🆔 <b>UUID:</b> <code>${record.user_uuid}</code>\n` +
        `📊 <b>المستوى:</b> ${record.user_level}\n` +
        `⏰ ${time}`
      );

    case "bd_withdrawal":
      return null;

    case "vip_request":
      return (
        `👑 <b>طلب VIP</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 <b>المستخدم:</b> ${record.user_name}\n` +
        `🆔 <b>UUID:</b> <code>${record.user_uuid || "-"}</code>\n` +
        `⭐ <b>المستوى:</b> VIP ${record.vip_level}\n` +
        (record.recipient_uuid ? `🎁 <b>للمستلم:</b> <code>${record.recipient_uuid}</code>\n` : '') +
        `📅 <b>الشهر:</b> ${record.request_month || "-"}\n` +
        `⏰ ${time}`
      );

    default:
      return (
        `📌 <b>حدث جديد: ${type}</b>\n` +
        `⏰ ${time}`
      );
  }
}
