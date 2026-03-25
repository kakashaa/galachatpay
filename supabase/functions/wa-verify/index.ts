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
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "phone and message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow verification-type messages (security: prevent abuse)
    const isVerification = message.includes("رمز التحقق") || message.includes("تم تفعيل");
    if (!isVerification) {
      return new Response(
        JSON.stringify({ success: false, error: "Only verification messages allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the external WA API server-side (project-z uses owner key)
    const GALA_KEY = Deno.env.get("GALA_OWNER_KEY") || Deno.env.get("GALA_API_KEY") || "ghala2026owner";
    const url = `https://hola-chat.com/project-z/api.php`;

    const formData = new URLSearchParams();
    formData.append("key", GALA_KEY);
    formData.append("action", "wa_notify");
    formData.append("phone", phone);
    formData.append("message", message);

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const data = await resp.text();
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = { raw: data.substring(0, 200) };
    }

    return new Response(
      JSON.stringify({ success: true, ...parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("wa-verify error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
