import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, User, Crown, Send, CheckCircle, Info, ArrowDownToLine,
  Clock, Zap, AlertCircle, Globe, CreditCard, UserCheck,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { countries, isValidERC20Address, type CountryConfig, type PaymentMethod } from "@/data/salaryCountries";

const userTypeLabels: Record<number, string> = {
  0: "مستخدم عادي", 1: "مستخدم عادي", 2: "مضيف",
  3: "وكيل مضيفين", 4: "وكيل شحن", 5: "وكيل شحن ومضيفين", 6: "مضيف ووكيل شحن",
};

type Step = "select" | "transfer" | "details" | "confirm";

const SalaryWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [withdrawType, setWithdrawType] = useState("");
  const [step, setStep] = useState<Step>("select");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // API confirmed data
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);

  // Details form
  const [fullName, setFullName] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [accountInfo, setAccountInfo] = useState("");

  if (!user) {
    navigate("/");
    return null;
  }

  const availableBalance = user.my_store.coins;
  const monthlyLimit = 10000;
  const instantLimit = 5000;
  const agencyId = "10000";
  const _withdrawAmount = withdrawType === "monthly" ? monthlyLimit : instantLimit;

  const selectedCountry: CountryConfig | undefined = countries.find((c) => c.id === selectedCountryId);
  const selectedMethod: PaymentMethod | undefined = selectedCountry?.methods.find((m) => m.id === selectedMethodId);

  const handleProceedToTransfer = () => {
    if (!withdrawType) return;
    setStep("transfer");
  };

  const handleConfirmTransfer = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("gala-salary", {
        body: { uuid: user.uuid },
      });

      console.log("gala-salary response:", data);

      if (fnError) {
        setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
        setLoading(false);
        return;
      }

      if (!data?.success) {
        setError("لم يتم العثور على تحويل. رجاءً أولاً قم بتحويل المبلغ الذي تريد استلامه إلى آيدي 10000 في تطبيق غلا لايف، ثم ارجع وحاول مرة أخرى.");
        setLoading(false);
        return;
      }

      // Extract amount and date from API response (check nested data too)
      const responseData = data.data || data;
      const amount = responseData.amount ?? responseData.coins ?? responseData.total ?? 0;
      const date = responseData.date ?? responseData.created_at ?? responseData.timestamp ?? new Date().toISOString().split("T")[0];
      
      setConfirmedAmount(amount);
      setConfirmedDate(typeof date === 'string' ? date.split("T")[0] : date);
      setStep("details");
    } catch {
      setError("حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  const isNameValid = fullName.trim().split(/\s+/).length >= 4;

  const isAccountValid = (): boolean => {
    if (!selectedMethod) return false;
    if (!accountInfo.trim()) return false;
    if (selectedMethod.requiresWallet) {
      return isValidERC20Address(accountInfo);
    }
    return accountInfo.trim().length >= 4;
  };

  const canSubmitDetails = isNameValid && selectedCountryId && selectedMethodId && isAccountValid();

  const handleProceedToConfirm = () => {
    if (!canSubmitDetails) return;
    setStep("confirm");
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  // ── SUCCESS SCREEN ──
  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }} className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
            <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال طلب السحب بنجاح</h2>
            <p className="text-sm text-muted-foreground">سيتم معالجة طلبك وإشعارك بالنتيجة</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Button onClick={() => navigate("/dashboard")} className="mt-8 gold-gradient text-primary-foreground font-bold">العودة للرئيسية</Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="سحب الراتب" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        {/* User Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> معلومات الحساب
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">ID</span>
              <span className="font-bold text-foreground" dir="ltr">{user.uuid}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">المستوى</span>
              <span className="font-bold text-foreground">{Math.max(user.level.receiver_level, user.level.sender_level)}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">النوع</span>
              <span className="font-bold text-foreground">{userTypeLabels[user.type_user] || "مستخدم"}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">الرصيد</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <Crown className="w-3 h-3" /> {availableBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الرصيد المتاح</p>
                <p className="text-xl font-bold text-foreground">{availableBalance.toLocaleString()}</p>
              </div>
            </div>
            <ArrowDownToLine className="w-5 h-5 text-primary" />
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* ── STEP 1: Select Withdraw Type ── */}
        {step === "select" && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> نوع السحب
              </h3>
              <RadioGroup value={withdrawType} onValueChange={setWithdrawType} className="space-y-2">
                <Label htmlFor="monthly" className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${withdrawType === "monthly" ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:bg-muted/40"}`}>
                  <RadioGroupItem value="monthly" id="monthly" />
                  <div className={`p-2 rounded-lg ${withdrawType === "monthly" ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">سحب شهري</p>
                    <p className="text-[11px] text-muted-foreground">الحد: {monthlyLimit.toLocaleString()}</p>
                  </div>
                </Label>
                <Label htmlFor="instant" className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${withdrawType === "instant" ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:bg-muted/40"}`}>
                  <RadioGroupItem value="instant" id="instant" />
                  <div className={`p-2 rounded-lg ${withdrawType === "instant" ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">سحب فوري</p>
                    <p className="text-[11px] text-muted-foreground">الحد: {instantLimit.toLocaleString()}</p>
                  </div>
                </Label>
              </RadioGroup>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Button onClick={handleProceedToTransfer} disabled={!withdrawType} className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base disabled:opacity-40">
                متابعة
              </Button>
            </motion.div>
          </>
        )}

        {/* ── STEP 2: Transfer Instructions ── */}
        {step === "transfer" && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> تعليمات التحويل
              </h3>
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">رقم حساب الوكالة</span>
                  <span className="text-lg font-bold text-foreground" dir="ltr">{agencyId}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-accent/50 border border-accent/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p>قم بتحويل المبلغ الذي تريد استلامه إلى حساب الوكالة رقم <span className="font-bold text-foreground" dir="ltr">{agencyId}</span> في تطبيق غلا لايف</p>
                  <p>بعد إتمام التحويل، اضغط "تأكيد التحويل" وسيتم جلب المبلغ والتاريخ تلقائياً</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("select"); setError(""); }} className="flex-1 h-12 border-border/30">رجوع</Button>
              <Button onClick={handleConfirmTransfer} disabled={loading} className="flex-1 gold-gradient text-primary-foreground font-bold h-12">
                {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "تأكيد التحويل"}
              </Button>
            </motion.div>
          </>
        )}

        {/* ── STEP 3: Details Form ── */}
        {step === "details" && (
          <>
            {/* Confirmed Amount */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-xl">
                <CheckCircle className="w-4 h-4 text-success shrink-0" />
                <p className="text-xs text-success">تم التحقق من التحويل بنجاح</p>
              </div>
              <div className="flex justify-between items-center bg-primary/5 rounded-xl p-3">
                <span className="text-xs text-muted-foreground">المبلغ المؤكد</span>
                <span className="text-lg font-bold text-primary">{(confirmedAmount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-primary/5 rounded-xl p-3">
                <span className="text-xs text-muted-foreground">تاريخ التحويل</span>
                <span className="text-sm font-bold text-foreground">{confirmedDate || "اليوم"}</span>
              </div>
              <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
                <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">المبلغ والتاريخ مؤكدان من النظام ولا يمكن تعديلهما</p>
              </div>
            </motion.div>

            {/* Full Name */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" /> الاسم الرباعي
              </h3>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم الأول - الأب - الجد - العائلة"
                className="text-right bg-muted/20 border-border/30"
                dir="rtl"
              />
              {fullName && !isNameValid && (
                <p className="text-[11px] text-destructive">يرجى إدخال الاسم الرباعي كاملاً (4 كلمات على الأقل)</p>
              )}
            </motion.div>

            {/* Country */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> الدولة
              </h3>
              <Select
                value={selectedCountryId}
                onValueChange={(v) => {
                  setSelectedCountryId(v);
                  setSelectedMethodId("");
                  setAccountInfo("");
                }}
              >
                <SelectTrigger className="bg-muted/20 border-border/30 text-right">
                  <SelectValue placeholder="اختر الدولة" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Payment Method */}
            {selectedCountry && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> طريقة الدفع
                </h3>
                <Select
                  value={selectedMethodId}
                  onValueChange={(v) => {
                    setSelectedMethodId(v);
                    setAccountInfo("");
                  }}
                >
                  <SelectTrigger className="bg-muted/20 border-border/30 text-right">
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCountry.methods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Account / Wallet Input */}
                {selectedMethod && (
                  <div className="space-y-2">
                    <Input
                      value={accountInfo}
                      onChange={(e) => setAccountInfo(e.target.value)}
                      placeholder={selectedMethod.placeholder || "أدخل معلومات الحساب"}
                      className="bg-muted/20 border-border/30"
                      dir={selectedMethod.requiresWallet ? "ltr" : "rtl"}
                    />
                    {selectedMethod.requiresWallet && accountInfo && !isValidERC20Address(accountInfo) && (
                      <p className="text-[11px] text-destructive">عنوان المحفظة غير صحيح. يجب أن يبدأ بـ 0x ويتكون من 42 حرف</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("transfer"); setError(""); }} className="flex-1 h-12 border-border/30">رجوع</Button>
              <Button onClick={handleProceedToConfirm} disabled={!canSubmitDetails} className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                متابعة
              </Button>
            </motion.div>
          </>
        )}

        {/* ── STEP 4: Confirm & Submit ── */}
        {step === "confirm" && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground">ملخص الطلب</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                  <span className="text-muted-foreground">نوع السحب</span>
                  <span className="font-bold text-foreground">{withdrawType === "monthly" ? "شهري" : "فوري"}</span>
                </div>
                <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                  <span className="text-muted-foreground">المبلغ المؤكد</span>
                  <span className="font-bold text-primary">{(confirmedAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                  <span className="text-muted-foreground">تاريخ التحويل</span>
                  <span className="font-bold text-foreground">{confirmedDate || "اليوم"}</span>
                </div>
                <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                  <span className="text-muted-foreground">الاسم الرباعي</span>
                  <span className="font-bold text-foreground">{fullName}</span>
                </div>
                <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                  <span className="text-muted-foreground">الدولة</span>
                  <span className="font-bold text-foreground">{selectedCountry?.flag} {selectedCountry?.name}</span>
                </div>
                <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                  <span className="text-muted-foreground">طريقة الدفع</span>
                  <span className="font-bold text-foreground">{selectedMethod?.label}</span>
                </div>
                <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                  <span className="text-muted-foreground">معلومات الحساب</span>
                  <span className="font-bold text-foreground" dir="ltr">{accountInfo}</span>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1 h-12 border-border/30">رجوع</Button>
              <Button onClick={handleSubmit} className="flex-1 gold-gradient text-primary-foreground font-bold h-12">
                <Send className="w-5 h-5 ml-2" /> إرسال الطلب
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default SalaryWithdraw;
