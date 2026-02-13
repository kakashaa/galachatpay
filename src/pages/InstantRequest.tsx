import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User, Zap, CheckCircle, AlertCircle,
  Globe, CreditCard, UserCheck, Send, Wallet, Upload, X,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { countries, isValidERC20Address, type CountryConfig, type PaymentMethod } from "@/data/salaryCountries";

const COINS_PER_DOLLAR = 8500;

type Step = "supporter" | "verify" | "details" | "confirm";

const InstantRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("supporter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Supporter info
  const [supporterName, setSupporterName] = useState("");
  const [supporterAccountId, setSupporterAccountId] = useState("");
  const [supporterAmountUsd, setSupporterAmountUsd] = useState("");

  // Receipt upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transfer verification
  const [transferAmount, setTransferAmount] = useState("");
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);

  // Recipient details
  const [fullName, setFullName] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [accountInfo, setAccountInfo] = useState("");

  if (!user) {
    navigate("/");
    return null;
  }

  const selectedCountry: CountryConfig | undefined = countries.find((c) => c.id === selectedCountryId);
  const selectedMethod: PaymentMethod | undefined = selectedCountry?.methods.find((m) => m.id === selectedMethodId);
  const coinsAmount = supporterAmountUsd ? Math.round(parseFloat(supporterAmountUsd) * COINS_PER_DOLLAR) : 0;
  const isNameValid = fullName.trim().length >= 2;
  const isAccountValid = (): boolean => {
    if (!selectedMethod || !accountInfo.trim()) return false;
    if (selectedMethod.requiresWallet) return isValidERC20Address(accountInfo);
    return accountInfo.trim().length >= 4;
  };

  const canProceedSupporter = supporterName.trim() && supporterAccountId.trim() && supporterAmountUsd && Number(supporterAmountUsd) > 0 && receiptFile;
  const canSubmitDetails = isNameValid && selectedCountryId && selectedMethodId && isAccountValid();

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return null;
    setUploadingReceipt(true);
    try {
      const ext = receiptFile.name.split(".").pop();
      const path = `receipts/${user.uuid}/${Date.now()}.${ext}`;
      const { secureUpload } = await import("@/utils/secureUpload");
      return await secureUpload({
        file: receiptFile,
        bucket: "attachments",
        path,
        userUuid: user.uuid,
      });
    } catch {
      return null;
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleExitAttempt = () => {
    if (step !== "supporter" || supporterName || supporterAccountId || supporterAmountUsd || receiptFile) {
      setShowExitDialog(true);
    } else {
      navigate("/instant/banks");
    }
  };

  const handleVerifyTransfer = async () => {
    if (!transferAmount || Number(transferAmount) <= 0) {
      setError("يرجى إدخال المبلغ الذي حوّلته");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("gala-salary", {
        body: { uuid: user.uuid, amount: Number(transferAmount) },
      });
      if (fnError) {
        setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
        setLoading(false);
        return;
      }
      if (!data?.success) {
        setError("لم يتم العثور على تحويل. حوّل المبلغ إلى آيدي 10000 في غلا لايف ثم حاول مرة أخرى.");
        setLoading(false);
        return;
      }
      const responseData = data.data || data;
      const amount = responseData.amount ?? responseData.coins ?? 0;
      const date = responseData.date ?? responseData.created_at ?? new Date().toISOString().split("T")[0];
      setConfirmedAmount(amount);
      setConfirmedDate(typeof date === "string" ? date.split("T")[0] : date);
      setStep("details");
    } catch {
      setError("حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const receiptUrl = await uploadReceipt();
      const { data: insertedData, error: insertError } = await supabase.from("salary_requests").insert({
        user_uuid: user.uuid,
        user_name: user.name,
        user_phone: user.phone,
        request_type: "instant",
        amount_usd: Number(transferAmount),
        amount_coins: confirmedAmount,
        recipient_name: fullName,
        recipient_country: `${selectedCountry?.flag} ${selectedCountry?.name}`,
        payment_method: selectedMethod?.label || "",
        payment_details: accountInfo,
        status: "pending",
        transfer_image_url: receiptUrl,
      }).select("id").single();
      if (insertError) {
        setError("حدث خطأ في حفظ الطلب.");
        setLoading(false);
        return;
      }
      const refId = ((insertedData as any)?.id as string)?.slice(0, 8)?.toUpperCase() || "";
      setRequestId(refId);
      setSubmitted(true);
    } catch {
      setError("حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="السحب الفوري" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }} className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
            <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال طلب السحب الفوري بنجاح ⚡</h2>
            <p className="text-sm text-muted-foreground">سيتم معالجة طلبك والتواصل معك قريباً</p>
            {requestId && (
              <div className="mt-4 rounded-xl p-3 bg-muted/30 border border-border/20">
                <p className="text-[10px] text-muted-foreground mb-1">رقم المرجع</p>
                <p className="text-lg font-black text-primary font-mono tracking-wider">#{requestId}</p>
                <p className="text-[10px] text-muted-foreground mt-1">احتفظ بهذا الرقم لمتابعة طلبك</p>
              </div>
            )}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-3 mt-8">
            <Button onClick={() => navigate("/my-requests")} variant="outline" className="flex-1 border-border/30 font-bold">طلباتي</Button>
            <Button onClick={() => navigate("/dashboard")} className="flex-1 gold-gradient text-primary-foreground font-bold">الرئيسية</Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  // Progress bar
  const stepIndex = { supporter: 0, verify: 1, details: 2, confirm: 3 };

  return (
    <MobileLayout showHeader headerTitle="طلب سحب فوري ⚡" onBack={handleExitAttempt}>
      <div className="px-5 py-4 space-y-5">
        {/* Progress */}
        <div className="flex gap-1.5">
          {["الداعم", "التحقق", "البيانات", "التأكيد"].map((label, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1 transition-all ${stepIndex[step] >= i ? "gold-gradient" : "bg-muted/30"}`} />
              <span className={`text-[10px] ${stepIndex[step] >= i ? "text-primary font-bold" : "text-muted-foreground"}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* STEP 1: Supporter Info */}
        {step === "supporter" && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> معلومات الداعم
              </h3>
              <Input value={supporterName} onChange={(e) => setSupporterName(e.target.value)} placeholder="اسم الداعم" className="bg-muted/20 border-border/30 text-right" dir="rtl" />
              <Input type="text" inputMode="numeric" value={supporterAccountId} onChange={(e) => setSupporterAccountId(e.target.value.replace(/\D/g, ""))} placeholder="آيدي الداعم في غلا لايف" className="bg-muted/20 border-border/30 text-right" dir="rtl" />
              <div className="space-y-1">
                <Input type="number" inputMode="decimal" value={supporterAmountUsd} onChange={(e) => setSupporterAmountUsd(e.target.value)} placeholder="المبلغ بالدولار الذي حوّله الداعم" className="bg-muted/20 border-border/30 text-right" dir="rtl" min="1" />
                {coinsAmount > 0 && (
                  <div className="flex justify-between items-center bg-primary/5 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground">الكوينزات المطلوبة:</span>
                    <span className="text-xs font-bold text-primary">{coinsAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Receipt Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">إيصال التحويل للبنك</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReceiptSelect} className="hidden" />
                {receiptPreview ? (
                  <div className="relative">
                    <img src={receiptPreview} alt="إيصال" className="w-full max-h-48 object-contain rounded-xl border border-border/30" />
                    <button onClick={removeReceipt} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-destructive/80 flex items-center justify-center">
                      <X className="w-4 h-4 text-destructive-foreground" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border/40 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">اضغط لرفع صورة الإيصال</span>
                  </button>
                )}
              </div>
            </motion.div>
            <Button onClick={() => { setStep("verify"); setError(""); }} disabled={!canProceedSupporter} className="w-full gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
              متابعة
            </Button>
          </>
        )}

        {/* STEP 2: Verify Transfer */}
        {step === "verify" && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> تأكيد التحويل
              </h3>
              <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">رقم حساب الوكالة</span>
                  <span className="text-lg font-bold text-foreground" dir="ltr">10000</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">المبلغ الذي حوّلته (بالدولار)</label>
                <Input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="أدخل المبلغ" className="bg-muted/20 border-border/30 text-right" dir="rtl" min="1" />
              </div>
              <div className="flex items-start gap-2 p-3 bg-accent/50 border border-accent/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p>١. حوّل الكوينزات إلى وكالة <span className="font-bold text-foreground" dir="ltr">10000</span> في غلا لايف</p>
                  <p>٢. أدخل المبلغ بالدولار في الحقل أعلاه</p>
                  <p>٣. اضغط "تأكيد التحويل" للتحقق</p>
                </div>
              </div>
            </motion.div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("supporter"); setError(""); }} className="flex-1 h-12 border-border/30">رجوع</Button>
              <Button onClick={handleVerifyTransfer} disabled={loading || !transferAmount} className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "تأكيد التحويل"}
              </Button>
            </div>
          </>
        )}

        {/* STEP 3: Recipient Details */}
        {step === "details" && (
          <>
            {/* Verified */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-emerald-400">تم التحقق من التحويل بنجاح</p>
              </div>
              <div className="flex justify-between items-center bg-primary/5 rounded-xl p-3">
                <span className="text-xs text-muted-foreground">المبلغ المؤكد</span>
                <span className="text-lg font-bold text-primary">{(confirmedAmount ?? 0).toLocaleString()}</span>
              </div>
            </motion.div>

            {/* Full Name */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" /> اسم المستلم
              </h3>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="أدخل اسم المستلم" className="text-right bg-muted/20 border-border/30" dir="rtl" />
              {fullName && !isNameValid && <p className="text-[11px] text-destructive">يرجى إدخال اسم المستلم</p>}
            </motion.div>

            {/* Country */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> الدولة
              </h3>
              <Select value={selectedCountryId} onValueChange={(v) => { setSelectedCountryId(v); setSelectedMethodId(""); setAccountInfo(""); }}>
                <SelectTrigger className="bg-muted/20 border-border/30 text-right"><SelectValue placeholder="اختر الدولة" /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2"><span>{c.flag}</span><span>{c.name}</span></span>
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
                <Select value={selectedMethodId} onValueChange={(v) => { setSelectedMethodId(v); setAccountInfo(""); }}>
                  <SelectTrigger className="bg-muted/20 border-border/30 text-right"><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
                  <SelectContent>
                    {selectedCountry.methods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMethod && (
                  <div className="space-y-2">
                    <Input value={accountInfo} onChange={(e) => setAccountInfo(e.target.value)} placeholder={selectedMethod.placeholder || "أدخل معلومات الحساب"} className="bg-muted/20 border-border/30" dir={selectedMethod.requiresWallet ? "ltr" : "rtl"} />
                    {selectedMethod.requiresWallet && accountInfo && !isValidERC20Address(accountInfo) && (
                      <p className="text-[11px] text-destructive">عنوان المحفظة غير صحيح (يبدأ بـ 0x وبطول 42 حرف)</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("verify")} className="flex-1 h-12 border-border/30">رجوع</Button>
              <Button onClick={() => setStep("confirm")} disabled={!canSubmitDetails} className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                متابعة
              </Button>
            </div>
          </>
        )}

        {/* STEP 4: Confirm */}
        {step === "confirm" && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> ملخص الطلب
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: "نوع السحب", value: "فوري ⚡" },
                  { label: "اسم الداعم", value: supporterName },
                  { label: "آيدي الداعم", value: supporterAccountId },
                  { label: "مبلغ الداعم", value: `$${supporterAmountUsd}` },
                  { label: "المبلغ المؤكد (كوينز)", value: (confirmedAmount ?? 0).toLocaleString() },
                  { label: "تاريخ التحويل", value: confirmedDate || "اليوم" },
                  { label: "اسم المستلم", value: fullName },
                  { label: "الدولة", value: `${selectedCountry?.flag} ${selectedCountry?.name}` },
                  { label: "طريقة الدفع", value: selectedMethod?.label || "" },
                  { label: "معلومات الحساب", value: accountInfo },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-bold text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1 h-12 border-border/30">رجوع</Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40">
                {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Send className="w-5 h-5 ml-2" /> إرسال الطلب</>}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="max-w-[90%] rounded-2xl bg-background border-border/30">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">هل متأكد من الخروج؟</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-sm">
              سيتم فقدان جميع البيانات التي أدخلتها في طلب السحب الحالي
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setShowExitDialog(false)} className="flex-1 h-11 border-border/30 font-bold">لا، متابعة</Button>
            <Button onClick={() => { setShowExitDialog(false); navigate("/instant/banks"); }} className="flex-1 h-11 bg-destructive text-destructive-foreground font-bold">نعم، خروج</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default InstantRequest;
