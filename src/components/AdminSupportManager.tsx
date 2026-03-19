import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle, Archive, ArrowRight, ArrowUpRight, XCircle, User, Clock, Hash, Shield, Crown, Star, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface SupportSession {
  id: string;
  user_uuid: string;
  user_name: string;
  support_level: number;
  request_type?: string;
  assigned_admin?: string;
  assigned_admin_name?: string;
  status: string;
  escalation_level: number;
  room_name?: string;
  notes?: string;
  file_url?: string;
  file_type?: string;
  created_at: string;
  resolved_at?: string;
}

interface SupportMessage {
  id: string;
  session_id: string;
  sender_uuid: string;
  sender_name: string;
  sender_type: string;
  message: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

interface Props {
  adminUsername: string;
  adminDisplayName: string;
  canAct: boolean;
}

const LEVEL_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: "عادي", emoji: "💬", color: "text-blue-400" },
  2: { label: "SOS", emoji: "🆘", color: "text-red-400" },
  3: { label: "طلب مضيفة", emoji: "📋", color: "text-purple-400" },
};

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  waiting: { label: "منتظر", bg: "rgba(245,158,11,0.12)", text: "text-yellow-400" },
  active: { label: "نشط", bg: "rgba(34,197,94,0.12)", text: "text-green-400" },
  escalated: { label: "مُصعّد", bg: "rgba(239,68,68,0.12)", text: "text-red-400" },
  resolved: { label: "محلول", bg: "rgba(148,163,184,0.08)", text: "text-muted-foreground" },
  closed: { label: "مغلق", bg: "rgba(148,163,184,0.08)", text: "text-muted-foreground" },
};

const SENDER_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  owner: { bg: "rgba(239,68,68,0.12)", text: "text-red-400", icon: <Crown className="w-3 h-3" /> },
  super_admin: { bg: "rgba(34,197,94,0.12)", text: "text-green-400", icon: <Shield className="w-3 h-3" /> },
  moderator: { bg: "rgba(234,179,8,0.12)", text: "text-yellow-400", icon: <Star className="w-3 h-3" /> },
  admin: { bg: "rgba(96,165,250,0.12)", text: "text-blue-400", icon: <User className="w-3 h-3" /> },
  system: { bg: "rgba(148,163,184,0.08)", text: "text-muted-foreground", icon: null },
  user: { bg: "rgba(168,85,247,0.12)", text: "text-purple-400", icon: null },
};

const AdminSupportManager: React.FC<Props> = ({ adminUsername, adminDisplayName, canAct }) => {
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const loadSessions = useCallback(async () => {
    try {
      const statuses = canAct
        ? ['waiting', 'active', 'escalated']
        : ['resolved', 'closed'];

      const { data } = await supabase
        .from("support_sessions" as any)
        .select("*")
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(100);

      setSessions((data as any[]) || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [canAct]);

  useEffect(() => {
    setActiveSessionId(null);
    setMessages([]);
    setLoading(true);
    loadSessions();

    // Poll sessions list every 5s
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Realtime for sessions
  useEffect(() => {
    const channel = supabase
      .channel('admin_support_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_sessions' }, () => {
        loadSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadSessions]);

  // Load messages for active session
  const loadMessages = useCallback(async () => {
    if (!activeSessionId) return;
    const { data } = await supabase
      .from("support_session_messages" as any)
      .select("*")
      .eq("session_id", activeSessionId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data as any[]);
      // Mark as read
      await supabase.functions.invoke("support-system", {
        body: { action: "mark_read", session_id: activeSessionId },
      });
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    loadMessages();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeSessionId, loadMessages]);

  // Realtime for messages
  useEffect(() => {
    if (!activeSessionId) return;
    const channel = supabase
      .channel(`admin_msgs_${activeSessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_session_messages',
        filter: `session_id=eq.${activeSessionId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === (payload.new as any).id)) return prev;
          return [...prev, payload.new as SupportMessage];
        });
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current?.scrollHeight || 0, behavior: 'smooth' }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeSessionId]);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current?.scrollHeight || 0, behavior: 'smooth' }), 100);
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending || !activeSessionId) return;
    setSending(true);
    const msg = input.trim();
    setInput('');
    try {
      await supabase.functions.invoke("support-system", {
        body: {
          action: "send_message",
          session_id: activeSessionId,
          sender_uuid: adminUsername,
          sender_name: adminDisplayName,
          sender_type: "admin",
          message: msg,
        },
      });
    } catch { toast.error('فشل الإرسال'); }
    finally { setSending(false); }
  };

  const handleResolve = async (sessionId: string) => {
    const t = toast.loading("جاري الإغلاق...");
    try {
      await supabase.functions.invoke("support-system", {
        body: { action: "resolve_session", session_id: sessionId },
      });
      toast.dismiss(t);
      toast.success('تم إغلاق المحادثة ✅');
      setActiveSessionId(null);
      loadSessions();
    } catch { toast.dismiss(t); toast.error('فشل الإغلاق'); }
  };

  const handleEscalate = async (sessionId: string) => {
    const t = toast.loading("جاري التصعيد...");
    try {
      await supabase.functions.invoke("support-system", {
        body: { action: "escalate", session_id: sessionId },
      });
      toast.dismiss(t);
      toast.success('تم التصعيد ✅');
      loadSessions();
    } catch { toast.dismiss(t); toast.error('فشل التصعيد'); }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short' }); }
    catch { return d; }
  };

  const formatTime = (d: string) => {
    try { return new Date(d).toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

  // ─── Chat view ───
  if (activeSessionId) {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const isArchive = activeSession?.status === 'resolved' || activeSession?.status === 'closed';

    return (
      <div className="flex flex-col h-[calc(100vh-180px)] max-h-[600px]" dir="rtl">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
          <button onClick={() => setActiveSessionId(null)} className="text-xs text-primary font-bold flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" /> رجوع
          </button>
          <div className="text-center">
            <span className="text-sm font-bold text-foreground">{activeSession?.user_name || "محادثة"}</span>
            {activeSession && (
              <div className="flex items-center justify-center gap-1 text-[10px]">
                <span className={LEVEL_LABELS[activeSession.support_level]?.color || "text-muted-foreground"}>
                  {LEVEL_LABELS[activeSession.support_level]?.emoji} {LEVEL_LABELS[activeSession.support_level]?.label}
                </span>
                {activeSession.escalation_level > 0 && (
                  <span className="text-red-400">• تصعيد {activeSession.escalation_level}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {canAct && !isArchive && (
              <>
                <button onClick={() => handleEscalate(activeSessionId)} className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />تصعيد
                </button>
                <button onClick={() => handleResolve(activeSessionId)} className="text-[10px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-bold flex items-center gap-0.5">
                  <XCircle className="w-3 h-3" />إغلاق
                </button>
              </>
            )}
          </div>
        </div>

        {/* Session info bar */}
        {activeSession?.notes && (
          <div className="px-3 py-2 text-[10px] text-muted-foreground border-b border-border/20" style={{ background: 'rgba(255,255,255,0.02)' }}>
            📝 {activeSession.notes}
          </div>
        )}
        {activeSession?.file_url && (
          <div className="px-3 py-2 border-b border-border/20" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <a href={activeSession.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline">📎 عرض المرفق</a>
          </div>
        )}
        {activeSession?.room_name && (
          <div className="px-3 py-2 text-[10px] text-muted-foreground border-b border-border/20" style={{ background: 'rgba(255,255,255,0.02)' }}>
            🏠 الغرفة: <span className="font-bold text-foreground">{activeSession.room_name}</span>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          <AnimatePresence>
            {messages.map(msg => {
              const isSystem = msg.sender_type === 'system';
              const isAdmin = ['admin', 'super_admin', 'moderator', 'owner'].includes(msg.sender_type);
              const colors = SENDER_COLORS[msg.sender_type] || SENDER_COLORS.user;

              if (isSystem) {
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-1">
                    <span className="text-[10px] text-muted-foreground bg-muted/20 rounded-full px-3 py-1">{msg.message}</span>
                  </motion.div>
                );
              }

              return (
                <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${isAdmin ? 'rounded-tl-md' : 'rounded-tr-md'}`}
                    style={{ background: colors.bg, border: `1px solid ${isAdmin ? 'rgba(96,165,250,0.15)' : 'rgba(168,85,247,0.15)'}` }}>
                    <div className={`flex items-center gap-1 mb-0.5 ${colors.text}`}>
                      {colors.icon}
                      <span className="text-[10px] font-bold">{msg.sender_name}</span>
                    </div>
                    {msg.attachment_url && (
                      isImage(msg.attachment_url) ? (
                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                          <img src={msg.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-48 object-cover" />
                        </a>
                      ) : (
                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block mb-1">عرض المرفق</a>
                      )
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{msg.message}</p>
                    <span className="text-[9px] text-muted-foreground mt-1 block text-left">{formatTime(msg.created_at)}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-10">لا توجد رسائل</p>}
        </div>

        {!isArchive && canAct && (
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

  // ─── Sessions list ───
  return (
    <div className="space-y-3" dir="rtl">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{canAct ? 'لا توجد محادثات نشطة' : 'لا توجد محادثات مغلقة'}</p>
        </div>
      ) : (
        <AnimatePresence>
          {sessions.map((session, i) => {
            const level = LEVEL_LABELS[session.support_level] || LEVEL_LABELS[1];
            const status = STATUS_STYLES[session.status] || STATUS_STYLES.waiting;

            return (
              <motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: session.support_level === 2 ? 'rgba(239,68,68,0.15)' : 'rgba(96,165,250,0.1)' }}>
                      <span className="text-sm">{level.emoji}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{session.user_name || "مستخدم"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{session.user_uuid}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${status.text}`} style={{ background: status.bg }}>
                      {status.label}
                    </span>
                    <span className={`text-[10px] ${level.color} flex items-center gap-1`}>
                      {level.emoji} {level.label}
                    </span>
                  </div>
                </div>

                {session.notes && (
                  <p className="text-[10px] text-muted-foreground truncate">📝 {session.notes}</p>
                )}

                {session.escalation_level > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> تصعيد {session.escalation_level}
                  </span>
                )}

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  {session.assigned_admin && (
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {session.assigned_admin_name || session.assigned_admin}</span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(session.created_at)}</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setActiveSessionId(session.id)}>
                    <MessageCircle className="w-3 h-3 ml-1" /> فتح
                  </Button>
                  {canAct && !['resolved', 'closed'].includes(session.status) && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleEscalate(session.id)}>
                        <ArrowUpRight className="w-3 h-3 ml-1" /> تصعيد
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-8 text-destructive hover:text-destructive" onClick={() => handleResolve(session.id)}>
                        <XCircle className="w-3 h-3 ml-1" /> إغلاق
                      </Button>
                    </>
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

export default AdminSupportManager;
