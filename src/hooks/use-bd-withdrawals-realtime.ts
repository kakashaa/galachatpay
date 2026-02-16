import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
          const record = payload.new;
          const statusLabels: Record<string, string> = {
            pending: 'قيد المراجعة',
            approved: 'تمت الموافقة',
            info_submitted: 'تم إرسال معلومات المستلم',
            completed: 'مكتمل',
            rejected: 'مرفوض',
          };
          toast.info(`📩 تحديث سحب BD: ${record.bd_name}`, {
            description: statusLabels[record.status] || record.status,
            duration: 5000,
          });
          onUpdate(record);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bd_withdrawals' },
        (payload) => {
          const record = payload.new;
          toast.info(`🆕 طلب سحب جديد من ${record.bd_name}`, {
            description: `$${Number(record.amount).toFixed(2)}`,
            duration: 5000,
          });
          onInsert(record);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate, onInsert]);
}
