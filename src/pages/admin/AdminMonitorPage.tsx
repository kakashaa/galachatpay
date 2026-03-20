
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import { supabase } from "@/integrations/supabase/client";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import { Eye, Bell, List, Bot, Send, Loader2, Volume2, VolumeX, Trash2, CheckCheck, Zap, RefreshCw, DollarSign, Megaphone, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playNotificationSound } from "@/lib/notificationSound";

/* ─── Types ─── */
interface MonitorAlert {
  id: string;
  alert_type: string;
  sender_uuid: string | null;
  receiver_uuid: string | null;
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

/* ─── Alert Type Config ─── */
const alertConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  big_charge: { label: "شحنة كبيرة", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", icon: Zap },
  repeated_charge: { label: "شحنات متكررة", color: "#f97316", bg: "rgba(249,115,22,0.08)", icon: RefreshCw },
  manual_salary: { label: "راتب يدوي", color: "#10b981", bg: "rgba(16,185,129,0.08)", icon: DollarSign },
  promotion: { label: "ترويج محتمل", color: "#f43f5e", bg: "rgba(244,63,94,0.08)", icon: Megaphone },
};

/* ─── Monitor Type Config ─── */
const monitorTypes = [
  { key: "big_charge", label: "شحنات كبيرة (> 500K)", icon: "💰" },
  { key: "repeated_charge", label: "شحنات متكررة (3+ بنفس اليوم)", icon: "🔁" },
  { key: "manual_salary", label: "رواتب يدوية", icon: "💵" },
  { key: "promotion", label: "ترويج بالرسائل", icon: "📢" },
];

const formatTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
};

const formatNumber = (n: number) => n?.toLocaleString("en-US") ?? "0";

/* ═══════════════════════════════════════ */
/*             MAIN COMPONENT             */
/* ═══════════════════════════════════════ */
const AdminMonitorPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [tab, setTab] = useState<"alerts" | "monitors" | "bot">("alerts");
  const [alertFilter, setAlertFilter] = useState<"all" | string>("all");

  /* ── Alerts State ── */
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevCountRef = useRef(0);

  /* ── Monitor toggles ── */
  const [enabledMonitors, setEnabledMonitors] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("monitor_toggles");
    return saved ? JSON.parse(saved) : { big_charge: true, repeated_charge: true, manual_salary: true, promotion: true };
  });

  /* ── Bot State ── */
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [botInput, setBotInput] = useState("");
  const [botLoading, setBotLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── Load Alerts ── */
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("monitor_alerts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      const newAlerts = (data || []) as unknown as MonitorAlert[];

      // Play sound for new alerts
      if (soundEnabled && newAlerts.length > prevCountRef.current && prevCountRef.current > 0) {
        playNotificationSound();
      }
      prevCountRef.current = newAlerts.length;
      setAlerts(newAlerts);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  useEffect(() => {
    loadAlerts();
    const iv = setInterval(loadAlerts, 60_000);
    return () => clearInterval(iv);
  }, [loadAlerts]);

  /* ── Mark as read ── */
  const markAllRead = async () => {
    const unread = alerts.filter(a => !a.is_read).map(a => a.id);
    if (unread.length === 0) return;
    await (supabase.from("monitor_alerts" as any) as any).update({ is_read: true }).in("id", unread);
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    toast.success("تم تعليم الكل كمقروء");
  };

  /* ── Delete alert ── */
  const deleteAlert = async (id: string) => {
    await (supabase.from("monitor_alerts" as any) as any).delete().eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  /* ── Toggle monitor ── */
  const toggleMonitor = (key: string) => {
    setEnabledMonitors(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("monitor_toggles", JSON.stringify(next));
      return next;
    });
  };

  /* ── Bot query ── */
  const handleBotQuery = async () => {
    if (!botInput.trim() || botLoading) return;
    const question = botInput.trim();
    setBotInput("");
    setChatMessages(prev => [...prev, { role: "user", text: question, time: formatTime(new Date().toISOString()) }]);
    setBotLoading(true);

    try {
      const res = await fetch(
        `https://hola-chat.com/wares-api.php?key=ghala2026actions&action=monitor-query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        }
      );
      const data = await res.json();
      setChatMessages(prev => [...prev, {
        role: "bot",
        text: data.answer || data.message || "لم أتمكن من معالجة الطلب",
        time: formatTime(new Date().toISOString()),
      }]);
    } catch {
      setChatMessages(prev => [...prev, {
        role: "bot",
        text: "⚠️ خطأ في الاتصال بالسيرفر — حاول مرة أخرى",
        time: formatTime(new Date().toISOString()),
      }]);
    } finally {
      setBotLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── Counts ── */
  const unreadCount = alerts.filter(a => !a.is_read).length;
  const filteredAlerts = alertFilter === "all" ? alerts : alerts.filter(a => a.alert_type === alertFilter);
  const todayAlerts = alerts.filter(a => {
    const d = new Date(a.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const todayCountByType = monitorTypes.map(m => ({
    ...m,
    count: todayAlerts.filter(a => a.alert_type === m.key).length,
  }));

  const alertSubTabs = [
    { key: "all", label: "الكل", icon: LayoutGrid, count: alerts.length },
    { key: "big_charge", label: "شحنات كبيرة", icon: Zap, count: alerts.filter(a => a.alert_type === "big_charge").length },
    { key: "repeated_charge", label: "شحنات متكررة", icon: RefreshCw, count: alerts.filter(a => a.alert_type === "repeated_charge").length },
    { key: "manual_salary", label: "رواتب يدوية", icon: DollarSign, count: alerts.filter(a => a.alert_type === "manual_salary").length },
    { key: "promotion", label: "ترويج", icon: Megaphone, count: alerts.filter(a => a.alert_type === "promotion").length },
  ];

  const tabs = [
    { key: "alerts" as const, label: "التنبيهات", icon: Bell, badge: unreadCount },
    { key: "monitors" as const, label: "المراقبات", icon: List, badge: 0 },
    { key: "bot" as const, label: "البوت الذكي", icon: Bot, badge: 0 },
  ];

  return (
    <AdminPageLayout title="المراقبة الذكية" onLogout={handleLogout}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <motion.button
              key={t.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all relative ${active ? "text-white" : "text-muted-foreground"}`}
              style={active ? {
                background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))",
                boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
              } : {}}
            >
              <Icon size={14} />
              {t.label}
              {t.badge > 0 && (
                <span className="h-4 min-w-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1 text-white"
                  style={{ background: "linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))" }}>
                  {t.badge > 99 ? "99+" : t.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ═══ TAB 1: Alerts ═══ */}
      {tab === "alerts" && (
        <div className="space-y-3">
          {/* Sub-tabs filter */}
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-1.5 min-w-max pb-1">
              {alertSubTabs.map(st => {
                const Icon = st.icon;
                const active = alertFilter === st.key;
                const cfg = alertConfig[st.key];
                const color = cfg?.color || "#10b981";
                return (
                  <motion.button
                    key={st.key}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setAlertFilter(st.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${active ? "text-white" : "text-muted-foreground"}`}
                    style={active ? {
                      background: st.key === "all"
                        ? "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))"
                        : `linear-gradient(135deg, ${color}, ${color}cc)`,
                      boxShadow: `0 3px 12px ${st.key === "all" ? "rgba(16,185,129,0.3)" : color + "40"}`,
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Icon size={12} />
                    {st.label}
                    {st.count > 0 && (
                      <span className={`h-4 min-w-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1 ${active ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground"}`}>
                        {st.count}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={markAllRead}
                className="h-8 px-3 rounded-xl text-[10px] font-bold flex items-center gap-1.5"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)", color: "#10b981" }}>
                <CheckCheck size={12} /> مقروء الكل
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {soundEnabled ? <Volume2 size={13} className="text-admin-emerald" /> : <VolumeX size={13} className="text-muted-foreground" />}
              </motion.button>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{filteredAlerts.length} تنبيه</span>
          </div>

          {loading && filteredAlerts.length === 0 && (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-admin-emerald" /></div>
          )}

          {!loading && filteredAlerts.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Eye size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                {alertFilter === "all" ? "لا توجد تنبيهات حالياً" : `لا توجد تنبيهات من نوع "${alertConfig[alertFilter]?.label || alertFilter}"`}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">يتم الفحص كل 60 ثانية</p>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {alerts.map((alert, i) => {
              const config = alertConfig[alert.alert_type] || { label: alert.alert_type, color: "#71717a", bg: "rgba(113,113,122,0.08)" };
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.02 }}
                  className={`rounded-2xl p-3.5 relative overflow-hidden ${!alert.is_read ? "ring-1" : ""}`}
                  style={{
                    background: config.bg,
                    border: `1px solid ${config.color}20`,
                    ...((!alert.is_read) ? { ringColor: config.color + "40" } : {}),
                  }}
                >
                  {!alert.is_read && (
                    <div className="absolute top-3 left-3 w-2 h-2 rounded-full" style={{ background: config.color, boxShadow: `0 0 8px ${config.color}` }} />
                  )}

                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: `${config.color}20`, color: config.color }}>
                      {config.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground tabular-nums">{formatTime(alert.created_at)}</span>
                      <motion.button whileTap={{ scale: 0.8 }} onClick={() => deleteAlert(alert.id)} className="p-1 rounded-lg hover:bg-white/5">
                        <Trash2 size={11} className="text-muted-foreground" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    {alert.sender_uuid && (
                      <p className="text-[11px] text-foreground">
                        <span className="text-muted-foreground">المرسل: </span>
                        <span className="font-mono font-bold tabular-nums">{alert.sender_uuid}</span>
                      </p>
                    )}
                    {alert.receiver_uuid && (
                      <p className="text-[11px] text-foreground">
                        <span className="text-muted-foreground">المستلم: </span>
                        <span className="font-mono font-bold tabular-nums">{alert.receiver_uuid}</span>
                      </p>
                    )}
                    {alert.amount > 0 && (
                      <p className="text-[11px] text-foreground">
                        <span className="text-muted-foreground">المبلغ: </span>
                        <span className="font-bold tabular-nums" style={{ color: config.color }}>{formatNumber(alert.amount)} كوينز</span>
                      </p>
                    )}
                    {alert.details && typeof alert.details === "object" && alert.details.note && (
                      <p className="text-[10px] text-muted-foreground mt-1">{alert.details.note}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ TAB 2: All Monitors ═══ */}
      {tab === "monitors" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground mb-2">أنواع المراقبة المتاحة</p>
          {todayCountByType.map((m, i) => (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{m.icon}</span>
                <div>
                  <p className="text-xs font-bold">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">{m.count} تنبيه اليوم</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleMonitor(m.key)}
                className={`w-11 h-6 rounded-full relative transition-colors ${enabledMonitors[m.key] ? "bg-admin-emerald" : "bg-zinc-700"}`}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white absolute top-0.5"
                  animate={{ x: enabledMonitors[m.key] ? 0 : 20 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </motion.div>
          ))}

          {/* Summary card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl p-4 mt-4"
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))",
              border: "1px solid rgba(16,185,129,0.12)",
            }}
          >
            <p className="text-xs font-bold text-admin-emerald mb-2">ملخص اليوم</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-admin-emerald">{todayAlerts.length}</p>
                <p className="text-[10px] text-muted-foreground">إجمالي التنبيهات</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-admin-amber">{unreadCount}</p>
                <p className="text-[10px] text-muted-foreground">غير مقروءة</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ TAB 3: AI Bot ═══ */}
      {tab === "bot" && (
        <div className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-4 px-1">
            {chatMessages.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <Bot size={40} className="mx-auto mb-3 text-admin-emerald/40" />
                <p className="text-xs text-muted-foreground">اسأل البوت أي سؤال عن المستخدمين</p>
                <div className="mt-4 space-y-2">
                  {[
                    "كم مرة شحن UUID 1000 هالشهر؟",
                    "جيب لي كل اللي شحنوا فوق مليون اليوم",
                    "هل UUID 5555 محظور؟",
                  ].map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setBotInput(q); }}
                      className="w-full text-[11px] py-2.5 px-4 rounded-xl text-right text-muted-foreground"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {q}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3"
                  style={msg.role === "user" ? {
                    background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))",
                    borderBottomLeftRadius: "20px",
                    borderBottomRightRadius: "6px",
                  } : {
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderBottomLeftRadius: "6px",
                    borderBottomRightRadius: "20px",
                  }}
                >
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[8px] mt-1 ${msg.role === "user" ? "text-white/50" : "text-muted-foreground/50"} tabular-nums`}>
                    {msg.time}
                  </p>
                </div>
              </motion.div>
            ))}

            {botLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-admin-emerald" />
                    <span className="text-[11px] text-muted-foreground">جاري التحليل...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              value={botInput}
              onChange={e => setBotInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleBotQuery()}
              placeholder="اسأل البوت..."
              className="flex-1 h-11 rounded-2xl px-4 text-sm placeholder:text-muted-foreground focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleBotQuery}
              disabled={botLoading || !botInput.trim()}
              className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))",
                boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
              }}
            >
              <Send size={16} className="text-white" />
            </motion.button>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
};

export default AdminMonitorPage;
