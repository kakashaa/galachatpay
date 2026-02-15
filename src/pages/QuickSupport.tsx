import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, CheckCircle2, Clock, ArrowRight, Zap, ShieldX,
  UserCheck, AlertTriangle, FileWarning, Phone, Upload, X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSuccessChime } from "@/hooks/use-success-chime";

const _WHATSAPP_GROUP = "https://chat.whatsapp.com/CU5qWrhTab6BlFMecxWCRs";

const isEligibleForQuickSupport = (user: any): boolean => {
  if (!user) return false;
  const vipLevel = user.vip?.vip_level || user.vip?.level || 0;
  return vipLevel >= 6;
};

type RequestType = "admin_visit" | "report" | "complaint" | "direct_contact";

interface ServiceOption {
  type: RequestType;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

const serviceOptions: ServiceOption[] = [
  {
    type: "admin_visit",
    icon: <UserCheck className="w-6 h-6" />,
    label: "طلب إداري",
    description: "أدمن يدخل غرفتك خلال دقائق",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  },
  {
    type: "report",
    icon: <AlertTriangle className="w-6 h-6" />,
    label: "رفع بلاغ",
    description: "بلّغ عن مخالفة مع إرفاق الإثبات",
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
  },
  {
    type: "complaint",
    icon: <FileWarning className="w-6 h-6" />,
    label: "رفع شكوى",
    description: "قدّم شكوى رسمية مع التفاصيل",
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  },
  {
    type: "direct_contact",
    icon: <Phone className="w-6 h-6" />,
    label: "تواصل مباشر",
    description: "أدمن يتواصل معك على رقمك",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  },
];

const COOLDOWN_KEY = "quick_support_cooldown";
const COOLDOWN_MS = 5 * 60 * 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const QuickSupport: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const playSuccessChime = useSuccessChime();

  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [description, setDescription] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
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

  const isCoolingDown = cooldownRemaining > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("حجم الملف يتجاوز 10MB");
      return;
    }
    setAttachment(file);
  };

  const uploadAttachment = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `quick-support/${authUser?.uuid || "unknown"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const buildWhatsAppMessage = (type: RequestType, data: Record<string, string>) => {
    const userName = authUser?.name || "مستخدم";
    const userUuid = authUser?.uuid || "-";
    let msg = `⚡ *دعم سريع - VIP 6*\n👤 ${userName} (${userUuid})\n`;

    switch (type) {
      case "admin_visit":
        msg += `📋 *النوع:* طلب إداري\n🏠 *رقم الغرفة:* ${data.roomCode}`;
        break;
      case "report":
        msg += `📋 *النوع:* بلاغ\n📝 *التفاصيل:* ${data.description}`;
        if (data.attachmentUrl) msg += `\n📎 *المرفق:* ${data.attachmentUrl}`;
        break;
      case "complaint":
        msg += `📋 *النوع:* شكوى\n📝 *التفاصيل:* ${data.description}`;
        if (data.attachmentUrl) msg += `\n📎 *المرفق:* ${data.attachmentUrl}`;
        break;
      case "direct_contact":
        msg += `📋 *النوع:* تواصل مباشر\n📞 *رقم الهاتف:* ${data.phoneNumber}`;
        if (data.description) msg += `\n📝 *ملاحظة:* ${data.description}`;
        break;
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || isCoolingDown) return;

    // Validate based on type
    if (selectedType === "admin_visit" && !roomCode.trim()) return;
    if ((selectedType === "report" || selectedType === "complaint") && !description.trim()) return;
    if (selectedType === "direct_contact" && !phoneNumber.trim()) return;

    setSubmitting(true);
    try {
      let attachmentUrl: string | null = null;
      if (attachment) {
        attachmentUrl = await uploadAttachment(attachment);
        if (!attachmentUrl) throw new Error("فشل رفع المرفق");
      }

      // Save to database
      const { error: dbError } = await supabase.from("quick_support_requests" as any).insert({
        user_uuid: authUser?.uuid || "",
        user_name: authUser?.name || "",
        request_type: selectedType,
        room_code: selectedType === "admin_visit" ? roomCode.trim() : null,
        description: description.trim() || null,
        phone_number: selectedType === "direct_contact" ? phoneNumber.trim() : null,
        attachment_url: attachmentUrl,
      } as any);

      if (dbError) throw dbError;

      // Also send to external API for admin_visit
      if (selectedType === "admin_visit") {
        await supabase.functions.invoke("quick-support", {
          body: {
            room_code: roomCode.trim(),
            ...(authUser?.name && { user_name: authUser.name }),
          },
        });
      }

      // Open WhatsApp with pre-filled message
      const msgData: Record<string, string> = {
        roomCode: roomCode.trim(),
        description: description.trim(),
        phoneNumber: phoneNumber.trim(),
        attachmentUrl: attachmentUrl || "",
      };
      const whatsappMsg = encodeURIComponent(buildWhatsAppMessage(selectedType, msgData));
      window.open(`https://api.whatsapp.com/send?phone=967712690248&text=${whatsappMsg}`, "_blank");

      localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS));
      playSuccessChime();
      setSubmitted(true);
      toast.success("تم إرسال طلبك بنجاح!");
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال الطلب، حاول لاحقاً");
    } finally {
      setSubmitting(false);
    }
  };

  // Access control: VIP 6 only
  if (!isEligibleForQuickSupport(authUser)) {
    return (
      <div className="mobile-container bg-background min-h-screen flex flex-col" dir="rtl">
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30"
          >
            <ArrowRight className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">رجوع</span>
          </motion.button>
          <h1 className="text-sm font-bold text-foreground">دعم سريع</h1>
          <div className="w-16" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-center space-y-4"
          >
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <ShieldX className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">ميزة حصرية ⚡</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
              الدعم السريع متاح فقط لأصحاب
              <br />
              <span className="text-yellow-400 font-bold">VIP 6</span>
            </p>
            <div className="glass-card p-3 space-y-1.5 text-[11px] text-muted-foreground">
              <p>🌟 ارفع مستوى VIP الخاص بك للحصول على دعم فوري</p>
              <p>⚡ سوبر أدمن يدخل غرفتك خلال دقائق</p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full h-11 rounded-xl border border-border/50 text-foreground font-bold bg-card/50 active:scale-95 transition-transform text-sm"
            >
              العودة للرئيسية
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => {
            if (selectedType && !submitted) {
              setSelectedType(null);
              setRoomCode("");
              setDescription("");
              setPhoneNumber("");
              setAttachment(null);
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30"
        >
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">رجوع</span>
        </motion.button>
        <h1 className="text-sm font-bold text-foreground">دعم سريع ⚡</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {submitted ? (
            <SuccessView navigate={navigate} />
          ) : !selectedType ? (
            <ServiceSelector
              options={serviceOptions}
              onSelect={setSelectedType}
              isCoolingDown={isCoolingDown}
              cooldownRemaining={cooldownRemaining}
              formatCooldown={formatCooldown}
            />
          ) : (
            <RequestForm
              type={selectedType}
              roomCode={roomCode}
              setRoomCode={setRoomCode}
              description={description}
              setDescription={setDescription}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              attachment={attachment}
              onFileChange={handleFileChange}
              onRemoveFile={() => setAttachment(null)}
              submitting={submitting}
              isCoolingDown={isCoolingDown}
              onSubmit={handleSubmit}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── Sub-components ─── */

function SuccessView({ navigate }: { navigate: (n: number) => void }) {
  return (
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
      <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال طلبك! ✅</h2>
      <p className="text-sm text-muted-foreground text-center leading-relaxed">
        سيتم التعامل مع طلبك في أقرب وقت
        <br />
        <span className="text-xs">أرسل الرسالة في قروب الواتساب لتسريع الاستجابة</span>
      </p>
      <button
        onClick={() => navigate(-1)}
        className="mt-8 w-full h-12 rounded-xl border border-primary/30 text-primary font-bold bg-primary/5 active:scale-95 transition-transform"
      >
        رجوع
      </button>
    </motion.div>
  );
}

function ServiceSelector({
  options,
  onSelect,
  isCoolingDown,
  cooldownRemaining,
  formatCooldown,
}: {
  options: ServiceOption[];
  onSelect: (t: RequestType) => void;
  isCoolingDown: boolean;
  cooldownRemaining: number;
  formatCooldown: (ms: number) => string;
}) {
  return (
    <motion.div
      key="selector"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-4"
    >
      <div className="text-center py-3">
        <Zap className="w-10 h-10 text-primary mx-auto mb-2" />
        <p className="text-base font-bold text-foreground">كيف نقدر نساعدك؟</p>
        <p className="text-xs text-muted-foreground mt-1">اختر نوع الطلب</p>
      </div>

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

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => (
          <motion.button
            key={opt.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            disabled={isCoolingDown}
            onClick={() => onSelect(opt.type)}
            className={`p-4 rounded-xl bg-gradient-to-br ${opt.color} border text-right space-y-2 active:scale-95 transition-transform disabled:opacity-40`}
          >
            <div className="text-foreground">{opt.icon}</div>
            <p className="text-sm font-bold text-foreground">{opt.label}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{opt.description}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function RequestForm({
  type,
  roomCode,
  setRoomCode,
  description,
  setDescription,
  phoneNumber,
  setPhoneNumber,
  attachment,
  onFileChange,
  onRemoveFile,
  submitting,
  isCoolingDown,
  onSubmit,
}: {
  type: RequestType;
  roomCode: string;
  setRoomCode: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
  attachment: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  submitting: boolean;
  isCoolingDown: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const option = serviceOptions.find((o) => o.type === type)!;

  const isValid = () => {
    if (type === "admin_visit") return !!roomCode.trim();
    if (type === "report" || type === "complaint") return !!description.trim();
    if (type === "direct_contact") return !!phoneNumber.trim();
    return false;
  };

  return (
    <motion.form
      key="form"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      onSubmit={onSubmit}
      className="space-y-4"
    >
      {/* Title */}
      <div className={`glass-card p-3 flex items-center gap-3 bg-gradient-to-br ${option.color} border`}>
        <div className="text-foreground">{option.icon}</div>
        <div>
          <p className="text-sm font-bold text-foreground">{option.label}</p>
          <p className="text-[10px] text-muted-foreground">{option.description}</p>
        </div>
      </div>

      {/* Type-specific fields */}
      {type === "admin_visit" && (
        <div className="glass-card p-4 space-y-3">
          <label className="text-sm font-bold text-foreground flex items-center gap-2">🏠 رقم الغرفة</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="اكتب رقم أو كود الغرفة..."
            required
            autoFocus
            maxLength={20}
            className="w-full h-14 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all text-base text-center tracking-wider font-bold"
            dir="ltr"
          />
        </div>
      )}

      {(type === "report" || type === "complaint") && (
        <>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              📝 {type === "report" ? "تفاصيل البلاغ" : "تفاصيل الشكوى"}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "report" ? "اكتب تفاصيل البلاغ..." : "اكتب تفاصيل الشكوى..."}
              required
              autoFocus
              maxLength={1000}
              rows={4}
              className="w-full px-4 py-3 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all text-sm resize-none"
            />
          </div>

          {/* Attachment */}
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">📎 مرفق (اختياري)</label>
            {attachment ? (
              <div className="flex items-center gap-2 p-2 bg-input rounded-lg border border-border/50">
                <span className="text-xs text-foreground truncate flex-1">{attachment.name}</span>
                <button type="button" onClick={onRemoveFile} className="text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-12 bg-input rounded-xl border border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">اختر صورة أو فيديو (حد أقصى 10MB)</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={onFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </>
      )}

      {type === "direct_contact" && (
        <>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">📞 رقم الهاتف</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="أدخل رقم الهاتف مع رمز الدولة..."
              required
              autoFocus
              maxLength={20}
              className="w-full h-14 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all text-base text-center tracking-wider font-bold"
              dir="ltr"
            />
          </div>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">📝 ملاحظة (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أضف ملاحظة للإداري..."
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all text-sm resize-none"
            />
          </div>
        </>
      )}

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={!isValid() || submitting || isCoolingDown}
        whileTap={{ scale: 0.96 }}
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
  );
}

export default QuickSupport;
