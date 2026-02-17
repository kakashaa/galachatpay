import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useBdWithdrawalsRealtime(
  onUpdate: (record: any) => void,
  onInsert: (record: any) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('bd_withdrawals_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bd_withdrawals' },
        (payload) => {
          onUpdate(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bd_withdrawals' },
        (payload) => {
          onInsert(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate, onInsert]);
}
