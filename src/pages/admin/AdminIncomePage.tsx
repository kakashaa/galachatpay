import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Loader2, TrendingUp, Target, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const AdminIncomePage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalDiamonds: 0, todayIncome: 0, monthlyGoal: 85 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: salaryData } = await supabase.from("salary_requests").select("*").order("created_at", { ascending: false }).limit(50);
      const { data: vipData } = await supabase.from("vip_requests").select("*").order("created_at", { ascending: false }).limit(50);
      const totalUsd = salaryData?.filter(r => r.status === "approved").reduce((sum, r) => sum + (r.amount_usd || 0), 0) || 0;
      const today = new Date().toDateString();
      const todayUsd = salaryData?.filter(r => r.status === "approved" && new Date(r.created_at).toDateString() === today).reduce((sum, r) => sum + (r.amount_usd || 0), 0) || 0;
      setStats({ totalDiamonds: Math.round(totalUsd * 8500), todayIncome: Math.round(todayUsd * 8500), monthlyGoal: 85 });
      const logs = [
        ...(salaryData || []).slice(0, 10).map(s => ({ type: "salary", user: s.user_name, amount: s.amount_usd, time: s.created_at, status: s.status })),
        ...(vipData || []).slice(0, 10).map(v => ({ type: "vip", user: v.user_name, amount: v.vip_level, time: v.created_at, status: "approved" })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);
      setRecentLogs(logs);
    } catch { }
    finally { setLoading(false); }
  };

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  return (
    <AdminPageLayout title="إدارة المداخيل" accentColor="hsl(217 91% 60%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-blue" /></div>
        ) : (
          <>
            {/* Hero Card */}
            <motion.div initial={{ opacity: 0, y: 15, rotateX: 5 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.5 }}
              className="rounded-2xl p-6 space-y-3"
              style={{ background: 'linear-gradient(145deg, rgba(59,130,246,0.12), rgba(59,130,246,0.03))', border: '1px solid rgba(59,130,246,0.15)', boxShadow: '0 8px 32px -8px rgba(59,130,246,0.2)' }}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  <DollarSign className="w-5 h-5 text-admin-blue" />
                </div>
                <span className="text-xs text-muted-foreground">إجمالي الأرباح</span>
              </div>
              <motion.p className="text-4xl font-bold tabular-nums text-admin-blue"
                initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                {stats.totalDiamonds.toLocaleString()}
              </motion.p>
              <p className="text-xs text-muted-foreground">الماس</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(59,130,246,0.12)', color: 'hsl(217 91% 60%)' }}>
                <TrendingUp className="w-3 h-3" />+12.4%
              </span>
            </motion.div>

            {/* Two cards */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl p-4" style={{ ...glassCard, background: 'linear-gradient(145deg, rgba(59,130,246,0.06), rgba(255,255,255,0.02))' }}>
                <p className="text-[10px] text-muted-foreground mb-1">دخل اليوم</p>
                <p className="text-2xl font-bold tabular-nums text-admin-blue">+{stats.todayIncome.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">الماس</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-2xl p-4" style={{ ...glassCard, background: 'linear-gradient(145deg, rgba(6,182,212,0.06), rgba(255,255,255,0.02))' }}>
                <p className="text-[10px] text-muted-foreground mb-1">هدف الشهر</p>
                <p className="text-2xl font-bold tabular-nums text-admin-cyan">{stats.monthlyGoal}%</p>
                <div className="w-full h-2 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${stats.monthlyGoal}%` }} transition={{ delay: 0.4, duration: 1 }}
                    style={{ background: 'linear-gradient(90deg, hsl(188 86% 53%), hsl(188 86% 43%))', boxShadow: '0 0 8px rgba(6,182,212,0.4)' }} />
                </div>
              </motion.div>
            </div>

            {/* Recent Logs */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">سجل المداخيل الأخير</p>
              {recentLogs.map((log, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl" style={glassCard}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: log.type === "vip" ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)' }}>
                    {log.type === "vip" ? <Target className="w-4 h-4 text-admin-amber" /> : <DollarSign className="w-4 h-4 text-admin-emerald" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate">{log.user}</p>
                    <p className="text-[9px] text-muted-foreground">{log.type === "vip" ? `VIP ${log.amount}` : `$${log.amount}`}</p>
                  </div>
                  <div className="text-left">
                    <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold"
                      style={log.status === "approved" ? { background: 'rgba(16,185,129,0.12)', color: 'hsl(160 84% 39%)' } : log.status === "pending" ? { background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)' } : { background: 'rgba(244,63,94,0.12)', color: 'hsl(350 89% 60%)' }}>
                      {log.status === "approved" ? "مقبول" : log.status === "pending" ? "معلق" : "مرفوض"}
                    </span>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(log.time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </motion.div>
              ))}
              {recentLogs.length === 0 && <div className="text-center py-10 text-muted-foreground"><Target className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد سجلات</p></div>}
            </div>
          </>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminIncomePage;
