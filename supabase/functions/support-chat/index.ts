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

    // Cache tg_topic_id → chat_key mapping for Telegram webhook forwarding
    if (action === "status" && data?.ok && data?.chat?.tg_topic_id && params.chat_key) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const topicId = data.chat.tg_topic_id;
        const cacheKey = `live_chat_topic:${topicId}`;
        await sb.from("edge_function_cache").upsert({
          key: cacheKey,
          value: { chat_key: params.chat_key, user_name: data.chat.user_name || "" },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "key" });
        console.log(`[support-chat] Cached topic ${topicId} → ${params.chat_key}`);
      } catch (e) {
        console.error("[support-chat] Cache error:", e);
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
