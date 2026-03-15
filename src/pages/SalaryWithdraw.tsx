import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, AlertCircle, Globe, CreditCard,
  UserCheck, DollarSign, ArrowRight, ArrowLeft, ShieldAlert, Phone,
  Loader2, Ban, Clock, Copy, Camera,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import ServicePreviousRequests from "@/components/ServicePreviousRequests";
import SalaryHistory from "@/components/SalaryHistory";
import { toast } from "sonner";

const API = "https://galachat.site/project-z/api.php";

interface SalaryCheckResult {
  success: boolean;
  has_salary: boolean;
  reason?: string;
  salary?: number;
  deduction?: number;
  net?: number;
  is_suspicious?: boolean;
  suspicious_amount?: number;
  user_type?: "host" | "agent";
  withdrawals_this_month?: number;
  max_withdrawals?: number;
  withdraw_open?: boolean;
}

interface VerifyResult {
  verified: boolean;
  transaction_id?: string;
  message?: string;
}

interface CountryOption {
  id: string;
  flag: string;
  name: string;
  banks: { id: string; label: string }[];
}

const COUNTRIES: CountryOption[] = [
  {
    id: "sa", flag: "🇸🇦", name: "السعودية",
    banks: [
      { id: "rajhi", label: "بنك الراجحي" },
      { id: "ahli", label: "بنك الأهلي" },
      { id: "stcpay", label: "stc pay" },
      { id: "sa_other", label: "أخرى" },
    ],
  },
  {
    id: "ye", flag: "🇾🇪", name: "اليمن",
    banks: [
      { id: "jeeppay", label: "جيب (JeepPay)" },
      { id: "kuraimi", label: "كريمي" },
      { id: "ye_cash", label: "كاش (يدوي)" },
      { id: "ye_other", label: "أخرى" },
    ],
  },
  {
    id: "us", flag: "🇺🇸", name: "أمريكا",
    banks: [
      { id: "zelle", label: "Zelle" },
      { id: "cashapp", label: "Cash App" },
      { id: "us_other", label: "أخرى" },
    ],
  },
  {
    id: "other", flag: "🌍", name: "أخرى",
    banks: [
      { id: "other_bank", label: "تحويل بنكي" },
      { id: "other_wallet", label: "محفظة إلكترونية" },
    ],
  },
];

const countryCodes = [
  { code: "+967", flag: "🇾🇪" }, { code: "+966", flag: "🇸🇦" },
  { code: "+1", flag: "🇺🇸" }, { code: "+20", flag: "🇪🇬" },
  { code: "+213", flag: "🇩🇿" }, { code: "+212", flag: "🇲🇦" },
  { code: "+962", flag: "🇯🇴" }, { code: "+90", flag: "🇹🇷" },
  { code: "+91", flag: "🇮🇳" }, { code: "+92", flag: "🇵🇰" },
  { code: "+880", flag: "🇧🇩" },
];

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const TRANSFER_TARGET_ID = "10000";

const SalaryWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(true);
  const [checkResult, setCheckResult] = useState<SalaryCheckResult | null>(null);
  const [error, setError] = useState("");

  // Step 2: Transfer verification
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string>("");
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Country & Bank
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("");

  // Step 4: Account details
  const [recipientName, setRecipientName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [whatsappCode, setWhatsappCode] = useState("+967");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Step 5: result
  const [submitResult, setSubmitResult] = useState<{ success: boolean; request_id?: string; message?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("gala_session_key") || "";

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    checkSalary();
  }, [user]);

  const checkSalary = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}?action=salary_check&token=${token}&uuid=${user!.uuid}`);
      const data = await res.json();
      setCheckResult(data);
      if (data.success && data.has_salary && !data.is_suspicious && data.withdraw_open !== false &&
          (data.withdrawals_this_month || 0) < (data.max_withdrawals || 1)) {
        setStep(1);
      }
    } catch {
      setError("فشل الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ!");
  };

  const handleVerifyTransfer = async () => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`${API}?action=salary_verify_transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: user!.uuid, amount: checkResult?.net || 0 }),
      });
      const data: VerifyResult = await res.json();
      setVerifyResult(data);
    } catch {
      setError("فشل التحقق من التحويل");
    } finally {
      setVerifying(false);
    }
  };

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة كبير (الحد 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setScreenshotBase64(result);
      setScreenshotPreview(result);
    };
    reader.readAsDataURL(file);
  };

  // Can proceed from step 2 (verify)
  const canProceedStep2 = verifyResult?.verified || screenshotBase64;

  if (!user) return null;

  const country = COUNTRIES.find(c => c.id === selectedCountry);
  const bank = country?.banks.find(b => b.id === selectedBank);

  const canProceedStep3 = selectedCountry && selectedBank;
  const canProceedStep4 = recipientName.trim().length >= 2 && accountNumber.trim().length >= 4 && whatsappNumber.trim().length >= 6;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "salary_withdraw",
          token,
          uuid: user.uuid,
          amount: checkResult?.net || 0,
          country: selectedCountry,
          bank: selectedBank,
          account_name: recipientName,
          account_number: accountNumber,
          whatsapp: `${whatsappCode}${whatsappNumber}`,
          notes,
          transfer_verified: verifyResult?.verified || false,
          screenshot: screenshotBase64 || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult(data);
        setStep(5);
      } else {
        setError(data.message || data.error || "فشل في رفع الطلب");
      }
    } catch {
      setError("فشل الاتصال. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── STEP 0: Loading ──
  if (loading) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري التحقق من الراتب...</p>
        </div>
      </MobileLayout>
    );
  }

  // No salary
  if (checkResult && !checkResult.has_salary) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">لا يوجد راتب</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {checkResult.reason === "not_in_agency" ? "أنت لست مسجل في وكالة" : "ليس لديك راتب هذا الشهر"}
          </p>
          <Button onClick={() => navigate("/dashboard")} className="gold-gradient text-primary-foreground font-bold px-8">الرئيسية</Button>
        </div>
      </MobileLayout>
    );
  }

  // Suspicious
  if (checkResult?.is_suspicious) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-16">
          <div className="max-w-md mx-auto rounded-2xl bg-rose-500/5 border border-rose-500/20 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>

            <h2 className="text-2xl font-black text-foreground mb-4">لا يمكن سحب الراتب</h2>

            <p className="text-base font-semibold text-foreground leading-8 mb-2">
              يوجد مبلغ <span className="text-destructive">${checkResult.suspicious_amount || 0}</span> غير مدعوم مضاف
              لراتبك بشكل يدوي.
            </p>
            <p className="text-sm text-muted-foreground leading-7 mb-8">
              هذا المبلغ يحتاج مراجعة من خدمة العملاء قبل السحب.
              <br />
              يرجى التواصل مع الدعم الفني لحل هذه المشكلة.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => navigate("/quick-support")}
                className="w-full gold-gradient text-primary-foreground font-bold h-12"
              >
                تواصل مع خدمة العملاء
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="w-full h-12 border-border/30 font-bold"
              >
                الرجوع
              </Button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Withdrawals exhausted
  if (checkResult && (checkResult.withdrawals_this_month || 0) >= (checkResult.max_withdrawals || 1)) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
            <Ban className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">تم استنفاد محاولات السحب</h2>
          <p className="text-sm text-muted-foreground mb-2">المسموح: {checkResult.max_withdrawals} مرة/شهر</p>
          <Button onClick={() => navigate("/dashboard")} className="gold-gradient text-primary-foreground font-bold px-8 mt-4">الرئيسية</Button>
        </div>
      </MobileLayout>
    );
  }

  // Withdraw not open
  if (checkResult && checkResult.withdraw_open === false) {
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

  // Connection error
  if (error && !checkResult) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={checkSalary} className="gold-gradient text-primary-foreground font-bold px-8">إعادة المحاولة</Button>
        </div>
      </MobileLayout>
    );
  }

  // ── SUCCESS (Step 5) ──
  if (step === 5 && submitResult) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center w-full">
            <h2 className="text-lg font-bold text-foreground mb-2">✅ تم رفع طلب سحب الراتب!</h2>
            {submitResult.request_id && (
              <div className="mt-4 rounded-xl p-4 bg-muted/30 border border-border/20 space-y-2">
                <p className="text-[10px] text-muted-foreground">رقم الطلب</p>
                <p className="text-xl font-black text-primary font-mono tracking-wider">{submitResult.request_id}</p>
              </div>
            )}
            <div className="mt-4 rounded-xl p-4 bg-muted/30 border border-border/20 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">المبلغ</span>
                <span className="font-bold text-foreground">${checkResult?.net}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">التحقق من التحويل</span>
                <span className={`font-bold ${verifyResult?.verified ? "text-emerald-400" : "text-amber-400"}`}>
                  {verifyResult?.verified ? "✅ تم التحقق" : "📎 مرفق إيصال"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">الحالة</span>
                <span className="font-bold text-amber-400">⏳ قيد المراجعة</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              ستصلك رسالة على واتساب عند الموافقة
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-3 mt-8 w-full">
            <Button onClick={() => navigate("/my-requests")} variant="outline" className="flex-1 border-border/30 font-bold">طلباتي</Button>
            <Button onClick={() => navigate("/dashboard")} className="flex-1 gold-gradient text-primary-foreground font-bold">الرئيسية</Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  // ── STEPPER PROGRESS ──
  const stepLabels = ["الراتب", "التحويل", "التحقق", "البنك", "التأكيد"];
  const currentBack = () => {
    if (step <= 1) navigate("/dashboard");
    else setStep((step - 1) as Step);
  };

  return (
    <MobileLayout showHeader headerTitle="سحب الراتب" onBack={currentBack}>
      <div className="px-5 py-4 space-y-5">
        {/* Stepper */}
        {step >= 1 && step <= 4 && (
          <div className="flex items-center gap-1 px-2">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-1 w-full rounded-full transition-colors ${i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-muted/30"}`} />
                <span className={`text-[9px] ${i <= step ? "text-primary font-bold" : "text-muted-foreground"}`}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && step > 0 && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Salary History & Previous Requests on Step 1 */}
        {step === 1 && <SalaryHistory userUuid={user.uuid} />}
        {step === 1 && <ServicePreviousRequests userUuid={user.uuid} serviceType="salary" />}

        <AnimatePresence mode="wait">
          {/* ── STEP 1: Display Salary + Transfer Instructions ── */}
          {step === 1 && checkResult && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card p-5 space-y-4 text-center">
                <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" /> 💰 راتبك الشهري
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-muted/20 rounded-xl p-3">
                    <span className="text-xs text-muted-foreground">الراتب الكامل</span>
                    <span className="text-lg font-bold text-foreground">${checkResult.salary}</span>
                  </div>
                  <div className="flex justify-between items-center bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                    <span className="text-xs text-red-400">المبلغ المقتطع</span>
                    <span className="text-lg font-bold text-red-400">-${checkResult.deduction}</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <span className="text-sm font-bold text-emerald-400">الصافي المتاح</span>
                    <span className="text-2xl font-black text-emerald-400">${checkResult.net}</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-2">
                  <span>نوع حسابك: {checkResult.user_type === "agent" ? "وكيل" : "مستضيف"}</span>
                  <span>السحب المتبقي: {(checkResult.max_withdrawals || 1) - (checkResult.withdrawals_this_month || 0)} من {checkResult.max_withdrawals || 1}</span>
                </div>
              </div>

              {/* Transfer Instructions */}
              <div className="glass-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground text-center">📋 خطوات سحب الراتب</h3>
                <div className="space-y-3">
                  {[
                    "افتح تطبيق غلا لايف",
                    'اذهب إلى "تحويل الرصيد"',
                    null, // special: ID row
                    null, // special: amount row
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
                              <button onClick={() => copyToClipboard(TRANSFER_TARGET_ID)}
                                className="p-1.5 rounded-lg bg-primary/15 active:scale-90 transition-transform">
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
                            <span className="text-lg font-black text-emerald-400 font-mono">${checkResult.net}</span>
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

              <Button onClick={() => setStep(2)} className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base">
                تم التحويل — متابعة <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </motion.div>
          )}

          {/* ── STEP 2: Verify Transfer + Screenshot ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground text-center">🔍 التحقق من التحويل</h3>

                {!verifyResult && (
                  <div className="text-center space-y-3">
                    <p className="text-xs text-muted-foreground">سنتحقق تلقائياً من وصول التحويل</p>
                    <Button onClick={handleVerifyTransfer} disabled={verifying}
                      className="w-full gold-gradient text-primary-foreground font-bold h-11">
                      {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "تحقق الآن"}
                    </Button>
                  </div>
                )}

                {verifyResult?.verified && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-sm font-bold text-emerald-400">تم التحقق بنجاح ✅</p>
                    {verifyResult.transaction_id && (
                      <p className="text-[10px] text-muted-foreground font-mono">رقم المعاملة: {verifyResult.transaction_id}</p>
                    )}
                  </div>
                )}

                {verifyResult && !verifyResult.verified && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                      <p className="text-xs text-amber-400 font-bold">⚠️ لم نجد التحويل تلقائياً</p>
                      <p className="text-[10px] text-muted-foreground mt-1">يرجى رفع صورة إيصال التحويل (screenshot)</p>
                    </div>
                  </div>
                )}

                {/* Screenshot upload — mandatory if not verified, optional if verified */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">
                    {verifyResult?.verified ? "📎 رفع إيصال (اختياري)" : "📎 رفع إيصال التحويل *"}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleScreenshot}
                  />
                  {screenshotPreview ? (
                    <div className="relative">
                      <img src={screenshotPreview} alt="receipt" className="w-full max-h-48 object-contain rounded-xl border border-border/20" />
                      <button onClick={() => { setScreenshotBase64(""); setScreenshotPreview(""); }}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-destructive/80 text-white">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full p-6 border-2 border-dashed border-border/30 rounded-xl flex flex-col items-center gap-2 hover:bg-muted/10 transition-colors">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">اضغط لرفع صورة الإيصال</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 border-border/30">
                  <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2}
                  className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                  متابعة <ArrowLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Country & Bank ── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> وين تبي نحوّل لك؟
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {COUNTRIES.map(c => (
                    <button key={c.id} onClick={() => { setSelectedCountry(c.id); setSelectedBank(""); }}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedCountry === c.id ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:bg-muted/30"
                      }`}>
                      <span className="text-2xl block mb-1">{c.flag}</span>
                      <span className="text-xs font-bold text-foreground">{c.name}</span>
                    </button>
                  ))}
                </div>
                {selectedCountry && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <p className="text-xs font-bold text-foreground">اختر البنك / المحفظة:</p>
                    {country?.banks.map(b => (
                      <button key={b.id} onClick={() => setSelectedBank(b.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          selectedBank === b.id ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:bg-muted/30"
                        }`}>
                        <CreditCard className={`w-4 h-4 ${selectedBank === b.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm font-bold text-foreground">{b.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 border-border/30">
                  <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                </Button>
                <Button onClick={() => setStep(4)} disabled={!canProceedStep3}
                  className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                  متابعة <ArrowLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Account Details + Confirm ── */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" /> معلومات الحساب
                </h3>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">اسم المستلم *</label>
                  <Input value={recipientName} onChange={e => setRecipientName(e.target.value)}
                    placeholder="الاسم الكامل كما في الحساب البنكي"
                    className="bg-muted/20 border-border/30" dir="rtl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">رقم الحساب / المحفظة *</label>
                  <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                    placeholder="أدخل رقم الحساب أو المحفظة"
                    className="bg-muted/20 border-border/30" dir="ltr" />
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
                      placeholder="رقم الواتساب" type="tel"
                      className="bg-muted/20 border-border/30 flex-1" dir="ltr" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">ملاحظات (اختياري)</label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية..."
                    className="bg-muted/20 border-border/30 min-h-[60px]" dir="rtl" />
                </div>
              </div>

              {/* Summary */}
              {canProceedStep4 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
                  <h3 className="text-sm font-bold text-foreground text-center">📋 ملخص الطلب</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">💰 المبلغ</span>
                      <span className="font-bold text-primary">${checkResult?.net}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">🔍 التحقق</span>
                      <span className={`font-bold ${verifyResult?.verified ? "text-emerald-400" : "text-amber-400"}`}>
                        {verifyResult?.verified ? "✅ تم" : "📎 إيصال مرفق"}
                      </span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">🏦 البنك</span>
                      <span className="font-bold text-foreground">{bank?.label} — {country?.name} {country?.flag}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">👤 المستلم</span>
                      <span className="font-bold text-foreground">{recipientName}</span>
                    </div>
                    <div className="flex justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-muted-foreground">🔢 الحساب</span>
                      <span className="font-bold text-foreground" dir="ltr">{accountNumber}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-12 border-border/30">
                  <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                </Button>
                <Button onClick={handleSubmit} disabled={!canProceedStep4 || submitting}
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
