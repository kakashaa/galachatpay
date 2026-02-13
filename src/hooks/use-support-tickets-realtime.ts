import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
          onUpdate(newTicket);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
