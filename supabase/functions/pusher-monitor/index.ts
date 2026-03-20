import { createHmacSignature, corsHeaders } from "../_shared/hmac.ts";

const PUSHER_KEY = "7308273f9bbb39599189";
const PUSHER_SECRET = "cafb58f249d742b45977";
const PUSHER_APP_ID = "2019442";
const PUSHER_CLUSTER = "mt1";
const PUSHER_BASE = `https://api-${PUSHER_CLUSTER}.pusher.com`;

async function pusherSign(method: string, path: string, params: Record<string, string>): Promise<string> {
  const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const stringToSign = `${method}\n${path}\n${sortedParams}`;
  return await createHmacSignature(PUSHER_SECRET, stringToSign);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json().catch(() => ({ action: "online_count" }));

    if (action === "online_count") {
      const path = `/apps/${PUSHER_APP_ID}/channels`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const params: Record<string, string> = {
        auth_key: PUSHER_KEY,
        auth_timestamp: timestamp,
        auth_version: "1.0",
        filter_by_prefix: "user-",
      };

      const signature = await pusherSign("GET", path, params);
      params.auth_signature = signature;

      const qs = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
      const url = `${PUSHER_BASE}${path}?${qs}`;

      const res = await fetch(url);
      const data = await res.json();
      const channelCount = Object.keys(data.channels || {}).length;

      return new Response(JSON.stringify({ online_count: channelCount, channels: data.channels }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active conversations for monitoring
    if (action === "active_conversations") {
      const path = `/apps/${PUSHER_APP_ID}/channels`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const params: Record<string, string> = {
        auth_key: PUSHER_KEY,
        auth_timestamp: timestamp,
        auth_version: "1.0",
        filter_by_prefix: "conversation-",
      };

      const signature = await pusherSign("GET", path, params);
      params.auth_signature = signature;

      const qs = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
      const url = `${PUSHER_BASE}${path}?${qs}`;

      const res = await fetch(url);
      const data = await res.json();
      const channels = Object.keys(data.channels || {});

      return new Response(JSON.stringify({ count: channels.length, channels }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
