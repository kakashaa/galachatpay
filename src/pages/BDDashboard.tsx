import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
      
      <main className="relative z-10 flex-1 flex flex-col pb-24 max-w-md mx-auto w-full border-x border-white/5 bg-background-light dark:bg-background-dark shadow-2xl">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-14 pb-4 bg-gradient-to-b from-background-dark to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => navigate("/profile")}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
              <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-background-dark">
                <img 
                  alt="Profile" 
                  className="h-full w-full object-cover" 
                  src={"/placeholder.svg"} 
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">مرحباً بعودتك 👋</span>
              <h1 className="text-lg font-bold text-white leading-tight">{bd.bd_name || user?.name || "BD Member"}</h1>
            </div>
          </div>
          <button className="relative p-2 rounded-full hover:bg-white/5 transition-colors text-slate-300 hover:text-white">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background-dark"></span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 space-y-6">
          
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

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate("/bd/add-member")}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3 rounded-xl shadow-lg shadow-primary/25 font-semibold transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              <span className="text-sm">إضافة عضو</span>
            </button>
            <button 
              onClick={() => {
                if (data.wallets_paused) {
                  toast.error("السحب متوقف حالياً");
                } else {
                  navigate("/bd/withdraw");
                }
              }}
              className="flex items-center justify-center gap-2 bg-[#2a2d3e] hover:bg-[#32364a] text-white py-3 rounded-xl border border-white/5 font-semibold transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">currency_exchange</span>
              <span className="text-sm">سحب الأرباح</span>
            </button>
          </div>

          {/* Performance Summary */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 px-1">
              <span className="w-1 h-5 bg-primary rounded-full"></span>
              ملخص الأداء
            </h3>

            {/* Supporters Stats */}
            <div className="bg-[#1c1e2e] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/10">
                    <span className="material-symbols-outlined">diversity_3</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">إجمالي الداعمين</h4>
                    <p className="text-xs text-slate-400">نشاط الشحن</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs font-medium text-slate-300 border border-white/5">
                  {supporters.length} داعم
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-background-dark/50 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] text-slate-400 mb-1">إجمالي العملات المشحونة</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 coin-icon text-[8px]">$</div>
                    <span className="text-sm font-bold text-white">{totalCharges.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-orange-500/5 p-3 rounded-xl border border-orange-500/10">
                  <p className="text-[10px] text-orange-400/80 mb-1">حصة BD ({bd.user_commission_pct || 2}%)</p>
                  <span className="text-lg font-bold text-orange-400">${((totalCharges * (bd.user_commission_pct || 2) / 100) / 7500).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Agencies Stats */}
            <div className="bg-[#1c1e2e] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/10">
                    <span className="material-symbols-outlined">domain</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">إجمالي الوكالات</h4>
                    <p className="text-xs text-slate-400">نشاط الرواتب</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs font-medium text-slate-300 border border-white/5">
                  {agents.length} وكالة
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-background-dark/50 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] text-slate-400 mb-1">إجمالي الرواتب</p>
                  <span className="text-sm font-bold text-white">${(totalSalaries / 7500).toFixed(2)}</span>
                </div>
                <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                  <p className="text-[10px] text-emerald-400/80 mb-1">حصة BD ({bd.agency_commission_pct || 5}%)</p>
                  <span className="text-lg font-bold text-emerald-400">${((totalSalaries * (bd.agency_commission_pct || 5) / 100) / 7500).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Daily/Monthly Profit Stats */}
          <section className="grid grid-cols-2 gap-4 pb-4">
            <div className="bg-[#1c1e2e] border border-white/5 p-4 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">arrow_upward</span> اليوم
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">أرباح اليوم</p>
                <h4 className="text-xl font-bold text-white">${todayProfit.toFixed(2)}</h4>
              </div>
            </div>
            <div className="bg-[#1c1e2e] border border-white/5 p-4 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <span className="material-symbols-outlined text-[18px]">date_range</span>
                </div>
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
        </div>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-[#1c1e2e]/95 backdrop-blur-md border-t border-white/5 pb-6 pt-2 px-6 rounded-t-2xl z-20">
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