import React, { useState } from 'react';
import { CheckCircle2, Clock, MessageSquare, AlertTriangle, ArrowUp, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import EscalationCountdown from './EscalationCountdown';
import TicketMessages from './TicketMessages';
import TicketReplyInput from './TicketReplyInput';

interface TicketData {
  id: string;
  subject: string;
  status: string;
  escalation_level?: number;
  escalation_timer_started_at?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
  user_name: string;
  user_uuid: string;
  created_at: string;
}

interface Props {
  ticket: TicketData;
  onClose?: () => void;
}

interface StepItem {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  completed: boolean;
}

const TicketStatusCard: React.FC<Props> = ({ ticket, onClose }) => {
  const [resolving, setResolving] = useState(false);
  const [localStatus, setLocalStatus] = useState(ticket.status);

  const escalationLevel = ticket.escalation_level || 0;
  const hasResponse = !!ticket.first_response_at;
  const isResolved = localStatus === 'resolved' || localStatus === 'closed';

  const steps: StepItem[] = [
    {
      label: 'تم الاستلام',
      icon: <CheckCircle2 className="w-4 h-4" />,
      active: true,
      completed: true,
    },
    {
      label: 'بانتظار رد الأدمن',
      icon: <Clock className="w-4 h-4" />,
      active: !hasResponse && !isResolved,
      completed: hasResponse || isResolved,
    },
    ...(escalationLevel > 0
      ? [{
          label: 'تم التصعيد للسوبر أدمن',
          icon: <ArrowUp className="w-4 h-4" />,
          active: !hasResponse && !isResolved,
          completed: hasResponse || isResolved,
        }]
      : []),
    {
      label: 'تم الرد',
      icon: <MessageSquare className="w-4 h-4" />,
      active: hasResponse && !isResolved,
      completed: isResolved,
    },
    {
      label: 'تم الحل',
      icon: <CheckCircle2 className="w-4 h-4" />,
      active: false,
      completed: isResolved,
    },
  ];

  const handleResolve = async () => {
    setResolving(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() } as any)
        .eq('id', ticket.id);
      if (error) throw error;

      await supabase.from('ticket_audit_log').insert({
        ticket_id: ticket.id,
        action: 'resolved',
        performed_by: ticket.user_uuid,
        performed_by_name: ticket.user_name,
        details: { resolved_by: 'user' },
      });

      setLocalStatus('resolved');
      toast.success('تم إغلاق التذكرة بنجاح');
    } catch {
      toast.error('فشل إغلاق التذكرة');
    }
    setResolving(false);
  };

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden" dir="rtl" style={{ background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-xs font-bold text-amber-400">{String(ticket.id).substring(0, 8).toUpperCase()}</span>
          <span className="text-[10px] text-muted-foreground mr-auto">{ticket.subject}</span>
        </div>

        {/* Progress Steps */}
        <div className="space-y-1.5 mt-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.completed ? 'text-emerald-400' : step.active ? 'text-amber-400 animate-pulse' : 'text-muted-foreground/40'
                }`}
                style={{
                  background: step.completed
                    ? 'rgba(52,211,153,0.12)'
                    : step.active
                    ? 'rgba(245,158,11,0.12)'
                    : 'rgba(255,255,255,0.03)',
                }}
              >
                {step.icon}
              </div>
              <span className={`text-[11px] font-medium ${
                step.completed ? 'text-emerald-400' : step.active ? 'text-amber-400' : 'text-muted-foreground/50'
              }`}>
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px mr-2" style={{
                  background: step.completed ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)'
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Escalation countdown */}
        {!isResolved && (
          <div className="mt-3">
            <EscalationCountdown
              escalationTimerStartedAt={ticket.escalation_timer_started_at || null}
              escalationLevel={escalationLevel}
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <TicketMessages ticketId={ticket.id} currentUserType="user" />
      </div>

      {/* Input / Resolve */}
      {!isResolved ? (
        <div>
          <TicketReplyInput
            ticketId={ticket.id}
            senderName={ticket.user_name}
            senderType="user"
            senderUuid={ticket.user_uuid}
          />
          <div className="px-3 pb-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
              onClick={handleResolve}
              disabled={resolving}
            >
              <CheckCircle2 className="w-3 h-3 ml-1" />
              {resolving ? 'جاري الإغلاق...' : 'تم الحل — إغلاق التذكرة'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(52,211,153,0.05)' }}>
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم إغلاق التذكرة</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketStatusCard;
