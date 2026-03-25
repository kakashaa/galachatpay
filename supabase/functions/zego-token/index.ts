import { corsHeaders } from "../_shared/hmac.ts";

const APP_ID = 1095905537;
const SERVER_SECRET = "aaf138ff4a12202e15063f7771285b27";

function makeNonce(): number {
  return Math.floor(Math.random() * 2147483647);
}

async function aesGcmEncrypt(plainText: string, key: Uint8Array): Promise<{ encrypted: Uint8Array; nonce: Uint8Array }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]);
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, encoded);
  return { encrypted: new Uint8Array(cipherBuf), nonce };
}

function toBigEndianBytes(num: number, bytes: number): Uint8Array {
  const arr = new Uint8Array(bytes);
  for (let i = bytes - 1; i >= 0; i--) {
    arr[i] = num & 0xff;
    num = num >> 8;
  }
  return arr;
}

async function generateToken04(appId: number, userId: string, secret: string, effectiveTimeInSeconds: number, payload: string = ""): Promise<string> {
  if (!userId) throw new Error("userId invalid");
  if (secret.length !== 32) throw new Error("secret must be 32 bytes");

  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: makeNonce(),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || "",
  };

  const plaintextJson = JSON.stringify(tokenInfo);
  const secretKey = new TextEncoder().encode(secret);
  const { encrypted, nonce: iv } = await aesGcmEncrypt(plaintextJson, secretKey);

  // Pack: expiredTime(8) + ivLen(2) + iv + encryptedLen(2) + encrypted
  const expireBytes = toBigEndianBytes(createTime + effectiveTimeInSeconds, 8);
  const ivLenBytes = toBigEndianBytes(iv.length, 2);
  const encLenBytes = toBigEndianBytes(encrypted.length, 2);

  const totalLen = 8 + 2 + iv.length + 2 + encrypted.length;
  const buf = new Uint8Array(totalLen);
  let offset = 0;
  buf.set(expireBytes, offset); offset += 8;
  buf.set(ivLenBytes, offset); offset += 2;
  buf.set(iv, offset); offset += iv.length;
  buf.set(encLenBytes, offset); offset += 2;
  buf.set(encrypted, offset);

  // base64 encode and prepend version "04"
  const b64 = btoa(String.fromCharCode(...buf));
  return "04" + b64;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, room_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build privilege payload for room access
    const privilege: Record<string, number> = {};
    if (room_id) {
      privilege["1"] = 1; // login
      privilege["2"] = 1; // publish
    }

    const payload = room_id
      ? JSON.stringify({ room_id, privilege })
      : "";

    const token = await generateToken04(APP_ID, user_id, SERVER_SECRET, 3600, payload);

    return new Response(
      JSON.stringify({ token, app_id: APP_ID }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
