import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, Ticket, MessageSquare, Headphones, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LiveSupportChat from "@/components/LiveSupportChat";

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

  // Live chat state
  const [chatKey, setChatKey] = useState<string | null>(() => {
    if (!user) return null;
    return localStorage.getItem(`gala_normal_chat_${user.uuid}`) || null;
  });
  const [queuePosition, setQueuePosition] = useState(0);
  const [startingChat, setStartingChat] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);

  // Check existing chat on tab switch
  const checkExistingChat = useCallback(async () => {
    if (!user || !chatKey) return;
    try {
      const result = await supabase.functions.invoke("support-chat", {
        body: { action: "status", chat_key: chatKey },
      });
      if (!result.data?.ok || result.data?.status === "ended" || result.data?.status === "closed") {
        setChatKey(null);
        localStorage.removeItem(`gala_normal_chat_${user.uuid}`);
      }
    } catch {
      setChatKey(null);
      if (user) localStorage.removeItem(`gala_normal_chat_${user.uuid}`);
    }
  }, [user, chatKey]);

  React.useEffect(() => {
    if (activeTab === "live" && chatKey) checkExistingChat();
  }, [activeTab, chatKey, checkExistingChat]);

  const startLiveChat = async (issueType?: string) => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    setStartingChat(true);
    try {
      const result = await supabase.functions.invoke("support-chat", {
        body: { action: "start", user_uuid: user.uuid, user_name: user.name, chat_type: "normal" },
      });
      const data = result.data;
      if (data?.ok && data?.chat_key) {
        setChatKey(data.chat_key);
        setQueuePosition(data.queue_position || 0);
        localStorage.setItem(`gala_normal_chat_${user.uuid}`, data.chat_key);

        // Send issue type as first auto message
        if (issueType) {
          const typeLabel = TICKET_TYPES.find(t => t.id === issueType);
          await supabase.functions.invoke("support-chat", {
            body: {
              action: "send",
              chat_key: data.chat_key,
              message: `نوع المشكلة: ${typeLabel?.emoji || ""} ${typeLabel?.label || issueType}`,
              sender_type: "user",
              sender_name: user.name,
            },
          });
        }
        toast.success("تم بدء المحادثة!");
      } else {
        toast.error(data?.error || "فشل بدء المحادثة");
      }
    } catch {
      toast.error("فشل الاتصال بالخادم");
    }
    setStartingChat(false);
  };

  const handleChatBack = () => {
    setChatKey(null);
    setSelectedIssueType(null);
  };

  const handleChatEnded = () => {
    if (user) localStorage.removeItem(`gala_normal_chat_${user.uuid}`);
  };

  const tabs = [
    { id: "bot" as Tab, label: "الدعم الذكي", icon: Bot },
    { id: "live" as Tab, label: "محادثة مباشرة", icon: Headphones },
    { id: "tickets" as Tab, label: "التذاكر", icon: Ticket },
  ];

  return (
    <div className="mobile-container bg-background flex flex-col" dir="rtl" style={{ height: "100dvh", maxHeight: "100dvh" }}>
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

        {/* Tabs - only show when not in active live chat */}
        {!(activeTab === "live" && chatKey) && (
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
        <AnimatePresence mode="wait">
          {activeTab === "bot" ? (
            <motion.div key="bot" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden">
              <React.Suspense fallback={<TabLoader />}>
                <SupportChatEmbed />
              </React.Suspense>
            </motion.div>
          ) : activeTab === "live" ? (
            <motion.div key="live" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden">
              {chatKey ? (
                <LiveSupportChat
                  chatKey={chatKey}
                  userUuid={user?.uuid || ""}
                  userName={user?.name || ""}
                  chatType="normal"
                  queuePosition={queuePosition}
                  onBack={handleChatBack}
                  onEnded={handleChatEnded}
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
