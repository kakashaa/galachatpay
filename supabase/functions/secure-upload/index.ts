import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_BUCKETS = new Set(["attachments", "videos"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS: Record<string, Set<string>> = {
  attachments: new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf", "mp4", "webm"]),
  videos: new Set(["mp4", "webm", "mov", "avi"]),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bucket = formData.get("bucket") as string;
    const filePath = formData.get("path") as string;
    const userUuid = formData.get("user_uuid") as string;

    // Validate required fields
    if (!file || !bucket || !filePath || !userUuid) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate bucket
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return new Response(
        JSON.stringify({ error: "Invalid bucket" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user_uuid format
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(userUuid)) {
      return new Response(
        JSON.stringify({ error: "Invalid user_uuid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure path contains user_uuid (prevent uploading to other users' paths)
    if (!filePath.includes(userUuid)) {
      return new Response(
        JSON.stringify({ error: "Path must contain user_uuid" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large (max 50MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file extension
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const allowedExts = ALLOWED_EXTENSIONS[bucket];
    if (!allowedExts || !allowedExts.has(ext)) {
      return new Response(
        JSON.stringify({ error: "File type not allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize path - prevent directory traversal
    const safePath = filePath.replace(/\.\./g, "").replace(/\/\//g, "/");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(safePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(safePath);

    return new Response(
      JSON.stringify({ url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("secure-upload error:", error);
    return new Response(
      JSON.stringify({ error: "Upload failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
