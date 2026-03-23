import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAdminSession() {
  const navigate = useNavigate();

  const adminSessionToken = localStorage.getItem("admin_session_token");
  const adminUsername = localStorage.getItem("admin_username");
  const adminDisplayName = localStorage.getItem("admin_display_name") || adminUsername;
  const adminRole = localStorage.getItem("admin_role") as "owner" | "super_admin" | "admin" | "moderator" | null;
  const isOwner = adminRole === "owner";
  const isSuperAdmin = adminRole === "super_admin" || isOwner;
  const isRegularAdmin = adminRole === "admin";
  const isModeratorRole = adminRole === "moderator";
  const adminPermissions: string[] = (() => {
    try { return JSON.parse(localStorage.getItem("admin_permissions") || "[]"); } catch { return []; }
  })();

  const adminStorageKeys = [
    "admin_session_token", "admin_username", "admin_display_name", "admin_role",
    "admin_permissions", "admin_api_token", "admin_shift_start", "admin_shift_end", "admin_phone",
  ];

  const decodeSessionPayload = (token: string) => {
    try {
      const payloadBase64 = token.includes(".") ? token.split(".")[0] : token;
      const decoded = JSON.parse(atob(payloadBase64));
      return decoded?.username ? decoded : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!adminSessionToken) {
      navigate("/admin", { replace: true });
      return;
    }

    const decoded = decodeSessionPayload(adminSessionToken);
    if (!decoded) {
      adminStorageKeys.forEach((k) => localStorage.removeItem(k));
      navigate("/admin", { replace: true });
    }
  }, [adminSessionToken, navigate]);

  // Auto refresh token every hour
  useEffect(() => {
    const token = localStorage.getItem("admin_session_token");
    if (!token) return;

    const decoded = decodeSessionPayload(token);
    if (!decoded) return;

    const age = Date.now() - (decoded.iat || 0);

    // Refresh if older than 1 hour
    if (age > 60 * 60 * 1000) {
      const uname = localStorage.getItem("admin_username");
      if (uname) {
        supabase.functions.invoke("admin-manage", {
          body: { username: uname, session_token: token, action: "auth_check" }
        }).then(({ data }) => {
          const result = data?.data || data;
          if (result?.session_token) {
            localStorage.setItem("admin_session_token", result.session_token);
          }
        });
      }
    }
  }, []);

  const adminCall = useCallback(async (action: string, data: any = {}) => {
    const { data: result, error } = await supabase.functions.invoke("admin-manage", {
      body: { username: adminUsername, session_token: adminSessionToken, action, data },
    });
    const authErrorMsg = "بيانات الدخول غير صحيحة";
    const isAuthError = result?.error === authErrorMsg ||
      (error && (error.message?.includes("401") || error.message?.includes(authErrorMsg)));
    if (isAuthError) {
      localStorage.removeItem("admin_session_token");
      localStorage.removeItem("admin_username");
      localStorage.removeItem("admin_role");
      localStorage.removeItem("admin_permissions");
      localStorage.removeItem("admin_api_token");
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
    const maxSize = isVideo ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) throw new Error(`حجم الملف كبير جداً (الحد: ${isVideo ? "100" : "50"}MB)`);

    // Use edge function for videos (supports larger files reliably)
    if (isVideo) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_token", adminSessionToken || "");
      const { data, error } = await supabase.functions.invoke("admin-upload-video", {
        body: formData,
      });
      if (error) throw new Error("فشل الرفع: " + (error.message || error));
      if (data?.error) throw new Error(data.error);
      return data.url as string;
    }

    // Images/assets: direct upload
    const bucket = "attachments";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const defaultContentType = ext === "svga" ? "application/octet-stream" : file.type || "application/octet-stream";
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, {
      contentType: file.type || defaultContentType, upsert: false,
    });
    if (uploadError) throw new Error("فشل الرفع: " + uploadError.message);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  }, [adminSessionToken]);

  const handleLogout = useCallback(() => {
    ["admin_session_token", "admin_username", "admin_display_name", "admin_role",
     "admin_permissions", "admin_api_token", "admin_shift_start", "admin_shift_end", "admin_phone"
    ].forEach(k => localStorage.removeItem(k));
    navigate("/admin");
  }, [navigate]);

  return {
    adminSessionToken, adminUsername, adminDisplayName, adminRole,
    isOwner, isSuperAdmin, isRegularAdmin, isModeratorRole, adminPermissions,
    adminCall, uploadFile, handleLogout,
  };
}
