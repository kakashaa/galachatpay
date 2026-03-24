import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminSupportManager from "@/components/AdminSupportManager";
import { supabase } from "@/integrations/supabase/client";
import {
  Headset, Loader2, MessageSquare, Archive, Search, Ticket,
  Clock, AlertTriangle, CheckCircle2, Reply, ChevronDown,
  ShieldAlert, FileText, Phone, Flag, RefreshCw,
  ArrowRight, Send, ArrowUpCircle, User, Hash, MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

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
  room_code?: string;
  phone_number?: string;
  escalation_level?: number;
  first_response_at?: string | null;
  escalated_at?: string | null;
  escalation_timer_started_at?: string | null;
  admin_reply?: string | null;
  admin_username?: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  sender_name: string;
  sender_type: string;
  attachment_url?: string | null;
  created_at: string;
}

/* ─── Config maps ─── */
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:      { label: "معلقة",       color: "hsl(38 92% 50%)",  bg: "rgba(245,158,11,0.12)", icon: Clock },
  open:         { label: "مفتوحة",      color: "hsl(38 92% 50%)",  bg: "rgba(245,158,11,0.12)", icon: Clock },
  escalated:    { label: "مصعّدة",      color: "hsl(0 72% 51%)",   bg: "rgba(239,68,68,0.12)",  icon: AlertTriangle },
  transferred:  { label: "محوّلة",      color: "hsl(270 60% 55%)", bg: "rgba(168,85,247,0.12)", icon: ArrowUpCircle },
  replied:      { label: "تم الرد",     color: "hsl(217 91% 60%)", bg: "rgba(96,165,250,0.12)", icon: Reply },
  resolved:     { label: "محلولة",      color: "hsl(160 84% 39%)", bg: "rgba(16,185,129,0.12)", icon: CheckCircle2 },
  closed:       { label: "مغلقة",       color: "hsl(215 14% 60%)", bg: "rgba(148,163,184,0.08)", icon: Archive },
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
    return new Date(d).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" });
  } catch { return d; }
};
const formatTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString("ar-SA", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit" });
  } catch { return d; }
};

const glassCard = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 16px -4px rgba(0,0,0,0.3)",
};

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
const isAudio = (url: string) => /\.(webm|ogg|mp3|m4a|wav)(\?|$)/i.test(url);

/* ═══════════════════════════════════════════════════════════ */

/* ─── Support category filters ─── */
const _REGULAR_TYPES = ['general', 'technical', 'account', 'billing', 'مشكلة تقنية', 'حساب', 'رصيد/شحن', 'هدايا', 'صوت/غرف', 'استفسار', 'بلاغ', 'other'];
const QUICK_TYPES = ['admin_visit', 'report', 'complaint', 'direct_contact'];

const isQuickTicket = (t: TicketRow) => {
  const rt = t.request_type || t.ticket_type || 'general';
  return QUICK_TYPES.includes(rt);
};

const AdminSupportPage: React.FC = () => {
  const { handleLogout, adminUsername, adminDisplayName, isRegularAdmin } = useAdminSession();
  const [mainTab, setMainTab] = useState<"regular" | "quick">(isRegularAdmin ? "regular" : "regular");
  const [subTab, setSubTab] = useState<"tickets" | "chats" | "archive" | "search" | "admin_requests" | "transferred">("tickets");

  /* ─── Ticket list state ─── */
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  /* ─── Ticket detail state ─── */
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ─── Search tab state ─── */
  const [searchTabQuery, setSearchTabQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  /* ─── Load tickets ─── */
  const loadTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets").select("*")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      setTickets((data as any[]) || []);
    } catch { toast.error("فشل تحميل التذاكر"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  /* ─── Realtime tickets ─── */
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
        setSelectedTicket(prev => prev?.id === updated.id ? updated : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ─── Auto-escalation polling ─── */
  useEffect(() => {
    const checkEscalation = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await (supabase
        .from("support_tickets").select("id") as any)
        .in("status", ["open", "pending"])
        .eq("escalation_level", 0)
        .is("first_response_at", null)
        .lt("escalation_timer_started_at", fiveMinAgo)
        .limit(50);

      if (data?.length) {
        for (const ticket of data) {
          await supabase.from("support_tickets").update({
            escalation_level: 1, assigned_role: "super_admin",
            status: "escalated", escalated_at: new Date().toISOString(),
          } as any).eq("id", ticket.id);

          await supabase.from("ticket_audit_log").insert({
            ticket_id: ticket.id, action: "escalated_to_super",
            performed_by: "system", performed_by_name: "نظام التصعيد التلقائي",
            details: { reason: "no_admin_response_5min" },
          });
          await supabase.from("ticket_messages" as any).insert({
            ticket_id: ticket.id,
            message: "تم التصعيد تلقائياً للسوبر أدمن بسبب عدم الرد خلال 5 دقائق",
            sender_name: "النظام", sender_type: "system",
          });
        }
      }
    };
    checkEscalation();
    const interval = setInterval(checkEscalation, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ─── Load messages for selected ticket ─── */
  const loadMessages = useCallback(async (ticketId: string) => {
    setMsgsLoading(true);
    try {
      const { data } = await supabase
        .from("ticket_messages" as any).select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      setMessages((data as unknown as TicketMessage[]) || []);
    } catch {}
    setMsgsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedTicket) loadMessages(selectedTicket.id);
    else setMessages([]);
  }, [selectedTicket?.id]);

  /* ─── Realtime messages ─── */
  useEffect(() => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id;
    const channel = supabase
      .channel(`admin-tkt-msgs-${ticketId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "ticket_messages",
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        const msg = payload.new as TicketMessage;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender_type === "user") toast.info(`رسالة جديدة من ${msg.sender_name}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket?.id]);

  /* ─── Auto-scroll ─── */
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current?.scrollHeight || 0, behavior: "smooth" }), 100);
  }, [messages.length]);

  /* ─── Category-filtered tickets ─── */
  const categoryTickets = tickets.filter(t => mainTab === "quick" ? isQuickTicket(t) : !isQuickTicket(t));

  /* ─── Stats (based on current mainTab) ─── */
  const stats = {
    pending:   categoryTickets.filter(t => t.status === "pending" || t.status === "open").length,
    escalated: categoryTickets.filter(t => t.status === "escalated").length,
    replied:   categoryTickets.filter(t => t.status === "replied").length,
    resolved:  categoryTickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  };

  /* ─── Filtered tickets ─── */
  const filtered = categoryTickets.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    const tType = (t as any).request_type || t.ticket_type || "general";
    if (typeFilter !== "all" && tType !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!t.id.toLowerCase().includes(q) && !t.user_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /* ═══ ACTIONS ═══ */
  const handleReply = async () => {
    if (!replyText.trim() || sending || !selectedTicket) return;
    setSending(true);
    const msg = replyText.trim();
    const now = new Date().toISOString();

    // Optimistic
    const optimistic: TicketMessage = {
      id: `local-${Date.now()}`, ticket_id: selectedTicket.id,
      message: msg, sender_name: adminDisplayName || adminUsername || "أدمن",
      sender_type: "admin", created_at: now,
    };
    setMessages(prev => [...prev, optimistic]);
    setReplyText("");

    try {
      await supabase.from("ticket_messages" as any).insert({
        ticket_id: selectedTicket.id, message: msg,
        sender_name: adminDisplayName || adminUsername || "أدمن",
        sender_type: "admin",
      });

      const updates: any = {
        status: "replied",
        admin_username: adminUsername,
        replied_at: now,
      };
      if (!selectedTicket.first_response_at) updates.first_response_at = now;
      await supabase.from("support_tickets").update(updates).eq("id", selectedTicket.id);

      await supabase.from("ticket_audit_log").insert({
        ticket_id: selectedTicket.id, action: "admin_replied",
        performed_by: adminUsername, performed_by_name: adminDisplayName || adminUsername,
        details: { message_preview: msg.substring(0, 100) },
      });

      toast.success("تم إرسال الرد");
    } catch {
      toast.error("فشل إرسال الرد");
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setReplyText(msg);
    }
    setSending(false);
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    setActionLoading("resolve");
    const now = new Date().toISOString();
    try {
      await supabase.from("support_tickets").update({
        status: "resolved", resolved_at: now,
      } as any).eq("id", selectedTicket.id);

      await supabase.from("ticket_messages" as any).insert({
        ticket_id: selectedTicket.id,
        message: "تم حل التذكرة بواسطة الأدمن",
        sender_name: adminDisplayName || adminUsername || "أدمن",
        sender_type: "system",
      });

      await supabase.from("ticket_audit_log").insert({
        ticket_id: selectedTicket.id, action: "resolved",
        performed_by: adminUsername, performed_by_name: adminDisplayName || adminUsername,
      });

      toast.success("تم حل التذكرة");
    } catch { toast.error("فشل تحديث الحالة"); }
    setActionLoading(null);
  };

  const handleEscalate = async () => {
    if (!selectedTicket) return;
    setActionLoading("escalate");
    const now = new Date().toISOString();
    try {
      await supabase.from("support_tickets").update({
        escalation_level: 1, assigned_role: "super_admin",
        status: "escalated", escalated_at: now,
      } as any).eq("id", selectedTicket.id);

      await supabase.from("ticket_messages" as any).insert({
        ticket_id: selectedTicket.id,
        message: "تم التصعيد يدوياً للسوبر أدمن",
        sender_name: adminDisplayName || adminUsername || "أدمن",
        sender_type: "system",
      });

      await supabase.from("ticket_audit_log").insert({
        ticket_id: selectedTicket.id, action: "escalated_to_super",
        performed_by: adminUsername, performed_by_name: adminDisplayName || adminUsername,
        details: { reason: "manual_escalation" },
      });

      toast.success("تم التصعيد للسوبر أدمن");
    } catch { toast.error("فشل التصعيد"); }
    setActionLoading(null);
  };

  /* ─── Transfer to super (regular admin) ─── */
  const handleTransferToSuper = async () => {
    if (!selectedTicket) return;
    setActionLoading("transfer");
    const now = new Date().toISOString();
    try {
      await supabase.from("support_tickets").update({
        assigned_role: "super_admin", status: "transferred", escalated_at: now, escalation_level: 1,
      } as any).eq("id", selectedTicket.id);

      await supabase.from("ticket_messages" as any).insert({
        ticket_id: selectedTicket.id,
        message: "📤 تم تحويل التذكرة للسوبر أدمن",
        sender_name: adminDisplayName || adminUsername || "أدمن",
        sender_type: "system",
      });

      await supabase.from("ticket_audit_log").insert({
        ticket_id: selectedTicket.id, action: "transferred_to_super",
        performed_by: adminUsername, performed_by_name: adminDisplayName || adminUsername,
        details: { reason: "admin_transfer" },
      });

      toast.success("تم تحويل التذكرة للسوبر أدمن");
    } catch { toast.error("فشل التحويل"); }
    setActionLoading(null);
  };

  /* ─── Request help from super (regular admin) ─── */
  const handleRequestHelp = async () => {
    if (!selectedTicket) return;
    setActionLoading("help");
    try {
      await supabase.from("ticket_audit_log").insert({
        ticket_id: selectedTicket.id, action: "help_requested",
        performed_by: adminUsername, performed_by_name: adminDisplayName || adminUsername,
        details: { admin_username: adminUsername },
      });

      await supabase.from("ticket_messages" as any).insert({
        ticket_id: selectedTicket.id,
        message: "🆘 طلب مساعدة من السوبر أدمن",
        sender_name: adminDisplayName || adminUsername || "أدمن",
        sender_type: "system",
      });

      toast.success("تم إرسال طلب المساعدة");
    } catch { toast.error("فشل إرسال طلب المساعدة"); }
    setActionLoading(null);
  };

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

  /* ═══════════════════ TICKET DETAIL VIEW ═══════════════════ */
  if (selectedTicket) {
    const st = STATUS_MAP[selectedTicket.status] || STATUS_MAP.pending;
    const tType = (selectedTicket as any).request_type || selectedTicket.ticket_type || "general";
    const tp = TYPE_MAP[tType] || TYPE_MAP.general;
    const TpIcon = tp.icon;
    const isResolved = selectedTicket.status === "resolved" || selectedTicket.status === "closed";

    return (
      <AdminPageLayout title="تفاصيل التذكرة" accentColor="hsl(188 86% 53%)" onLogout={handleLogout}>
        <div className="max-w-[448px] mx-auto flex flex-col h-[calc(100vh-100px)]" dir="rtl">

          {/* ─── Header ─── */}
          <div className="px-4 py-3 border-b border-border/20 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setSelectedTicket(null)}
                className="text-xs text-admin-cyan font-bold flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" /> رجوع
              </button>
              <span className="text-[9px] px-2 py-0.5 rounded-lg font-bold" style={{ color: st.color, background: st.bg }}>
                {st.label}
              </span>
            </div>

            {/* Ticket info cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-2.5" style={glassCard}>
                <div className="flex items-center gap-1.5 mb-1 text-[9px] text-muted-foreground">
                  <Hash className="w-3 h-3" /> رقم التذكرة
                </div>
                <p className="text-[10px] font-mono font-bold text-amber-400 truncate" dir="ltr">{selectedTicket.id}</p>
              </div>
              <div className="rounded-xl p-2.5" style={glassCard}>
                <div className="flex items-center gap-1.5 mb-1 text-[9px] text-muted-foreground">
                  <TpIcon className="w-3 h-3" /> النوع
                </div>
                <p className="text-[10px] font-bold text-foreground">{tp.label}</p>
              </div>
              <div className="rounded-xl p-2.5" style={glassCard}>
                <div className="flex items-center gap-1.5 mb-1 text-[9px] text-muted-foreground">
                  <User className="w-3 h-3" /> المستخدم
                </div>
                <p className="text-[10px] font-bold text-foreground truncate">{selectedTicket.user_name}</p>
                <p className="text-[8px] text-muted-foreground font-mono truncate" dir="ltr">{selectedTicket.user_uuid}</p>
              </div>
              <div className="rounded-xl p-2.5" style={glassCard}>
                <div className="flex items-center gap-1.5 mb-1 text-[9px] text-muted-foreground">
                  <Clock className="w-3 h-3" /> الإنشاء
                </div>
                <p className="text-[10px] font-bold text-foreground tabular-nums">{formatDate(selectedTicket.created_at)}</p>
              </div>
              {(selectedTicket as any).room_code && (
                <div className="rounded-xl p-2.5" style={glassCard}>
                  <div className="flex items-center gap-1.5 mb-1 text-[9px] text-muted-foreground">
                    <MapPin className="w-3 h-3" /> الغرفة
                  </div>
                  <p className="text-[10px] font-bold text-foreground" dir="ltr">{(selectedTicket as any).room_code}</p>
                </div>
              )}
              {(selectedTicket as any).phone_number && (
                <div className="rounded-xl p-2.5" style={glassCard}>
                  <div className="flex items-center gap-1.5 mb-1 text-[9px] text-muted-foreground">
                    <Phone className="w-3 h-3" /> الهاتف
                  </div>
                  <p className="text-[10px] font-bold text-foreground" dir="ltr">{(selectedTicket as any).phone_number}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!isResolved && (
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Resolve & Escalate — hide for regular admin on transferred tickets */}
                {!(isRegularAdmin && selectedTicket.status === "transferred") && (
                  <>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleResolve}
                      disabled={actionLoading === "resolve"}
                      className="flex-1 h-8 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 text-white"
                      style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}>
                      {actionLoading === "resolve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      تم الحل
                    </motion.button>
                    {!isRegularAdmin && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleEscalate}
                        disabled={actionLoading === "escalate" || (selectedTicket.escalation_level || 0) > 0}
                        className="flex-1 h-8 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
                        style={{ background: "rgba(239,68,68,0.12)", color: "hsl(0 72% 51%)" }}>
                        {actionLoading === "escalate" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />}
                        تصعيد
                      </motion.button>
                    )}
                  </>
                )}
                {/* Regular admin: transfer & help buttons */}
                {isRegularAdmin && selectedTicket.status !== "transferred" && (
                  <>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleTransferToSuper}
                      disabled={!!actionLoading}
                      className="flex-1 h-8 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1"
                      style={{ background: "rgba(168,85,247,0.12)", color: "hsl(270 60% 55%)" }}>
                      {actionLoading === "transfer" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />}
                      تحويل للسوبر
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleRequestHelp}
                      disabled={!!actionLoading}
                      className="flex-1 h-8 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1"
                      style={{ background: "rgba(245,158,11,0.12)", color: "hsl(38 92% 50%)" }}>
                      {actionLoading === "help" ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                      طلب مساعدة
                    </motion.button>
                  </>
                )}
                {/* Regular admin: read-only notice on transferred tickets */}
                {isRegularAdmin && selectedTicket.status === "transferred" && (
                  <div className="w-full text-center text-[10px] font-bold py-2 rounded-xl"
                    style={{ background: "rgba(168,85,247,0.08)", color: "hsl(270 60% 55%)" }}>
                    📤 تم تحويل التذكرة — للقراءة فقط
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Messages ─── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {msgsLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">لا توجد رسائل بعد</p>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map(msg => {
                  const isAdmin = msg.sender_type === "admin";
                  const isSystem = msg.sender_type === "system";

                  if (isSystem) {
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex justify-center">
                        <div className="px-3 py-1.5 rounded-full text-[9px] text-muted-foreground"
                          style={{ background: "rgba(255,255,255,0.04)" }}>
                          {msg.message}
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${isAdmin ? "rounded-tl-md" : "rounded-tr-md"}`}
                        style={{
                          background: isAdmin ? "rgba(148,163,184,0.1)" : "rgba(96,165,250,0.12)",
                          border: `1px solid ${isAdmin ? "rgba(148,163,184,0.12)" : "rgba(96,165,250,0.15)"}`,
                        }}>
                        <span className={`text-[9px] font-bold block mb-0.5 ${isAdmin ? "text-muted-foreground" : "text-blue-400"}`}>
                          {msg.sender_name}
                        </span>

                        {/* Attachment */}
                        {msg.attachment_url && (
                          isAudio(msg.attachment_url) ? (
                            <audio controls src={msg.attachment_url} className="w-full max-w-[200px] h-8 my-1" />
                          ) : isImage(msg.attachment_url) ? (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block my-1">
                              <img src={msg.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-40 object-cover" />
                            </a>
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-admin-cyan underline block my-1">عرض المرفق</a>
                          )
                        )}

                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{msg.message}</p>
                        <span className="text-[8px] text-muted-foreground mt-1 block text-left tabular-nums">{formatTime(msg.created_at)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* ─── Reply input (hidden for regular admin on transferred tickets) ─── */}
          {!isResolved && !(isRegularAdmin && selectedTicket.status === "transferred") && (
            <div className="sticky bottom-0 border-t border-border/20 px-4 py-3 shrink-0 mb-24 z-30"
              style={{ background: "rgba(10,10,20,0.95)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-end gap-2">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  placeholder="اكتب ردك..."
                  rows={1}
                  className="flex-1 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none min-h-[40px] max-h-[120px]"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleReply}
                  disabled={!replyText.trim() || sending}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40 shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(188 86% 53%), hsl(188 86% 43%))" }}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
          )}
          {(isResolved || (isRegularAdmin && selectedTicket.status === "transferred")) && <div className="pb-24" />}
        </div>
      </AdminPageLayout>
    );
  }

  /* ═══ Stat Card ═══ */
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

  /* ═══════════════════ MAIN LIST VIEW ═══════════════════ */

  /* Badge counts for main tabs */
  const regularCount = tickets.filter(t => !isQuickTicket(t) && (t.status === "pending" || t.status === "open" || t.status === "escalated")).length;
  const quickCount = tickets.filter(t => isQuickTicket(t) && (t.status === "pending" || t.status === "open" || t.status === "escalated")).length;

  return (
    <AdminPageLayout title="الدعم الفني" accentColor="hsl(188 86% 53%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">

        {/* ─── Main Category Tabs (hide quick for regular admin) ─── */}
        {!isRegularAdmin && (
          <div className="flex gap-2 rounded-2xl p-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {([
              { key: "regular" as const, label: "الدعم العادي", icon: Headset, badge: regularCount },
              { key: "quick" as const, label: "الدعم السريع", icon: ShieldAlert, badge: quickCount },
            ]).map(t => {
              const Icon = t.icon;
              const active = mainTab === t.key;
              return (
                <motion.button key={t.key} onClick={() => { setMainTab(t.key); setSubTab("tickets"); setStatusFilter("all"); setTypeFilter("all"); }}
                  whileTap={{ scale: 0.96 }}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${active ? "text-white" : "text-muted-foreground"}`}
                  style={active ? {
                    background: t.key === "quick"
                      ? "linear-gradient(135deg, hsl(0 72% 51%), hsl(350 89% 50%))"
                      : "linear-gradient(135deg, hsl(188 86% 53%), hsl(188 86% 43%))",
                    boxShadow: t.key === "quick" ? "0 2px 12px rgba(239,68,68,0.3)" : "0 2px 12px rgba(6,182,212,0.3)",
                  } : {}}>
                  <Icon className="w-4 h-4" />{t.label}
                  {t.badge > 0 && (
                    <span className="min-w-5 h-5 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                      style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(239,68,68,0.8)", color: "white" }}>
                      {t.badge}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl p-1 overflow-x-auto" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(6,182,212,0.1)" }}>
          {([
            { key: "tickets" as const, label: "تذاكر", icon: Ticket, superOnly: false },
            ...(isRegularAdmin ? [] : [
              { key: "admin_requests" as const, label: "طلبات الأدمن", icon: AlertTriangle, superOnly: true },
              { key: "transferred" as const, label: "محوّلة", icon: ArrowUpCircle, superOnly: true },
            ]),
            { key: "chats" as const, label: "محادثات", icon: MessageSquare, superOnly: false },
            { key: "archive" as const, label: "أرشيف", icon: Archive, superOnly: false },
            { key: "search" as const, label: "بحث", icon: Search, superOnly: false },
          ]).map(t => {
            const Icon = t.icon;
            return (
              <motion.button key={t.key} onClick={() => setSubTab(t.key as any)} whileTap={{ scale: 0.96 }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${subTab === t.key ? "text-admin-cyan" : "text-muted-foreground"}`}
                style={subTab === t.key ? { background: "rgba(6,182,212,0.12)", boxShadow: "0 2px 8px rgba(6,182,212,0.15)" } : {}}>
                <Icon className="w-3.5 h-3.5" />{t.label}
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
          {/* TICKETS TAB */}
          {subTab === "tickets" && (
            <motion.div key="tickets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <StatCard label="معلقة" count={stats.pending} color="hsl(38 92% 50%)" bg="rgba(245,158,11,0.08)" icon={Clock} />
                <StatCard label="مصعّدة" count={stats.escalated} color="hsl(0 72% 51%)" bg="rgba(239,68,68,0.08)" icon={AlertTriangle} />
                <StatCard label="تم الرد" count={stats.replied} color="hsl(217 91% 60%)" bg="rgba(96,165,250,0.08)" icon={Reply} />
                <StatCard label="محلولة" count={stats.resolved} color="hsl(160 84% 39%)" bg="rgba(16,185,129,0.08)" icon={CheckCircle2} />
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input placeholder="بحث برقم التذكرة أو اسم المستخدم..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 h-9 rounded-xl px-3 text-[11px] focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  <motion.button whileTap={{ scale: 0.95 }} onClick={loadTickets}
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(6,182,212,0.12)" }}>
                    <RefreshCw className="w-3.5 h-3.5 text-admin-cyan" />
                  </motion.button>
                </div>
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
                      {mainTab === "quick" ? (
                        <>
                          <option value="admin_visit">طلب إداري</option>
                          <option value="report">بلاغ</option>
                          <option value="complaint">شكوى</option>
                          <option value="direct_contact">تواصل مباشر</option>
                        </>
                      ) : (
                        <>
                          <option value="general">عام</option>
                          <option value="technical">تقني</option>
                          <option value="account">حساب</option>
                          <option value="billing">رصيد/شحن</option>
                          <option value="other">أخرى</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

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
                    const tst = STATUS_MAP[ticket.status] || STATUS_MAP.pending;
                    const tType2 = (ticket as any).request_type || ticket.ticket_type || "general";
                    const ttp = TYPE_MAP[tType2] || TYPE_MAP.general;
                    const pr = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.normal;
                    const StIcon = tst.icon;
                    const TIcon = ttp.icon;

                    return (
                      <motion.div key={ticket.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelectedTicket(ticket)}
                        className="rounded-2xl p-3.5 cursor-pointer active:scale-[0.98] transition-all"
                        style={{ ...glassCard, borderRight: `3px solid ${tst.color}` }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: tst.bg }}>
                              <StIcon className="w-4 h-4" style={{ color: tst.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{ticket.user_name || "مستخدم"}</p>
                              <p className="text-[9px] text-muted-foreground font-mono truncate" dir="ltr">{ticket.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold" style={{ color: pr.color, background: `${pr.color}18` }}>
                              {pr.label}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-lg font-bold" style={{ color: tst.color, background: tst.bg }}>
                              {tst.label}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-foreground mb-1 truncate">{ticket.subject}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <TIcon className="w-3 h-3" /><span>{ttp.label}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground tabular-nums flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatDate(ticket.created_at)}
                          </span>
                        </div>
                        {ticket.status === "escalated" && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "hsl(0 72% 51%)" }}>
                            <AlertTriangle className="w-3 h-3" /><span>تم التصعيد للسوبر أدمن</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* CHATS TAB */}
          {subTab === "chats" && (
            <motion.div key="chats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AdminSupportManager adminUsername={adminUsername || ""} adminDisplayName={adminDisplayName || ""} canAct={true} />
            </motion.div>
          )}

          {/* ARCHIVE TAB */}
          {subTab === "archive" && (
            <motion.div key="archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AdminSupportManager adminUsername={adminUsername || ""} adminDisplayName={adminDisplayName || ""} canAct={false} />
            </motion.div>
          )}

          {/* SEARCH TAB */}
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
                            style={item.status === "open" || item.status === "pending"
                              ? { background: "rgba(245,158,11,0.12)", color: "hsl(38 92% 50%)" }
                              : { background: "rgba(16,185,129,0.12)", color: "hsl(160 84% 39%)" }}>
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
