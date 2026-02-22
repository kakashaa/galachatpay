import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Send, Bot, AlertCircle, Edit2, Frame, LogIn, Image, Crown, Wallet, Gift, Shield, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { levelFormats } from "@/data/idFormats";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/* ───────── types ───────── */
interface QuickReply {
  label: string;
  value: string;
  icon?: React.ElementType;
}

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  quickReplies?: QuickReply[];
  timestamp: number;
}

interface FeedbackData {
  rating: number;
  comment: string;
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

/* ───────── time-based greetings ───────── */
const getTimeBasedGreeting = (
  userName: string,
  isVip: boolean,
  isGuest: boolean
): string => {
  const hour = new Date().getHours();
  let timeGreeting = "";
  let emoji = "";

  if (hour >= 5 && hour < 12) {
    // صباح
    timeGreeting = "صباح الخير";
    emoji = "🌅";
  } else if (hour >= 12 && hour < 17) {
    // بعد الظهر
    timeGreeting = "ظهرك بألف خير";
    emoji = "☀️";
  } else if (hour >= 17 && hour < 21) {
    // مساء
    timeGreeting = "مساء الخير";
    emoji = "🌆";
  } else {
    // ليل
    timeGreeting = "ليل الخير";
    emoji = "🌙";
  }

  if (isGuest) {
    return `${timeGreeting}! ${emoji}\nأنا مساعدك في غلا شات. كيف أقدر أساعدك؟`;
  } else if (isVip) {
    return `${timeGreeting} يا عضو VIP! 👑✨\n${userName}، شكراً على ولائك!\n\nأنا هنا لأخدمك بأفضل طريقة. كيف أقدر أساعدك؟`;
  } else {
    return `${timeGreeting} ${userName}! ${emoji}\nأنا مساعدك في غلا شات. كيف أقدر أساعدك؟`;
  }
};

/* ───────── FAQ database ───────── */
interface FAQ {
  question: string;
  answer: string;
  keywords: string[];
  topic?: string;
}

const FAQ_LIST: FAQ[] = [
  {
    question: "كيف أغير آيديي؟",
    answer: "تقدر تغير آيديك من صفحة تغيير الآيدي. لازم تكون لفل 20 على الأقل، والتغيير متاح مرة وحدة كل 10 مستويات.",
    keywords: ["آيدي", "ايدي", "id", "تغيير", "رقم", "معرف"],
    topic: "change_id",
  },
  {
    question: "كيف أطلب إطار؟",
    answer: "الإطارات تتطلب لفل 30 على الأقل. لفل 30+ (30 يوم)، لفل 40+ (60 يوم)، لفل 50+ (دائم).",
    keywords: ["إطار", "اطار", "فريم", "frame"],
    topic: "frame",
  },
  {
    question: "كيف أسحب راتبي؟",
    answer: "عندك طريقتين:\n🗓️ سحب شهري: يفتح آخر يوم بالشهر فقط (30 أو 31)، طلب واحد في الشهر، ممنوع تقسيم الراتب.\n⚡ سحب فوري: متاح دائماً عبر حسابات الدفع (CashApp, Zelle, Chime, Apple Pay, الكريمي, الراجحي).\nلازم الداعم يحول ويرسلك إيصال التحويل.\n\nسعر الصرف: $1 = 7,500 كونز للمستخدم، $1 = 8,500 كونز لوكيل الشحن.",
    keywords: ["راتب", "سحب", "كوين", "فلوس", "رصيد", "تحويل", "بنك"],
    topic: "salary",
  },
  {
    question: "متى يفتح السحب الشهري؟",
    answer: "السحب الشهري يفتح فقط في اليوم الأخير من الشهر (30 أو 31). طلب واحد فقط! ممنوع تقسيم الراتب على دفعتين. استخدم السحب الفوري إذا تبي تسحب قبل.",
    keywords: ["شهري", "موعد", "يفتح", "متى"],
  },
  {
    question: "كيف أسحب فوري؟",
    answer: "السحب الفوري:\n1️⃣ اختر 'سحب فوري' من صفحة السحب\n2️⃣ اختر دولة الداعم (أمريكا/اليمن/السعودية)\n3️⃣ شارك تفاصيل الحساب مع الداعم\n4️⃣ الداعم يحول ويرسلك الإيصال\n5️⃣ ارفع الإيصال مع تفاصيل الطلب\n\nالحسابات المتاحة: CashApp, Zelle, Chime, Apple Pay, الكريمي (ريال/دولار/يمني), الراجحي.",
    keywords: ["فوري", "instant", "سريع", "حول", "ايصال"],
    topic: "salary",
  },
  {
    question: "كيف أطلب هدية مخصصة؟",
    answer: "الهدايا المخصصة متاحة من لفل 40+. ارفع فيديو الهدية (المدة حسب لفلك: 40=11ث، 50=13ث، 60=15ث، 70=18ث، 80+=20ث).",
    keywords: ["هدية", "مخصص", "تصميم", "فيديو", "gift"],
    topic: "gift",
  },
  {
    question: "كيف أطلب دخولية؟",
    answer: "الدخولية تتطلب لفل 40 على الأقل. تظهر كأنيميشن لما تدخل أي غرفة.",
    keywords: ["دخولية", "دخول", "entry", "انيميشن"],
    topic: "entry",
  },
  {
    question: "كيف أطلب صورة متحركة؟",
    answer: "ارفع ملف GIF (حتى 10 ميجابايت). المدة حسب لفلك: 30+ (30 يوم)، 40+ (60 يوم)، 50+ (دائمة). الطلب متاح مرة وحدة فقط.",
    keywords: ["صورة", "متحركة", "gif", "animated"],
    topic: "animated",
  },
  {
    question: "وش هي النجوم وكيف أستخدمها؟",
    answer: "النجوم عملة الموقع للإطارات والدخوليات. تُمنح شهرياً حسب لفل الشحن. تقدر تهديها أو تحولها لكاش (10 نجوم = 50 دولار).",
    keywords: ["نجوم", "نجمة", "star", "عملة"],
  },
  {
    question: "كيف أطلب VIP؟",
    answer: "VIP يعطيك إطار مميز وأولوية بالدعم. الطلب متاح مرة شهرياً لمدة 7 أيام.",
    keywords: ["vip", "في اي بي", "فيب", "مميز"],
    topic: "vip",
  },
  {
    question: "حسابي محظور، وش أسوي؟",
    answer: "تواصل مع الدعم الفني عبر 'مشكلة تقنية' > 'حسابي محظور' واكتب تفاصيل المشكلة.",
    keywords: ["محظور", "حظر", "banned", "موقوف"],
    topic: "tech_issue",
  },
  {
    question: "كيف أتكلم مع إداري؟",
    answer: "اختر 'تكلم مع إداري' واكتب رقم الغرفة. بيوصلهم إشعار فوري.",
    keywords: ["إداري", "اداري", "admin", "غرفة"],
    topic: "admin_talk",
  },
  {
    question: "كيف أشوف طلباتي السابقة؟",
    answer: "روح لصفحة 'طلباتي' من القائمة الرئيسية. فيها كل سجلاتك مقسمة حسب النوع.",
    keywords: ["طلبات", "سابقة", "سجل", "تاريخ", "متابعة"],
  },
  // ── Agency & Policy FAQs ──
  {
    question: "كيف أفتح وكالة؟",
    answer: "لفتح وكالة مضيفين: أحضر 3 داعمين و10 مستخدمين. يمكن فتحها بأقل إذا ضمنت تحقيق التارجت. تعبئة: اسم الوكالة / رقم الهاتف / ID الوكيل / الاسم الحقيقي.\n\nيتم تقييم الوكالة خلال شهر، وإذا لم تحقق 500$ على الأقل يحق للإدارة سحبها.",
    keywords: ["وكالة", "وكيل", "فتح", "انشاء", "agency"],
    topic: "policy",
  },
  {
    question: "وش هي مكافآت الوكالة؟",
    answer: "🎁 أول شهر: VIP4 للوكيل والداعمين (أسبوع) + VIP3 لـ5 مشرفين + VIP2 لـ10 مستخدمين.\n🎉 حفل الافتتاح: إذا تم دعم 8 مليون كونز = مليون كونز مكافأة + VIP5 (7 أيام).\n🏆 مراكز التميز: المراكز الثلاثة الأولى = بنر + وسام + VIP5 للوكيل + VIP4 لـ3 مشرفين + VIP3 لـ8 مستخدمين.",
    keywords: ["مكافأة", "مكافات", "حفل", "افتتاح", "تميز", "مركز"],
    topic: "policy",
  },
  {
    question: "كيف تتحول الهدايا للألماس؟",
    answer: "عند استلام المستخدم للهدايا داخل التطبيق يتم إضافة نفس القيمة لمحفظة الوكالة تحت مسمى 'الألماس'.\n\nكأس الروم: يتم احتساب الدعم ومكافأة الوكيل بنسبة معينة أسبوعياً.\nهدايا الحظ: تحتسب في تارجت المضيف بنسبة 10%.",
    keywords: ["الماس", "هدايا", "محفظة", "كاس", "روم", "حظ"],
    topic: "policy",
  },
  {
    question: "وش شروط النزول من الوكالة؟",
    answer: "🔴 إذا عندك رصيد مستحق: ممنوع تنزيلك إلا بعد تسوية الرصيد واستلام الراتب كاملاً.\n🟢 بدون رصيد: التنزيل فقط من تاريخ 1 إلى 5 من الشهر.\n⚠️ لا يحق للوكيل رفض تنزيل مستخدم ليس عليه رصيد ولا إجباره على البقاء.",
    keywords: ["نزول", "طرد", "تنزيل", "وكالة", "خروج"],
    topic: "policy",
  },
  {
    question: "كم رفع الراتب لوكيل الشحن؟",
    answer: "يتم رفع الراتب من تاريخ 1 إلى 5 من الشهر. على وكيل الشحن تسليمه في مدة أقصاها تاريخ 10. أي تأخير يعرضه للمسائلة.\n\nعند عدم إكمال الأيام/الساعات: خصم 20% من الراتب الشهري.",
    keywords: ["وكيل شحن", "رفع راتب", "تسليم", "تاخير"],
    topic: "policy",
  },
  {
    question: "وش سياسة وكالات الشحن؟",
    answer: "جدول الشحن:\n$1,000 = 8.5 مليون كونز + بونص $100 للوكيل\n$3,000 = 25.5 مليون + بونص $360\n$5,000 = 42.5 مليون + بونص $750\n$10,000 = 85 مليون + بونص $1,800\n\n⚠️ ممنوع بيع أسعار صرف منخفضة/مرتفعة جداً. ممنوع خداع المستخدمين وإلا إنهاء التعاون.",
    keywords: ["شحن", "وكيل شحن", "بونص", "charge", "سعر صرف"],
    topic: "policy",
  },
  {
    question: "وش هي قواعد مكافأة الغرفة؟",
    answer: "مكافأة صاحب الغرفة أسبوعياً:\nLV1: هدف 500K = مكافأة 20K\nLV2: هدف 1M = مكافأة 40K\nLV3: هدف 3M = مكافأة 90K\nLV4: هدف 5M = مكافأة 145K\nLV5: هدف 7M = مكافأة 200K\nLV6: هدف 10M = مكافأة 290K\nLV7: هدف 16M = مكافأة 450K\nLV8: هدف 25M = مكافأة 750K",
    keywords: ["غرفة", "مكافأة غرفة", "كاس", "اسبوعي", "هدف"],
    topic: "policy",
  },
  {
    question: "وش جدول رواتب المضيفين؟",
    answer: "جدول المضيفين (أمثلة):\n💎250K ألماس = $22 مضيف / $4 وكالة / 10 أيام\n💎1M = $87 / $16\n💎5M = $405 / $80\n💎10M = $805 / $160\n💎25M = $1,950 / $400\n💎50M = $3,900 / $750\n💎100M = $7,700 / $1,250\n💎200M = $15,450 / $2,600\n\nلمزيد من التفاصيل شوف صفحة السياسة 👇",
    keywords: ["جدول", "تارجت", "رواتب", "مضيف", "الماس", "target"],
    topic: "policy",
  },
  {
    question: "وين أشوف كل السياسات؟",
    answer: "كل سياسات التطبيق (الوكالات، الرواتب، جداول التارجت، وكالات الشحن، مكافآت الغرف) موجودة في صفحة السياسة. اضغط الزر تحت 👇",
    keywords: ["سياسة", "سياسات", "قوانين", "شروط", "قواعد", "policy"],
    topic: "policy",
  },
];

/* ───────── normalize Arabic text ───────── */
const normalizeArabic = (text: string): string => {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ه/g, "ة")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

const searchFAQ = (query: string): FAQ | null => {
  const normalized = normalizeArabic(query);
  let bestMatch: FAQ | null = null;
  let bestScore = 0;
  for (const faq of FAQ_LIST) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (normalized.includes(normalizeArabic(kw))) score += 2;
    }
    const qWords = faq.question.split(/\s+/);
    for (const w of qWords) {
      if (w.length > 2 && normalized.includes(normalizeArabic(w))) score += 1;
    }
    if (score > bestScore) { bestScore = score; bestMatch = faq; }
  }
  return bestScore >= 2 ? bestMatch : null;
};

const MAIN_MENU: QuickReply[] = [
  { label: "كم راتبي حسب لفلي؟", value: "salary_table", icon: Wallet },
  { label: "وش جدول رواتب المضيفين؟", value: "policy_salaries", icon: BookOpen },
  { label: "وش سياسة وكالات الشحن؟", value: "policy_charge", icon: Wallet },
  { label: "كيف أفتح وكالة؟", value: "policy_agency", icon: Crown },
  { label: "وش مكافآت الغرفة؟", value: "policy_room", icon: Gift },
  { label: "كيف أسحب راتبي؟", value: "salary", icon: Wallet },
  { label: "مشكلة تقنية", value: "tech_issue", icon: AlertCircle },
  { label: "تكلم مع إداري", value: "admin_talk", icon: Shield },
];

const TECH_ISSUES: QuickReply[] = [
  { label: "مشكلة بالصوت", value: "issue_audio", icon: AlertCircle },
  { label: "مشكلة بالشحن", value: "issue_charge", icon: AlertCircle },
  { label: "مشكلة بالدخول", value: "issue_login", icon: AlertCircle },
  { label: "حسابي محظور", value: "issue_banned" },
  { label: "مشكلة ثانية", value: "issue_other" },
];

/* ───────── intent detection (enhanced) ───────── */
const INTENT_MAP: { keys: string[]; intent: string }[] = [
  { keys: ["سلام", "اسلام", "عليكم", "مرحبا", "هلا", "هاي", "اهلا", "مساء", "صباح", "هلو", "hello", "hi", "hey"], intent: "greeting" },
  { keys: ["ايدي", "ايد", "رقم", "غير", "تغيير", "id", "change"], intent: "change_id" },
  { keys: ["اطار", "فريم", "frame", "برواز"], intent: "frame" },
  { keys: ["دخول", "دخولية", "انيميشن", "entry", "دخوليات"], intent: "entry" },
  { keys: ["صور", "صورة", "متحرك", "gif", "بروفايل", "افتار", "avatar"], intent: "animated" },
  { keys: ["vip", "في اي بي", "فياب", "تاج", "فيب"], intent: "vip" },
  { keys: ["راتب", "سحب", "فلوس", "كوين", "رصيد", "مال", "حول", "تحويل", "salary", "كاش", "نقود"], intent: "salary" },
  { keys: ["هدي", "هدية", "gift", "تصميم", "هدايا"], intent: "gift" },
  { keys: ["مشكل", "مساعد", "خرب", "يشتغل", "صوت", "بث", "لاق", "معلق", "باق", "bug"], intent: "tech_issue" },
  { keys: ["اداري", "مسوول", "مدير", "ادمن", "admin", "تكلم مع"], intent: "admin_talk" },
  { keys: ["شحن", "اشحن", "بطاقة", "charge", "كيف اشحن"], intent: "recharge" },
  { keys: ["حظر", "محظور", "بان", "ban", "محضور"], intent: "banned" },
  { keys: ["شكر", "مشكور", "ثانكس", "thanks", "يعطيك العافية", "تسلم"], intent: "thanks" },
  { keys: ["قائمة", "رجوع", "menu", "رجع", "البداية"], intent: "main_menu" },
  { keys: ["سياسة", "سياسات", "قوانين", "شروط", "قواعد", "وكالة", "وكيل", "تارجت", "جدول", "policy", "مكافأة غرفة", "بونص"], intent: "policy" },
  { keys: ["دعم سريع", "اتحدث", "اتكلم", "تحدث", "كلم", "ابي احد", "ابي شخص", "بشر", "موظف", "لايف", "live", "chat support", "quick support", "تواصل مع", "ابغا اتكلم", "ابي اكلم"], intent: "live_support" },
];

const findIntent = (text: string): string | null => {
  const normalized = normalizeArabic(text);
  for (const { keys, intent } of INTENT_MAP) {
    if (keys.some((k) => normalized.includes(normalizeArabic(k)))) return intent;
  }
  return null;
};

/* ───────── storage removed: chat always starts fresh ───────── */

/* ───────── component ───────── */
const SupportChat: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData>({ rating: 0, comment: "" });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
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

  /* warn before browser back/refresh */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (messages.length > 1) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [messages]);

  /* auto-clear on unmount */
  useEffect(() => {
    return () => {
      setMessages([]);
      setWaitingFor(null);
    };
  }, []);

  /* handle back with confirmation */
  const handleBack = () => {
    if (messages.length > 1) {
      setShowLeaveDialog(true);
    } else {
      navigate("/dashboard");
    }
  };

  const confirmLeave = () => {
    setMessages([]);
    setWaitingFor(null);
    setShowLeaveDialog(false);
    navigate("/dashboard");
  };

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
        setMessages((prev) => [
            ...prev,
            { id: uid(), role: "bot" as const, text, quickReplies, timestamp: Date.now() },
          ]);
        scrollToBottom();
      }, 500);
    },
    [scrollToBottom]
  );

  /* welcome message — always start fresh */
  useEffect(() => {
    const isVip = user?.vip && Object.keys(user.vip).length > 0;
    const welcomeMessage = getTimeBasedGreeting(userName, isVip, isGuest);
    addBotMessage(welcomeMessage, MAIN_MENU);
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
           const usd = user?.my_store?.usd ?? 0;
           addBotMessage(
             `💰 **رصيدك الحالي:**\n` +
               `${coins.toLocaleString()} كوينز | ${usd.toLocaleString()} دولار\n\n` +
               `**طرق السحب:**\n` +
               `🗓️ سحب شهري: آخر يوم بالشهر\n` +
               `⚡ سحب فوري: متاح دائماً\n` +
               `⭐ سحب النجوم: بكود خاص\n\n` +
               `اختر طريقة السحب اللي تناسبك 👇`,
             [
               { label: "اسحب راتبك ←", value: "nav:/salary" },
               { label: "القائمة الرئيسية", value: "main_menu" },
             ]
           );
           break;
         }
        case "gift":
           addBotMessage(
             `🎁 **اطلب تصميم هدية خاصة فيك!**\n\n` +
               `**أنواع الهدايا:**\n` +
               `🎬 هدية فيديو مخصصة (تصميم جديد)\n` +
               `✨ هدية دخولية (تظهر فوق رأسك)\n` +
               `🖼️ إطار مخصص (يزين بروفايلك)\n\n` +
               `الهدايا تميزك عن الكل وتخليك لا تُنسى 💎`,
             [
               { label: "اطلب هدية ←", value: "nav:/gift" },
               { label: "القائمة الرئيسية", value: "main_menu" },
             ]
           );
           break;
        case "tech_issue":
           addBotMessage(
             `🔧 **وش نوع المشكلة اللي عندك؟**\n\n` +
               `اختر من القائمة وبنساعدك بسرعة! 👇`,
             TECH_ISSUES
           );
           break;
         case "issue_audio":
         case "issue_charge":
         case "issue_login":
         case "issue_banned":
         case "issue_other": {
           const labels: Record<string, string> = {
             issue_audio: "مشكلة بالصوت 🔊",
             issue_charge: "مشكلة بالشحن ⚡",
             issue_login: "مشكلة بالدخول 🔐",
             issue_banned: "حساب محظور 🚫",
             issue_other: "مشكلة أخرى 📋",
           };
           const issueLabel = labels[topic] ?? topic;
           setWaitingFor(`tech_desc:${issueLabel}`);
           addBotMessage(
             `🆘 **${issueLabel}**\n\n` +
               `وصّف المشكلة بالتفصيل وبنرسلها للدعم الفني فوري. ` +
               `كلما كانت التفاصيل أدق، كلما كنا أسرع بالحل 📝`,
             [{ label: "← رجوع للخيارات", value: "tech_issue" }]
           );
           break;
         }
        case "admin_talk":
           setWaitingFor("room_id");
           addBotMessage(
             `🎙️ **تبي تتكلم مع إداري مباشرة؟**\n\n` +
               `اكتب رقم الغرفة اللي تبي الإداري يدخلها وبنرسل لهم إشعار فوري.` +
               `\n\nالإداري بيدخل غرفتك قريباً جداً ⏱️`,
             [{ label: "← رجوع للخيارات", value: "main_menu" }]
           );
           break;
        case "show_faq": {
          const faqText = FAQ_LIST.map((f, i) => `${i + 1}. ${f.question}`).join("\n");
          addBotMessage(
            `📖 **الأسئلة الشائعة:**\n\n${faqText}\n\n✍️ اكتب سؤالك أو رقم السؤال وبجاوبك فوراً!`,
            [{ label: "القائمة الرئيسية", value: "main_menu" }]
          );
          break;
        }
        case "policy":
          addBotMessage(
            `📋 **سياسة التطبيق**\n\n` +
              `🏢 فتح الوكالات: 3 داعمين + 10 مستخدمين، تارجت 500$ شهرياً\n` +
              `💵 الرواتب: $1 = 7,500 كونز (مستخدم) / 8,500 (وكيل شحن)\n` +
              `📅 رفع الراتب: من 1 إلى 5 من الشهر\n` +
              `⚠️ خصم 20% عند عدم إكمال الأيام\n` +
              `🏆 مكافأة الغرفة: أسبوعياً من LV1 (20K) إلى LV8 (750K)\n\n` +
              `لتفاصيل الجداول والقواعد الكاملة 👇`,
            [
              { label: "شوف كل السياسات ←", value: "nav:/policy" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "salary_table": {
          addBotMessage(
            `💰 **سعر الصرف:**\n` +
              `$1 = 7,500 كونز (مستخدم عادي)\n` +
              `$1 = 8,500 كونز (وكيل شحن)\n\n` +
              `**طرق السحب:**\n` +
              `🗓️ شهري: آخر يوم بالشهر فقط (طلب واحد)\n` +
              `⚡ فوري: متاح دائماً عبر حسابات الدفع\n` +
              `⭐ نجوم: 10 نجوم = $50\n\n` +
              `📅 رفع الراتب: من 1 إلى 5 من الشهر\n` +
              `⚠️ خصم 20% عند عدم إكمال الأيام/الساعات`,
            [
              { label: "اسحب راتبك ←", value: "nav:/salary" },
              { label: "شوف جدول الرواتب", value: "policy_salaries" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        }
        case "policy_salaries":
          addBotMessage(
            `📊 **جدول رواتب المضيفين:**\n\n` +
              `💎 250K ألماس = $22 مضيف / $4 وكالة\n` +
              `💎 500K = $43 / $8\n` +
              `💎 1M = $87 / $16\n` +
              `💎 2M = $170 / $32\n` +
              `💎 5M = $405 / $80\n` +
              `💎 10M = $805 / $160\n` +
              `💎 25M = $1,950 / $400\n` +
              `💎 50M = $3,900 / $750\n` +
              `💎 100M = $7,700 / $1,250\n` +
              `💎 200M = $15,450 / $2,600\n\n` +
              `📌 الشروط: 22 يوم عمل / 2 ساعة يومياً كحد أدنى`,
            [
              { label: "شوف السياسة كاملة ←", value: "nav:/policy" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "policy_charge":
          addBotMessage(
            `⚡ **سياسة وكالات الشحن:**\n\n` +
              `$1,000 = 8.5M كونز + بونص $100\n` +
              `$3,000 = 25.5M + بونص $360\n` +
              `$5,000 = 42.5M + بونص $750\n` +
              `$10,000 = 85M + بونص $1,800\n\n` +
              `⚠️ ممنوع بيع أسعار صرف منخفضة/مرتفعة جداً\n` +
              `⚠️ ممنوع خداع المستخدمين وإلا إنهاء التعاون`,
            [
              { label: "شوف السياسة كاملة ←", value: "nav:/policy" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "policy_agency":
          addBotMessage(
            `🏢 **كيف تفتح وكالة؟**\n\n` +
              `📋 الشروط:\n` +
              `• أحضر 3 داعمين + 10 مستخدمين\n` +
              `• يمكن فتحها بأقل إذا ضمنت التارجت\n` +
              `• تعبئة: اسم الوكالة / الهاتف / ID الوكيل / الاسم\n\n` +
              `⚠️ تقييم بعد شهر: إذا لم تحقق $500 يحق للإدارة سحبها\n\n` +
              `🎁 مكافآت أول شهر:\n` +
              `• VIP4 للوكيل والداعمين (أسبوع)\n` +
              `• VIP3 لـ5 مشرفين\n` +
              `• VIP2 لـ10 مستخدمين`,
            [
              { label: "شوف السياسة كاملة ←", value: "nav:/policy" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "policy_room":
          addBotMessage(
            `🏆 **مكافآت الغرفة الأسبوعية:**\n\n` +
              `LV1: هدف 500K = مكافأة 20K\n` +
              `LV2: هدف 1M = مكافأة 40K\n` +
              `LV3: هدف 3M = مكافأة 90K\n` +
              `LV4: هدف 5M = مكافأة 145K\n` +
              `LV5: هدف 7M = مكافأة 200K\n` +
              `LV6: هدف 10M = مكافأة 290K\n` +
              `LV7: هدف 16M = مكافأة 450K\n` +
              `LV8: هدف 25M = مكافأة 750K\n\n` +
              `📌 المكافأة تُحسب أسبوعياً لصاحب الغرفة`,
            [
              { label: "شوف السياسة كاملة ←", value: "nav:/policy" },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "recharge":
          addBotMessage(
            `تقدر تشحن حسابك من داخل التطبيق 💳\nاضغط على أيقونة الشحن واختر الباقة المناسبة.\nأو شاهد الفيديو التعليمي لمعرفة الخطوات:`,
            [
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "banned":
          addBotMessage(
            `إذا حسابك محظور، تقدر تتواصل مع الإدارة مباشرة 🚫\nاكتب تفاصيل المشكلة وبنساعدك.`,
            [
              { label: "تكلم مع إداري", value: "admin_talk", icon: Shield },
              { label: "القائمة الرئيسية", value: "main_menu" },
            ]
          );
          break;
        case "greeting": {
          const name = user?.name || "زائر";
          addBotMessage(
            `أهلاً وسهلاً ${name}! 👋😊\nأنا مساعدك الذكي في غلا شات. كيف أقدر أخدمك اليوم؟`,
            MAIN_MENU
          );
          break;
        }
        case "thanks":
          addBotMessage(
            `العفو! 😊 إذا تحتاج أي شي ثاني أنا هنا دائماً`,
            MAIN_MENU
          );
          break;
        case "main_menu":
          addBotMessage("كيف أقدر أساعدك؟ 😊", MAIN_MENU);
          break;
        case "live_support": {
          const isEligible = (user?.type_user ?? 0) >= 3 || 
            (Number(user?.vip?.vip_level ?? user?.vip?.level ?? 0) >= 5);
          if (isEligible) {
            addBotMessage(
              `✅ أنت مؤهل للدعم السريع! ⚡\nبنحولك على صفحة الدعم السريع عشان سوبر أدمن يجيك خلال دقائق 👇`,
              [
                { label: "افتح الدعم السريع ←", value: "nav:/quick-support" },
                { label: "القائمة الرئيسية", value: "main_menu" },
              ]
            );
          } else {
            addBotMessage(
              `⚠️ عذراً، الدعم السريع المباشر متاح فقط لـ:\n` +
                `• أصحاب VIP 5 و VIP 6 👑\n` +
                `• الوكلاء 🛡️\n\n` +
                `لكن تقدر تتواصل معنا عبر:\n` +
                `• التذاكر: نرد عليك بأسرع وقت\n` +
                `• تكلم مع إداري: يدخل غرفتك مباشرة`,
              [
                { label: "أرسل تذكرة ←", value: "nav:/support-tickets" },
                { label: "تكلم مع إداري", value: "admin_talk", icon: Shield },
                { label: "القائمة الرئيسية", value: "main_menu" },
              ]
            );
          }
          break;
        }
        default:
          addBotMessage(
            "ما قدرت أفهم سؤالك بالضبط 🤔\nجرب توضح أكثر أو اختر من الخيارات:",
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
      setMessages((prev) => [...prev, userMsg]);
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

      // FAQ number lookup (e.g. user types "3")
      const faqNum = parseInt(text.trim());
      if (!isNaN(faqNum) && faqNum >= 1 && faqNum <= FAQ_LIST.length) {
        const faq = FAQ_LIST[faqNum - 1];
        const replies: QuickReply[] = [];
        if (faq.topic) replies.push({ label: "تفاصيل أكثر ←", value: faq.topic });
        replies.push({ label: "📖 الأسئلة الشائعة", value: "show_faq" }, { label: "القائمة الرئيسية", value: "main_menu" });
        addBotMessage(`📖 **${faq.question}**\n\n${faq.answer}`, replies);
        return;
      }

      // FAQ search first
      const faqMatch = searchFAQ(text);
      if (faqMatch) {
        const replies: QuickReply[] = [];
        if (faqMatch.topic) {
          replies.push({ label: "تفاصيل أكثر ←", value: faqMatch.topic });
        }
        replies.push({ label: "القائمة الرئيسية", value: "main_menu" });
        addBotMessage(
          `📖 **${faqMatch.question}**\n\n${faqMatch.answer}`,
          replies
        );
        return;
      }

      // keyword matching
      const topic = findIntent(text);
      if (topic) {
        handleTopic(topic);
      } else {
        addBotMessage(
          "ما قدرت أفهم سؤالك بالضبط 🤔\nجرب توضح أكثر أو اختر من الخيارات:",
          [
            { label: "📖 الأسئلة الشائعة", value: "show_faq", icon: BookOpen },
            ...MAIN_MENU,
          ]
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
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();
    handleTopic(value);
  };

  /* ── submit feedback ── */
  const submitFeedback = async () => {
    if (feedback.rating === 0) return;
    setSubmittingFeedback(true);
    try {
      await supabase.from("support_chat_feedback").insert({
        user_uuid: userUuid || "guest",
        rating: feedback.rating,
        comment: feedback.comment || "",
      });
      addBotMessage("شكراً على تقييمك! 😊 رأيك يساعدنا نحسّن الخدمة", MAIN_MENU);
      setShowFeedbackForm(false);
      setFeedback({ rating: 0, comment: "" });
    } catch (err) {
      console.error("Feedback error:", err);
      addBotMessage("حصل خطأ بحفظ التقييم. جاري المحاولة مرة ثانية...", MAIN_MENU);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  /* ── clear chat ── */
  const clearChat = () => {
    setMessages([]);
    setWaitingFor(null);
    addBotMessage(
      `أهلاً ${userName}! 👋\nأنا مساعدك في غلا شات. كيف أقدر أساعدك؟`,
      MAIN_MENU
    );
  };

  return (
    <div className="mobile-container bg-background flex flex-col" dir="rtl">
      {/* header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">رجوع</span>
        </button>
        <div className="flex items-center gap-2">
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
              <div className="flex flex-wrap gap-2 mt-3 justify-end">
                {msg.quickReplies.map((qr) => {
                  const IconComponent = qr.icon;
                  return (
                    <button
                      key={qr.value}
                      onClick={() => handleQuickReply(qr.value)}
                      className="flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-bold border border-primary/40 bg-gradient-to-r from-primary/15 to-accent/15 text-primary hover:border-primary/60 hover:bg-primary/25 active:scale-95 transition-all duration-200"
                    >
                      {typeof IconComponent === "function" && <IconComponent className="w-4 h-4" />}
                      <span>{qr.label}</span>
                    </button>
                  );
                })}
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

        {/* Feedback Form */}
        {showFeedbackForm && (
          <div className="max-w-xs mx-auto bg-card border border-border/50 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">كيف كانت الخدمة؟ 😊</p>
            
            {/* Star Rating */}
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedback({ ...feedback, rating: star })}
                  className="transition-transform active:scale-90"
                >
                  <svg
                    className={`w-7 h-7 ${
                      star <= feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Comment Input */}
            <textarea
              value={feedback.comment}
              onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
              placeholder="اترك ملاحظة (اختيارية)"
              maxLength={200}
              className="w-full text-xs px-3 py-2 rounded-lg border border-border/40 bg-background text-foreground placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              rows={2}
              dir="rtl"
            />

            {/* Submit Button */}
            <button
              onClick={submitFeedback}
              disabled={feedback.rating === 0 || submittingFeedback}
              className="w-full py-2 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity active:scale-95"
            >
              {submittingFeedback ? "جاري الحفظ..." : "إرسال التقييم"}
            </button>
          </div>
        )}

        {/* Show Feedback Button */}
        {messages.length > 0 && !showFeedbackForm && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowFeedbackForm(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
            >
              📝 قيّم الخدمة
            </button>
          </div>
        )}
      </div>

      {/* input */}
      <div className="sticky bottom-0 z-40 px-3 pb-3 pt-2 bg-background/80 backdrop-blur-xl border-t border-border/20">
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

      {/* leave confirmation dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="max-w-xs rounded-2xl text-center">
          <DialogTitle className="text-base font-bold">تأكيد الخروج</DialogTitle>
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">
              إذا طلعت من المحادثة بينحذف كل شي كتبته! 🗑️
            </p>
            <Button
              onClick={confirmLeave}
              variant="destructive"
              className="w-full font-bold h-11"
            >
              طلع وامسح المحادثة
            </Button>
            <button
              onClick={() => setShowLeaveDialog(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              رجوع للمحادثة
            </button>
          </div>
        </DialogContent>
      </Dialog>

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
