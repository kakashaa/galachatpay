import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // For custom_gift with media, skip text-only message (media group below includes caption)
    const skipTextMessage = type === "custom_gift" && (record?.thumbnail_url || record?.video_url);

    let data: any = { ok: true };
    if (!skipTextMessage) {
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: message,
            parse_mode: "HTML",
          }),
        }
      );
      data = await res.json();
      console.log("Telegram response:", JSON.stringify(data));
    }

    // Send media group for custom_gift (thumbnail + video in one message)
    if (type === "custom_gift" && (record?.thumbnail_url || record?.video_url)) {
      try {
        const media: any[] = [];
        const caption = message; // Use the full formatted message as caption

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
          media.push({
            type: "photo",
            media: record.thumbnail_url,
          });
        }

        if (media.length > 1) {
          // Use sendMediaGroup for multiple items
          const groupRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: CHAT_ID, media }),
          });
          const groupData = await groupRes.json();
          console.log("MediaGroup response:", JSON.stringify(groupData));
        } else if (media.length === 1) {
          // Single item - send directly
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
      } catch (e) {
        console.error("Failed to send custom gift media:", e);
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
        `📝 ${record.description?.substring(0, 100) || "-"}\n` +
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
        `📸 <b>طلب صورة متحركة</b>\n` +
        `👤 ${record.user_name}\n` +
        `⏱ ${record.duration_label}\n` +
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

    default:
      return (
        `📌 <b>حدث جديد: ${type}</b>\n` +
        `⏰ ${time}`
      );
  }
}
