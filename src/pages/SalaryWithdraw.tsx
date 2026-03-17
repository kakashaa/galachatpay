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
import SalaryHistory from "@/components/SalaryHistory";
import SalaryRequestsHistory from "@/components/SalaryRequestsHistory";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = "https://galachat.site/project-z/api.php";

interface SalaryCheckAllResult {
  is_agency_owner: boolean;
  host_salary: { salary: number; deduction: number; net: number; has_salary: boolean; is_suspicious?: boolean; suspicious_amount?: number };
  agency_salary: { amount: number; agency_name: string; has_salary: boolean };
  withdrawals: { count: number; max: number; total_withdrawn: number; remaining_host: number; remaining_agency: number; can_withdraw: boolean };
  withdraw_open?: boolean;
}

interface VerifyResult {
  verified: boolean;
  transaction_id?: string;
  message?: string;
  amount_coins?: number;
  amount_usd?: number;
  transferred_usd?: number;
  approved_amount?: number;
  already_used?: boolean;
  reference_id?: string;
  wrong_amount?: boolean;
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
const USD_TO_COINS = 8500; // $1 = 8,500 coins

// Date helpers for cash withdrawal availability
const getCashWithdrawDates = () => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const canWithdrawCash = dayOfMonth >= lastDay - 2; // last 3 days: 29, 30, 31
  return { dayOfMonth, lastDay, canWithdrawCash, startDay: lastDay - 2 };
};

// Withdrawal limits
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
  const [allData, setAllData] = useState<SalaryCheckAllResult | null>(null);
  const [_noSalaryAtAll, setNoSalaryAtAll] = useState(false);

  // Flow state
  const [salaryType, setSalaryType] = useState<"host" | "agency" | null>(null);
  const [registeredSalary, setRegisteredSalary] = useState(0);
  const [enteredAmount, setEnteredAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [withdrawalMode, setWithdrawalMode] = useState<"cash" | "coins">("cash");
  const [cashWithdrawalsLeft, setCashWithdrawalsLeft] = useState(0);

  // Steps
  const [step, setStep] = useState<string>("loading");

  // Verification
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
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
    fetchAllSalaries();
  }, [user?.uuid]);

  const fetchAllSalaries = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}?action=salary_check_all&uuid=${user!.uuid}`);
      const data: SalaryCheckAllResult = await res.json();
      setAllData(data);

      const hasHost = data.host_salary?.has_salary;
      const hasAgency = data.agency_salary?.has_salary;

      if (!hasHost && !hasAgency) {
        setNoSalaryAtAll(true);
        setStep("no_salary");
      } else if (data.host_salary?.is_suspicious) {
        setStep("suspicious");
      } else if (data.is_agency_owner && hasHost && hasAgency) {
        // Check exhausted for agency (max 3)
        const { maxTotal } = getWithdrawalLimits(true);
        if (data.withdrawals.count >= maxTotal) {
          setStep("exhausted");
        } else {
          setStep("choose_type");
        }
      } else {
        // Regular host or agency owner with only one salary
        const type = hasHost ? "host" : "agency";
        const net = type === "host" ? data.host_salary.net : data.agency_salary.amount;
        const { maxCash, maxTotal } = getWithdrawalLimits(data.is_agency_owner);
        const count = data.withdrawals.count;

        if (count >= maxTotal) {
          setStep("exhausted");
          setAllData(data);
        } else {
          setSalaryType(type);
          setRegisteredSalary(net);
          const mode = count < maxCash ? "cash" : "coins";
          setWithdrawalMode(mode);
          setCashWithdrawalsLeft(Math.max(0, maxCash - count));
          setStep("enter_amount");
        }
      }
    } catch {
      setError("فشل الاتصال بالخادم");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const handleChooseSalaryType = (type: "host" | "agency") => {
    if (!allData) return;
    setSalaryType(type);
    const net = type === "host" ? allData.host_salary.net : allData.agency_salary.amount;
    setRegisteredSalary(net);
    const { maxCash } = getWithdrawalLimits(allData.is_agency_owner);
    const count = allData.withdrawals.count;
    const mode = count < maxCash ? "cash" : "coins";
    setWithdrawalMode(mode);
    setCashWithdrawalsLeft(Math.max(0, maxCash - count));
    setStep("enter_amount");
  };

  const handleAmountSubmit = () => {
    const amt = parseFloat(enteredAmount);
    if (isNaN(amt) || amt <= 0) {
      setAmountError("أدخل مبلغ صحيح");
      return;
    }
    if (Math.abs(amt - registeredSalary) > 0.01) {
      setAmountError(`المبلغ لا يتطابق مع الراتب المسجل ($${registeredSalary})`);
      return;
    }
    setAmountError("");

    if (withdrawalMode === "cash") {
      // Check date for cash withdrawals
      const { canWithdrawCash, startDay, lastDay } = getCashWithdrawDates();
      if (!canWithdrawCash) {
        setAmountError(`سحب الراتب النقدي متاح فقط من يوم ${startDay} إلى ${lastDay} من الشهر`);
        return;
      }
      setStep("transfer_instructions");
    } else {
      setStep("coins_instructions");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ!");
  };

  const handleTransferDone = async () => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`${API}?action=salary_verify_transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: user!.uuid, amount: registeredSalary }),
      });
      const data: VerifyResult = await res.json();
      setVerifyResult(data);
      if (data.already_used) {
        setStep("verify");
      } else if (data.verified) {
        toast.success("✅ تم التحقق من التحويل بنجاح!");
        if (withdrawalMode === "cash") {
          setStep("bank");
        } else {
          // Coins flow — auto-charge
          await chargeCoins(data.transaction_id || "");
        }
      } else if (data.wrong_amount && (data.transferred_usd || 0) >= registeredSalary) {
        // Transferred >= salary → accept with registered salary
        toast.success("✅ تم التحقق — سيتم احتساب الراتب المسجل فقط");
        if (withdrawalMode === "cash") {
          setStep("bank");
        } else {
          await chargeCoins(data.transaction_id || "");
        }
      } else {
        setStep("verify");
      }
    } catch {
      setError("فشل التحقق من التحويل");
      setStep("verify");
    } finally {
      setVerifying(false);
    }
  };

  const chargeCoins = async (refId: string) => {
    setChargingCoins(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "salary_charge_manual",
          admin_key: "ghala2026owner",
          uuid: user!.uuid,
          amount: registeredSalary,
          reference_id: refId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCoinsCharged(registeredSalary * USD_TO_COINS);
        setStep("coins_success");
      } else {
        setError(data.message || "فشل شحن الكوينز");
        setStep("verify");
      }
    } catch {
      setError("فشل الاتصال بالخادم");
      setStep("verify");
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
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: salaryType === "agency" ? "agency_salary_withdraw" : "salary_withdraw",
          uuid: user!.uuid,
          amount: registeredSalary,
          salary_type: salaryType || "host",
          country: selectedCountry,
          bank: isOtherBank ? customBankName : selectedBank,
          account_name: recipientName,
          account_number: accountNumber || "",
          whatsapp: `${whatsappCode}${whatsappNumber}`,
          notes,
          transfer_verified: verifyResult?.verified || false,
          reference_id: verifyResult?.transaction_id || null,
          transferred_usd: verifyResult?.transferred_usd || null,
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

  const getBackAction = () => {
    switch (step) {
      case "enter_amount": return salaryType && allData?.is_agency_owner ? () => setStep("choose_type") : () => navigate("/dashboard");
      case "transfer_instructions": return () => setStep("enter_amount");
      case "verify": return () => setStep("transfer_instructions");
      case "bank": return () => setStep(verifyResult?.verified ? "transfer_instructions" : "verify");
      case "account": return () => setStep("bank");
      case "coins_instructions": return () => setStep("enter_amount");
      default: return () => navigate("/dashboard");
    }
  };

  // ── LOADING ──
  if (loading || step === "loading") {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري التحقق من الراتب...</p>
        </div>
      </MobileLayout>
    );
  }

  // ── NO SALARY ──
  if (step === "no_salary") {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-5">
            <Frown className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-3">للأسف ليس لديك أي راتب</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">لم يتم العثور على راتب مستحق لحسابك هذا الشهر.</p>
          <div className="space-y-3 w-full max-w-xs">
            <Button onClick={() => navigate("/quick-support")} className="w-full gold-gradient text-primary-foreground font-bold h-12">تواصل مع الدعم</Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-12 border-border/30 font-bold">الرجوع</Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // ── EXHAUSTED ──
  if (step === "exhausted" && allData) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-8 space-y-6">
          <div className="flex flex-col items-center text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-5">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </motion.div>
            <h2 className="text-lg font-bold text-foreground mb-2">تم صرف راتبك بالكامل ✅</h2>
            <p className="text-xs text-muted-foreground">سحبت {allData.withdrawals.count} من {allData.withdrawals.max} هذا الشهر</p>
          </div>
          <SalaryRequestsHistory userUuid={user.uuid} />
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-12 border-border/30 font-bold">الرجوع</Button>
        </div>
      </MobileLayout>
    );
  }

  // ── CLOSED ──
  if (step === "closed") {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">⏰ السحب غير متاح حالياً</h2>
          <p className="text-sm text-muted-foreground mb-2">يفتح يوم {lastDay}/{now.getMonth() + 1}</p>
          <Button onClick={() => navigate("/dashboard")} className="gold-gradient text-primary-foreground font-bold px-8 mt-4">الرئيسية</Button>
        </div>
      </MobileLayout>
    );
  }

  // ── SUSPICIOUS ──
  if (step === "suspicious" && allData) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-16">
          <div className="max-w-md mx-auto rounded-2xl bg-rose-500/5 border border-rose-500/20 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-4">لا يمكن سحب الراتب</h2>
            <p className="text-base font-semibold text-foreground leading-8 mb-2">
              يوجد مبلغ <span className="text-destructive">${allData.host_salary.suspicious_amount || 0}</span> غير مدعوم
            </p>
            <p className="text-sm text-muted-foreground leading-7 mb-8">تواصل مع خدمة العملاء قبل السحب.</p>
            <div className="space-y-3">
              <Button onClick={() => navigate("/quick-support")} className="w-full gold-gradient text-primary-foreground font-bold h-12">تواصل مع خدمة العملاء</Button>
              <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-12 border-border/30 font-bold">الرجوع</Button>
            </div>
          </div>
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
          <Button onClick={() => { hasFetchedRef.current = false; fetchAllSalaries(); }} className="gold-gradient text-primary-foreground font-bold px-8">إعادة المحاولة</Button>
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
                <span className="font-bold text-foreground">${registeredSalary}</span>
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

  // ── CHOOSE TYPE (agency owner) ──
  if (step === "choose_type" && allData) {
    const hs = allData.host_salary;
    const as_ = allData.agency_salary;
    const w = allData.withdrawals;

    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground mb-1">اختر نوع الراتب</h2>
            <p className="text-xs text-muted-foreground">سحبت {w.count} من {w.max} هذا الشهر</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {w.count === 0 ? "المرة الأولى: سحب نقدي 💵" : "المرة الثانية: شحن كوينز 🪙"}
            </p>
          </div>

          {/* Agency card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onClick={() => as_.has_salary && handleChooseSalaryType("agency")}
            disabled={!as_.has_salary}
            className={cn(
              "w-full text-right glass-card rounded-2xl p-5 border transition-all space-y-3",
              as_.has_salary ? "border-amber-500/20 hover:border-amber-500/40 active:scale-[0.98]" : "border-border/10 opacity-60"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Landmark className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">راتب الوكالة{as_.agency_name ? ` — ${as_.agency_name}` : ""}</p>
                {!as_.has_salary ? (
                  <p className="text-[11px] text-muted-foreground">⛔ لا يوجد راتب وكالة</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">متاح للسحب</p>
                )}
              </div>
            </div>
            {as_.has_salary && (
              <div className="flex items-center justify-between bg-amber-500/5 rounded-xl p-3 border border-amber-500/10">
                <span className="text-xs text-muted-foreground">المبلغ المتاح</span>
                <span className="text-lg font-black text-amber-400" dir="ltr">${as_.amount.toFixed(2)}</span>
              </div>
            )}
          </motion.button>

          {/* Host card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            onClick={() => hs.has_salary && hs.net > 0 && handleChooseSalaryType("host")}
            disabled={!hs.has_salary || hs.net <= 0}
            className={cn(
              "w-full text-right glass-card rounded-2xl p-5 border transition-all space-y-3",
              hs.has_salary && hs.net > 0 ? "border-emerald-500/20 hover:border-emerald-500/40 active:scale-[0.98]" : "border-border/10 opacity-60"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <User className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">راتبي كمضيف</p>
                {hs.has_salary && hs.net > 0 ? (
                  <p className="text-[11px] text-muted-foreground">متاح: <span className="font-bold text-emerald-400" dir="ltr">${hs.net.toFixed(2)}</span></p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">⛔ لا يوجد راتب</p>
                )}
              </div>
            </div>
            {hs.has_salary && hs.net > 0 && (
              <div className="flex items-center justify-between bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                <span className="text-xs text-muted-foreground">الصافي</span>
                <span className="text-lg font-black text-emerald-400" dir="ltr">${hs.net.toFixed(2)}</span>
              </div>
            )}
          </motion.button>

          <SalaryRequestsHistory userUuid={user.uuid} />
        </div>
      </MobileLayout>
    );
  }

  // ══════════════════════════════════════════
  // STEPPER FLOW
  // ══════════════════════════════════════════

  const stepperLabels = withdrawalMode === "cash"
    ? ["المبلغ", "التحويل", "التحقق", "البنك", "التأكيد"]
    : ["المبلغ", "التحويل", "التحقق", "شحن"];

  const stepperIndex = {
    enter_amount: 0,
    transfer_instructions: 1,
    verify: 2,
    bank: 3,
    account: 4,
    coins_instructions: 1,
  }[step] ?? 0;

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

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── ENTER AMOUNT ── */}
          {step === "enter_amount" && (
            <motion.div key="enter_amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card p-5 space-y-4 text-center">
                <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" /> كم تريد سحب؟
                </h3>

                <div className="bg-muted/20 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">راتبك المسجل</span>
                  <span className="text-lg font-black text-emerald-400" dir="ltr">${registeredSalary.toFixed(2)}</span>
                </div>

                {withdrawalMode === "cash" ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                    <p className="text-xs text-blue-400 font-bold">💵 المرة الأولى — سحب نقدي</p>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-xs text-amber-400 font-bold">🪙 المرة الثانية — شحن كوينز</p>
                    <p className="text-[10px] text-muted-foreground mt-1">= {(registeredSalary * USD_TO_COINS).toLocaleString()} كوينز</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Input
                    type="number"
                    value={enteredAmount}
                    onChange={e => { setEnteredAmount(e.target.value); setAmountError(""); }}
                    placeholder="أدخل المبلغ بالدولار"
                    className="bg-muted/20 border-border/30 text-center text-xl font-bold h-14"
                    dir="ltr"
                  />
                  {amountError && (
                    <p className="text-xs text-destructive font-bold">{amountError}</p>
                  )}
                </div>

                <Button onClick={handleAmountSubmit} className="w-full gold-gradient text-primary-foreground font-bold h-12">
                  متابعة <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>

              <SalaryRequestsHistory userUuid={user.uuid} />
              <SalaryHistory userUuid={user.uuid} />
            </motion.div>
          )}

          {/* ── TRANSFER INSTRUCTIONS (1st withdrawal: cash) ── */}
          {step === "transfer_instructions" && (
            <motion.div key="transfer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground text-center">📋 خطوات التحويل</h3>
                <div className="space-y-3">
                  {[
                    "افتح تطبيق غلا لايف",
                    'اذهب إلى "تحويل الرصيد"',
                    null, // ID
                    null, // amount
                    'اضغط "تحويل"',
                    "ارجع هنا واضغط الزر أدناه",
                  ].map((text, i) => {
                    if (i === 2) {
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1 flex items-center justify-between bg-muted/30 rounded-xl p-3">
                            <span className="text-xs text-muted-foreground">أدخل الآيدي:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black text-primary font-mono">{TRANSFER_TARGET_ID}</span>
                              <button onClick={() => copyToClipboard(TRANSFER_TARGET_ID)} className="p-1.5 rounded-lg bg-primary/15 active:scale-90 transition-transform">
                                <Copy className="w-3.5 h-3.5 text-primary" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    if (i === 3) {
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                            <span className="text-xs text-muted-foreground">أدخل المبلغ:</span>
                            <span className="text-lg font-black text-emerald-400 font-mono">${registeredSalary}</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        <span className="text-xs text-foreground font-semibold">{text}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-[11px] text-amber-400 text-center leading-relaxed font-bold">
                    ⚠️ يجب تحويل المبلغ كاملاً — لا يمكن تحويل جزء من الراتب
                  </p>
                </div>
              </div>

              <Button onClick={handleTransferDone} disabled={verifying}
                className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base">
                {verifying ? (
                  <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري التحقق...</>
                ) : (
                  <>تم التحويل — متابعة <ArrowLeft className="w-4 h-4 mr-2" /></>
                )}
              </Button>
            </motion.div>
          )}

          {/* ── COINS INSTRUCTIONS (2nd withdrawal) ── */}
          {step === "coins_instructions" && (
            <motion.div key="coins_instr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card p-5 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
                  <Coins className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-base font-bold text-foreground">استلام الراتب ككوينز</h3>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">راتبك المتبقي</p>
                  <p className="text-2xl font-black text-emerald-400" dir="ltr">${registeredSalary}</p>
                  <p className="text-sm font-bold text-amber-400">= {(registeredSalary * USD_TO_COINS).toLocaleString()} كوينز</p>
                </div>

                <div className="text-right space-y-3">
                  <p className="text-xs font-bold text-foreground">الخطوات:</p>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <span className="text-xs text-foreground">حوّل <span className="font-bold text-emerald-400">${registeredSalary}</span> من تحويل الرصيد → UUID <span className="font-bold text-primary">{TRANSFER_TARGET_ID}</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <span className="text-xs text-foreground">ارجع هنا واضغط "تم التحويل"</span>
                  </div>
                </div>
              </div>

              <Button onClick={handleTransferDone} disabled={verifying || chargingCoins}
                className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base">
                {verifying || chargingCoins ? (
                  <><Loader2 className="w-5 h-5 animate-spin ml-2" /> {chargingCoins ? "جاري الشحن..." : "جاري التحقق..."}</>
                ) : (
                  <>تم التحويل <ArrowLeft className="w-4 h-4 mr-2" /></>
                )}
              </Button>
            </motion.div>
          )}

          {/* ── VERIFY (failed states) ── */}
          {step === "verify" && (
            <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* already_used */}
              {verifyResult?.already_used && (
                <div className="glass-card p-6 space-y-5 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}
                    className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
                    <ShieldX className="w-10 h-10 text-destructive" />
                  </motion.div>
                  <h2 className="text-lg font-bold text-foreground">الرقم المرجعي مستخدم من قبل</h2>
                  {(verifyResult.reference_id || verifyResult.transaction_id) && (
                    <div className="rounded-xl bg-muted/30 border border-border/20 p-4 space-y-1">
                      <p className="text-[10px] text-muted-foreground">الرقم المرجعي</p>
                      <p className="text-xl font-black text-foreground font-mono">{verifyResult.reference_id || verifyResult.transaction_id}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم.</p>
                  <div className="space-y-3 pt-2">
                    <Button onClick={() => navigate("/quick-support")} className="w-full gold-gradient text-primary-foreground font-bold h-12">تواصل مع الدعم</Button>
                    <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-12 border-border/30 font-bold">الرجوع</Button>
                  </div>
                </div>
              )}

              {/* wrong_amount */}
              {!verifyResult?.already_used && verifyResult?.wrong_amount && (
                <div className="glass-card p-5 space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-sm font-bold text-foreground">المبلغ المحوّل مختلف عن الراتب</p>
                    <div className="flex items-center justify-center gap-3 text-sm">
                      <span className="text-muted-foreground">المحوّل: <span className="font-bold text-amber-400" dir="ltr">${verifyResult.transferred_usd || 0}</span></span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground">الراتب: <span className="font-bold text-emerald-400" dir="ltr">${registeredSalary}</span></span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground">📎 رفع إيصال التحويل</p>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScreenshot} />
                    {screenshotPreview ? (
                      <div className="relative">
                        <img src={screenshotPreview} alt="receipt" className="w-full max-h-48 object-contain rounded-xl border border-border/20" />
                        <button onClick={() => { setScreenshotBase64(""); setScreenshotPreview(""); }}
                          className="absolute top-2 left-2 p-1.5 rounded-full bg-destructive/80 text-white">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => fileInputRef.current?.click()}
                        className="w-full p-6 border-2 border-dashed border-border/30 rounded-xl flex flex-col items-center gap-2 hover:bg-muted/10 transition-colors">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">اضغط لرفع صورة الإيصال</span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("transfer_instructions")} className="flex-1 h-12 border-border/30">
                      <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                    </Button>
                    <Button onClick={() => setStep("bank")} disabled={!screenshotBase64}
                      className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                      متابعة <ArrowLeft className="w-4 h-4 mr-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* normal failure — not found */}
              {!verifyResult?.already_used && !verifyResult?.wrong_amount && (
                <div className="glass-card p-5 space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                    <p className="text-xs text-amber-400 font-bold">⚠️ لم نجد التحويل</p>
                    <p className="text-[10px] text-muted-foreground">تأكد إنك حوّلت المبلغ كاملاً ثم أعد المحاولة، أو ارفع إيصال</p>
                  </div>

                  <Button variant="outline" onClick={handleTransferDone} disabled={verifying}
                    className="w-full h-11 border-primary/30 text-primary font-bold">
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <RefreshCw className="w-4 h-4 ml-2" />}
                    إعادة المحاولة
                  </Button>

                  {withdrawalMode === "cash" && (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-foreground">📎 أو ارفع إيصال التحويل</p>
                        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScreenshot} />
                        {screenshotPreview ? (
                          <div className="relative">
                            <img src={screenshotPreview} alt="receipt" className="w-full max-h-48 object-contain rounded-xl border border-border/20" />
                            <button onClick={() => { setScreenshotBase64(""); setScreenshotPreview(""); }}
                              className="absolute top-2 left-2 p-1.5 rounded-full bg-destructive/80 text-white">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => fileInputRef.current?.click()}
                            className="w-full p-6 border-2 border-dashed border-border/30 rounded-xl flex flex-col items-center gap-2 hover:bg-muted/10 transition-colors">
                            <Camera className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">اضغط لرفع صورة الإيصال</span>
                          </button>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep("transfer_instructions")} className="flex-1 h-12 border-border/30">
                          <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                        </Button>
                        <Button onClick={() => setStep("bank")} disabled={!screenshotBase64}
                          className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                          متابعة بدون تحقق <ArrowLeft className="w-4 h-4 mr-1" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

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
                <Button variant="outline" onClick={() => setStep(verifyResult?.verified ? "transfer_instructions" : "verify")} className="flex-1 h-12 border-border/30">
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
                      <span className="font-bold text-primary">${registeredSalary}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">🔍 التحقق</span>
                      <span className={`font-bold ${verifyResult?.verified ? "text-emerald-400" : "text-amber-400"}`}>
                        {verifyResult?.verified ? "✅ تم" : "📎 إيصال مرفق"}
                      </span>
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
