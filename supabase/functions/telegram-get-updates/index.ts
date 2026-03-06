import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!BOT_TOKEN) {
      return new Response(JSON.stringify({ error: "Missing BOT_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=10`);
    const data = await res.json();
    
    // Extract chat IDs from updates
    const chats: any[] = [];
    if (data.ok && data.result) {
      for (const update of data.result) {
        const msg = update.message || update.my_chat_member;
        if (msg?.chat) {
          const chat = msg.chat;
          if (!chats.find(c => c.id === chat.id)) {
            chats.push({
              id: chat.id,
              title: chat.title || chat.first_name || "DM",
              type: chat.type,
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ chats, raw_count: data.result?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
