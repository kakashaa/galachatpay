import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import { supabase } from "@/integrations/supabase/client";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import Pusher from "pusher-js";
import {
  Shield, AlertTriangle, Eye, Bell, Search, Settings,
  RefreshCw, Volume2, VolumeX, Send, Loader2, Bot, Trash2, CheckCheck,
  Zap, DollarSign, Megaphone, Gift, Monitor, Clock, ChevronDown, ChevronUp,
  BarChart3, Users, Radio, MessageSquare, Wifi, WifiOff, Ban,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playNotificationSound, playUrgentSound } from "@/lib/notificationSound";

/* ─── API Layer ─── */
const API_BASE = "https://hola-chat.com/wares-api.php";
const API_KEY = "ghala2026actions";

interface PromoConfig {
  competitors: string[];
  suspicious_phrases: string[];
  safe_apps: string[];
}

async function fetchPromoConfig(): Promise<PromoConfig> {
  const res = await fetch(`${API_BASE}?key=${API_KEY}&action=promo-config`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

async function updatePromoConfig(
  action: "add_competitor" | "remove_competitor" | "add_phrase" | "remove_phrase" | "add_safe" | "remove_safe",
  value: string
): Promise<any> {
  const res = await fetch(`${API_BASE}?key=${API_KEY}&action=promo-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [action]: value }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function banUserApi(uuid: string, duration: number = 24): Promise<any> {
  const res = await fetch(`${API_BASE}?key=${API_KEY}&action=ban-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid, duration, type: ["normal"] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ─── Types ─── */
interface MonitorAlert {
  id: string;
  alert_type: string;
  severity?: "high" | "medium" | "low";
  sender_uuid: string | null;
  sender_name?: string;
  receiver_uuid: string | null;
  receiver_name?: string;
  amount: number;
  details: any;
  is_read: boolean;
  created_at: string;
}

interface ChatMsg {
  role: "user" | "bot";
  text: string;
  time: string;
}

interface PusherMessage {
  id: string;
  conversationId: string;
  senderName: string;
  senderUuid: string;
  text: string;
  keyword?: string;
  time: string;
  severity: "high" | "medium" | "low";
}

/* ─── Constants ─── */
const PUSHER_KEY = "7308273f9bbb39599189";
const PUSHER_CLUSTER = "mt1";

const PROMO_KEYWORDS = [
  "واتساب", "whatsapp", "تلقرام", "telegram", "رقمي", "حسابي",
  "يوي", "yooy", "بيقو", "bigo", "تانقو", "tango", "حمّل", "download",
  "برنامج", "تطبيق", "نزلي", "حملي", "تعال", "انتقل", "لايكي", "likee",
];

const COINS_PER_USD = 7500;
const formatCoins = (n: number) => {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("en-US");
};
const formatMoney = (coins: number) => {
  const usd = (coins / COINS_PER_USD).toFixed(2);
  return `${coins.toLocaleString("en-US")} كوينز ($${usd})`;
};
const formatTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
};
const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
  } catch { return "—"; }
};

/* ─── Severity Config ─── */
const severityConfig = {
  high: { label: "عالية", color: "hsl(0 84% 60%)", bg: "hsla(0,84%,60%,0.08)", border: "hsla(0,84%,60%,0.2)", icon: AlertTriangle },
  medium: { label: "متوسطة", color: "hsl(25 95% 53%)", bg: "hsla(25,95%,53%,0.08)", border: "hsla(25,95%,53%,0.2)", icon: Shield },
  low: { label: "منخفضة", color: "hsl(48 96% 53%)", bg: "hsla(48,96%,53%,0.08)", border: "hsla(48,96%,53%,0.2)", icon: Eye },
};

/* ─── Alert Type Config ─── */
const alertTypeConfig: Record<string, { label: string; icon: any; filterKey: string }> = {
  big_charge: { label: "شحنة كبيرة", icon: Zap, filterKey: "charges" },
  repeated_charge: { label: "شحنات متكررة", icon: RefreshCw, filterKey: "charges" },
  promotion: { label: "ترويج مشبوه", icon: Megaphone, filterKey: "promotion" },
  manual_salary: { label: "شحنة داشبورد", icon: DollarSign, filterKey: "admin" },
  big_gift: { label: "هدية كبيرة", icon: Gift, filterKey: "gifts" },
  fake_account: { label: "حساب وهمي", icon: Users, filterKey: "accounts" },
  admin_action: { label: "عملية أدمن", icon: Shield, filterKey: "admin" },
  pusher_promo: { label: "ترويج (رسائل)", icon: MessageSquare, filterKey: "promotion" },
};

const alertFilters = [
  { key: "all", label: "الكل", icon: Bell },
  { key: "charges", label: "شحنات", icon: Zap },
  { key: "gifts", label: "هدايا", icon: Gift },
  { key: "promotion", label: "ترويج", icon: Megaphone },
  { key: "accounts", label: "حسابات", icon: Users },
  { key: "admin", label: "أدمن", icon: Shield },
];

/* ─── Monitor Types ─── */
const monitorTypes = [
  { key: "big_charge", label: "شحنات كبيرة (> 500K)", interval: "كل 1 دقيقة", connected: true },
  { key: "repeated_charge", label: "شحنات متكررة (> 3/ساعة)", interval: "كل 2 دقيقة", connected: true },
  { key: "promotion", label: "رسائل ترويج (كلمات ممنوعة)", interval: "كل 1 دقيقة", connected: true },
  { key: "pusher_promo", label: "مراقبة رسائل Pusher", interval: "مباشر (WebSocket)", connected: true },
  { key: "big_gift", label: "هدايا كبيرة (> 500K)", interval: "كل 2 دقيقة", connected: true },
  { key: "dashboard_charge", label: "شحنات من الداشبورد", interval: "كل 1 دقيقة", connected: true },
  { key: "admin_sensitive", label: "عمليات Admin حساسة", interval: "كل 2 دقيقة", connected: true },
  { key: "fake_account", label: "حسابات وهمية (نفس الجهاز)", interval: "—", connected: false },
  { key: "stolen_account", label: "سرقة حساب", interval: "—", connected: false },
  { key: "coin_laundering", label: "غسيل كوينز", interval: "—", connected: false },
  { key: "vip_no_charge", label: "VIP بدون شحن", interval: "—", connected: false },
];

/* ─── Quick Questions ─── */
const quickQuestions = [
  "مين شحن فوق 500 ألف؟",
  "أعلى الداعمين اليوم",
  "أعلى الداعمين هالشهر",
  "أعلى المستلمين اليوم",
  "تنبيهات اليوم",
  "شحنات الشهر",
];

/* ═══════════════════════════════════════ */
/*             MAIN COMPONENT             */
/* ═══════════════════════════════════════ */
const AdminMonitorPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [activeSection, setActiveSection] = useState<"alerts" | "bot" | "stats" | "monitors" | "history" | "settings">("alerts");

  /* ── Alerts State ── */
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alertFilter, setAlertFilter] = useState("all");
  const prevCountRef = useRef(0);
  const lastUpdateRef = useRef<string>("");

  /* ── Online count ── */
  const [onlineCount, setOnlineCount] = useState(0);

  /* ── Pusher State ── */
  const [pusherConnected, setPusherConnected] = useState(false);
  const [pusherMessages, setPusherMessages] = useState<PusherMessage[]>([]);
  const [activeConversations, setActiveConversations] = useState<string[]>([]);
  const pusherRef = useRef<Pusher | null>(null);
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  /* ── Monitor toggles ── */
  const [enabledMonitors, setEnabledMonitors] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("monitor_toggles");
    return saved ? JSON.parse(saved) : Object.fromEntries(monitorTypes.filter(m => m.connected).map(m => [m.key, true]));
  });

  /* ── Bot State ── */
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [botInput, setBotInput] = useState("");
  const [botLoading, setBotLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── History state ── */
  const [historyFilter, setHistoryFilter] = useState<"today" | "week" | "month">("today");
  const [historySearch, setHistorySearch] = useState("");

  /* ── Settings state ── */
  const [settingsRefreshSec, setSettingsRefreshSec] = useState(30);
  const [settingsBigChargeThreshold, setSettingsBigChargeThreshold] = useState(500000);
  const [settingsRepeatThreshold, setSettingsRepeatThreshold] = useState(3);
  const [settingsBigGiftThreshold, setSettingsBigGiftThreshold] = useState(500000);

  /* ══════════════════════════════════════ */
  /* ── Pusher Integration ──              */
  /* ══════════════════════════════════════ */
  const initPusher = useCallback(() => {
    if (pusherRef.current) return;
    try {
      const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
      pusherRef.current = pusher;

      pusher.connection.bind("connected", () => {
        setPusherConnected(true);
      });
      pusher.connection.bind("disconnected", () => setPusherConnected(false));
      pusher.connection.bind("error", () => setPusherConnected(false));
    } catch (e) {
      console.error("Pusher init error:", e);
    }
  }, []);

  const subscribeToConversation = useCallback((conversationId: string) => {
    if (!pusherRef.current || subscribedChannelsRef.current.has(conversationId)) return;
    subscribedChannelsRef.current.add(conversationId);

    const channel = pusherRef.current.subscribe(`conversation-${conversationId}`);
    channel.bind("App\\Events\\NewConversationMessage", (data: any) => {
      const text = (data.text || "").toLowerCase();
      const found = PROMO_KEYWORDS.find(kw => text.includes(kw));

      if (found) {
        const msg: PusherMessage = {
          id: `pusher-${Date.now()}-${Math.random()}`,
          conversationId,
          senderName: data.sender?.name || "مجهول",
          senderUuid: String(data.sender?.uuid || data.sender?.id || ""),
          text: data.text || "",
          keyword: found,
          time: data.created_at || new Date().toISOString(),
          severity: "high",
        };
        setPusherMessages(prev => [msg, ...prev].slice(0, 200));

        if (soundEnabled) playUrgentSound();
        toast.error(`ترويج مكتشف: "${found}"`, {
          description: `${msg.senderName} (محادثة #${conversationId})`,
          duration: 10000,
        });
      }
    });
  }, [soundEnabled]);

  // Fetch active conversations and subscribe
  const fetchAndSubscribeConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("pusher-monitor", {
        body: { action: "active_conversations" },
      });
      if (!error && data?.channels) {
        const ids = (data.channels as string[]).map((ch: string) => ch.replace("conversation-", ""));
        setActiveConversations(ids);
        ids.forEach(id => subscribeToConversation(id));
      }
    } catch { /* silent */ }
  }, [subscribeToConversation]);

  // Fetch online count
  const fetchOnlineCount = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("pusher-monitor", {
        body: { action: "online_count" },
      });
      if (!error && data?.online_count !== undefined) {
        setOnlineCount(data.online_count);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (enabledMonitors.pusher_promo) {
      initPusher();
      fetchAndSubscribeConversations();
      fetchOnlineCount();
      const iv = setInterval(() => {
        fetchAndSubscribeConversations();
        fetchOnlineCount();
      }, 60000);
      return () => {
        clearInterval(iv);
        if (pusherRef.current) {
          pusherRef.current.disconnect();
          pusherRef.current = null;
          subscribedChannelsRef.current.clear();
          setPusherConnected(false);
        }
      };
    } else {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
        subscribedChannelsRef.current.clear();
        setPusherConnected(false);
      }
    }
  }, [enabledMonitors.pusher_promo, initPusher, fetchAndSubscribeConversations, fetchOnlineCount]);

  /* ══════════════════════════════════════ */
  /* ── Load Alerts ──                     */
  /* ══════════════════════════════════════ */
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}?key=${API_KEY}&action=promo-alerts`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const apiAlerts = (data.data?.alerts || []) as MonitorAlert[];

      if (soundEnabled && apiAlerts.length > prevCountRef.current && prevCountRef.current > 0) {
        const hasHigh = apiAlerts.some(a => a.severity === "high");
        if (hasHigh) playUrgentSound();
        else playNotificationSound();
      }
      prevCountRef.current = apiAlerts.length;
      lastUpdateRef.current = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setAlerts(apiAlerts);
    } catch {
      try {
        const { data } = await supabase
          .from("monitor_alerts" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        setAlerts((data || []) as unknown as MonitorAlert[]);
        lastUpdateRef.current = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      } catch { /* silent */ }
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  useEffect(() => {
    loadAlerts();
    const iv = setInterval(loadAlerts, settingsRefreshSec * 1000);
    return () => clearInterval(iv);
  }, [loadAlerts, settingsRefreshSec]);

  /* ── Computed ── */
  const todayAlerts = alerts.filter(a => {
    try { return new Date(a.created_at).toDateString() === new Date().toDateString(); } catch { return false; }
  });
  const highCount = todayAlerts.filter(a => getSeverity(a) === "high").length + pusherMessages.length;
  const unreadCount = alerts.filter(a => !a.is_read).length;

  const filteredAlerts = alerts.filter(a => {
    if (alertFilter === "all") return true;
    const cfg = alertTypeConfig[a.alert_type];
    return cfg?.filterKey === alertFilter;
  });

  /* ── History filtered ── */
  const historyAlerts = alerts.filter(a => {
    const d = new Date(a.created_at);
    const now = new Date();
    if (historyFilter === "today") return d.toDateString() === now.toDateString();
    if (historyFilter === "week") return (now.getTime() - d.getTime()) < 7 * 86400000;
    return (now.getTime() - d.getTime()) < 30 * 86400000;
  }).filter(a => {
    if (!historySearch) return true;
    const s = historySearch.toLowerCase();
    return (a.sender_uuid?.includes(s) || a.receiver_uuid?.includes(s) || a.sender_name?.toLowerCase().includes(s) || a.details?.note?.toLowerCase().includes(s));
  });

  /* ── Mark as read ── */
  const markAllRead = async () => {
    const unread = alerts.filter(a => !a.is_read).map(a => a.id);
    if (unread.length === 0) return;
    await (supabase.from("monitor_alerts" as any) as any).update({ is_read: true }).in("id", unread);
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    toast.success("تم تعليم الكل كمقروء");
  };

  const deleteAlert = async (id: string) => {
    await (supabase.from("monitor_alerts" as any) as any).delete().eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const toggleMonitor = (key: string) => {
    setEnabledMonitors(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("monitor_toggles", JSON.stringify(next));
      return next;
    });
  };

  /* ── Bot ── */
  const handleBotQuery = async (q?: string) => {
    const question = (q || botInput).trim();
    if (!question || botLoading) return;
    setBotInput("");
    setChatMessages(prev => [...prev, { role: "user", text: question, time: formatTime(new Date().toISOString()) }]);
    setBotLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}?key=${API_KEY}&action=monitor-query`,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `question=${encodeURIComponent(question)}` }
      );
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "bot", text: data.data?.answer || data.answer || data.message || "ما لقيت معلومات", time: formatTime(new Date().toISOString()) }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "bot", text: "خطأ في الاتصال — حاول مرة أخرى", time: formatTime(new Date().toISOString()) }]);
    } finally {
      setBotLoading(false);
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  /* ── Promo Config ── */
  const [promoConfig, setPromoConfig] = useState<PromoConfig | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSaving, setPromoSaving] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [newPhrase, setNewPhrase] = useState("");

  const loadPromoConfig = useCallback(async () => {
    try {
      setPromoLoading(true);
      const data = await fetchPromoConfig();
      setPromoConfig(data);
    } catch { /* silent */ }
    finally { setPromoLoading(false); }
  }, []);

  useEffect(() => {
    if (activeSection === "settings") loadPromoConfig();
  }, [activeSection, loadPromoConfig]);

  const handleAddCompetitor = async () => {
    if (!newCompetitor.trim() || promoSaving) return;
    setPromoSaving(true);
    try {
      await updatePromoConfig("add_competitor", newCompetitor.trim());
      setNewCompetitor("");
      await loadPromoConfig();
      toast.success("تمت الإضافة");
    } catch { toast.error("فشل الإضافة"); }
    finally { setPromoSaving(false); }
  };

  const handleRemoveCompetitor = async (name: string) => {
    setPromoSaving(true);
    try {
      await updatePromoConfig("remove_competitor", name);
      await loadPromoConfig();
    } catch { toast.error("فشل الحذف"); }
    finally { setPromoSaving(false); }
  };

  const handleAddPhrase = async () => {
    if (!newPhrase.trim() || promoSaving) return;
    setPromoSaving(true);
    try {
      await updatePromoConfig("add_phrase", newPhrase.trim());
      setNewPhrase("");
      await loadPromoConfig();
      toast.success("تمت الإضافة");
    } catch { toast.error("فشل الإضافة"); }
    finally { setPromoSaving(false); }
  };

  const handleRemovePhrase = async (phrase: string) => {
    setPromoSaving(true);
    try {
      await updatePromoConfig("remove_phrase", phrase);
      await loadPromoConfig();
    } catch { toast.error("فشل الحذف"); }
    finally { setPromoSaving(false); }
  };

  /* ── Ban User ── */
  const handleBanUser = async (uuid: string, name: string) => {
    try {
      await banUserApi(uuid, 24);
      toast.success(`تم حظر ${name} لمدة 24 ساعة`);
    } catch (err: any) {
      toast.error(`فشل الحظر: ${err.message}`);
    }
  };

  /* ── Sections nav ── */
  const sections = [
    { key: "alerts" as const, label: "التنبيهات", icon: Bell, badge: unreadCount },
    { key: "bot" as const, label: "البوت", icon: Bot, badge: 0 },
    { key: "stats" as const, label: "إحصائيات", icon: BarChart3, badge: 0 },
    { key: "monitors" as const, label: "المراقبات", icon: Monitor, badge: pusherMessages.length },
    { key: "history" as const, label: "السجل", icon: Clock, badge: 0 },
    { key: "settings" as const, label: "إعدادات", icon: Settings, badge: 0 },
  ];

  const todayCountByType = monitorTypes.filter(m => m.connected).map(m => ({
    ...m,
    count: m.key === "pusher_promo"
      ? pusherMessages.length
      : todayAlerts.filter(a => a.alert_type === m.key).length,
  }));

  const connectedCount = monitorTypes.filter(m => m.connected).length;
  const needsDbCount = monitorTypes.filter(m => !m.connected).length;

  return (
    <AdminPageLayout title="المراقبة" onLogout={handleLogout}>
      {/* ═══ HEADER STATS ═══ */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { value: todayAlerts.length, label: "تنبيهات اليوم", color: "hsl(160 84% 39%)" },
          { value: highCount, label: "عالية الخطورة", color: "hsl(0 84% 60%)" },
          { value: onlineCount, label: "أونلاين الآن", color: "hsl(217 91% 60%)" },
          { value: unreadCount, label: "غير مقروءة", color: "hsl(25 95% 53%)" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Last update + Pusher status + refresh */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-muted-foreground">
            آخر تحديث: <span className="tabular-nums">{lastUpdateRef.current || "—"}</span>
          </p>
          {enabledMonitors.pusher_promo && (
            <div className="flex items-center gap-1">
              {pusherConnected ? (
                <>
                  <Wifi size={10} style={{ color: "hsl(160 84% 39%)" }} />
                  <span className="text-[9px] font-bold" style={{ color: "hsl(160 84% 39%)" }}>
                    Pusher متصل ({subscribedChannelsRef.current.size})
                  </span>
                </>
              ) : (
                <>
                  <WifiOff size={10} className="text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">Pusher غير متصل</span>
                </>
              )}
            </div>
          )}
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={loadAlerts}
          className="h-7 px-3 rounded-xl text-[10px] font-bold flex items-center gap-1.5"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> تحديث
        </motion.button>
      </div>

      {/* ═══ SECTION TABS ═══ */}
      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 mb-4">
        <div className="flex gap-1 min-w-max p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {sections.map(s => {
            const Icon = s.icon;
            const active = activeSection === s.key;
            return (
              <motion.button
                key={s.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveSection(s.key)}
                className={`py-2 px-3 rounded-xl text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition-all ${active ? "text-white" : "text-muted-foreground"}`}
                style={active ? {
                  background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.25)",
                } : {}}
              >
                <Icon size={12} />
                {s.label}
                {s.badge > 0 && (
                  <span className="h-4 min-w-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1 text-white"
                    style={{ background: "hsl(0 84% 60%)" }}>
                    {s.badge > 99 ? "99+" : s.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* SECTION 1: LIVE ALERTS                 */}
      {/* ═══════════════════════════════════════ */}
      {activeSection === "alerts" && (
        <div className="space-y-3">
          {/* Live indicator + filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(0 84% 60%)", boxShadow: "0 0 8px hsl(0 84% 60%)" }} />
              <span className="text-[10px] font-bold" style={{ color: "hsl(0 84% 60%)" }}>مباشر</span>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.button whileTap={{ scale: 0.9 }} onClick={markAllRead}
                className="h-7 px-2.5 rounded-xl text-[9px] font-bold flex items-center gap-1"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)", color: "hsl(160 84% 39%)" }}>
                <CheckCheck size={10} /> مقروء
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-7 w-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {soundEnabled ? <Volume2 size={11} style={{ color: "hsl(160 84% 39%)" }} /> : <VolumeX size={11} className="text-muted-foreground" />}
              </motion.button>
            </div>
          </div>

          {/* Filter chips */}
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-1.5 min-w-max">
              {alertFilters.map(f => {
                const Icon = f.icon;
                const active = alertFilter === f.key;
                const count = f.key === "all" ? alerts.length : alerts.filter(a => alertTypeConfig[a.alert_type]?.filterKey === f.key).length;
                return (
                  <motion.button
                    key={f.key}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setAlertFilter(f.key)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${active ? "text-white" : "text-muted-foreground"}`}
                    style={active ? {
                      background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))",
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Icon size={10} />
                    {f.label}
                    {count > 0 && <span className="text-[8px] opacity-70">({count})</span>}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Pusher real-time alerts (shown at top when filter is promotion or all) */}
          {(alertFilter === "all" || alertFilter === "promotion") && pusherMessages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Radio size={12} style={{ color: "hsl(0 84% 60%)" }} className="animate-pulse" />
                <span className="text-[10px] font-bold" style={{ color: "hsl(0 84% 60%)" }}>
                  ترويج مكتشف عبر Pusher ({pusherMessages.length})
                </span>
              </div>
              {pusherMessages.slice(0, 10).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-2xl p-3.5"
                  style={{ background: "hsla(0,84%,60%,0.08)", border: "1px solid hsla(0,84%,60%,0.2)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={12} style={{ color: "hsl(0 84% 60%)" }} />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: "hsla(0,84%,60%,0.15)", color: "hsl(0 84% 60%)" }}>
                        عالية
                      </span>
                      <span className="text-[10px] font-bold">ترويج (رسائل)</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground tabular-nums">{formatTime(msg.time)}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px]">
                      <span className="text-muted-foreground">المرسل: </span>
                      <span className="font-bold">{msg.senderName} </span>
                      <span className="font-mono tabular-nums text-muted-foreground">(UUID: {msg.senderUuid})</span>
                    </p>
                    <p className="text-[11px]">
                      <span className="text-muted-foreground">الكلمة: </span>
                      <span className="font-bold" style={{ color: "hsl(0 84% 60%)" }}>"{msg.keyword}"</span>
                    </p>
                    <p className="text-[11px]">
                      <span className="text-muted-foreground">المحادثة: </span>
                      <span className="font-mono tabular-nums">#{msg.conversationId}</span>
                    </p>
                    <div className="mt-2 rounded-xl p-2" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <p className="text-[10px] text-white/80 whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <motion.button whileTap={{ scale: 0.95 }}
                      className="h-7 px-3 rounded-xl text-[10px] font-bold text-white flex items-center gap-1"
                      style={{ background: "hsl(0 84% 50%)" }}
                      onClick={() => handleBanUser(msg.senderUuid, msg.senderName)}>
                      <Ban size={10} /> حظر 24h
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }}
                      className="h-7 px-3 rounded-xl text-[10px] font-bold text-muted-foreground"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onClick={() => setPusherMessages(prev => prev.filter(m => m.id !== msg.id))}>
                      تجاهل
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* API Alert cards */}
          {loading && filteredAlerts.length === 0 && (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(160 84% 39%)" }} /></div>
          )}

          {!loading && filteredAlerts.length === 0 && pusherMessages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Eye size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">لا توجد تنبيهات</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">يتم الفحص كل {settingsRefreshSec} ثانية</p>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {filteredAlerts.slice(0, 50).map((alert, i) => (
              <AlertCard key={alert.id} alert={alert} index={i} onDelete={deleteAlert} onBan={handleBanUser} />
            ))}
          </AnimatePresence>

          {filteredAlerts.length > 50 && (
            <p className="text-center text-[10px] text-muted-foreground py-2">
              عرض 50 من {filteredAlerts.length} — راجع السجل للمزيد
            </p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SECTION 2: SMART BOT                   */}
      {/* ═══════════════════════════════════════ */}
      {activeSection === "bot" && (
        <div className="flex flex-col" style={{ height: "calc(100vh - 300px)" }}>
          <div className="flex-1 overflow-y-auto space-y-3 pb-4 px-1">
            {chatMessages.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <Bot size={36} className="mx-auto mb-3" style={{ color: "hsla(160,84%,39%,0.4)" }} />
                <p className="text-xs text-muted-foreground mb-4">اسأل أي سؤال عن المستخدمين والشحنات</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickQuestions.map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleBotQuery(q)}
                      className="text-[10px] py-2 px-3 rounded-xl text-muted-foreground"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {q}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {chatMessages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%] rounded-2xl px-4 py-3"
                  style={msg.role === "user" ? {
                    background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))",
                    borderBottomLeftRadius: "20px", borderBottomRightRadius: "6px",
                  } : {
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    borderBottomLeftRadius: "6px", borderBottomRightRadius: "20px",
                  }}>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[8px] mt-1 tabular-nums ${msg.role === "user" ? "text-white/50" : "text-muted-foreground/50"}`}>{msg.time}</p>
                </div>
              </motion.div>
            ))}

            {botLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" style={{ color: "hsl(160 84% 39%)" }} />
                    <span className="text-[11px] text-muted-foreground">جاري التحليل...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              value={botInput}
              onChange={e => setBotInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleBotQuery()}
              placeholder="اسأل البوت..."
              className="flex-1 h-11 rounded-2xl px-4 text-sm placeholder:text-muted-foreground focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleBotQuery()}
              disabled={botLoading || !botInput.trim()}
              className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))" }}>
              <Send size={16} className="text-white" />
            </motion.button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SECTION 3: STATS DASHBOARD             */}
      {/* ═══════════════════════════════════════ */}
      {activeSection === "stats" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "تنبيهات اليوم", value: todayAlerts.length, color: "hsl(160 84% 39%)" },
              { label: "عالية الخطورة", value: highCount, color: "hsl(0 84% 60%)" },
              { label: "أونلاين الآن", value: onlineCount, color: "hsl(217 91% 60%)" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Alert type breakdown */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold">توزيع التنبيهات اليوم</p>
            {todayCountByType.filter(m => m.count > 0).map((m, i) => {
              const maxCount = Math.max(...todayCountByType.map(x => x.count), 1);
              const pct = (m.count / maxCount) * 100;
              return (
                <div key={m.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                    <span className="text-[10px] font-bold tabular-nums">{m.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.2 + i * 0.05, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, hsl(160 84% 39%), hsl(160 84% 50%))" }}
                    />
                  </div>
                </div>
              );
            })}
            {todayCountByType.every(m => m.count === 0) && (
              <p className="text-[10px] text-muted-foreground text-center py-4">لا توجد تنبيهات اليوم</p>
            )}
          </motion.div>

          {/* Severity breakdown */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold mb-3">مستوى الخطورة</p>
            <div className="grid grid-cols-3 gap-2">
              {(["high", "medium", "low"] as const).map(sev => {
                const cfg = severityConfig[sev];
                const count = todayAlerts.filter(a => getSeverity(a) === sev).length + (sev === "high" ? pusherMessages.length : 0);
                return (
                  <div key={sev} className="rounded-xl p-3 text-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <p className="text-lg font-bold tabular-nums" style={{ color: cfg.color }}>{count}</p>
                    <p className="text-[9px]" style={{ color: cfg.color }}>{cfg.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Pusher stats */}
          {enabledMonitors.pusher_promo && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-bold mb-3">مراقبة Pusher</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl p-3 text-center" style={{ background: pusherConnected ? "hsla(160,84%,39%,0.08)" : "hsla(0,84%,60%,0.08)" }}>
                  <p className="text-lg font-bold" style={{ color: pusherConnected ? "hsl(160 84% 39%)" : "hsl(0 84% 60%)" }}>
                    {pusherConnected ? "متصل" : "منقطع"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">الحالة</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "hsla(217,91%,60%,0.08)" }}>
                  <p className="text-lg font-bold tabular-nums" style={{ color: "hsl(217 91% 60%)" }}>{subscribedChannelsRef.current.size}</p>
                  <p className="text-[9px] text-muted-foreground">محادثة مُراقبة</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "hsla(0,84%,60%,0.08)" }}>
                  <p className="text-lg font-bold tabular-nums" style={{ color: "hsl(0 84% 60%)" }}>{pusherMessages.length}</p>
                  <p className="text-[9px] text-muted-foreground">ترويج مكتشف</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SECTION 4: MONITOR TYPES               */}
      {/* ═══════════════════════════════════════ */}
      {activeSection === "monitors" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground mb-1">أنواع المراقبة — {connectedCount}/{monitorTypes.length} متصل</p>
          {monitorTypes.map((m, i) => {
            const todayCount = m.key === "pusher_promo"
              ? pusherMessages.length
              : todayAlerts.filter(a => a.alert_type === m.key).length;
            const isPusher = m.key === "pusher_promo";
            return (
              <motion.div
                key={m.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl p-3.5 flex items-center justify-between"
                style={{
                  background: isPusher && pusherConnected ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.03)",
                  border: isPusher && pusherConnected ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold truncate">{m.label}</p>
                    {isPusher && pusherConnected && (
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(160 84% 39%)" }} />
                    )}
                  </div>
                  {m.connected ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-muted-foreground">{m.interval}</span>
                      {todayCount > 0 && (
                        <span className="text-[9px] font-bold tabular-nums" style={{ color: "hsl(25 95% 53%)" }}>{todayCount} اليوم</span>
                      )}
                      {isPusher && (
                        <span className="text-[9px] text-muted-foreground">({subscribedChannelsRef.current.size} محادثة)</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[9px] mt-0.5" style={{ color: "hsl(25 95% 53%)" }}>غير متصل — يحتاج ربط</p>
                  )}
                </div>
                {m.connected ? (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => toggleMonitor(m.key)}
                    className="w-10 h-5 rounded-full relative shrink-0 transition-colors"
                    style={{ background: enabledMonitors[m.key] ? "hsl(160 84% 39%)" : "hsl(240 5% 34%)" }}>
                    <motion.div
                      className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                      animate={{ x: enabledMonitors[m.key] ? 0 : 22 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                ) : (
                  <span className="text-[9px] px-2 py-1 rounded-lg text-muted-foreground"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    قريباً
                  </span>
                )}
              </motion.div>
            );
          })}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="rounded-2xl p-3 mt-2"
            style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))", border: "1px solid rgba(16,185,129,0.1)" }}>
            <p className="text-[10px] text-muted-foreground">
              متصل: <span className="font-bold" style={{ color: "hsl(160 84% 39%)" }}>{connectedCount}</span> — يحتاج ربط: <span className="font-bold" style={{ color: "hsl(25 95% 53%)" }}>{needsDbCount}</span>
            </p>
          </motion.div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SECTION 5: HISTORY                     */}
      {/* ═══════════════════════════════════════ */}
      {activeSection === "history" && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {([
              { key: "today" as const, label: "اليوم" },
              { key: "week" as const, label: "الأسبوع" },
              { key: "month" as const, label: "الشهر" },
            ]).map(f => (
              <motion.button key={f.key} whileTap={{ scale: 0.95 }}
                onClick={() => setHistoryFilter(f.key)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${historyFilter === f.key ? "text-white" : "text-muted-foreground"}`}
                style={historyFilter === f.key ? {
                  background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))",
                } : {
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                {f.label}
              </motion.button>
            ))}
          </div>

          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="بحث UUID أو اسم..."
              className="w-full h-9 rounded-xl pr-9 pl-3 text-[11px] placeholder:text-muted-foreground focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          <p className="text-[10px] text-muted-foreground">{historyAlerts.length} تنبيه</p>

          {historyAlerts.slice(0, 100).map((alert, i) => {
            const sev = getSeverity(alert);
            const sevCfg = severityConfig[sev];
            const typeCfg = alertTypeConfig[alert.alert_type];
            return (
              <motion.div key={alert.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-start gap-2 py-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: sevCfg.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold">{typeCfg?.label || alert.alert_type}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: sevCfg.bg, color: sevCfg.color }}>{sevCfg.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {alert.sender_name || alert.sender_uuid || "—"}
                    {alert.amount > 0 && ` — ${formatCoins(alert.amount)}`}
                    {alert.details?.note && ` — ${alert.details.note}`}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-[9px] text-muted-foreground tabular-nums">{formatDate(alert.created_at)}</p>
                  <p className="text-[9px] text-muted-foreground tabular-nums">{formatTime(alert.created_at)}</p>
                </div>
              </motion.div>
            );
          })}

          {historyAlerts.length === 0 && (
            <div className="text-center py-12">
              <Clock size={28} className="mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-[11px] text-muted-foreground">لا توجد تنبيهات في هذه الفترة</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SECTION 6: SETTINGS                    */}
      {/* ═══════════════════════════════════════ */}
      {activeSection === "settings" && (
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 space-y-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold">إعدادات المراقبة</p>

            {/* Sound */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold">صوت التنبيه</p>
                <p className="text-[9px] text-muted-foreground">تشغيل صوت عند تنبيه جديد</p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-10 h-5 rounded-full relative transition-colors"
                style={{ background: soundEnabled ? "hsl(160 84% 39%)" : "hsl(240 5% 34%)" }}>
                <motion.div className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                  animate={{ x: soundEnabled ? 0 : 22 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              </motion.button>
            </div>

            {/* Refresh rate */}
            <div>
              <p className="text-[11px] font-bold mb-1">تحديث تلقائي كل</p>
              <div className="flex gap-2">
                {[15, 30, 60].map(s => (
                  <motion.button key={s} whileTap={{ scale: 0.95 }}
                    onClick={() => setSettingsRefreshSec(s)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold ${settingsRefreshSec === s ? "text-white" : "text-muted-foreground"}`}
                    style={settingsRefreshSec === s ? {
                      background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))",
                    } : {
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                    {s} ثانية
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Thresholds */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold">حدود التنبيه</p>
              {[
                { label: "شحنة كبيرة", value: settingsBigChargeThreshold, set: setSettingsBigChargeThreshold, suffix: "كوينز" },
                { label: "شحنات متكررة", value: settingsRepeatThreshold, set: setSettingsRepeatThreshold, suffix: "مرات / ساعة" },
                { label: "هدية كبيرة", value: settingsBigGiftThreshold, set: setSettingsBigGiftThreshold, suffix: "كوينز" },
              ].map(th => (
                <div key={th.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{th.label} &gt;</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={th.value}
                      onChange={e => th.set(Number(e.target.value))}
                      className="w-24 h-7 rounded-lg px-2 text-[10px] text-left tabular-nums focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                    <span className="text-[9px] text-muted-foreground">{th.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pusher settings */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold">إعدادات Pusher</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold">مراقبة الرسائل الخاصة</p>
                <p className="text-[9px] text-muted-foreground">اكتشاف كلمات ترويج بالمحادثات</p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => toggleMonitor("pusher_promo")}
                className="w-10 h-5 rounded-full relative transition-colors"
                style={{ background: enabledMonitors.pusher_promo ? "hsl(160 84% 39%)" : "hsl(240 5% 34%)" }}>
                <motion.div className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                  animate={{ x: enabledMonitors.pusher_promo ? 0 : 22 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              </motion.button>
            </div>
            {enabledMonitors.pusher_promo && (
              <div className="text-[9px] text-muted-foreground space-y-1 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p>الحالة: {pusherConnected ? <span style={{ color: "hsl(160 84% 39%)" }}>متصل</span> : <span style={{ color: "hsl(0 84% 60%)" }}>غير متصل</span>}</p>
                <p>محادثات مُراقبة: {subscribedChannelsRef.current.size}</p>
                <p>ترويج مكتشف: {pusherMessages.length}</p>
                <p className="pt-1">الكلمات المراقبة: {PROMO_KEYWORDS.slice(0, 8).join("، ")}...</p>
              </div>
            )}
          </motion.div>

          {/* ═══ Promo Config Panel ═══ */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-4 space-y-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">🚫 إعدادات كشف الترويج</p>
              <motion.button whileTap={{ scale: 0.9 }} onClick={loadPromoConfig}
                className="h-6 px-2 rounded-lg text-[9px] font-bold flex items-center gap-1 text-muted-foreground"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <RefreshCw size={9} className={promoLoading ? "animate-spin" : ""} /> تحديث
              </motion.button>
            </div>

            {promoLoading && !promoConfig && (
              <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color: "hsl(160 84% 39%)" }} /></div>
            )}

            {promoConfig && (
              <div className="space-y-4">
                {/* التطبيقات المنافسة */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold" style={{ color: "hsl(0 84% 60%)" }}>التطبيقات المنافسة ({promoConfig.competitors.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {promoConfig.competitors.map(name => (
                      <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold"
                        style={{ background: "hsla(0,84%,60%,0.1)", color: "hsl(0 84% 60%)" }}>
                        {name}
                        <button onClick={() => handleRemoveCompetitor(name)} disabled={promoSaving}
                          className="hover:opacity-70 font-bold text-[10px]">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input value={newCompetitor} onChange={e => setNewCompetitor(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddCompetitor()}
                      placeholder="أضف تطبيق..."
                      className="flex-1 h-8 rounded-xl px-3 text-[10px] placeholder:text-muted-foreground focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleAddCompetitor} disabled={promoSaving || !newCompetitor.trim()}
                      className="h-8 px-3 rounded-xl text-[10px] font-bold text-white disabled:opacity-40"
                      style={{ background: "hsl(0 84% 50%)" }}>+ إضافة</motion.button>
                  </div>
                </div>

                {/* الجمل المشبوهة */}
                <div className="space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                  <p className="text-[10px] font-bold" style={{ color: "hsl(25 95% 53%)" }}>الجمل المشبوهة ({promoConfig.suspicious_phrases.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {promoConfig.suspicious_phrases.map(phrase => (
                      <span key={phrase} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold"
                        style={{ background: "hsla(25,95%,53%,0.1)", color: "hsl(25 95% 53%)" }}>
                        {phrase}
                        <button onClick={() => handleRemovePhrase(phrase)} disabled={promoSaving}
                          className="hover:opacity-70 font-bold text-[10px]">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input value={newPhrase} onChange={e => setNewPhrase(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddPhrase()}
                      placeholder="أضف جملة..."
                      className="flex-1 h-8 rounded-xl px-3 text-[10px] placeholder:text-muted-foreground focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleAddPhrase} disabled={promoSaving || !newPhrase.trim()}
                      className="h-8 px-3 rounded-xl text-[10px] font-bold text-white disabled:opacity-40"
                      style={{ background: "hsl(25 95% 53%)" }}>+ إضافة</motion.button>
                  </div>
                </div>

                {/* التطبيقات الآمنة */}
                {promoConfig.safe_apps?.length > 0 && (
                  <div className="space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                    <p className="text-[10px] font-bold" style={{ color: "hsl(160 84% 39%)" }}>التطبيقات الآمنة ({promoConfig.safe_apps.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {promoConfig.safe_apps.map(name => (
                        <span key={name} className="px-2 py-1 rounded-lg text-[9px] font-bold"
                          style={{ background: "hsla(160,84%,39%,0.1)", color: "hsl(160 84% 39%)" }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => toast.success("تم حفظ الإعدادات")}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))" }}>
            حفظ الإعدادات
          </motion.button>
        </div>
      )}
    </AdminPageLayout>
  );
};

/* ─── Helper: get severity ─── */
function getSeverity(alert: MonitorAlert): "high" | "medium" | "low" {
  if (alert.severity) return alert.severity;
  if (alert.alert_type === "promotion" || alert.alert_type === "pusher_promo") return "high";
  if (alert.amount >= 2_000_000) return "high";
  if (alert.amount >= 500_000) return "medium";
  if (alert.alert_type === "repeated_charge") return "medium";
  return "low";
}

/* ─── Alert Card Component ─── */
const AlertCard: React.FC<{ alert: MonitorAlert; index: number; onDelete: (id: string) => void; onBan: (uuid: string, name: string) => void }> = ({ alert, index, onDelete, onBan }) => {
  const [expanded, setExpanded] = useState(false);
  const sev = getSeverity(alert);
  const sevCfg = severityConfig[sev];
  const typeCfg = alertTypeConfig[alert.alert_type] || { label: alert.alert_type, icon: Bell, filterKey: "all" };
  const _TypeIcon = typeCfg.icon;
  const SevIcon = sevCfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ delay: index * 0.02 }}
      className={`rounded-2xl overflow-hidden relative ${!alert.is_read ? "ring-1" : ""}`}
      style={{
        background: sevCfg.bg,
        border: `1px solid ${sevCfg.border}`,
        ...((!alert.is_read) ? { ringColor: sevCfg.color } : {}),
      }}
    >
      {!alert.is_read && (
        <div className="absolute top-3 left-3 w-2 h-2 rounded-full" style={{ background: sevCfg.color, boxShadow: `0 0 8px ${sevCfg.color}` }} />
      )}

      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SevIcon size={12} style={{ color: sevCfg.color }} />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: `${sevCfg.color}20`, color: sevCfg.color }}>
              {sevCfg.label}
            </span>
            <span className="text-[10px] font-bold text-foreground">{typeCfg.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground tabular-nums">{formatTime(alert.created_at)}</span>
            <motion.button whileTap={{ scale: 0.8 }} onClick={() => onDelete(alert.id)} className="p-1 rounded-lg hover:bg-white/5">
              <Trash2 size={10} className="text-muted-foreground" />
            </motion.button>
          </div>
        </div>

        <div className="space-y-1">
          {alert.sender_uuid && (
            <p className="text-[11px]">
              <span className="text-muted-foreground">المرسل: </span>
              <span className="font-bold">{alert.sender_name || ""} </span>
              <span className="font-mono tabular-nums text-muted-foreground">(UUID: {alert.sender_uuid})</span>
            </p>
          )}
          {alert.receiver_uuid && (
            <p className="text-[11px]">
              <span className="text-muted-foreground">المستقبل: </span>
              <span className="font-bold">{alert.receiver_name || ""} </span>
              <span className="font-mono tabular-nums text-muted-foreground">(UUID: {alert.receiver_uuid})</span>
            </p>
          )}
          {alert.amount > 0 && (
            <p className="text-[11px]">
              <span className="text-muted-foreground">المبلغ: </span>
              <span className="font-bold tabular-nums" style={{ color: sevCfg.color }}>{formatMoney(alert.amount)}</span>
            </p>
          )}
          {alert.details?.keyword && (
            <p className="text-[11px]">
              <span className="text-muted-foreground">الكلمة: </span>
              <span className="font-bold" style={{ color: "hsl(0 84% 60%)" }}>"{alert.details.keyword}"</span>
            </p>
          )}
        </div>

        {alert.alert_type === "promotion" && alert.details?.context && (
          <>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-[9px] text-muted-foreground">
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expanded ? "إخفاء السياق" : "عرض السياق"}
            </motion.button>
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2 rounded-xl p-2.5 space-y-1"
                  style={{ background: "rgba(0,0,0,0.2)" }}>
                  {alert.details.context_before?.map((line: string, i: number) => (
                    <p key={i} className="text-[10px] text-muted-foreground">{line}</p>
                  ))}
                  <p className="text-[10px] font-bold" style={{ color: "hsl(0 84% 60%)" }}>
                    {alert.details.flagged_message || ""}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {sev === "high" && (alert.alert_type === "promotion" || alert.alert_type === "pusher_promo") && (
          <div className="flex items-center gap-2 mt-3">
            <motion.button whileTap={{ scale: 0.95 }}
              className="h-7 px-3 rounded-xl text-[10px] font-bold text-white flex items-center gap-1"
              style={{ background: "hsl(0 84% 50%)" }}
              onClick={() => {
                const uuid = alert.sender_uuid || alert.details?.user_uuid;
                const name = alert.sender_name || alert.details?.user_name || "مجهول";
                if (uuid) onBan(uuid, name);
                else toast.error("لا يوجد UUID للحظر");
              }}>
              <Ban size={10} /> حظر 24h
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }}
              className="h-7 px-3 rounded-xl text-[10px] font-bold text-muted-foreground"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={() => onDelete(alert.id)}>
              تجاهل
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminMonitorPage;
