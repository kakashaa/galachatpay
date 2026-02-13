import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
          toast.success(`✅ تم تحديث طلب الراتب من ${updatedRequest.user_name}`, {
            description: `الحالة: ${updatedRequest.status}`,
            duration: 4000,
          });
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
          toast.info(`🆕 طلب راتب جديد من ${newRequest.user_name}`, {
            description: `المبلغ: ${newRequest.amount_usd} USD`,
            duration: 4000,
          });
          onUpdate(newRequest);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate, onDelete]);
}
