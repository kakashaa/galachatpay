import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = new Set(["mp4", "webm", "mov", "avi"]);

const ADMIN_ACCOUNTS: Record<string, { envKey: string; role: string }> = {
  naz: { envKey: "ADMIN_NAZ_PASSWORD", role: "super_admin" },
  blnawah: { envKey: "ADMIN_BLNAWAH_PASSWORD", role: "admin" },
};

function validateSessionToken(token: string): boolean {
  try {
    const decoded = JSON.parse(atob(token));
    return !!(decoded.username && ADMIN_ACCOUNTS[decoded.username]);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const sessionToken = formData.get("session_token") as string;
    const file = formData.get("file") as File;

    // Validate session token
    if (!sessionToken || !validateSessionToken(sessionToken)) {
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!file) {
      return new Response(
        JSON.stringify({ error: "لم يتم إرسال ملف" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "حجم الملف كبير جداً (الحد الأقصى 50MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file extension
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return new Response(
        JSON.stringify({ error: "نوع الملف غير مدعوم" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, file, {
        contentType: file.type || "video/mp4",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("videos")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("admin-upload-video error:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ أثناء رفع الملف" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
