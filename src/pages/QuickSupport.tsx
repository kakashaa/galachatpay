import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Headset, Send, CheckCircle2, Clock } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const COOLDOWN_KEY = "quick_support_cooldown";
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const QuickSupport: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState(authUser?.name || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Check cooldown on mount and tick
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
      const res = await fetch("https://18.219.229.240/website/support.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_code: roomCode.trim(),
          ...(userName.trim() && { user_name: userName.trim() }),
          ...(message.trim() && { message: message.trim() }),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "فشل إرسال الطلب");

      // Set cooldown
      localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS));
      setSubmitted(true);
      toast.success("تم إرسال طلبك بنجاح!");
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال الطلب، حاول لاحقاً");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="دعم سريع" onBack={() => navigate(-1)}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال طلبك!</h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            سيتواصل معك المسؤول قريباً
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-8 w-full h-12 rounded-xl border border-primary/30 text-primary font-bold bg-primary/5 hover:bg-primary/10 transition-colors active:scale-95"
          >
            رجوع
          </button>
        </div>
      </MobileLayout>
    );
  }

  const isCoolingDown = cooldownRemaining > 0;

  return (
    <MobileLayout showHeader headerTitle="دعم سريع" onBack={() => navigate(-1)}>
      <div className="px-5 py-6 space-y-6">
        {/* Header */}
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Headset className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">طلب سوبر أدمن للغرفة</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              اكتب رقم غرفتك وسوبر أدمن بيدخل الغرفة ويتواصل معك مباشرة
            </p>
          </div>
        </div>

        {/* Cooldown warning */}
        {isCoolingDown && (
          <div className="glass-card p-3 flex items-center gap-3 border-amber-500/30 border">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">انتظر قبل إرسال طلب جديد</p>
              <p className="text-[11px] text-muted-foreground">
                متبقي: <span className="text-amber-400 font-bold">{formatCooldown(cooldownRemaining)}</span>
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground">
              رقم الغرفة <span className="text-destructive">*</span>
            </label>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              اكتب رقم أو كود غرفتك عشان السوبر أدمن يدخلها ويتكلم معك
            </p>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="مثال: 12345"
              required
              maxLength={20}
              className="w-full h-12 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground">اسمك</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="اختياري"
              maxLength={50}
              className="w-full h-12 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground">رسالتك</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اختياري — اكتب رسالتك هنا..."
              rows={3}
              maxLength={300}
              className="w-full p-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-sm leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground text-left" dir="ltr">
              {message.length}/300
            </p>
          </div>

          <button
            type="submit"
            disabled={!roomCode.trim() || submitting || isCoolingDown}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity active:scale-95"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                إرسال
              </>
            )}
          </button>
        </form>
      </div>
    </MobileLayout>
  );
};

export default QuickSupport;
