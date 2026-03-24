import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRight, Send, Loader2, CheckCircle2, ArrowUp, StickyNote, ChevronDown, Clock, UserCheck, AlertTriangle, FileWarning, Phone, MessageSquare, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import TicketMessages from '@/components/support/TicketMessages';

interface TicketData {
  id: string;
  user_uuid: string;
  user_name: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  request_type?: string;
  room_code?: string;
  phone_number?: string;
  escalation_level?: number;
  escalation_timer_started_at?: string | null;
  first_response_at?: string | null;
  assigned_role?: string;
  assigned_user_id?: string;
  created_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  performed_by_name: string | null;
  details: any;
  created_at: string;
}

interface Props {
  ticket: TicketData;
  adminUsername: string;
  adminDisplayName: string;
  onBack: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'إنشاء التذكرة',
  assigned: 'إسناد',
  admin_replied: 'رد الأدمن',
  escalated_to_super: 'تصعيد تلقائي',
  super_replied: 'رد السوبر أدمن',
  direct_to_super: 'تحويل مباشر',
  resolved: 'تم الحل',
  closed: 'إغلاق',
  reopened: 'إعادة فتح',
  internal_note: 'ملاحظة داخلية',
  manual_escalate: 'تصعيد يدوي',
};

const TYPE_MAP: Record<string, { label: string; icon: typeof Ticket }> = {
  admin_visit: { label: 'طلب إداري', icon: UserCheck },
  report: { label: 'بلاغ', icon: AlertTriangle },
  complaint: { label: 'شكوى', icon: FileWarning },
  direct_contact: { label: 'تواصل مباشر', icon: Phone },
  general: { label: 'عام', icon: MessageSquare },
};

const AdminTicketDetail: React.FC<Props> = ({ ticket, adminUsername, adminDisplayName, onBack }) => {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState(ticket.status);

  // Load audit log
  const loadAudit = useCallback(async () => {
    const { data } = await supabase.from('ticket_audit_log')
      .select('*').eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    if (data) setAuditLog(data as AuditEntry[]);
  }, [ticket.id]);

  useEffect(() => { loadAudit(); }, [loadAudit]);

  const replyToTicket = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    const now = new Date().toISOString();
    try {
      await supabase.from('ticket_messages' as any).insert({
        ticket_id: ticket.id,
        message: replyText.trim(),
        sender_name: adminDisplayName,
        sender_type: 'admin',
      });

      await supabase.from('support_tickets').update({
        status: 'replied',
        first_response_at: ticket.first_response_at || now,
        admin_reply: replyText.trim(),
        admin_username: adminUsername,
        replied_at: now,
        assigned_user_id: adminUsername,
      } as any).eq('id', ticket.id);

      await supabase.from('ticket_audit_log').insert({
        ticket_id: ticket.id,
        action: 'admin_replied',
        performed_by: adminUsername,
        performed_by_name: adminDisplayName,
      });

      setReplyText('');
      setLocalStatus('replied');
      toast.success('تم إرسال الرد');
      loadAudit();
    } catch {
      toast.error('فشل إرسال الرد');
    }
    setSending(false);
  };

  const handleResolve = async () => {
    const t = toast.loading('جاري الإغلاق...');
    try {
      await supabase.from('support_tickets').update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      } as any).eq('id', ticket.id);

      await supabase.from('ticket_audit_log').insert({
        ticket_id: ticket.id,
        action: 'resolved',
        performed_by: adminUsername,
        performed_by_name: adminDisplayName,
      });

      toast.dismiss(t);
      toast.success('تم حل التذكرة');
      setLocalStatus('resolved');
      loadAudit();
    } catch {
      toast.dismiss(t);
      toast.error('فشل الإغلاق');
    }
  };

  const handleEscalate = async () => {
    const t = toast.loading('جاري التصعيد...');
    try {
      await supabase.from('support_tickets').update({
        escalation_level: 1,
        assigned_role: 'super_admin',
        status: 'escalated',
        escalated_at: new Date().toISOString(),
      } as any).eq('id', ticket.id);

      await supabase.from('ticket_audit_log').insert({
        ticket_id: ticket.id,
        action: 'manual_escalate',
        performed_by: adminUsername,
        performed_by_name: adminDisplayName,
        details: { reason: 'manual' },
      });

      await supabase.from('ticket_messages' as any).insert({
        ticket_id: ticket.id,
        message: `تم التصعيد يدوياً بواسطة ${adminDisplayName}`,
        sender_name: 'النظام',
        sender_type: 'system',
      });

      toast.dismiss(t);
      toast.success('تم التصعيد');
      setLocalStatus('escalated');
      loadAudit();
    } catch {
      toast.dismiss(t);
      toast.error('فشل التصعيد');
    }
  };

  const handleNote = async () => {
    if (!noteText.trim() || sendingNote) return;
    setSendingNote(true);
    try {
      await supabase.from('ticket_audit_log').insert({
        ticket_id: ticket.id,
        action: 'internal_note',
        performed_by: adminUsername,
        performed_by_name: adminDisplayName,
        details: { note: noteText.trim() },
      });
      setNoteText('');
      toast.success('تم حفظ الملاحظة');
      loadAudit();
    } catch {
      toast.error('فشل الحفظ');
    }
    setSendingNote(false);
  };

  const tp = TYPE_MAP[ticket.request_type || 'general'] || TYPE_MAP.general;
  const TypeIcon = tp.icon;
  const isResolved = localStatus === 'resolved' || localStatus === 'closed';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]" dir="rtl">
      {/* Header */}
      <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} className="text-xs text-primary font-bold flex items-center gap-1">
          <ArrowRight className="w-3.5 h-3.5" /> رجوع
        </button>
        <div className="flex-1 text-center">
          <span className="text-xs font-mono font-bold text-amber-400">{ticket.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
          style={{
            background: localStatus === 'escalated' ? 'rgba(239,68,68,0.12)' :
              localStatus === 'replied' ? 'rgba(96,165,250,0.12)' :
              isResolved ? 'rgba(52,211,153,0.12)' : 'rgba(245,158,11,0.12)',
            color: localStatus === 'escalated' ? '#f87171' :
              localStatus === 'replied' ? '#60a5fa' :
              isResolved ? '#34d399' : '#fbbf24',
          }}>
          {localStatus}
        </span>
      </div>

      {/* Info cards */}
      <div className="px-3 py-2 space-y-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-muted-foreground">المستخدم</span>
            <p className="font-bold text-foreground">{ticket.user_name}</p>
          </div>
          <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-muted-foreground">النوع</span>
            <p className="font-bold text-foreground flex items-center gap-1"><TypeIcon className="w-3 h-3" /> {tp.label}</p>
          </div>
          {ticket.room_code && (
            <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-muted-foreground">الغرفة</span>
              <p className="font-bold text-foreground font-mono" dir="ltr">{ticket.room_code}</p>
            </div>
          )}
          {ticket.phone_number && (
            <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-muted-foreground">الهاتف</span>
              <p className="font-bold text-foreground font-mono" dir="ltr">{ticket.phone_number}</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <TicketMessages ticketId={ticket.id} currentUserType="admin" />
      </div>

      {/* Actions */}
      {!isResolved && (
        <div className="border-t px-3 py-2 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Reply input */}
          <div className="flex items-center gap-2">
            <input value={replyText} onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); replyToTicket(); } }}
              placeholder="اكتب ردك..."
              className="flex-1 h-10 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            <button onClick={replyToTicket} disabled={!replyText.trim() || sending}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="flex-1 text-[10px] h-8 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" onClick={handleResolve}>
              <CheckCircle2 className="w-3 h-3 ml-0.5" /> تم الحل
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-[10px] h-8 text-red-400 border-red-500/20 hover:bg-red-500/10" onClick={handleEscalate}>
              <ArrowUp className="w-3 h-3 ml-0.5" /> تصعيد
            </Button>
          </div>

          {/* Internal note */}
          <div className="flex items-center gap-2">
            <input value={noteText} onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNote(); }}
              placeholder="ملاحظة داخلية..."
              className="flex-1 h-8 rounded-lg px-3 text-[10px] focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
            <button onClick={handleNote} disabled={!noteText.trim() || sendingNote}
              className="h-8 px-3 rounded-lg text-[10px] font-bold disabled:opacity-40 active:scale-95"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
              <StickyNote className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Audit log */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <button onClick={() => { setAuditOpen(!auditOpen); if (!auditOpen) loadAudit(); }}
          className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground font-bold">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> سجل العمليات ({auditLog.length})</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${auditOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {auditOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden max-h-48 overflow-y-auto px-3 pb-2 space-y-1">
              {auditLog.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-[9px] py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="text-muted-foreground tabular-nums flex-shrink-0">
                    {new Date(a.created_at).toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-amber-400 font-bold">{ACTION_LABELS[a.action] || a.action}</span>
                  <span className="text-muted-foreground">— {a.performed_by_name || 'النظام'}</span>
                  {a.details?.note && <span className="text-foreground/60 italic">"{a.details.note}"</span>}
                </div>
              ))}
              {auditLog.length === 0 && <p className="text-[9px] text-muted-foreground text-center py-2">لا توجد عمليات</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminTicketDetail;
