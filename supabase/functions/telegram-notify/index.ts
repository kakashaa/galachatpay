import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return new Response(JSON.stringify({ error: "Missing config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, record } = await req.json();
    const message = formatMessage(type, record);

    if (!message) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For types with media, skip text-only message (media below includes caption)
    const hasMedia = (type === "custom_gift" && (record?.thumbnail_url || record?.video_url)) ||
                     (type === "hair_selection" && record?.file_url) ||
                     (type === "animated_photo" && record?.gif_url) ||
                     ((type === "support_ticket" || type === "ticket_reply") && record?.attachment_url);
    const skipTextMessage = hasMedia;

    // Build inline keyboard for support tickets
    const inlineKeyboard = (type === "support_ticket" && record?.id) ? {
      reply_markup: JSON.stringify({
        inline_keyboard: [[
          { text: "❌ إغلاق التذكرة", callback_data: `tc:${record.id}` }
        ]]
      })
    } : {};

    let data: any = { ok: true };
    if (!skipTextMessage) {
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: message + (type === "support_ticket" ? "\n\n💡 <i>للرد: اعمل Reply على هذه الرسالة واكتب ردك</i>" : ""),
            parse_mode: "HTML",
            ...inlineKeyboard,
          }),
        }
      );
      data = await res.json();
      console.log("Telegram response:", JSON.stringify(data));

      // Store message_id → ticket_id mapping for reply tracking
      if (type === "support_ticket" && data.ok && data.result?.message_id && record?.id) {
        try {
          const sb = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          await sb.from("edge_function_cache").upsert({
            key: `tg_msg_ticket:${data.result.message_id}:${CHAT_ID}`,
            value: { ticket_id: record.id, user_uuid: record.user_uuid, user_name: record.user_name, subject: record.subject },
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
        } catch (e) {
          console.error("Failed to cache message mapping:", e);
        }
      }
    }

    // Send media for custom_gift or hair_selection
    if (hasMedia) {
      try {
        if ((type === "support_ticket" || type === "ticket_reply") && record?.attachment_url) {
          // Send attachment as photo or document
          const attachUrl = record.attachment_url;
          const ext = (attachUrl.split(".").pop() || "").toLowerCase().split("?")[0];
          const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
          if (isImage) {
            const photoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAT_ID, photo: attachUrl, caption: message, parse_mode: "HTML" }),
            });
            const photoData = await photoRes.json();
            console.log("Ticket attachment photo response:", JSON.stringify(photoData));
          } else {
            const docRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAT_ID, document: attachUrl, caption: message, parse_mode: "HTML" }),
            });
            const docData = await docRes.json();
            console.log("Ticket attachment doc response:", JSON.stringify(docData));
          }
        } else if (type === "animated_photo" && record?.gif_url) {
          // Send GIF as animation with caption
          const animRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAnimation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: CHAT_ID,
              animation: record.gif_url,
              caption: message,
              parse_mode: "HTML",
            }),
          });
          const animData = await animRes.json();
          console.log("Animated photo response:", JSON.stringify(animData));
          if (!animData.ok) {
            // Fallback: send as photo
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: CHAT_ID,
                photo: record.gif_url,
                caption: message,
                parse_mode: "HTML",
              }),
            });
          }
        } else if (type === "hair_selection" && record?.file_url) {
          // Download SVGA file then upload to Telegram via multipart
          try {
            const fileRes = await fetch(record.file_url);
            const fileBlob = await fileRes.blob();
            const fileName = record.hair_title ? `${record.hair_title}.svga` : "hair.svga";

            const formData = new FormData();
            formData.append("chat_id", CHAT_ID);
            formData.append("document", fileBlob, fileName);
            formData.append("caption", message!);
            formData.append("parse_mode", "HTML");

            const docRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
              method: "POST",
              body: formData,
            });
            const docData = await docRes.json();
            console.log("Hair SVGA response:", JSON.stringify(docData));
          } catch (dlErr) {
            console.error("Failed to download/upload SVGA:", dlErr);
            // Fallback: send text only
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAT_ID, text: message + `\n📎 ${record.file_url}`, parse_mode: "HTML" }),
            });
          }
        } else if (type === "custom_gift") {
          const media: any[] = [];
          const caption = message;

          if (record.video_url) {
            const ext = (record.video_url.split(".").pop() || "").toLowerCase().split("?")[0];
            const isVideo = ["mp4", "webm", "mov"].includes(ext);
            media.push({
              type: isVideo ? "video" : "document",
              media: record.video_url,
              caption: caption,
              parse_mode: "HTML",
            });
          }

          if (record.thumbnail_url) {
            media.push({ type: "photo", media: record.thumbnail_url });
          }

          if (media.length > 1) {
            const groupRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAT_ID, media }),
            });
            const groupData = await groupRes.json();
            console.log("MediaGroup response:", JSON.stringify(groupData));
          } else if (media.length === 1) {
            const item = media[0];
            const endpoint = item.type === "video" ? "sendVideo" : item.type === "photo" ? "sendPhoto" : "sendDocument";
            const fieldName = item.type === "video" ? "video" : item.type === "photo" ? "photo" : "document";
            const singleRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: CHAT_ID,
                [fieldName]: item.media,
                caption: caption,
                parse_mode: "HTML",
              }),
            });
            const singleData = await singleRes.json();
            console.log("Single media response:", JSON.stringify(singleData));
          }
        }
      } catch (e) {
        console.error("Failed to send media:", e);
      }
    }

    return new Response(JSON.stringify({ ok: data.ok }), {
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

  switch (type) {
    case "support_ticket":
      return (
        `🎫 <b>تكت دعم جديد</b>\n` +
        `👤 ${record.user_name}\n` +
        `📋 ${record.subject}\n` +
        `📝 ${record.description?.substring(0, 200) || "-"}\n` +
        (record.attachment_url ? `📎 <a href="${record.attachment_url}">مرفق</a>\n` : '') +
        `⏰ ${time}`
      );

    case "vip_chat":
      if (record.status !== "waiting") return null;
      return (
        `💬 <b>طلب شات VIP</b>\n` +
        `👤 ${record.user_name}\n` +
        `⭐ VIP ${record.vip_level}\n` +
        `⏰ ${time}`
      );

    case "salary_request":
      if (record.status !== "pending") return null;
      return (
        `💰 <b>طلب سحب راتب</b>\n` +
        `👤 ${record.user_name}\n` +
        `💵 ${record.amount_usd}$\n` +
        `🏦 ${record.payment_method}\n` +
        `🌍 ${record.recipient_country}\n` +
        `⏰ ${time}`
      );

    case "animated_photo":
      if (record.status !== "pending") return null;
      return (
        `📸 <b>صورة متحركة طلب جديد</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 ${record.user_name} (UUID: ${record.user_uuid || "-"})\n` +
        `🔗 عرض الصورة المتحركة\n` +
        `⏱ المدة: ${record.duration_label}\n` +
        `⏰ ${time}`
      );

    case "quick_support":
      if (record.status !== "pending") return null;
      const typeMap: Record<string, string> = {
        admin_presence: "حضور إداري",
        report: "بلاغ",
        complaint: "شكوى",
        contact: "طلب تواصل",
      };
      return (
        `⚡ <b>دعم سريع: ${typeMap[record.request_type] || record.request_type}</b>\n` +
        `👤 ${record.user_name}\n` +
        `📝 ${record.description?.substring(0, 100) || "-"}\n` +
        `⏰ ${time}`
      );

    case "custom_gift":
      if (record.status !== "pending") return null;
      return (
        `🎁 <b>هدية مخصصة</b>\n` +
        `👤 ${record.user_name}\n` +
        `📛 ${record.title}\n` +
        (record.phone_number ? `📞 ${record.phone_number}\n` : '') +
        `⏰ ${time}`
      );

    case "hair_selection":
      return (
        `💇 <b>طلب شعار جديد</b>\n` +
        `👤 ${record.user_name || "-"}\n` +
        `📛 ${record.hair_title || "-"}\n` +
        `⭐ التكلفة: ${record.star_cost || 0} نجمة\n` +
        `⏰ ${time}`
      );

    case "ban_report":
      return (
        `🚫 <b>بلاغ حظر جديد</b>\n` +
        `👤 المبلّغ: ${record.reporter_gala_id}\n` +
        `🎯 المبلّغ عنه: ${record.reported_user_id}\n` +
        `📋 النوع: ${record.ban_type}\n` +
        `⏰ ${time}`
      );

    case "bd_registration":
      if (record.status !== "pending") return null;
      return (
        `📋 <b>طلب تسجيل BD</b>\n` +
        `👤 ${record.user_name} (${record.user_uuid})\n` +
        `📊 المستوى: ${record.user_level}\n` +
        `⏰ ${time}`
      );

    case "bd_withdrawal":
      // Handled directly by bd-manage edge function with full details
      return null;

    case "vip_request":
      return (
        `👑 <b>طلب VIP</b>\n` +
        `👤 ${record.user_name}\n` +
        `⭐ المستوى: VIP ${record.vip_level}\n` +
        `⏰ ${time}`
      );

    case "ticket_reply":
      return (
        `💬 <b>رد جديد على تذكرة</b>\n` +
        `👤 ${record.user_name}\n` +
        `📋 ${record.subject}\n` +
        `📝 ${record.message?.substring(0, 300) || "-"}\n` +
        (record.attachment_url ? `📎 <a href="${record.attachment_url}">مرفق</a>\n` : '') +
        `⏰ ${time}`
      );

    default:
      return (
        `📌 <b>حدث جديد: ${type}</b>\n` +
        `⏰ ${time}`
      );
  }
}
