import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import BDSupportersTab from "@/components/bd/BDSupportersTab";
import BDAgentsTab from "@/components/bd/BDAgentsTab";

interface BDData {
  bd: any;
  supporters: any[];
  agents: any[];
  withdrawals: any[];
  wallets_paused: boolean;
  auto_withdrawal: boolean;
}

const BDDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<BDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayProfit, setTodayProfit] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [dailyLogs, setDailyLogs] = useState<{day: string; amount: number}[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [tab, setTab] = useState<'dashboard' | 'supporters' | 'agents' | 'wallet' | 'settings'>('dashboard');

  const loadData = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00Z`;

      // 7 days ago for sparkline
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      weekAgo.setHours(0, 0, 0, 0);

      const [dashRes, todayLogsRes, monthLogsRes, weekLogsRes] = await Promise.all([
        supabase.functions.invoke("bd-manage", {
          body: { action: "get_dashboard", bd_uuid: user.uuid },
        }),
        supabase
          .from("bd_commission_logs")
          .select("amount")
          .eq("bd_uuid", user.uuid)
          .gte("created_at", todayStart.toISOString()),
        supabase
          .from("bd_commission_logs")
          .select("amount, source_amount, member_type")
          .eq("bd_uuid", user.uuid)
          .gte("created_at", monthStart),
        supabase
          .from("bd_commission_logs")
          .select("amount, created_at")
          .eq("bd_uuid", user.uuid)
          .gte("created_at", weekAgo.toISOString())
          .order("created_at", { ascending: true }),
      ]);

      const res = dashRes.data;
      if (res?.bd) {
        setData(res);
      } else {
        navigate("/bd", { replace: true });
      }

      const todaySum = todayLogsRes.data?.reduce((sum, log) => sum + (log.amount || 0), 0) || 0;
      const monthSum = monthLogsRes.data?.reduce((sum, log) => sum + (log.amount || 0), 0) || 0;
      
      setTodayProfit(todaySum);
      setMonthlyProfit(monthSum);

      // Group week logs by day for sparkline
      const dayMap: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekAgo);
        d.setDate(d.getDate() + i);
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      weekLogsRes.data?.forEach(log => {
        const day = log.created_at.slice(0, 10);
        if (dayMap[day] !== undefined) dayMap[day] += log.amount || 0;
      });
      setDailyLogs(Object.entries(dayMap).map(([day, amount]) => ({ day, amount })));

    } catch {
      toast.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [user?.uuid, navigate]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const copyReferralCode = () => {
    if (data?.bd?.referral_code) {
      navigator.clipboard.writeText(data.bd.referral_code);
      toast.success("تم نسخ كود الإحالة");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.bd) return null;

  const { bd, supporters, agents } = data;

  return (
    <div className="mobile-container bg-background" dir="rtl">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-4 pt-10 pb-3">
          <div className="flex items-center gap-2">
            {tab !== 'dashboard' ? (
              <button 
                onClick={() => setTab('dashboard')}
                className="p-1.5 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            ) : (
              <button 
                onClick={() => navigate("/")}
                className="p-1.5 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            )}
            <div className="flex flex-col">
              {tab === 'dashboard' && <span className="text-[10px] text-muted-foreground">مرحباً 👋</span>}
              <h1 className="text-sm font-bold text-foreground leading-tight">
                {tab === 'dashboard' ? (bd.bd_name || user?.name || "BD") : 
                 tab === 'supporters' ? 'الداعمين' :
                 tab === 'agents' ? 'الوكالات' :
                 tab === 'wallet' ? 'المحفظة' : 'الإعدادات'}
              </h1>
            </div>
          </div>
          <button className="relative p-1.5 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4 space-y-4">
          
          {tab === 'supporters' ? (
            <BDSupportersTab supporters={supporters} commissionPct={bd.user_commission_pct || 2} />
          ) : tab === 'agents' ? (
            <BDAgentsTab agents={agents} commissionPct={bd.agency_commission_pct || 5} />
          ) : tab === 'wallet' ? (
            /* ── Wallet Tab ── */
            <div className="space-y-5 mt-2 animate-fade-in">
              {/* Balance Card */}
              <section className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/40 to-primary/40 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition duration-500"></div>
                <div className="relative overflow-hidden rounded-2xl bg-[#1c1e2e] border border-white/10 p-6 shadow-xl">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <p className="text-sm text-slate-400 mb-1 font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-emerald-400">account_balance_wallet</span>
                        الرصيد المتاح
                      </p>
                      <h2 className="text-2xl font-bold text-foreground tracking-tight">${(bd.available_balance || 0).toFixed(2)}</h2>
                    </div>
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <span className="material-symbols-outlined text-emerald-400">savings</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 relative z-10">
                    <div className="w-5 h-5 coin-icon text-[10px]">$</div>
                    <span className="text-sm font-medium text-yellow-500">{((bd.available_balance || 0) * 7500).toLocaleString()} عملة</span>
                  </div>
                </div>
              </section>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#1c1e2e] border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-base">trending_up</span>
                    <span className="text-xs text-slate-400">إجمالي المكتسب</span>
                  </div>
                  <p className="text-xl font-bold text-white">${(bd.total_earned || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-2xl bg-[#1c1e2e] border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-emerald-400 text-base">calendar_month</span>
                    <span className="text-xs text-slate-400">أرباح الشهر</span>
                  </div>
                  <p className="text-xl font-bold text-white">${(bd.current_month_earnings || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Withdraw Button */}
              <button
                onClick={() => navigate("/bd/withdraw")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-lg">payments</span>
                سحب الأرباح
              </button>

              {/* Withdrawal History */}
              <section className="rounded-2xl bg-[#1c1e2e] border border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                  <span className="material-symbols-outlined text-primary text-base">receipt_long</span>
                  <h3 className="text-sm font-bold text-white">آخر عمليات السحب</h3>
                </div>
                {(data?.withdrawals || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <span className="material-symbols-outlined text-3xl mb-2 block">history</span>
                    <p className="text-xs">لا توجد عمليات سحب بعد</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {(data?.withdrawals || []).slice(0, 5).map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${w.status === 'completed' ? 'bg-emerald-500/10' : w.status === 'rejected' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
                            <span className={`material-symbols-outlined text-base ${w.status === 'completed' ? 'text-emerald-400' : w.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                              {w.status === 'completed' ? 'check_circle' : w.status === 'rejected' ? 'cancel' : 'pending'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white">${(w.amount || 0).toFixed(2)}</p>
                            <p className="text-[10px] text-slate-500">{new Date(w.created_at).toLocaleDateString('ar')}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${w.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : w.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          {w.status === 'completed' ? 'مكتمل' : w.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <div className="h-6"></div>
            </div>
          ) : tab === 'settings' ? (
            /* ── Settings Tab ── */
            <div className="space-y-4 mt-2 animate-fade-in">
              {/* Profile Section */}
              <section className="rounded-2xl bg-[#1c1e2e] border border-white/10 p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                    {(bd.bd_name || "B")[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white">{bd.bd_name || user?.name}</h3>
                    <p className="text-xs text-slate-400">UUID: {user?.uuid?.slice(0, 8)}...</p>
                    <p className="text-xs text-slate-400">كود: {bd.referral_code}</p>
                  </div>
                </div>
              </section>

              {/* Commission Rates */}
              <section className="rounded-2xl bg-[#1c1e2e] border border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                  <span className="material-symbols-outlined text-primary text-base">percent</span>
                  <h3 className="text-sm font-bold text-white">نسب العمولة</h3>
                </div>
                <div className="divide-y divide-white/5">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-400 text-base">diversity_3</span>
                      <span className="text-xs text-slate-300">عمولة الداعمين</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{bd.user_commission_pct || 2}%</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-purple-400 text-base">domain</span>
                      <span className="text-xs text-slate-300">عمولة الوكالات</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{bd.agency_commission_pct || 5}%</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-base">local_atm</span>
                      <span className="text-xs text-slate-300">عمولة المضيفين</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{bd.host_commission_pct || 3}%</span>
                  </div>
                </div>
              </section>

              {/* Quick Actions */}
              <section className="rounded-2xl bg-[#1c1e2e] border border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                  <span className="material-symbols-outlined text-primary text-base">bolt</span>
                  <h3 className="text-sm font-bold text-white">إجراءات سريعة</h3>
                </div>
                <div className="divide-y divide-white/5">
                  <button onClick={() => navigate("/bd/add")} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-base">person_add</span>
                      <span className="text-xs text-slate-300">إضافة عضو</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 text-base">chevron_left</span>
                  </button>
                  <button onClick={() => navigate("/bd/withdraw")} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-yellow-400 text-base">payments</span>
                      <span className="text-xs text-slate-300">سحب الأرباح</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 text-base">chevron_left</span>
                  </button>
                  <button onClick={() => { copyReferralCode(); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-400 text-base">share</span>
                      <span className="text-xs text-slate-300">مشاركة كود الإحالة</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 text-base">chevron_left</span>
                  </button>
                </div>
              </section>

              {/* Account Info */}
              <section className="rounded-2xl bg-[#1c1e2e] border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary text-base">info</span>
                  <h3 className="text-sm font-bold text-white">معلومات الحساب</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الحالة</span>
                    <span className={`font-medium ${bd.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                      {bd.is_active ? '✅ نشط' : '❌ غير نشط'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الهدف الشهري</span>
                    <span className="font-medium text-white">${bd.monthly_goal || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">عدد الداعمين</span>
                    <span className="font-medium text-white">{supporters.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">عدد الوكالات</span>
                    <span className="font-medium text-white">{agents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">تاريخ الانضمام</span>
                    <span className="font-medium text-white">{new Date(bd.created_at).toLocaleDateString('ar')}</span>
                  </div>
                </div>
              </section>
              <div className="h-6"></div>
            </div>
          ) : (
            <>
              {/* ── Stock-Style Wallet Card with Sparkline ── */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="relative group mt-2"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-emerald-500/30 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative overflow-hidden rounded-2xl bg-[#1c1e2e] border border-white/10 p-5 shadow-xl">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl"></div>

                  {/* Balance */}
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <p className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-primary">account_balance_wallet</span>
                        الرصيد المتاح
                      </p>
                      <h2 className="text-3xl font-bold text-white tracking-tight">${(bd.available_balance || 0).toFixed(2)}</h2>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${todayProfit > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        <span className="material-symbols-outlined text-[12px]">{todayProfit > 0 ? 'trending_up' : 'trending_flat'}</span>
                        {todayProfit > 0 ? `+$${todayProfit.toFixed(2)}` : '$0.00'} اليوم
                      </div>
                    </div>
                  </div>

                  {/* Mini Sparkline SVG */}
                  {dailyLogs.length > 0 && (() => {
                    const max = Math.max(...dailyLogs.map(d => d.amount), 0.01);
                    const h = 40;
                    const w = 280;
                    const points = dailyLogs.map((d, i) => {
                      const x = (i / (dailyLogs.length - 1 || 1)) * w;
                      const y = h - (d.amount / max) * (h - 4) - 2;
                      return `${x},${y}`;
                    }).join(' ');
                    const trend = dailyLogs[dailyLogs.length - 1]?.amount >= dailyLogs[0]?.amount;
                    const color = trend ? '#34d399' : '#f87171';
                    const fillPoints = `0,${h} ${points} ${w},${h}`;
                    return (
                      <div className="relative z-10 mb-3 -mx-1">
                        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                              <stop offset="100%" stopColor={color} stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <polygon points={fillPoints} fill="url(#sparkFill)" />
                          <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex justify-between text-[9px] text-slate-500 px-1 mt-0.5">
                          {dailyLogs.map((d, i) => (
                            <span key={i}>{d.day.slice(8)}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-2 relative z-10 mb-3">
                    <div className="bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/5">
                      <p className="text-[9px] text-slate-500 uppercase mb-0.5">اليوم</p>
                      <p className="text-sm font-bold text-white">${todayProfit.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/5">
                      <p className="text-[9px] text-slate-500 uppercase mb-0.5">الشهر</p>
                      <p className="text-sm font-bold text-white">${monthlyProfit.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/5">
                      <p className="text-[9px] text-slate-500 uppercase mb-0.5">الإجمالي</p>
                      <p className="text-sm font-bold text-primary">${(bd.total_earned || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Supporters & Agents mini cards inside wallet */}
                  <div className="grid grid-cols-2 gap-2 relative z-10">
                    <button onClick={() => setTab('supporters')} className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 rounded-xl p-3 transition-all active:scale-[0.97]">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-400 text-base">diversity_3</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">الداعمين</p>
                        <p className="text-base font-bold text-white">{supporters.length}</p>
                      </div>
                    </button>
                    <button onClick={() => setTab('agents')} className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 rounded-xl p-3 transition-all active:scale-[0.97]">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-400 text-base">domain</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">الوكالات</p>
                        <p className="text-base font-bold text-white">{agents.length}</p>
                      </div>
                    </button>
                  </div>

                  {/* Referral Code */}
                  <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">tag</span>
                      <span className="text-sm font-mono font-semibold text-slate-200 tracking-wider">{bd.referral_code}</span>
                    </div>
                    <button 
                      onClick={copyReferralCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all active:scale-95"
                    >
                      <span className="text-[11px] font-medium text-primary">نسخ</span>
                      <span className="material-symbols-outlined text-[14px] text-primary">content_copy</span>
                    </button>
                  </div>
                </div>
              </motion.section>

              {/* ── Performance Summary ── */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
                className="rounded-2xl bg-[#1c1e2e] border border-white/10 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">analytics</span>
                    <h3 className="text-sm font-bold text-white">ملخص الأداء</h3>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    آخر 7 أيام
                  </div>
                </div>

                {/* Performance bars for each day */}
                <div className="px-4 pb-4 pt-2">
                  {dailyLogs.length > 0 && (() => {
                    const max = Math.max(...dailyLogs.map(d => d.amount), 0.01);
                    const dayNames = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
                    return (
                      <div className="space-y-2">
                        {dailyLogs.map((d, i) => {
                          const pct = (d.amount / max) * 100;
                          const dayDate = new Date(d.day);
                          const dayName = dayNames[dayDate.getDay()];
                          const isToday = d.day === new Date().toISOString().slice(0, 10);
                          const strength = pct > 70 ? 'strong' : pct > 30 ? 'normal' : 'weak';
                          const barColor = strength === 'strong' ? 'from-emerald-500 to-emerald-400' : strength === 'normal' ? 'from-yellow-500 to-amber-400' : 'from-red-400 to-orange-400';
                          const dotColor = strength === 'strong' ? 'bg-emerald-400' : strength === 'normal' ? 'bg-yellow-400' : 'bg-red-400';

                          return (
                            <motion.div 
                              key={d.day}
                              initial={{ opacity: 0, x: -20 }} 
                              animate={{ opacity: 1, x: 0 }} 
                              transition={{ delay: i * 0.05 + 0.3 }}
                              className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isToday ? 'bg-white/[0.06] border border-white/10' : ''}`}
                            >
                              <div className="w-10 text-right">
                                <p className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'text-slate-400'}`}>{dayName}</p>
                                <p className="text-[8px] text-slate-600">{d.day.slice(5)}</p>
                              </div>
                              <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden relative">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.max(pct, 3)}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.08 + 0.3, ease: "easeOut" }}
                                  className={`h-full bg-gradient-to-r ${barColor} rounded-full relative`}
                                >
                                  <div className={`absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${dotColor} shadow-lg animate-pulse`}></div>
                                </motion.div>
                              </div>
                              <div className="w-14 text-left">
                                <span className="text-[11px] font-bold text-white">${d.amount.toFixed(2)}</span>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 px-4 pb-3 border-t border-white/5 pt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-[9px] text-slate-400">قوي</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <span className="text-[9px] text-slate-400">متوسط</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="text-[9px] text-slate-400">ضعيف</span>
                  </div>
                </div>
              </motion.section>

              {/* ── All Members List with Search ── */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-2xl bg-[#1c1e2e] border border-white/10 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">groups</span>
                    <h3 className="text-sm font-bold text-white">الأعضاء</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">{supporters.length + agents.length} عضو</span>
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[16px]">search</span>
                    <input
                      type="text"
                      placeholder="ابحث بالاسم أو ID..."
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 pr-9 pl-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>
                </div>

                {/* Members list */}
                <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                  {[
                    ...supporters.map(s => ({ ...s, _type: 'supporter' as const })),
                    ...agents.map(a => ({ ...a, _type: 'agent' as const })),
                  ]
                    .filter(m => {
                      if (!memberSearch) return true;
                      const q = memberSearch.toLowerCase();
                      return m.member_name?.toLowerCase().includes(q) || m.member_uuid?.includes(q);
                    })
                    .sort((a, b) => (b.current_month_commission || 0) - (a.current_month_commission || 0))
                    .map((member, idx) => {
                      const comm = member.current_month_commission || 0;
                      const maxComm = Math.max(...supporters.map(s => s.current_month_commission || 0), ...agents.map(a => a.current_month_commission || 0), 0.01);
                      const pct = (comm / maxComm) * 100;
                      const isSupporter = member._type === 'supporter';

                      return (
                        <motion.div
                          key={member.member_uuid}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 + 0.4 }}
                          onClick={() => setTab(isSupporter ? 'supporters' : 'agents')}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          {/* Rank */}
                          <div className="w-5 text-center">
                            {idx < 3 ? (
                              <span className={`text-xs font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : 'text-amber-600'}`}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">{idx + 1}</span>
                            )}
                          </div>

                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${isSupporter ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                            {member.member_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-white truncate">{member.member_name || "مستخدم"}</p>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${isSupporter ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                {isSupporter ? 'داعم' : 'وكالة'}
                              </span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.max(pct, 2)}%` }}
                                  transition={{ duration: 0.6, delay: idx * 0.04 + 0.5 }}
                                  className={`h-full rounded-full ${isSupporter ? 'bg-blue-400' : 'bg-purple-400'}`}
                                />
                              </div>
                              <span className="text-[9px] text-slate-500 font-mono">#{member.member_uuid?.slice(-4)}</span>
                            </div>
                          </div>

                          {/* Commission */}
                          <div className="text-left">
                            <p className={`text-sm font-bold ${comm > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                              ${comm.toFixed(2)}
                            </p>
                            <p className="text-[8px] text-slate-500">عمولة</p>
                          </div>
                        </motion.div>
                      );
                    })}

                  {supporters.length + agents.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <span className="material-symbols-outlined text-3xl mb-2 block">group_off</span>
                      <p className="text-xs">لا يوجد أعضاء حالياً</p>
                    </div>
                  )}
                </div>
              </motion.section>

              <div className="h-6"></div>
            </>
          )}
        </div>

        <nav className="shrink-0 bg-card/95 backdrop-blur-md border-t border-border/30 pb-[env(safe-area-inset-bottom,8px)] pt-1.5 px-4">
          <div className="flex justify-between items-center">
            {[
              { id: 'dashboard' as const, icon: 'dashboard', label: 'الرئيسية' },
              { id: 'supporters' as const, icon: 'diversity_3', label: 'الداعمين' },
              { id: 'agents' as const, icon: 'domain', label: 'الوكالات' },
              { id: 'wallet' as const, icon: 'account_balance_wallet', label: 'المحفظة' },
              { id: 'settings' as const, icon: 'settings', label: 'الإعدادات' },
            ].map(item => (
              <button key={item.id} onClick={() => setTab(item.id)} className="flex flex-col items-center gap-0.5 py-1 px-2">
                <span className={`material-symbols-outlined text-xl ${tab === item.id ? 'text-primary' : 'text-muted-foreground'}`}>{item.icon}</span>
                <span className={`text-[9px] font-bold ${tab === item.id ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
    </div>
  );
};

export default BDDashboard;