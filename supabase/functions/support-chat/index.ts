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

    // ===== Combined poll action: fetches messages + status in one call =====
    if (action === "poll") {
      const chatKey = params.chat_key;
      const afterId = params.after_id || 0;

      // Fetch messages and status in parallel
      const msgParams = new URLSearchParams({
        action: "messages",
        chat_key: chatKey,
        after_id: String(afterId),
      });
      const statusParams = new URLSearchParams({
        action: "status",
        chat_key: chatKey,
      });

      const [msgRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}?${msgParams.toString()}`),
        fetch(`${API_BASE}?${statusParams.toString()}`),
      ]);

      const [msgText, statusText] = await Promise.all([
        msgRes.text(),
        statusRes.text(),
      ]);

      let msgData, statusData;
      try { msgData = JSON.parse(msgText); } catch { msgData = { ok: false }; }
      try { statusData = JSON.parse(statusText); } catch { statusData = { ok: false }; }

      return new Response(JSON.stringify({
        ok: true,
        messages: msgData?.messages || [],
        status: statusData?.chat?.status || statusData?.status || "active",
        queue_position: statusData?.queue_position || 0,
        ended: statusData?.chat?.ended_at ? true : false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET actions: messages, status, queue
    const getActions = ["messages", "status", "queue"];
    let apiRes: Response;

    if (getActions.includes(action)) {
      const qp = new URLSearchParams();
      qp.append("action", action);
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qp.append(k, String(v));
      }
      const url = `${API_BASE}?${qp.toString()}`;
      console.log(`[support-chat] GET ${url}`);
      apiRes = await fetch(url);
    } else {
      // POST actions: start, send, end
      console.log(`[support-chat] POST action=${action}`);
      
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
    console.log(`[support-chat] Response for action="${action}":`, rawText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { ok: false, error: "Invalid API response", raw: rawText.substring(0, 200) };
    }

    // ===== Create Telegram Forum Topic when a new chat starts =====
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

          // Check if a topic already exists for this exact chat_key using precise lookup
          const { data: existingCache } = await sb
            .from("edge_function_cache")
            .select("key, value")
            .eq("key", `live_chat_key:${chatKey}`)
            .maybeSingle();

          if (!existingCache) {
            const typeLabel = chatType === "quick" ? "⚡ دعم سريع" : "💬 محادثة مباشرة";
            const topicName = `${typeLabel} - ${userName}`;

            // Create Forum Topic
            const createTopicRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createForumTopic`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: parseInt(CHAT_ID),
                name: topicName.substring(0, 128),
                icon_color: chatType === "quick" ? 16766720 : 7322096,
              }),
            });
            const topicResult = await createTopicRes.json();
            console.log(`[support-chat] createForumTopic result:`, JSON.stringify(topicResult));

            if (topicResult.ok && topicResult.result?.message_thread_id) {
              const topicId = topicResult.result.message_thread_id;

              // Send initial message in the topic with end button
              const msgText = `${typeLabel}\n━━━━━━━━━━━━━━━\n👤 المستخدم: ${userName}\n🆔 UUID: ${userUuid}\n🔑 مفتاح: ${chatKey}\n━━━━━━━━━━━━━━━\n⏰ ${new Date().toLocaleString("ar-EG", { timeZone: "Asia/Riyadh" })}\n\n💡 للرد: اكتب ردك مباشرة في هذا الموضوع`;

              const sendRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: parseInt(CHAT_ID),
                  message_thread_id: topicId,
                  text: msgText,
                  parse_mode: "HTML",
                  reply_markup: {
                    inline_keyboard: [[
                      { text: "❌ إنهاء المحادثة", callback_data: `end_chat_${chatKey}` },
                    ]],
                  },
                }),
              });
              const sendResult = await sendRes.json();
              console.log(`[support-chat] Topic message sent:`, JSON.stringify(sendResult).substring(0, 200));

              // Cache both mappings: topic→chat_key AND chat_key→topic (for dedup)
              const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              await Promise.all([
                sb.from("edge_function_cache").upsert({
                  key: `live_chat_topic:${topicId}`,
                  value: { chat_key: chatKey, user_name: userName, user_uuid: userUuid },
                  expires_at: expiry,
                }, { onConflict: "key" }),
                sb.from("edge_function_cache").upsert({
                  key: `live_chat_key:${chatKey}`,
                  value: { topic_id: topicId, user_name: userName },
                  expires_at: expiry,
                }, { onConflict: "key" }),
              ]);

              console.log(`[support-chat] Cached topic ${topicId} ↔ ${chatKey}`);
            }
          } else {
            console.log(`[support-chat] Topic already exists for chat_key=${chatKey}, skipping creation`);
          }
        }
      } catch (e) {
        console.error("[support-chat] Telegram topic creation error:", e);
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