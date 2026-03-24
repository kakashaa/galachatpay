import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Filter, Clock, AlertTriangle, MessageSquare, CheckCircle2, ArrowUp, UserCheck, FileWarning, Phone, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TicketRow {
  id: string;
  user_uuid: string;
  user_name: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  request_type?: string;
  escalation_level?: number;
  escalation_timer_started_at?: string | null;
  first_response_at?: string | null;
  assigned_role?: string;
  created_at: string;
}

type StatusFilter = 'all' | 'open' | 'escalated' | 'replied' | 'resolved';
type TypeFilter = 'all' | 'admin_visit' | 'report' | 'complaint' | 'direct_contact';

interface Props {
  adminUsername: string;
  isSuperAdmin?: boolean;
  onSelectTicket: (ticket: TicketRow) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'معلقة', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },
  pending: { label: 'معلقة', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },
  escalated: { label: 'مصعّدة', color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  replied: { label: 'تم الرد', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  resolved: { label: 'محلولة', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  closed: { label: 'مغلقة', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
};

const TYPE_MAP: Record<string, { label: string; icon: typeof Ticket }> = {
  admin_visit: { label: 'طلب إداري', icon: UserCheck },
  report: { label: 'بلاغ', icon: AlertTriangle },
  complaint: { label: 'شكوى', icon: FileWarning },
  direct_contact: { label: 'تواصل مباشر', icon: Phone },
  general: { label: 'عام', icon: MessageSquare },
};

function getTimeRemaining(timerStart: string | null | undefined): { text: string; urgent: boolean } | null {
  if (!timerStart) return null;
  const started = new Date(timerStart).getTime();
  const elapsed = Date.now() - started;
  const remaining = 5 * 60 * 1000 - elapsed;
  if (remaining <= 0) return { text: 'منتهي', urgent: true };
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return { text: `${mins}:${secs.toString().padStart(2, '0')}`, urgent: remaining < 60000 };
}

const AdminTicketDashboard: React.FC<Props> = ({ adminUsername, isSuperAdmin = false, onSelectTicket }) => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setTick] = useState(0);

  // Refresh timer display every second
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      let q = supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(200) as any;

      if (statusFilter !== 'all') {
        if (statusFilter === 'open') q = q.in('status', ['open', 'pending']);
        else q = q.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') q = q.eq('request_type', typeFilter);

      const { data } = await q;
      setTickets((data as TicketRow[]) || []);
    } catch { }
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => { setLoading(true); loadTickets(); }, [loadTickets]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('admin-tickets-dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadTickets())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadTickets]);

  // Stats
  const stats = {
    pending: tickets.filter(t => ['open', 'pending'].includes(t.status)).length,
    escalated: tickets.filter(t => t.status === 'escalated').length,
    replied: tickets.filter(t => t.status === 'replied').length,
    resolved: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length,
  };

  // Search filter
  const filtered = tickets.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return t.user_name?.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.user_uuid?.toLowerCase().includes(q);
  });

  const statCards: { key: StatusFilter; label: string; count: number; color: string; bg: string }[] = [
    { key: 'open', label: 'معلقة', count: stats.pending, color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
    { key: 'escalated', label: 'مصعّدة', count: stats.escalated, color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
    { key: 'replied', label: 'تم الرد', count: stats.replied, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { key: 'resolved', label: 'محلولة', count: stats.resolved, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {statCards.map(s => (
          <motion.button key={s.key} whileTap={{ scale: 0.95 }}
            onClick={() => setStatusFilter(prev => prev === s.key ? 'all' : s.key)}
            className="rounded-xl p-2.5 text-center transition-all"
            style={{
              background: statusFilter === s.key ? s.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${statusFilter === s.key ? s.color + '33' : 'rgba(255,255,255,0.06)'}`,
            }}>
            <p className="text-lg font-black tabular-nums" style={{ color: s.color }}>{s.count}</p>
            <p className="text-[9px] font-bold text-muted-foreground">{s.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو الرقم..."
            className="w-full h-9 pr-9 pl-3 rounded-xl text-xs focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)}
          className="h-9 rounded-xl px-2 text-[10px] font-bold focus:outline-none appearance-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'inherit' }}>
          <option value="all">كل الأنواع</option>
          <option value="admin_visit">طلب إداري</option>
          <option value="report">بلاغ</option>
          <option value="complaint">شكوى</option>
          <option value="direct_contact">تواصل مباشر</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">لا توجد تذاكر</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((ticket, i) => {
              const st = STATUS_MAP[ticket.status] || STATUS_MAP.open;
              const tp = TYPE_MAP[ticket.request_type || 'general'] || TYPE_MAP.general;
              const TypeIcon = tp.icon;
              const timer = ticket.escalation_level === 0 && !ticket.first_response_at
                ? getTimeRemaining(ticket.escalation_timer_started_at) : null;

              return (
                <motion.button key={ticket.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onSelectTicket(ticket)}
                  className="w-full text-right rounded-2xl p-3.5 space-y-2 transition-all active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Row 1: user + status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: st.bg }}>
                        <TypeIcon className="w-3.5 h-3.5" style={{ color: st.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{ticket.user_name || 'مستخدم'}</p>
                        <p className="text-[9px] text-muted-foreground font-mono truncate" dir="ltr">{ticket.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {ticket.priority === 'high' && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>عاجل</span>
                      )}
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: subject + type */}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground truncate flex-1">{ticket.subject}</p>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0 mr-2">
                      <TypeIcon className="w-3 h-3" /> {tp.label}
                    </span>
                  </div>

                  {/* Row 3: time + escalation timer */}
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ticket.created_at).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {timer && (
                      <span className={`flex items-center gap-1 font-bold tabular-nums ${timer.urgent ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                        <ArrowUp className="w-3 h-3" /> {timer.text}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default AdminTicketDashboard;
