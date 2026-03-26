import React, { useState, useEffect, useRef } from "react";
import PageLoader from "@/components/PageLoader";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle, AlertCircle, Globe,
  UserCheck, ArrowRight, ArrowLeft, Phone,
  Loader2, Copy, Coins, Search, User,
  Wallet, Gift, DollarSign, Building2,
  RefreshCw, Clock,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { galaApi } from "@/services/galaApi";
import SalaryRequestsHistory from "@/components/SalaryRequestsHistory";
import SubmissionOverlay from "@/components/SubmissionOverlay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useVerifiedWhatsApp } from "@/hooks/use-verified-whatsapp";
import { Badge } from "@/components/ui/badge";

const HOST_RATE = 8500;
const AGENCY_RATE = 7500;

interface WithdrawStatusData {
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
    available: number;
    cash_used_this_month: boolean;
  };
  agency_salary?: {
    user_share_this_month: number;
    pool_total: number;
    pool_cut: number;
    pool_available: number;
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

interface TransferItem {
  reference_id: string;
  amount: number;
  usd?: number;
  coins?: number;
  time: string;
  to_uuid?: string;
  from_uuid?: string;
}

interface SalaryCountry {
  id: string;
  name: string;
  banks: { id: string; label: string }[];
}

const SALARY_COUNTRIES: SalaryCountry[] = [
  {
    id: "ye", name: "اليمن",
    banks: [
      { id: "jeeppay", label: "جيب (JeepPay)" },
      { id: "kuraimi", label: "الكريمي" },
      { id: "najm", label: "النجم" },
      { id: "ye_other", label: "أخرى (اكتب اسم البنك)" },
    ],
  },
  {
    id: "sa", name: "السعودية",
    banks: [
      { id: "rajhi", label: "بنك الراجحي" },
      { id: "ahli", label: "بنك الأهلي" },
      { id: "stcpay", label: "stc pay" },
    ],
  },
  { id: "qa", name: "قطر", banks: [{ id: "qa_bank", label: "تحويل بنكي" }] },
  { id: "om", name: "عمان", banks: [{ id: "om_bank", label: "تحويل بنكي" }] },
  { id: "ae", name: "الإمارات", banks: [{ id: "ae_bank", label: "تحويل بنكي" }] },
  { id: "kw", name: "الكويت", banks: [{ id: "kw_bank", label: "تحويل بنكي" }] },
  { id: "bh", name: "البحرين", banks: [{ id: "bh_bank", label: "تحويل بنكي" }] },
  { id: "dz", name: "الجزائر", banks: [{ id: "dz_bank", label: "تحويل بنكي" }] },
  { id: "ma", name: "المغرب", banks: [{ id: "ma_bank", label: "تحويل بنكي" }] },
  { id: "eg", name: "مصر", banks: [{ id: "eg_bank", label: "تحويل بنكي" }] },
  { id: "tn", name: "تونس", banks: [{ id: "tn_bank", label: "تحويل بنكي" }] },
  {
    id: "us", name: "أمريكا",
    banks: [
      { id: "zelle", label: "Zelle" },
      { id: "cashapp", label: "Cash App" },
      { id: "chime", label: "Chime" },
      { id: "applepay", label: "Apple Pay" },
    ],
  },
  {
    id: "intl", name: "تحويل دولي",
    banks: [
      { id: "usdt", label: "USDT" },
      { id: "western_union", label: "Western Union" },
      { id: "moneygram", label: "MoneyGram" },
    ],
  },
];

const COUNTRY_FLAGS: Record<string, string> = {
  ye: "🇾🇪", sa: "🇸🇦", qa: "🇶🇦", om: "🇴🇲", ae: "🇦🇪",
  kw: "🇰🇼", bh: "🇧🇭", dz: "🇩🇿", ma: "🇲🇦", eg: "🇪🇬",
  tn: "🇹🇳", us: "🇺🇸", intl: "🌍",
};

const BANK_ICONS: Record<string, { icon: string; color: string }> = {
  jeeppay: { icon: "", color: "from-green-600/20 to-green-700/10 border-green-500/20" },
  kuraimi: { icon: "", color: "from-blue-600/20 to-blue-700/10 border-blue-500/20" },
  najm: { icon: "", color: "from-yellow-600/20 to-yellow-700/10 border-yellow-500/20" },
  rajhi: { icon: "", color: "from-emerald-600/20 to-emerald-700/10 border-emerald-500/20" },
  ahli: { icon: "🏛", color: "from-teal-600/20 to-teal-700/10 border-teal-500/20" },
  stcpay: { icon: "", color: "from-purple-600/20 to-purple-700/10 border-purple-500/20" },
  zelle: { icon: "", color: "from-violet-600/20 to-violet-700/10 border-violet-500/20" },
  cashapp: { icon: "", color: "from-green-500/20 to-green-600/10 border-green-400/20" },
  chime: { icon: "", color: "from-cyan-600/20 to-cyan-700/10 border-cyan-500/20" },
  applepay: { icon: "🍎", color: "from-gray-600/20 to-gray-700/10 border-gray-500/20" },
  usdt: { icon: "₮", color: "from-green-600/20 to-green-700/10 border-green-500/20" },
  western_union: { icon: "", color: "from-yellow-600/20 to-yellow-700/10 border-yellow-500/20" },
  moneygram: { icon: "", color: "from-orange-600/20 to-orange-700/10 border-orange-500/20" },
};

const countryCodes = [
  { code: "+967", flag: "🇾🇪" }, { code: "+966", flag: "🇸🇦" },
  { code: "+1", flag: "🇺🇸" }, { code: "+20", flag: "🇪🇬" },
  { code: "+213", flag: "🇩🇿" }, { code: "+212", flag: "🇲🇦" },
  { code: "+962", flag: "🇯🇴" }, { code: "+90", flag: "🇹🇷" },
  { code: "+974", flag: "🇶🇦" }, { code: "+968", flag: "🇴🇲" },
  { code: "+971", flag: "🇦🇪" }, { code: "+965", flag: "🇰🇼" },
  { code: "+973", flag: "🇧🇭" }, { code: "+216", flag: "🇹🇳" },
  { code: "+91", flag: "🇮🇳" }, { code: "+92", flag: "🇵🇰" },
  { code: "+880", flag: "🇧🇩" },
];

type SalaryType = "host" | "agency";

const SalaryWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { verifiedPhone } = useVerifiedWhatsApp(user?.uuid);

  const pathMode = location.pathname.includes("/salary/charge-other")
    ? "charge_other"
    : location.pathname.includes("/salary/charge-self")
      ? "charge_self"
      : "cash";

  const modeConfig = {
    cash: { title: "سحب نقدي", icon: Wallet, color: "text-emerald-400" },
    charge_self: { title: "شحن لحسابي", icon: Coins, color: "text-amber-400" },
    charge_other: { title: "شحن لحساب آخر", icon: Gift, color: "text-violet-400" },
  };

  // State
  const [step, setStep] = useState<string>("loading");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusData, setStatusData] = useState<WithdrawStatusData | null>(null);
  const [salaryType, setSalaryType] = useState<SalaryType>("host");

  // Transfers list
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [expiredTransfers, setExpiredTransfers] = useState<TransferItem[]>([]);
  const [expiredCashCount, setExpiredCashCount] = useState(0);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferItem | null>(null);
  const [localUsedIds, setLocalUsedIds] = useState<Set<string>>(new Set());

  // Bank (cash mode)
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [customBankName, setCustomBankName] = useState("");

  // Account (cash mode)
  const [recipientName, setRecipientName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [whatsappCode, setWhatsappCode] = useState("+967");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Charge other
  const [targetUuid, setTargetUuid] = useState("");
  const [targetSearching, setTargetSearching] = useState(false);
  const [targetInfo, setTargetInfo] = useState<{ name: string; avatar: string; uuid: string } | null>(null);
  const [targetConfirmed, setTargetConfirmed] = useState(false);

  // Processing
  const [processing, setProcessing] = useState(false);
  const [processStage, setProcessStage] = useState<"check" | "save">("check");

  const hasFetchedRef = useRef(false);
  const processInFlightRef = useRef(false);
  const [cashResetOverride, setCashResetOverride] = useState<{ host: boolean; agency: boolean }>({ host: false, agency: false });

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchWithdrawStatus();
    checkCashResetOverrides();

    // Auto-refresh when returning to page
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchWithdrawStatus();
        fetchTransfers();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };

    // Auto-fill verified WhatsApp
    if (verifiedPhone) {
      setWhatsappNumber(verifiedPhone);
      setWhatsappCode("");
    }
  }, [user?.uuid, verifiedPhone]);

  const checkCashResetOverrides = async () => {
    if (!user?.uuid) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { data } = await supabase
      .from("app_settings")
      .select("key")
      .in("key", [
        `cash_reset:${user.uuid}:host:${monthKey}`,
        `cash_reset:${user.uuid}:agency:${monthKey}`,
      ]);
    if (data && data.length > 0) {
      setCashResetOverride({
        host: data.some(r => r.key.includes(":host:")),
        agency: data.some(r => r.key.includes(":agency:")),
      });
    }
  };

  const fetchWithdrawStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const data: WithdrawStatusData = await galaApi.withdrawStatus(user!.uuid) as any;
      setStatusData(data);

      const hostAvail = data.host_salary?.available || 0;
      const agencyAvail = data.agency_salary?.pool_available || 0;
      const isAgency = data.is_agency_owner || false;

      if (hostAvail <= 0 && isAgency && agencyAvail > 0) {
        setSalaryType("agency");
      }

      if (pathMode === "cash") {
        if (hostAvail <= 0 && (!isAgency || agencyAvail <= 0)) {
          setStep("no_salary");
          return;
        }
      } else {
        if (hostAvail <= 0 && (!isAgency || agencyAvail <= 0)) {
          setStep("no_salary");
          return;
        }
      }

      if (isAgency && agencyAvail > 0 && hostAvail > 0) {
        setStep("select_type");
      } else if (isAgency && agencyAvail > 0 && hostAvail <= 0) {
        setSalaryType("agency");
        setStep("select_transfer");
        fetchTransfers();
      } else {
        setSalaryType("host");
        setStep("select_transfer");
        fetchTransfers();
      }
    } catch {
      setError("فشل الاتصال بالخادم");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    if (!user?.uuid) return;
    setTransfersLoading(true);
    try {
      const [apiData, usedRes] = await Promise.all([
        galaApi.userTransfers(user.uuid) as any,
        supabase
          .from("salary_requests")
          .select("transfer_id, status, is_final_rejection")
          .eq("user_uuid", user.uuid),
      ]);

      // Build used IDs set:
      // ALL transfer_ids in salary_requests are LOCKED — no reuse ever
      const usedIds = new Set([
        ...(usedRes.data || [])
          .map((r: any) => r.transfer_id)
          .filter(Boolean),
        ...localUsedIds,
      ]);

      // Filter: transfers to UUID 10000, not already used
      // Cash: today only | Other methods: all dates
      const today = new Date().toISOString().slice(0, 10);
      const isCashMode = pathMode === "cash";
      const allTransfers = (apiData?.transfers || apiData?.data || []);
      
      const mapTransfer = (t: any): TransferItem => ({
        reference_id: t.reference_id || t.id || "",
        amount: t.amount || t.amount_usd || t.usd || 0,
        usd: t.usd || t.amount_usd || t.amount || 0,
        coins: t.coins || t.amount_coins || 0,
        time: t.time || t.created_at || "",
        to_uuid: String(t.to_uuid || t.receiver_uuid || "10000"),
        from_uuid: String(t.from_uuid || t.sender_uuid || ""),
      });

      const list: TransferItem[] = allTransfers
        .filter((t: any) => {
          const toUuid = String(t.to_uuid || t.receiver_uuid || "");
          const date = (t.time || t.created_at || "").slice(0, 10);
          const refId = String(t.reference_id || t.id || "");
          if (toUuid && toUuid !== "10000") return false;
          if (usedIds.has(refId)) return false;
          if (t.is_used) return false;
          if (isCashMode && date !== today) return false;
          if (isCashMode) {
            const transferTime = new Date(t.time || t.created_at || "");
            const now = new Date();
            const hoursOld = (now.getTime() - transferTime.getTime()) / (1000 * 60 * 60);
            if (hoursOld > 2) return false;
          }
          return true;
        })
        .map(mapTransfer);
      setTransfers(list);

      // Build map of used transfer statuses
      const usedStatusMap = new Map<string, string>();
      (usedRes.data || []).forEach((r: any) => {
        if (r.transfer_id) usedStatusMap.set(String(r.transfer_id), r.status || "pending");
      });

      // Show ALL old transfers with their status
      const expiredList: TransferItem[] = allTransfers
        .filter((t: any) => {
          const toUuid = String(t.to_uuid || t.receiver_uuid || "");
          const date = (t.time || t.created_at || "").slice(0, 10);
          if (toUuid && toUuid !== "10000") return false;
          return date !== today || usedIds.has(String(t.reference_id || t.id || ""));
        })
        .filter((t: any) => !list.some((l: any) => l.reference_id === String(t.reference_id || t.id || "")))
        .map((t: any) => {
          const refId = String(t.reference_id || t.id || "");
          const usedStatus = usedStatusMap.get(refId);
          return {
            ...mapTransfer(t),
            usedStatus: usedStatus || (t.is_used ? "used" : "expired"),
          };
        });
      setExpiredTransfers(expiredList);

      if (isCashMode) {
        setExpiredCashCount(expiredList.length);
      } else {
        setExpiredCashCount(0);
      }
    } catch (err) {
      console.warn("Failed to fetch transfers:", err);
      setTransfers([]);
    } finally {
      setTransfersLoading(false);
    }
  };

  const getAvailableForType = (): number => {
    if (salaryType === "agency") return statusData?.agency_salary?.pool_available || 0;
    return statusData?.host_salary?.available || 0;
  };

  const getCoinsRate = (): number => {
    return salaryType === "agency" ? AGENCY_RATE : HOST_RATE;
  };

  const isCashUsed = (): boolean => {
    if (salaryType === "agency") {
      if (cashResetOverride.agency) return false;
      return statusData?.agency_salary?.cash_used_this_month || false;
    }
    if (cashResetOverride.host) return false;
    return statusData?.host_salary?.cash_used_this_month || false;
  };

  const searchTargetUser = async () => {
    if (!targetUuid.trim() || targetSearching) return;
    setTargetSearching(true);
    setTargetInfo(null);
    setTargetConfirmed(false);
    try {
      const data = await galaApi.checkSupporter(targetUuid.trim()) as any;
      const name = data.data?.name;
      if (name && data.ok !== false) {
        setTargetInfo({ name, avatar: data.data?.avatar || "", uuid: targetUuid.trim() });
      } else {
        toast.error("لم يتم العثور على المستخدم");
      }
    } catch {
      toast.error("فشل البحث");
    } finally {
      setTargetSearching(false);
    }
  };

  // Layer 4: Prevent back button on receipt
  useEffect(() => {
    if (step === "receipt") {
      window.history.pushState(null, "", window.location.href);
      const handleBack = () => {
        window.history.pushState(null, "", window.location.href);
        navigate("/dashboard", { replace: true });
      };
      window.addEventListener("popstate", handleBack);
      return () => window.removeEventListener("popstate", handleBack);
    }
  }, [step, navigate]);

  const executeWithdrawal = async () => {
    if (processing || processInFlightRef.current || !selectedTransfer) return;

    // Layer 1: Re-check transfer is from today
    const today = new Date().toISOString().slice(0, 10);
    if (!selectedTransfer.time?.startsWith(today)) {
      toast.error("الحوالة قديمة — لازم تكون من اليوم. تواصل مع الإدارة.");
      return;
    }

    processInFlightRef.current = true;
    setProcessing(true);
    setProcessStage("check");
    setError("");

    const amount = selectedTransfer.usd || selectedTransfer.amount || 0;
    const chargeTarget = pathMode === "charge_other" ? targetInfo?.uuid : undefined;

    try {
      // Layer 2: Salary check (security)
      setProcessStage("check");
      const check: WithdrawStatusData = await galaApi.withdrawStatus(user!.uuid) as any;

      const available = salaryType === "agency"
        ? (check.agency_salary?.pool_available || 0)
        : (check.host_salary?.available || 0);

      if (amount > available) {
        throw new Error(`المبلغ أكبر من المتبقي ($${available.toFixed(2)})`);
      }

      // 2. For coin charges (host), charge the target
      if (salaryType === "host" && (pathMode === "charge_self" || pathMode === "charge_other")) {
        const chargeTargetUuid = chargeTarget || user!.uuid;
        const chargeData = await galaApi.chargeCoins(
          chargeTargetUuid,
          amount,
          selectedTransfer.reference_id || "manual",
        );
        if (!(chargeData as any).success) {
          console.warn("chargeCoins response:", chargeData);
        }
      }

      // 3. Save to database
      setProcessStage("save");

      const requestType = salaryType === "agency"
        ? `agency_${pathMode}`
        : pathMode === "charge_other" ? "charge_other"
        : pathMode === "charge_self" ? "charge_self"
        : "cash";

      const targetName = chargeTarget
        ? targetInfo?.name || "مستخدم آخر"
        : pathMode === "charge_self"
          ? user!.name
          : recipientName;

      const country = SALARY_COUNTRIES.find(c => c.id === selectedCountry);
      const bank = country?.banks.find(b => b.id === selectedBank);
      const isOtherBank = selectedBank?.endsWith("_other");
      const effectiveBankLabel = isOtherBank ? customBankName : bank?.label;

      const rate = getCoinsRate();

      try {
        await supabase.from("salary_requests").insert({
          user_uuid: user!.uuid,
          user_name: user!.name,
          user_phone: pathMode === "cash" ? (verifiedPhone || `${whatsappCode}${whatsappNumber}`) : null,
          request_type: requestType,
          amount_usd: amount,
          amount_coins: amount * rate,
          recipient_name: targetName,
          recipient_country: pathMode === "cash" ? (country?.name || selectedCountry) : "coins",
          payment_method: pathMode === "cash" ? (effectiveBankLabel || selectedBank) : "coins_charge",
          payment_details: pathMode === "cash"
            ? `account:${accountNumber || "-"} | whatsapp:${verifiedPhone || `${whatsappCode}${whatsappNumber}`}${notes ? ` | notes:${notes}` : ""}`
            : `target_uuid:${chargeTarget || user!.uuid}`,
          status: pathMode === "cash" ? "pending" : "approved",
          transfer_id: selectedTransfer.reference_id,
          transaction_id: selectedTransfer.reference_id,
          transaction_date: selectedTransfer.time,
          target_uuid: chargeTarget || user!.uuid,
          target_name: targetName,
          admin_note: `حوالة يدوية #${selectedTransfer.reference_id} | ${salaryType === "agency" ? "وكالة" : "مضيف"} | ${notes || ""}`.trim(),
        } as any);
      } catch (saveErr) {
        console.warn("Failed to save salary request:", saveErr);
        toast.warning("تم السحب لكن فشل حفظ السجل — تواصل مع الأدمن");
      }

      // Layer 3: Mark transfer as used locally so it disappears immediately
      setLocalUsedIds(prev => new Set([...prev, selectedTransfer.reference_id]));
      setTransfers(prev => prev.filter(t => t.reference_id !== selectedTransfer.reference_id));

      // Go to receipt step (no re-submit)
      setStep("receipt");

    } catch (err: any) {
      setError(err.message || "فشل في العملية");
    } finally {
      setProcessing(false);
      processInFlightRef.current = false;
    }
  };

  if (!user) return null;

  const headerTitle = modeConfig[pathMode]?.title || "سحب الراتب";
  const transferAmount = selectedTransfer?.usd || selectedTransfer?.amount || 0;
  const remaining = getAvailableForType();
  const coinsRate = getCoinsRate();

  const country = SALARY_COUNTRIES.find(c => c.id === selectedCountry);
  const bank = country?.banks.find(b => b.id === selectedBank);
  const isOtherBank = selectedBank?.endsWith("_other");
  const effectiveBankLabel = isOtherBank ? customBankName : bank?.label;
  const canProceedBank = selectedCountry && selectedBank && (!isOtherBank || customBankName.trim().length >= 2);
  const canProceedAccount = recipientName.trim().length >= 2 && (!!verifiedPhone || whatsappNumber.trim().length >= 6);

  const getBackAction = () => {
    switch (step) {
      case "select_type": return () => navigate("/salary");
      case "select_transfer": return () => {
        if (statusData?.is_agency_owner && (statusData.host_salary?.available || 0) > 0 && (statusData.agency_salary?.pool_available || 0) > 0) {
          setStep("select_type");
        } else {
          navigate("/salary");
        }
      };
      case "bank": return () => setStep("select_transfer");
      case "account": return () => setStep("bank");
      case "charge_other_search": return () => setStep("select_transfer");
      default: return () => navigate("/salary");
    }
  };

  // ── LOADING ──
  if (loading || step === "loading") {
    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <PageLoader message="جاري تحميل بيانات السحب..." />
      </MobileLayout>
    );
  }

  // ── ERROR ──
  if (step === "error") {
    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-sm text-destructive text-center">{error}</p>
          <Button onClick={() => { hasFetchedRef.current = false; fetchWithdrawStatus(); }} className="mt-4">
            إعادة المحاولة
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // ── NO SALARY ──
  if (step === "no_salary") {
    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <div className="flex flex-col items-center justify-center py-16 px-6 gap-6">
          {/* Icon with animated rings */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 w-24 h-24 rounded-full bg-muted-foreground/10"
              style={{ margin: "-12px" }}
            />
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "hsl(var(--muted)/0.12)", border: "1px solid hsl(var(--border)/0.15)" }}>
              <DollarSign className="w-10 h-10 text-muted-foreground/40" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-foreground">لا يوجد رصيد</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              لا يوجد دعم هالشهر — ما يقدر يسحب
            </p>
          </div>

          {/* Info card */}
          <div className="w-full rounded-2xl p-4 space-y-3"
            style={{ background: "hsl(var(--muted)/0.06)", border: "1px solid hsl(var(--border)/0.1)" }}>
            <div className="flex items-start gap-3 rtl:flex-row-reverse">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--primary)/0.1)" }}>
                <AlertCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1 text-right flex-1">
                <p className="text-xs font-bold text-foreground">كيف أحصل على راتب؟</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  الراتب يتوفر بناءً على نشاطك الشهري. تأكد من استيفاء شروط الدعم للحصول على الراتب.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={() => navigate("/salary")} variant="outline"
            className="w-full h-12 rounded-xl border-border/20 font-bold">
            <ArrowRight className="w-4 h-4 ml-1" /> العودة
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // ── SELECT TYPE (host vs agency) ──
  if (step === "select_type") {
    const hostAvail = statusData?.host_salary?.available || 0;
    const agencyAvail = statusData?.agency_salary?.pool_available || 0;
    const hostCashUsed = cashResetOverride.host ? false : (statusData?.host_salary?.cash_used_this_month || false);
    const agencyCashUsed = cashResetOverride.agency ? false : (statusData?.agency_salary?.cash_used_this_month || false);

    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <div className="px-5 py-6 space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-base font-bold text-foreground">اختر نوع الراتب</h2>
            <p className="text-xs text-muted-foreground">من أي رصيد تبي تسحب؟</p>
          </div>

          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                if (pathMode === "cash" && hostCashUsed) return;
                setSalaryType("host");
                setSelectedTransfer(null);
                setStep("select_transfer");
                fetchTransfers();
              }}
              disabled={pathMode === "cash" && hostCashUsed}
              className={cn(
                "w-full rounded-2xl border p-5 text-right space-y-2 transition-all",
                pathMode === "cash" && hostCashUsed
                  ? "opacity-50 border-border/20 bg-muted/5"
                  : "border-emerald-500/20 bg-emerald-500/5 active:scale-[0.98]"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-foreground">راتب المضيف</span>
                </div>
                <span className="text-lg font-black text-emerald-400" dir="ltr">${hostAvail.toFixed(2)}</span>
              </div>
              {pathMode === "cash" && hostCashUsed && (
                <p className="text-[10px] text-amber-400">⚠️ تم السحب النقدي هذا الشهر</p>
              )}
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => {
                if (pathMode === "cash" && agencyCashUsed) return;
                setSalaryType("agency");
                setSelectedTransfer(null);
                setStep("select_transfer");
                fetchTransfers();
              }}
              disabled={pathMode === "cash" && agencyCashUsed}
              className={cn(
                "w-full rounded-2xl border p-5 text-right space-y-2 transition-all",
                pathMode === "cash" && agencyCashUsed
                  ? "opacity-50 border-border/20 bg-muted/5"
                  : "border-violet-500/20 bg-violet-500/5 active:scale-[0.98]"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-violet-400" />
                  <span className="font-bold text-foreground">راتب الوكالة</span>
                </div>
                <span className="text-lg font-black text-violet-400" dir="ltr">${agencyAvail.toFixed(2)}</span>
              </div>
              {pathMode === "cash" && agencyCashUsed && (
                <p className="text-[10px] text-amber-400">⚠️ تم السحب النقدي هذا الشهر</p>
              )}
            </motion.button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // ── SELECT TRANSFER ──
  if (step === "select_transfer") {
    const cashUsed = isCashUsed();
    if (pathMode === "cash" && cashUsed) {
      return (
        <MobileLayout showHeader headerTitle={headerTitle} onBack={getBackAction()}>
          <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-foreground">وصلت الحد الأقصى</h2>
            <p className="text-sm text-muted-foreground text-center">
              تم السحب النقدي لـ{salaryType === "agency" ? "الوكالة" : "المضيف"} هذا الشهر
            </p>
            <Button onClick={getBackAction()} variant="outline">رجوع</Button>
          </div>
        </MobileLayout>
      );
    }

    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={getBackAction()}>
        <div className="px-5 py-6 space-y-5">
          {/* Salary type badge */}
          <div className="flex justify-center">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5",
              salaryType === "agency"
                ? "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            )}>
              {salaryType === "agency" ? <Building2 className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
              {salaryType === "agency" ? "راتب الوكالة" : "راتب المضيف"}
            </span>
          </div>

          {/* Salary Summary */}
          <div className="rounded-2xl bg-muted/10 border border-border/20 p-5 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-bold text-foreground">المتبقي للسحب</span>
            </div>
            <p className="text-3xl font-black text-primary" dir="ltr">${remaining.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">= {(remaining * coinsRate).toLocaleString()} كوينز</p>
          </div>

          {/* Instructions */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
            <p className="text-xs font-bold text-primary">📋 خطوات السحب:</p>
            <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
              <li>حوّل المبلغ في التطبيق لـ UUID <span className="font-mono font-bold text-foreground">10000</span></li>
              <li>ارجع هنا واضغط "تحديث" لعرض الحوالة</li>
              <li>اختر الحوالة وأكمل طلب السحب</li>
            </ol>
          </div>

          {/* Transfers list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">{pathMode === "cash" ? "حوالاتك اليوم لـ 10000" : "حوالاتك لـ 10000"}</h3>
              <button
                onClick={fetchTransfers}
                disabled={transfersLoading}
                className="flex items-center gap-1.5 text-xs text-primary font-bold px-3 py-1.5 rounded-xl bg-primary/10 active:scale-95 transition-transform"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", transfersLoading && "animate-spin")} />
                تحديث
              </button>
            </div>

            {transfersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : transfers.length === 0 ? (
              <div className="rounded-2xl border border-border/20 bg-muted/5 p-8 text-center space-y-2">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-bold text-muted-foreground">لا توجد حوالات اليوم</p>
                <p className="text-[11px] text-muted-foreground">حوّل المبلغ من التطبيق لـ UUID 10000 ثم اضغط "تحديث"</p>
                {expiredCashCount > 0 && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-[11px] text-amber-400 font-bold">
                      يوجد {expiredCashCount} حوالة منتهية الصلاحية
                    </p>
                    <p className="text-[10px] text-amber-400/70 mt-1">
                      لا يمكن استخدامها. تواصل مع الإدارة للمساعدة.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {transfers.map((t, i) => {
                  const isSelected = selectedTransfer?.reference_id === t.reference_id;
                  const timeStr = t.time ? new Date(t.time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <motion.button
                      key={t.reference_id || i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedTransfer(isSelected ? null : t)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-right transition-all",
                        isSelected
                          ? "border-primary/40 bg-primary/10 ring-2 ring-primary/20"
                          : "border-border/20 bg-card hover:bg-muted/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-border/40" />
                          )}
                          <div className="text-right">
                            <p className="text-sm font-bold text-foreground" dir="ltr">${(t.usd || t.amount || 0).toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">#{t.reference_id}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground">{timeStr}</p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expired transfers (not selectable) */}
          {expiredTransfers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-400/80 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                حوالات سابقة ({expiredTransfers.length})
              </h3>
              {expiredTransfers.map((t: any, i: number) => {
                const timeStr = t.time ? new Date(t.time).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit" }) : "";
                const us = t.usedStatus;
                const isApproved = us === "approved" || us === "delivered";
                const isRejected = us === "rejected";
                const isPending = us === "pending" || us === "review";
                const statusLabel = isApproved ? "تم الاستلام" : isRejected ? "تم الرفض" : isPending ? "قيد المراجعة" : "منتهية الصلاحية";
                const statusColor = isApproved ? "text-emerald-400" : isRejected ? "text-red-400" : isPending ? "text-yellow-400" : "text-amber-400";
                const borderColor = isApproved ? "border-emerald-500/15 bg-emerald-500/5" : isRejected ? "border-red-500/15 bg-red-500/5" : isPending ? "border-yellow-500/15 bg-yellow-500/5" : "border-amber-500/15 bg-amber-500/5";
                return (
                  <div
                    key={t.reference_id || i}
                    className={`w-full rounded-xl border ${borderColor} p-3 text-right opacity-70`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs font-bold text-foreground/70" dir="ltr">${(t.usd || t.amount || 0).toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground font-mono">#{t.reference_id}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`text-[10px] font-bold ${statusColor}`}>{statusLabel}</p>
                        <p className="text-[9px] text-muted-foreground">{timeStr}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Proceed button */}
          {selectedTransfer && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center mb-3">
                <p className="text-xs text-muted-foreground">الحوالة المختارة</p>
                <p className="text-lg font-black text-emerald-400" dir="ltr">${transferAmount.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground font-mono">#{selectedTransfer.reference_id}</p>
              </div>
              <Button
                onClick={() => {
                  if (pathMode === "cash") {
                    setStep("bank");
                  } else if (pathMode === "charge_other") {
                    setTargetUuid("");
                    setTargetInfo(null);
                    setTargetConfirmed(false);
                    setStep("charge_other_search");
                  } else {
                    // charge_self → execute directly
                    executeWithdrawal();
                  }
                }}
                disabled={processing}
                className="w-full h-12 gold-gradient text-primary-foreground font-bold disabled:opacity-40"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : pathMode === "charge_self" ? (
                  <>شحن {(transferAmount * coinsRate).toLocaleString()} كوينز لحسابي</>
                ) : (
                  <>متابعة <ArrowLeft className="w-4 h-4 mr-1" /></>
                )}
              </Button>
            </motion.div>
          )}

          <SalaryRequestsHistory userUuid={user.uuid} />

          <SubmissionOverlay
            visible={processing}
            title="جاري تنفيذ العملية"
            activeStep={processStage === "check" ? 0 : 1}
            steps={[
              { label: "جاري فحص الراتب...", completedLabel: "تم الفحص ✓", icon: <></> },
              { label: "جاري تسجيل العملية...", completedLabel: "تم التسجيل ✓", icon: <></> },
            ]}
          />
        </div>
      </MobileLayout>
    );
  }

  // ── SUCCESS ──
  if (step === "receipt" && selectedTransfer) {
    const receiptCode = `GC-${selectedTransfer.reference_id || "MAN"}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const receiptDate = selectedTransfer.time
      ? new Date(selectedTransfer.time).toLocaleDateString("ar-EG", {
          year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
        })
      : new Date().toLocaleDateString("ar-EG", {
          year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
        });

    const receiptItems = [
      { label: "التاريخ", value: receiptDate, color: "text-foreground" },
      {
        label: "المبلغ",
        value: `$${transferAmount.toFixed(2)} (${(transferAmount * coinsRate).toLocaleString()} كوينز)`,
        color: "text-emerald-400",
      },
      {
        label: "النوع",
        value: salaryType === "agency" ? "وكالة" : "مضيف",
        color: salaryType === "agency" ? "text-violet-400" : "text-emerald-400",
      },
      { label: "رقم الحوالة", value: `#${selectedTransfer.reference_id}`, color: "text-foreground font-mono" },
    ];

    if (pathMode === "cash" && remaining >= 0) {
      receiptItems.push({
        label: "الراتب المتبقي",
        value: `$${(remaining - transferAmount > 0 ? remaining - transferAmount : 0).toFixed(2)}`,
        color: "text-foreground",
      });
    }

    if (pathMode === "cash" && effectiveBankLabel) {
      receiptItems.push({
        label: "البنك",
        value: `${effectiveBankLabel} — ${country?.name}`,
        color: "text-foreground",
      });
    }

    if (pathMode === "charge_other" && targetInfo) {
      receiptItems.push({
        label: "المستلم",
        value: `${targetInfo.name} (${targetInfo.uuid})`,
        color: "text-foreground",
      });
    }

    receiptItems.push({
      label: "الحالة",
      value: pathMode === "cash" ? "قيد المراجعة" : "تم بنجاح",
      color: pathMode === "cash" ? "text-amber-400" : "text-emerald-400",
    });

    return (
      <MobileLayout showHeader headerTitle="إيصال السحب" onBack={() => navigate("/dashboard", { replace: true })}>
        <div className="px-5 py-6 space-y-5">
          {/* Main receipt card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--card)/0.8) 100%)",
              border: "1px solid hsl(152 69% 40% / 0.2)",
              boxShadow: "0 8px 32px -8px hsl(152 69% 40% / 0.1)",
            }}
          >
            {/* Header with success icon */}
            <div className="pt-8 pb-5 text-center space-y-3"
              style={{ background: "linear-gradient(180deg, hsl(152 69% 40% / 0.08) 0%, transparent 100%)" }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                style={{ background: "hsl(152 69% 40% / 0.15)", border: "2px solid hsl(152 69% 40% / 0.3)" }}
              >
                <CheckCircle className="w-9 h-9 text-emerald-400" />
              </motion.div>
              <div>
                <h2 className="text-lg font-black text-foreground">تم السحب بنجاح!</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {salaryType === "agency" ? "سحب من راتب الوكالة" : "سحب من راتب المضيف"}
                </p>
              </div>
            </div>

            {/* Receipt details */}
            <div className="px-5 pb-5 space-y-0">
              {receiptItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom: i < receiptItems.length - 1 ? "1px solid hsl(var(--border)/0.08)" : "none",
                  }}
                >
                  <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                  <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Operation code card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl p-5 text-center space-y-3"
            style={{
              background: "hsl(var(--primary)/0.06)",
              border: "1px solid hsl(var(--primary)/0.15)",
            }}
          >
            <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">كود العملية</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-base font-black font-mono tracking-widest text-primary">{receiptCode}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(receiptCode); toast.success("تم نسخ الكود"); }}
                className="p-2 rounded-xl active:scale-90 transition-transform"
                style={{ background: "hsl(var(--primary)/0.12)" }}
              >
                <Copy className="w-4 h-4 text-primary" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">احفظ هذا الكود للمتابعة مع الإدارة</p>
          </motion.div>

          {/* Back button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full h-13 rounded-xl font-bold text-base"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(152 69% 40%))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              العودة للرئيسية
            </Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  // ── CHARGE OTHER SEARCH ──
  if (step === "charge_other_search") {
    return (
      <MobileLayout showHeader headerTitle="شحن لحساب آخر" onBack={getBackAction()}>
        <div className="px-5 py-6 space-y-5">
          <div className="glass-card p-5 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-base font-bold text-foreground">شحن كوينز لحساب آخر</h3>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 space-y-1">
              <p className="text-xs text-muted-foreground">المبلغ</p>
              <p className="text-xl font-black text-emerald-400" dir="ltr">${transferAmount.toFixed(2)}</p>
              <p className="text-sm font-bold text-amber-400">= {(transferAmount * coinsRate).toLocaleString()} كوينز</p>
            </div>
          </div>

          <div className="glass-card p-4 space-y-3">
            <label className="text-xs font-bold text-foreground">UUID المستلم</label>
            <div className="flex gap-2" dir="ltr">
              <Input
                value={targetUuid}
                onChange={e => {
                  setTargetUuid(e.target.value.replace(/\D/g, ""));
                  setTargetInfo(null);
                  setTargetConfirmed(false);
                }}
                placeholder="أدخل UUID..."
                className="bg-muted/20 border-border/30 flex-1 text-center font-mono"
                dir="ltr"
              />
              <Button onClick={searchTargetUser} disabled={targetSearching || !targetUuid.trim()} size="sm"
                className="h-10 px-4 bg-primary hover:bg-primary/90">
                {targetSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {targetInfo && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 space-y-3 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                {targetInfo.avatar ? (
                  <img src={targetInfo.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 text-right">
                  <p className="font-bold text-foreground">{targetInfo.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">UUID: {targetInfo.uuid}</p>
                </div>
              </div>

              {!targetConfirmed ? (
                <Button onClick={() => setTargetConfirmed(true)}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  <CheckCircle className="w-4 h-4 ml-2" /> هذا هو ✓
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 justify-center text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-bold">تم تأكيد المستلم</span>
                  </div>
                  <Button onClick={executeWithdrawal} disabled={processing}
                    className="w-full h-12 gold-gradient text-primary-foreground font-bold">
                    {processing ? <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري التنفيذ...</> : `شحن ${(transferAmount * coinsRate).toLocaleString()} كوينز`}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button variant="outline" onClick={() => setStep("select_transfer")} className="w-full h-11 border-border/30">
            <ArrowRight className="w-4 h-4 ml-1" /> رجوع
          </Button>

          <SubmissionOverlay
            visible={processing}
            title="جاري شحن الكوينز"
            activeStep={processStage === "check" ? 0 : 1}
            steps={[
              { label: "جاري فحص الراتب...", completedLabel: "تم الفحص ✓", icon: <></> },
              { label: "جاري تسجيل العملية...", completedLabel: "تم التسجيل ✓", icon: <></> },
            ]}
          />
        </div>
      </MobileLayout>
    );
  }

  // ── STEPPER FLOW (bank → account for cash) ──
  const stepperLabels = ["الحوالة", "البنك", "التأكيد"];
  const stepperIndex = { bank: 1, account: 2 }[step] ?? 0;

  return (
    <MobileLayout showHeader headerTitle={headerTitle} onBack={getBackAction()}>
      <div className="px-5 py-4 space-y-5">
        {/* Stepper */}
        <div className="flex items-center gap-1 px-2">
          {stepperLabels.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1 w-full rounded-full transition-colors ${i < stepperIndex ? "bg-primary" : i === stepperIndex ? "bg-primary/60" : "bg-muted/30"}`} />
              <span className={`text-[9px] ${i <= stepperIndex ? "text-primary font-bold" : "text-muted-foreground"}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Transfer summary */}
        <div className="bg-muted/20 rounded-xl p-3 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">الحوالة</span>
          <div className="text-left">
            <span className="text-sm font-black text-emerald-400" dir="ltr">${transferAmount.toFixed(2)}</span>
            <span className="text-[10px] text-muted-foreground font-mono mr-2">#{selectedTransfer?.reference_id}</span>
          </div>
        </div>

        {/* Salary type badge */}
        <div className="flex justify-center">
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold",
            salaryType === "agency"
              ? "bg-violet-500/15 text-violet-400"
              : "bg-emerald-500/15 text-emerald-400"
          )}>
            {salaryType === "agency" ? "وكالة" : "مضيف"}
          </span>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── BANK SELECTION ── */}
          {step === "bank" && (
            <motion.div key="bank" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> وين تبي نحوّل لك؟
                </h3>
                <div className="space-y-2">
                  {SALARY_COUNTRIES.map(c => {
                    const flag = COUNTRY_FLAGS[c.id] || "🏳";
                    const isOpen = selectedCountry === c.id;
                    return (
                      <div key={c.id}>
                        <button
                          onClick={() => { setSelectedCountry(isOpen ? "" : c.id); setSelectedBank(""); setCustomBankName(""); }}
                          className={cn(
                            "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all",
                            isOpen ? "bg-white/[0.06] border-primary/30" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:bg-white/20"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{flag}</span>
                            <span className="text-sm font-bold text-foreground">{c.name}</span>
                          </div>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                            <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden">
                              <div className="grid grid-cols-2 gap-2 pt-2.5 pr-3">
                                {c.banks.map(b => {
                                  const bankStyle = BANK_ICONS[b.id] || { icon: "", color: "from-white/5 to-white/[0.02] border-white/10" };
                                  const isSelected = selectedBank === b.id;
                                  return (
                                    <button key={b.id} onClick={() => { setSelectedBank(b.id); setCustomBankName(""); }}
                                      className={cn(
                                        "flex items-center gap-2.5 p-3 rounded-xl border transition-all text-right bg-gradient-to-br",
                                        isSelected ? "ring-2 ring-primary border-primary/50 scale-[0.98]" : `${bankStyle.color} hover:border-white/20`
                                      )}>
                                      <span className="text-lg shrink-0">{bankStyle.icon}</span>
                                      <span className={cn("text-xs font-medium flex-1", isSelected ? "text-primary font-bold" : "text-foreground")}>{b.label}</span>
                                      {isSelected && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                              {isOtherBank && (
                                <div className="mt-2.5 pr-3">
                                  <Input value={customBankName} onChange={e => setCustomBankName(e.target.value)}
                                    placeholder="اكتب اسم البنك" className="bg-white/[0.03] border-white/10" dir="rtl" />
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("select_transfer")} className="flex-1 h-12 border-border/30">
                  <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                </Button>
                <Button onClick={() => setStep("account")} disabled={!canProceedBank}
                  className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                  متابعة <ArrowLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── ACCOUNT DETAILS ── */}
          {step === "account" && (
            <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" /> معلومات الحساب
                </h3>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">اسم المستلم *</label>
                  <Input value={recipientName} onChange={e => setRecipientName(e.target.value)}
                    placeholder="الاسم الكامل كما في الحساب البنكي" className="bg-muted/20 border-border/30" dir="rtl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">رقم الحساب / المحفظة (اختياري)</label>
                  <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                    placeholder="أدخل رقم الحساب أو المحفظة" className="bg-muted/20 border-border/30" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> رقم الواتساب *
                    {verifiedPhone && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">✅ موثق</Badge>
                    )}
                  </label>
                  {verifiedPhone ? (
                    <Input value={verifiedPhone} readOnly
                      className="bg-muted/20 border-border/30 text-emerald-400 font-mono" dir="ltr" />
                  ) : (
                  <div className="flex gap-2" dir="ltr">
                    <select value={whatsappCode} onChange={e => setWhatsappCode(e.target.value)}
                      className="bg-muted/20 border border-border/30 rounded-lg px-2 py-2 text-sm w-24 shrink-0">
                      {countryCodes.map(cc => (
                        <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>
                      ))}
                    </select>
                    <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="رقم الواتساب" type="tel" className="bg-muted/20 border-border/30 flex-1" dir="ltr" />
                  </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">ملاحظات (اختياري)</label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية..." className="bg-muted/20 border-border/30 min-h-[60px]" dir="rtl" />
                </div>
              </div>

              {canProceedAccount && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
                  <h3 className="text-sm font-bold text-foreground text-center">ملخص الطلب</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">المبلغ</span>
                      <span className="font-bold text-primary">${transferAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">النوع</span>
                      <span className={`font-bold ${salaryType === "agency" ? "text-violet-400" : "text-emerald-400"}`}>
                        {salaryType === "agency" ? "وكالة" : "مضيف"}
                      </span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">البنك</span>
                      <span className="font-bold text-foreground">{effectiveBankLabel} — {country?.name}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">المستلم</span>
                      <span className="font-bold text-foreground">{recipientName}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">الحوالة</span>
                      <span className="font-bold text-foreground font-mono">#{selectedTransfer?.reference_id}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("bank")} className="flex-1 h-12 border-border/30">
                  <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                </Button>
                <Button onClick={executeWithdrawal} disabled={!canProceedAccount || processing}
                  className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد وسحب"}
                </Button>
              </div>

              <SubmissionOverlay
                visible={processing}
                title="جاري سحب الراتب"
                activeStep={processStage === "check" ? 0 : 1}
                steps={[
                  { label: "جاري فحص الراتب...", completedLabel: "تم الفحص ✓", icon: <></> },
                  { label: "جاري تسجيل الطلب...", completedLabel: "تم التسجيل ✓", icon: <></> },
                ]}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileLayout>
  );
};

export default SalaryWithdraw;
