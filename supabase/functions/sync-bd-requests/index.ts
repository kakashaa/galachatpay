import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ACTIONS_URL = Deno.env.get("GALA_ACTIONS_URL");
    const ACTIONS_KEY = Deno.env.get("GALA_ACTIONS_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ACTIONS_URL || !ACTIONS_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing server configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch BD requests from external API
    const targetUrl = new URL(ACTIONS_URL);
    targetUrl.searchParams.set("key", ACTIONS_KEY);
    targetUrl.searchParams.set("action", "list-requests");
    targetUrl.searchParams.set("request_type", "bd_verify");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`External API returned ${response.status}`);
    }

    const result = await response.json();
    const requests = result?.data && Array.isArray(result.data) ? result.data : [];

    let synced = 0;
    let updated = 0;

    for (const req of requests) {
      const cacheRecord = {
        id: String(req.id),
        user_uuid: req.user_uuid || "",
        user_name: req.user_name || "",
        request_type: req.request_type || "bd_verify",
        status: typeof req.status === "number" ? req.status : (req.status === "pending" ? 0 : req.status === "approved" ? 1 : 2),
        details: req.details || {},
        admin_note: req.admin_note || null,
        created_at: req.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("bd_requests_cache")
        .select("id, status")
        .eq("id", cacheRecord.id)
        .single();

      if (existing) {
        if (existing.status !== cacheRecord.status) {
          await supabase
            .from("bd_requests_cache")
            .update(cacheRecord)
            .eq("id", cacheRecord.id);
          updated++;
        }
      } else {
        await supabase
          .from("bd_requests_cache")
          .insert(cacheRecord);
        synced++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: requests.length, synced, updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("sync-bd-requests error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
