import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminSalaryWithdrawManager from "@/components/AdminSalaryWithdrawManager";
import AdminSalaryChargeManager from "@/components/AdminSalaryChargeManager";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Loader2, TrendingUp, Wallet, CreditCard, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const AdminSalaryPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [subTab, setSubTab] = useState<"withdraw" | "charge" | "report">("withdraw");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStats, setReportStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0, totalUsd: 0, approvedUsd: 0, pendingUsd: 0 });

  useEffect(() => {
    if (subTab === "report") loadReport();
  }, [subTab]);

  const loadReport = async () => {
    setReportLoading(true);
    try {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const { data } = await supabase.from("salary_requests").select("*").gte("created_at", monthStart);
      const rows = data || [];
      setReportStats({
        total: rows.length,
        approved: rows.filter(r => r.status === "approved").length,
        pending: rows.filter(r => r.status === "pending").length,
        rejected: rows.filter(r => r.status === "rejected").length,
        totalUsd: rows.reduce((s, r) => s + (r.amount_usd || 0), 0),
        approvedUsd: rows.filter(r => r.status === "approved").reduce((s, r) => s + (r.amount_usd || 0), 0),
        pendingUsd: rows.filter(r => r.status === "pending").reduce((s, r) => s + (r.amount_usd || 0), 0),
      });
    } catch { }
    finally { setReportLoading(false); }
  };

  return (
    <AdminPageLayout title="إدارة الرواتب" accentColor="#10b981" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-emerald-500/10">
          {[
            { key: "withdraw" as const, label: "طلبات السحب", icon: <Wallet className="w-4 h-4" /> },
            { key: "charge" as const, label: "شحن الكوينز", icon: <CreditCard className="w-4 h-4" /> },
            { key: "report" as const, label: "التقرير", icon: <BarChart3 className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${subTab === t.key ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {subTab === "withdraw" && <AdminSalaryWithdrawManager canAct={true} />}
        {subTab === "charge" && <AdminSalaryChargeManager canAct={true} />}

        {subTab === "report" && (
          reportLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-400" /></div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Hero */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">تقرير الشهر الحالي</span>
                </div>
                <p className="text-3xl font-bold font-mono text-emerald-400">${reportStats.totalUsd.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">إجمالي الرواتب ({reportStats.total} طلب)</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "مسحوب", value: `$${reportStats.approvedUsd}`, count: reportStats.approved, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                  { label: "معلق", value: `$${reportStats.pendingUsd}`, count: reportStats.pending, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                  { label: "مرفوض", value: reportStats.rejected.toString(), count: reportStats.rejected, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
                ].map(s => (
                  <div key={s.label} className={`text-center py-3 rounded-xl border ${s.bg}`}>
                    <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-muted-foreground">{s.label} ({s.count})</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">نسبة القبول: <span className="text-emerald-400 font-bold">{reportStats.total ? Math.round((reportStats.approved / reportStats.total) * 100) : 0}%</span></span>
              </div>
            </motion.div>
          )
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminSalaryPage;
