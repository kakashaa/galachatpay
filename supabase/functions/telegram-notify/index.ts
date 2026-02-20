import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return new Response(JSON.stringify({ ok: false, error: "Missing Telegram config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { type, record } = body;

    const message = formatMessage(type, record);
    if (!message) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const resultText = await res.text();

    let result;
    try { result = JSON.parse(resultText); } catch { result = { ok: false, raw: resultText }; }

    return new Response(JSON.stringify({ 
      ok: result.ok, 
      status: res.status, 
      telegram_response: result,
      bot_token_length: TELEGRAM_BOT_TOKEN?.length || 0,
      chat_id: TELEGRAM_CHAT_ID,
      message_preview: message?.substring(0, 50),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[telegram-notify] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatMessage(type: string, record: any): string | null {
  const now = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });

  switch (type) {
    case "support_ticket":
      return [
        `🎫 <b>تكت دعم جديد</b>`,
        `👤 المستخدم: ${record.user_name}`,
        `📌 الموضوع: ${record.subject}`,
        `📝 الوصف: ${(record.description || "").substring(0, 100)}`,
        `🏷 النوع: ${record.ticket_type || "عام"}`,
        `⏰ ${now}`,
      ].join("\n");

    case "vip_chat":
      if (record.status !== "waiting") return null;
      return [
        `💬 <b>طلب شات VIP جديد</b>`,
        `👤 المستخدم: ${record.user_name}`,
        `⭐ المستوى: VIP ${record.vip_level}`,
        `⏰ ${now}`,
      ].join("\n");

    case "salary_request":
      if (record.status !== "pending") return null;
      return [
        `💰 <b>طلب سحب راتب جديد</b>`,
        `👤 المستخدم: ${record.user_name}`,
        `💵 المبلغ: ${record.amount_usd}$`,
        `🏦 طريقة الدفع: ${record.payment_method}`,
        `🌍 الدولة: ${record.recipient_country}`,
        `📋 النوع: ${record.request_type}`,
        `⏰ ${now}`,
      ].join("\n");

    case "animated_photo":
      if (record.status !== "pending") return null;
      return [
        `📸 <b>طلب صورة متحركة جديد</b>`,
        `👤 المستخدم: ${record.user_name}`,
        `⏱ المدة: ${record.duration_label}`,
        `⏰ ${now}`,
      ].join("\n");

    case "quick_support":
      if (record.status !== "pending") return null;
      const typeMap: Record<string, string> = {
        admin_presence: "طلب حضور إداري",
        report: "بلاغ",
        complaint: "شكوى",
        contact: "طلب تواصل",
      };
      return [
        `⚡ <b>دعم سريع: ${typeMap[record.request_type] || record.request_type}</b>`,
        `👤 المستخدم: ${record.user_name}`,
        record.room_code ? `🏠 الغرفة: ${record.room_code}` : null,
        record.description ? `📝 ${(record.description).substring(0, 100)}` : null,
        `⏰ ${now}`,
      ].filter(Boolean).join("\n");

    case "custom_gift":
      if (record.status !== "pending") return null;
      return [
        `🎁 <b>هدية مخصصة جديدة</b>`,
        `👤 المستخدم: ${record.user_name}`,
        `🎬 العنوان: ${record.title}`,
        `⏰ ${now}`,
      ].join("\n");

    case "ban_report":
      return [
        `🚨 <b>بلاغ حظر جديد</b>`,
        `👤 المُبلّغ: ${record.reporter_gala_id}`,
        `🎯 المُبلّغ عنه: ${record.reported_user_id}`,
        `📋 نوع الحظر: ${record.ban_type}`,
        `⏰ ${now}`,
      ].join("\n");

    case "bd_registration":
      if (record.status !== "pending") return null;
      return [
        `📋 <b>طلب تسجيل BD جديد</b>`,
        `👤 المستخدم: ${record.user_name}`,
        `⭐ المستوى: ${record.user_level}`,
        `⏰ ${now}`,
      ].join("\n");

    case "bd_withdrawal":
      if (record.status !== "pending") return null;
      return [
        `💸 <b>طلب سحب BD جديد</b>`,
        `👤 البيدي: ${record.bd_name}`,
        `💵 المبلغ: ${record.amount}$`,
        `⏰ ${now}`,
      ].join("\n");

    case "vip_request":
      return [
        `👑 <b>طلب VIP جديد</b>`,
        `👤 المستخدم: ${record.user_name}`,
        `⭐ المستوى: VIP ${record.vip_level}`,
        `⏰ ${now}`,
      ].join("\n");

    default:
      return [
        `📢 <b>إشعار جديد: ${type}</b>`,
        `📝 ${JSON.stringify(record).substring(0, 200)}`,
        `⏰ ${now}`,
      ].join("\n");
  }
}
