import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Coins, Gift, Zap, DollarSign,
  Building2, CheckCircle, XCircle, AlertCircle,
  Lock,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import SalaryRequestsHistory from "@/components/SalaryRequestsHistory";
import { galaApi } from "@/services/galaApi";
import { supabase } from "@/integrations/supabase/client";
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
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    const cached = localStorage.getItem(`salary_cache_${user.uuid}`);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        if (cachedData && !status) {
          setStatus(cachedData);
          setLoading(false);
        }
      } catch {}
    }
    fetchStatus();
    // Check phone verification status
    supabase
      .from("verified_phones")
      .select("*")
      .eq("user_uuid", user.uuid)
      .eq("is_verified", true)
      .maybeSingle()
      .then(({ data }) => setIsPhoneVerified(!!data))
      .then(undefined, () => setIsPhoneVerified(false));
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
      // Use withdrawStatus FIRST (fast — 0.1s) for accurate numbers
      const data: WithdrawStatus = await galaApi.withdrawStatus(user!.uuid) as any;
      if (data && !(data as any)?.transient_error) {
        // Deduct approved salary_requests from available balance
        const monthStart = new Date().toISOString().slice(0, 8) + "01";
        const { data: withdrawals } = await supabase
          .from("salary_requests")
          .select("amount_usd, request_type")
          .eq("user_uuid", user!.uuid)
          .neq("status", "rejected")
          .gte("created_at", monthStart);
        
        // Deduct withdrawals by type
        const hostTypes = ["cash", "host", "charge_self", "charge_other"];
        const agencyTypes = ["agency_cash", "agency_charge_self", "agency_charge_other"];
        const hostWithdrawn = (withdrawals || []).filter((w: any) => hostTypes.includes(w.request_type)).reduce((s: number, w: any) => s + (w.amount_usd || 0), 0);
        const agencyWithdrawn = (withdrawals || []).filter((w: any) => agencyTypes.includes(w.request_type) || w.request_type?.startsWith("agency")).reduce((s: number, w: any) => s + (w.amount_usd || 0), 0);
        
        if (data.host_salary) {
          data.host_salary.available = Math.max(0, (data.host_salary.available || 0) - hostWithdrawn);
        }
        if (data.agency_salary) {
          data.agency_salary.pool_available = Math.max(0, (data.agency_salary.pool_available || 0) - agencyWithdrawn);
        }
        
        setStatus(data);
        try { localStorage.setItem(`salary_cache_${user!.uuid}`, JSON.stringify(data)); } catch {}
        try { localStorage.setItem(SALARY_CACHE_KEY, JSON.stringify(data)); } catch {}
      } else if (!status) {
        setError(true);
      }
    } catch {
      // Fallback to salaryCheckAll if withdrawStatus fails
      try {
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
            agency_salary: allData.agency_salary ? {
              user_share_this_month: allData.agency_salary?.amount || 0,
              pool_total: allData.agency_salary?.pool_total || 0,
              pool_cut: allData.agency_salary?.pool_cut || 0,
              pool_available: allData.agency_salary?.amount || 0,
              monthly_pool_total: allData.agency_salary?.amount || 0,
              monthly_pool_cut: 0,
              cash_used_this_month: false,
              can_withdraw: true,
            } : undefined,
            withdrawal_options: { cash_host: true, cash_agency: allData.is_agency_owner || false, coins_transfer: true, instant: true },
          };
          setStatus(mapped);
          try { localStorage.setItem(`salary_cache_${user!.uuid}`, JSON.stringify(mapped)); } catch {}
        }
      } catch {
        if (!status) setError(true);
      }
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
    { id: "cash", icon: Wallet, label: "سحب نقدي", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", route: "/salary/cash", locked: cashUsedThisMonth },
    { id: "charge_self", icon: Coins, label: "شحن لحسابي", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", route: "/salary/charge-self", locked: false },
    { id: "charge_other", icon: Gift, label: "شحن لآخر", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", route: "/salary/charge-other", locked: false },
    { id: "instant", icon: Zap, label: "سحب فوري", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", route: "/salary/instant", locked: false },
  ];

  return (
    <MobileLayout showHeader headerTitle="راتبي" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-3 space-y-3">

        {/* Phone verification banner */}
        {isPhoneVerified === false && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">⚠️</span>
              <p className="text-xs text-amber-300 font-bold truncate">
                حسابك غير موثق — وثّق عشان تسحب
              </p>
            </div>
            <button
              onClick={() => navigate("/verify")}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-black active:scale-95 transition-transform"
            >
              وثّق الآن
            </button>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && !status && (
          <div className="space-y-2">
            <div className="text-center py-3">
              <div className="h-2.5 w-24 mx-auto rounded bg-muted animate-pulse mb-2" />
              <div className="h-7 w-28 mx-auto rounded bg-muted animate-pulse" />
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-1 h-9 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
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
            {/* ══════ 1. Balance - Simple hero ══════ */}
            <div className="text-center py-2">
              <p className="text-[10px] text-muted-foreground mb-0.5">المبلغ المتاح للسحب</p>
              {totalAvailable > 0 ? (
                <>
                  <p className="text-3xl font-black text-emerald-400 tabular-nums leading-none" dir="ltr">
                    ${totalAvailable.toFixed(2)}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      مضيف <span className="text-emerald-400 font-bold" dir="ltr">${hostAvailable.toFixed(2)}</span>
                    </span>
                    {isAgencyOwner && (
                      <>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="text-[10px] text-muted-foreground">
                          وكالة <span className="text-violet-400 font-bold" dir="ltr">${agencyAvailable.toFixed(2)}</span>
                        </span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-1">لا يوجد رصيد متاح</p>
              )}
            </div>

            {/* ══════ 2. Withdrawal buttons - Pill row ══════ */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {options.map((opt, i) => {
                const Icon = opt.icon;
                return (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 + i * 0.03 }}
                    onClick={() => !opt.locked && navigate(opt.route)}
                    disabled={opt.locked}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold transition-all ${opt.bg} ${
                      opt.locked ? "opacity-40 cursor-not-allowed" : "active:scale-[0.96]"
                    }`}
                  >
                    {opt.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                    <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
                    <span className="text-foreground">{opt.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {cashUsedThisMonth && (
              <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400">
                <Lock className="w-3 h-3" />
                <span>تم استخدام السحب النقدي هذا الشهر</span>
              </div>
            )}

            {/* ══════ 3. Salary Details - Simple table ══════ */}
            <div className="space-y-1.5">
              {isAgencyOwner && (
                <div className="flex rounded-lg bg-muted/15 p-0.5 gap-0.5">
                  <button
                    onClick={() => setSalaryTab("host")}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      salaryTab === "host" ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    المضيف
                  </button>
                  <button
                    onClick={() => setSalaryTab("agency")}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      salaryTab === "agency" ? "bg-violet-500/15 text-violet-400" : "text-muted-foreground"
                    }`}
                  >
                    الوكالة
                  </button>
                </div>
              )}

              {/* Host details */}
              {(salaryTab === "host" || !isAgencyOwner) && host && host.current_month > 0 && (
                <div className="rounded-xl border border-border/10 bg-card/20 p-2.5 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">الراتب</span>
                    <span className="font-bold text-foreground tabular-nums" dir="ltr">${host.current_month.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">الخصم</span>
                    {hostCutInvalid ? (
                      <span className="text-amber-400 text-[10px] font-bold">⚠️ مراجعة</span>
                    ) : (
                      <span className="font-bold text-red-400 tabular-nums" dir="ltr">-${hostCut.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="h-px bg-border/10" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-bold">المتبقي</span>
                    <span className="font-black text-emerald-400 tabular-nums" dir="ltr">${hostAvailable.toFixed(2)}</span>
                  </div>
                  {hostCutInvalid && host.note_ar && (
                    <p className="text-[9px] text-amber-400 text-center">{host.note_ar}</p>
                  )}
                </div>
              )}

              {/* Agency details */}
              {salaryTab === "agency" && isAgencyOwner && (
                <div className="rounded-xl border border-border/10 bg-card/20 p-2.5 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">الإجمالي</span>
                    <span className="font-bold text-foreground tabular-nums" dir="ltr">${agencyPoolTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">المسحوبات</span>
                    <span className="font-bold text-red-400 tabular-nums" dir="ltr">-${agencyPoolCut.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-border/10" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-bold">المتبقي</span>
                    <span className="font-black text-emerald-400 tabular-nums" dir="ltr">${agencyAvailable.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* No host salary */}
              {(salaryTab === "host" || !isAgencyOwner) && (!host || host.current_month <= 0) && (
                <p className="text-[10px] text-muted-foreground text-center py-2">لا يوجد راتب مضيف هذا الشهر</p>
              )}
            </div>

            {/* ══════ 4. Previous Requests ══════ */}
            <SalaryRequestsHistory userUuid={user.uuid} />
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default SalaryHome;
// Force sync 1774521745
