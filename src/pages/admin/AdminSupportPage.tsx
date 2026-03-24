import React, { useState, useEffect, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminTicketManager from "@/components/AdminTicketManager";
import AdminSupportManager from "@/components/AdminSupportManager";
import { supabase } from "@/integrations/supabase/client";
import {
  Headset, Loader2, MessageSquare, Archive, Search, Ticket,
  Clock, AlertTriangle, CheckCircle2, Reply, Filter, ChevronDown,
  ShieldAlert, FileText, Phone, Flag, UserCircle, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

/* ─── Types ─── */
interface TicketRow {
  id: string;
  user_uuid: string;
  user_name: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  ticket_type: string;
  request_type?: string;
  escalation_level?: number;
  first_response_at?: string | null;
  escalated_at?: string | null;
  escalation_timer_started_at?: string | null;
  admin_reply?: string | null;
  admin_username?: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Config maps ─── */
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: "معلقة",     color: "hsl(38 92% 50%)",  bg: "rgba(245,158,11,0.12)", icon: Clock },
  open:      { label: "مفتوحة",    color: "hsl(38 92% 50%)",  bg: "rgba(245,158,11,0.12)", icon: Clock },
  escalated: { label: "مصعّدة",    color: "hsl(0 72% 51%)",   bg: "rgba(239,68,68,0.12)",  icon: AlertTriangle },
  replied:   { label: "تم الرد",   color: "hsl(217 91% 60%)", bg: "rgba(96,165,250,0.12)", icon: Reply },
  resolved:  { label: "محلولة",    color: "hsl(160 84% 39%)", bg: "rgba(16,185,129,0.12)", icon: CheckCircle2 },
  closed:    { label: "مغلقة",     color: "hsl(215 14% 60%)", bg: "rgba(148,163,184,0.08)", icon: Archive },
};

const TYPE_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  admin_visit:     { label: "طلب إداري",      icon: ShieldAlert },
  report:          { label: "بلاغ",           icon: Flag },
  complaint:       { label: "شكوى",           icon: FileText },
  direct_contact:  { label: "تواصل مباشر",    icon: Phone },
  general:         { label: "عام",            icon: MessageSquare },
  other:           { label: "أخرى",           icon: MessageSquare },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  high:   { label: "عالية",  color: "hsl(0 72% 51%)" },
  medium: { label: "متوسطة", color: "hsl(38 92% 50%)" },
  normal: { label: "عادية",  color: "hsl(215 14% 60%)" },
  low:    { label: "منخفضة", color: "hsl(215 14% 60%)" },
};

/* ─── Helpers ─── */
const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short",
    });
  } catch { return d; }
};

const glassCard = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 16px -4px rgba(0,0,0,0.3)",
};

/* ═══════════════════════════════════════════════════════════ */

const AdminSupportPage: React.FC = () => {
  const { handleLogout, adminUsername, adminDisplayName } = useAdminSession();
  const [subTab, setSubTab] = useState<"tickets" | "chats" | "archive" | "search">("tickets");

  /* ─── Ticket state ─── */
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);

  /* ─── Search tab state ─── */
  const [searchTabQuery, setSearchTabQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  /* ─── Load tickets ─── */
  const loadTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setTickets((data as any[]) || []);
    } catch {
      toast.error("فشل تحميل التذاكر");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  /* ─── Realtime ─── */
  useEffect(() => {
    const channel = supabase
      .channel("admin_support_tickets_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, (payload) => {
        const t = payload.new as TicketRow;
        setTickets(prev => [t, ...prev]);
        toast.info(`تذكرة جديدة من ${t.user_name}`, { description: t.subject, duration: 5000 });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets" }, (payload) => {
        const updated = payload.new as TicketRow;
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ─── Auto-escalation polling ─── */
  useEffect(() => {
    const checkEscalation = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await (supabase
        .from("support_tickets")
        .select("id") as any)
        .in("status", ["open", "pending"])
        .eq("escalation_level", 0)
        .is("first_response_at", null)
        .lt("escalation_timer_started_at", fiveMinAgo)
        .limit(50);

      if (data?.length) {
        for (const ticket of data) {
          await supabase.from("support_tickets").update({
            escalation_level: 1,
            assigned_role: "super_admin",
            status: "escalated",
            escalated_at: new Date().toISOString(),
          } as any).eq("id", ticket.id);

          await supabase.from("ticket_audit_log").insert({
            ticket_id: ticket.id,
            action: "escalated_to_super",
            performed_by: "system",
            performed_by_name: "نظام التصعيد التلقائي",
            details: { reason: "no_admin_response_5min" },
          });

          await supabase.from("ticket_messages" as any).insert({
            ticket_id: ticket.id,
            message: "تم التصعيد تلقائياً للسوبر أدمن بسبب عدم الرد خلال 5 دقائق",
            sender_name: "النظام",
            sender_type: "system",
          });
        }
      }
    };
    checkEscalation();
    const interval = setInterval(checkEscalation, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ─── Stats ─── */
  const stats = {
    pending:   tickets.filter(t => t.status === "pending" || t.status === "open").length,
    escalated: tickets.filter(t => t.status === "escalated").length,
    replied:   tickets.filter(t => t.status === "replied").length,
    resolved:  tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  };

  /* ─── Filtered tickets ─── */
  const filtered = tickets.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    const tType = (t as any).request_type || t.ticket_type || "general";
    if (typeFilter !== "all" && tType !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!t.id.toLowerCase().includes(q) && !t.user_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /* ─── Search tab ─── */
  const doSearch = async () => {
    if (!searchTabQuery.trim()) return;
    setSearchLoading(true);
    try {
      const q = searchTabQuery.trim();
      const { data: tix } = await supabase.from("support_tickets").select("*")
        .or(`user_uuid.eq.${q},id.eq.${q}`).order("created_at", { ascending: false }).limit(20);
      const { data: chats } = await supabase.from("support_chat_sessions").select("*")
        .or(`user_uuid.eq.${q},id.eq.${q}`).order("created_at", { ascending: false }).limit(20);
      setSearchResults([
        ...(tix || []).map(t => ({ ...t, _type: "ticket" })),
        ...(chats || []).map(c => ({ ...c, _type: "chat" })),
      ]);
    } catch {}
    finally { setSearchLoading(false); }
  };

  /* ─── Open ticket in AdminTicketManager ─── */
  if (selectedTicket) {
    return (
      <AdminPageLayout title="الدعم الفني" accentColor="hsl(188 86% 53%)" onLogout={handleLogout}>
        <div className="max-w-[448px] mx-auto p-4" dir="rtl">
          <AdminTicketManager
            adminUsername={adminUsername || ""}
            adminDisplayName={adminDisplayName || ""}
            canAct={true}
          />
        </div>
      </AdminPageLayout>
    );
  }

  /* ═══ Stat Card Component ═══ */
  const StatCard = ({ label, count, color, bg, icon: Icon }: {
    label: string; count: number; color: string; bg: string; icon: React.ElementType;
  }) => (
    <motion.div whileTap={{ scale: 0.97 }} className="rounded-2xl p-3 flex-1 min-w-0" style={{ background: bg, border: `1px solid ${color}22` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
      </div>
      <p className="text-xl font-black tabular-nums" style={{ color }}>{count}</p>
    </motion.div>
  );

  return (
    <AdminPageLayout title="الدعم الفني" accentColor="hsl(188 86% 53%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(6,182,212,0.1)" }}>
          {([
            { key: "tickets" as const, label: "تذاكر", icon: Ticket },
            { key: "chats" as const, label: "محادثات", icon: MessageSquare },
            { key: "archive" as const, label: "أرشيف", icon: Archive },
            { key: "search" as const, label: "بحث", icon: Search },
          ]).map(t => {
            const Icon = t.icon;
            return (
              <motion.button key={t.key} onClick={() => setSubTab(t.key)} whileTap={{ scale: 0.96 }}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${subTab === t.key ? "text-admin-cyan" : "text-muted-foreground"}`}
                style={subTab === t.key ? { background: "rgba(6,182,212,0.12)", boxShadow: "0 2px 8px rgba(6,182,212,0.15)" } : {}}>
                <Icon className="w-4 h-4" />{t.label}
                {t.key === "tickets" && stats.pending + stats.escalated > 0 && (
                  <span className="w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center bg-destructive text-white">
                    {stats.pending + stats.escalated}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══════════════════ TICKETS TAB ═══════════════════ */}
          {subTab === "tickets" && (
            <motion.div key="tickets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                <StatCard label="معلقة"    count={stats.pending}   color="hsl(38 92% 50%)"  bg="rgba(245,158,11,0.08)" icon={Clock} />
                <StatCard label="مصعّدة"   count={stats.escalated} color="hsl(0 72% 51%)"   bg="rgba(239,68,68,0.08)"  icon={AlertTriangle} />
                <StatCard label="تم الرد"  count={stats.replied}   color="hsl(217 91% 60%)" bg="rgba(96,165,250,0.08)" icon={Reply} />
                <StatCard label="محلولة"   count={stats.resolved}  color="hsl(160 84% 39%)" bg="rgba(16,185,129,0.08)" icon={CheckCircle2} />
              </div>

              {/* Filters */}
              <div className="space-y-2">
                {/* Search */}
                <div className="flex gap-2">
                  <input
                    placeholder="بحث برقم التذكرة أو اسم المستخدم..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 h-9 rounded-xl px-3 text-[11px] focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <motion.button whileTap={{ scale: 0.95 }} onClick={loadTickets}
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(6,182,212,0.12)" }}>
                    <RefreshCw className="w-3.5 h-3.5 text-admin-cyan" />
                  </motion.button>
                </div>

                {/* Filter row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      className="w-full h-8 rounded-lg px-2 text-[10px] font-bold appearance-none cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "inherit" }}>
                      <option value="all">كل الحالات</option>
                      <option value="pending">معلقة</option>
                      <option value="open">مفتوحة</option>
                      <option value="escalated">مصعّدة</option>
                      <option value="replied">تم الرد</option>
                      <option value="resolved">محلولة</option>
                      <option value="closed">مغلقة</option>
                    </select>
                    <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                      className="w-full h-8 rounded-lg px-2 text-[10px] font-bold appearance-none cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "inherit" }}>
                      <option value="all">كل الأنواع</option>
                      <option value="admin_visit">طلب إداري</option>
                      <option value="report">بلاغ</option>
                      <option value="complaint">شكوى</option>
                      <option value="direct_contact">تواصل مباشر</option>
                    </select>
                    <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Ticket list */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Ticket className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">لا توجد تذاكر</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((ticket, i) => {
                    const st = STATUS_MAP[ticket.status] || STATUS_MAP.pending;
                    const tType = (ticket as any).request_type || ticket.ticket_type || "general";
                    const tp = TYPE_MAP[tType] || TYPE_MAP.general;
                    const pr = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.normal;
                    const StIcon = st.icon;
                    const TpIcon = tp.icon;

                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelectedTicket(ticket)}
                        className="rounded-2xl p-3.5 cursor-pointer active:scale-[0.98] transition-all"
                        style={{
                          ...glassCard,
                          borderRight: `3px solid ${st.color}`,
                        }}
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.bg }}>
                              <StIcon className="w-4 h-4" style={{ color: st.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{ticket.user_name || "مستخدم"}</p>
                              <p className="text-[9px] text-muted-foreground font-mono truncate" dir="ltr">{ticket.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Priority */}
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold" style={{ color: pr.color, background: `${pr.color}18` }}>
                              {pr.label}
                            </span>
                            {/* Status badge */}
                            <span className="text-[9px] px-2 py-0.5 rounded-lg font-bold" style={{ color: st.color, background: st.bg }}>
                              {st.label}
                            </span>
                          </div>
                        </div>

                        {/* Subject */}
                        <p className="text-xs font-bold text-foreground mb-1 truncate">{ticket.subject}</p>

                        {/* Bottom row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <TpIcon className="w-3 h-3" />
                            <span>{tp.label}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground tabular-nums flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>

                        {/* Escalation indicator */}
                        {ticket.status === "escalated" && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "hsl(0 72% 51%)" }}>
                            <AlertTriangle className="w-3 h-3" />
                            <span>تم التصعيد للسوبر أدمن</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════ CHATS TAB ═══════════════════ */}
          {subTab === "chats" && (
            <motion.div key="chats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AdminSupportManager adminUsername={adminUsername || ""} adminDisplayName={adminDisplayName || ""} canAct={true} />
            </motion.div>
          )}

          {/* ═══════════════════ ARCHIVE TAB ═══════════════════ */}
          {subTab === "archive" && (
            <motion.div key="archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AdminSupportManager adminUsername={adminUsername || ""} adminDisplayName={adminDisplayName || ""} canAct={false} />
            </motion.div>
          )}

          {/* ═══════════════════ SEARCH TAB ═══════════════════ */}
          {subTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-2xl p-4 space-y-3"
                style={{ background: "linear-gradient(145deg, rgba(6,182,212,0.08), rgba(6,182,212,0.02))", border: "1px solid rgba(6,182,212,0.12)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)" }}>
                    <Search className="w-4 h-4 text-admin-cyan" />
                  </div>
                  <span className="text-sm font-bold text-admin-cyan">بحث في الدعم</span>
                </div>
                <div className="flex gap-2">
                  <input placeholder="UUID أو رقم التذكرة" value={searchTabQuery} onChange={e => setSearchTabQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && doSearch()}
                    className="flex-1 h-11 rounded-xl px-4 text-sm tabular-nums focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} dir="ltr" />
                  <motion.button whileTap={{ scale: 0.95 }} onClick={doSearch} disabled={searchLoading}
                    className="px-4 h-11 rounded-xl text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, hsl(188 86% 53%), hsl(188 86% 43%))", boxShadow: "0 2px 8px rgba(6,182,212,0.3)" }}>
                    {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
                  </motion.button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((item: any, i: number) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="rounded-2xl p-3.5" style={glassCard}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold">{item.user_name || item.subject || "—"}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{item.user_uuid}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold" style={{ background: "rgba(6,182,212,0.12)", color: "hsl(188 86% 53%)" }}>
                            {item._type === "ticket" ? "تذكرة" : "محادثة"}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                            style={item.status === "open" || item.status === "pending" ? { background: "rgba(245,158,11,0.12)", color: "hsl(38 92% 50%)" } : { background: "rgba(16,185,129,0.12)", color: "hsl(160 84% 39%)" }}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                      {item.subject && <p className="text-[11px] text-muted-foreground mt-1">{item.subject}</p>}
                      <p className="text-[9px] text-muted-foreground mt-1 tabular-nums">{new Date(item.created_at).toLocaleString("ar-EG")}</p>
                    </motion.div>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && searchTabQuery && !searchLoading && (
                <div className="text-center py-10 text-muted-foreground">
                  <Headset className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>لا توجد نتائج</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminSupportPage;
