import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle, AlertCircle, Globe,
  UserCheck, ArrowRight, ArrowLeft, Phone,
  Loader2, Copy, Coins, Search, User,
  Wallet, Gift, DollarSign,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SalaryRequestsHistory from "@/components/SalaryRequestsHistory";
import SubmissionOverlay from "@/components/SubmissionOverlay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const DB_PROXY = "https://hola-chat.com/db-proxy.php";
const PROXY_KEY = "ghala2026proxy";
const API = "https://galachat.site/project-z/api.php";

const USD_TO_COINS = 8500;

interface SalaryCheckResult {
  salary_actual: number;
  salary_expected: number;
  remaining: number;
  is_suspicious: boolean;
  can_withdraw: boolean;
  total_withdrawn?: number;
  cash_count?: number;
  max_cash?: number;
}

interface TransferResult {
  ok: boolean;
  error?: string;
  reference_id?: string;
  amount_usd?: number;
  coins?: number;
  time?: string;
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

const SalaryWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

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
  const [salaryInfo, setSalaryInfo] = useState<SalaryCheckResult | null>(null);

  // Amount
  const [amountUsd, setAmountUsd] = useState("");

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
  const [processStage, setProcessStage] = useState<"check" | "transfer" | "save">("check");
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [resultRemaining, setResultRemaining] = useState(0);

  // Salary warning
  const [salaryWarning, setSalaryWarning] = useState<{ show: boolean; message?: string } | null>(null);

  const hasFetchedRef = useRef(false);
  const processInFlightRef = useRef(false);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchSalaryInfo();
  }, [user?.uuid]);

  const fetchSalaryInfo = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${DB_PROXY}?key=${PROXY_KEY}&action=salary-check&uuid=${user!.uuid}`);
      const data = await res.json();
      setSalaryInfo(data);

      if (data.is_suspicious) {
        setSalaryWarning({
          show: true,
          message: `الراتب مشبوه! المسجل: $${data.salary_actual} — المتوقع: $${data.salary_expected}`,
        });
        setStep("blocked");
      } else if (!data.can_withdraw) {
        setStep("no_salary");
      } else {
        // For cash mode, check frequency limits
        if (pathMode === "cash") {
          const cashCount = data.cash_count || 0;
          const maxCash = data.max_cash || 1;
          if (cashCount >= maxCash) {
            setStep("exhausted");
            return;
          }
        }
        setStep("amount");
      }
    } catch {
      setError("فشل الاتصال بالخادم");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const searchTargetUser = async () => {
    if (!targetUuid.trim() || targetSearching) return;
    setTargetSearching(true);
    setTargetInfo(null);
    setTargetConfirmed(false);
    try {
      const res = await fetch(
        `https://hola-chat.com/wares-api.php?key=ghala2026actions&action=check-supporter&uuid=${targetUuid.trim()}`
      );
      const data = await res.json();
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

  const executeWithdrawal = async () => {
    if (processing || processInFlightRef.current) return;
    processInFlightRef.current = true;
    setProcessing(true);
    setProcessStage("check");
    setError("");

    const amount = parseFloat(amountUsd);
    const chargeTarget = pathMode === "charge_other" ? targetInfo?.uuid : undefined;

    try {
      // 1. Re-check salary
      setProcessStage("check");
      const checkRes = await fetch(`${DB_PROXY}?key=${PROXY_KEY}&action=salary-check&uuid=${user!.uuid}`);
      const check = await checkRes.json();

      if (check.is_suspicious) {
        throw new Error(`الراتب مشبوه! المسجل: $${check.salary_actual} — المتوقع: $${check.salary_expected}`);
      }
      if (!check.can_withdraw) {
        throw new Error("لا يوجد دعم هالشهر — ما يقدر يسحب");
      }
      if (amount > (check.remaining || 0)) {
        throw new Error(`المبلغ أكبر من المتبقي ($${check.remaining})`);
      }

      // 2. Execute auto-transfer
      setProcessStage("transfer");
      const transferRes = await fetch(DB_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `key=${PROXY_KEY}&action=transfer&from_uuid=${user!.uuid}&to_uuid=10000&usd=${amount}`,
      });
      const result: TransferResult = await transferRes.json();

      if (!result.ok) {
        throw new Error(result.error || "فشل التحويل");
      }

      // 3. Save to database
      setProcessStage("save");

      const requestType = pathMode === "charge_other" ? "charge_other" : pathMode === "charge_self" ? "charge_self" : "cash";
      const targetName = chargeTarget
        ? targetInfo?.name || "مستخدم آخر"
        : pathMode === "charge_self"
          ? user!.name
          : recipientName;

      // For coin charges, also charge the target
      if (pathMode === "charge_self" || pathMode === "charge_other") {
        const chargeTargetUuid = chargeTarget || user!.uuid;
        const chargeRes = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "salary_charge_manual",
            admin_key: "ghala2026owner",
            uuid: chargeTargetUuid,
            amount,
            reference_id: result.reference_id || "auto",
          }),
        });
        const chargeData = await chargeRes.json();
        if (!chargeData.success) {
          throw new Error(chargeData.message || "فشل شحن الكوينز بعد التحويل");
        }
      }

      const country = SALARY_COUNTRIES.find(c => c.id === selectedCountry);
      const bank = country?.banks.find(b => b.id === selectedBank);
      const isOtherBank = selectedBank?.endsWith("_other");
      const effectiveBankLabel = isOtherBank ? customBankName : bank?.label;

      await supabase.from("salary_requests").insert({
        user_uuid: user!.uuid,
        user_name: user!.name,
        user_phone: pathMode === "cash" ? `${whatsappCode}${whatsappNumber}` : null,
        request_type: requestType,
        amount_usd: amount,
        amount_coins: amount * USD_TO_COINS,
        recipient_name: targetName,
        recipient_country: pathMode === "cash" ? (country?.name || selectedCountry) : "coins",
        payment_method: pathMode === "cash" ? (effectiveBankLabel || selectedBank) : "coins_charge",
        payment_details: pathMode === "cash"
          ? `account:${accountNumber || "-"} | whatsapp:${whatsappCode}${whatsappNumber}${notes ? ` | notes:${notes}` : ""}`
          : `target_uuid:${chargeTarget || user!.uuid}`,
        status: pathMode === "cash" ? "pending" : "approved",
        transfer_id: result.reference_id || null,
        transaction_id: result.reference_id || null,
        transaction_date: result.time || new Date().toISOString(),
        target_uuid: chargeTarget || user!.uuid,
        target_name: targetName,
        admin_note: pathMode === "cash"
          ? `تحويل تلقائي #${result.reference_id} | ${notes || ""}`
          : `شحن تلقائي #${result.reference_id}`,
      } as any);

      setTransferResult(result);
      setResultRemaining(Math.max(0, (check.remaining || 0) - amount));
      setStep("success");

    } catch (err: any) {
      setError(err.message || "فشل في العملية");
    } finally {
      setProcessing(false);
      processInFlightRef.current = false;
    }
  };

  if (!user) return null;

  const headerTitle = modeConfig[pathMode]?.title || "سحب الراتب";
  const parsedAmount = parseFloat(amountUsd) || 0;
  const remaining = salaryInfo?.remaining || 0;
  const canProceedAmount = parsedAmount >= 1 && parsedAmount <= remaining;

  const country = SALARY_COUNTRIES.find(c => c.id === selectedCountry);
  const bank = country?.banks.find(b => b.id === selectedBank);
  const isOtherBank = selectedBank?.endsWith("_other");
  const effectiveBankLabel = isOtherBank ? customBankName : bank?.label;
  const canProceedBank = selectedCountry && selectedBank && (!isOtherBank || customBankName.trim().length >= 2);
  const canProceedAccount = recipientName.trim().length >= 2 && whatsappNumber.trim().length >= 6;

  const getBackAction = () => {
    switch (step) {
      case "amount": return () => navigate("/salary");
      case "bank": return () => setStep("amount");
      case "account": return () => setStep("bank");
      case "charge_other_search": return () => setStep("amount");
      default: return () => navigate("/salary");
    }
  };

  // ── LOADING ──
  if (loading || step === "loading") {
    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري فحص الراتب...</p>
        </div>
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
          <Button onClick={() => { hasFetchedRef.current = false; fetchSalaryInfo(); }} className="mt-4">
            إعادة المحاولة
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // ── BLOCKED (suspicious) ──
  if (step === "blocked") {
    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تحذير أمان</h2>
          <p className="text-sm text-muted-foreground text-center">{salaryWarning?.message}</p>
          <Button onClick={() => navigate("/support")} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            تواصل مع الدعم
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // ── NO SALARY ──
  if (step === "no_salary") {
    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">لا يوجد رصيد</h2>
          <p className="text-sm text-muted-foreground text-center">لا يوجد دعم هالشهر — ما يقدر يسحب</p>
          <Button onClick={() => navigate("/salary")} variant="outline">رجوع</Button>
        </div>
      </MobileLayout>
    );
  }

  // ── EXHAUSTED (cash limit reached) ──
  if (step === "exhausted") {
    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">وصلت الحد الأقصى</h2>
          <p className="text-sm text-muted-foreground text-center">
            وصلت الحد الأقصى لسحب الراتب النقدي هذا الشهر ({salaryInfo?.cash_count || 0} من {salaryInfo?.max_cash || 1})
          </p>
          <Button onClick={() => navigate("/salary")} variant="outline">رجوع</Button>
        </div>
      </MobileLayout>
    );
  }

  // ── SUCCESS ──
  if (step === "success" && transferResult) {
    const receiptCode = `GC-${transferResult.reference_id || "AUTO"}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const receiptDate = transferResult.time || new Date().toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });

    return (
      <MobileLayout showHeader headerTitle="إيصال السحب" onBack={() => navigate("/salary", { replace: true })}>
        <div className="px-5 py-6 space-y-5">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-5">

            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-black text-foreground">✅ تم السحب!</h2>
            </div>

            <div className="rounded-xl bg-background/50 border border-border/20 p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">التاريخ</span>
                <span className="text-xs text-foreground">{receiptDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المبلغ</span>
                <span className="font-bold text-emerald-400" dir="ltr">
                  ${parsedAmount} ({(parsedAmount * USD_TO_COINS).toLocaleString()} كوينز)
                </span>
              </div>
              {transferResult.reference_id && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رقم الحوالة</span>
                  <span className="font-mono font-bold text-foreground">#{transferResult.reference_id}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الراتب المتبقي</span>
                <span className="font-bold text-foreground" dir="ltr">${resultRemaining.toFixed(2)}</span>
              </div>
              {pathMode === "cash" && effectiveBankLabel && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">البنك</span>
                  <span className="font-bold text-foreground">{effectiveBankLabel} — {country?.name}</span>
                </div>
              )}
              {pathMode === "charge_other" && targetInfo && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المستلم</span>
                  <span className="font-bold text-foreground">{targetInfo.name} ({targetInfo.uuid})</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الحالة</span>
                <span className={`font-bold ${pathMode === "cash" ? "text-amber-400" : "text-emerald-400"}`}>
                  {pathMode === "cash" ? "قيد المراجعة" : "تم ✓"}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center space-y-2">
              <p className="text-[10px] text-muted-foreground">كود العملية</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-black font-mono text-primary tracking-wider">{receiptCode}</span>
                <button onClick={() => { navigator.clipboard.writeText(receiptCode); toast.success("تم نسخ الكود"); }}
                  className="p-1.5 rounded-lg bg-primary/15 active:scale-90 transition-transform">
                  <Copy className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>
            </div>
          </motion.div>

          <Button onClick={() => navigate("/salary", { replace: true })}
            className="w-full h-12 gold-gradient text-primary-foreground font-bold">
            العودة للرئيسية
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // ── AMOUNT INPUT ──
  if (step === "amount") {
    return (
      <MobileLayout showHeader headerTitle={headerTitle} onBack={() => navigate("/salary")}>
        <div className="px-5 py-6 space-y-5">
          {/* Salary Summary */}
          <div className="rounded-2xl bg-muted/10 border border-border/20 p-5 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-bold text-foreground">معلومات الراتب</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <p className="text-[10px] text-muted-foreground">الراتب الكلي</p>
                <p className="text-lg font-black text-emerald-400" dir="ltr">${salaryInfo?.salary_actual?.toFixed(2) || "0"}</p>
              </div>
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                <p className="text-[10px] text-muted-foreground">المتبقي</p>
                <p className="text-lg font-black text-primary" dir="ltr">${remaining.toFixed(2)}</p>
              </div>
            </div>
            {(salaryInfo?.total_withdrawn || 0) > 0 && (
              <p className="text-[10px] text-red-400">
                تم صرف: <span className="font-bold" dir="ltr">${salaryInfo?.total_withdrawn?.toFixed(2)}</span>
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground text-center">كم تبي تسحب؟</h3>
            <div className="relative">
              <Input
                type="number"
                value={amountUsd}
                onChange={e => setAmountUsd(e.target.value)}
                placeholder="0.00"
                className="bg-muted/20 border-border/30 text-center text-2xl font-black h-16 pr-10"
                dir="ltr"
                min="1"
                max={remaining}
                step="0.01"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">$</span>
            </div>
            {parsedAmount > 0 && (
              <p className="text-center text-sm text-amber-400 font-bold">
                = {(parsedAmount * USD_TO_COINS).toLocaleString()} كوينز
              </p>
            )}
            {parsedAmount > remaining && (
              <p className="text-center text-xs text-destructive">المبلغ أكبر من المتبقي!</p>
            )}

            {/* Quick amounts */}
            <div className="flex gap-2 justify-center flex-wrap">
              {[10, 25, 50, 100].filter(v => v <= remaining).map(v => (
                <button key={v} onClick={() => setAmountUsd(String(v))}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                    parsedAmount === v
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-muted/10 border-border/20 text-muted-foreground hover:bg-muted/20"
                  )}>
                  ${v}
                </button>
              ))}
              {remaining > 0 && (
                <button onClick={() => setAmountUsd(String(Math.floor(remaining * 100) / 100))}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                    parsedAmount === Math.floor(remaining * 100) / 100
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : "bg-muted/10 border-border/20 text-muted-foreground hover:bg-muted/20"
                  )}>
                  الكل (${Math.floor(remaining * 100) / 100})
                </button>
              )}
            </div>
          </div>

          {/* Proceed button */}
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
                // charge_self → go directly to confirm/execute
                executeWithdrawal();
              }
            }}
            disabled={!canProceedAmount || processing}
            className="w-full h-12 gold-gradient text-primary-foreground font-bold disabled:opacity-40"
          >
            {processing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : pathMode === "charge_self" ? (
              <>شحن {(parsedAmount * USD_TO_COINS).toLocaleString()} كوينز لحسابي</>
            ) : (
              <>متابعة <ArrowLeft className="w-4 h-4 mr-1" /></>
            )}
          </Button>

          <SalaryRequestsHistory userUuid={user.uuid} />

          {/* Processing overlay */}
          <SubmissionOverlay
            visible={processing}
            title="جاري تنفيذ العملية"
            activeStep={processStage === "check" ? 0 : processStage === "transfer" ? 1 : 2}
            steps={[
              { label: "جاري فحص الراتب...", completedLabel: "تم الفحص ✓", icon: <></> },
              { label: "جاري التحويل التلقائي...", completedLabel: "تم التحويل ✓", icon: <></> },
              { label: "جاري تسجيل العملية...", completedLabel: "تم التسجيل ✓", icon: <></> },
            ]}
          />
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
              <p className="text-xl font-black text-emerald-400" dir="ltr">${parsedAmount}</p>
              <p className="text-sm font-bold text-amber-400">= {(parsedAmount * USD_TO_COINS).toLocaleString()} كوينز</p>
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
                    {processing ? <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري التنفيذ...</> : `شحن ${(parsedAmount * USD_TO_COINS).toLocaleString()} كوينز`}
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

          <Button variant="outline" onClick={() => setStep("amount")} className="w-full h-11 border-border/30">
            <ArrowRight className="w-4 h-4 ml-1" /> رجوع
          </Button>

          <SubmissionOverlay
            visible={processing}
            title="جاري شحن الكوينز"
            activeStep={processStage === "check" ? 0 : processStage === "transfer" ? 1 : 2}
            steps={[
              { label: "جاري فحص الراتب...", completedLabel: "تم الفحص ✓", icon: <></> },
              { label: "جاري التحويل والشحن...", completedLabel: "تم الشحن ✓", icon: <></> },
              { label: "جاري تسجيل العملية...", completedLabel: "تم التسجيل ✓", icon: <></> },
            ]}
          />
        </div>
      </MobileLayout>
    );
  }

  // ── STEPPER FLOW (bank → account for cash) ──
  const stepperLabels = ["المبلغ", "البنك", "التأكيد"];
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

        {/* Amount summary */}
        <div className="bg-muted/20 rounded-xl p-3 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">المبلغ</span>
          <span className="text-sm font-black text-emerald-400" dir="ltr">${parsedAmount}</span>
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
                <Button variant="outline" onClick={() => setStep("amount")} className="flex-1 h-12 border-border/30">
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
                  </label>
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
                      <span className="font-bold text-primary">${parsedAmount}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">البنك</span>
                      <span className="font-bold text-foreground">{effectiveBankLabel} — {country?.name}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">المستلم</span>
                      <span className="font-bold text-foreground">{recipientName}</span>
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
                activeStep={processStage === "check" ? 0 : processStage === "transfer" ? 1 : 2}
                steps={[
                  { label: "جاري فحص الراتب...", completedLabel: "تم الفحص ✓", icon: <></> },
                  { label: "جاري التحويل التلقائي...", completedLabel: "تم التحويل ✓", icon: <></> },
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
