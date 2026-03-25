import { supabase } from '@/integrations/supabase/client';
import { notifyOnDutyAdmin } from '@/hooks/use-on-duty-admin';

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

async function checkAdminOnline(): Promise<boolean> {
  try {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Riyadh' });
    const { data } = await supabase
      .from('admin_shifts')
      .select('admin_username')
      .eq('is_active', true)
      .lte('shift_start', timeStr)
      .gte('shift_end', timeStr)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function createTicket(params: CreateTicketParams) {
  const now = new Date().toISOString();

  // Auto-fill phone from verified WhatsApp if not provided
  let phone = params.phoneNumber || null;
  if (!phone) {
    const { data: waData } = await supabase
      .from('user_whatsapp' as any)
      .select('phone_number')
      .eq('user_uuid', params.userUuid)
      .eq('is_active', true)
      .maybeSingle();
    phone = (waData as any)?.phone_number || null;
  }

  // Check if any admin is online
  const adminOnline = await checkAdminOnline();
  const directToSuper = !adminOnline;

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
      phone_number: phone,
      status: directToSuper ? 'escalated' : 'open',
      priority: params.requestType === 'complaint' ? 'high' : 'normal',
      assigned_role: directToSuper ? 'super_admin' : 'admin',
      escalation_level: directToSuper ? 1 : 0,
      escalation_timer_started_at: directToSuper ? null : now,
      escalated_at: directToSuper ? now : null,
    } as any)
    .select()
    .single();

  if (error) throw error;

  const ticketId = (ticket as any)?.id;
  if (!ticketId) throw new Error('No ticket ID returned');

  // 2. Create audit log
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

  // 2b. If direct to super, log that too
  if (directToSuper) {
    await supabase.from('ticket_audit_log').insert({
      ticket_id: ticketId,
      action: 'direct_to_super',
      performed_by: 'system',
      performed_by_name: 'النظام',
      details: { reason: 'no_admin_online' },
    });
  }

  // 3. Create first message
  await supabase.from('ticket_messages' as any).insert({
    ticket_id: ticketId,
    sender_name: params.userName,
    sender_type: 'user',
    message: params.messageText,
    attachment_url: params.voiceMessageUrl || params.attachmentUrl || null,
  });

  // Send WhatsApp notification to on-duty admin (silent)
  try {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Riyadh' });
    const { data: onDutyAdmin } = await supabase
      .from('admin_shifts')
      .select('admin_username, phone_number')
      .eq('is_active', true)
      .lte('shift_start', timeStr)
      .gte('shift_end', timeStr)
      .limit(1)
      .single();

    if (onDutyAdmin?.phone_number) {
      await sendWhatsAppNotification(
        onDutyAdmin.phone_number,
        `غلا شات 💬\n\n🎫 تذكرة جديدة!\nمن: ${params.userName}\nالنوع: ${getSubjectFromType(params.requestType)}${params.roomCode ? '\nالغرفة: ' + params.roomCode : ''}`
      );
    }
  } catch {
    // Silent — WhatsApp notification is non-critical
  }

  return ticket;
}
