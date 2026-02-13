import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export function useSupportTicketsRealtime(
  onUpdate: (ticket: Tables<'support_tickets'>) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('support_tickets_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          const updatedTicket = payload.new as Tables<'support_tickets'>;
          toast.success(`✅ تم تحديث التكت من ${updatedTicket.user_name}`, {
            description: `الحالة: ${updatedTicket.status}`,
            duration: 4000,
          });
          onUpdate(updatedTicket);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          const newTicket = payload.new as Tables<'support_tickets'>;
          toast.info(`🆕 تكت دعم جديد من ${newTicket.user_name}`, {
            description: `الموضوع: ${newTicket.subject}`,
            duration: 4000,
          });
          onUpdate(newTicket);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
