import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

/* Routes each role can access */
const ROLE_ROUTES: Record<string, string[]> = {
  admin: ["/admin/requests", "/admin/support", "/admin/chat", "/admin/host-requests"],
  super_admin: [
    "/admin/requests", "/admin/support", "/admin/chat", "/admin/host-requests",
    "/admin/vip", "/admin/ban", "/admin/id-change", "/admin/log",
    "/admin/monitor", "/admin/live-dashboard",
  ],
  owner: ["*"], // owner sees everything
};

interface Props {
  children: React.ReactNode;
}

const AdminRouteGuard: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const adminRole = localStorage.getItem("admin_role") || "";
  const currentPath = window.location.pathname;

  // No role = not logged in (handled by useAdminSession)
  if (!adminRole) return <>{children}</>;

  const allowed = ROLE_ROUTES[adminRole] || [];
  if (allowed.includes("*") || allowed.some(r => currentPath.startsWith(r))) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" dir="rtl"
      style={{ background: "linear-gradient(to bottom, #050816, #0a1628)" }}>
      <div className="text-center space-y-4 max-w-xs">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">⛔ لا تملك صلاحية الوصول</h2>
        <p className="text-sm text-muted-foreground">هذه الصفحة غير متاحة لحسابك</p>
        <button onClick={() => navigate("/admin/dashboard")}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, hsl(188 86% 53%), hsl(188 86% 43%))" }}>
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
};

export default AdminRouteGuard;
