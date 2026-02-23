import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
  const [totalCharges, setTotalCharges] = useState(0);
  const [totalSalaries, setTotalSalaries] = useState(0);
  const [tab, setTab] = useState<'dashboard' | 'supporters' | 'agents' | 'wallet' | 'settings'>('dashboard');

  const loadData = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00Z`;

      const [dashRes, todayLogsRes, monthLogsRes] = await Promise.all([
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
      ]);

      const res = dashRes.data;
      if (res?.bd) {
        setData(res);
      } else {
        navigate("/bd", { replace: true });
      }

      // Calculate totals
      const todaySum = todayLogsRes.data?.reduce((sum, log) => sum + (log.amount || 0), 0) || 0;
      const monthSum = monthLogsRes.data?.reduce((sum, log) => sum + (log.amount || 0), 0) || 0;
      
      setTodayProfit(todaySum);
      setMonthlyProfit(monthSum);

      // Calculate total source amounts from monthly logs (approximate for dashboard view)
      const chargesSum = monthLogsRes.data
        ?.filter(l => l.member_type !== 'agency')
        .reduce((sum, log) => sum + (log.source_amount || 0), 0) || 0;
        
      const salariesSum = monthLogsRes.data
        ?.filter(l => l.member_type === 'agency')
        .reduce((sum, log) => sum + (log.source_amount || 0), 0) || 0;

      setTotalCharges(chargesSum);
      setTotalSalaries(salariesSum);

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
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display antialiased selection:bg-primary selection:text-white" dir="rtl">
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-20"></div>
      
      <main className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full border-x border-white/5 bg-background-light dark:bg-background-dark shadow-2xl">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-14 pb-4 bg-gradient-to-b from-background-dark to-transparent">
          <div className="flex items-center gap-3">
            {tab !== 'dashboard' ? (
              <button 
                onClick={() => setTab('dashboard')}
                className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-300 hover:text-white"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            ) : (
              <button 
                onClick={() => navigate("/")}
                className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-300 hover:text-white"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            )}
            <div className="flex flex-col">
              {tab === 'dashboard' && <span className="text-xs text-slate-400 font-medium">مرحباً بعودتك 👋</span>}
              <h1 className="text-lg font-bold text-white leading-tight">
                {tab === 'dashboard' ? (bd.bd_name || user?.name || "BD Member") : 
                 tab === 'supporters' ? 'الداعمين' :
                 tab === 'agents' ? 'الوكالات' :
                 tab === 'wallet' ? 'المحفظة' : 'الإعدادات'}
              </h1>
            </div>
          </div>
          <button className="relative p-2 rounded-full hover:bg-white/5 transition-colors text-slate-300 hover:text-white">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background-dark"></span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-6">
          
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
                      <h2 className="text-4xl font-bold text-white tracking-tight">${(bd.available_balance || 0).toFixed(2)}</h2>
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
              {/* Main Profit Card */}
              <section className="relative group mt-2">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-purple-600/50 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition duration-500"></div>
                <div className="relative overflow-hidden rounded-2xl bg-[#1c1e2e] border border-white/10 p-6 shadow-xl">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl"></div>
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div>
                      <p className="text-sm text-slate-400 mb-1 font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-primary">monetization_on</span>
                        إجمالي أرباح BD
                      </p>
                      <h2 className="text-4xl font-bold text-white tracking-tight">${(bd.total_earned || 0).toFixed(2)}</h2>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                    </div>
                  </div>
                  <div className="mb-6 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="w-5 h-5 coin-icon text-[10px]">$</div>
                      <span className="text-sm font-medium text-yellow-500">{((bd.total_earned || 0) * 7500).toLocaleString()} عملة</span>
                      <span className="text-[10px] text-slate-500 mr-1">(1$ = 7500)</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 mb-1">كود BD الخاص بك</span>
                      <span className="text-base font-mono font-semibold text-slate-200 tracking-wider">{bd.referral_code}</span>
                    </div>
                    <button 
                      onClick={copyReferralCode}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all active:scale-95 group/btn"
                    >
                      <span className="text-xs font-medium text-primary group-hover/btn:text-white transition-colors">نسخ</span>
                      <span className="material-symbols-outlined text-[16px] text-primary group-hover/btn:text-white transition-colors">content_copy</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Supporters & Agents Cards */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setTab('supporters')} className="rounded-2xl bg-[#1c1e2e] border border-white/10 p-4 text-right hover:border-primary/30 transition-all active:scale-[0.98]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-400 text-base">diversity_3</span>
                    <span className="text-xs text-slate-400">الداعمين</span>
                  </div>
                  <p className="text-xl font-bold text-white">{supporters.length}</p>
                  <p className="text-[10px] text-slate-500 mt-1">نسبة {bd.user_commission_pct || 2}%</p>
                </button>
                <button onClick={() => setTab('agents')} className="rounded-2xl bg-[#1c1e2e] border border-white/10 p-4 text-right hover:border-primary/30 transition-all active:scale-[0.98]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-purple-400 text-base">domain</span>
                    <span className="text-xs text-slate-400">الوكالات</span>
                  </div>
                  <p className="text-xl font-bold text-white">{agents.length}</p>
                  <p className="text-[10px] text-slate-500 mt-1">نسبة {bd.agency_commission_pct || 5}%</p>
                </button>
              </div>

              {/* Today & Monthly Profit */}
              <section className="rounded-2xl bg-[#1c1e2e] border border-white/10 p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="material-symbols-outlined text-primary text-sm">today</span>
                    <span className="text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">arrow_upward</span> اليوم
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">أرباح اليوم</p>
                    <h4 className="text-xl font-bold text-white">${todayProfit.toFixed(2)}</h4>
                  </div>
                </div>
                <div className="w-px h-12 bg-white/10"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
                    <span className="text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">arrow_upward</span> الشهر
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">أرباح الشهر</p>
                    <h4 className="text-xl font-bold text-white">${monthlyProfit.toFixed(2)}</h4>
                  </div>
                </div>
              </section>

              <div className="h-6"></div>
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#1c1e2e]/95 backdrop-blur-md border-t border-white/5 pb-6 pt-2 px-6 rounded-t-2xl z-20">
          <div className="flex justify-between items-center">
            <button onClick={() => setTab('dashboard')} className="flex flex-col items-center gap-1 group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${tab === 'dashboard' ? '' : 'opacity-70'}`}>
                {tab === 'dashboard' && <span className="absolute inset-0 bg-primary/20 blur-sm rounded-xl opacity-100"></span>}
                <span className={`material-symbols-outlined relative z-10 ${tab === 'dashboard' ? 'text-primary' : 'text-slate-400 group-hover:text-white'}`}>dashboard</span>
              </div>
              <span className={`text-[10px] font-bold ${tab === 'dashboard' ? 'text-white' : 'text-slate-400'}`}>لوحة التحكم</span>
            </button>

            <button onClick={() => setTab('supporters')} className="flex flex-col items-center gap-1 group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${tab === 'supporters' ? '' : 'opacity-70'}`}>
                {tab === 'supporters' && <span className="absolute inset-0 bg-primary/20 blur-sm rounded-xl opacity-100"></span>}
                <span className={`material-symbols-outlined relative z-10 ${tab === 'supporters' ? 'text-primary' : 'text-slate-400 group-hover:text-white'}`}>diversity_3</span>
              </div>
              <span className={`text-[10px] font-medium ${tab === 'supporters' ? 'text-white' : 'text-slate-400'}`}>الداعمين</span>
            </button>

            <button onClick={() => setTab('agents')} className="flex flex-col items-center gap-1 group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${tab === 'agents' ? '' : 'opacity-70'}`}>
                {tab === 'agents' && <span className="absolute inset-0 bg-primary/20 blur-sm rounded-xl opacity-100"></span>}
                <span className={`material-symbols-outlined relative z-10 ${tab === 'agents' ? 'text-primary' : 'text-slate-400 group-hover:text-white'}`}>domain</span>
              </div>
              <span className={`text-[10px] font-medium ${tab === 'agents' ? 'text-white' : 'text-slate-400'}`}>الوكالات</span>
            </button>

            <button onClick={() => setTab('wallet')} className="flex flex-col items-center gap-1 group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${tab === 'wallet' ? '' : 'opacity-70'}`}>
                {tab === 'wallet' && <span className="absolute inset-0 bg-primary/20 blur-sm rounded-xl opacity-100"></span>}
                <span className={`material-symbols-outlined relative z-10 ${tab === 'wallet' ? 'text-primary' : 'text-slate-400 group-hover:text-white'}`}>account_balance_wallet</span>
              </div>
              <span className={`text-[10px] font-medium ${tab === 'wallet' ? 'text-white' : 'text-slate-400'}`}>المحفظة</span>
            </button>

            <button onClick={() => setTab('settings')} className="flex flex-col items-center gap-1 group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${tab === 'settings' ? '' : 'opacity-70'}`}>
                {tab === 'settings' && <span className="absolute inset-0 bg-primary/20 blur-sm rounded-xl opacity-100"></span>}
                <span className={`material-symbols-outlined relative z-10 ${tab === 'settings' ? 'text-primary' : 'text-slate-400 group-hover:text-white'}`}>settings</span>
              </div>
              <span className={`text-[10px] font-medium ${tab === 'settings' ? 'text-white' : 'text-slate-400'}`}>الإعدادات</span>
            </button>
          </div>
        </nav>
      </main>
    </div>
  );
};

export default BDDashboard;