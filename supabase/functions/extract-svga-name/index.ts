const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "لم يتم إرسال صورة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `أنت أداة لاستخراج الأسماء العربية من صور الشعارات والرموز (SVGA stickers).
مهمتك: انظر للصورة واستخرج النص العربي المكتوب فيها فقط.
- أرجع الاسم العربي فقط بدون أي شرح أو علامات ترقيم أو كلام إضافي.
- إذا لم تجد نص عربي واضح، أرجع كلمة "بدون_اسم".
- لا تضف اي شي غير الاسم.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "ما هو النص العربي المكتوب في هذه الصورة؟"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${image_base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limited", name: "" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required", name: "" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ name: "", error: "ai_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let extractedName = data.choices?.[0]?.message?.content?.trim() || "";

    // Clean up: remove quotes, extra whitespace
    extractedName = extractedName.replace(/["'`]/g, "").trim();

    // If AI returned "بدون_اسم" or empty, return empty
    if (extractedName === "بدون_اسم" || extractedName.length === 0) {
      return new Response(
        JSON.stringify({ name: "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ name: extractedName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : "";
    console.error("extract-svga-name error:", errMsg, errStack);
    return new Response(
      JSON.stringify({ name: "", error: "server_error", details: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
