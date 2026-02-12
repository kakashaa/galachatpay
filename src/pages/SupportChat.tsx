import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Send, Bot, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { levelFormats } from "@/data/idFormats";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/* ───────── types ───────── */
interface QuickReply {
  label: string;
  value: string;
}

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  quickReplies?: QuickReply[];
  timestamp: number;
}

/* ───────── helpers ───────── */
const uid = () => crypto.randomUUID();

const getFormatsForLevel = (level: number): string => {
  const match = levelFormats.find(
    (lf) => level >= lf.minLevel && level <= lf.maxLevel
  );
  if (!match) return "لا توجد صيغ متاحة";
  return match.groups
    .map((g) => `${g.digits} أرقام: ${g.patterns.join(" / ")}`)
    .join("\n");
};

const MAIN_MENU: QuickReply[] = [
  { label: "تغيير الآيدي", value: "change_id" },
  { label: "طلب إطار", value: "frame" },
  { label: "طلب دخولية", value: "entry" },
  { label: "صورة متحركة", value: "animated" },
  { label: "طلب VIP", value: "vip" },
  { label: "سحب الراتب", value: "salary" },
  { label: "هدية مخصصة", value: "gift" },
  { label: "مشكلة تقنية", value: "tech_issue" },
  { label: "تكلم مع إداري", value: "admin_talk" },
];

const TECH_ISSUES: QuickReply[] = [
  { label: "مشكلة بالصوت", value: "issue_audio" },
  { label: "مشكلة بالشحن", value: "issue_charge" },
  { label: "مشكلة بالدخول", value: "issue_login" },
  { label: "حسابي محظور", value: "issue_banned" },
  { label: "مشكلة ثانية", value: "issue_other" },
];

/* ───────── keyword map ───────── */
const KEYWORD_MAP: { keywords: string[]; topic: string }[] = [
  { keywords: ["آيدي", "ايدي", "id", "رقم", "تغيير"], topic: "change_id" },
  { keywords: ["إطار", "اطار", "فريم", "frame"], topic: "frame" },
  { keywords: ["دخولية", "دخول", "entry", "انيميشن"], topic: "entry" },
  { keywords: ["صورة", "متحركة", "gif", "بروفايل"], topic: "animated" },
  { keywords: ["vip", "في اي بي", "فيب", "مميز"], topic: "vip" },
  { keywords: ["راتب", "سحب", "كوين", "فلوس", "رصيد", "salary"], topic: "salary" },
  { keywords: ["هدية", "تصميم", "gift", "مخصص"], topic: "gift" },
  { keywords: ["مشكلة", "خطأ", "error", "bug", "صوت", "شحن", "محظور"], topic: "tech_issue" },
  { keywords: ["إداري", "اداري", "admin", "غرفة"], topic: "admin_talk" },
];

const findTopic = (text: string): string | null => {
  const lower = text.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.topic;
  }
  return null;
};

/* ───────── storage ───────── */
const STORAGE_KEY = "gala_support_chat";

const loadMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveMessages = (msgs: ChatMessage[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
};

/* ───────── component ───────── */
const SupportChat: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isGuest = !user;
  const chargerLevel = user?.level?.charger_level ?? 0;
  const userName = user?.name ?? "زائر";
  const userUuid = user?.uuid ?? "";

  /* show guest dialog on mount */
  useEffect(() => {
    if (isGuest) {
      setShowGuestDialog(true);
    }
  }, [isGuest]);

  /* scroll to bottom */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 60);
  }, []);

  /* add bot message with typing delay */
  const addBotMessage = useCallback(
    (text: string, quickReplies?: QuickReply[]) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => {
          const next = [
            ...prev,
            { id: uid(), role: "bot" as const, text, quickReplies, timestamp: Date.now() },
          ];
          saveMessages(next);
          return next;
        });
        scrollToBottom();
      }, 500);
    },
    [scrollToBottom]
  );

  /* welcome message */
  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) {
      setMessages(stored);
      scrollToBottom();
    } else {
      addBotMessage(
        `أهلاً ${userName}! 👋\nأنا مساعدك في غلا شات. كيف أقدر أساعدك؟`,
        MAIN_MENU
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── topic handler ── */
  const handleTopic = useCallback(
    (topic: string) => {
      switch (topic) {
        case "change_id": {
          const formats = getFormatsForLevel(chargerLevel);
          addBotMessage(
            `تقدر تغير آيديك مرة وحدة كل 10 مستويات 📝\n` +
              `لفلك الحالي: ${chargerLevel}\n` +
              `الصيغ المتاحة:\n${formats}\n\n` +
              `الشروط:\n` +
              `• لازم تكون لفل 20 على الأقل\n` +
              `• الآيدي الجديد لازم يطابق صيغة مستواك\n` +
              `• التغيير فوري ويجيك إشعار\n` +
              `• X = أي رقم، الحروف المتشابهة = نفس الرقم`,
            [
              { label: "غيّر آيديك الآن ←", value: "nav:/change-id" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        }
        case "frame":
          addBotMessage(
            `الإطارات تخلي بروفايلك مميز! 🖼️\n` +
              `عندنا إطارات حصرية تنحط على صورتك.\n\n` +
              `الشروط:\n` +
              `• لازم تكون لفل 30 على الأقل\n` +
              `• لفل 30+: 30 يوم\n` +
              `• لفل 40+: 60 يوم\n` +
              `• لفل 50+: دائم`,
            [
              { label: "اختر إطارك ←", value: "nav:/frames" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "entry":
          addBotMessage(
            `الدخولية تظهر لما تدخل أي غرفة! ✨\n` +
              `أنيميشن خاص فيك يشوفونه كل اللي بالغرفة.\n\n` +
              `الشروط:\n` +
              `• لفل 40 على الأقل\n` +
              `• لفل 30+: 30 يوم\n` +
              `• لفل 40+: 60 يوم\n` +
              `• لفل 50+: دائم`,
            [
              { label: "اختر دخوليتك ←", value: "nav:/entry-request" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "animated":
          addBotMessage(
            `حوّل صورتك لصورة متحركة GIF! 🎬\n` +
              `صورة بروفايل متحركة تميزك عن الكل.\n\n` +
              `الشروط:\n` +
              `• لفل 30+: 30 يوم\n` +
              `• لفل 40+: 60 يوم\n` +
              `• لفل 50+: دائمة`,
            [
              { label: "اطلب صورة متحركة ←", value: "nav:/animated-photo" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "vip": {
          const vipInfo =
            user?.vip && Object.keys(user.vip).length > 0
              ? JSON.stringify(user.vip)
              : "ما عندك VIP";
          addBotMessage(
            `VIP يعطيك مميزات حصرية! 👑\n` +
              `• إطار VIP مميز\n` +
              `• أولوية بالدعم\n` +
              `• مميزات إضافية حسب المستوى\n\n` +
              `VIP الحالي: ${vipInfo}\n` +
              `مرة وحدة شهرياً (7 أيام)`,
            [
              { label: "اطلب VIP ←", value: "nav:/request-vip" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        }
        case "salary": {
          const coins = user?.my_store?.coins ?? 0;
          addBotMessage(
            `رصيدك الحالي: ${coins.toLocaleString()} كوينز 💰\n\n` +
              `طرق السحب:\n` +
              `• سحب شهري: آخر يوم بالشهر\n` +
              `• سحب فوري: متاح دائماً (بيع الكوينز لداعم)\n` +
              `• سحب بكود النجوم: أدخل كود لسحب رصيدك`,
            [
              { label: "اسحب راتبك ←", value: "nav:/salary" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        }
        case "gift":
          addBotMessage(
            `اطلب تصميم هدية خاصة فيك! 🎁\n\n` +
              `أنواع الهدايا:\n` +
              `• هدية مخصصة (تصميم جديد)\n` +
              `• هدية دخولية\n` +
              `• إطار مخصص`,
            [
              { label: "اطلب هدية ←", value: "nav:/gift" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "tech_issue":
          addBotMessage("وش نوع المشكلة؟ 🔧", TECH_ISSUES);
          break;
        case "issue_audio":
        case "issue_charge":
        case "issue_login":
        case "issue_banned":
        case "issue_other": {
          const labels: Record<string, string> = {
            issue_audio: "مشكلة بالصوت",
            issue_charge: "مشكلة بالشحن",
            issue_login: "مشكلة بالدخول",
            issue_banned: "حساب محظور",
            issue_other: "مشكلة أخرى",
          };
          setWaitingFor(`tech_desc:${labels[topic] ?? topic}`);
          addBotMessage(`اكتب وصف المشكلة بالتفصيل وبنرسلها للدعم الفني 📝`);
          break;
        }
        case "admin_talk":
          setWaitingFor("room_id");
          addBotMessage(
            `تبي تتكلم مع إداري مباشرة؟ 🎙️\nاكتب آيدي الغرفة اللي تبي الإداري يدخلها وبنرسل لهم إشعار فوري.`
          );
          break;
        case "main_menu":
          addBotMessage("كيف أقدر أساعدك؟ 😊", MAIN_MENU);
          break;
        default:
          addBotMessage(
            "ما فهمت سؤالك 😅 جرب تختار من الخيارات:",
            MAIN_MENU
          );
      }
    },
    [addBotMessage, chargerLevel, user]
  );

  /* ── send user message ── */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        text: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, userMsg];
        saveMessages(next);
        return next;
      });
      setInput("");
      scrollToBottom();

      // handle waiting states
      if (waitingFor === "room_id") {
        setWaitingFor(null);
        // submit admin support request
        try {
          const res = await supabase.functions.invoke("gala-actions", {
            body: {
              action: "submit-request",
              uuid: userUuid,
              request_type: "admin_support",
              description: `طلب تكلم مع إداري - غرفة: ${text.trim()}`,
              room_id: text.trim(),
            },
          });
          if (res.error) throw res.error;
          addBotMessage(
            "✅ تم إرسال طلبك! إداري بيدخل غرفتك قريباً.",
            [{ label: "القائمة الرئيسية", value: "main_menu" }]
          );
        } catch {
          addBotMessage(
            "❌ حصل خطأ بإرسال الطلب. حاول مرة ثانية.",
            [{ label: "تكلم مع إداري", value: "admin_talk" }, { label: "القائمة الرئيسية", value: "main_menu" }]
          );
        }
        return;
      }

      if (waitingFor?.startsWith("tech_desc:")) {
        const issueType = waitingFor.replace("tech_desc:", "");
        setWaitingFor(null);
        try {
          const res = await supabase.functions.invoke("gala-actions", {
            body: {
              action: "submit-request",
              uuid: userUuid,
              request_type: "support",
              description: `${issueType}: ${text.trim()}`,
            },
          });
          if (res.error) throw res.error;
          addBotMessage(
            "✅ تم إرسال مشكلتك للدعم الفني! بنتواصل معك قريباً.",
            [{ label: "القائمة الرئيسية", value: "main_menu" }]
          );
        } catch {
          addBotMessage(
            "❌ حصل خطأ بإرسال الطلب. حاول مرة ثانية.",
            [{ label: "مشكلة تقنية", value: "tech_issue" }, { label: "القائمة الرئيسية", value: "main_menu" }]
          );
        }
        return;
      }

      // keyword matching
      const topic = findTopic(text);
      if (topic) {
        handleTopic(topic);
      } else {
        addBotMessage(
          "ما فهمت سؤالك 😅 جرب تختار من الخيارات:",
          MAIN_MENU
        );
      }
    },
    [waitingFor, addBotMessage, handleTopic, userUuid, scrollToBottom]
  );

  /* ── quick reply click ── */
  const handleQuickReply = (value: string) => {
    if (value.startsWith("nav:")) {
      navigate(value.replace("nav:", ""));
      return;
    }
    // add user message for the label
    const label = MAIN_MENU.find((q) => q.value === value)?.label
      ?? TECH_ISSUES.find((q) => q.value === value)?.label
      ?? value;
    const userMsg: ChatMessage = { id: uid(), role: "user", text: label, timestamp: Date.now() };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      saveMessages(next);
      return next;
    });
    scrollToBottom();
    handleTopic(value);
  };

  /* ── clear chat ── */
  const clearChat = () => {
    setMessages([]);
    saveMessages([]);
    setWaitingFor(null);
    addBotMessage(
      `أهلاً ${userName}! 👋\nأنا مساعدك في غلا شات. كيف أقدر أساعدك؟`,
      MAIN_MENU
    );
  };

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col" dir="rtl">
      {/* header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10"
          >
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">الدعم الذكي</h1>
            <span className="text-[10px] text-muted-foreground">متصل الآن</span>
          </div>
        </div>
        <button onClick={clearChat} className="text-[11px] text-destructive font-bold">
          مسح المحادثة
        </button>
      </header>

      {/* messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 pb-24 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            {/* bubble */}
            <div className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "bot"
                    ? "bg-primary/15 text-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
            {/* quick replies */}
            {msg.quickReplies && msg.quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 justify-end">
                {msg.quickReplies.map((qr) => (
                  <button
                    key={qr.value}
                    onClick={() => handleQuickReply(qr.value)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold border border-primary/30 bg-primary/10 text-primary active:scale-95 transition-transform"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* typing indicator */}
        {isTyping && (
          <div className="flex justify-end">
            <div className="bg-primary/15 rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* input */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2 bg-background/80 backdrop-blur-xl border-t border-border/20">
        <div className="mobile-container mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl px-3 py-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={waitingFor === "room_id" ? "اكتب آيدي الغرفة..." : waitingFor?.startsWith("tech_desc") ? "اوصف المشكلة..." : "اكتب رسالتك..."}
              className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
              dir="rtl"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-90"
            >
              <Send className="w-4 h-4 text-primary-foreground rotate-180" />
            </button>
          </form>
        </div>
      </div>

      {/* guest login dialog */}
      <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
        <DialogContent className="max-w-xs rounded-2xl text-center">
          <DialogTitle className="text-base font-bold">سجّل دخولك أولاً</DialogTitle>
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              لتتمكن من استخدام كل الخدمات يجب عليك تسجيل الدخول بحسابك في غلا شات
            </p>
            <Button
              onClick={() => {
                setShowGuestDialog(false);
                navigate("/");
              }}
              className="w-full gold-gradient text-primary-foreground font-bold h-11"
            >
              تسجيل الدخول
            </Button>
            <button
              onClick={() => setShowGuestDialog(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              متابعة التصفح
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportChat;
