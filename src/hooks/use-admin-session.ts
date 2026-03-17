import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAdminSession() {
  const navigate = useNavigate();

  const adminSessionToken = sessionStorage.getItem("admin_session_token");
  const adminUsername = sessionStorage.getItem("admin_username");
  const adminDisplayName = sessionStorage.getItem("admin_display_name") || adminUsername;
  const adminRole = sessionStorage.getItem("admin_role") as "owner" | "super_admin" | "admin" | "moderator" | null;
  const isOwner = adminRole === "owner";
  const isSuperAdmin = adminRole === "super_admin" || isOwner;
  const isRegularAdmin = adminRole === "admin";
  const isModeratorRole = adminRole === "moderator";
  const adminPermissions: string[] = (() => {
    try { return JSON.parse(sessionStorage.getItem("admin_permissions") || "[]"); } catch { return []; }
  })();

  useEffect(() => {
    if (!adminSessionToken) {
      navigate("/admin", { replace: true });
      return;
    }
    try {
      JSON.parse(atob(adminSessionToken));
    } catch {
      sessionStorage.clear();
      navigate("/admin", { replace: true });
    }
  }, [adminSessionToken, navigate]);

  const adminCall = useCallback(async (action: string, data: any = {}) => {
    const { data: result, error } = await supabase.functions.invoke("admin-manage", {
      body: { username: adminUsername, session_token: adminSessionToken, action, data },
    });
    const authErrorMsg = "بيانات الدخول غير صحيحة";
    const isAuthError = result?.error === authErrorMsg ||
      (error && (error.message?.includes("401") || error.message?.includes(authErrorMsg)));
    if (isAuthError) {
      sessionStorage.removeItem("admin_session_token");
      sessionStorage.removeItem("admin_username");
      sessionStorage.removeItem("admin_role");
      sessionStorage.removeItem("admin_permissions");
      sessionStorage.removeItem("admin_api_token");
      toast.error("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى");
      navigate("/admin");
      return;
    }
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result?.data;
  }, [adminUsername, adminSessionToken, navigate]);

  const uploadFile = useCallback(async (file: File) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isVideo = ["mp4", "webm", "mov", "avi"].includes(ext);
    const bucket = isVideo ? "videos" : "attachments";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const defaultContentType = ext === "svga" ? "application/octet-stream" : isVideo ? "video/mp4" : file.type || "application/octet-stream";
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, {
      contentType: file.type || defaultContentType, upsert: false,
    });
    if (uploadError) throw new Error("فشل الرفع: " + uploadError.message);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  }, []);

  const handleLogout = useCallback(() => {
    ["admin_session_token", "admin_username", "admin_display_name", "admin_role",
     "admin_permissions", "admin_api_token", "admin_shift_start", "admin_shift_end", "admin_phone"
    ].forEach(k => sessionStorage.removeItem(k));
    navigate("/admin");
  }, [navigate]);

  return {
    adminSessionToken, adminUsername, adminDisplayName, adminRole,
    isOwner, isSuperAdmin, isRegularAdmin, isModeratorRole, adminPermissions,
    adminCall, uploadFile, handleLogout,
  };
}
