import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, ArrowRight, Zap, ShieldX,
  UserCheck, AlertTriangle, FileWarning, Phone, Upload, X,
  Sparkles, CheckCircle2, Clock, Ticket
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSuccessChime } from "@/hooks/use-success-chime";
import { createTicket } from "@/hooks/use-create-ticket";
import SupportSessionChat from "@/components/SupportSessionChat";

const isEligibleForQuickSupport = (user: any): boolean => {
  if (!user) return false;
  const vipLevel = user.vip?.vip_level || user.vip?.level || 0;
  const isHostAgent = (user.agency_id || 0) > 0;
  const typeUser = user.type_user || 0;
  const isAgentType = [2, 4, 5, 6].includes(typeUser);
  return vipLevel >= 5 || isHostAgent || isAgentType;
};

type RequestType = "admin_visit" | "report" | "complaint" | "direct_contact";
type SubmitState = "idle" | "submitting" | "success" | "error";

interface ServiceOption {
  type: RequestType;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

const serviceOptions: ServiceOption[] = [
  { type: "admin_visit", icon: <UserCheck className="w-6 h-6" />, label: "طلب إداري", description: "أدمن يدخل غرفتك خلال دقائق", color: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  { type: "report", icon: <AlertTriangle className="w-6 h-6" />, label: "رفع بلاغ", description: "بلّغ عن مخالفة مع إرفاق الإثبات", color: "from-red-500/20 to-red-600/10 border-red-500/30" },
  { type: "complaint", icon: <FileWarning className="w-6 h-6" />, label: "رفع شكوى", description: "قدّم شكوى رسمية مع التفاصيل", color: "from-amber-500/20 to-amber-600/10 border-amber-500/30" },
  { type: "direct_contact", icon: <Phone className="w-6 h-6" />, label: "تواصل مباشر", description: "أدمن يتواصل معك على رقمك", color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const QuickSupport: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const playSuccessChime = useSuccessChime();

  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [description, setDescription] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Ticket submission state
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [createdTicket, setCreatedTicket] = useState<any>(null);

  // Legacy session state (kept for backward compatibility but not primary flow)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<"idle" | "found">("idle");

  const isSOS = new URLSearchParams(window.location.search).get("sos") === "1";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { toast.error("حجم الملف يتجاوز 10MB"); return; }
    setAttachment(file);
  };

  const uploadAttachment = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `quick-support/${authUser?.uuid || "unknown"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) return null;
    const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    if (!selectedType && !isSOS) return;

    const reqType = selectedType || "admin_visit";

    // Validate
    if (reqType === "admin_visit" && !roomCode.trim()) return;
    if ((reqType === "report" || reqType === "complaint") && !description.trim()) return;
    if (reqType === "direct_contact" && !phoneNumber.trim()) return;

    setSubmitState("submitting");

    try {
      // Upload attachment if exists
      let fileUrl: string | null = null;
      if (attachment) {
        fileUrl = await uploadAttachment(attachment);
      }

      // Build message text
      let messageText = "";
      if (reqType === "admin_visit") {
        messageText = `طلب إداري - رقم الغرفة: ${roomCode}${description ? `\n${description}` : ""}`;
      } else if (reqType === "direct_contact") {
        messageText = `طلب تواصل مباشر - رقم الهاتف: ${phoneNumber}${description ? `\n${description}` : ""}`;
      } else {
        messageText = description;
      }

      if (isSOS) {
        messageText = `🆘 طلب طوارئ\n${messageText || "طلب مساعدة فورية"}`;
      }

      const ticket = await createTicket({
        userUuid: authUser.uuid,
        userName: authUser.name,
        requestType: reqType,
        roomCode: roomCode || undefined,
        messageText: messageText || "طلب دعم سريع",
        attachmentUrl: fileUrl || undefined,
        phoneNumber: phoneNumber || undefined,
      });

      setCreatedTicket(ticket);
      setSubmitState("success");
      playSuccessChime();
      toast.success("✅ تم إنشاء التذكرة بنجاح!");
    } catch (err) {
      console.error("createTicket error:", err);
      setSubmitState("error");
      toast.error("⚠️ فشل إنشاء التذكرة — حاول مرة ثانية");
    }
  };

  const handleQuickSubmit = async () => {
    if (!authUser) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    setSubmitState("submitting");

    try {
      const messageText = isSOS
        ? "🆘 طلب مساعدة فورية — دعم سريع"
        : "طلب دعم سريع — تكلّم مع أدمن";

      const ticket = await createTicket({
        userUuid: authUser.uuid,
        userName: authUser.name,
        requestType: "admin_visit",
        messageText,
      });

      setCreatedTicket(ticket);
      setSubmitState("success");
      playSuccessChime();
      toast.success("✅ تم إنشاء التذكرة!");
    } catch (err) {
      console.error("createTicket error:", err);
      setSubmitState("error");
      toast.error("⚠️ فشل إنشاء التذكرة");
    }
  };

  const handleChatClose = () => {
    setSessionId(null);
    setConnectionState("idle");
    navigate(-1);
  };

  // Access control
  if (!isEligibleForQuickSupport(authUser)) {
    return (
      <div className="mobile-container bg-background flex flex-col" dir="rtl">
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
          <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate(-1)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30">
            <ArrowRight className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">رجوع</span>
          </motion.button>
          <h1 className="text-sm font-bold text-foreground">دعم سريع</h1>
          <div className="w-16" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-destructive/10 border border-destructive/20">
              <ShieldX className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">ميزة حصرية</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">الدعم السريع متاح فقط لأصحاب<br /><span className="text-primary font-bold">VIP 5+</span> أو <span className="text-primary font-bold">وكلاء المضيفين</span></p>
            <button onClick={() => navigate("/dashboard")} className="w-full h-11 rounded-xl border border-border/50 text-foreground font-bold bg-card/50 active:scale-95 transition-transform text-sm">العودة للرئيسية</button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Active session chat view (legacy - kept for backward compatibility)
  if (sessionId && connectionState === "found") {
    return (
      <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
        <SupportSessionChat
          sessionId={sessionId}
          userUuid={authUser?.uuid || ""}
          userName={authUser?.name || ""}
          senderType="user"
          showTimer={true}
          onClose={handleChatClose}
        />
      </div>
    );
  }

  // Ticket created successfully — show status card
  if (submitState === "success" && createdTicket) {
    return (
      <div className="mobile-container bg-background flex flex-col" dir="rtl">
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
          <motion.button onClick={() => navigate(-1)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30">
            <ArrowRight className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">رجوع</span>
          </motion.button>
          <h1 className="text-sm font-bold text-foreground">تم إنشاء التذكرة</h1>
          <div className="w-16" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <TicketStatusCard ticket={createdTicket} onGoToTickets={() => navigate("/support")} onNewTicket={() => {
            setSubmitState("idle");
            setCreatedTicket(null);
            setSelectedType(null);
            setRoomCode("");
            setDescription("");
            setPhoneNumber("");
            setAttachment(null);
          }} />
        </div>
      </div>
    );
  }

  // Submitting state
  if (submitState === "submitting") {
    return (
      <div className="mobile-container bg-background flex flex-col" dir="rtl">
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
          <div className="w-16" />
          <h1 className="text-sm font-bold text-foreground">جاري الإرسال</h1>
          <div className="w-16" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-primary/10 border border-primary/20">
              <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-foreground">⏳ جاري إنشاء التذكرة...</h2>
            <p className="text-sm text-muted-foreground">يتم حفظ طلبك وإشعار فريق الدعم</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Error state
  if (submitState === "error") {
    return (
      <div className="mobile-container bg-background flex flex-col" dir="rtl">
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
          <motion.button onClick={() => setSubmitState("idle")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30">
            <ArrowRight className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">رجوع</span>
          </motion.button>
          <h1 className="text-sm font-bold text-foreground">خطأ</h1>
          <div className="w-16" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">⚠️ فشل إنشاء التذكرة</h2>
            <p className="text-sm text-muted-foreground">حصل خطأ — حاول مرة ثانية</p>
            <div className="space-y-2 w-full max-w-[280px] mx-auto">
              <button onClick={() => setSubmitState("idle")} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold active:scale-95 transition-transform text-sm flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> إعادة المحاولة
              </button>
              <button onClick={() => navigate("/support")} className="w-full h-11 rounded-xl border border-border/50 text-foreground font-bold bg-card/50 active:scale-95 transition-transform text-sm flex items-center justify-center gap-2">
                <Ticket className="w-4 h-4" /> الذهاب للتذاكر
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
        <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => {
          if (selectedType) { setSelectedType(null); setRoomCode(""); setDescription(""); setPhoneNumber(""); setAttachment(null); }
          else navigate(-1);
        }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30">
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">رجوع</span>
        </motion.button>
        <h1 className="text-sm font-bold text-foreground">{isSOS ? "SOS دعم طوارئ" : "دعم سريع"}</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedType ? (
            <motion.div key="selector-wrapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-4 overflow-y-auto space-y-4">
              {isSOS && (
                <div className="glass-card p-3 flex items-center gap-3 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
                  <span className="text-xl">🆘</span>
                  <div>
                    <p className="text-xs font-bold text-red-400">وضع الطوارئ</p>
                    <p className="text-[10px] text-muted-foreground">سيتم تصعيد طلبك للسوبر أدمن والمشرفين فوراً</p>
                  </div>
                </div>
              )}

              {!isSOS && (
                <div className="glass-card p-3 flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-primary">دعم فوري</p>
                    <p className="text-[10px] text-muted-foreground">أنشئ تذكرة وسيتواصل معك أدمن بأسرع وقت</p>
                  </div>
                </div>
              )}

              {/* Quick ticket button */}
              <motion.button
                onClick={handleQuickSubmit}
                disabled={submitState === "submitting"}
                animate={{
                  boxShadow: isSOS ? [
                    "0 0 0 0 rgba(239,68,68,0.4)",
                    "0 0 20px 4px rgba(239,68,68,0.15)",
                    "0 0 0 0 rgba(239,68,68,0.4)",
                  ] : [
                    "0 0 0 0 rgba(59,130,246,0.4)",
                    "0 0 20px 4px rgba(59,130,246,0.15)",
                    "0 0 0 0 rgba(59,130,246,0.4)",
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="w-full rounded-2xl p-5 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform border"
                style={{
                  background: isSOS
                    ? "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.15))"
                    : "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.15))",
                  borderColor: isSOS ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.4)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="text-base font-black text-primary">
                    {isSOS ? "طلب مساعدة فورية" : "إنشاء تذكرة سريعة"}
                  </span>
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {isSOS ? "سيتم إرسال إشعار فوري للسوبر أدمن والمشرفين" : "تذكرة فورية — أدمن يرد عليك بأسرع وقت"}
                </span>
              </motion.button>

              {!isSOS && (
                <>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">— أو اختر نوع الطلب —</p>
                  </div>
                  <ServiceSelector options={serviceOptions} onSelect={setSelectedType} />
                </>
              )}
            </motion.div>
          ) : (
            <div className="px-5 py-4 overflow-y-auto">
              <RequestForm
                type={selectedType}
                roomCode={roomCode} setRoomCode={setRoomCode}
                description={description} setDescription={setDescription}
                phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber}
                attachment={attachment}
                onFileChange={handleFileChange}
                onRemoveFile={() => setAttachment(null)}
                submitting={submitState === "submitting"}
                onSubmit={handleSubmit}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── Ticket Status Card ─── */
function TicketStatusCard({ ticket, onGoToTickets, onNewTicket }: { ticket: any; onGoToTickets: () => void; onNewTicket: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="text-center space-y-5 w-full max-w-[320px]">
      <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">✅ تم إنشاء التذكرة!</h2>
        <p className="text-sm text-muted-foreground">تم حفظ طلبك وسيتم الرد عليك بأقرب وقت</p>
      </div>

      <div className="glass-card p-4 space-y-3 text-right">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">الموضوع</span>
          <span className="text-xs font-bold text-foreground">{ticket?.subject || "طلب دعم"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">الحالة</span>
          <span className="text-xs font-bold text-primary flex items-center gap-1">
            <Clock className="w-3 h-3" /> بانتظار الرد
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">الأولوية</span>
          <span className={`text-xs font-bold ${ticket?.priority === 'high' ? 'text-destructive' : 'text-foreground'}`}>
            {ticket?.priority === 'high' ? 'عالية' : 'عادية'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <button onClick={onGoToTickets} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold active:scale-95 transition-transform text-sm flex items-center justify-center gap-2">
          <Ticket className="w-4 h-4" /> متابعة التذاكر
        </button>
        <button onClick={onNewTicket} className="w-full h-11 rounded-xl border border-border/50 text-foreground font-bold bg-card/50 active:scale-95 transition-transform text-sm flex items-center justify-center gap-2">
          <Send className="w-4 h-4" /> إنشاء تذكرة جديدة
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Sub-components ─── */

function ServiceSelector({ options, onSelect }: { options: ServiceOption[]; onSelect: (t: RequestType) => void }) {
  return (
    <motion.div key="selector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => (
          <motion.button key={opt.type} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }} onClick={() => onSelect(opt.type)} className={`p-4 rounded-xl bg-gradient-to-br ${opt.color} border text-right space-y-2 active:scale-95 transition-transform`}>
            <div className="text-foreground">{opt.icon}</div>
            <p className="text-sm font-bold text-foreground">{opt.label}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{opt.description}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function RequestForm({ type, roomCode, setRoomCode, description, setDescription, phoneNumber, setPhoneNumber, attachment, onFileChange, onRemoveFile, submitting, onSubmit }: {
  type: RequestType; roomCode: string; setRoomCode: (v: string) => void; description: string; setDescription: (v: string) => void; phoneNumber: string; setPhoneNumber: (v: string) => void; attachment: File | null; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemoveFile: () => void; submitting: boolean; onSubmit: (e: React.FormEvent) => void;
}) {
  const option = serviceOptions.find((o) => o.type === type)!;
  const isValid = () => {
    if (type === "admin_visit") return !!roomCode.trim();
    if (type === "report" || type === "complaint") return !!description.trim();
    if (type === "direct_contact") return !!phoneNumber.trim();
    return false;
  };

  return (
    <motion.form key="form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} onSubmit={onSubmit} className="space-y-4">
      <div className={`glass-card p-3 flex items-center gap-3 bg-gradient-to-br ${option.color} border`}>
        <div className="text-foreground">{option.icon}</div>
        <div><p className="text-sm font-bold text-foreground">{option.label}</p><p className="text-[10px] text-muted-foreground">{option.description}</p></div>
      </div>

      {type === "admin_visit" && (
        <div className="glass-card p-4 space-y-3">
          <label className="text-sm font-bold text-foreground flex items-center gap-2">رقم الغرفة</label>
          <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="اكتب رقم أو كود الغرفة..." required autoFocus maxLength={20} className="w-full h-14 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-base text-center tracking-wider font-bold" dir="ltr" />
        </div>
      )}

      {(type === "report" || type === "complaint") && (
        <>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">{type === "report" ? "تفاصيل البلاغ" : "تفاصيل الشكوى"}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === "report" ? "اكتب تفاصيل البلاغ..." : "اكتب تفاصيل الشكوى..."} required autoFocus maxLength={1000} rows={4} className="w-full px-4 py-3 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-sm resize-none" />
          </div>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">مرفق (اختياري)</label>
            {attachment ? (
              <div className="flex items-center gap-2 p-2 bg-input rounded-lg border border-border/50">
                <span className="text-xs text-foreground truncate flex-1">{attachment.name}</span>
                <button type="button" onClick={onRemoveFile} className="text-destructive"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-12 bg-input rounded-xl border border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">اختر صورة أو فيديو (حد أقصى 10MB)</span>
                <input type="file" accept="image/*,video/*" onChange={onFileChange} className="hidden" />
              </label>
            )}
          </div>
        </>
      )}

      {type === "direct_contact" && (
        <>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">رقم الهاتف</label>
            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="أدخل رقم الهاتف مع رمز الدولة..." required autoFocus maxLength={20} className="w-full h-14 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-base text-center tracking-wider font-bold" dir="ltr" />
          </div>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">ملاحظة (اختياري)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="أضف ملاحظة للإداري..." maxLength={500} rows={3} className="w-full px-4 py-3 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-sm resize-none" />
          </div>
        </>
      )}

      <motion.button type="submit" disabled={!isValid() || submitting} whileTap={{ scale: 0.96 }} className="w-full h-13 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity text-base py-3.5">
        {submitting ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Send className="w-5 h-5" /> إرسال التذكرة</>}
      </motion.button>
    </motion.form>
  );
}

export default QuickSupport;
