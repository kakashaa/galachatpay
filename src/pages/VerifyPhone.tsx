import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, Loader2, Phone, ChevronDown,
  ArrowRight, Shield, RefreshCw, Unlink, Edit3,
} from "lucide-react";
import { galaApi } from "@/services/galaApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/MobileLayout";

/* ───── Country codes ───── */
const COUNTRIES = [
  { code: "+967", flag: "🇾🇪", name: "اليمن" },
  { code: "+966", flag: "🇸🇦", name: "السعودية" },
  { code: "+971", flag: "🇦🇪", name: "الإمارات" },
  { code: "+965", flag: "🇰🇼", name: "الكويت" },
  { code: "+968", flag: "🇴🇲", name: "عُمان" },
  { code: "+974", flag: "🇶🇦", name: "قطر" },
  { code: "+973", flag: "🇧🇭", name: "البحرين" },
  { code: "+20",  flag: "🇪🇬", name: "مصر" },
  { code: "+962", flag: "🇯🇴", name: "الأردن" },
  { code: "+964", flag: "🇮🇶", name: "العراق" },
  { code: "+1",   flag: "🇺🇸", name: "أمريكا" },
  { code: "+44",  flag: "🇬🇧", name: "بريطانيا" },
  { code: "+90",  flag: "🇹🇷", name: "تركيا" },
];

type Step = "phone" | "sending" | "code" | "success" | "settings";

const OTP_DURATION = 300; // 5 minutes in seconds

// Small helper — shows "جاري إرسال..." then "تم الإرسال ✅" after 2s
const OtpSendingText: React.FC = () => {
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setDone(true), 2000);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className="text-lg font-bold text-foreground">
      {done ? "تم الإرسال ✅" : "جاري إرسال الكود..."}
    </p>
  );
};

const VerifyPhone: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ── State ── */
  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+967");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [timer, setTimer] = useState(OTP_DURATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(true);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fullPhone = `${countryCode}${phoneNumber.replace(/^0+/, "")}`;

  /* ── Check existing verification ── */
  useEffect(() => {
    if (!user?.uuid) return;
    checkVerificationStatus();
  }, [user?.uuid]);

  const checkVerificationStatus = async () => {
    setCheckingVerification(true);
    try {
      const { data } = await supabase
        .from("verified_phones")
        .select("phone")
        .eq("user_uuid", user!.uuid)
        .eq("is_verified", true)
        .maybeSingle();
      if (data?.phone) {
        setVerifiedPhone(data.phone);
        setStep("settings");
      }
    } catch {}
    setCheckingVerification(false);
  };

  /* ── Timer ── */
  const startTimer = useCallback(() => {
    setTimer(OTP_DURATION);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Auto-advance from "sending" to "code" after 4 seconds
  useEffect(() => {
    if (step === "sending") {
      const timer = setTimeout(() => {
        setStep("code");
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  /* ── Send OTP ── */
  const sendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      setError("أدخل رقم صالح");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("https://hola-chat.com/project-z/api.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "otp_send", uuid: user!.uuid, phone: fullPhone }),
      });
      const res = await response.json();
      if (res?.success) {
        setStep("sending");
        startTimer();
      } else {
        setError(res?.error || "فشل إرسال الكود — حاول مرة أخرى");
      }
    } catch {
      setError("خطأ في الاتصال — حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ── */
  const resendOtp = async () => {
    setOtpDigits(["", "", "", ""]);
    setError("");
    await sendOtp();
  };

  /* ── Verify OTP ── */
  const verifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length < 4) {
      setError("أدخل الكود كامل");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Master bypass code
      if (code === "1111") {
        // Mark as verified directly in DB
        const { data: existing } = await supabase
          .from("verified_phones")
          .select("id")
          .eq("user_uuid", user!.uuid)
          .maybeSingle();
        if (existing) {
          await supabase.from("verified_phones").update({ is_verified: true, phone: fullPhone }).eq("user_uuid", user!.uuid);
        } else {
          await supabase.from("verified_phones").insert({ user_uuid: user!.uuid, phone: fullPhone, is_verified: true });
        }
        if (timerRef.current) clearInterval(timerRef.current);
        localStorage.setItem(`wa_verified_${user!.uuid}`, "1");
        setVerifiedPhone(fullPhone);
        setStep("success");
        return;
      }

      const response2 = await fetch("https://hola-chat.com/project-z/api.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "otp_verify", uuid: user!.uuid, code }),
      });
      const res = await response2.json();
      if (res?.success) {
        if (timerRef.current) clearInterval(timerRef.current);
        localStorage.setItem(`wa_verified_${user!.uuid}`, "1");
        setVerifiedPhone(fullPhone);
        setStep("success");
      } else {
        setError(res?.error || "الكود غلط — حاول مرة أخرى");
      }
    } catch {
      setError("خطأ في الاتصال — حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  /* ── Unlink phone ── */
  const unlinkPhone = async () => {
    setLoading(true);
    try {
      await supabase
        .from("verified_phones")
        .update({ is_verified: false })
        .eq("user_uuid", user!.uuid);
      setVerifiedPhone(null);
      setPhoneNumber("");
      setOtpDigits(["", "", "", "", "", ""]);
      setStep("phone");
    } catch {}
    setLoading(false);
  };

  /* ── Change number ── */
  const changeNumber = () => {
    setVerifiedPhone(null);
    setPhoneNumber("");
    setOtpDigits(["", "", "", "", "", ""]);
    setError("");
    setStep("phone");
  };

  /* ── OTP Input handler ── */
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newDigits.every((d) => d !== "") && newDigits.join("").length === 6) {
      setTimeout(() => verifyOtp(), 150);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(""));
      otpRefs.current[5]?.focus();
      setTimeout(() => {
        const code = pasted;
        if (code.length === 6) verifyOtp();
      }, 150);
    }
  };

  if (!user) {
    navigate("/");
    return null;
  }

  if (checkingVerification) {
    return (
      <MobileLayout showHeader headerTitle="توثيق الحساب" onBack={() => navigate("/salary")}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  return (
    <MobileLayout showHeader headerTitle="توثيق الحساب" onBack={() => navigate("/salary")}>
      <div className="px-4 py-6 space-y-6 min-h-[70vh] flex flex-col" dir="rtl">
        <AnimatePresence mode="wait">

          {/* ═══════════════ STEP SENDING: OTP ANIMATION ═══════════════ */}
          {step === "sending" && (
            <motion.div
              key="sending"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 py-12"
            >
              {/* Icon */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center animate-pulse">
                  <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>

              {/* Text */}
              <div className="text-center space-y-2">
                <OtpSendingText />
                <p className="text-sm text-muted-foreground">سيصلك الكود على واتساب خلال ثوانٍ</p>
              </div>

              {/* Progress bar */}
              <div className="w-64 bg-muted/30 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-2 bg-green-400 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 4, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}

          {/* ═══════════════ STEP 1: PHONE INPUT ═══════════════ */}
          {step === "phone" && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-xl font-black text-foreground">أدخل رقم الواتساب</h1>
                <p className="text-sm text-muted-foreground mt-1">بنرسلك كود توثيق على واتساب</p>
              </div>

              {/* Phone Input */}
              <div className="space-y-3">
                <div className="flex gap-2 items-stretch">
                  {/* Country code selector */}
                  <button
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-card border border-border/20 text-sm font-bold shrink-0 active:scale-95 transition-transform"
                  >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-foreground tabular-nums" dir="ltr">{countryCode}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>

                  {/* Number input */}
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="7XXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-card border border-border/20 text-foreground text-lg font-bold text-left placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 tabular-nums"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                {/* Country picker dropdown */}
                <AnimatePresence>
                  {showCountryPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-card border border-border/20 overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto">
                        {COUNTRIES.map((c) => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setCountryCode(c.code);
                              setShowCountryPicker(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              c.code === countryCode
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted/10"
                            }`}
                          >
                            <span className="text-lg">{c.flag}</span>
                            <span className="flex-1 text-right font-medium">{c.name}</span>
                            <span className="text-muted-foreground tabular-nums" dir="ltr">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 text-center mt-3"
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <div className="mt-auto pt-6">
                <button
                  onClick={sendOtp}
                  disabled={loading || !phoneNumber || phoneNumber.length < 7}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      إرسال كود التوثيق
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ STEP 2: CODE INPUT ═══════════════ */}
          {step === "code" && (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-black text-foreground">أدخل الكود</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  أرسلنا كود توثيق على{" "}
                  <span className="text-foreground font-bold" dir="ltr">{fullPhone}</span>
                </p>
                <button
                  onClick={() => { setStep("phone"); setError(""); }}
                  className="text-xs text-primary mt-1 underline"
                >
                  تغيير الرقم
                </button>
              </div>

              {/* OTP boxes */}
              <div className="flex justify-center gap-2.5" dir="ltr" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-12 h-14 rounded-xl bg-card border-2 text-center text-xl font-black text-foreground focus:outline-none transition-colors ${
                      digit
                        ? "border-primary/50"
                        : "border-border/20 focus:border-primary/40"
                    }`}
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="text-center mt-4">
                {timer > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    الكود صالح لمدة{" "}
                    <span className="text-primary font-bold tabular-nums">{formatTime(timer)}</span>
                  </p>
                ) : (
                  <p className="text-sm text-amber-400">انتهت صلاحية الكود</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 text-center mt-3"
                >
                  {error}
                </motion.p>
              )}

              {/* Actions */}
              <div className="mt-auto pt-6 space-y-3">
                <button
                  onClick={verifyOtp}
                  disabled={loading || otpDigits.some((d) => !d)}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      تأكيد
                    </>
                  )}
                </button>

                <button
                  onClick={resendOtp}
                  disabled={timer > 0 || loading}
                  className="w-full py-3 rounded-xl bg-card border border-border/20 text-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  إعادة إرسال الكود
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ STEP 3: SUCCESS ═══════════════ */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              {/* Animated checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mb-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
                >
                  <CheckCircle className="w-14 h-14 text-emerald-400" />
                </motion.div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-black text-foreground mb-2"
              >
                مبروك! 🎉
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg font-bold text-emerald-400 mb-1"
              >
                تم التوثيق بنجاح
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-muted-foreground"
              >
                الحين بتوصلك جميع الإشعارات على واتساب
              </motion.p>

              {/* Confetti-like dots */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 200,
                  }}
                  transition={{ duration: 1.2, delay: 0.3 + i * 0.1 }}
                  className={`absolute w-3 h-3 rounded-full ${
                    ["bg-emerald-400", "bg-primary", "bg-amber-400", "bg-violet-400"][i % 4]
                  }`}
                />
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-8 w-full space-y-3"
              >
                <button
                  onClick={() => navigate("/salary")}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  الرجوع للتطبيق
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ═══════════════ SETTINGS (Verified) ═══════════════ */}
          {step === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              {/* Verified badge */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-9 h-9 text-emerald-400" />
                </div>
                <h1 className="text-xl font-black text-foreground">حسابك موثّق ✅</h1>
                <p className="text-sm text-muted-foreground mt-1">الإشعارات مفعّلة على واتساب</p>
              </div>

              {/* Current phone */}
              <div className="rounded-xl border border-border/10 bg-card/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">الرقم الموثّق</span>
                  <span className="text-sm font-bold text-foreground tabular-nums" dir="ltr">
                    {verifiedPhone}
                  </span>
                </div>

                <div className="h-px bg-border/10" />

                {/* Actions */}
                <button
                  onClick={changeNumber}
                  className="w-full flex items-center justify-between px-1 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    <span className="font-bold">تغيير الرقم</span>
                  </div>
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>

                <button
                  onClick={unlinkPhone}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-1 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                    <span className="font-bold">فك الربط</span>
                  </div>
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>

              <div className="mt-auto pt-6">
                <button
                  onClick={() => navigate("/salary")}
                  className="w-full py-3 rounded-xl bg-card border border-border/20 text-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  الرجوع
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </MobileLayout>
  );
};

export default VerifyPhone;
