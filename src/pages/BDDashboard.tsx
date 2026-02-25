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
  const [dailyLogs, setDailyLogs] = useState<{day: string; amount: number}[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [tab, setTab] = useState<'dashboard' | 'supporters' | 'agents' | 'wallet' | 'settings'>('dashboard');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (syncing || !user?.uuid) return;
    setSyncing(true);
    try {
      const res = await supabase.functions.invoke("bd-sync", { body: { manual: true } });
      const result = res.data;
      if (result?.skipped) {
        toast.info("المزامنة قيد التنفيذ بالفعل، حاول بعد قليل");
      } else {
        const infoUpdates = result?.info_updates || 0;
        const profitSynced = result?.profit_synced || 0;
        setLastSync(new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }));
        await loadData();
        const parts: string[] = [];
        if (infoUpdates > 0) parts.push(`${infoUpdates} تحديث معلومات`);
        if (profitSynced > 0) parts.push(`${profitSynced} ربح BD`);
        toast.success(`✅ تم التحديث${parts.length > 0 ? ': ' + parts.join('، ') : ''}`);
      }
    } catch {
      toast.error("فشل التحديث، حاول مرة أخرى");
    } finally {
      setSyncing(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      weekAgo.setHours(0, 0, 0, 0);

      const [dashRes, todayLogsRes, weekLogsRes] = await Promise.all([
        supabase.functions.invoke("bd-manage", { body: { action: "get_dashboard", bd_uuid: user.uuid } }),
        supabase.from("bd_commission_logs").select("amount").eq("bd_uuid", user.uuid).gte("created_at", todayStart.toISOString()),
        supabase.from("bd_commission_logs").select("amount, created_at").eq("bd_uuid", user.uuid).gte("created_at", weekAgo.toISOString()).order("created_at", { ascending: true }),
      ]);

      const res = dashRes.data;
      if (res?.bd) { setData(res); } else { navigate("/bd", { replace: true }); }

      setTodayProfit(todayLogsRes.data?.reduce((sum, log) => sum + (log.amount || 0), 0) || 0);
      // Use current_month_earnings from settings (admin-editable, authoritative source)
      setMonthlyProfit(Number(res?.bd?.current_month_earnings || 0));

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

  // Load data on mount, refresh every 30s, and listen for realtime commission changes
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);

    // Realtime: refresh immediately when commission logs change for this BD
    const channel = supabase
      .channel('bd-dashboard-today')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bd_commission_logs',
          filter: `bd_uuid=eq.${user?.uuid}`,
        },
        () => {
          // Refetch today's profit immediately
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          supabase
            .from("bd_commission_logs")
            .select("amount")
            .eq("bd_uuid", user?.uuid || "")
            .gte("created_at", todayStart.toISOString())
            .then(({ data: logs }) => {
              const total = logs?.reduce((sum, log) => sum + (log.amount || 0), 0) || 0;
              setTodayProfit(total);
            });
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadData, user?.uuid]);

  const copyReferralCode = () => {
    if (data?.bd?.referral_code) {
      navigator.clipboard.writeText(data.bd.referral_code);
      toast.success("تم نسخ كود الإحالة");
    }
  };

  if (loading) {
    return (
      <div className="mobile-container bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.bd) return null;
  const { bd, supporters, agents } = data;

  const renderStockChart = () => {
    if (dailyLogs.length === 0) return null;
    const max = Math.max(...dailyLogs.map(d => d.amount), 0.01);
    const min = Math.min(...dailyLogs.map(d => d.amount));
    const h = 80; const w = 350; const padY = 6;
    const range = max - min || 0.01;
    const points = dailyLogs.map((d, i) => {
      const x = (i / (dailyLogs.length - 1 || 1)) * w;
      const y = padY + (1 - (d.amount - min) / range) * (h - padY * 2);
      return `${x},${y}`;
    }).join(' ');
    const lastPt = dailyLogs[dailyLogs.length - 1];
    const firstPt = dailyLogs[0];
    const trend = (lastPt?.amount || 0) >= (firstPt?.amount || 0);
    const color = trend ? '#34d399' : '#f87171';
    const fillPoints = `0,${h} ${points} ${w},${h}`;
    const pctChange = firstPt?.amount ? (((lastPt?.amount || 0) - firstPt.amount) / firstPt.amount * 100) : 0;
    const lastX = w;
    const lastY = padY + (1 - ((lastPt?.amount || 0) - min) / range) * (h - padY * 2);
    const dayNames = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

    return (
      <div className="css-fade-up rounded-2xl bg-card border border-border/40 overflow-hidden mt-1">
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-sm">analytics</span>
            <span className="text-xs font-bold text-foreground">ملخص الأداء</span>
          </div>
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${trend ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className="material-symbols-outlined text-[12px]">{trend ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
            {Math.abs(pctChange).toFixed(1)}%
          </div>
        </div>
        <div className="px-2 pb-1 relative">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: '80px' }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((lvl, gi) => (
              <line key={gi} x1="0" y1={padY + lvl * (h - padY * 2)} x2={w} y2={padY + lvl * (h - padY * 2)} stroke="rgba(255,255,255,0.06)" strokeDasharray="6 4" />
            ))}
            <polygon points={fillPoints} fill="url(#perfFill)" />
            <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={lastX} cy={lastY} r="4" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
          </svg>
          <div className="absolute top-0 left-2 h-[80px] flex flex-col justify-between py-1 pointer-events-none">
            <span className="text-[8px] text-muted-foreground">${max.toFixed(2)}</span>
            <span className="text-[8px] text-muted-foreground">${((max + min) / 2).toFixed(2)}</span>
            <span className="text-[8px] text-muted-foreground">${min.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground px-3 pb-2">
          {dailyLogs.map((d, i) => (
            <span key={i}>{dayNames[new Date(d.day).getDay()]}</span>
          ))}
        </div>
      </div>
    );
  };

  const renderMembersList = () => {
    const allMembers = [
      ...supporters.map(s => ({ ...s, _type: 'supporter' as const })),
      ...agents.map(a => ({ ...a, _type: 'agent' as const })),
    ]
      .filter(m => {
        if (!memberSearch) return true;
        const q = memberSearch.toLowerCase();
        return m.member_name?.toLowerCase().includes(q) || m.member_uuid?.includes(q);
      })
      .sort((a, b) => (b.current_month_commission || 0) - (a.current_month_commission || 0));

    const maxComm = Math.max(...allMembers.map(m => m.current_month_commission || 0), 0.01);

    return (
      <div className="css-fade-up-d2 rounded-2xl bg-card border border-border/40 overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-sm">groups</span>
            <span className="text-xs font-bold text-foreground">الأعضاء</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{supporters.length + agents.length} عضو</span>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[14px]">search</span>
            <input
              type="text"
              placeholder="ابحث بالاسم أو ID..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-border/30 rounded-lg py-1.5 pr-8 pl-3 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </div>
        <div className="divide-y divide-border/20 max-h-[280px] overflow-y-auto">
          {allMembers.map((member, idx) => {
            const comm = member.current_month_commission || 0;
            const pct = (comm / maxComm) * 100;
            const isSup = member._type === 'supporter';
            return (
              <div
                key={member.member_uuid}
                onClick={() => setTab(isSup ? 'supporters' : 'agents')}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="w-4 text-center">
                  {idx < 3 ? (
                    <span className="text-[10px]">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground font-mono">{idx + 1}</span>
                  )}
                </div>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold border ${isSup ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                  {member.member_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-[11px] font-bold text-foreground truncate">{member.member_name || "مستخدم"}</p>
                    <span className={`text-[7px] font-bold px-1 py-0.5 rounded-full ${isSup ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {isSup ? 'داعم' : 'وكالة'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full css-bar-fill ${isSup ? 'bg-blue-400' : 'bg-purple-400'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                    <span className="text-[8px] text-muted-foreground font-mono">#{member.member_uuid}</span>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-[11px] font-bold ${comm > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>${comm.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
          {allMembers.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <span className="material-symbols-outlined text-2xl mb-1 block">group_off</span>
              <p className="text-[10px]">{memberSearch ? 'لا توجد نتائج' : 'لا يوجد أعضاء'}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mobile-container bg-background" dir="rtl">
      {/* Header */}
      <header className="shrink-0 px-4 pt-10 pb-2">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => tab !== 'dashboard' ? setTab('dashboard') : navigate("/")}
              className="p-1.5 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleManualSync()}
              disabled={syncing}
              className="p-1.5 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-xl ${syncing ? 'animate-spin' : ''}`}>sync</span>
            </button>
            <button
              onClick={() => navigate("/notifications")}
              className="relative p-1.5 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
            </button>
          </div>
        </div>
        {lastSync && (
          <div className="text-center">
            <span className="text-[9px] text-muted-foreground block">آخر تحديث: {lastSync}</span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/bd/add-member", { state: { memberType: "supporter" } })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-l from-blue-600/20 to-blue-500/10 border border-blue-500/25 hover:border-blue-400/40 active:scale-[0.97] transition-all"
          >
            <span className="material-symbols-outlined text-blue-400 text-[15px]">person_add</span>
            <span className="text-[11px] font-bold text-blue-400">جلب داعم</span>
          </button>
          <button
            onClick={() => navigate("/bd/add-member", { state: { memberType: "agent" } })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-l from-purple-600/20 to-purple-500/10 border border-purple-500/25 hover:border-purple-400/40 active:scale-[0.97] transition-all"
          >
            <span className="material-symbols-outlined text-purple-400 text-[15px]">domain_add</span>
            <span className="text-[11px] font-bold text-purple-400">جلب وكالة</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4 space-y-3">

        {tab === 'supporters' ? (
          <BDSupportersTab supporters={supporters} commissionPct={bd.user_commission_pct || 2} />
        ) : tab === 'agents' ? (
          <BDAgentsTab agents={agents} commissionPct={bd.agency_commission_pct || 5} />
        ) : tab === 'wallet' ? (
          <div className="space-y-3 mt-1 css-fade-up">
            <section className="overflow-hidden rounded-2xl bg-card border border-border/40 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-emerald-400">account_balance_wallet</span>
                    الرصيد المتاح
                  </p>
                  <h2 className="text-2xl font-bold text-foreground">${(bd.available_balance || 0).toFixed(2)}</h2>
                </div>
                <div className="px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <span className="text-[10px] font-medium text-yellow-500">{((bd.available_balance || 0) * 7500).toLocaleString()} عملة</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.04] rounded-lg p-2.5 border border-border/20">
                  <p className="text-[9px] text-muted-foreground mb-0.5">إجمالي المكتسب</p>
                  <p className="text-sm font-bold text-foreground">${(bd.total_earned || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-2.5 border border-border/20">
                  <p className="text-[9px] text-muted-foreground mb-0.5">أرباح الشهر</p>
                  <p className="text-sm font-bold text-foreground">${(bd.current_month_earnings || 0).toFixed(2)}</p>
                </div>
              </div>
            </section>
            <button
              onClick={() => navigate("/bd/withdraw")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-base">payments</span>
              سحب الأرباح
            </button>
            <section className="rounded-2xl bg-card border border-border/40 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
                <span className="material-symbols-outlined text-primary text-sm">receipt_long</span>
                <span className="text-xs font-bold text-foreground">آخر عمليات السحب</span>
              </div>
              {(data?.withdrawals || []).length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <span className="material-symbols-outlined text-2xl mb-1 block">history</span>
                  <p className="text-[10px]">لا توجد عمليات سحب بعد</p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {(data?.withdrawals || []).slice(0, 5).map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">
                          schedule
                        </span>
                        <div>
                          <p className="text-[11px] font-medium text-foreground">${(w.amount || 0).toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString('ar')}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        محتمل من 1 دقيقة إلى 1 ساعة نزول الكوينزات إلى الحساب
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : tab === 'settings' ? (
          <div className="space-y-3 mt-1 css-fade-up">
            <section className="rounded-2xl bg-card border border-border/40 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-foreground text-lg font-bold">
                  {(bd.bd_name || "B")[0]}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground">{bd.bd_name || user?.name}</h3>
                  <p className="text-[10px] text-muted-foreground">كود: {bd.referral_code}</p>
                </div>
              </div>
            </section>
            <section className="rounded-2xl bg-card border border-border/40 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
                <span className="material-symbols-outlined text-primary text-sm">percent</span>
                <span className="text-xs font-bold text-foreground">نسب العمولة</span>
              </div>
              <div className="divide-y divide-border/20">
                {[
                  { icon: 'diversity_3', color: 'text-blue-400', label: 'عمولة الداعمين', val: bd.user_commission_pct || 2 },
                  { icon: 'domain', color: 'text-purple-400', label: 'عمولة الوكالات', val: bd.agency_commission_pct || 5 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-sm ${item.color}`}>{item.icon}</span>
                      <span className="text-[11px] text-foreground/80">{item.label}</span>
                    </div>
                    <span className="text-xs font-bold text-primary">{item.val}%</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl bg-card border border-border/40 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
                <span className="material-symbols-outlined text-primary text-sm">bolt</span>
                <span className="text-xs font-bold text-foreground">إجراءات سريعة</span>
              </div>
              <div className="divide-y divide-border/20">
                <button onClick={() => navigate("/bd/add-member")} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">person_add</span>
                    <span className="text-[11px] text-foreground/80">إضافة عضو</span>
                  </div>
                  <span className="material-symbols-outlined text-muted-foreground text-sm">chevron_left</span>
                </button>
                <button onClick={() => navigate("/bd/withdraw")} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-yellow-400 text-sm">payments</span>
                    <span className="text-[11px] text-foreground/80">سحب الأرباح</span>
                  </div>
                  <span className="material-symbols-outlined text-muted-foreground text-sm">chevron_left</span>
                </button>
                <button onClick={copyReferralCode} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-blue-400 text-sm">share</span>
                    <span className="text-[11px] text-foreground/80">مشاركة كود الإحالة</span>
                  </div>
                  <span className="material-symbols-outlined text-muted-foreground text-sm">chevron_left</span>
                </button>
              </div>
            </section>
            <section className="rounded-2xl bg-card border border-border/40 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-primary text-sm">info</span>
                <span className="text-xs font-bold text-foreground">معلومات الحساب</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {[
                  { label: 'الحالة', val: bd.is_active ? '✅ نشط' : '❌ غير نشط', cls: bd.is_active ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'الهدف الشهري', val: `$${bd.monthly_goal || 0}`, cls: 'text-foreground' },
                  { label: 'عدد الداعمين', val: supporters.length, cls: 'text-foreground' },
                  { label: 'عدد الوكالات', val: agents.length, cls: 'text-foreground' },
                  { label: 'تاريخ الانضمام', val: new Date(bd.created_at).toLocaleDateString('ar'), cls: 'text-foreground' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className={`font-medium ${r.cls}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {renderStockChart()}

            {/* Wallet Card */}
            <div className="css-fade-up-d1 overflow-hidden rounded-2xl bg-card border border-border/40 p-3.5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-primary">account_balance_wallet</span>
                    الرصيد المتاح
                  </p>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">${(bd.available_balance || 0).toFixed(2)}</h2>
                </div>
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${todayProfit > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  <span className="material-symbols-outlined text-[11px]">{todayProfit > 0 ? 'trending_up' : 'trending_flat'}</span>
                  {todayProfit > 0 ? `+$${todayProfit.toFixed(2)}` : '$0.00'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-2">
                <div className="bg-white/[0.04] rounded-lg p-1.5 text-center border border-border/20">
                  <p className="text-[8px] text-muted-foreground mb-0.5">اليوم</p>
                  <p className="text-[11px] font-bold text-foreground">${todayProfit.toFixed(2)}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-1.5 text-center border border-border/20">
                  <p className="text-[8px] text-muted-foreground mb-0.5">الشهر</p>
                  <p className="text-[11px] font-bold text-foreground">${monthlyProfit.toFixed(2)}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-1.5 text-center border border-border/20">
                  <p className="text-[8px] text-muted-foreground mb-0.5">الإجمالي</p>
                  <p className="text-[11px] font-bold text-primary">${(bd.total_earned || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button onClick={() => setTab('supporters')} className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 rounded-lg p-2 transition-all active:scale-[0.97]">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-xs">diversity_3</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-muted-foreground">الداعمين</p>
                    <p className="text-xs font-bold text-foreground">{supporters.length}</p>
                  </div>
                </button>
                <button onClick={() => setTab('agents')} className="flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 rounded-lg p-2 transition-all active:scale-[0.97]">
                  <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-400 text-xs">domain</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-muted-foreground">الوكالات</p>
                    <p className="text-xs font-bold text-foreground">{agents.length}</p>
                  </div>
                </button>
              </div>

              <div className="pt-2 border-t border-border/20 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-xs">tag</span>
                  <span className="text-[11px] font-mono font-semibold text-foreground/80 tracking-wider">{bd.referral_code}</span>
                </div>
                <button onClick={copyReferralCode} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all active:scale-95">
                  <span className="text-[9px] font-medium text-primary">نسخ</span>
                  <span className="material-symbols-outlined text-[11px] text-primary">content_copy</span>
                </button>
              </div>
            </div>

            {renderMembersList()}
            <div className="h-2"></div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
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
