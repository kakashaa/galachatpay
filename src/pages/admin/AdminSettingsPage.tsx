import React, { useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminModeratorManager from "@/components/AdminModeratorManager";
import AdminElementSettings from "@/components/AdminElementSettings";
import AdminBannerManager from "@/components/AdminBannerManager";
import { Users, Settings, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminSettingsPage: React.FC = () => {
  const { handleLogout, adminCall, adminSessionToken, adminUsername } = useAdminSession();
  const [subTab, setSubTab] = useState<"moderators" | "elements" | "banners">("moderators");

  return (
    <AdminPageLayout title="الإعدادات" accentColor="hsl(215 16% 47%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.1)' }}>
          {[
            { key: "moderators" as const, label: "الأدمن", icon: Users },
            { key: "elements" as const, label: "العناصر", icon: Settings },
            { key: "banners" as const, label: "البنرات", icon: ImageIcon },
          ].map(t => {
            const Icon = t.icon;
            return (
              <motion.button key={t.key} onClick={() => setSubTab(t.key)} whileTap={{ scale: 0.96 }}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${subTab === t.key ? "text-foreground" : "text-muted-foreground"}`}
                style={subTab === t.key ? { background: 'rgba(148,163,184,0.12)', boxShadow: '0 2px 8px rgba(148,163,184,0.1)' } : {}}>
                <Icon className="w-4 h-4" />{t.label}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={subTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {subTab === "moderators" && <AdminModeratorManager adminCall={adminCall} />}
            {subTab === "elements" && <AdminElementSettings readOnly={false} adminUsername={adminUsername || ""} />}
            {subTab === "banners" && <AdminBannerManager adminSessionToken={adminSessionToken!} adminUsername={adminUsername!} readOnly={false} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminSettingsPage;
