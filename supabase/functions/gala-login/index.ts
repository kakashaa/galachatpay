import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createHmacSignature(
  secret: string,
  data: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  return toHex(signature);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uuid, password } = await req.json();

    if (!uuid || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "uuid and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_SECRET = Deno.env.get("GALA_API_SECRET");
    if (!API_SECRET) {
      throw new Error("GALA_API_SECRET is not configured");
    }

    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) {
      throw new Error("GALA_API_BASE_URL is not configured");
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ uuid, password });
    const signatureData = body + timestamp;
    const signature = await createHmacSignature(API_SECRET, signatureData);

    const response = await fetch(`${BASE_URL}/api/newWebsite/auth/login/uuid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SIGNATURE": signature,
        "X-TIMESTAMP": timestamp,
      },
      body,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || "Login failed",
        }),
        {
          status: response.status === 200 ? 401 : response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-login error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
