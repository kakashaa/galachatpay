import { supabase } from "@/integrations/supabase/client";

/**
 * Log an admin action to admin_audit_log.
 * Fire-and-forget — never blocks the caller.
 */
export const logAdminAction = (
  action: string,
  details: Record<string, unknown> = {}
) => {
  const adminUsername = localStorage.getItem("admin_username") || "unknown";
  const adminRole = localStorage.getItem("admin_role") || "unknown";

  supabase
    .from("admin_audit_log")
    .insert([{
      admin_username: adminUsername,
      admin_role: adminRole,
      action,
      details: details as any,
    }])
    .then(() => {});
};
