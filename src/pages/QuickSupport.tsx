import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ShieldX,
  UserCheck, AlertTriangle, FileWarning, Phone,
  Sparkles, Headphones, Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import SupportSessionChat from "@/components/SupportSessionChat";
import { startSupportSession } from "@/hooks/use-support-session";

const isEligibleForQuickSupport = (user: any): boolean => {
  if (!user) return false;
  const vipLevel = user.vip?.vip_level || user.vip?.level || 0;
  const isHostAgent = (user.agency_id || 0) > 0;
  const typeUser = user.type_user || 0;
  const isAgentType = [2, 4, 5, 6].includes(typeUser);
  return vipLevel >= 5 || isHostAgent || isAgentType;
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

const TYPE_LABELS: Record<RequestType, string> = {
  admin_visit: "طلب إداري",
  report: "بلاغ مخالفة",
  complaint: "شكوى رسمية",
  direct_contact: "تواصل مباشر",
};

const QuickSupport: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const isSOS = new URLSearchParams(window.location.search).get("sos") === "1";

  const startChat = async (type: RequestType) => {
    if (!authUser) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    setStarting(true);
    setSelectedType(type);
    try {
      const notes = `${isSOS ? "🆘 طوارئ — " : ""}نوع الطلب: ${TYPE_LABELS[type]}`;
      const session = await startSupportSession({
        user_uuid: authUser.uuid,
        user_name: authUser.name,
        support_level: 1,
        request_type: type,
        notes,
      });
      if (session?.id) {
        setSessionId(session.id);
        toast.success("تم بدء المحادثة مع سوبر أدمن!");
      } else {
        toast.error("فشل بدء المحادثة");
      }
    } catch {
      toast.error("فشل الاتصال بالخادم");
    }
    setStarting(false);
  };

  const handleChatClose = () => {
    setSessionId(null);
    setSelectedType(null);
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

  // Active chat session
  if (sessionId) {
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

  return (
    <div className="mobile-container bg-background flex flex-col overflow-hidden" dir="rtl">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
        <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate(-1)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30">
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">رجوع</span>
        </motion.button>
        <h1 className="text-sm font-bold text-foreground">{isSOS ? "SOS دعم طوارئ" : "دعم سريع"}</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4 space-y-4">
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
              <p className="text-xs font-bold text-primary">محادثة مباشرة مع سوبر أدمن</p>
              <p className="text-[10px] text-muted-foreground">اختر نوع الطلب وسيتم توصيلك فوراً</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {serviceOptions.map((opt, i) => (
            <motion.button
              key={opt.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              onClick={() => startChat(opt.type)}
              disabled={starting}
              className={`p-4 rounded-xl bg-gradient-to-br ${opt.color} border text-right space-y-2 active:scale-95 transition-transform disabled:opacity-50`}
            >
              <div className="text-foreground">{opt.icon}</div>
              <p className="text-sm font-bold text-foreground">{opt.label}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{opt.description}</p>
            </motion.button>
          ))}
        </div>

        {starting && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">جاري الاتصال بسوبر أدمن...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickSupport;
