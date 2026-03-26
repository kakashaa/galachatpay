import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Coins, Gift, Zap, DollarSign,
  Building2, CheckCircle, XCircle, AlertCircle,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import SalaryRequestsHistory from "@/components/SalaryRequestsHistory";
import { galaApi } from "@/services/galaApi";
const USD_TO_COINS = 7500;

interface WithdrawStatus {
  ok: boolean;
  user?: { uuid: string; name: string; agency_id?: number };
  monthly_diamonds?: number;
  is_agency_owner?: boolean;
  host_salary?: {
    current_month: number;
    expected: number;
    is_valid: boolean;
    total_unpaid: number;
    total_cut: number;
    monthly_cut?: number;
    over_withdrawn?: boolean;
    deficit?: number;
    note_ar?: string;
    available: number;
    cash_used_this_month: boolean;
  };
  agency_salary?: {
    user_share_this_month: number;
    pool_total: number;
    pool_cut: number;
    pool_available: number;
    monthly_pool_total?: number;
    monthly_pool_cut?: number;
    cash_used_this_month: boolean;
    can_withdraw: boolean;
  };
  withdrawal_options?: {
    cash_host: boolean;
    cash_agency: boolean;
    coins_transfer: boolean;
    instant: boolean;
  };
}

const SalaryHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Load cached salary data instantly, then refresh in background
  const SALARY_CACHE_KEY = `salary_cache_${user?.uuid}`;
  const [status, setStatus] = useState<WithdrawStatus | null>(() => {
    try {
      const cached = localStorage.getItem(SALARY_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(!status);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchStatus();

    // Auto-refresh when page becomes visible (user returns to tab)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Auto-refresh when navigating back
    const handleFocus = () => fetchStatus();
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user?.uuid]);

  const fetchStatus = async () => {
    if (!status) setLoading(true);
    setError(false);
    try {
      // Try salary_check_all first (more reliable)
      const allData: any = await galaApi.salaryCheckAll(user!.uuid);
      if (allData?.success || allData?.host_salary || allData?.agency_salary) {
        const mapped: WithdrawStatus = {
          ok: true,
          is_agency_owner: allData.is_agency_owner || false,
          host_salary: allData.host_salary ? {
            current_month: allData.host_salary.salary || 0,
            expected: allData.host_salary.salary || 0,
            is_valid: true,
            total_unpaid: 0,
            total_cut: allData.host_salary.deduction || 0,
            monthly_cut: allData.host_salary.deduction || 0,
            available: allData.host_salary.net || 0,
            cash_used_this_month: false,
            over_withdrawn: (allData.host_salary.net || 0) <= 0,
          } : undefined,
          agency_salary: (allData.agency_salary?.has_salary || allData.agency_salary?.user_share_this_month > 0 || allData.agency_salary?.can_withdraw || allData.is_agency_owner) ? {
            user_share_this_month: allData.agency_salary?.user_share_this_month || allData.agency_salary?.amount || 0,
            pool_total: allData.agency_salary?.pool_total || allData.agency_salary?.amount || 0,
            pool_cut: allData.agency_salary?.pool_cut || 0,
            pool_available: allData.agency_salary?.pool_available || allData.agency_salary?.amount || 0,
            monthly_pool_total: allData.agency_salary?.monthly_pool_total || allData.agency_salary?.amount || 0,
            monthly_pool_cut: allData.agency_salary?.monthly_pool_cut || 0,
            cash_used_this_month: allData.agency_salary?.cash_used_this_month || false,
            can_withdraw: allData.agency_salary?.can_withdraw || false,
          } : undefined,
          withdrawal_options: {
            cash_host: (allData.withdrawals?.can_withdraw !== false),
            cash_agency: allData.is_agency_owner || false,
            coins_transfer: true,
            instant: true,
          },
        };
        setStatus(mapped);
        try { localStorage.setItem(SALARY_CACHE_KEY, JSON.stringify(mapped)); } catch {}
        return;
      }
      // Fallback to withdraw-status
      const data: WithdrawStatus = await galaApi.withdrawStatus(user!.uuid) as any;
      if ((data as any)?.transient_error) {
        if (!status) setError(true);
        return;
      }
      setStatus(data);
      try { localStorage.setItem(SALARY_CACHE_KEY, JSON.stringify(data)); } catch {}
    } catch {
      if (!status) setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const host = status?.host_salary;
  const agency = status?.agency_salary;
  const isAgencyOwner = status?.is_agency_owner || false;

  // Use monthly_cut (new) with fallback to total_cut (old)
  const hostCut = host ? (host.monthly_cut ?? host.total_cut) : 0;
  const hostOverWithdrawn = host?.over_withdrawn === true;
  const hostCutInvalid = host ? (hostOverWithdrawn || hostCut > host.current_month) : false;
  
  // Use API available if provided, otherwise calculate
  const hostAvailable = host ? (host.available ?? Math.max(0, host.current_month - (hostCutInvalid ? 0 : hostCut))) : 0;
  
  // Use monthly fields (new) with fallback to old fields
  const agencyPoolTotal = agency ? (agency.monthly_pool_total ?? agency.pool_total) : 0;
  const agencyPoolCut = agency ? (agency.monthly_pool_cut ?? agency.pool_cut) : 0;
  const agencyAvailable = agency ? (agency.pool_available ?? Math.max(0, agencyPoolTotal - agencyPoolCut)) : 0;
  const totalAvailable = hostAvailable + (isAgencyOwner ? agencyAvailable : 0);

  const options = [
    {
      id: "cash",
      icon: Wallet,
      label: "سحب نقدي",
      desc: "تحويل بنكي",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      route: "/salary/cash",
    },
    {
      id: "charge_self",
      icon: Coins,
      label: "شحن لحسابي",
      desc: "كوينزات بحسابك",
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      route: "/salary/charge-self",
    },
    {
      id: "charge_other",
      icon: Gift,
      label: "شحن لحساب آخر",
      desc: "أرسل لصديقك",
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
      route: "/salary/charge-other",
    },
    {
      id: "instant",
      icon: Zap,
      label: "سحب فوري",
      desc: "بيع كوينزاتك",
      color: "text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/20",
      route: "/salary/instant",
    },
  ];

  return (
    <MobileLayout showHeader headerTitle="راتبي" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-6 space-y-5">

        {/* Loading skeleton cards */}
        {loading && !status && (
          <div className="space-y-4">
            <div className="glass-card p-5 text-center space-y-3">
              <div className="h-3 w-32 mx-auto rounded bg-muted animate-pulse" />
              <div className="h-10 w-40 mx-auto rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 mx-auto rounded bg-muted animate-pulse" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[1,2].map(n => (
                <div key={n} className="rounded-2xl border border-border/20 bg-card/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
                  </div>
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="rounded-2xl border border-border/20 bg-card/30 p-4 space-y-2">
                  <div className="h-8 w-8 rounded-xl bg-muted animate-pulse" />
                  <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-12 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-destructive font-bold">فشل جلب الراتب</p>
            <p className="text-xs text-muted-foreground text-center px-4">السيرفر قد يكون مشغول — حاول مرة ثانية</p>
            <button onClick={fetchStatus} className="mt-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform">
              إعادة المحاولة
            </button>
          </div>
        )}

        {!error && status && (
          <>
            {/* ══════ Total Available - Hero Card ══════ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-transparent p-6 text-center space-y-1"
            >
              <p className="text-xs text-muted-foreground">المبلغ المتاح للسحب</p>
              {totalAvailable > 0 ? (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <DollarSign className="w-8 h-8 text-emerald-400" />
                    <p className="text-5xl font-black text-emerald-400 tabular-nums" dir="ltr">
                      {totalAvailable.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm text-emerald-400/70 tabular-nums font-semibold">
                    {(totalAvailable * USD_TO_COINS).toLocaleString()} كوينز
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-3">لا يوجد رصيد متاح</p>
              )}
            </motion.div>

            {/* ══════ Two Side-by-Side Summary Cards ══════ */}
            <div className="grid grid-cols-2 gap-3">
              {/* Host Summary */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-2"
              >
                <Wallet className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-[11px] text-muted-foreground font-medium">عمولة المضيف</p>
                <p className="text-xl font-black text-emerald-400 tabular-nums" dir="ltr">
                  ${hostAvailable.toFixed(2)}
                </p>
                <p className="text-[10px] text-emerald-400/60 tabular-nums font-semibold">
                  {(hostAvailable * USD_TO_COINS).toLocaleString()} كوينز
                </p>
                {host?.is_valid ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-2.5 h-2.5" /> صحيح
                  </span>
                ) : host ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                    <XCircle className="w-2.5 h-2.5" /> غير متطابق
                  </span>
                ) : null}
              </motion.div>

              {/* Agency Summary */}
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className={`rounded-2xl border p-4 text-center space-y-2 ${
                  isAgencyOwner
                    ? "border-violet-500/20 bg-violet-500/5"
                    : "border-border/10 bg-muted/5"
                }`}
              >
                <Building2 className={`w-6 h-6 mx-auto ${isAgencyOwner ? "text-violet-400" : "text-muted-foreground/40"}`} />
                <p className="text-[11px] text-muted-foreground font-medium">عمولة الوكالة</p>
                {isAgencyOwner ? (
                  <>
                    <p className="text-xl font-black text-emerald-400 tabular-nums" dir="ltr">
                      ${agencyAvailable.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-emerald-400/60 tabular-nums font-semibold">
                      {(agencyAvailable * USD_TO_COINS).toLocaleString()} كوينز
                    </p>
                    {agency?.can_withdraw && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-2.5 h-2.5" /> متاح
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground/50 py-2">ليس مالك وكالة</p>
                )}
              </motion.div>
            </div>

            {/* ══════ Detailed Breakdown (collapsible-style) ══════ */}
            <div className="space-y-2">
              {/* Host Details */}
              {host && host.current_month > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl border border-border/10 bg-card/30 p-3 space-y-2"
                >
                  <p className="text-[10px] text-muted-foreground font-semibold">تفاصيل راتب المضيف</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-background/40 p-2">
                      <p className="text-[8px] text-muted-foreground">الراتب</p>
                      <p className="text-xs font-black text-foreground tabular-nums" dir="ltr">${host.current_month.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-background/40 p-2">
                      <p className="text-[8px] text-muted-foreground">الخصم</p>
                      {hostCutInvalid ? (
                        <p className="text-[9px] font-bold text-amber-400">⚠️ مراجعة</p>
                      ) : (
                        <p className="text-xs font-black text-red-400 tabular-nums" dir="ltr">${hostCut.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-background/40 p-2">
                      <p className="text-[8px] text-muted-foreground">المتبقي</p>
                      <p className="text-xs font-black text-emerald-400 tabular-nums" dir="ltr">${hostAvailable.toFixed(2)}</p>
                    </div>
                  </div>
                  {hostCutInvalid && (
                    <p className="text-[9px] text-amber-400 text-center">
                      {host.note_ar || (host.deficit ? `⚠️ عجز $${host.deficit.toFixed(2)}` : "⚠️ تحت المراجعة")}
                    </p>
                  )}
                  {host.cash_used_this_month && (
                    <p className="text-[9px] text-amber-400 text-center">✅ تم السحب النقدي هذا الشهر</p>
                  )}
                </motion.div>
              )}

              {/* Agency Details */}
              {isAgencyOwner && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="rounded-2xl border border-border/10 bg-card/30 p-3 space-y-2"
                >
                  <p className="text-[10px] text-muted-foreground font-semibold">تفاصيل راتب الوكالة</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-background/40 p-2">
                      <p className="text-[8px] text-muted-foreground">الإجمالي</p>
                      <p className="text-xs font-black text-foreground tabular-nums" dir="ltr">${agencyPoolTotal.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-background/40 p-2">
                      <p className="text-[8px] text-muted-foreground">المسحوبات</p>
                      <p className="text-xs font-black text-red-400 tabular-nums" dir="ltr">${agencyPoolCut.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-background/40 p-2">
                      <p className="text-[8px] text-muted-foreground">المتبقي</p>
                      <p className="text-xs font-black text-emerald-400 tabular-nums" dir="ltr">${agencyAvailable.toFixed(2)}</p>
                    </div>
                  </div>
                  {(agency?.user_share_this_month || 0) > 0 && (
                    <p className="text-[9px] text-muted-foreground text-center">
                      حصتك: <span className="font-bold text-foreground" dir="ltr">${agency?.user_share_this_month?.toFixed(2)}</span>
                    </p>
                  )}
                  {agency?.cash_used_this_month && (
                    <p className="text-[9px] text-amber-400 text-center">✅ تم السحب النقدي هذا الشهر</p>
                  )}
                </motion.div>
              )}
            </div>
            {/* 4 options grid */}
            <div className="grid grid-cols-2 gap-3">
              {options.map((opt, i) => {
                const Icon = opt.icon;
                return (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => navigate(opt.route)}
                    className={`glass-card p-5 text-center space-y-2 border ${opt.bg} active:scale-[0.97] transition-transform`}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${opt.bg} flex items-center justify-center mx-auto`}>
                      <Icon className={`w-6 h-6 ${opt.color}`} />
                    </div>
                    <p className="font-bold text-sm text-foreground">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </motion.button>
                );
              })}
            </div>

            {/* Request history */}
            <SalaryRequestsHistory userUuid={user.uuid} />
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default SalaryHome;
