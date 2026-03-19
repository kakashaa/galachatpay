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
    const { key, command, params } = await req.json();

    if (key !== REMOTE_KEY) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result: any = null;

    switch (command) {
      case "query": {
        const { data, error } = await supabase
          .from(params.table)
          .select(params.select || "*")
          .limit(params.limit || 10);
        result = error ? { error: error.message } : data;
        break;
      }

      case "update": {
        const { data: uData, error: uError } = await supabase
          .from(params.table)
          .update(params.data)
          .match(params.match);
        result = uError ? { error: uError.message } : { success: true };
        break;
      }

      case "insert": {
        const { data: iData, error: iError } = await supabase
          .from(params.table)
          .insert(params.data);
        result = iError ? { error: iError.message } : { success: true };
        break;
      }

      case "delete": {
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
