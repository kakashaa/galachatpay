import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, CheckCircle2, ArrowRight, Zap, ShieldX,
  UserCheck, AlertTriangle, FileWarning, Phone, Upload, X,
  Crown, Clock, Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSuccessChime } from "@/hooks/use-success-chime";
import LiveSupportChat from "@/components/LiveSupportChat";

const isEligibleForQuickSupport = (user: any): boolean => {
  if (!user) return false;
  const vipLevel = user.vip?.vip_level || user.vip?.level || 0;
  const isHostAgent = (user.agency_id || 0) > 0;
  const typeUser = user.type_user || 0;
  const isAgentType = [2, 4, 5, 6].includes(typeUser);
  return vipLevel >= 5 || isHostAgent || isAgentType;
};

/** Returns the on-duty super admin username based on Saudi time (UTC+3) */
const getOnDutySuperAdmin = (): string => {
  const now = new Date();
  const saudiHour = (now.getUTCHours() + 3) % 24;
  if (saudiHour >= 9 && saudiHour < 17) return "relax";
  if (saudiHour >= 17 || saudiHour < 1) return "janjoon";
  return "mars";
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
  const [submitting, setSubmitting] = useState(false);

  // Live chat state
  const [chatKey, setChatKey] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [startingChat, setStartingChat] = useState(false);

  // Check for existing active chat on mount
  useEffect(() => {
    if (!authUser) return;
    const savedKey = localStorage.getItem(`gala_quick_chat_${authUser.uuid}`);
    if (savedKey) {
      // Verify it's still active
      const checkChat = async () => {
        try {
          const result = await supabase.functions.invoke("support-chat", {
            body: { action: "status", chat_key: savedKey },
          });
          if (result.data?.ok && result.data?.status !== "ended" && result.data?.status !== "closed") {
            setChatKey(savedKey);
          } else {
            localStorage.removeItem(`gala_quick_chat_${authUser.uuid}`);
          }
        } catch {
          localStorage.removeItem(`gala_quick_chat_${authUser.uuid}`);
        }
      };
      checkChat();
    }
  }, [authUser]);

  // Auto-start chat for eligible users who don't have an active one
  const autoStartedRef = React.useRef(false);
  useEffect(() => {
    if (!authUser || chatKey || autoStartedRef.current || !isEligibleForQuickSupport(authUser)) return;
    const saved = localStorage.getItem(`gala_quick_chat_${authUser.uuid}`);
    if (saved) return; // will be restored by the other effect
    autoStartedRef.current = true;
    // Small delay for UI to render
    const timer = setTimeout(() => startChat(), 400);
    return () => clearTimeout(timer);
  }, [authUser, chatKey]);

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

  const startChat = async () => {
    if (!authUser) return;
    setStartingChat(true);
    try {
      // Start chat via API
      const result = await supabase.functions.invoke("support-chat", {
        body: {
          action: "start",
          user_uuid: authUser.uuid,
          user_name: authUser.name,
          chat_type: "quick",
        },
      });

      const data = result.data;
      if (data?.ok && data?.chat_key) {
        setChatKey(data.chat_key);
        setQueuePosition(data.queue_position || 0);
        localStorage.setItem(`gala_quick_chat_${authUser.uuid}`, data.chat_key);

        // If there's a selected type, send first message
        if (selectedType) {
          let firstMsg = "";
          if (selectedType === "admin_visit") firstMsg = `طلب إداري - رقم الغرفة: ${roomCode}${description ? `\n${description}` : ""}`;
          else if (selectedType === "direct_contact") firstMsg = `طلب تواصل مباشر - رقم الهاتف: ${phoneNumber}${description ? `\n${description}` : ""}`;
          else firstMsg = description;

          let attachUrl: string | null = null;
          if (attachment) attachUrl = await uploadAttachment(attachment);

          await supabase.functions.invoke("support-chat", {
            body: {
              action: "send",
              chat_key: data.chat_key,
              message: firstMsg || "طلب جديد",
              sender_type: "user",
              sender_name: authUser.name,
              attachment_url: attachUrl,
            },
          });
        }

        playSuccessChime();
        toast.success("تم بدء المحادثة!");
      } else {
        toast.error(data?.error || "فشل بدء المحادثة");
      }
    } catch {
      toast.error("فشل الاتصال بالخادم");
    }
    setStartingChat(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    if (selectedType === "admin_visit" && !roomCode.trim()) return;
    if ((selectedType === "report" || selectedType === "complaint") && !description.trim()) return;
    if (selectedType === "direct_contact" && !phoneNumber.trim()) return;
    await startChat();
  };

  const handleChatBack = () => {
    setChatKey(null);
    navigate(-1);
  };

  const handleChatEnded = () => {
    if (authUser) localStorage.removeItem(`gala_quick_chat_${authUser.uuid}`);
  };

  // Access control: VIP 6 only
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
            <h2 className="text-lg font-bold text-foreground">ميزة حصرية ⚡</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">الدعم السريع متاح فقط لأصحاب<br /><span className="text-primary font-bold">VIP 6</span> أو <span className="text-primary font-bold">وكلاء المضيفين</span></p>
            <div className="glass-card p-3 space-y-1.5 text-[11px] text-muted-foreground">
              <p>🌟 ارفع مستوى VIP الخاص بك للحصول على دعم فوري</p>
              <p>⚡ سوبر أدمن يدخل غرفتك خلال دقائق</p>
            </div>
            <button onClick={() => navigate("/dashboard")} className="w-full h-11 rounded-xl border border-border/50 text-foreground font-bold bg-card/50 active:scale-95 transition-transform text-sm">العودة للرئيسية</button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Active chat view
  if (chatKey) {
    return (
      <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
        <LiveSupportChat
          chatKey={chatKey}
          userUuid={authUser?.uuid || ""}
          userName={authUser?.name || ""}
          chatType="quick"
          queuePosition={queuePosition}
          onBack={handleChatBack}
          onEnded={handleChatEnded}
        />
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
        <h1 className="text-sm font-bold text-foreground">دعم سريع ⚡</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedType ? (
            <motion.div key="selector-wrapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-4 overflow-y-auto space-y-4">
              {/* Support tiers info */}
              <div className="space-y-2">
                <div className="glass-card p-3 flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-primary">VIP 6 — دعم فوري</p>
                    <p className="text-[10px] text-muted-foreground">أدمن يتواصل معك خلال دقائق</p>
                  </div>
                </div>
              </div>

              {/* Quick start chat button */}
              <button
                onClick={() => startChat()}
                disabled={startingChat}
                className="w-full glass-card p-4 flex items-center justify-center gap-3 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 active:scale-[0.98] transition-transform"
              >
                {startingChat ? (
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold text-primary">بدء محادثة فورية</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">— أو اختر نوع الطلب —</p>
              </div>

              <ServiceSelector options={serviceOptions} onSelect={setSelectedType} />
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
                submitting={submitting || startingChat}
                onSubmit={handleSubmit}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

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
          <label className="text-sm font-bold text-foreground flex items-center gap-2">🏠 رقم الغرفة</label>
          <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="اكتب رقم أو كود الغرفة..." required autoFocus maxLength={20} className="w-full h-14 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-base text-center tracking-wider font-bold" dir="ltr" />
        </div>
      )}

      {(type === "report" || type === "complaint") && (
        <>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">📝 {type === "report" ? "تفاصيل البلاغ" : "تفاصيل الشكوى"}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === "report" ? "اكتب تفاصيل البلاغ..." : "اكتب تفاصيل الشكوى..."} required autoFocus maxLength={1000} rows={4} className="w-full px-4 py-3 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-sm resize-none" />
          </div>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">📎 مرفق (اختياري)</label>
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
            <label className="text-sm font-bold text-foreground flex items-center gap-2">📞 رقم الهاتف</label>
            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="أدخل رقم الهاتف مع رمز الدولة..." required autoFocus maxLength={20} className="w-full h-14 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-base text-center tracking-wider font-bold" dir="ltr" />
          </div>
          <div className="glass-card p-4 space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">📝 ملاحظة (اختياري)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="أضف ملاحظة للإداري..." maxLength={500} rows={3} className="w-full px-4 py-3 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-sm resize-none" />
          </div>
        </>
      )}

      <motion.button type="submit" disabled={!isValid() || submitting} whileTap={{ scale: 0.96 }} className="w-full h-13 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity text-base py-3.5">
        {submitting ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Send className="w-5 h-5" /> بدء المحادثة</>}
      </motion.button>
    </motion.form>
  );
}

export default QuickSupport;
