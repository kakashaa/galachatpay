import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://hola-chat.com/wares-api.php";
const API_KEY = "ghala2026actions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (action === "submit-request") {
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }

      const res = await fetch(`${BASE_URL}?key=${API_KEY}&action=submit-request`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const { id, ware_type } = params;
      if (!id) {
        return new Response(JSON.stringify({ ok: false, error: "Missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = `${BASE_URL}?key=${API_KEY}&action=approve&id=${encodeURIComponent(id)}&ware_type=${encodeURIComponent(ware_type || "")}`;
      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upload-room-background") {
      const { uuid, image_url } = params;
      if (!uuid || !image_url) {
        return new Response(JSON.stringify({ ok: false, error: "Missing uuid or image_url" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = `${BASE_URL}?key=${API_KEY}&action=upload-room-background&uuid=${encodeURIComponent(uuid)}&image_url=${encodeURIComponent(image_url)}`;
      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "my-requests") {
      const uuid = params.uuid;
      if (!uuid) {
        return new Response(JSON.stringify({ success: false, error: "UUID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(
        `${BASE_URL}?key=${API_KEY}&action=my-requests&uuid=${encodeURIComponent(uuid)}`,
        { method: "GET", headers: { Accept: "application/json" } }
      );

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban-user-real") {
      const { uuid, reason, hours, ban_type } = params;
      if (!uuid) {
        return new Response(JSON.stringify({ ok: false, error: "Missing uuid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = `${BASE_URL}?key=${API_KEY}&action=ban-user-real&uuid=${encodeURIComponent(uuid)}&reason=${encodeURIComponent(reason || "")}&hours=${encodeURIComponent(hours || "24")}&ban_type=${encodeURIComponent(ban_type || "normal")}`;
      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unban-user-real") {
      const { uuid, unban_type } = params;
      if (!uuid) {
        return new Response(JSON.stringify({ ok: false, error: "Missing uuid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = `${BASE_URL}?key=${API_KEY}&action=unban-user-real&uuid=${encodeURIComponent(uuid)}&unban_type=${encodeURIComponent(unban_type || "normal")}`;
      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("wares-request error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
