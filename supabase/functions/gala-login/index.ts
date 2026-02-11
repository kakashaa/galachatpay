import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

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

    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("GALA_API_BASE_URL is not configured");

    const endpoint = "auth/login/uuid";
    const signPath = "api/newWebsite/" + endpoint;
    const headers = await getGalaHeaders("POST", signPath);

    // BASE_URL already includes /api/newWebsite
    const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uuid, password }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Non-JSON response:", text.substring(0, 200));
      return new Response(
        JSON.stringify({ success: false, error: "API returned invalid response. Check BASE_URL." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok || !data.success) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || data.error || "Login failed", api_status: response.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Derive storage base URL from API base URL
    const storageBase = BASE_URL.replace(/\/api\/newWebsite\/?$/, "").replace(/\/+$/, "") + "/storage/";

    // Helper to build full image URL
    const fullUrl = (path: string | null | undefined): string => {
      if (!path) return "";
      if (path.startsWith("http")) return path;
      return storageBase + path;
    };

    // Enrich image paths with full URLs
    if (data.data) {
      const d = data.data;
      if (d.profile?.image) d.profile.image = fullUrl(d.profile.image);
      if (d.profile?.cover) d.profile.cover = fullUrl(d.profile.cover);
      if (d.level?.receiver_img) d.level.receiver_img = fullUrl(d.level.receiver_img);
      if (d.level?.sender_img) d.level.sender_img = fullUrl(d.level.sender_img);
      if (d.level?.charger_img) d.level.charger_img = fullUrl(d.level.charger_img);
      if (d.country?.flag) d.country.flag = fullUrl(d.country.flag);
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
