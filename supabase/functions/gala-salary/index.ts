import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UUID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;
const MIN_AMOUNT_USD = 22;

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
    if (!amount || isNaN(parsedAmount) || parsedAmount < MIN_AMOUNT_USD || parsedAmount > 1000000) {
      return new Response(
        JSON.stringify({ success: false, error: `الحد الأدنى للمبلغ هو ${MIN_AMOUNT_USD}$` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const sanitizedUuid = (uuid as string).trim();

    const AGENCY_ID = 23;
    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("Server configuration error");

    const endpoint = "transaction/check";
    const signPath = "api/newWebsite/" + endpoint;
    const headers = await getGalaHeaders("POST", signPath);

    const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uuid: sanitizedUuid, amount: parsedAmount, charger_type: "app", agency_id: AGENCY_ID }),
    });

    const rawText = await response.text();
    console.log("gala-salary raw API response:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API response" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Even if the API says not found, check if there's date/transaction info in the response
    // to determine if it's an expired transfer vs truly not found
    if (!response.ok || !data.success) {
      // Check if the API response contains any transaction data despite failure
      const failData = data.data || data;
      const failTxDate = failData.created_at || failData.date || failData.transaction_date || null;
      const failTxId = failData.transaction_id || failData.id || null;
      
      console.log("API failed response data:", JSON.stringify({ failTxDate, failTxId, message: data.message, error: data.error }));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message || data.error || "لم يتم العثور على تحويل بهذه البيانات. تأكد من صحة المعرف والمبلغ.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract charge_id and transaction info
    const txData = data.data || data;
    const chargeId = txData.id ? String(txData.id) : null;
    const transactionId = txData.transaction_id || null;
    const transactionDate = txData.created_at || txData.date || null;
    const txAmount = txData.amount || parsedAmount;

    // ── Check if this charge_id was already used ──
    if (chargeId) {
      const { data: existingCharge } = await sb
        .from("used_charge_ids")
        .select("id")
        .eq("charge_id", chargeId)
        .limit(1);

      if (existingCharge && existingCharge.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "هذا التحويل تم استخدامه مسبقاً في طلب سحب آخر.\n\nيرجى إجراء تحويل جديد بمبلغ مختلف وإعادة المحاولة.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Store the charge_id as used
      await sb.from("used_charge_ids").insert({
        charge_id: chargeId,
        user_uuid: sanitizedUuid,
        amount_usd: txAmount,
      });
      console.log("Stored charge_id:", chargeId, "for user:", sanitizedUuid);
    }

    // Return enriched data with charge_id as transaction_id
    return new Response(JSON.stringify({
      ...data,
      transaction_id: chargeId, // Store charge_id (unique per transfer)
      transaction_ref: transactionId, // The TRX-... reference
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
