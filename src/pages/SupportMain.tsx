import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, Ticket, MessageSquare, Headphones, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SupportSessionChat from "@/components/SupportSessionChat";
import { startSupportSession } from "@/hooks/use-support-session";

const SupportChatEmbed = React.lazy(() => import("./SupportChatEmbed"));
const SupportTicketsEmbed = React.lazy(() => import("./SupportTicketsEmbed"));

type Tab = "bot" | "tickets" | "live";

const TICKET_TYPES = [
  { id: "tech", label: "مشكلة تقنية", emoji: "🔧" },
  { id: "balance", label: "رصيد/شحن", emoji: "💰" },
  { id: "account", label: "حساب", emoji: "👤" },
  { id: "gifts", label: "هدايا", emoji: "🎁" },
  { id: "voice", label: "صوت/غرف", emoji: "🎙️" },
  { id: "report", label: "بلاغ", emoji: "🚨" },
  { id: "inquiry", label: "استفسار", emoji: "❓" },
];

const SupportMain: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("bot");
  const [quickSupportDismissed, setQuickSupportDismissed] = useState(false);

  const isEligibleForQuickSupport = (() => {
    if (!user) return false;
    const vipLevel = (user as any).vip?.vip_level || (user as any).vip?.level || 0;
    const isHostAgent = ((user as any).agency_id || 0) > 0;
    return vipLevel >= 6 || isHostAgent;
  })();

  // New support session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);

  const startLiveChat = async (issueType?: string) => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    setStartingChat(true);
    try {
      const typeLabel = issueType ? TICKET_TYPES.find(t => t.id === issueType) : null;
      const notes = typeLabel ? `نوع المشكلة: ${typeLabel.emoji} ${typeLabel.label}` : undefined;

      const session = await startSupportSession({
        user_uuid: user.uuid,
        user_name: user.name,
        support_level: 1,
        request_type: issueType || "general",
        notes,
      });

      if (session?.id) {
        setSessionId(session.id);
        toast.success("تم بدء المحادثة!");
      } else {
        toast.error("فشل بدء المحادثة");
      }
    } catch {
      toast.error("فشل الاتصال بالخادم");
    }
    setStartingChat(false);
  };

  const handleChatClose = () => {
    setSessionId(null);
    setSelectedIssueType(null);
  };

  const tabs = [
    { id: "bot" as Tab, label: "الدعم الذكي", icon: Bot },
    { id: "live" as Tab, label: "محادثة مباشرة", icon: Headphones },
    { id: "tickets" as Tab, label: "التذاكر", icon: Ticket },
  ];

  return (
    <div className="mobile-container bg-background flex flex-col" dir="rtl">
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-colors">
            <ArrowRight className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">رجوع</span>
          </motion.button>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-sm font-bold text-foreground">مركز الدعم</h1>
          </motion.div>
          <div className="w-16" />
        </div>

        {/* Tabs - only show when not in active session */}
        {!(activeTab === "live" && sessionId) && (
          <div className="flex gap-2 px-4 pb-3">
            {tabs.map((tab, i) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive ? "text-primary-foreground" : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                  }`}
                >
                  {isActive && (
                    <motion.div layoutId="activeTab" className="absolute inset-0 gold-gradient rounded-xl" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Quick Support Alert for VIP6 / Host Agents */}
        {isEligibleForQuickSupport && !quickSupportDismissed && activeTab !== "live" && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-3 rounded-2xl p-4 space-y-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-sm font-bold" style={{ color: 'hsl(38 92% 50%)' }}>
              {(user as any)?.vip?.vip_level >= 6 || (user as any)?.vip?.level >= 6 ? "أنت تملك VIP 6" : "أنت وكيل مضيفين"} — تقدر تتواصل مباشرة مع سوبر أدمن!
            </p>
            <button onClick={() => navigate("/quick-support")} className="w-full py-2.5 rounded-xl font-bold text-sm text-black" style={{ background: 'hsl(38 92% 50%)' }}>
              نعم، وصّلني بسوبر أدمن
            </button>
            <button onClick={() => setQuickSupportDismissed(true)} className="w-full py-2 rounded-xl text-xs text-muted-foreground" style={{ background: 'rgba(255,255,255,0.05)' }}>
              لا، أكمل بالدعم العادي
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "bot" ? (
            <motion.div key="bot" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden">
              <React.Suspense fallback={<TabLoader />}>
                <SupportChatEmbed />
              </React.Suspense>
            </motion.div>
          ) : activeTab === "live" ? (
            <motion.div key="live" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden">
              {sessionId ? (
                <SupportSessionChat
                  sessionId={sessionId}
                  userUuid={user?.uuid || ""}
                  userName={user?.name || ""}
                  senderType="user"
                  showTimer={true}
                  onClose={handleChatClose}
                />
              ) : (
                <LiveChatStarter
                  issueTypes={TICKET_TYPES}
                  selectedType={selectedIssueType}
                  onSelectType={setSelectedIssueType}
                  onStart={startLiveChat}
                  starting={startingChat}
                />
              )}
            </motion.div>
          ) : (
            <motion.div key="tickets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto">
              <React.Suspense fallback={<TabLoader />}>
                <SupportTicketsEmbed />
              </React.Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── Live Chat Starter ─── */
function LiveChatStarter({ issueTypes, selectedType, onSelectType, onStart, starting }: {
  issueTypes: { id: string; label: string; emoji: string }[];
  selectedType: string | null;
  onSelectType: (t: string | null) => void;
  onStart: (issueType?: string) => void;
  starting: boolean;
}) {
  return (
    <div className="px-4 py-4 space-y-4 overflow-y-auto">
      {/* Support tiers */}
      <div className="space-y-2">
        <div className="glass-card p-3 flex items-center gap-3 border border-border/20">
          <span className="text-lg">🆓</span>
          <div><p className="text-xs font-bold text-foreground">عادي: مجاني</p><p className="text-[10px] text-muted-foreground">24-48 ساعة</p></div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3 border border-primary/20 bg-primary/5">
          <span className="text-lg">⚡</span>
          <div><p className="text-xs font-bold text-primary">VIP 4+: أسرع</p><p className="text-[10px] text-muted-foreground">1-4 ساعات</p></div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3 border border-primary/30 bg-primary/10">
          <span className="text-lg">🔥</span>
          <div><p className="text-xs font-bold text-primary">VIP 6: فوري</p><p className="text-[10px] text-muted-foreground">أدمن يدخل غرفتك</p></div>
        </div>
      </div>

      {/* Issue type selector */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-foreground">اختر نوع المشكلة (اختياري):</p>
        <div className="grid grid-cols-2 gap-2">
          {issueTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectType(selectedType === t.id ? null : t.id)}
              className={`p-2.5 rounded-xl text-[11px] font-semibold border transition-all ${
                selectedType === t.id ? "border-primary bg-primary/10 text-primary" : "border-border/30 bg-card/50 text-muted-foreground"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => onStart(selectedType || undefined)}
        disabled={starting}
        className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
      >
        {starting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Headphones className="w-5 h-5" />
            بدء محادثة مباشرة
          </>
        )}
      </button>
    </div>
  );
}

const TabLoader = () => (
  <div className="flex-1 flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

export default SupportMain;
