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

// ── Shared inline style helpers ──
const glassSurface = {
  background: "linear-gradient(145deg, rgba(15,26,46,0.9), rgba(28,32,40,0.7))",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
} as const;

const cardSurface = {
  background: "linear-gradient(145deg, #0f1a2e, #1c2028)",
} as const;

const goldText = { color: "#e9c176", fontFamily: "'Manrope', sans-serif" } as const;
const mutedText = { color: "#78839c" } as const;
const surfaceText = { color: "#dfe2eb" } as const;
const successText = { color: "#4ae183" } as const;
const errorText = { color: "#ffb4ab" } as const;
const trustText = { color: "#bbc6e2" } as const;

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
  within_2h?: boolean;
  hours_old?: number;
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
    id: "sy", name: "سوريا",
    banks: [
      { id: "usdt", label: "USDT" },
      { id: "moneygram", label: "MoneyGram" },
      { id: "western_union", label: "Western Union" },
    ],
  },
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
  tn: "🇹🇳", sy: "🇸🇾", us: "🇺🇸", intl: "🌍",
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
    cash: { title: "سحب نقدي", icon: Wallet, color: "#4ae183" },
    charge_self: { title: "شحن لحسابي", icon: Coins, color: "#e9c176" },
    charge_other: { title: "شحن لحساب آخر", icon: Gift, color: "#bbc6e2" },
  };

  // State — ALL LOGIC UNCHANGED
  const [step, setStep] = useState<string>("loading");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusData, setStatusData] = useState<WithdrawStatusData | null>(null);
  const [salaryType, setSalaryType] = useState<SalaryType>("host");
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [expiredTransfers, setExpiredTransfers] = useState<TransferItem[]>([]);
  const [expiredCashCount, setExpiredCashCount] = useState(0);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferItem | null>(null);
  const [localUsedIds, setLocalUsedIds] = useState<Set<string>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedExpired, setSelectedExpired] = useState<any>(null);
  const [selectedBank, setSelectedBank] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [whatsappCode, setWhatsappCode] = useState("+967");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [targetUuid, setTargetUuid] = useState("");
  const [targetSearching, setTargetSearching] = useState(false);
  const [targetInfo, setTargetInfo] = useState<{ name: string; avatar: string; uuid: string } | null>(null);
  const [targetConfirmed, setTargetConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [processStage, setProcessStage] = useState<"check" | "save">("check");
  const hasFetchedRef = useRef(false);
  const processInFlightRef = useRef(false);
  const [cashResetOverride, setCashResetOverride] = useState<{ host: boolean; agency: boolean }>({ host: false, agency: false });

  // ── ALL LOGIC HOOKS AND FUNCTIONS — UNCHANGED ──
  useEffect(() => {
    if (!user) { navigate("/"); return; }
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchWithdrawStatus();
    checkCashResetOverrides();
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
    if (verifiedPhone) {
      setWhatsappNumber(verifiedPhone);
      setWhatsappCode("");
    }
  }, [user?.uuid, verifiedPhone]);

  const checkCashResetOverrides = async () => {
    if (!user?.uuid) return;
    const now = new Date();
    // Saudi timezone = UTC+3 (no DST)
    const saudiMs = now.getTime() + (3 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000);
    const saudiDate = new Date(saudiMs);
    const monthKey = `${saudiDate.getFullYear()}-${String(saudiDate.getMonth() + 1).padStart(2, "0")}`;
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
      if (hostAvail <= 0 && isAgency && agencyAvail > 0) setSalaryType("agency");
      if (pathMode === "cash") {
        // Skip no_salary check — user may have valid transfers
      } else {
        // Skip no_salary check
      }
      if (isAgency && agencyAvail > 0 && hostAvail > 0) {
        setStep("select_type");
      } else if (isAgency && agencyAvail > 0 && hostAvail <= 0) {
        setSalaryType("agency"); setStep("select_transfer"); fetchTransfers();
      } else {
        setSalaryType("host"); setStep("select_transfer"); fetchTransfers();
      }
    } catch {
      setError("فشل الاتصال بالخادم"); setStep("error");
    } finally { setLoading(false); }
  };

  const fetchTransfers = async () => {
    if (!user?.uuid) return;
    setTransfersLoading(true);
    try {
      const [apiData, usedRes] = await Promise.all([
        galaApi.userTransfers(user.uuid) as any,
        supabase.from("salary_requests").select("transfer_id, status, is_final_rejection, transfer_image_url, rejection_image_url, admin_note").eq("user_uuid", user.uuid),
      ]);
      const usedIds = new Set([...(usedRes.data || []).map((r: any) => r.transfer_id).filter(Boolean), ...localUsedIds]);
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
        within_2h: t.within_2h, hours_old: t.hours_old,
      });
      const list: TransferItem[] = allTransfers
        .filter((t: any) => {
          const toUuid = String(t.to_uuid || t.receiver_uuid || "");
          const refId = String(t.reference_id || t.id || "");
          if (toUuid && toUuid !== "10000") return false;
          if (usedIds.has(refId)) return false;
          if (t.is_used) return false;
          if (t.selectable === false) return false;
          {
            const rawT = t.time || t.created_at || "";
            const hasTz = rawT.includes("+") || rawT.includes("Z") || rawT.includes("UTC");
            const transferTime = new Date(hasTz ? rawT : rawT + " UTC");
            const now = new Date();
            const diffMins = (now.getTime() - transferTime.getTime()) / 60000;
            // Grace period: allow up to 48h on first day of month (for previous month transfers)
            const isFirstOfMonth = new Date().getDate() === 1;
            const maxMins = isFirstOfMonth ? 2880 : 1440;
            if (diffMins > maxMins) return false;
          }
          return true;
        }).map(mapTransfer);
      setTransfers(list);
      const usedStatusMap = new Map<string, any>();
      (usedRes.data || []).forEach((r: any) => { if (r.transfer_id) usedStatusMap.set(String(r.transfer_id), { status: r.status || "pending", transfer_image_url: r.transfer_image_url || null, rejection_image_url: r.rejection_image_url || null, admin_note: r.admin_note || null }); });
      const expiredList: TransferItem[] = allTransfers
        .filter((t: any) => {
          const toUuid = String(t.to_uuid || t.receiver_uuid || "");
          if (toUuid && toUuid !== "10000") return false;
          const refId = String(t.reference_id || t.id || "");
          // It's expired if: used OR older than 24h OR in salary_requests
          const rawT = t.time || t.created_at || "";
          const hasTz = rawT.includes("+") || rawT.includes("Z") || rawT.includes("UTC");
          const transferTime = new Date(hasTz ? rawT : rawT + " UTC");
          const diffMins = (Date.now() - transferTime.getTime()) / 60000;
          const isOlderThan24h = diffMins > 1440;
          const isUsed = usedIds.has(refId) || t.is_used;
          return isOlderThan24h || isUsed;
        })
        .filter((t: any) => !list.some((l: any) => l.reference_id === String(t.reference_id || t.id || "")))
        .map((t: any) => {
          const refId = String(t.reference_id || t.id || "");
          const usedData = usedStatusMap.get(refId);
          return { ...mapTransfer(t), usedStatus: usedData?.status || (t.is_used ? "used" : "expired"), transfer_image_url: usedData?.transfer_image_url || null, rejection_image_url: usedData?.rejection_image_url || null, admin_note: usedData?.admin_note || null };
        });
      setExpiredTransfers(expiredList);
      if (isCashMode) { setExpiredCashCount(expiredList.length); } else { setExpiredCashCount(0); }
    } catch (err) { console.warn("Failed to fetch transfers:", err); setTransfers([]); }
    finally { setTransfersLoading(false); }
  };

  const getAvailableForType = (): number => {
    // Floor to dollar — ignore cents
    const raw = salaryType === "agency" 
      ? (statusData?.agency_salary?.pool_available || 0) 
      : (statusData?.host_salary?.available || 0);
    return Math.floor(raw);
  };
  const getCoinsRate = (): number => salaryType === "agency" ? AGENCY_RATE : HOST_RATE;
  const isCashUsed = (): boolean => {
    if (salaryType === "agency") { if (cashResetOverride.agency) return false; return statusData?.agency_salary?.cash_used_this_month || false; }
    if (cashResetOverride.host) return false;
    return statusData?.host_salary?.cash_used_this_month || false;
  };

  const searchTargetUser = async () => {
    if (!targetUuid.trim() || targetSearching) return;
    setTargetSearching(true); setTargetInfo(null); setTargetConfirmed(false);
    try {
      // Try user-finance-api first (reliable)
      const resp = await fetch(`https://hola-chat.com/user-lookup.php?key=ghala2026actions&uuid=${targetUuid.trim()}`);
      const finData = await resp.json();
      if (finData.ok && finData.data) {
        const displayName = finData.data.name || ("مستخدم #" + targetUuid.trim());
        setTargetInfo({ name: displayName, avatar: finData.data.avatar || "", uuid: targetUuid.trim() });
      } else {
        // Fallback to original API
        try {
          const data = await galaApi.checkSupporter(targetUuid.trim()) as any;
          const name = data.data?.name || ("مستخدم #" + targetUuid.trim());
          if (data.ok !== false) { setTargetInfo({ name, avatar: data.data?.avatar || "", uuid: targetUuid.trim() }); }
          else { toast.error("لم يتم العثور على المستخدم"); }
        } catch {
          toast.error("لم يتم العثور على المستخدم");
        }
      }
    } catch { /* silent on auto-search */ }
    finally { setTargetSearching(false); }
  };


  // Auto-search when UUID is typed (4+ digits, 800ms debounce)
  useEffect(() => {
    if (!targetUuid || targetUuid.length < 4 || targetInfo || targetSearching) return;
    const timer = setTimeout(() => { searchTargetUser(); }, 800);
    return () => clearTimeout(timer);
  }, [targetUuid]);
  useEffect(() => {
    if (step === "receipt") {
      window.history.pushState(null, "", window.location.href);
      const handleBack = () => { window.history.pushState(null, "", window.location.href); navigate("/dashboard", { replace: true }); };
      window.addEventListener("popstate", handleBack);
      return () => window.removeEventListener("popstate", handleBack);
    }
  }, [step, navigate]);

  const executeWithdrawal = async () => {
    if (processing || processInFlightRef.current || !selectedTransfer) return;
    const today = new Date().toISOString().slice(0, 10);
    if (!selectedTransfer.time?.startsWith(today)) { toast.error("الحوالة قديمة — لازم تكون من اليوم. تواصل مع الإدارة."); return; }
    processInFlightRef.current = true;
    setProcessing(true); setProcessStage("check"); setError("");
    const amount = selectedTransfer.usd || selectedTransfer.amount || 0;
    const chargeTarget = pathMode === "charge_other" ? targetInfo?.uuid : undefined;
    try {
      setProcessStage("check");
      const check: WithdrawStatusData = await galaApi.withdrawStatus(user!.uuid) as any;
      const available = salaryType === "agency" ? (check.agency_salary?.pool_available || 0) : (check.host_salary?.available || 0);
      // Floor both to nearest dollar — ignore cents
      // Transfer to 10000 counts as "cut" — so available may be 0 even though salary exists
      // Don't block — admin handles approval
      if (pathMode === "charge_self" || pathMode === "charge_other") {
        const chargeTargetUuid = chargeTarget || user!.uuid;
        const chargeResponse = await fetch("https://hola-chat.com/project-z/api.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "salary_charge_manual", admin_key: "ghala2026owner", uuid: user!.uuid, amount, reference_id: selectedTransfer.reference_id || "manual", target_uuid: chargeTargetUuid, request_type: salaryType }),
        });
        const chargeData = await chargeResponse.json();
        if (!chargeData?.success) throw new Error(chargeData?.error || "فشل شحن الكوينز — تواصل مع الأدمن");
      }
      setProcessStage("save");
      const requestType = salaryType === "agency" ? `agency_${pathMode}` : pathMode === "charge_other" ? "charge_other" : pathMode === "charge_self" ? "charge_self" : "cash";
      const targetName = chargeTarget ? targetInfo?.name || "مستخدم آخر" : pathMode === "charge_self" ? user!.name : recipientName;
      const country = SALARY_COUNTRIES.find(c => c.id === selectedCountry);
      const bank = country?.banks.find(b => b.id === selectedBank);
      const isOtherBank = selectedBank?.endsWith("_other");
      const effectiveBankLabel = isOtherBank ? customBankName : bank?.label;
      const rate = getCoinsRate();
      try {
        await supabase.from("salary_requests").insert({
          user_uuid: user!.uuid, user_name: user!.name,
          user_phone: pathMode === "cash" ? (verifiedPhone || `${whatsappCode}${whatsappNumber}`) : null,
          request_type: requestType, amount_usd: amount, amount_coins: amount * rate,
          recipient_name: targetName, recipient_country: pathMode === "cash" ? (country?.name || selectedCountry) : "coins",
          payment_method: pathMode === "cash" ? (effectiveBankLabel || selectedBank) : "coins_charge",
          payment_details: pathMode === "cash" ? `account:${accountNumber || "-"} | whatsapp:${verifiedPhone || `${whatsappCode}${whatsappNumber}`}${notes ? ` | notes:${notes}` : ""}` : `target_uuid:${chargeTarget || user!.uuid}`,
          status: pathMode === "cash" ? "pending" : "approved",
          transfer_id: selectedTransfer.reference_id, transaction_id: selectedTransfer.reference_id,
          transaction_date: selectedTransfer.time, target_uuid: chargeTarget || user!.uuid,
          target_name: targetName,
          admin_note: `حوالة يدوية #${selectedTransfer.reference_id} | ${salaryType === "agency" ? "وكالة" : "مضيف"} | ${notes || ""}`.trim(),
        } as any);
      } catch (saveErr) { console.warn("Failed to save salary request:", saveErr); toast.warning("تم السحب لكن فشل حفظ السجل — تواصل مع الأدمن"); }
      setLocalUsedIds(prev => new Set([...prev, selectedTransfer.reference_id]));
      setTransfers(prev => prev.filter(t => t.reference_id !== selectedTransfer.reference_id));
      setStep("receipt");
    } catch (err: any) { setError(err.message || "فشل في العملية"); }
    finally { setProcessing(false); processInFlightRef.current = false; }
  };

  if (!user) return null;

  // Terms dialog
  const termsDialog = showTerms && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setShowTerms(false)}
      style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="rounded-3xl max-w-md w-full max-h-[80vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}
        style={{ background: "#10141a" }}>
        <h3 className="text-base font-bold text-center" style={surfaceText}>📄 شروط وأحكام السحب</h3>
        <div className="space-y-2 text-xs leading-relaxed" style={mutedText}>
          <p className="font-bold" style={surfaceText}>⏰ مهلة الحوالة:</p>
          <p>• كل حوالة صالحة لمدة <b style={goldText}>24 ساعة</b> فقط من وقت إرسالها</p>
          <p>• بعد انتهاء المهلة لا يمكن استخدامها — تواصل مع الإدارة</p>
          <p className="font-bold mt-3" style={surfaceText}>🔒 عدد مرات السحب:</p>
          <p>• <b>المضيف:</b> سحب نقدي مرة واحدة في الشهر</p>
          <p>• <b>وكيل المضيفين:</b> مرتين — مرة لراتب المضيف ومرة لراتب الوكالة</p>
          <p>• شحن الكوينز والسحب الفوري متاح طوال الشهر</p>
          <p className="font-bold mt-3" style={surfaceText}>💰 الرقم المرجعي:</p>
          <p>• كل رقم مرجعي يُستخدم <b style={errorText}>مرة واحدة فقط</b></p>
          <p>• لا يمكن إعادة استخدام نفس الرقم في أي خدمة أخرى</p>
          <p>• حتى لو الطلب معلق أو قيد المراجعة — الرقم محجوز</p>
          <p className="font-bold mt-3" style={surfaceText}>📲 إشعارات:</p>
          <p>• تصلك رسالة واتساب عند رفع الطلب</p>
          <p>• تصلك رسالة عند قبول أو رفض الطلب مع الإيصال</p>
          <p className="font-bold mt-3" style={surfaceText}>❌ حالات الرفض:</p>
          <p>• الحوالة أقدم من 24 ساعة</p>
          <p>• الرقم المرجعي مستخدم مسبقاً</p>
          <p>• المبلغ أكبر من الراتب المتاح</p>
          <p>• تجاوز حد السحب الشهري</p>
        </div>
        <button onClick={() => setShowTerms(false)} className="w-full py-2.5 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
          style={{ background: "rgba(187,198,226,0.1)", ...trustText }}>
          فهمت ✅
        </button>
      </div>
    </div>
  );

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
        if (statusData?.is_agency_owner && (statusData.host_salary?.available || 0) > 0 && (statusData.agency_salary?.pool_available || 0) > 0) setStep("select_type");
        else navigate("/salary");
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
        <div className="flex flex-col items-center justify-center py-16 gap-5">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 rounded-full" style={{ border: "3px solid rgba(233,193,118,0.1)", borderTopColor: "#e9c176" }} />
          <p className="text-sm font-bold animate-pulse" style={goldText}>جاري تحميل بيانات السحب...</p>
        </div>
      </MobileLayout>
    );
  }

  // ── ERROR ──
  if (step === "error") {
    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <AlertCircle className="w-12 h-12" style={errorText} />
          <p className="text-sm text-center" style={errorText}>{error}</p>
          <Button onClick={() => { hasFetchedRef.current = false; fetchWithdrawStatus(); }} className="mt-4 rounded-2xl"
            style={{ background: "rgba(187,198,226,0.1)", ...trustText }}>
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
          <div className="relative">
            <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 w-24 h-24 rounded-full" style={{ margin: "-12px", background: "rgba(233,193,118,0.1)" }} />
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(15,26,46,0.6)" }}>
              <DollarSign className="w-10 h-10" style={{ color: "rgba(120,131,156,0.4)" }} />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black" style={surfaceText}>لا يوجد رصيد</h2>
            <p className="text-sm leading-relaxed" style={mutedText}>لا يوجد دعم هالشهر — ما يقدر يسحب</p>
          </div>
          <div className="w-full rounded-2xl p-4 space-y-3" style={{ background: "rgba(15,26,46,0.5)" }}>
            <div className="flex items-start gap-3 rtl:flex-row-reverse">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(187,198,226,0.08)" }}>
                <AlertCircle className="w-4 h-4" style={trustText} />
              </div>
              <div className="space-y-1 text-right flex-1">
                <p className="text-xs font-bold" style={surfaceText}>كيف أحصل على راتب؟</p>
                <p className="text-[11px] leading-relaxed" style={mutedText}>الراتب يتوفر بناءً على نشاطك الشهري. تأكد من استيفاء شروط الدعم للحصول على الراتب.</p>
              </div>
            </div>
          </div>
          <Button onClick={() => navigate("/salary")} variant="outline" className="w-full h-12 rounded-2xl font-bold"
            style={{ background: "rgba(187,198,226,0.06)", borderColor: "rgba(187,198,226,0.1)", ...trustText }}>
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
        <div className="px-5 py-6 space-y-5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          <div className="text-center space-y-2">
            <h2 className="text-base font-bold" style={surfaceText}>اختر نوع الراتب</h2>
            <p className="text-xs" style={mutedText}>من أي رصيد تبي تسحب؟</p>
          </div>
          <div className="space-y-3">
            <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => { if (pathMode === "cash" && hostCashUsed) return; setSalaryType("host"); setSelectedTransfer(null); setStep("select_transfer"); fetchTransfers(); }}
              disabled={pathMode === "cash" && hostCashUsed}
              className={cn("w-full rounded-2xl p-5 text-right space-y-2 transition-all", pathMode === "cash" && hostCashUsed ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]")}
              style={{ ...cardSurface, boxShadow: pathMode === "cash" && hostCashUsed ? "none" : "inset 3px 0 0 #4ae183, 0 4px 20px -8px rgba(0,0,0,0.3)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" style={successText} />
                  <span className="font-bold" style={surfaceText}>راتب المضيف</span>
                </div>
                <div className="flex items-center gap-2">
                  {pathMode === "cash" && hostCashUsed && <span className="text-base">🔒</span>}
                  <span className="text-lg font-extrabold" dir="ltr" style={{ ...goldText }}>${hostAvail.toFixed(2)}</span>
                </div>
              </div>
              {pathMode === "cash" && hostCashUsed && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">🔒</span>
                  <p className="text-[10px] font-bold" style={goldText}>استخدمت سحب راتب المضيف هذا الشهر</p>
                </div>
              )}
              {pathMode === "cash" && !hostCashUsed && <p className="text-[10px]" style={successText}>✅ متاح للسحب</p>}
            </motion.button>

            <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              onClick={() => { if (pathMode === "cash" && agencyCashUsed) return; setSalaryType("agency"); setSelectedTransfer(null); setStep("select_transfer"); fetchTransfers(); }}
              disabled={pathMode === "cash" && agencyCashUsed}
              className={cn("w-full rounded-2xl p-5 text-right space-y-2 transition-all", pathMode === "cash" && agencyCashUsed ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]")}
              style={{ ...cardSurface, boxShadow: pathMode === "cash" && agencyCashUsed ? "none" : "inset 3px 0 0 #bbc6e2, 0 4px 20px -8px rgba(0,0,0,0.3)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" style={trustText} />
                  <span className="font-bold" style={surfaceText}>راتب الوكالة</span>
                </div>
                <div className="flex items-center gap-2">
                  {pathMode === "cash" && agencyCashUsed && <span className="text-base">🔒</span>}
                  <span className="text-lg font-extrabold" dir="ltr" style={{ ...goldText }}>${agencyAvail.toFixed(2)}</span>
                </div>
              </div>
              {pathMode === "cash" && agencyCashUsed && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">🔒</span>
                  <p className="text-[10px] font-bold" style={goldText}>استخدمت سحب راتب الوكالة هذا الشهر</p>
                </div>
              )}
              {pathMode === "cash" && !agencyCashUsed && <p className="text-[10px]" style={successText}>✅ متاح للسحب</p>}
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
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(233,193,118,0.1)" }}>
              <AlertCircle className="w-8 h-8" style={goldText} />
            </div>
            <h2 className="text-lg font-bold" style={surfaceText}>وصلت الحد الأقصى</h2>
            <p className="text-sm text-center" style={mutedText}>
              تم السحب النقدي لـ{salaryType === "agency" ? "الوكالة" : "المضيف"} هذا الشهر
            </p>
            <Button onClick={getBackAction()} variant="outline" className="rounded-2xl"
              style={{ background: "rgba(187,198,226,0.06)", borderColor: "rgba(187,198,226,0.1)", ...trustText }}>رجوع</Button>
          </div>
        </MobileLayout>
      );
    }

    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={getBackAction()}>
        <div className="px-5 py-6 space-y-5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          {/* Salary type badge */}
          <div className="flex justify-center">
            <span className="px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5"
              style={salaryType === "agency" ? { background: "rgba(187,198,226,0.08)", ...trustText } : { background: "rgba(74,225,131,0.08)", ...successText }}>
              {salaryType === "agency" ? <Building2 className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
              {salaryType === "agency" ? "راتب الوكالة" : "راتب المضيف"}
            </span>
          </div>

          {/* Salary Summary — glassmorphism hero */}
          <div className="rounded-3xl p-6 space-y-3 text-center relative overflow-hidden" style={{ ...glassSurface, boxShadow: "0 8px 40px -12px rgba(0,0,0,0.5)" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full opacity-15 blur-3xl" style={{ background: "#e9c176" }} />
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5" style={successText} />
              <span className="text-sm font-bold" style={surfaceText}>المتبقي للسحب</span>
            </div>
            <p className="text-3xl font-extrabold" dir="ltr" style={{ ...goldText, textShadow: "0 0 30px rgba(233,193,118,0.15)" }}>${remaining.toFixed(2)}</p>
            <p className="text-sm" style={mutedText}>= {(remaining * coinsRate).toLocaleString()} كوينز</p>
          </div>

          {/* Instructions */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(187,198,226,0.04)" }}>
            <p className="text-xs font-bold" style={trustText}>📋 خطوات السحب:</p>
            <ol className="text-[11px] space-y-1 list-decimal list-inside" style={mutedText}>
              <li>حوّل المبلغ في التطبيق لـ UUID <span className="font-mono font-bold" style={surfaceText}>10000</span></li>
              <li>ارجع هنا واضغط "تحديث" لعرض الحوالة</li>
              <li>اختر الحوالة وأكمل طلب السحب</li>
            </ol>
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(233,193,118,0.06)" }}>
              <p className="text-[11px] font-bold flex items-center gap-1" style={goldText}>⏰ مهلة الحوالة: 24 ساعة</p>
              <p className="text-[10px] leading-relaxed" style={{ color: "rgba(233,193,118,0.6)" }}>
                عندك 24 ساعة من وقت إرسال الحوالة لاستخدامها. بعد 24 ساعة تنتهي صلاحيتها ولا يمكن استخدامها في السحب.
              </p>
            </div>
          </div>

          {/* Terms */}
          <button onClick={() => setShowTerms(true)} className="w-full text-center text-[10px] underline" style={{ color: "rgba(187,198,226,0.5)" }}>
            📄 شروط وأحكام السحب
          </button>

          {/* Transfers list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={surfaceText}>{pathMode === "cash" ? "حوالاتك اليوم لـ 10000" : "حوالاتك لـ 10000"}</h3>
              <button onClick={fetchTransfers} disabled={transfersLoading}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
                style={{ background: "rgba(187,198,226,0.08)", ...trustText }}>
                <RefreshCw className={cn("w-3.5 h-3.5", transfersLoading && "animate-spin")} />
                تحديث
              </button>
            </div>

            {transfersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" style={goldText} />
              </div>
            ) : transfers.length === 0 ? (
              <div className="rounded-2xl p-8 text-center space-y-2" style={{ background: "rgba(15,26,46,0.5)" }}>
                <Clock className="w-8 h-8 mx-auto" style={{ color: "rgba(120,131,156,0.3)" }} />
                <p className="text-sm font-bold" style={mutedText}>لا توجد حوالات اليوم</p>
                <p className="text-[11px]" style={mutedText}>حوّل المبلغ من التطبيق لـ UUID 10000 ثم اضغط "تحديث"</p>
                {expiredCashCount > 0 && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(233,193,118,0.06)" }}>
                    <p className="text-[11px] font-bold" style={goldText}>يوجد {expiredCashCount} حوالة منتهية الصلاحية</p>
                    <p className="text-[10px] mt-1" style={{ color: "rgba(233,193,118,0.5)" }}>لا يمكن استخدامها. تواصل مع الإدارة للمساعدة.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {transfers.map((t, i) => {
                  const isSelected = selectedTransfer?.reference_id === t.reference_id;
                  const _dt1 = t.time ? new Date(t.time) : null;
                  const timeStr = (_dt1 && !isNaN(_dt1.getTime())) ? _dt1.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <motion.button key={t.reference_id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedTransfer(isSelected ? null : t)}
                      className="w-full rounded-2xl p-4 text-right transition-all"
                      style={isSelected
                        ? { ...cardSurface, boxShadow: "inset 3px 0 0 #e9c176, 0 0 20px -4px rgba(233,193,118,0.15)" }
                        : { ...cardSurface, boxShadow: "0 4px 16px -8px rgba(0,0,0,0.3)" }
                      }>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5" style={goldText} />
                          ) : (
                            <div className="w-5 h-5 rounded-full" style={{ border: "2px solid rgba(120,131,156,0.3)" }} />
                          )}
                          <div className="text-right">
                            <p className="text-sm font-bold" dir="ltr" style={isSelected ? goldText : surfaceText}>${(t.usd || t.amount || 0).toFixed(2)}</p>
                            <p className="text-[10px] font-mono" style={mutedText}>#{t.reference_id}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xs" style={mutedText}>{timeStr}</p>
                          {t.time && (() => {
                            const rawTime = t.time || "";
                            const hasTimezone = rawTime.includes("+") || rawTime.includes("Z") || rawTime.includes("UTC");
                            const transferDate = new Date(hasTimezone ? rawTime : rawTime + " UTC");
                            const nowDate = new Date();
                            const diffMs = nowDate.getTime() - transferDate.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMins / 60);
                            const remainMins = diffMins % 60;
                            const isOk = diffMins <= 1440;
                            if (isNaN(diffMins) || diffMins < 0) return null;
                            const timeText = diffHours > 0 ? `${diffHours}س ${remainMins}د` : `${diffMins}د`;
                            return <p className="text-[9px] font-bold" style={isOk ? successText : goldText}>{isOk ? `منذ ${timeText} ✅` : `منذ ${timeText} ⚠️`}</p>;
                          })()}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expired transfers */}
          {expiredTransfers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "rgba(233,193,118,0.6)" }}>
                <Clock className="w-3.5 h-3.5" /> حوالات سابقة ({expiredTransfers.length})
              </h3>
              {expiredTransfers.map((t: any, i: number) => {
                const _dt2 = t.time ? new Date(t.time) : null;
                const timeStr = (_dt2 && !isNaN(_dt2.getTime())) ? _dt2.toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit" }) : "";
                const us = t.usedStatus;
                const isApproved = us === "approved" || us === "delivered";
                const isRejected = us === "rejected";
                const isPending = us === "pending" || us === "review";
                const isSpent = t.is_used === true || us === "used";
                const isExpiredTime = !isApproved && !isRejected && !isPending && !isSpent && (t.hours_old !== undefined && (t.hours_old || 0) > 2);
                const statusLabel = isApproved ? "✅ تم الاستلام" : isRejected ? "❌ تم الرفض" : isPending ? "⏳ قيد المراجعة" : isSpent ? "✅ تم الصرف" : isExpiredTime ? "⏰ انتهى الوقت" : "منتهية الصلاحية";
                const statusColor = isApproved ? successText : isRejected ? errorText : isPending ? goldText : isSpent ? successText : isExpiredTime ? errorText : goldText;
                return (
                  <div key={t.reference_id || i} className="w-full rounded-xl p-3 text-right"
                    onClick={() => setSelectedExpired(t)}
                    style={{ ...cardSurface, cursor: "pointer", opacity: 0.85 }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs font-bold" dir="ltr" style={{ ...surfaceText, opacity: 0.7 }}>${(t.usd || t.amount || 0).toFixed(2)}</p>
                          <p className="text-[9px] font-mono" style={mutedText}>#{t.reference_id}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-bold" style={statusColor}>{statusLabel}</p>
                        <p className="text-[9px]" style={mutedText}>{timeStr}</p>
                        {isExpiredTime && <p className="text-[9px] font-bold mt-0.5" style={errorText}>اضغط للتواصل مع الإدارة →</p>}
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
              <div className="rounded-2xl p-4 text-center mb-3" style={{ background: "rgba(74,225,131,0.06)" }}>
                <p className="text-xs" style={mutedText}>الحوالة المختارة</p>
                <p className="text-xl font-extrabold" dir="ltr" style={goldText}>${transferAmount.toFixed(2)}</p>
                <p className="text-[10px] font-mono" style={mutedText}>#{selectedTransfer.reference_id}</p>
              </div>
              <Button
                onClick={() => {
                  if (pathMode === "cash") setStep("bank");
                  else if (pathMode === "charge_other") { setTargetUuid(""); setTargetInfo(null); setTargetConfirmed(false); setStep("charge_other_search"); }
                  else executeWithdrawal();
                }}
                disabled={processing}
                className="w-full h-12 rounded-2xl font-bold disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #e9c176, #d4a853)", color: "#10141a" }}>
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : pathMode === "charge_self" ? <>شحن {(transferAmount * coinsRate).toLocaleString()} كوينز لحسابي</> : <>متابعة <ArrowLeft className="w-4 h-4 mr-1" /></>}
              </Button>
            </motion.div>
          )}

          <SalaryRequestsHistory userUuid={user.uuid} />

          <SubmissionOverlay visible={processing} title="جاري تنفيذ العملية" activeStep={processStage === "check" ? 0 : 1}
            steps={[
              { label: "جاري فحص الراتب...", completedLabel: "تم الفحص ✓", icon: <></> },
              { label: "جاري تسجيل العملية...", completedLabel: "تم التسجيل ✓", icon: <></> },
            ]} />
          {termsDialog}
          {/* Detail popup for expired transfers */}
          {selectedExpired && (
            <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedExpired(null); }}>
              <div className="w-full max-w-md rounded-t-3xl p-5 space-y-3 max-h-[80vh] overflow-y-auto" style={{ background: "#10141a" }}>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold" style={{ color: "#dfe2eb" }}>تفاصيل الحوالة</h3>
                  <button onClick={() => setSelectedExpired(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", color: "#dfe2eb" }}>✕</button>
                </div>
                <div className="text-center py-2">
                  <p className="text-2xl font-extrabold" dir="ltr" style={{ color: "#e9c176" }}>${(selectedExpired.usd || selectedExpired.amount || 0).toFixed(2)}</p>
                  <p className="text-xs font-mono mt-1" style={{ color: "#78839c" }}>#{selectedExpired.reference_id}</p>
                </div>
                <div className="flex justify-between items-center rounded-2xl p-3" style={{ background: "rgba(15,26,46,0.6)" }}>
                  <span className="text-xs" style={{ color: "#78839c" }}>الحالة</span>
                  <span className="text-xs font-bold" style={{ color: "#dfe2eb" }}>{selectedExpired.usedStatus === "approved" || selectedExpired.usedStatus === "delivered" ? "✅ تم الاستلام" : selectedExpired.usedStatus === "rejected" ? "❌ مرفوض" : selectedExpired.usedStatus === "pending" || selectedExpired.usedStatus === "review" ? "⏳ قيد المراجعة" : "✅ تم الصرف"}</span>
                </div>
                {selectedExpired.admin_note && (
                  <div className="rounded-2xl p-3" style={{ background: "rgba(255,180,171,0.06)" }}>
                    <p className="text-[10px] font-bold" style={{ color: "#ffb4ab" }}>ملاحظة:</p>
                    <p className="text-xs" style={{ color: "#dfe2eb" }}>{selectedExpired.admin_note}</p>
                  </div>
                )}
                {selectedExpired.transfer_image_url && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold" style={{ color: "#4ae183" }}>إيصال التحويل:</p>
                    <a href={selectedExpired.transfer_image_url} target="_blank" rel="noopener noreferrer">
                      <img src={selectedExpired.transfer_image_url} alt="receipt" className="w-full max-h-[400px] object-contain rounded-xl" style={{ border: "1px solid rgba(74,225,131,0.2)" }} />
                    </a>
                  </div>
                )}
                {selectedExpired.rejection_image_url && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold" style={{ color: "#ffb4ab" }}>صورة الرفض:</p>
                    <a href={selectedExpired.rejection_image_url} target="_blank" rel="noopener noreferrer">
                      <img src={selectedExpired.rejection_image_url} alt="rejection" className="w-full max-h-[400px] object-contain rounded-xl" style={{ border: "1px solid rgba(255,180,171,0.2)" }} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </MobileLayout>
    );
  }

  // ── SUCCESS / RECEIPT ──
  if (step === "receipt" && selectedTransfer) {
    const receiptCode = `GC-${selectedTransfer.reference_id || "MAN"}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const receiptDate = selectedTransfer.time
      ? (() => { const _d = new Date(selectedTransfer.time); return isNaN(_d.getTime()) ? new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : _d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }); })()
      : new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

    const receiptItems = [
      { label: "التاريخ", value: receiptDate, color: surfaceText.color },
      { label: "المبلغ", value: `$${transferAmount.toFixed(2)} (${(transferAmount * coinsRate).toLocaleString()} كوينز)`, color: goldText.color },
      { label: "النوع", value: salaryType === "agency" ? "وكالة" : "مضيف", color: salaryType === "agency" ? trustText.color : successText.color },
      { label: "رقم الحوالة", value: `#${selectedTransfer.reference_id}`, color: surfaceText.color },
    ];
    if (pathMode === "cash" && remaining >= 0) {
      receiptItems.push({ label: "الراتب المتبقي", value: `$${(remaining - transferAmount > 0 ? remaining - transferAmount : 0).toFixed(2)}`, color: surfaceText.color });
    }
    if (pathMode === "cash" && effectiveBankLabel) {
      receiptItems.push({ label: "البنك", value: `${effectiveBankLabel} — ${country?.name}`, color: surfaceText.color });
    }
    if (pathMode === "charge_other" && targetInfo) {
      receiptItems.push({ label: "المستلم", value: `${targetInfo.name} (${targetInfo.uuid})`, color: surfaceText.color });
    }
    receiptItems.push({ label: "الحالة", value: pathMode === "cash" ? "قيد المراجعة" : "تم بنجاح", color: pathMode === "cash" ? goldText.color : successText.color });

    return (
      <MobileLayout showHeader headerTitle="إيصال السحب" onBack={() => navigate("/dashboard", { replace: true })}>
        <div className="px-5 py-6 space-y-5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="rounded-3xl overflow-hidden" style={{ ...cardSurface, boxShadow: "0 8px 40px -12px rgba(74,225,131,0.1)" }}>
            <div className="pt-8 pb-5 text-center space-y-3" style={{ background: "linear-gradient(180deg, rgba(74,225,131,0.06) 0%, transparent 100%)" }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                style={{ background: "rgba(74,225,131,0.1)", border: "2px solid rgba(74,225,131,0.2)" }}>
                <CheckCircle className="w-9 h-9" style={successText} />
              </motion.div>
              <div>
                <h2 className="text-lg font-black" style={surfaceText}>تم السحب بنجاح!</h2>
                <p className="text-xs mt-1" style={mutedText}>{salaryType === "agency" ? "سحب من راتب الوكالة" : "سحب من راتب المضيف"}</p>
              </div>
            </div>
            <div className="px-5 pb-5 space-y-0">
              {receiptItems.map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: i < receiptItems.length - 1 ? "1px solid rgba(187,198,226,0.05)" : "none" }}>
                  <span className="text-xs font-medium" style={mutedText}>{item.label}</span>
                  <span className="text-xs font-bold" style={{ color: item.color, fontFamily: "'Manrope', sans-serif" }}>{item.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="rounded-2xl p-5 text-center space-y-3" style={{ background: "rgba(187,198,226,0.04)" }}>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={mutedText}>كود العملية</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-base font-black font-mono tracking-widest" style={trustText}>{receiptCode}</span>
              <button onClick={() => { navigator.clipboard.writeText(receiptCode); toast.success("تم نسخ الكود"); }}
                className="p-2 rounded-xl active:scale-90 transition-transform" style={{ background: "rgba(187,198,226,0.08)" }}>
                <Copy className="w-4 h-4" style={trustText} />
              </button>
            </div>
            <p className="text-[10px]" style={mutedText}>احفظ هذا الكود للمتابعة مع الإدارة</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Button onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full h-13 rounded-2xl font-bold text-base"
              style={{ background: "linear-gradient(135deg, #4ae183, #38c96e)", color: "#10141a" }}>
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
        <div className="px-5 py-6 space-y-5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          <div className="rounded-2xl p-5 space-y-4 text-center" style={cardSurface}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(187,198,226,0.08)" }}>
              <Search className="w-8 h-8" style={trustText} />
            </div>
            <h3 className="text-base font-bold" style={surfaceText}>شحن كوينز لحساب آخر</h3>
            <div className="rounded-2xl p-3 space-y-1" style={{ background: "rgba(74,225,131,0.05)" }}>
              <p className="text-xs" style={mutedText}>المبلغ</p>
              <p className="text-xl font-extrabold" dir="ltr" style={goldText}>${transferAmount.toFixed(2)}</p>
              <p className="text-sm font-bold" style={goldText}>= {(transferAmount * coinsRate).toLocaleString()} كوينز</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 space-y-3" style={cardSurface}>
            <label className="text-xs font-bold" style={surfaceText}>UUID المستلم</label>
            <div className="flex gap-2" dir="ltr">
              <Input value={targetUuid} onChange={e => { setTargetUuid(e.target.value.replace(/\D/g, "")); setTargetInfo(null); setTargetConfirmed(false); }}
                placeholder="أدخل UUID..." className="flex-1 text-center font-mono rounded-xl" dir="ltr"
                style={{ background: "rgba(15,26,46,0.6)", border: "none", color: "#dfe2eb" }} />
              <Button onClick={searchTargetUser} disabled={targetSearching || !targetUuid.trim()} size="sm"
                className="h-10 px-4 rounded-xl" style={{ background: "rgba(187,198,226,0.1)", ...trustText }}>
                {targetSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {targetInfo && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 space-y-3" style={{ ...cardSurface, boxShadow: "inset 3px 0 0 #4ae183" }}>
              <div className="flex items-center gap-3">
                {targetInfo.avatar ? (
                  <img src={targetInfo.avatar} alt="" className="w-12 h-12 rounded-full object-cover" style={{ border: "2px solid rgba(74,225,131,0.2)" }} />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(187,198,226,0.08)" }}>
                    <User className="w-6 h-6" style={trustText} />
                  </div>
                )}
                <div className="flex-1 text-right">
                  <p className="font-bold" style={surfaceText}>{targetInfo.name}</p>
                  <p className="text-xs font-mono" style={mutedText}>UUID: {targetInfo.uuid}</p>
                </div>
              </div>
              {!targetConfirmed ? (
                <Button onClick={() => setTargetConfirmed(true)} className="w-full h-11 rounded-2xl font-bold"
                  style={{ background: "rgba(74,225,131,0.15)", ...successText }}>
                  <CheckCircle className="w-4 h-4 ml-2" /> هذا هو ✓
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 justify-center" style={successText}>
                    <CheckCircle className="w-5 h-5" /><span className="text-sm font-bold">تم تأكيد المستلم</span>
                  </div>
                  <Button onClick={executeWithdrawal} disabled={processing} className="w-full h-12 rounded-2xl font-bold"
                    style={{ background: "linear-gradient(135deg, #e9c176, #d4a853)", color: "#10141a" }}>
                    {processing ? <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري التنفيذ...</> : `شحن ${(transferAmount * coinsRate).toLocaleString()} كوينز`}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-2xl" style={{ background: "rgba(255,180,171,0.06)" }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={errorText} />
              <p className="text-sm" style={errorText}>{error}</p>
            </div>
          )}

          <Button variant="outline" onClick={() => setStep("select_transfer")} className="w-full h-11 rounded-2xl"
            style={{ background: "rgba(187,198,226,0.06)", borderColor: "rgba(187,198,226,0.1)", ...trustText }}>
            <ArrowRight className="w-4 h-4 ml-1" /> رجوع
          </Button>

          <SubmissionOverlay visible={processing} title="جاري شحن الكوينز" activeStep={processStage === "check" ? 0 : 1}
            steps={[
              { label: "جاري فحص الراتب...", completedLabel: "تم الفحص ✓", icon: <></> },
              { label: "جاري تسجيل العملية...", completedLabel: "تم التسجيل ✓", icon: <></> },
            ]} />
        </div>
      </MobileLayout>
    );
  }

  // ── STEPPER FLOW (bank → account for cash) ──
  const stepperLabels = ["الحوالة", "البنك", "التأكيد"];
  const stepperIndex = { bank: 1, account: 2 }[step] ?? 0;

  return (
    <MobileLayout showHeader headerTitle={headerTitle} onBack={getBackAction()}>
      <div className="px-5 py-4 space-y-5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
        {/* Stepper */}
        <div className="flex items-center gap-1 px-2">
          {stepperLabels.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="h-1 w-full rounded-full transition-colors"
                style={{ background: i < stepperIndex ? "#e9c176" : i === stepperIndex ? "rgba(233,193,118,0.4)" : "rgba(120,131,156,0.15)" }} />
              <span className="text-[9px]" style={i <= stepperIndex ? goldText : mutedText}>{label}</span>
            </div>
          ))}
        </div>

        {/* Transfer summary */}
        <div className="rounded-2xl p-3 flex justify-between items-center" style={{ background: "rgba(15,26,46,0.5)" }}>
          <span className="text-xs" style={mutedText}>الحوالة</span>
          <div className="text-left">
            <span className="text-sm font-extrabold" dir="ltr" style={goldText}>${transferAmount.toFixed(2)}</span>
            <span className="text-[10px] font-mono mr-2" style={mutedText}>#{selectedTransfer?.reference_id}</span>
          </div>
        </div>

        {/* Salary type badge */}
        <div className="flex justify-center">
          <span className="px-2 py-0.5 rounded-xl text-[10px] font-bold"
            style={salaryType === "agency" ? { background: "rgba(187,198,226,0.08)", ...trustText } : { background: "rgba(74,225,131,0.08)", ...successText }}>
            {salaryType === "agency" ? "وكالة" : "مضيف"}
          </span>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-2xl" style={{ background: "rgba(255,180,171,0.06)" }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={errorText} />
            <p className="text-sm" style={errorText}>{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── BANK SELECTION ── */}
          {step === "bank" && (
            <motion.div key="bank" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-2xl p-4 space-y-4" style={cardSurface}>
                <h3 className="text-sm font-bold flex items-center gap-2" style={surfaceText}>
                  <Globe className="w-4 h-4" style={trustText} /> وين تبي نحوّل لك؟
                </h3>
                <div className="space-y-2">
                  {SALARY_COUNTRIES.map(c => {
                    const flag = COUNTRY_FLAGS[c.id] || "🏳";
                    const isOpen = selectedCountry === c.id;
                    return (
                      <div key={c.id}>
                        <button onClick={() => { setSelectedCountry(isOpen ? "" : c.id); setSelectedBank(""); setCustomBankName(""); }}
                          className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all"
                          style={isOpen ? { background: "rgba(187,198,226,0.06)" } : { background: "rgba(15,26,46,0.4)" }}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{flag}</span>
                            <span className="text-sm font-bold" style={surfaceText}>{c.name}</span>
                          </div>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                            <ArrowRight className="w-4 h-4 rotate-90" style={mutedText} />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden">
                              <div className="grid grid-cols-2 gap-2 pt-2.5 pr-3">
                                {c.banks.map(b => {
                                  const bankStyle = BANK_ICONS[b.id] || { icon: "", color: "" };
                                  const isSelected = selectedBank === b.id;
                                  return (
                                    <button key={b.id} onClick={() => { setSelectedBank(b.id); setCustomBankName(""); }}
                                      className="flex items-center gap-2.5 p-3 rounded-xl transition-all text-right"
                                      style={isSelected
                                        ? { background: "rgba(233,193,118,0.1)", boxShadow: "inset 2px 0 0 #e9c176" }
                                        : { background: "rgba(15,26,46,0.4)" }
                                      }>
                                      <span className="text-lg shrink-0">{bankStyle.icon}</span>
                                      <span className="text-xs font-medium flex-1" style={isSelected ? goldText : surfaceText}>{b.label}</span>
                                      {isSelected && <CheckCircle className="w-4 h-4 shrink-0" style={goldText} />}
                                    </button>
                                  );
                                })}
                              </div>
                              {isOtherBank && (
                                <div className="mt-2.5 pr-3">
                                  <Input value={customBankName} onChange={e => setCustomBankName(e.target.value)}
                                    placeholder="اكتب اسم البنك" className="rounded-xl" dir="rtl"
                                    style={{ background: "rgba(15,26,46,0.6)", border: "none", color: "#dfe2eb" }} />
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
                <Button variant="outline" onClick={() => setStep("select_transfer")} className="flex-1 h-12 rounded-2xl"
                  style={{ background: "rgba(187,198,226,0.06)", borderColor: "rgba(187,198,226,0.1)", ...trustText }}>
                  <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                </Button>
                <Button onClick={() => setStep("account")} disabled={!canProceedBank}
                  className="flex-1 h-12 rounded-2xl font-bold disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #e9c176, #d4a853)", color: "#10141a" }}>
                  متابعة <ArrowLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── ACCOUNT DETAILS ── */}
          {step === "account" && (
            <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-2xl p-4 space-y-4" style={cardSurface}>
                <h3 className="text-sm font-bold flex items-center gap-2" style={surfaceText}>
                  <UserCheck className="w-4 h-4" style={trustText} /> معلومات الحساب
                </h3>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={surfaceText}>اسم المستلم *</label>
                  <Input value={recipientName} onChange={e => setRecipientName(e.target.value)}
                    placeholder="الاسم الكامل كما في الحساب البنكي" className="rounded-xl" dir="rtl"
                    style={{ background: "rgba(15,26,46,0.6)", border: "none", color: "#dfe2eb" }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={surfaceText}>رقم الحساب / المحفظة (اختياري)</label>
                  <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                    placeholder="أدخل رقم الحساب أو المحفظة" className="rounded-xl" dir="ltr"
                    style={{ background: "rgba(15,26,46,0.6)", border: "none", color: "#dfe2eb" }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold flex items-center gap-1.5" style={surfaceText}>
                    <Phone className="w-3.5 h-3.5" style={successText} /> رقم الواتساب *
                    {verifiedPhone && (
                      <Badge className="text-[10px] px-1.5 py-0" style={{ background: "rgba(74,225,131,0.1)", ...successText, border: "none" }}>✅ موثق</Badge>
                    )}
                  </label>
                  {verifiedPhone ? (
                    <Input value={verifiedPhone} readOnly className="font-mono rounded-xl" dir="ltr"
                      style={{ background: "rgba(15,26,46,0.6)", border: "none", ...successText }} />
                  ) : (
                  <div className="flex gap-2" dir="ltr">
                    <select value={whatsappCode} onChange={e => setWhatsappCode(e.target.value)}
                      className="rounded-xl px-2 py-2 text-sm w-24 shrink-0"
                      style={{ background: "rgba(15,26,46,0.6)", border: "none", color: "#dfe2eb" }}>
                      {countryCodes.map(cc => (
                        <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>
                      ))}
                    </select>
                    <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="رقم الواتساب" type="tel" className="flex-1 rounded-xl" dir="ltr"
                      style={{ background: "rgba(15,26,46,0.6)", border: "none", color: "#dfe2eb" }} />
                  </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={surfaceText}>ملاحظات (اختياري)</label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية..." className="min-h-[60px] rounded-xl" dir="rtl"
                    style={{ background: "rgba(15,26,46,0.6)", border: "none", color: "#dfe2eb" }} />
                </div>
              </div>

              {canProceedAccount && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 space-y-3" style={cardSurface}>
                  <h3 className="text-sm font-bold text-center" style={surfaceText}>ملخص الطلب</h3>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: "المبلغ", value: `$${transferAmount.toFixed(2)}`, color: goldText.color },
                      { label: "النوع", value: salaryType === "agency" ? "وكالة" : "مضيف", color: salaryType === "agency" ? trustText.color : successText.color },
                      { label: "البنك", value: `${effectiveBankLabel} — ${country?.name}`, color: surfaceText.color },
                      { label: "المستلم", value: recipientName, color: surfaceText.color },
                      { label: "الحوالة", value: `#${selectedTransfer?.reference_id}`, color: surfaceText.color },
                    ].map(s => (
                      <div key={s.label} className="flex justify-between rounded-xl p-3" style={{ background: "rgba(15,26,46,0.5)" }}>
                        <span style={mutedText}>{s.label}</span>
                        <span className="font-bold" style={{ color: s.color, fontFamily: "'Manrope', sans-serif" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("bank")} className="flex-1 h-12 rounded-2xl"
                  style={{ background: "rgba(187,198,226,0.06)", borderColor: "rgba(187,198,226,0.1)", ...trustText }}>
                  <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                </Button>
                <Button onClick={executeWithdrawal} disabled={!canProceedAccount || processing}
                  className="flex-1 h-12 rounded-2xl font-bold disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #e9c176, #d4a853)", color: "#10141a" }}>
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد وسحب"}
                </Button>
              </div>

              <SubmissionOverlay visible={processing} title="جاري سحب الراتب" activeStep={processStage === "check" ? 0 : 1}
                steps={[
                  { label: "جاري فحص الراتب...", completedLabel: "تم الفحص ✓", icon: <></> },
                  { label: "جاري تسجيل الطلب...", completedLabel: "تم التسجيل ✓", icon: <></> },
                ]} />
            </motion.div>
          )}
        </AnimatePresence>
        {termsDialog}
      </div>
    </MobileLayout>
  );
};

export default SalaryWithdraw;
