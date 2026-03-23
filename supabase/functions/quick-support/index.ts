import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (per function instance)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function sanitize(str: string, maxLen: number): string {
  return str.slice(0, maxLen).replace(/[<>"'`]/g, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Limit body size (10KB)
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 10_240) {
      return new Response(
        JSON.stringify({ ok: false, error: "Request too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { room_code, user_name, message } = body;

    if (!room_code || typeof room_code !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "room_code required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate room_code format (alphanumeric, max 50 chars)
    const cleanRoomCode = sanitize(room_code, 50);
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(cleanRoomCode)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid room_code format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit by room_code
    if (isRateLimited(cleanRoomCode)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Too many requests. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: Record<string, string> = { room_code: cleanRoomCode };
    if (user_name && typeof user_name === "string") {
      payload.user_name = sanitize(user_name, 100);
    }
    if (message && typeof message === "string") {
      payload.message = sanitize(message, 1000);
    }

    const res = await fetch("https://hola-chat.com/support.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
