import { corsHeaders } from "../_shared/hmac.ts";

const APP_ID = "1095905537";
const SECRET = "aaf138ff4a12202e15063f7771285b27";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const ts = Math.floor(Date.now() / 1000).toString();

    // MD5 signature: md5(AppId + SignatureNonce + ServerSecret + Timestamp)
    const sigStr = APP_ID + nonce + SECRET + ts;
    const encoder = new TextEncoder();
    const data = encoder.encode(sigStr);

    // Use Web Crypto for MD5 — Deno supports it
    let sig = "";
    try {
      const hashBuffer = await crypto.subtle.digest("MD5", data);
      sig = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // MD5 fallback using simple hash
      const { createHash } = await import("https://deno.land/std@0.168.0/node/crypto.ts");
      sig = createHash("md5").update(sigStr).digest("hex") as string;
    }

    const url = `https://rtc-api.zego.im?Action=DescribeRoomList&AppId=${APP_ID}&SignatureNonce=${nonce}&Timestamp=${ts}&Signature=${sig}&SignatureVersion=2.0`;
    const res = await fetch(url);
    const json = await res.json();

    const rooms = json.Data?.RoomList || [];
    const total = rooms.reduce(
      (sum: number, r: any) => sum + (r.UserCount || 0),
      0
    );

    return new Response(
      JSON.stringify({
        online: total,
        rooms: rooms.length,
        roomList: rooms.slice(0, 30).map((r: any) => ({
          id: r.RoomId,
          users: r.UserCount,
        })),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err), online: 0, rooms: 0 }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
