import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Bell, CheckCircle2 } from "lucide-react";
import FancyLoading from "@/components/FancyLoading";
import OwnerControls from "@/components/bd/OwnerControls";
import BDSupportersTab from "@/components/bd/BDSupportersTab";
import BDAgentsTab from "@/components/bd/BDAgentsTab";
import { galaApi } from "@/services/galaApi";
import { getAvatar, handleAvatarError } from "@/lib/avatarHelper";

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
  const [tab, setTab] = useState<'dashboard' | 'supporters' | 'agents' | 'wallet' | 'settings' | 'notifications'>('dashboard');
  const [bdBanners, setBdBanners] = useState<any[]>([]);
  const [bdNotifications, setBdNotifications] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [supporterSalaries, setSupporterSalaries] = useState<Record<string, { charges: number; commission: number }>>({});
  const [agentSalaries, setAgentSalaries] = useState<Record<string, { salary: number; commission: number }>>({});

  const [memberAvatars, setMemberAvatars] = useState<Record<string, string>>({});

  // Fetch avatars for all members
  useEffect(() => {
    if (!data) return;
    const allUuids = [
      ...data.supporters.map((s: any) => s.member_uuid),
      ...data.agents.map((a: any) => a.member_uuid),
    ].filter(Boolean);
    allUuids.forEach(uuid => {
      if (!memberAvatars[uuid]) {
        getAvatar(uuid).then(url => {
          setMemberAvatars(prev => ({ ...prev, [uuid]: url }));
        });
      }
    });
  }, [data]);
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
        toast.success(`تم التحديث${parts.length > 0 ? ': ' + parts.join('، ') : ''}`);
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
      // Use UTC-based date boundaries for accurate "today" calculation
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
      
      const weekAgo = new Date(todayStart);
      weekAgo.setDate(weekAgo.getDate() - 6);

      const [dashRes, todayLogsRes, weekLogsRes] = await Promise.all([
        supabase.functions.invoke("bd-manage", { body: { action: "get_dashboard", bd_uuid: user.uuid } }),
        supabase.from("works_commission_logs" as any).select("amount,created_at").eq("bd_uuid", user.uuid).gte("created_at", todayStart.toISOString()),
        supabase.from("works_commission_logs" as any).select("amount, created_at").eq("bd_uuid", user.uuid).gte("created_at", weekAgo.toISOString()).order("created_at", { ascending: true }),
      ]);

      const res = dashRes.data;
      if (res?.bd) { setData(res); } else { navigate("/bd", { replace: true }); }

      // Only count logs from today (same UTC date)
      const todayDateStr = todayStart.toISOString().slice(0, 10);
      const todayOnlyLogs = (todayLogsRes.data || []).filter(
        (log: any) => log.created_at?.slice(0, 10) === todayDateStr
      );
      setTodayProfit(todayOnlyLogs.reduce((sum: number, log: any) => sum + (log.amount || 0), 0));
      // Use current_month_earnings from settings (admin-editable, authoritative source)
      setMonthlyProfit(Number(res?.bd?.current_month_earnings || 0));

      const dayMap: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekAgo);
        d.setDate(d.getDate() + i);
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      (weekLogsRes.data as any[] || []).forEach((log: any) => {
        const day = log.created_at.slice(0, 10);
        if (dayMap[day] !== undefined) dayMap[day] += log.amount || 0;
      });
      setDailyLogs(Object.entries(dayMap).map(([day, amount]) => ({ day, amount })));

      // Fetch salary data from external API for each member
      if (res?.bd) {
        fetchMemberSalaries(res.supporters || [], res.agents || []);
      }
    } catch {
      toast.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [user?.uuid, navigate]);

  // Fetch salary/charges from external API for each member
  const fetchMemberSalaries = async (sups: any[], ags: any[]) => {
    setSalaryLoading(true);
    const month = new Date().toISOString().slice(0, 7);
    const year = new Date().getFullYear();
    const monthNum = new Date().getMonth() + 1;

    const supMap: Record<string, { charges: number; commission: number }> = {};
    const agMap: Record<string, { salary: number; commission: number }> = {};

    // Fetch supporters in parallel
    const supPromises = sups.map(async (s: any) => {
      try {
        const data = await galaApi.userMonthlyCharges(s.member_uuid, month);
        const charges = data.data?.total_charges || 0;
        const commission = data.data?.commission_2pct || (charges * 0.02);
        supMap[s.member_uuid] = { charges, commission };
      } catch { /* silent */ }
    });

    // Fetch agents in parallel
    const agPromises = ags.map(async (a: any) => {
      try {
        const agencyId = a.agency_id;
        if (!agencyId) return;
        const data = await galaApi.agencySalary(agencyId, String(year), String(monthNum));
        const salary = data.data?.salary || 0;
        const commission = data.data?.commission_2pct || (salary * 0.02);
        agMap[a.member_uuid] = { salary, commission };
      } catch { /* silent */ }
    });

    await Promise.all([...supPromises, ...agPromises]);
    setSupporterSalaries(supMap);
    setAgentSalaries(agMap);
    setSalaryLoading(false);
  };

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
          table: 'works_commission_logs',
          filter: `bd_uuid=eq.${user?.uuid}`,
        },
        () => {
          // Refetch today's profit immediately
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          supabase
            .from("works_commission_logs" as any)
            .select("amount")
            .eq("bd_uuid", user?.uuid || "")
            .gte("created_at", todayStart.toISOString())
            .then(({ data: logs }: any) => {
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

  // Fetch BD notifications (banners + commission alerts)
  const fetchBdNotifications = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      const { data: notifs } = await supabase
        .from("works_notifications" as any)
        .select("*")
        .or(`target_uuid.eq.${user.uuid},target_uuid.eq.all`)
        .order("created_at", { ascending: false })
        .limit(50);
      const banners = (notifs || []).filter((n: any) => n.type === "admin_message" && !n.is_dismissed);
      const allNotifs = notifs || [];
      setBdBanners(banners);
      setBdNotifications(allNotifs);
    } catch { /* silent */ }
  }, [user?.uuid]);

  useEffect(() => { fetchBdNotifications(); }, [fetchBdNotifications]);

  const dismissBanner = async (id: string) => {
    await supabase.from("works_notifications" as any).update({ is_dismissed: true }).eq("id", id);
    setBdBanners(prev => prev.filter(b => b.id !== id));
  };


  const copyReferralCode = () => {
    if (data?.bd?.referral_code) {
      navigator.clipboard.writeText(data.bd.referral_code);
      toast.success("تم نسخ كود الإحالة");
    }
  };

  if (loading) {
    return (
      <div className="mobile-container bg-background">
        <FancyLoading
          title="جاري تحميل لوحة BD"
          subtitle="نجلب لك بيانات الأعضاء والأرباح"
          tips={[
            "جاري جلب بيانات الأعضاء...",
            "نحسب لك أرباح اليوم...",
            "نحدّث بيانات الداعمين...",
            "جاري ربط البيانات من السيرفر...",
            "ثواني ويظهر لك كل شي...",
          ]}
        />
      </div>
    );
  }

  if (!data?.bd) return null;
  const { bd, supporters, agents } = data;

  // Compute live salary commission total — supporters are in coins, agents are in USD
  const supporterCommissionCoins = Object.values(supporterSalaries).reduce((s, d) => s + d.commission, 0);
  const supporterCommissionUsd = supporterCommissionCoins / 7500;
  const agentCommissionUsd = Object.values(agentSalaries).reduce((s, d) => s + d.commission, 0);
  const liveSalaryTotalUsd = supporterCommissionUsd + agentCommissionUsd;
  const liveSalaryTotal = Math.floor(liveSalaryTotalUsd * 7500);

  const rawTotalEarned = Number(bd.total_earned || 0);
  const hasMonthlyReference = liveSalaryTotalUsd > 0;
  const looksLikeLegacyCoins = Number.isFinite(rawTotalEarned)
    && rawTotalEarned > 1000
    && Number.isInteger(rawTotalEarned)
    && (!hasMonthlyReference || (rawTotalEarned / Math.max(liveSalaryTotalUsd, 1)) > 100);

  let normalizedTotalEarnedUsd = looksLikeLegacyCoins ? (rawTotalEarned / 7500) : rawTotalEarned;
  if (!Number.isFinite(normalizedTotalEarnedUsd) || normalizedTotalEarnedUsd < 0) normalizedTotalEarnedUsd = 0;
  if (normalizedTotalEarnedUsd < liveSalaryTotalUsd) normalizedTotalEarnedUsd = liveSalaryTotalUsd;
  normalizedTotalEarnedUsd = Math.round(normalizedTotalEarnedUsd * 100) / 100;
  const normalizedTotalEarnedCoins = Math.round(normalizedTotalEarnedUsd * 7500);

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
                  <p className={`text-[11px] font-bold ${comm > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>{comm > 0 ? `${comm.toLocaleString()} ك` : '0'}</p>
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
                 tab === 'wallet' ? 'المحفظة' :
                 tab === 'notifications' ? 'الإشعارات' : 'الإعدادات'}
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
            <button
              onClick={() => setTab('settings')}
              className="p-1.5 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined text-xl">settings</span>
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

        {/* Admin Banners - show on all tabs */}
        {bdBanners.length > 0 && (
          <div className="space-y-2">
            {bdBanners.map((banner: any) => (
              <div key={banner.id} className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Bell className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground">{banner.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{banner.body}</p>
                  <p className="text-[8px] text-muted-foreground mt-1">{new Date(banner.created_at).toLocaleDateString('ar')}</p>
                </div>
                <button onClick={() => dismissBanner(banner.id)} className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'notifications' ? (
          <div className="space-y-3 mt-1 css-fade-up">
            <div className="flex items-center gap-1.5 mb-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">الإشعارات</span>
              <span className="text-[10px] text-muted-foreground mr-auto">{bdNotifications.length} إشعار</span>
            </div>
            {bdNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">لا توجد إشعارات</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bdNotifications.map((n: any) => (
                  <div key={n.id} className="rounded-xl p-3" style={{ background: n.type === 'commission' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${n.type === 'commission' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{n.type === 'commission' ? '💰' : '📢'}</span>
                      <span className="text-[11px] font-bold text-foreground">{n.title}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{n.body}</p>
                    <p className="text-[8px] text-muted-foreground mt-1.5">
                      {new Date(n.created_at).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {n.sent_by && <span className="mr-2">• {n.sent_by}</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'supporters' ? (
          <BDSupportersTab supporters={supporters} commissionPct={bd.user_commission_pct || 2} salaryData={supporterSalaries} salaryLoading={salaryLoading} />
        ) : tab === 'agents' ? (
          <BDAgentsTab agents={agents} commissionPct={bd.agency_commission_pct || 5} salaryData={agentSalaries} salaryLoading={salaryLoading} />
        ) : tab === 'wallet' ? (
          <div className="space-y-3 mt-1 css-fade-up">
            {/* === Earnings Summary === */}
            <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/30 to-card border border-emerald-500/20 p-5 text-center">
              <p className="text-xs text-muted-foreground mb-1">إجمالي عمولتي</p>
              <h2 className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                {liveSalaryTotal.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">كوينز</span>
              </h2>
              <p className="text-sm font-bold text-foreground/70 mt-1">(${liveSalaryTotalUsd.toFixed(2)})</p>
              {salaryLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-400 mx-auto mt-2" />}
              
              {(() => {
                const dayOfMonth = new Date().getDate();
                const canWithdraw = dayOfMonth <= 5;
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                const withdrawMonth = lastMonth.toISOString().slice(0, 7);

                const handleWithdrawRequest = async () => {
                  if (!user?.uuid || liveSalaryTotal <= 0) return;
                  try {
                    const { error } = await supabase.from("works_withdrawals" as any).insert({
                      bd_uuid: user.uuid,
                      bd_name: bd.bd_name || "",
                      amount: liveSalaryTotalUsd,
                      status: "pending",
                      transfer_type: "commission",
                      country: withdrawMonth,
                      admin_note: `كوينز: ${liveSalaryTotal.toLocaleString()} | شهر: ${withdrawMonth}`,
                    });
                    if (error) {
                      toast.error("فشل إرسال الطلب");
                    } else {
                      toast.success("تم إرسال طلبك — سيتم مراجعته");
                      loadData();
                    }
                  } catch {
                    toast.error("فشل إرسال الطلب");
                  }
                };

                return canWithdraw ? (
                  <button
                    onClick={handleWithdrawRequest}
                    disabled={liveSalaryTotal <= 0}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-base">payments</span>
                    صرف نسبتي
                  </button>
                ) : (
                  <div className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-muted/30 border border-border/40">
                    <span className="material-symbols-outlined text-base text-muted-foreground">lock</span>
                    <span className="text-sm font-bold text-muted-foreground">يفتح بداية الشهر الجديد</span>
                  </div>
                );
              })()}
            </section>

            {/* === Per-Member Breakdown === */}
            <section className="rounded-2xl bg-card border border-border/40 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
                <span className="material-symbols-outlined text-primary text-sm">receipt_long</span>
                <span className="text-xs font-bold text-foreground">تفاصيل الأعضاء</span>
                <span className="text-[9px] text-muted-foreground mr-auto">1$ = 7,500 عملة</span>
              </div>
              <div className="divide-y divide-border/20">
                {supporters.map((s: any) => {
                  const live = supporterSalaries[s.member_uuid];
                  const charges = live?.charges || 0;
                  const commission = live?.commission || 0;
                  return (
                    <div key={s.member_uuid} className="px-3 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">👤</span>
                          <span className="text-[11px] font-bold text-foreground">{s.member_name || "داعم"}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold">داعم</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">#{s.member_uuid}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">شحنات الشهر:</span>
                        <span className="font-bold text-foreground">{charges.toLocaleString()} كوينز</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">نسبتك ({bd.user_commission_pct || 2}%):</span>
                        <span className="font-bold text-emerald-400">{commission.toLocaleString()} كوينز</span>
                      </div>
                    </div>
                  );
                })}
                {agents.map((a: any) => {
                  const live = agentSalaries[a.member_uuid];
                  const salary = live?.salary || 0;
                  const commission = live?.commission || 0;
                  const commCoins = Math.floor(commission * 7500);
                  return (
                    <div key={a.member_uuid} className="px-3 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🏢</span>
                          <span className="text-[11px] font-bold text-foreground">{a.member_name || "وكالة"}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold">وكالة</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">كود {a.agency_id || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">راتب الوكالة:</span>
                        <span className="font-bold text-foreground">${salary.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">نسبتك ({bd.agency_commission_pct || 5}%):</span>
                        <span className="font-bold text-emerald-400">${commission.toFixed(2)} = {commCoins.toLocaleString()} كوينز</span>
                      </div>
                    </div>
                  );
                })}
                {supporters.length === 0 && agents.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <span className="material-symbols-outlined text-2xl mb-1 block">group_off</span>
                    <p className="text-[10px]">لا يوجد أعضاء بعد</p>
                  </div>
                )}
              </div>
            </section>

            {/* === Withdrawal History === */}
            <section className="rounded-2xl bg-card border border-border/40 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
                <span className="material-symbols-outlined text-primary text-sm">history</span>
                <span className="text-xs font-bold text-foreground">آخر الطلبات</span>
              </div>
              {(data?.withdrawals || []).length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <span className="material-symbols-outlined text-2xl mb-1 block">history</span>
                  <p className="text-[10px]">لا توجد طلبات صرف بعد</p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {(data?.withdrawals || []).slice(0, 5).map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-sm ${w.status === 'approved' ? 'text-emerald-400' : w.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {w.status === 'approved' ? 'check_circle' : w.status === 'rejected' ? 'cancel' : 'schedule'}
                        </span>
                        <div>
                          <p className="text-[11px] font-medium text-foreground">${(w.amount || 0).toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString('ar')}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : w.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {w.status === 'approved' ? 'تم القبول' : w.status === 'rejected' ? 'تم الرفض' : 'قيد المراجعة'}
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
                <button onClick={() => setTab('wallet')} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-yellow-400 text-sm">payments</span>
                    <span className="text-[11px] text-foreground/80">صرف نسبتي</span>
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
                  { label: 'الحالة', val: bd.is_active ? 'نشط' : 'غير نشط', cls: bd.is_active ? 'text-emerald-400' : 'text-red-400' },
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
            {/* Owner Controls */}
            {localStorage.getItem("admin_username") === "naz" && (
              <OwnerControls system="bd" accountId={bd.bd_uuid} onRefresh={loadData} />
            )}

            {/* Referral Code Banner */}
            <div className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(152 69% 40% / 0.08))", border: "1px solid hsl(var(--primary)/0.2)" }}>
              <div>
                <p className="text-xs text-muted-foreground mb-1">كود البيدي</p>
                <p className="text-xl font-black tracking-widest text-foreground font-mono">{bd.referral_code}</p>
              </div>
              <button onClick={copyReferralCode} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
                style={{ background: "hsl(var(--primary)/0.15)", border: "1px solid hsl(var(--primary)/0.25)" }}>
                <span className="material-symbols-outlined text-primary text-sm">content_copy</span>
                <span className="text-xs font-bold text-primary">نسخ</span>
              </button>
            </div>

            {/* Main Balance Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Available Balance */}
              <button
                onClick={() => { if ((bd.available_balance || 0) > 0) setTab('wallet'); }}
                className="rounded-2xl p-4 text-center space-y-1 active:scale-[0.97] transition-transform"
                style={{ background: "linear-gradient(145deg, hsl(152 69% 40% / 0.12), hsl(var(--card)))", border: "1px solid hsl(152 69% 40% / 0.2)" }}>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs font-bold text-muted-foreground">الرصيد المتاح</p>
                  <button onClick={(e) => { e.stopPropagation(); toast.info("هذا المبلغ المتاح لطلب السحب. يتم تحديثه تلقائياً بناءً على عمولاتك."); }}
                    className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted)/0.15)" }}>
                    <span className="text-[9px] text-muted-foreground font-bold">?</span>
                  </button>
                </div>
                <p className="text-2xl font-black text-emerald-400" dir="ltr">${(bd.available_balance || 0).toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{Math.round((bd.available_balance || 0) * 7500).toLocaleString()} كوينز</p>
              </button>

              {/* Total Earnings */}
              <div className="rounded-2xl p-4 text-center space-y-1"
                style={{ background: "linear-gradient(145deg, hsl(var(--primary)/0.08), hsl(var(--card)))", border: "1px solid hsl(var(--primary)/0.15)" }}>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs font-bold text-muted-foreground">إجمالي الأرباح</p>
                  <button onClick={() => toast.info("إجمالي كل العمولات التي حصلت عليها منذ انضمامك للنظام.")}
                    className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted)/0.15)" }}>
                    <span className="text-[9px] text-muted-foreground font-bold">?</span>
                  </button>
                </div>
                <p className="text-2xl font-black text-primary" dir="ltr">${normalizedTotalEarnedUsd.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{normalizedTotalEarnedCoins.toLocaleString()} كوينز</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "أرباح اليوم",
                  value: `$${(todayProfit / 7500).toFixed(2)}`,
                  sub: `${todayProfit.toLocaleString()} ك`,
                  color: "hsl(45 93% 47%)",
                  bg: "hsl(45 93% 47% / 0.08)",
                  border: "hsl(45 93% 47% / 0.15)",
                  help: "المبلغ الذي كسبته اليوم من عمولات الأعضاء.",
                },
                {
                  label: "أرباح الشهر",
                  value: `$${liveSalaryTotalUsd.toFixed(2)}`,
                  sub: `${liveSalaryTotal.toLocaleString()} كوينز`,
                  color: "hsl(187 72% 56%)",
                  bg: "hsl(187 72% 56% / 0.08)",
                  border: "hsl(187 72% 56% / 0.15)",
                  help: "إجمالي العمولات لهذا الشهر. يتم تصفيرها بداية كل شهر جديد.",
                },
                {
                  label: "الأعضاء",
                  value: `${supporters.length + agents.length}`,
                  sub: `${supporters.length} داعم · ${agents.length} وكالة`,
                  color: "hsl(var(--foreground))",
                  bg: "hsl(var(--muted)/0.06)",
                  border: "hsl(var(--border)/0.12)",
                  help: "عدد الداعمين والوكالات المسجلين تحت حسابك.",
                },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl p-3 text-center space-y-1"
                  style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-[10px] font-bold" style={{ color: stat.color, opacity: 0.7 }}>{stat.label}</p>
                    <button onClick={() => toast.info(stat.help)}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted)/0.15)" }}>
                      <span className="text-[8px] text-muted-foreground font-bold">?</span>
                    </button>
                  </div>
                  <p className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Supporters Section */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border)/0.15)" }}>
              <button onClick={() => setTab('supporters')} className="w-full flex items-center justify-between p-4 active:bg-muted/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(217 91% 60% / 0.12)" }}>
                    <span className="material-symbols-outlined text-blue-400">favorite</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">الداعمين ({supporters.length})</p>
                    <p className="text-[10px] text-muted-foreground">عمولة {bd.user_commission_pct || 2}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-left">
                    <p className="text-sm font-black text-emerald-400" dir="ltr">
                      ${(Object.values(supporterSalaries).reduce((s, d) => s + d.commission, 0) / 7500).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {Object.values(supporterSalaries).reduce((s, d) => s + d.commission, 0).toLocaleString()} كوينز
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-muted-foreground text-lg">chevron_left</span>
                </div>
              </button>

              {/* Show first 2 supporters inline */}
              {supporters.slice(0, 2).map((s: any) => {
                const live = supporterSalaries[s.member_uuid];
                const charges = live?.charges || 0;
                const commission = live?.commission || 0;
                return (
                  <div key={s.member_uuid} className="px-4 py-3 flex items-center justify-between"
                    style={{ borderTop: "1px solid hsl(var(--border)/0.08)" }}>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={memberAvatars[s.member_uuid] || "/placeholder.svg"}
                        onError={handleAvatarError}
                        className="w-9 h-9 rounded-xl object-cover"
                        alt={s.member_name}
                      />
                      <div>
                        <p className="text-xs font-bold text-foreground">{s.member_name || "داعم"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono tabular-nums" dir="ltr">#{s.member_uuid}</p>
                        <p className="text-[10px] text-muted-foreground">شحن {charges.toLocaleString()} كوينز</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-emerald-400">{commission.toLocaleString()} ك</p>
                      <p className="text-[9px] text-muted-foreground">(${(commission / 7500).toFixed(2)})</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Agents Section */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border)/0.15)" }}>
              <button onClick={() => setTab('agents')} className="w-full flex items-center justify-between p-4 active:bg-muted/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(271 91% 65% / 0.12)" }}>
                    <span className="material-symbols-outlined text-purple-400">domain</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">الوكلاء ({agents.length})</p>
                    <p className="text-[10px] text-muted-foreground">عمولة {bd.agency_commission_pct || 5}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-left">
                    <p className="text-sm font-black text-emerald-400" dir="ltr">
                      ${Object.values(agentSalaries).reduce((s, d) => s + d.commission, 0).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {Math.floor(Object.values(agentSalaries).reduce((s, d) => s + d.commission, 0) * 7500).toLocaleString()} كوينز
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-muted-foreground text-lg">chevron_left</span>
                </div>
              </button>

              {agents.slice(0, 2).map((a: any) => {
                const live = agentSalaries[a.member_uuid];
                const salary = live?.salary || 0;
                const commission = live?.commission || 0;
                return (
                  <div key={a.member_uuid} className="px-4 py-3 flex items-center justify-between"
                    style={{ borderTop: "1px solid hsl(var(--border)/0.08)" }}>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={memberAvatars[a.member_uuid] || "/placeholder.svg"}
                        onError={handleAvatarError}
                        className="w-9 h-9 rounded-xl object-cover"
                        alt={a.member_name}
                      />
                      <div>
                        <p className="text-xs font-bold text-foreground">{a.member_name || "وكالة"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono tabular-nums" dir="ltr">#{a.member_uuid}</p>
                        <p className="text-[10px] text-muted-foreground">راتب الوكالة ${salary.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-emerald-400">${commission.toFixed(2)}</p>
                      <p className="text-[9px] text-muted-foreground">({Math.floor(commission * 7500).toLocaleString()} ك)</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Member Button */}
            <button
              onClick={() => navigate("/bd/add-member")}
              className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, hsl(152 69% 40%), hsl(152 69% 50%))", color: "white" }}>
              <span className="material-symbols-outlined text-lg">person_add</span>
              إضافة عضو
            </button>

            {/* Withdraw Button */}
            {(() => {
              const dayOfMonth = new Date().getDate();
              const canWithdraw = dayOfMonth <= 5;
              return canWithdraw ? (
                <button
                  onClick={() => setTab('wallet')}
                  disabled={liveSalaryTotal <= 0}
                  className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(271 91% 65%))", color: "white" }}>
                  <span className="material-symbols-outlined text-lg">payments</span>
                  صرف نسبتي
                </button>
              ) : (
                <div className="w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2"
                  style={{ background: "hsl(var(--muted)/0.08)", border: "1px solid hsl(var(--border)/0.12)" }}>
                  <span className="material-symbols-outlined text-muted-foreground text-lg">lock</span>
                  <div className="text-center">
                    <span className="font-bold text-muted-foreground block">صرف نسبتي</span>
                    <span className="text-[10px] text-muted-foreground">يفتح بداية الشهر الجديد</span>
                  </div>
                </div>
              );
            })()}

            {/* Performance Chart */}
            {renderStockChart()}

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
            { id: 'notifications' as const, icon: 'notifications', label: 'الإشعارات' },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className="flex flex-col items-center gap-0.5 py-1 px-2 relative">
              <span className={`material-symbols-outlined text-xl ${tab === item.id ? 'text-primary' : 'text-muted-foreground'}`}>{item.icon}</span>
              {item.id === 'notifications' && bdNotifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-0 right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
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
