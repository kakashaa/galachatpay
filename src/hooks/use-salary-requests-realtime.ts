import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export function useSalaryRequestsRealtime(
  onUpdate: (request: Tables<'salary_requests'>) => void,
  onDelete?: (id: string) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('salary_requests_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'salary_requests',
        },
        (payload) => {
          const updatedRequest = payload.new as Tables<'salary_requests'>;
          onUpdate(updatedRequest);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'salary_requests',
        },
        (payload) => {
          const newRequest = payload.new as Tables<'salary_requests'>;
          onUpdate(newRequest);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate, onDelete]);
}
