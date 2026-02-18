import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "http://18.219.229.240/website/support-chat-api.php";

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
      console.log(`[support-chat] POST action=${action}`, JSON.stringify(params));
      
      // Try form-urlencoded first (PHP APIs often expect this)
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

    // Sync sent message to Supabase support_chat_messages
    if (action === "send" && data?.ok && params.chat_key) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);
        await sb.from("support_chat_messages").insert({
          chat_id: params.chat_key,
          sender_type: params.sender_type || "user",
          sender_name: params.sender_name || "",
          sender_uuid: params.user_uuid || "unknown",
          message: params.message || "",
        });
      } catch (e) {
        console.error("[support-chat] Supabase sync error:", e);
      }
    }

    // Sync ALL messages from API to Supabase (including admin/system)
    if (action === "messages" && data?.ok && data?.messages?.length && params.chat_key) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);
        
        for (const msg of data.messages) {
          // Sync non-user messages (admin, system) to Supabase for Realtime
          if (msg.sender_type !== "user") {
            // Use API message id + chat_key as a dedup key via message content check
            const { data: existing } = await sb
              .from("support_chat_messages")
              .select("id")
              .eq("chat_id", params.chat_key)
              .eq("message", msg.message)
              .eq("sender_type", msg.sender_type)
              .limit(1);
            
            if (!existing || existing.length === 0) {
              await sb.from("support_chat_messages").insert({
                chat_id: params.chat_key,
                sender_type: msg.sender_type,
                sender_name: msg.sender_name || "فريق الدعم",
                sender_uuid: msg.sender_type === "admin" ? "admin" : "system",
                message: msg.message,
              });
              console.log(`[support-chat] Synced ${msg.sender_type} message to Supabase`);
            }
          }
        }
      } catch (e) {
        console.error("[support-chat] Supabase message sync error:", e);
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
