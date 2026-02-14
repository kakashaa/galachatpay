import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UUID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { uuid, amount } = body as Record<string, unknown>;

    if (!uuid || typeof uuid !== "string" || !UUID_REGEX.test(uuid.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid uuid format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000000) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const AGENCY_ID = 23;
    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("Server configuration error");

    const endpoint = "transaction/check";
    const signPath = "api/newWebsite/" + endpoint;
    const headers = await getGalaHeaders("POST", signPath);

    const sanitizedUuid = uuid.trim();
    const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uuid: sanitizedUuid, amount: parsedAmount, charger_type: "app", agency_id: AGENCY_ID }),
    });

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API response" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok || !data.success) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || data.error || "Transaction check failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract transaction_id from the API response
    const txData = data.data || data;
    const transactionId = txData.transaction_id || txData.id || null;
    const transactionDate = txData.created_at || txData.date || null;
    const txAmount = txData.amount || parsedAmount;

    // Check if this transaction_id was already used in a previous salary request
    if (transactionId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: existing } = await supabase
        .from("salary_requests")
        .select("id, transaction_id")
        .eq("transaction_id", String(transactionId))
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "تم رفع هذا الراتب مسبقاً برقم مرجعي مسجل. لا يمكن استخدام نفس التحويل مرتين.",
            duplicate: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return enriched data with transaction_id
    return new Response(JSON.stringify({
      ...data,
      transaction_id: transactionId ? String(transactionId) : null,
      transaction_date: transactionDate,
      confirmed_amount: txAmount,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-salary error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
