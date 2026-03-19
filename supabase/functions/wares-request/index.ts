import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://hola-chat.com/wares-api.php";
const API_KEY = "ghala2026actions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (action === "submit-request") {
      // POST with URLSearchParams
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }

      const res = await fetch(`${BASE_URL}?key=${API_KEY}&action=submit-request`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const data = await res.json();

      // Send telegram notification on success
      if (data.success || data.request_id) {
        try {
          const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
          const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
          if (BOT_TOKEN && CHAT_ID) {
            const typeLabels: Record<string, string> = {
              frame: "🖼 إطار",
              entry_room: "🚪 دخلة غرفة",
              entry_profile: "👤 دخلة ملف شخصي",
              necklace: "📿 قلادة",
            };
            const time = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
            const message =
              `📦 <b>طلب مخصص جديد</b>\n` +
              `👤 ${params.user_name || params.uuid}\n` +
              `📋 النوع: ${typeLabels[params.ware_type] || params.ware_type}\n` +
              `📁 الصيغة: ${params.image_type || "-"}\n` +
              `⏱ المدة: ${params.days || "-"} يوم\n` +
              `🔢 رقم الطلب: #${data.request_id || "-"}\n` +
              `⏰ ${time}`;

            // Send text message first
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML" }),
            });

            // Send the file if file_url exists
            const fileUrl = params.file_url;
            if (fileUrl) {
              const ext = (fileUrl.split(".").pop() || "").toLowerCase().split("?")[0];
              const isVideo = ["mp4", "webm", "mov"].includes(ext);
              const endpoint = isVideo ? "sendVideo" : "sendDocument";
              const fieldName = isVideo ? "video" : "document";

              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: CHAT_ID,
                  [fieldName]: fileUrl,
                  caption: `📎 ملف الطلب #${data.request_id || "-"}\n${typeLabels[params.ware_type] || params.ware_type} — ${params.user_name || params.uuid}`,
                  parse_mode: "HTML",
                }),
              });
            }
          }
        } catch (e) {
          console.error("Telegram notify failed:", e);
        }
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const { id, ware_type } = params;
      if (!id) {
        return new Response(JSON.stringify({ ok: false, error: "Missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = `${BASE_URL}?key=${API_KEY}&action=approve&id=${encodeURIComponent(id)}&ware_type=${encodeURIComponent(ware_type || "")}`;
      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "my-requests") {
      const uuid = params.uuid;
      if (!uuid) {
        return new Response(JSON.stringify({ success: false, error: "UUID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(
        `${BASE_URL}?key=${API_KEY}&action=my-requests&uuid=${encodeURIComponent(uuid)}`,
        { method: "GET", headers: { Accept: "application/json" } }
      );

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("wares-request error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
