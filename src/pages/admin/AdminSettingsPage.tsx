import React, { useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminModeratorManager from "@/components/AdminModeratorManager";
import AdminElementSettings from "@/components/AdminElementSettings";
import AdminBannerManager from "@/components/AdminBannerManager";
import { Users, Settings, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

const AdminSettingsPage: React.FC = () => {
  const { handleLogout, adminCall, adminSessionToken, adminUsername } = useAdminSession();
  const [subTab, setSubTab] = useState<"moderators" | "elements" | "banners">("moderators");

  return (
    <AdminPageLayout title="الإعدادات" accentColor="#64748b" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        {/* Tabs — Slate themed */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-slate-500/10">
          {[
            { key: "moderators" as const, label: "الأدمن", icon: <Users className="w-4 h-4" /> },
            { key: "elements" as const, label: "العناصر", icon: <Settings className="w-4 h-4" /> },
            { key: "banners" as const, label: "البنرات", icon: <ImageIcon className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${subTab === t.key ? "bg-slate-500/20 text-slate-300" : "text-muted-foreground"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <motion.div key={subTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {subTab === "moderators" && <AdminModeratorManager adminCall={adminCall} />}
          {subTab === "elements" && <AdminElementSettings readOnly={false} adminUsername={adminUsername || ""} />}
          {subTab === "banners" && <AdminBannerManager adminSessionToken={adminSessionToken!} adminUsername={adminUsername!} readOnly={false} />}
        </motion.div>
      </div>
    </AdminPageLayout>
  );
};

export default AdminSettingsPage;
