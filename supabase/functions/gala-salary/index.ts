import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";


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

    // Extract charge_id (the unique internal ID for each transfer) and transaction info
    const txData = data.data || data;
    const chargeId = txData.id ? String(txData.id) : null; // e.g. "46438" - unique per transfer
    const transactionId = txData.transaction_id || null; // e.g. "TRX-WG85ADR1CY"
    const transactionDate = txData.created_at || txData.date || null;
    const txAmount = txData.amount || parsedAmount;

    // Check if transaction is older than 24 hours
    if (transactionDate) {
      try {
        const txTime = new Date(transactionDate).getTime();
        const now = Date.now();
        const diffHours = (now - txTime) / (1000 * 60 * 60);
        console.log("Transaction age check:", { transactionDate, diffHours, txTime, now });
        
        if (diffHours > 24) {
          const diffDays = Math.floor(diffHours / 24);
          const remainingHours = Math.floor(diffHours % 24);
          const ageText = diffDays > 0
            ? `${diffDays} يوم و ${remainingHours} ساعة`
            : `${Math.floor(diffHours)} ساعة`;
          const txDateObj = new Date(transactionDate);
          const txDateFormatted = `${txDateObj.getUTCFullYear()}/${String(txDateObj.getUTCMonth() + 1).padStart(2, "0")}/${String(txDateObj.getUTCDate()).padStart(2, "0")} ${String(txDateObj.getUTCHours()).padStart(2, "0")}:${String(txDateObj.getUTCMinutes()).padStart(2, "0")}`;
          
          return new Response(
            JSON.stringify({
              success: false,
              error: `هذا التحويل قديم ولا يمكن استخدامه.\n\n📅 تاريخ التحويل: ${txDateFormatted}\n⏳ عمر التحويل: ${ageText}\n⚠️ السبب: مضى أكثر من 24 ساعة على التحويل.\n\nيرجى إجراء تحويل جديد وإعادة المحاولة.`,
              expired: true,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (dateErr) {
        console.error("Date check error:", dateErr);
      }
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
