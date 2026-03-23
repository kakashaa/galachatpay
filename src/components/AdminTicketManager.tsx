import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquare, ArrowRight, XCircle, Paperclip, Clock, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Ticket {
  id: string;
  user_uuid: string;
  user_name: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  admin_username: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketReply {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  attachment_url?: string | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  adminUsername: string;
  adminDisplayName: string;
  canAct: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: "مفتوح", bg: "rgba(245,158,11,0.12)", text: "text-yellow-400" },
  replied: { label: "تم الرد", bg: "rgba(34,197,94,0.12)", text: "text-green-400" },
  closed: { label: "مغلق", bg: "rgba(148,163,184,0.08)", text: "text-muted-foreground" },
};

const AdminTicketManager: React.FC<Props> = ({ adminUsername, adminDisplayName, canAct }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState(false);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const repliesRef = useRef<TicketReply[]>([]);
  repliesRef.current = replies;
  const activeTicketRef = useRef<Ticket | null>(null);
  activeTicketRef.current = activeTicket;

  // Load tickets
  const loadTickets = useCallback(async () => {
    try {
      setLoadError(false);
      const statuses = canAct ? ['open', 'replied'] : ['closed'];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setTickets((data as any[]) || []);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, [canAct]);

  useEffect(() => {
    setActiveTicket(null);
    setReplies([]);
    setLoading(true);
    loadTickets();
  }, [loadTickets]);

  // Realtime for tickets list
  useEffect(() => {
    const channel = supabase
      .channel('admin_tickets_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTickets]);

  // Load replies for active ticket
  const loadReplies = useCallback(async (ticketId?: string) => {
    const tid = ticketId || activeTicket?.id;
    if (!tid) return;
    try {
      setRepliesError(false);
      const { data, error } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", tid)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data) setReplies(data as TicketReply[]);
    } catch {
      setRepliesError(true);
    }
  }, [activeTicket?.id]);

  // When ticket selected, load replies + start polling
  useEffect(() => {
    if (!activeTicket) return;
    setRepliesLoading(true);
    loadReplies(activeTicket.id).finally(() => setRepliesLoading(false));

    const poll = setInterval(() => {
      if (activeTicketRef.current?.id === activeTicket.id) {
        loadReplies(activeTicket.id);
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [activeTicket?.id]);

  // Realtime for replies
  useEffect(() => {
    if (!activeTicket) return;
    const ticketId = activeTicket.id;
    const channel = supabase
      .channel(`admin-ticket-replies-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_replies',
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        const newReply = payload.new as TicketReply;
        setReplies(prev => {
          if (prev.some(r => r.id === newReply.id)) return prev;
          const cleaned = prev.filter(r => {
            if (!r.id.startsWith("local-")) return true;
            return !(r.sender_type === newReply.sender_type && r.message === newReply.message);
          });
          return [...cleaned, newReply];
        });
        if (newReply.sender_type === "user") {
          toast.info(`💬 رد جديد من ${newReply.sender_name}`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTicket?.id]);

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current?.scrollHeight || 0, behavior: 'smooth' }), 100);
  }, [replies.length]);

  const openTicket = (ticket: Ticket) => {
    setActiveTicket(ticket);
    setReplies([]);
    setRepliesLoading(true);
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !activeTicket) return;
    setSending(true);
    const msg = input.trim();

    // Optimistic local message
    const localReply: TicketReply = {
      id: `local-${Date.now()}`,
      ticket_id: activeTicket.id,
      sender_type: "admin",
      sender_name: adminDisplayName,
      message: msg,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setReplies(prev => [...prev, localReply]);
    setInput('');

    try {
      // Insert reply via admin-manage edge function (handles notifications)
      const { error } = await supabase.functions.invoke("admin-manage", {
        body: {
          action: "reply_ticket",
          username: adminUsername,
          password: localStorage.getItem("admin_password") || "",
          data: {
            ticket_id: activeTicket.id,
            admin_reply: msg,
          },
        },
      });
      if (error) throw error;

      // Update local ticket status
      setActiveTicket(prev => prev ? { ...prev, status: "replied", admin_reply: msg } : prev);
    } catch {
      toast.error("فشل إرسال الرد — حاول مرة ثانية");
      setReplies(prev => prev.filter(r => r.id !== localReply.id));
      setInput(msg);
    }
    setSending(false);
  };

  const handleClose = async (ticketId: string) => {
    const t = toast.loading("جاري الإغلاق...");
    try {
      await supabase.functions.invoke("admin-manage", {
        body: {
          action: "close_ticket",
          username: adminUsername,
          password: localStorage.getItem("admin_password") || "",
          data: { ticket_id: ticketId },
        },
      });
      toast.dismiss(t);
      toast.success("تم إغلاق التذكرة");
      setActiveTicket(null);
      loadTickets();
    } catch {
      toast.dismiss(t);
      toast.error("فشل الإغلاق");
    }
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short' }); }
    catch { return d; }
  };

  const formatTime = (d: string) => {
    try { return new Date(d).toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  // ─── Conversation view ───
  if (activeTicket) {
    const isClosed = activeTicket.status === 'closed';
    return (
      <div className="flex flex-col h-[calc(100vh-180px)] max-h-[600px]" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
          <button onClick={() => { setActiveTicket(null); setReplies([]); }} className="text-xs text-primary font-bold flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" /> رجوع
          </button>
          <div className="text-center flex-1">
            <span className="text-sm font-bold text-foreground">{activeTicket.user_name}</span>
            <p className="text-[10px] text-muted-foreground">{activeTicket.subject}</p>
          </div>
          {canAct && !isClosed && (
            <button onClick={() => handleClose(activeTicket.id)} className="text-[10px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-bold flex items-center gap-0.5">
              <XCircle className="w-3 h-3" /> إغلاق
            </button>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {repliesLoading && replies.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : repliesError && replies.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-destructive/60" />
              <p className="text-xs text-muted-foreground">فشل تحميل المحادثة</p>
              <Button size="sm" variant="outline" onClick={() => loadReplies()}>
                <RefreshCw className="w-3 h-3 ml-1" /> إعادة المحاولة
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              {/* Original description as first message */}
              <motion.div key="desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tr-md px-3.5 py-2" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <span className="text-[10px] font-bold text-purple-400">{activeTicket.user_name}</span>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">{activeTicket.description}</p>
                  <span className="text-[9px] text-muted-foreground mt-1 block text-left">{formatTime(activeTicket.created_at)}</span>
                </div>
              </motion.div>

              {/* Replies - skip first user reply if it matches description */}
              {replies.filter(r => !(r.sender_type === "user" && r.message === activeTicket.description &&
                Math.abs(new Date(r.created_at).getTime() - new Date(activeTicket.created_at).getTime()) < 5000
              )).map(reply => {
                const isAdmin = reply.sender_type === 'admin';
                return (
                  <motion.div key={reply.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${isAdmin ? 'rounded-tl-md' : 'rounded-tr-md'}`}
                      style={{
                        background: isAdmin ? 'rgba(96,165,250,0.12)' : 'rgba(168,85,247,0.12)',
                        border: `1px solid ${isAdmin ? 'rgba(96,165,250,0.15)' : 'rgba(168,85,247,0.15)'}`,
                      }}>
                      <span className={`text-[10px] font-bold ${isAdmin ? 'text-blue-400' : 'text-purple-400'}`}>
                        {reply.sender_name}
                      </span>
                      {reply.attachment_url && (
                        isImage(reply.attachment_url) ? (
                          <a href={reply.attachment_url} target="_blank" rel="noopener noreferrer" className="block my-1">
                            <img src={reply.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-48 object-cover" />
                          </a>
                        ) : (
                          <a href={reply.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block my-1">عرض المرفق</a>
                        )
                      )}
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">{reply.message}</p>
                      <span className="text-[9px] text-muted-foreground mt-1 block text-left">{formatTime(reply.created_at)}</span>
                    </div>
                  </motion.div>
                );
              })}

              {replies.length === 0 && (
                <div className="flex justify-center py-4">
                  <span className="text-[10px] text-muted-foreground bg-muted/20 rounded-full px-3 py-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> بانتظار الرد
                  </span>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Input */}
        {!isClosed && canAct && (
          <div className="border-t border-border/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="اكتب ردك..."
                className="flex-1 bg-muted/20 border border-border/30 rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              <button onClick={handleSend} disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Tickets list ───
  return (
    <div className="space-y-3" dir="rtl">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <div className="text-center py-16 space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive/60" />
          <p className="text-sm text-muted-foreground">فشل تحميل التذاكر</p>
          <Button size="sm" variant="outline" onClick={() => { setLoading(true); loadTickets(); }}>
            <RefreshCw className="w-3 h-3 ml-1" /> إعادة المحاولة
          </Button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{canAct ? 'لا توجد تذاكر مفتوحة' : 'لا توجد تذاكر مغلقة'}</p>
        </div>
      ) : (
        <AnimatePresence>
          {tickets.map((ticket, i) => {
            const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
            return (
              <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.1)' }}>
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{ticket.user_name || "مستخدم"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{ticket.user_uuid}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${status.text}`} style={{ background: status.bg }}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground">{ticket.subject}</p>
                <p className="text-[10px] text-muted-foreground truncate">{ticket.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(ticket.created_at)}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => openTicket(ticket)}>
                    <MessageSquare className="w-3 h-3 ml-1" /> فتح المحادثة
                  </Button>
                  {canAct && ticket.status !== 'closed' && (
                    <Button size="sm" variant="outline" className="text-xs h-8 text-destructive hover:text-destructive" onClick={() => handleClose(ticket.id)}>
                      <XCircle className="w-3 h-3 ml-1" /> إغلاق
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};

export default AdminTicketManager;
