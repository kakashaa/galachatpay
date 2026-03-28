import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Coins, Gift, Zap,
  AlertCircle, Lock, TrendingUp,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import SalaryRequestsHistory from "@/components/SalaryRequestsHistory";
import { galaApi } from "@/services/galaApi";
import { supabase } from "@/integrations/supabase/client";


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
  const [status, setStatus] = useState<WithdrawStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [salaryTab, setSalaryTab] = useState<"host" | "agency">("host");
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean | null>(null);
  const [cashResetOverride, setCashResetOverride] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchStatus();
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

  useEffect(() => {
    if (user?.uuid) {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      supabase.from("app_settings").select("key").in("key", [
        `cash_reset:${user.uuid}:host:${monthKey}`,
        `cash_reset:${user.uuid}:agency:${monthKey}`,
      ]).then(({ data }) => {
        if (data && data.length > 0) setCashResetOverride(true);
      });
    }
  }, [user?.uuid]);

  const fetchStatus = async () => {
    if (!status) setLoading(true);
    setError(false);
    try {
      const data: WithdrawStatus = await galaApi.withdrawStatus(user!.uuid) as any;
      if (data && !(data as any)?.transient_error) {
        setStatus(data);
        try { localStorage.setItem(`salary_cache_${user!.uuid}`, JSON.stringify(data)); } catch {}
        try { localStorage.setItem(SALARY_CACHE_KEY, JSON.stringify(data)); } catch {}
      } else if (!status) {
        setError(true);
      }
    } catch {
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

  const [cashResetOverride, setCashResetOverride] = useState(false);
  
  useEffect(() => {
    if (user?.uuid) {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      supabase.from("app_settings").select("key").in("key", [
        `cash_reset:${user.uuid}:host:${monthKey}`,
        `cash_reset:${user.uuid}:agency:${monthKey}`,
      ]).then(({ data }) => {
        if (data && data.length > 0) setCashResetOverride(true);
      });
    }
  }, [user?.uuid]);

  const cashUsedThisMonth = cashResetOverride ? false : ((host?.cash_used_this_month || false) || (agency?.cash_used_this_month || false));

  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const hoursUntilMonthEnd = (lastDayOfMonth.getTime() + 86400000 - now.getTime()) / 3600000;
  const isOwner = user?.uuid === "1000";
  const isCashWindowOpen = hoursUntilMonthEnd <= 24 || isOwner || cashResetOverride;
  const cashLocked = cashUsedThisMonth || !isCashWindowOpen;

  const options = [
    { id: "cash", icon: Wallet, label: "سحب نقدي", route: "/salary/cash", locked: cashLocked, gold: false },
    { id: "charge_self", icon: Coins, label: "شحن لحسابي", route: "/salary/charge-self", locked: false, gold: false },
    { id: "charge_other", icon: Gift, label: "شحن لمستخدم آخر", route: "/salary/charge-other", locked: false, gold: false },
    { id: "instant", icon: Zap, label: "سحب راتبي الفوري", route: "/salary/instant", locked: false, gold: true },
  ];

  return (
    <MobileLayout showHeader headerTitle="راتبي" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-3 space-y-5" style={{ fontFamily: "'Tajawal', sans-serif" }}>

        {/* Phone verification banner */}
        {isPhoneVerified === false && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(233,193,118,0.08)" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">⚠️</span>
              <p className="text-xs font-bold truncate" style={{ color: "#e9c176" }}>
                حسابك غير موثق — وثّق عشان تسحب
              </p>
            </div>
            <button
              onClick={() => navigate("/verify")}
              className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black active:scale-95 transition-transform"
              style={{ background: "rgba(233,193,118,0.15)", color: "#e9c176" }}
            >
              وثّق الآن
            </button>
          </motion.div>
        )}

        {/* Loading animation */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-full"
                style={{ border: "3px solid rgba(233,193,118,0.1)", borderTopColor: "#e9c176" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold animate-pulse" style={{ color: "#e9c176" }}>جاري تحميل بيانات الراتب...</p>
              <p className="text-[10px]" style={{ color: "#78839c" }}>يتم جلب البيانات الحقيقية من السيرفر</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="w-10 h-10" style={{ color: "#ffb4ab" }} />
            <p className="text-sm font-bold" style={{ color: "#ffb4ab" }}>فشل جلب الراتب</p>
            <p className="text-xs text-center px-4" style={{ color: "#78839c" }}>السيرفر قد يكون مشغول — حاول مرة ثانية</p>
            <button onClick={fetchStatus} className="mt-2 px-5 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition-transform"
              style={{ background: "rgba(187,198,226,0.12)", color: "#bbc6e2" }}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {!error && status && (
          <>
            {/* ══════ Progress Horizon ══════ */}
            <div className="w-full opacity-40" style={{
              height: "2px",
              background: "linear-gradient(90deg, transparent, #4ae183, transparent)",
              boxShadow: "0 0 8px #4ae183",
            }} />

            {/* ══════ 1. Hero Balance Card ══════ */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl p-6 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #0f1a2e 0%, #1c2026 100%)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Ambient gold glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 blur-3xl" style={{ background: "#e9c176" }} />

              {/* Top: label + badge */}
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] tracking-widest opacity-80" style={{ color: "#c4c6cc", fontFamily: "'Manrope', sans-serif" }}>الإجمالي المستحق</p>
                  {totalAvailable > 0 ? (
                    <h2 className="text-4xl font-extrabold tracking-tight" dir="ltr"
                      style={{ color: "#e9c176", fontFamily: "'Manrope', sans-serif" }}>
                      <span className="text-lg ml-1 font-medium" style={{ color: "#bbc6e2" }}>$</span>
                      {totalAvailable.toFixed(2)}
                    </h2>
                  ) : (
                    <p className="text-sm py-2" style={{ color: "#78839c" }}>لا يوجد رصيد متاح</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(74,225,131,0.1)", border: "1px solid rgba(74,225,131,0.2)" }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ae183" }} />
                  <span className="text-[10px] font-bold" style={{ color: "#4ae183" }}>نشط</span>
                </div>
              </div>

              {/* Sub-cards: host + agency salary */}
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="rounded-2xl p-4 transition-transform duration-300"
                  style={{ background: "rgba(49,53,60,0.4)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[10px] mb-1 font-medium opacity-70" style={{ color: "#c4c6cc" }}>راتب المضيف</p>
                  <p className="text-lg font-bold tracking-tight" dir="ltr" style={{ color: "#bbc6e2", fontFamily: "'Manrope', sans-serif" }}>
                    {hostAvailable > 0 ? `$${hostAvailable.toFixed(2)}` : "—"}
                  </p>
                </div>
                {isAgencyOwner && (
                  <div className="rounded-2xl p-4 transition-transform duration-300"
                    style={{ background: "rgba(49,53,60,0.4)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px] mb-1 font-medium opacity-70" style={{ color: "#c4c6cc" }}>راتب الوكالة</p>
                    <p className="text-lg font-bold tracking-tight" dir="ltr" style={{ color: "#bbc6e2", fontFamily: "'Manrope', sans-serif" }}>
                      {agencyAvailable > 0 ? `$${agencyAvailable.toFixed(2)}` : "—"}
                    </p>
                  </div>
                )}
                {!isAgencyOwner && (
                  <div className="rounded-2xl p-4"
                    style={{ background: "rgba(49,53,60,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px] mb-1 font-medium opacity-70" style={{ color: "#c4c6cc" }}>الراتب</p>
                    <p className="text-lg font-bold tracking-tight" dir="ltr" style={{ color: "#bbc6e2", fontFamily: "'Manrope', sans-serif" }}>
                      {host?.current_month ? `$${host.current_month.toFixed(2)}` : "—"}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[10px]" style={{ color: "rgba(196,198,204,0.5)" }}>آخر تحديث: الآن</span>
                <TrendingUp className="w-4 h-4" style={{ color: "rgba(233,193,118,0.6)" }} />
              </div>
            </motion.section>

            {/* ══════ 2. Action Grid (2x2 Bento) ══════ */}
            <section className="grid grid-cols-2 gap-2">
              {options.map((opt, i) => {
                const Icon = opt.icon;
                return (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                    onClick={() => !opt.locked && navigate(opt.route)}
                    disabled={opt.locked}
                    className={`relative p-3.5 rounded-2xl flex flex-col items-start gap-2 transition-all ${
                      opt.locked ? "opacity-40 cursor-not-allowed" : "active:scale-95"
                    }`}
                    style={{
                      background: opt.gold ? "rgba(233,193,118,0.05)" : "#181c22",
                      border: opt.gold ? "1px solid rgba(233,193,118,0.2)" : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {opt.locked && (
                      <Lock className="absolute top-3 left-3 w-3.5 h-3.5" style={{ color: "#78839c" }} />
                    )}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: opt.gold ? "#e9c176" : "rgba(187,198,226,0.1)" }}>
                      <Icon className="w-4 h-4" style={{ color: opt.gold ? "#10141a" : "#bbc6e2" }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: "#dfe2eb" }}>{opt.label}</span>
                  </motion.button>
                );
              })}
            </section>

            {cashLocked && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] px-4" style={{ color: "#e9c176" }}>
                <Lock className="w-3 h-3" />
                <span>
                  {cashUsedThisMonth
                    ? "تم استخدام السحب النقدي هذا الشهر"
                    : `السحب النقدي يفتح آخر 24 ساعة من الشهر (${lastDayOfMonth.getDate()}/${lastDayOfMonth.getMonth() + 1})`
                  }
                </span>
              </div>
            )}

            {/* ══════ 3. Salary Details ══════ */}
            <div className="space-y-2">
              {isAgencyOwner && (
                <div className="flex rounded-2xl p-1 gap-1" style={{ background: "rgba(15,26,46,0.5)" }}>
                  <button
                    onClick={() => setSalaryTab("host")}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                    style={salaryTab === "host" ? { background: "rgba(74,225,131,0.1)", color: "#4ae183" } : { color: "#78839c" }}
                  >
                    المضيف
                  </button>
                  <button
                    onClick={() => setSalaryTab("agency")}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                    style={salaryTab === "agency" ? { background: "rgba(187,198,226,0.1)", color: "#bbc6e2" } : { color: "#78839c" }}
                  >
                    الوكالة
                  </button>
                </div>
              )}

              {/* Host details */}
              {(salaryTab === "host" || !isAgencyOwner) && host && host.current_month > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl p-4 space-y-2"
                  style={{ background: "linear-gradient(145deg, #0f1a2e, #1c2028)" }}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span style={{ color: "#78839c" }}>الراتب</span>
                    <span className="font-bold tabular-nums" dir="ltr" style={{ color: "#dfe2eb", fontFamily: "'Manrope', sans-serif" }}>${host.current_month.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span style={{ color: "#78839c" }}>الخصم</span>
                    {hostCutInvalid ? (
                      <span className="text-[10px] font-bold" style={{ color: "#e9c176" }}>⚠️ مراجعة</span>
                    ) : (
                      <span className="font-bold tabular-nums" dir="ltr" style={{ color: "#ffb4ab", fontFamily: "'Manrope', sans-serif" }}>-${hostCut.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="h-px" style={{ background: "rgba(187,198,226,0.06)" }} />
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold" style={{ color: "#78839c" }}>المتبقي</span>
                    <span className="font-extrabold tabular-nums" dir="ltr" style={{ color: "#e9c176", fontFamily: "'Manrope', sans-serif" }}>${hostAvailable.toFixed(2)}</span>
                  </div>
                  {hostCutInvalid && host.note_ar && (
                    <p className="text-[9px] text-center" style={{ color: "#e9c176" }}>{host.note_ar}</p>
                  )}
                </motion.div>
              )}

              {/* Agency details */}
              {salaryTab === "agency" && isAgencyOwner && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl p-4 space-y-2"
                  style={{ background: "linear-gradient(145deg, #0f1a2e, #1c2028)" }}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span style={{ color: "#78839c" }}>الإجمالي</span>
                    <span className="font-bold tabular-nums" dir="ltr" style={{ color: "#dfe2eb", fontFamily: "'Manrope', sans-serif" }}>${agencyPoolTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span style={{ color: "#78839c" }}>المسحوبات</span>
                    <span className="font-bold tabular-nums" dir="ltr" style={{ color: "#ffb4ab", fontFamily: "'Manrope', sans-serif" }}>-${agencyPoolCut.toFixed(2)}</span>
                  </div>
                  <div className="h-px" style={{ background: "rgba(187,198,226,0.06)" }} />
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold" style={{ color: "#78839c" }}>المتبقي</span>
                    <span className="font-extrabold tabular-nums" dir="ltr" style={{ color: "#e9c176", fontFamily: "'Manrope', sans-serif" }}>${agencyAvailable.toFixed(2)}</span>
                  </div>
                </motion.div>
              )}

              {/* No host salary */}
              {(salaryTab === "host" || !isAgencyOwner) && (!host || host.current_month <= 0) && (
                <p className="text-[10px] text-center py-2" style={{ color: "#78839c" }}>لا يوجد راتب مضيف هذا الشهر</p>
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
