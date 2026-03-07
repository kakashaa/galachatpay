import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://hola-chat.com/support-chat-api.php";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ ok: false, error: "action required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ===== Combined poll: messages + status in one edge function call =====
    if (action === "poll") {
      const chatKey = params.chat_key;
      const afterId = params.after_id || 0;

      const msgQP = new URLSearchParams({ action: "messages", chat_key: chatKey, after_id: String(afterId) });
      const statusQP = new URLSearchParams({ action: "status", chat_key: chatKey });

      const [msgRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}?${msgQP}`),
        fetch(`${API_BASE}?${statusQP}`),
      ]);

      const [msgText, statusText] = await Promise.all([msgRes.text(), statusRes.text()]);

      let msgData: any, statusData: any;
      try { msgData = JSON.parse(msgText); } catch { msgData = { ok: false }; }
      try { statusData = JSON.parse(statusText); } catch { statusData = { ok: false }; }

      return new Response(JSON.stringify({
        ok: true,
        messages: msgData?.messages || [],
        status: statusData?.chat?.status || statusData?.status || "active",
        queue_position: statusData?.queue_position || 0,
        ended: !!(statusData?.chat?.ended_at),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== GET actions: messages, status, queue =====
    const getActions = ["messages", "status", "queue"];
    let apiRes: Response;

    if (getActions.includes(action)) {
      const qp = new URLSearchParams();
      qp.append("action", action);
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qp.append(k, String(v));
      }
      apiRes = await fetch(`${API_BASE}?${qp}`);
    } else {
      // ===== POST actions: start, send, end =====
      const formData = new URLSearchParams();
      formData.append("action", action);
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) formData.append(k, String(v));
      }
      apiRes = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });
    }

    const rawText = await apiRes.text();
    let data: any;
    try { data = JSON.parse(rawText); } catch { data = { ok: false, error: "Invalid API response" }; }

    // ===== Create Telegram Topic on new chat =====
    if (action === "start" && data?.ok && data?.chat_key) {
      try {
        const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
        const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")?.match(/^-?\d+$/)
          ? Deno.env.get("TELEGRAM_CHAT_ID")!
          : "-1003556311692";

        if (BOT_TOKEN && CHAT_ID) {
          const chatKey = data.chat_key;
          const userName = params.user_name || "مستخدم";
          const userUuid = params.user_uuid || "";
          const chatType = params.chat_type || "normal";

          // Deduplicate: check if topic already exists for this chat_key
          const { data: existing } = await sb
            .from("edge_function_cache")
            .select("key")
            .eq("key", `live_chat_key:${chatKey}`)
            .maybeSingle();

          if (!existing) {
            const typeLabel = chatType === "quick" ? "⚡ دعم سريع" : "💬 محادثة مباشرة";

            const topicRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createForumTopic`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: parseInt(CHAT_ID),
                name: `${typeLabel} - ${userName}`.substring(0, 128),
                icon_color: chatType === "quick" ? 16766720 : 7322096,
              }),
            });
            const topicResult = await topicRes.json();

            if (topicResult.ok && topicResult.result?.message_thread_id) {
              const topicId = topicResult.result.message_thread_id;

              // Send welcome message with end button
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: parseInt(CHAT_ID),
                  message_thread_id: topicId,
                  text: `${typeLabel}\n━━━━━━━━━━━━━━━\n👤 ${userName}\n🆔 ${userUuid}\n🔑 ${chatKey}\n━━━━━━━━━━━━━━━\n⏰ ${new Date().toLocaleString("ar-EG", { timeZone: "Asia/Riyadh" })}\n\n💡 للرد: اكتب ردك مباشرة في هذا الموضوع`,
                  parse_mode: "HTML",
                  reply_markup: { inline_keyboard: [[{ text: "❌ إنهاء المحادثة", callback_data: `end_chat_${chatKey}` }]] },
                }),
              });

              // Cache both directions
              const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              await Promise.all([
                sb.from("edge_function_cache").upsert({ key: `live_chat_topic:${topicId}`, value: { chat_key: chatKey, user_name: userName, user_uuid: userUuid }, expires_at: expiry }, { onConflict: "key" }),
                sb.from("edge_function_cache").upsert({ key: `live_chat_key:${chatKey}`, value: { topic_id: topicId, user_name: userName }, expires_at: expiry }, { onConflict: "key" }),
              ]);
            }
          }
        }
      } catch (e) {
        console.error("[support-chat] Telegram topic error:", e);
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
