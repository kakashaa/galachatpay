import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMOTE_KEY = "ghala2026remote";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { key, command, params = {} } = body || {};

    if (key !== REMOTE_KEY) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ALLOWED_TABLES = new Set([
      "admin_accounts", "vip_requests", "ban_reports", "support_tickets",
      "notifications", "frame_claims", "entry_gift_claims", "hair_selections",
      "custom_gifts", "animated_photo_requests", "salary_requests",
      "works_members", "works_abuse_log", "works_ban_requests",
      "room_background_requests", "room_background_codes",
      "admin_posts", "admin_stories", "direct_messages", "conversations",
      "support_ratings", "admin_complaints", "id_changes", "bd_withdrawal_requests",
    ]);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result: any = null;

    switch (command) {
      case "query": {
        if (!ALLOWED_TABLES.has(params.table)) {
          return new Response(JSON.stringify({ error: "Table not allowed" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await supabase
          .from(params.table)
          .select(params.select || "*")
          .limit(params.limit || 10);
        result = error ? { error: error.message } : data;
        break;
      }

      case "update": {
        if (!ALLOWED_TABLES.has(params.table)) {
          return new Response(JSON.stringify({ error: "Table not allowed" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: uData, error: uError } = await supabase
          .from(params.table)
          .update(params.data)
          .match(params.match);
        result = uError ? { error: uError.message } : { success: true };
        break;
      }

      case "insert": {
        if (!ALLOWED_TABLES.has(params.table)) {
          return new Response(JSON.stringify({ error: "Table not allowed" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: iData, error: iError } = await supabase
          .from(params.table)
          .insert(params.data);
        result = iError ? { error: iError.message } : { success: true };
        break;
      }

      case "delete": {
        if (!ALLOWED_TABLES.has(params.table)) {
          return new Response(JSON.stringify({ error: "Table not allowed" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error: dError } = await supabase
          .from(params.table)
          .delete()
          .match(params.match);
        result = dError ? { error: dError.message } : { success: true };
        break;
      }

      case "rpc": {
        const { data: rData, error: rError } = await supabase.rpc(
          params.function,
          params.args || {}
        );
        result = rError ? { error: rError.message } : rData;
        break;
      }

      case "api_call": {
        // Call external API (e.g., project-z for UUID changes)
        const url = params.url as string;
        const apiBody = params.body || {};
        if (!url) { result = { error: "Missing url" }; break; }
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(apiBody),
          });
          result = await resp.json();
        } catch (e: any) {
          result = { error: e.message };
        }
        break;
      }

      default:
        result = { error: "Unknown command" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
