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

async function createHmacSignature(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toHex(signature);
}

async function getGalaHeaders(method: string, path: string): Promise<Record<string, string>> {
  const API_KEY = Deno.env.get("GALA_API_KEY");
  const API_SECRET = Deno.env.get("GALA_API_SECRET");
  if (!API_KEY) throw new Error("GALA_API_KEY is not configured");
  if (!API_SECRET) throw new Error("GALA_API_SECRET is not configured");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const stringToSign = method + path + timestamp + nonce;
  const signature = await createHmacSignature(API_SECRET, stringToSign);

  return {
    "X-API-KEY": API_KEY,
    "X-TIMESTAMP": timestamp,
    "X-NONCE": nonce,
    "X-SIGNATURE": signature,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

export { corsHeaders, createHmacSignature, getGalaHeaders };
