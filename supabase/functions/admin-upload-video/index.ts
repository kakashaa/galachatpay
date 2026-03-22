import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "avi"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const ALLOWED_ASSET_EXTENSIONS = new Set(["svga"]);

const ADMIN_ACCOUNTS: Record<string, { envKey: string; role: string }> = {
  naz: { envKey: "ADMIN_NAZ_PASSWORD", role: "super_admin" },
  blnawah: { envKey: "ADMIN_BLNAWAH_PASSWORD", role: "admin" },
};

async function validateSessionToken(token: string, supabase: any): Promise<boolean> {
  try {
    // Try legacy btoa token
    let decoded: any = null;
    try {
      decoded = JSON.parse(atob(token.split(".")[0] || token));
    } catch { /* not legacy */ }

    if (decoded?.username) {
      // Check hardcoded admins
      if (ADMIN_ACCOUNTS[decoded.username]) return true;
      // Check DB admins
      const { data } = await supabase
        .from("admin_accounts")
        .select("id")
        .eq("username", decoded.username)
        .eq("is_active", true)
        .maybeSingle();
      if (data) return true;
    }
    return false;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formData = await req.formData();
    const sessionToken = formData.get("session_token") as string;
    const file = formData.get("file") as File;

    // Validate session token
    if (!sessionToken || !(await validateSessionToken(sessionToken, supabase))) {
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
        JSON.stringify({ error: "حجم الملف كبير جداً (الحد الأقصى 100MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file extension
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isVideo = ALLOWED_VIDEO_EXTENSIONS.has(ext);
    const isImage = ALLOWED_IMAGE_EXTENSIONS.has(ext);
    const isAsset = ALLOWED_ASSET_EXTENSIONS.has(ext);
    if (!isVideo && !isImage && !isAsset) {
      return new Response(
        JSON.stringify({ error: "نوع الملف غير مدعوم" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bucket = isAsset ? "attachments" : isImage ? "attachments" : "videos";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const defaultContentType = isAsset ? "application/octet-stream" : isImage ? `image/${ext === "jpg" ? "jpeg" : ext}` : "video/mp4";

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: file.type || defaultContentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("admin-upload-video error:", errMsg);
    return new Response(
      JSON.stringify({ error: "حدث خطأ أثناء رفع الملف", details: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
