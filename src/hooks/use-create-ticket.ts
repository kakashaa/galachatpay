import { supabase } from '@/integrations/supabase/client';

interface CreateTicketParams {
  userUuid: string;
  userName: string;
  requestType: 'admin_visit' | 'report' | 'complaint' | 'direct_contact';
  roomCode?: string;
  messageText: string;
  voiceMessageUrl?: string;
  attachmentUrl?: string;
  phoneNumber?: string;
}

function getSubjectFromType(type: string): string {
  const map: Record<string, string> = {
    admin_visit: 'طلب زيارة إدارية',
    report: 'بلاغ مخالفة',
    complaint: 'شكوى رسمية',
    direct_contact: 'طلب تواصل مباشر',
  };
  return map[type] || 'طلب دعم';
}

export async function createTicket(params: CreateTicketParams) {
  const now = new Date().toISOString();

  // 1. Create the ticket
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      user_uuid: params.userUuid,
      user_name: params.userName,
      subject: getSubjectFromType(params.requestType),
      description: params.messageText,
      ticket_type: params.requestType,
      request_type: params.requestType,
      message_text: params.messageText,
      voice_message_url: params.voiceMessageUrl || null,
      attachment_url: params.attachmentUrl || null,
      room_code: params.roomCode || null,
      phone_number: params.phoneNumber || null,
      status: 'open',
      priority: params.requestType === 'complaint' ? 'high' : 'normal',
      assigned_role: 'admin',
      escalation_level: 0,
      escalation_timer_started_at: now,
    } as any)
    .select()
    .single();

  if (error) throw error;

  const ticketId = (ticket as any)?.id;
  if (!ticketId) throw new Error('No ticket ID returned');

  // 2. Create audit log entry
  await supabase.from('ticket_audit_log').insert({
    ticket_id: ticketId,
    action: 'created',
    performed_by: params.userUuid,
    performed_by_name: params.userName,
    details: {
      request_type: params.requestType,
      room_code: params.roomCode || null,
    },
  });

  // 3. Create first message
  await supabase.from('ticket_messages' as any).insert({
    ticket_id: ticketId,
    sender_uuid: params.userUuid,
    sender_name: params.userName,
    sender_type: 'user',
    message: params.messageText,
    attachment_url: params.voiceMessageUrl || params.attachmentUrl || null,
  });

  return ticket;
}
