import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ShieldX, MessageSquare, Home, Ticket,
  AlertTriangle, FileWarning, Phone, HelpCircle,
  Sparkles, Loader2, CheckCircle2, Send
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import SupportSessionChat from "@/components/SupportSessionChat";
import { startSupportSession } from "@/hooks/use-support-session";
import { createTicket } from "@/hooks/use-create-ticket";
import { notifyOnDutyAdmin } from "@/hooks/use-on-duty-admin";
import TicketStatusCard from "@/components/support/TicketStatusCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const isEligibleForQuickSupport = (user: any): boolean => {
  if (!user) return false;
  const vipLevel = user.vip?.vip_level || user.vip?.level || 0;
  const isHostAgent = (user.agency_id || 0) > 0;
  const typeUser = user.type_user || 0;
  const isAgentType = [2, 4, 5, 6].includes(typeUser);
  return vipLevel >= 6 || isHostAgent || isAgentType;
};

type MainOption = "chat" | "room_visit" | "ticket";
type TicketSubType = "report" | "complaint" | "direct_contact" | "other";

const TICKET_TYPE_LABELS: Record<TicketSubType, string> = {
  report: "بلاغ مخالفة",
  complaint: "شكوى رسمية",
  direct_contact: "تواصل مباشر",
  other: "أخرى",
};

const QuickSupport: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  // Main view state
  const [activeOption, setActiveOption] = useState<MainOption | null>(null);
  const [loading, setLoading] = useState(false);

  // Option 1: Chat
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Option 2: Room visit
  const [roomCode, setRoomCode] = useState("");
  const [visitSent, setVisitSent] = useState(false);

  // Option 3: Ticket
  const [ticketSubType, setTicketSubType] = useState<TicketSubType | null>(null);
  const [ticketMessage, setTicketMessage] = useState("");
  const [createdTicket, setCreatedTicket] = useState<any>(null);

  const isSOS = new URLSearchParams(window.location.search).get("sos") === "1";

  // === ACCESS CONTROL ===
  if (!isEligibleForQuickSupport(authUser)) {
    return (
      <div className="mobile-container bg-background flex flex-col" dir="rtl">
        <Header navigate={navigate} title="دعم سريع" />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-destructive/10 border border-destructive/20">
              <ShieldX className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">ميزة حصرية</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
              الدعم السريع متاح فقط لأصحاب<br />
              <span className="text-primary font-bold">VIP 6+</span> أو <span className="text-primary font-bold">وكلاء المضيفين</span>
            </p>
            <button onClick={() => navigate("/dashboard")} className="w-full h-11 rounded-xl border border-border/50 text-foreground font-bold bg-card/50 active:scale-95 transition-transform text-sm">
              العودة للرئيسية
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // === OPTION 1: ACTIVE CHAT SESSION ===
  if (sessionId) {
    return (
      <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
        <SupportSessionChat
          sessionId={sessionId}
          userUuid={authUser?.uuid || ""}
          userName={authUser?.name || ""}
          senderType="user"
          showTimer={true}
          onClose={() => { setSessionId(null); setActiveOption(null); }}
        />
      </div>
    );
  }

  // === OPTION 2: VISIT SENT ===
  if (visitSent) {
    return (
      <div className="mobile-container bg-background flex flex-col" dir="rtl">
        <Header navigate={navigate} title="دعم سريع" />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-foreground">تم إرسال الطلب</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
              السوبر أدمن في الطريق لغرفتك <span className="text-primary font-bold">#{roomCode}</span>
            </p>
            <button onClick={() => { setVisitSent(false); setActiveOption(null); setRoomCode(""); }} className="w-full h-11 rounded-xl border border-border/50 text-foreground font-bold bg-card/50 active:scale-95 transition-transform text-sm">
              رجوع
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // === OPTION 3: TICKET CREATED ===
  if (createdTicket) {
    return (
      <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
        <Header navigate={navigate} title="تذكرة سريعة" onBack={() => { setCreatedTicket(null); setActiveOption(null); setTicketSubType(null); setTicketMessage(""); }} />
        <div className="flex-1 overflow-y-auto pb-24">
          <TicketStatusCard
            ticket={createdTicket}
            onClose={() => { setCreatedTicket(null); setActiveOption(null); }}
          />
        </div>
      </div>
    );
  }

  // === HANDLERS ===
  const handleStartChat = async () => {
    if (!authUser) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    setLoading(true);
    try {
      const session = await startSupportSession({
        user_uuid: authUser.uuid,
        user_name: authUser.name,
        support_level: 2,
        request_type: "direct_chat",
        notes: `${isSOS ? "🆘 طوارئ — " : ""}محادثة مباشرة مع سوبر أدمن`,
      });
      if (session?.id) {
        setSessionId(session.id);
        toast.success("تم بدء المحادثة مع سوبر أدمن!");
      } else {
        toast.error("لا يوجد سوبر أدمن متاح حالياً");
      }
    } catch {
      toast.error("فشل الاتصال بالخادم");
    }
    setLoading(false);
  };

  const handleRoomVisit = async () => {
    if (!authUser) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    if (!roomCode.trim()) { toast.error("أدخل آيدي الغرفة"); return; }
    setLoading(true);
    try {
      // 1. Create ticket
      await createTicket({
        userUuid: authUser.uuid,
        userName: authUser.name,
        requestType: "admin_visit",
        roomCode: roomCode.trim(),
        messageText: `طلب زيارة سوبر أدمن للغرفة #${roomCode.trim()}`,
      });

      // 2. Send WhatsApp notification to on-duty super admin
      try {
        await notifyOnDutyAdmin(
          `غلا شات 💬\n\n🏠 طلب زيارة غرفة!\nالمستخدم: ${authUser.name}\nالغرفة: #${roomCode.trim()}\n\n📌 ادخل الغرفة الحين!`,
          'super_admin'
        );
      } catch { /* silent */ }

      setVisitSent(true);
      toast.success("تم إرسال الطلب!");
    } catch {
      toast.error("فشل إرسال الطلب");
    }
    setLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!authUser) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    if (!ticketSubType) { toast.error("اختر نوع الطلب"); return; }
    if (!ticketMessage.trim()) { toast.error("اكتب تفاصيل الطلب"); return; }
    setLoading(true);
    try {
      const ticket = await createTicket({
        userUuid: authUser.uuid,
        userName: authUser.name,
        requestType: ticketSubType === "other" ? "direct_contact" : ticketSubType,
        messageText: ticketMessage.trim(),
      });
      if (ticket) {
        setCreatedTicket(ticket);
        toast.success("تم إنشاء التذكرة بنجاح");
      }
    } catch {
      toast.error("فشل إنشاء التذكرة");
    }
    setLoading(false);
  };

  // === SUB-VIEWS ===

  // Option 2: Room visit form
  if (activeOption === "room_visit") {
    return (
      <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
        <Header navigate={navigate} title="طلب سوبر أدمن" onBack={() => setActiveOption(null)} />
        <div className="flex-1 flex flex-col px-5 py-6 space-y-5">
          <div className="glass-card p-4 space-y-1 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-amber-400" />
              <p className="text-sm font-bold text-amber-400">طلب زيارة غرفة</p>
            </div>
            <p className="text-[11px] text-muted-foreground">أدخل آيدي الغرفة وسيتم إرسال الطلب للسوبر أدمن المناوب</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">آيدي الغرفة</label>
            <Input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="مثال: 123456"
              className="text-center text-lg font-mono tracking-widest"
              dir="ltr"
            />
          </div>

          <button
            onClick={handleRoomVisit}
            disabled={loading || !roomCode.trim()}
            className="w-full h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? "جاري الإرسال..." : "إرسال الطلب"}
          </button>
        </div>
      </div>
    );
  }

  // Option 3: Ticket creation flow
  if (activeOption === "ticket") {
    // Step 1: Choose sub-type
    if (!ticketSubType) {
      const subTypes: { type: TicketSubType; icon: React.ReactNode; label: string; color: string }[] = [
        { type: "report", icon: <AlertTriangle className="w-5 h-5" />, label: "رفع بلاغ", color: "text-red-400 border-red-500/30 bg-red-500/10" },
        { type: "complaint", icon: <FileWarning className="w-5 h-5" />, label: "رفع شكوى", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
        { type: "direct_contact", icon: <Phone className="w-5 h-5" />, label: "تواصل مباشر", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
        { type: "other", icon: <HelpCircle className="w-5 h-5" />, label: "أخرى", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
      ];
      return (
        <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
          <Header navigate={navigate} title="إنشاء تذكرة" onBack={() => setActiveOption(null)} />
          <div className="flex-1 flex flex-col px-5 py-5 space-y-3">
            <p className="text-xs text-muted-foreground">اختر نوع الطلب:</p>
            {subTypes.map((st, i) => (
              <motion.button
                key={st.type}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setTicketSubType(st.type)}
                className={`flex items-center gap-3 p-4 rounded-xl border ${st.color} active:scale-[0.97] transition-transform`}
              >
                {st.icon}
                <span className="text-sm font-bold text-foreground">{st.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      );
    }

    // Step 2: Write message
    return (
      <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
        <Header navigate={navigate} title={TICKET_TYPE_LABELS[ticketSubType]} onBack={() => setTicketSubType(null)} />
        <div className="flex-1 flex flex-col px-5 py-5 space-y-4">
          <div className="glass-card p-3 flex items-center gap-2 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <Ticket className="w-4 h-4 text-primary" />
            <p className="text-[11px] text-muted-foreground">اكتب تفاصيل طلبك وسيتم إنشاء تذكرة</p>
          </div>

          <Textarea
            value={ticketMessage}
            onChange={(e) => setTicketMessage(e.target.value)}
            placeholder="اكتب التفاصيل هنا..."
            rows={5}
            className="resize-none"
          />

          <button
            onClick={handleCreateTicket}
            disabled={loading || !ticketMessage.trim()}
            className="w-full h-12 rounded-xl bg-primary/20 border border-primary/30 text-primary font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? "جاري الإنشاء..." : "إنشاء التذكرة"}
          </button>
        </div>
      </div>
    );
  }

  // === MAIN VIEW: 3 OPTIONS ===
  const mainOptions: { key: MainOption; icon: React.ReactNode; title: string; desc: string; gradient: string }[] = [
    {
      key: "chat",
      icon: <MessageSquare className="w-7 h-7" />,
      title: "تحدث مع سوبر أدمن",
      desc: "محادثة مباشرة فورية مع سوبر أدمن المناوب",
      gradient: "from-emerald-500/15 to-emerald-600/5 border-emerald-500/25",
    },
    {
      key: "room_visit",
      icon: <Home className="w-7 h-7" />,
      title: "طلب سوبر أدمن على غرفتي",
      desc: "أدخل آيدي الغرفة وسيتوجه السوبر أدمن إليك",
      gradient: "from-amber-500/15 to-amber-600/5 border-amber-500/25",
    },
    {
      key: "ticket",
      icon: <Ticket className="w-7 h-7" />,
      title: "إنشاء تذكرة",
      desc: "بلاغ، شكوى، تواصل مباشر، أو طلب آخر",
      gradient: "from-blue-500/15 to-blue-600/5 border-blue-500/25",
    },
  ];

  return (
    <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
      <Header navigate={navigate} title={isSOS ? "SOS دعم طوارئ" : "دعم سريع"} />

      <div className="flex-1 flex flex-col overflow-y-auto px-5 py-5 space-y-4">
        {isSOS && (
          <div className="glass-card p-3 flex items-center gap-3 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
            <span className="text-xl">🆘</span>
            <div>
              <p className="text-xs font-bold text-red-400">وضع الطوارئ</p>
              <p className="text-[10px] text-muted-foreground">سيتم تصعيد طلبك للسوبر أدمن فوراً</p>
            </div>
          </div>
        )}

        {!isSOS && (
          <div className="glass-card p-3 flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs font-bold text-primary">دعم سريع — حصري</p>
              <p className="text-[10px] text-muted-foreground">اختر الخدمة المناسبة لطلبك</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {mainOptions.map((opt, i) => (
            <motion.button
              key={opt.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              onClick={() => {
                if (opt.key === "chat") {
                  handleStartChat();
                } else {
                  setActiveOption(opt.key);
                }
              }}
              disabled={loading}
              className={`w-full p-5 rounded-2xl bg-gradient-to-br ${opt.gradient} border text-right flex items-start gap-4 active:scale-[0.97] transition-transform disabled:opacity-50`}
            >
              <div className="mt-0.5 text-foreground">{opt.icon}</div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-bold text-foreground">{opt.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">جاري الاتصال بسوبر أدمن...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// === HEADER COMPONENT ===
const Header: React.FC<{ navigate: any; title: string; onBack?: () => void }> = ({ navigate, title, onBack }) => (
  <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onBack || (() => navigate(-1))}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30"
    >
      <ArrowRight className="w-5 h-5 text-primary" />
      <span className="text-sm font-semibold text-primary">رجوع</span>
    </motion.button>
    <h1 className="text-sm font-bold text-foreground">{title}</h1>
    <div className="w-16" />
  </header>
);

export default QuickSupport;
