import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send, CheckCircle2, Clock, ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const COOLDOWN_KEY = "quick_support_cooldown";
const COOLDOWN_MS = 5 * 60 * 1000;

const QuickSupport: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const checkCooldown = useCallback(() => {
    const savedTime = localStorage.getItem(COOLDOWN_KEY);
    if (savedTime) {
      const remaining = Number(savedTime) - Date.now();
      if (remaining > 0) {
        setCooldownRemaining(remaining);
        return true;
      }
      localStorage.removeItem(COOLDOWN_KEY);
    }
    setCooldownRemaining(0);
    return false;
  }, []);

  useEffect(() => {
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [checkCooldown]);

  const formatCooldown = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || cooldownRemaining > 0) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("quick-support", {
        body: {
          room_code: roomCode.trim(),
          ...(authUser?.name && { user_name: authUser.name }),
        },
      });
      if (error) throw error;
      if (data && !data.ok) throw new Error(data.error || "فشل إرسال الطلب");
      localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS));
      setSubmitted(true);
      toast.success("تم إرسال طلبك بنجاح!");
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال الطلب، حاول لاحقاً");
    } finally {
      setSubmitting(false);
    }
  };

  const isCoolingDown = cooldownRemaining > 0;

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col overflow-hidden" dir="rtl">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 20% 50%, hsl(8 88% 62% / 0.1) 0%, transparent 50%)"
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 80% 50%, hsl(174 50% 55% / 0.1) 0%, transparent 50%)"
          }}
          animate={{
            backgroundPosition: ["100% 100%", "0% 0%"],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">رجوع</span>
        </motion.button>
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-bold text-foreground"
        >
          دعم سريع
        </motion.h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex flex-col px-5 py-6">
        <AnimatePresence mode="wait">
          {submitted ? (
            /* ─── Success State ─── */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-lg font-bold text-foreground mb-2"
              >
                تم إرسال طلبك! ✅
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-sm text-muted-foreground text-center leading-relaxed"
              >
                سوبر أدمن بيدخل غرفتك خلال دقائق
              </motion.p>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => navigate(-1)}
                className="mt-8 w-full h-12 rounded-xl border border-primary/30 text-primary font-bold bg-primary/5 hover:bg-primary/10 transition-colors active:scale-95"
              >
                رجوع
              </motion.button>
            </motion.div>
          ) : (
            /* ─── Main Form ─── */
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-5"
            >
              {/* Animated Hero */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                  className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mb-4"
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 0] }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                  >
                    <Zap className="w-9 h-9 text-primary" />
                  </motion.div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-base font-bold text-foreground leading-relaxed"
                >
                  عشان وقتك مهم عندنا ⚡
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-[13px] text-muted-foreground leading-relaxed mt-2 max-w-[280px] mx-auto"
                >
                  اعطينا كود الغرفة اللي أنت متواجد فيها
                  <br />
                  وسوبر أدمن <span className="text-primary font-bold">بيجيك خلال دقائق</span>
                </motion.p>
              </motion.div>

              {/* Cooldown */}
              {isCoolingDown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-3 flex items-center gap-3 border-amber-500/30 border"
                >
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">انتظر قبل إرسال طلب جديد</p>
                    <p className="text-[11px] text-muted-foreground">
                      متبقي: <span className="text-amber-400 font-bold">{formatCooldown(cooldownRemaining)}</span>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Room Code Input */}
              <motion.form
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="glass-card p-4 space-y-3">
                  <motion.label 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 }}
                    className="text-sm font-bold text-foreground flex items-center gap-2"
                  >
                    🏠 كود الغرفة
                  </motion.label>
                  <motion.input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="اكتب رقم أو كود الغرفة..."
                    required
                    autoFocus
                    maxLength={20}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                    className="w-full h-14 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all text-base text-center tracking-wider font-bold"
                    dir="ltr"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={!roomCode.trim() || submitting || isCoolingDown}
                  whileTap={{ scale: 0.96 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: isCoolingDown || !roomCode.trim() ? 1 : 1.02 }}
                  className="w-full h-13 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity text-base py-3.5"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      أرسل الطلب
                    </>
                  )}
                </motion.button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuickSupport;
