import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Coins, Gift, Zap, DollarSign,
  Building2, CheckCircle, XCircle, AlertCircle,
  ChevronDown, Lock,
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
  const SALARY_CACHE_KEY = `salary_cache_${user?.uuid}`;
  const [status, setStatus] = useState<WithdrawStatus | null>(() => {
    try {
      const cached = localStorage.getItem(SALARY_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(!status);
  const [error, setError] = useState(false);
  const [salaryTab, setSalaryTab] = useState<"host" | "agency">("host");

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchStatus();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    document.addEventListener("visibilitychange", handleVisibility);

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
      // Force no-cache fetch
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

  const hostCut = host ? (host.monthly_cut ?? host.total_cut) : 0;
  const hostOverWithdrawn = host?.over_withdrawn === true;
  const hostCutInvalid = host ? (hostOverWithdrawn || hostCut > host.current_month) : false;
  const hostAvailable = host ? (host.available ?? Math.max(0, host.current_month - (hostCutInvalid ? 0 : hostCut))) : 0;

  const agencyPoolTotal = agency ? (agency.monthly_pool_total ?? agency.pool_total) : 0;
  const agencyPoolCut = agency ? (agency.monthly_pool_cut ?? agency.pool_cut) : 0;
  const agencyAvailable = agency ? (agency.pool_available ?? Math.max(0, agencyPoolTotal - agencyPoolCut)) : 0;
  const totalAvailable = hostAvailable + (isAgencyOwner ? agencyAvailable : 0);

  const cashUsedThisMonth = (host?.cash_used_this_month || false) || (agency?.cash_used_this_month || false);

  const options = [
    {
      id: "cash",
      icon: Wallet,
      label: "سحب نقدي",
      desc: "تحويل بنكي",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      route: "/salary/cash",
      locked: cashUsedThisMonth,
    },
    {
      id: "charge_self",
      icon: Coins,
      label: "شحن لحسابي",
      desc: "كوينزات بحسابك",
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      route: "/salary/charge-self",
      locked: false,
    },
    {
      id: "charge_other",
      icon: Gift,
      label: "شحن لحساب آخر",
      desc: "أرسل لصديقك",
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
      route: "/salary/charge-other",
      locked: false,
    },
    {
      id: "instant",
      icon: Zap,
      label: "سحب فوري",
      desc: "بيع كوينزاتك",
      color: "text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/20",
      route: "/salary/instant",
      locked: false,
    },
  ];

  return (
    <MobileLayout showHeader headerTitle="راتبي" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-6 space-y-5">

        {/* Loading skeleton */}
        {loading && !status && (
          <div className="space-y-4">
            <div className="glass-card p-5 text-center space-y-3">
              <div className="h-3 w-32 mx-auto rounded bg-muted animate-pulse" />
              <div className="h-10 w-40 mx-auto rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 mx-auto rounded bg-muted animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
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
            {/* ══════ 1. Total Available - Hero Card ══════ */}
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

                  {/* Quick host/agency split */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <span className="text-[10px] text-muted-foreground">
                      مضيف: <span className="text-emerald-400 font-bold" dir="ltr">${hostAvailable.toFixed(2)}</span>
                    </span>
                    {isAgencyOwner && (
                      <span className="text-[10px] text-muted-foreground">
                        وكالة: <span className="text-violet-400 font-bold" dir="ltr">${agencyAvailable.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-3">لا يوجد رصيد متاح</p>
              )}
            </motion.div>

            {/* ══════ 2. Previous Requests (moved to top) ══════ */}
            <SalaryRequestsHistory userUuid={user.uuid} />

            {/* ══════ 3. Withdrawal Options - 2x2 Grid ══════ */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-foreground px-1">خيارات السحب</h3>
              
              {cashUsedThisMonth && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-[11px] text-amber-400 font-semibold">تم استخدام السحب النقدي هذا الشهر</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {options.map((opt, i) => {
                  const Icon = opt.icon;
                  const isLocked = opt.locked;
                  return (
                    <motion.button
                      key={opt.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => !isLocked && navigate(opt.route)}
                      disabled={isLocked}
                      className={`relative rounded-2xl p-5 text-center space-y-2 border ${opt.bg} transition-all ${
                        isLocked
                          ? "opacity-40 cursor-not-allowed"
                          : "active:scale-[0.97]"
                      }`}
                    >
                      {isLocked && (
                        <div className="absolute top-2 left-2">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-2xl ${opt.bg} flex items-center justify-center mx-auto`}>
                        <Icon className={`w-6 h-6 ${opt.color}`} />
                      </div>
                      <p className="font-bold text-sm text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ══════ 4. Salary Details - Merged with Tabs ══════ */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-foreground px-1">تفاصيل الراتب</h3>

              {/* Tab switcher (only if agency owner) */}
              {isAgencyOwner && (
                <div className="flex rounded-xl bg-muted/20 p-1 gap-1">
                  <button
                    onClick={() => setSalaryTab("host")}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
                      salaryTab === "host"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 inline-block ml-1" />
                    المضيف
                  </button>
                  <button
                    onClick={() => setSalaryTab("agency")}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
                      salaryTab === "agency"
                        ? "bg-violet-500/20 text-violet-400 border border-violet-500/20"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 inline-block ml-1" />
                    الوكالة
                  </button>
                </div>
              )}

              {/* Host Details */}
              {(salaryTab === "host" || !isAgencyOwner) && host && host.current_month > 0 && (
                <motion.div
                  key="host-details"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border/10 bg-card/30 p-4 space-y-3"
                >
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-background/40 p-3">
                      <p className="text-[9px] text-muted-foreground mb-1">الراتب</p>
                      <p className="text-sm font-black text-foreground tabular-nums" dir="ltr">${host.current_month.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-background/40 p-3">
                      <p className="text-[9px] text-muted-foreground mb-1">الخصم</p>
                      {hostCutInvalid ? (
                        <p className="text-[10px] font-bold text-amber-400">⚠️ مراجعة</p>
                      ) : (
                        <p className="text-sm font-black text-red-400 tabular-nums" dir="ltr">${hostCut.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-background/40 p-3">
                      <p className="text-[9px] text-muted-foreground mb-1">المتبقي</p>
                      <p className="text-sm font-black text-emerald-400 tabular-nums" dir="ltr">${hostAvailable.toFixed(2)}</p>
                    </div>
                  </div>

                  {hostCutInvalid && (
                    <p className="text-[10px] text-amber-400 text-center">
                      {host.note_ar || (host.deficit ? `⚠️ عجز $${host.deficit.toFixed(2)}` : "⚠️ تحت المراجعة")}
                    </p>
                  )}

                  {host.is_valid && (
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-2.5 h-2.5" /> متطابق
                      </span>
                    </div>
                  )}

                  {host.cash_used_this_month && (
                    <p className="text-[10px] text-amber-400 text-center">✅ تم السحب النقدي هذا الشهر</p>
                  )}
                </motion.div>
              )}

              {/* Agency Details */}
              {salaryTab === "agency" && isAgencyOwner && (
                <motion.div
                  key="agency-details"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border/10 bg-card/30 p-4 space-y-3"
                >
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-background/40 p-3">
                      <p className="text-[9px] text-muted-foreground mb-1">الإجمالي</p>
                      <p className="text-sm font-black text-foreground tabular-nums" dir="ltr">${agencyPoolTotal.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-background/40 p-3">
                      <p className="text-[9px] text-muted-foreground mb-1">المسحوبات</p>
                      <p className="text-sm font-black text-red-400 tabular-nums" dir="ltr">${agencyPoolCut.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-background/40 p-3">
                      <p className="text-[9px] text-muted-foreground mb-1">المتبقي</p>
                      <p className="text-sm font-black text-emerald-400 tabular-nums" dir="ltr">${agencyAvailable.toFixed(2)}</p>
                    </div>
                  </div>

                  {(agency?.user_share_this_month || 0) > 0 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      حصتك: <span className="font-bold text-foreground" dir="ltr">${agency?.user_share_this_month?.toFixed(2)}</span>
                    </p>
                  )}

                  {agency?.can_withdraw && (
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-2.5 h-2.5" /> متاح للسحب
                      </span>
                    </div>
                  )}

                  {agency?.cash_used_this_month && (
                    <p className="text-[10px] text-amber-400 text-center">✅ تم السحب النقدي هذا الشهر</p>
                  )}
                </motion.div>
              )}

              {/* No host salary message */}
              {(salaryTab === "host" || !isAgencyOwner) && (!host || host.current_month <= 0) && (
                <div className="rounded-2xl border border-border/10 bg-card/20 p-4 text-center">
                  <p className="text-[11px] text-muted-foreground">لا يوجد راتب مضيف هذا الشهر</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default SalaryHome;
