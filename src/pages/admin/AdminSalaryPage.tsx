import React, { useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminSalaryWithdrawManager from "@/components/AdminSalaryWithdrawManager";
import AdminSalaryChargeManager from "@/components/AdminSalaryChargeManager";

const AdminSalaryPage: React.FC = () => {
  const { handleLogout, adminSessionToken, adminUsername } = useAdminSession();
  const [subTab, setSubTab] = useState<"withdraw" | "charge">("withdraw");

  return (
    <AdminPageLayout title="إدارة الرواتب" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
          <button onClick={() => setSubTab("withdraw")} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${subTab === "withdraw" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>سحب الرواتب</button>
          <button onClick={() => setSubTab("charge")} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${subTab === "charge" ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}>شحن الراتب</button>
        </div>
        {subTab === "withdraw" && <AdminSalaryWithdrawManager />}
        {subTab === "charge" && <AdminSalaryChargeManager />}
      </div>
    </AdminPageLayout>
  );
};

export default AdminSalaryPage;
