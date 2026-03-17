import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Loader2, TrendingUp, Target, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const AdminIncomePage: React.FC = () => {
  const { adminCall, handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalDiamonds: 0, todayIncome: 0, monthlyGoal: 85 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load salary requests for income tracking
      const { data: salaryData } = await supabase.from("salary_requests").select("*").order("created_at", { ascending: false }).limit(50);
      const { data: vipData } = await supabase.from("vip_requests").select("*").order("created_at", { ascending: false }).limit(50);
      
      const totalUsd = salaryData?.filter(r => r.status === "approved").reduce((sum, r) => sum + (r.amount_usd || 0), 0) || 0;
      const today = new Date().toDateString();
      const todayUsd = salaryData?.filter(r => r.status === "approved" && new Date(r.created_at).toDateString() === today).reduce((sum, r) => sum + (r.amount_usd || 0), 0) || 0;
      
      setStats({ totalDiamonds: Math.round(totalUsd * 8500), todayIncome: Math.round(todayUsd * 8500), monthlyGoal: 85 });
      
      // Build recent logs
      const logs = [
        ...(salaryData || []).slice(0, 10).map(s => ({ type: "salary", user: s.user_name, amount: s.amount_usd, time: s.created_at, status: s.status })),
        ...(vipData || []).slice(0, 10).map(v => ({ type: "vip", user: v.user_name, amount: v.vip_level, time: v.created_at, status: "approved" })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);
      setRecentLogs(logs);
    } catch { }
    finally { setLoading(false); }
  };

  return (
    <AdminPageLayout title="إدارة المداخيل" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Hero Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-400" />
                <span className="text-xs text-muted-foreground">إجمالي الأرباح</span>
              </div>
              <p className="text-4xl font-bold font-mono text-emerald-400">{stats.totalDiamonds.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">الماس</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                <TrendingUp className="w-3 h-3" />+12.4%
              </span>
            </motion.div>

            {/* Two cards */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                <p className="text-[10px] text-muted-foreground mb-1">دخل اليوم</p>
                <p className="text-2xl font-bold font-mono text-emerald-400">+{stats.todayIncome.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">الماس</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                <p className="text-[10px] text-muted-foreground mb-1">هدف الشهر</p>
                <p className="text-2xl font-bold font-mono text-sky-400">{stats.monthlyGoal}%</p>
                <div className="w-full h-2 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${stats.monthlyGoal}%` }} />
                </div>
              </motion.div>
            </div>

            {/* Recent Logs */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">سجل المداخيل الأخير</p>
              {recentLogs.map((log, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                  <div className={`w-2 h-2 rounded-full ${log.type === "vip" ? "bg-amber-500" : log.status === "approved" ? "bg-emerald-500" : "bg-rose-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate">{log.user}</p>
                    <p className="text-[9px] text-muted-foreground">{log.type === "vip" ? `VIP ${log.amount}` : `$${log.amount}`}</p>
                  </div>
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    {new Date(log.time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              ))}
              {recentLogs.length === 0 && (
                <div className="text-center py-10 text-muted-foreground"><Target className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد سجلات</p></div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminIncomePage;
