import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, User, AlertCircle, Check, Camera, X, Wallet, Loader2, Landmark } from "lucide-react";
import { motion } from "framer-motion";
import { useAgentAuth } from "@/hooks/use-agent-auth";
import { toast } from "sonner";

import { COINS_PER_DOLLAR } from "@/lib/constants";
import { cn } from "@/lib/utils";

const AGENT_API = "https://galachat.site/project-z/api.php";
const COINS_PER_USD = COINS_PER_DOLLAR;

const AGENT_PAYMENT_METHODS = [
  { id: "rajhi", label: "بنك الراجحي", country: "السعودية", color: "from-emerald-600/20 to-emerald-700/10 border-emerald-500/20" },
  { id: "sa_other", label: "حوالة أخرى", country: "السعودية", color: "from-emerald-500/10 to-emerald-600/10 border-emerald-400/20" },
  { id: "jeeppay", label: "جيب (JeepPay)", country: "اليمن", color: "from-blue-600/20 to-blue-700/10 border-blue-500/20" },
  { id: "kuraimi", label: "كريمي", country: "اليمن", color: "from-blue-500/20 to-blue-600/10 border-blue-400/20" },
  { id: "ye_other", label: "حوالة أخرى", country: "اليمن", color: "from-blue-400/10 to-blue-500/10 border-blue-300/20" },
  { id: "cashapp", label: "Cash App", country: "أمريكا", color: "from-green-600/20 to-green-700/10 border-green-500/20" },
  { id: "zelle", label: "Zelle", country: "أمريكا", color: "from-violet-600/20 to-violet-700/10 border-violet-500/20" },
  { id: "agent", label: "حساب الوكيل", country: "الفلوس عندي", color: "from-gray-600/20 to-gray-700/10 border-gray-500/20" },
];

const COUNTRY_GROUPS = [
  { name: "السعودية", ids: ["rajhi", "sa_other"] },
  { name: "اليمن", ids: ["jeeppay", "kuraimi", "ye_other"] },
  { name: "أمريكا", ids: ["cashapp", "zelle"] },
];

const AgentCharge: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAgentAuth();
  const [step, setStep] = useState(1);

  // Step 1
  const [uuid, setUuid] = useState("");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [coins, setCoins] = useState("");

  // Step 2
  const [selectedPayment, setSelectedPayment] = useState("");
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);

  // Step 3
  const [receiptImage, setReceiptImage] = useState<string>("");
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Step 4
  const [confirmAmount, setConfirmAmount] = useState("");
  const [charging, setCharging] = useState(false);
  const [chargeResult, setChargeResult] = useState<{ success: boolean; message: string; transaction_id?: string; new_balance?: number } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const usdAmount = coins ? (parseInt(coins) / COINS_PER_USD) : 0;

  // Lookup user
  const lookupUser = useCallback(async () => {
    if (!uuid.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    setUserName("");
    setUserAvatar("");
    try {
      const res = await fetch(`${AGENT_API}?action=agent_lookup_user&token=${token}&uuid=${uuid.trim()}`);
      const data = await res.json();
      if (data.success) {
        setUserName(data.name || "");
        setUserAvatar(data.avatar || "");
      } else {
        setLookupError("المستخدم غير موجود");
      }
    } catch {
      setLookupError("خطأ في البحث");
    }
    setLookupLoading(false);
  }, [uuid, token]);

  // Handle receipt image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptImage(result);
      setReceiptPreview(result);
    };
    reader.readAsDataURL(file);
  };

  // Submit charge
  const handleCharge = async () => {
    setCharging(true);
    try {
      const res = await fetch(`${AGENT_API}?action=agent_charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          uuid: uuid.trim(),
          coins: parseInt(coins),
          payment_method: selectedPayment,
          payment_country: AGENT_PAYMENT_METHODS.find(p => p.id === selectedPayment)?.country || "other",
          receipt_confirmed: receiptConfirmed,
          receipt_image: receiptImage || null,
          notes: notes || null,
          confirm_amount: parseFloat(confirmAmount),
        }),
      });
      const data = await res.json();
      setChargeResult({ success: data.success, message: data.message || (data.success ? "تم الشحن بنجاح" : "فشل الشحن"), transaction_id: data.transaction_id, new_balance: data.new_balance });
      if (data.success) {
        setCooldown(60);
      }
    } catch {
      setChargeResult({ success: false, message: "خطأ في الاتصال" });
    }
    setCharging(false);
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const canProceedStep1 = userName && coins && parseInt(coins) > 0;
  const canProceedStep2 = selectedPayment && receiptConfirmed;
  const canProceedStep3 = selectedPayment === "agent" || receiptImage;
  const amountMatch = confirmAmount && Math.abs(parseFloat(confirmAmount) - usdAmount) < 0.01;

  // Result screen
  if (chargeResult) {
    return (
      <div className="mobile-container flex flex-col items-center justify-center px-6 bg-background">
        <div className="text-center space-y-4 w-full max-w-sm">
          {chargeResult.success ? (
            <>
              {/* Animated success icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/30"
              >
                <motion.div
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <Check className="w-12 h-12 text-green-400" />
                </motion.div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <h2 className="text-xl font-black text-green-400">تم الشحن بنجاح! ✅</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  تم شحن <span className="font-bold text-foreground">{parseInt(coins).toLocaleString()}</span> كوينز لـ <span className="font-bold text-foreground">{userName}</span>
                </p>
              </motion.div>

              {/* Transaction details card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-card rounded-2xl p-4 border border-green-500/20 space-y-2 text-sm"
                dir="rtl"
              >
                {chargeResult.transaction_id && (
                  <div className="flex justify-between"><span className="text-muted-foreground">رقم العملية</span><span className="font-mono text-xs" dir="ltr">{chargeResult.transaction_id}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">المبلغ</span><span className="font-bold text-amber-400" dir="ltr">${usdAmount.toFixed(2)}</span></div>
                {chargeResult.new_balance !== undefined && (
                  <div className="flex justify-between"><span className="text-muted-foreground">الرصيد المتبقي</span><span className="font-mono font-bold">{chargeResult.new_balance.toLocaleString()} كوينز</span></div>
                )}
              </motion.div>

              {/* Countdown */}
              {cooldown > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-amber-500/30 flex items-center justify-center">
                    <span className="text-2xl font-black text-amber-400">{cooldown}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">ثانية قبل الشحن التالي</p>
                </motion.div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { if (cooldown > 0) { toast.info(`انتظر ${cooldown} ثانية`); return; } setChargeResult(null); setStep(1); setUuid(""); setUserName(""); setCoins(""); setSelectedPayment(""); setReceiptConfirmed(false); setReceiptImage(""); setReceiptPreview(""); setNotes(""); setConfirmAmount(""); }}
                  disabled={cooldown > 0}
                  className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold disabled:opacity-40 transition-opacity"
                >
                  {cooldown > 0 ? `شحن جديد (${cooldown})` : "شحن جديد"}
                </button>
                <button onClick={() => navigate("/agent")} className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-foreground font-bold">
                  الرئيسية
                </button>
              </div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center mx-auto border-2 border-destructive/30"
              >
                <X className="w-12 h-12 text-destructive" />
              </motion.div>
              <h2 className="text-xl font-black text-destructive">فشل الشحن ❌</h2>
              <p className="text-muted-foreground">{chargeResult.message}</p>
              <button onClick={() => setChargeResult(null)} className="h-12 px-8 rounded-2xl bg-white/5 border border-white/10 text-foreground font-bold mt-4">
                حاول مرة أخرى
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container text-foreground overflow-y-auto bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-6 pb-4">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate("/agent")} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <h1 className="text-base font-black text-amber-400">شحن جديد</h1>
        <div className="w-8" />
      </header>

      {/* Progress */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${s <= step ? "bg-amber-500" : "bg-white/10"}`} />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {["المستخدم", "الدفع", "الإيصال", "التأكيد"].map((label, i) => (
            <span key={i} className={`text-[9px] font-bold ${i + 1 <= step ? "text-amber-400" : "text-muted-foreground"}`}>{label}</span>
          ))}
        </div>
      </div>

      <div className="px-4 pb-8">
        {/* Step 1: User */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><User className="w-5 h-5" /></div>
              <input
                type="text"
                inputMode="numeric"
                value={uuid}
                onChange={(e) => setUuid(e.target.value.replace(/\D/g, ""))}
                onBlur={lookupUser}
                placeholder="UUID المستخدم"
                dir="ltr"
                className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500/50 outline-none text-right"
              />
            </div>
            {lookupLoading && <p className="text-sm text-muted-foreground text-center">جاري البحث...</p>}
            {lookupError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-2xl">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{lookupError}</p>
              </div>
            )}
            {userName && (
              <div className="glass-card rounded-2xl p-3 flex items-center gap-3 border border-green-500/20">
                {userAvatar ? (
                  <img src={userAvatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"><User className="w-5 h-5 text-amber-400" /></div>
                )}
                <div>
                  <p className="text-sm font-bold text-foreground">{userName}</p>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">UUID: {uuid}</p>
                </div>
                <Check className="w-5 h-5 text-green-400 mr-auto" />
              </div>
            )}

            <div className="relative">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Wallet className="w-5 h-5" /></div>
              <input
                type="text"
                inputMode="numeric"
                value={coins}
                onChange={(e) => setCoins(e.target.value.replace(/\D/g, ""))}
                placeholder="كمية الكوينز"
                dir="ltr"
                className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500/50 outline-none text-right"
              />
            </div>
            {coins && parseInt(coins) > 0 && (
              <p className="text-sm text-amber-400 text-center font-bold" dir="ltr">= ${usdAmount.toFixed(2)}</p>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              التالي <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-foreground text-right mb-2">وين وصلت الفلوس؟</h2>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPayment(pm.id)}
                  className={`glass-card rounded-2xl p-4 text-center transition-all active:scale-95 ${
                    selectedPayment === pm.id ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30" : "border-white/10"
                  }`}
                >
                  <Landmark className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{pm.label}</p>
                  <p className="text-[10px] text-muted-foreground">{pm.country}</p>
                  {selectedPayment === pm.id && <Check className="w-4 h-4 text-amber-400 mx-auto mt-1" />}
                </button>
              ))}
            </div>

            {selectedPayment && (
              <div className="glass-card rounded-2xl p-4 border border-amber-500/20">
                <p className="text-sm font-bold text-foreground text-right mb-3">هل تم تأكيد استلام التحويل؟</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setReceiptConfirmed(true)}
                    className={`flex-1 h-12 rounded-xl font-bold transition-all ${receiptConfirmed ? "bg-green-500/20 border border-green-500/40 text-green-400" : "bg-white/5 border border-white/10 text-muted-foreground"}`}
                  >
                    ✅ نعم
                  </button>
                  <button
                    onClick={() => setReceiptConfirmed(false)}
                    className={`flex-1 h-12 rounded-xl font-bold transition-all ${!receiptConfirmed && selectedPayment ? "bg-destructive/10 border border-destructive/30 text-destructive" : "bg-white/5 border border-white/10 text-muted-foreground"}`}
                  >
                    ❌ لا
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              التالي <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 3: Receipt */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-foreground text-right">ارفع صورة إيصال التحويل</h2>
            {selectedPayment === "agent" && <p className="text-xs text-muted-foreground text-right">الإيصال اختياري لحساب الوكيل</p>}

            {receiptPreview ? (
              <div className="relative">
                <img src={receiptPreview} className="w-full max-h-64 object-contain rounded-2xl border border-white/10" alt="إيصال" />
                <button onClick={() => { setReceiptImage(""); setReceiptPreview(""); }} className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer border-dashed border-2 border-white/20 hover:border-amber-500/40 transition-colors">
                <Camera className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">اضغط لرفع صورة الإيصال</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات (اختياري)"
              rows={3}
              className="w-full rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground p-4 focus:ring-2 focus:ring-amber-500/50 outline-none text-right resize-none"
            />

            <button
              onClick={() => setStep(4)}
              disabled={!canProceedStep3 && selectedPayment !== "agent"}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              التالي <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-amber-500/30">
              <div className="text-center mb-3">
                <p className="text-sm font-bold text-amber-400">⚠️ تأكيد عملية الشحن</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">👤 المستخدم</span><span className="font-bold text-foreground">{userName} ({uuid})</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">💰 الكوينز</span><span className="font-bold text-foreground" dir="ltr">{parseInt(coins).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">💵 المبلغ</span><span className="font-bold text-amber-400" dir="ltr">${usdAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">🏦 الدفع</span><span className="font-bold text-foreground">{paymentMethods.find(p => p.id === selectedPayment)?.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">📎 الإيصال</span><span className="font-bold">{receiptImage ? "✅ مرفق" : "❌ غير مرفق"}</span></div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-foreground text-right mb-2">أعد إدخال المبلغ بالدولار</p>
              <input
                type="text"
                inputMode="decimal"
                value={confirmAmount}
                onChange={(e) => setConfirmAmount(e.target.value)}
                placeholder={`$${usdAmount.toFixed(2)}`}
                dir="ltr"
                className={`w-full h-14 px-4 rounded-2xl bg-white/5 border text-foreground placeholder:text-muted-foreground focus:ring-2 outline-none text-center text-lg font-bold ${
                  confirmAmount && !amountMatch ? "border-destructive focus:ring-destructive/50" : "border-white/10 focus:ring-amber-500/50"
                }`}
              />
              {confirmAmount && !amountMatch && (
                <p className="text-xs text-destructive text-center mt-1">المبلغ غير متطابق</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-muted-foreground font-bold">
                إلغاء
              </button>
              <button
                onClick={handleCharge}
                disabled={!amountMatch || charging}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {charging ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> تأكيد الشحن</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentCharge;
