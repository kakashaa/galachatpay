import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export function useSupportChatSessionsRealtime(
  onUpdate: (session: Tables<'support_chat_sessions'>) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('support_chat_sessions_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_chat_sessions',
        },
        (payload) => {
          const updatedSession = payload.new as Tables<'support_chat_sessions'>;
          toast.success(`✅ تم تحديث جلسة الشات من ${updatedSession.user_name}`, {
            description: `الحالة: ${updatedSession.status}`,
            duration: 4000,
          });
          onUpdate(updatedSession);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_chat_sessions',
        },
        (payload) => {
          const newSession = payload.new as Tables<'support_chat_sessions'>;
          toast.info(`🆕 طلب شات دعم جديد من ${newSession.user_name}`, {
            description: `مستوى VIP: ${newSession.vip_level}`,
            duration: 4000,
          });
          onUpdate(newSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
