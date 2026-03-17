import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, AlertCircle, Globe,
  UserCheck, DollarSign, ArrowRight, ArrowLeft, ShieldAlert, Phone,
  Loader2, Clock, Copy, Camera, Landmark, User, Frown, ChevronDown, ShieldX, RefreshCw, Coins,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import SalaryRequestsHistory from "@/components/SalaryRequestsHistory";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = "https://galachat.site/project-z/api.php";

interface Transfer {
  reference_id: string;
  amount_usd: number;
  time: string;
  is_used: boolean;
  selectable: boolean;
}

interface TransfersResult {
  transfers: Transfer[];
  is_agency_owner?: boolean;
  withdrawals?: { count: number; max: number; total_withdrawn: number };
}

interface SalaryBank {
  id: string;
  label: string;
}

interface SalaryCountry {
  id: string;
  name: string;
  banks: SalaryBank[];
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
  jeeppay: { icon: "🟢", color: "from-green-600/20 to-green-700/10 border-green-500/20" },
  kuraimi: { icon: "🔵", color: "from-blue-600/20 to-blue-700/10 border-blue-500/20" },
  najm: { icon: "⭐", color: "from-yellow-600/20 to-yellow-700/10 border-yellow-500/20" },
  rajhi: { icon: "🏦", color: "from-emerald-600/20 to-emerald-700/10 border-emerald-500/20" },
  ahli: { icon: "🏛", color: "from-teal-600/20 to-teal-700/10 border-teal-500/20" },
  stcpay: { icon: "📱", color: "from-purple-600/20 to-purple-700/10 border-purple-500/20" },
  zelle: { icon: "⚡", color: "from-violet-600/20 to-violet-700/10 border-violet-500/20" },
  cashapp: { icon: "💵", color: "from-green-500/20 to-green-600/10 border-green-400/20" },
  chime: { icon: "🔔", color: "from-cyan-600/20 to-cyan-700/10 border-cyan-500/20" },
  applepay: { icon: "🍎", color: "from-gray-600/20 to-gray-700/10 border-gray-500/20" },
  usdt: { icon: "₮", color: "from-green-600/20 to-green-700/10 border-green-500/20" },
  western_union: { icon: "🌐", color: "from-yellow-600/20 to-yellow-700/10 border-yellow-500/20" },
  moneygram: { icon: "💸", color: "from-orange-600/20 to-orange-700/10 border-orange-500/20" },
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

const TRANSFER_TARGET_ID = "10000";
const USD_TO_COINS = 8500;

const getCashWithdrawDates = () => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const canWithdrawCash = dayOfMonth >= lastDay - 2;
  return { dayOfMonth, lastDay, canWithdrawCash, startDay: lastDay - 2 };
};

const getWithdrawalLimits = (isAgencyOwner: boolean) => {
  const maxCash = isAgencyOwner ? 2 : 1;
  const maxTotal = isAgencyOwner ? 3 : 2;
  return { maxCash, maxTotal };
};

const SalaryWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isAgencyOwner, setIsAgencyOwner] = useState(false);
  const [usedCount, setUsedCount] = useState(0);

  // Selected transfer
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [withdrawalMode, setWithdrawalMode] = useState<"cash" | "coins">("cash");

  // Steps
  const [step, setStep] = useState<string>("loading");

  // Screenshot for manual verification
  const [screenshotBase64, setScreenshotBase64] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bank selection
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [customBankName, setCustomBankName] = useState("");

  // Account details
  const [recipientName, setRecipientName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [whatsappCode, setWhatsappCode] = useState("+967");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; request_id?: string; message?: string } | null>(null);

  // Coins charge
  const [chargingCoins, setChargingCoins] = useState(false);
  const [coinsCharged, setCoinsCharged] = useState(0);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchTransfers();
  }, [user?.uuid]);

  const fetchTransfers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}?action=user_transfers&uuid=${user!.uuid}`);
      const data: TransfersResult = await res.json();
      const allTransfers = data.transfers || [];
      setTransfers(allTransfers);
      setIsAgencyOwner(!!data.is_agency_owner);

      const used = allTransfers.filter(t => t.is_used).length;
      setUsedCount(used);

      const newTransfers = allTransfers.filter(t => !t.is_used && t.selectable);
      const { maxTotal } = getWithdrawalLimits(!!data.is_agency_owner);

      if (used >= maxTotal) {
        setStep("exhausted");
      } else if (newTransfers.length === 0) {
        setStep("no_transfers");
      } else {
        setStep("transfers_list");
      }
    } catch {
      setError("فشل الاتصال بالخادم");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTransfer = (transfer: Transfer) => {
    setSelectedTransfer(transfer);

    const newTransfers = transfers.filter(t => !t.is_used && t.selectable);
    const selectedIndex = newTransfers.indexOf(transfer);
    const { maxCash } = getWithdrawalLimits(isAgencyOwner);
    const isCash = (usedCount + selectedIndex) < maxCash;

    if (isCash) {
      const { canWithdrawCash, startDay, lastDay } = getCashWithdrawDates();
      if (!canWithdrawCash) {
        toast.error(`سحب الراتب النقدي متاح فقط من يوم ${startDay} إلى ${lastDay} من الشهر`);
        return;
      }
      setWithdrawalMode("cash");
      setStep("bank");
    } else {
      setWithdrawalMode("coins");
      setStep("coins_confirm");
    }
  };

  const chargeCoins = async () => {
    if (!selectedTransfer) return;
    setChargingCoins(true);
    setError("");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "salary_charge_manual",
          admin_key: "ghala2026owner",
          uuid: user!.uuid,
          amount: selectedTransfer.amount_usd,
          reference_id: selectedTransfer.reference_id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCoinsCharged(selectedTransfer.amount_usd * USD_TO_COINS);
        setStep("coins_success");
      } else {
        setError(data.message || "فشل شحن الكوينز");
      }
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setChargingCoins(false);
    }
  };

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الصورة كبير (الحد 5MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setScreenshotBase64(result);
      setScreenshotPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedTransfer) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "salary_withdraw",
          uuid: user!.uuid,
          amount: selectedTransfer.amount_usd,
          country: selectedCountry,
          bank: isOtherBank ? customBankName : selectedBank,
          account_name: recipientName,
          account_number: accountNumber || "",
          whatsapp: `${whatsappCode}${whatsappNumber}`,
          notes,
          reference_id: selectedTransfer.reference_id,
          screenshot: screenshotBase64 || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult(data);
        setStep("success");
      } else {
        setError(data.message || data.error || "فشل في رفع الطلب");
      }
    } catch {
      setError("فشل الاتصال. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const country = SALARY_COUNTRIES.find(c => c.id === selectedCountry);
  const bank = country?.banks.find(b => b.id === selectedBank);
  const isOtherBank = selectedBank?.endsWith("_other");
  const effectiveBankLabel = isOtherBank ? customBankName : bank?.label;
  const canProceedBank = selectedCountry && selectedBank && (!isOtherBank || customBankName.trim().length >= 2);
  const canProceedAccount = recipientName.trim().length >= 2 && whatsappNumber.trim().length >= 6;
  const withdrawAmount = selectedTransfer?.amount_usd || 0;

  const getBackAction = () => {
    switch (step) {
      case "transfers_list": return () => navigate("/dashboard");
      case "bank": return () => setStep("transfers_list");
      case "account": return () => setStep("bank");
      case "coins_confirm": return () => setStep("transfers_list");
      default: return () => navigate("/dashboard");
    }
  };

  // ── LOADING ──
  if (loading || step === "loading") {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري جلب الحوالات...</p>
        </div>
      </MobileLayout>
    );
  }

  // ── NO TRANSFERS ──
  if (step === "no_transfers") {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-8 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-5">
              <Frown className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-3">لم نجد حوالات لحسابك</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">حوّل راتبك من التطبيق أولاً:</p>
          </div>

          <div className="glass-card p-5 space-y-3 text-right">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <span className="text-xs text-foreground font-semibold">افتح غلا لايف → تحويل الرصيد</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div className="flex-1 flex items-center justify-between bg-muted/30 rounded-xl p-3">
                <span className="text-xs text-muted-foreground">UUID:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-primary font-mono">{TRANSFER_TARGET_ID}</span>
                  <button onClick={() => { navigator.clipboard.writeText(TRANSFER_TARGET_ID); toast.success("تم النسخ!"); }}
                    className="p-1.5 rounded-lg bg-primary/15 active:scale-90 transition-transform">
                    <Copy className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <span className="text-xs text-foreground font-semibold">المبلغ: راتبك كامل</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={() => { hasFetchedRef.current = false; fetchTransfers(); }}
              className="w-full gold-gradient text-primary-foreground font-bold h-12">
              <RefreshCw className="w-4 h-4 ml-2" /> تحديث الحوالات
            </Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-12 border-border/30 font-bold">الرجوع</Button>
          </div>

          <SalaryRequestsHistory userUuid={user.uuid} />
        </div>
      </MobileLayout>
    );
  }

  // ── EXHAUSTED ──
  if (step === "exhausted") {
    const { maxTotal } = getWithdrawalLimits(isAgencyOwner);
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-8 space-y-6">
          <div className="flex flex-col items-center text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-5">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </motion.div>
            <h2 className="text-lg font-bold text-foreground mb-2">تم صرف راتبك بالكامل ✅</h2>
            <p className="text-xs text-muted-foreground">سحبت {usedCount} من {maxTotal} هذا الشهر</p>
          </div>
          <SalaryRequestsHistory userUuid={user.uuid} />
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-12 border-border/30 font-bold">الرجوع</Button>
        </div>
      </MobileLayout>
    );
  }

  // ── ERROR ──
  if (step === "error") {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => { hasFetchedRef.current = false; fetchTransfers(); }} className="gold-gradient text-primary-foreground font-bold px-8">إعادة المحاولة</Button>
        </div>
      </MobileLayout>
    );
  }

  // ── SUCCESS (cash withdrawal) ──
  if (step === "success" && submitResult) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center w-full">
            <h2 className="text-lg font-bold text-foreground mb-2">✅ تم رفع طلب سحب الراتب!</h2>
            <p className="text-xs text-muted-foreground mb-4">سيتم مراجعته خلال 1-3 أيام</p>
            {submitResult.request_id && (
              <div className="mt-4 rounded-xl p-4 bg-muted/30 border border-border/20 space-y-2">
                <p className="text-[10px] text-muted-foreground">رقم الطلب</p>
                <p className="text-xl font-black text-primary font-mono tracking-wider">{submitResult.request_id}</p>
              </div>
            )}
            <div className="mt-4 rounded-xl p-4 bg-muted/30 border border-border/20 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">المبلغ</span>
                <span className="font-bold text-foreground">${withdrawAmount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">الحوالة</span>
                <span className="font-bold text-foreground">#{selectedTransfer?.reference_id}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">البنك</span>
                <span className="font-bold text-foreground">{effectiveBankLabel} — {country?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">الحالة</span>
                <span className="font-bold text-amber-400">⏳ قيد المراجعة</span>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-3 mt-8 w-full">
            <Button onClick={() => navigate("/my-requests")} variant="outline" className="flex-1 border-border/30 font-bold">طلباتي</Button>
            <Button onClick={() => navigate("/dashboard")} className="flex-1 gold-gradient text-primary-foreground font-bold">الرئيسية</Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  // ── COINS SUCCESS ──
  if (step === "coins_success") {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6">
            <Coins className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center w-full space-y-4">
            <h2 className="text-lg font-bold text-foreground">✅ تم شحن الكوينز لحسابك!</h2>
            <div className="rounded-xl p-5 bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-3xl font-black text-emerald-400">{coinsCharged.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">كوينز</p>
            </div>
            <p className="text-xs text-muted-foreground">تم إضافة الكوينز إلى رصيدك في غلا لايف</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-3 mt-8 w-full">
            <Button onClick={() => navigate("/dashboard")} className="flex-1 gold-gradient text-primary-foreground font-bold">الرئيسية</Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  // ── TRANSFERS LIST ──
  if (step === "transfers_list") {
    const newTransfers = transfers.filter(t => !t.is_used && t.selectable);
    const usedTransfers = transfers.filter(t => t.is_used);
    const { maxCash, maxTotal } = getWithdrawalLimits(isAgencyOwner);
    const cashLeft = Math.max(0, maxCash - usedCount);
    const { canWithdrawCash, startDay } = getCashWithdrawDates();

    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-6 space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-foreground">حوالاتك إلى الإدارة</h2>
            <p className="text-xs text-muted-foreground">
              سحبت {usedCount} من {maxTotal} هذا الشهر
            </p>
            <p className="text-[10px] text-muted-foreground">
              {cashLeft > 0
                ? (canWithdrawCash
                  ? `💵 سحب نقدي متاح (${cashLeft} سحبة متبقية)`
                  : `⏰ السحب النقدي يفتح يوم ${startDay}/${new Date().getMonth() + 1}`)
                : "🪙 شحن كوينز فقط"
              }
            </p>
          </div>

          {/* New (selectable) transfers */}
          {newTransfers.length > 0 && (
            <div className="space-y-3">
              {newTransfers.map((t, i) => {
                const isCash = (usedCount + i) < maxCash;
                return (
                  <motion.button
                    key={t.reference_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleSelectTransfer(t)}
                    className="w-full glass-card p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 active:scale-[0.98] transition-all text-right space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🟢</span>
                        <span className="text-sm font-mono font-bold text-foreground">#{t.reference_id}</span>
                      </div>
                      <span className="text-lg font-black text-emerald-400" dir="ltr">${t.amount_usd.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{t.time}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isCash ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                      )}>
                        {isCash ? "💵 نقدي" : "🪙 كوينز"}
                      </span>
                    </div>
                    <div className="flex items-center justify-center pt-1">
                      <span className="text-[10px] text-primary flex items-center gap-1">
                        اختيار للسحب <ArrowLeft className="w-3 h-3" />
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Used transfers */}
          {usedTransfers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold px-1">حوالات مستخدمة:</p>
              {usedTransfers.map(t => (
                <div key={t.reference_id} className="glass-card p-3 rounded-xl border border-red-500/10 opacity-60 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔴</span>
                      <span className="text-xs font-mono font-bold text-muted-foreground">#{t.reference_id}</span>
                    </div>
                    <span className="text-sm font-bold text-muted-foreground" dir="ltr">${t.amount_usd.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{t.time}</span>
                    <span className="text-[10px] text-red-400 font-bold">تم السحب بها</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button onClick={() => { hasFetchedRef.current = false; fetchTransfers(); }}
            variant="outline" className="w-full h-10 border-border/30 text-xs font-bold">
            <RefreshCw className="w-3.5 h-3.5 ml-2" /> تحديث الحوالات
          </Button>

          <SalaryRequestsHistory userUuid={user.uuid} />
        </div>
      </MobileLayout>
    );
  }

  // ── COINS CONFIRM ──
  if (step === "coins_confirm" && selectedTransfer) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={getBackAction()}>
        <div className="px-5 py-6 space-y-5">
          <div className="glass-card p-5 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
              <Coins className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-foreground">استلام الراتب ككوينز</h3>

            <div className="bg-muted/20 rounded-xl p-3 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">الحوالة</span>
              <span className="text-sm font-mono font-bold text-foreground">#{selectedTransfer.reference_id}</span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground">المبلغ</p>
              <p className="text-2xl font-black text-emerald-400" dir="ltr">${selectedTransfer.amount_usd}</p>
              <p className="text-sm font-bold text-amber-400">= {(selectedTransfer.amount_usd * USD_TO_COINS).toLocaleString()} كوينز</p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              سيتم تحويل المبلغ إلى كوينز وإضافتها لحسابك فوراً
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("transfers_list")} className="flex-1 h-12 border-border/30">
              <ArrowRight className="w-4 h-4 ml-1" /> رجوع
            </Button>
            <Button onClick={chargeCoins} disabled={chargingCoins}
              className="flex-1 gold-gradient text-primary-foreground font-bold h-12">
              {chargingCoins ? <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري الشحن...</> : "✅ تأكيد الشحن"}
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // ══════════════════════════════════════════
  // STEPPER FLOW (bank → account for cash)
  // ══════════════════════════════════════════

  const stepperLabels = ["الحوالة", "البنك", "التأكيد"];
  const stepperIndex = { bank: 1, account: 2 }[step] ?? 0;

  return (
    <MobileLayout showHeader headerTitle="سحب الراتب" onBack={getBackAction()}>
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

        {/* Selected transfer summary */}
        {selectedTransfer && (
          <div className="bg-muted/20 rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">الحوالة #{selectedTransfer.reference_id}</span>
            <span className="text-sm font-black text-emerald-400" dir="ltr">${selectedTransfer.amount_usd}</span>
          </div>
        )}

        {/* Error */}
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
                    const flag = COUNTRY_FLAGS[c.id] || "🏳️";
                    const isOpen = selectedCountry === c.id;
                    return (
                      <div key={c.id}>
                        <button
                          onClick={() => { setSelectedCountry(isOpen ? "" : c.id); setSelectedBank(""); setCustomBankName(""); }}
                          className={cn(
                            "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all",
                            isOpen ? "bg-white/[0.06] border-primary/30" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{flag}</span>
                            <span className="text-sm font-bold text-foreground">{c.name}</span>
                            {isOpen && <span className="text-[10px] text-muted-foreground">({c.banks.length} خيار)</span>}
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
                              <div className="grid grid-cols-2 gap-2 pt-2.5 pr-3">
                                {c.banks.map(b => {
                                  const bankStyle = BANK_ICONS[b.id] || { icon: "🏦", color: "from-white/5 to-white/[0.02] border-white/10" };
                                  const isSelected = selectedBank === b.id;
                                  return (
                                    <button key={b.id} onClick={() => { setSelectedBank(b.id); setCustomBankName(""); }}
                                      className={cn(
                                        "flex items-center gap-2.5 p-3 rounded-xl border transition-all text-right bg-gradient-to-br",
                                        isSelected ? "ring-2 ring-primary border-primary/50 scale-[0.98]" : `${bankStyle.color} hover:border-white/20 hover:scale-[1.01]`
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
                                    placeholder="اكتب اسم البنك أو الشبكة" className="bg-white/[0.03] border-white/10" dir="rtl" />
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
                <Button variant="outline" onClick={() => setStep("transfers_list")} className="flex-1 h-12 border-border/30">
                  <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                </Button>
                <Button onClick={() => setStep("account")} disabled={!canProceedBank}
                  className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                  متابعة <ArrowLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── ACCOUNT DETAILS + CONFIRM ── */}
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

              {/* Summary */}
              {canProceedAccount && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
                  <h3 className="text-sm font-bold text-foreground text-center">📋 ملخص الطلب</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">💰 المبلغ</span>
                      <span className="font-bold text-primary">${withdrawAmount}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">📋 الحوالة</span>
                      <span className="font-bold text-foreground">#{selectedTransfer?.reference_id}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">🏦 البنك</span>
                      <span className="font-bold text-foreground">{effectiveBankLabel} — {country?.name}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">👤 المستلم</span>
                      <span className="font-bold text-foreground">{recipientName}</span>
                    </div>
                    {accountNumber && (
                      <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                        <span className="text-muted-foreground">🔢 الحساب</span>
                        <span className="font-bold text-foreground" dir="ltr">{accountNumber}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("bank")} className="flex-1 h-12 border-border/30">
                  <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                </Button>
                <Button onClick={handleSubmit} disabled={!canProceedAccount || submitting}
                  className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "✅ تأكيد السحب"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileLayout>
  );
};

export default SalaryWithdraw;
