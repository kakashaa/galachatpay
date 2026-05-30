import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* Allowed roles per admin route */
const PAGE_ROLES: Record<string, string[]> = {
  "/admin/salary": ["owner"],
  "/admin/settings": ["owner"],
  "/admin/accounts": ["owner"],
  "/admin/income": ["owner"],
  "/admin/agencies": ["owner"],
  "/admin/works": ["owner"],
  "/admin/supporter-club": ["owner"],
  "/admin/deductions": ["owner"],
  "/admin/gifts": ["owner"],
  "/admin/vip": ["owner", "super_admin"],
  "/admin/ban": ["owner", "super_admin"],
  "/admin/login-bans": ["owner", "super_admin"],
  "/admin/id-change": ["owner", "super_admin"],
  "/admin/log": ["owner", "super_admin"],
  "/admin/monitor": ["owner", "super_admin"],
  "/admin/live-dashboard": ["owner", "super_admin"],
  "/admin/requests": ["owner", "super_admin", "admin"],
  "/admin/support": ["owner", "super_admin", "admin"],
  "/admin/host-requests": ["owner", "super_admin", "admin"],
  "/admin/chat": ["owner", "super_admin", "admin"],
  "/admin/health-check": ["owner"],
};

interface Props {
  children: React.ReactNode;
}

const AdminRouteGuard: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const adminRole = localStorage.getItem("admin_role") || "";
  const loggedRef = useRef(false);

  // moderator gets same access as super_admin
  const effectiveRole = adminRole === "moderator" ? "super_admin" : adminRole;

  // ban_only: مسموح فقط بصفحة الحظر اليدوي
  if (adminRole === "ban_only") {
    const isBanPage = pathname.startsWith("/admin/ban") && !pathname.startsWith("/admin/ban-");
    if (!isBanPage) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          dir="rtl"
          style={{ background: "linear-gradient(to bottom, #050816, #0a1628)" }}
        >
          <div className="text-center space-y-4 max-w-xs">
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">⛔ حسابك مخصص للحظر اليدوي فقط</h2>
            <button
              onClick={() => navigate("/admin/ban", { replace: true })}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, hsl(188 86% 53%), hsl(188 86% 43%))" }}
            >
              صفحة الحظر اليدوي
            </button>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  // Find matching route
  const matchedRoute = Object.keys(PAGE_ROLES).find(r => pathname.startsWith(r));
  const allowed = matchedRoute ? PAGE_ROLES[matchedRoute] : null;

  const isAllowed =
    !adminRole ||
    adminRole === "owner" ||
    !allowed ||
    allowed.includes(effectiveRole) ||
    allowed.includes(adminRole);

  // Log unauthorized attempts once
  useEffect(() => {
    if (isAllowed || loggedRef.current) return;
    loggedRef.current = true;
    const username = localStorage.getItem("admin_username") || "unknown";
    supabase.from("admin_audit_log").insert({
      admin_username: username,
      admin_role: adminRole,
      action: "unauthorized_access",
      details: { path: pathname, role: adminRole },
    }).then(() => {});
  }, [isAllowed, pathname, adminRole]);

  if (isAllowed) return <>{children}</>;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      dir="rtl"
      style={{ background: "linear-gradient(to bottom, #050816, #0a1628)" }}
    >
      <div className="text-center space-y-4 max-w-xs">
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          ⛔ لا تملك صلاحية الوصول
        </h2>
        <p className="text-sm text-muted-foreground">
          هذه الصفحة غير متاحة لحسابك
        </p>
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{
            background:
              "linear-gradient(135deg, hsl(188 86% 53%), hsl(188 86% 43%))",
          }}
        >
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
};

export default AdminRouteGuard;
