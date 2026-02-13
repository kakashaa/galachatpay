import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAdminNotifications() {
  const activeChannelsRef = useRef<{ tickets?: any; chats?: any }>({});

  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;

      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.value = 900;
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 900;
      gain2.gain.setValueAtTime(0.3, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.35);

      setTimeout(() => audioContext.close(), 500);
    } catch {
      // Silent fallback
    }
  }, []);

  const triggerVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }, []);

  useEffect(() => {
    const ticketsChannel = supabase
      .channel('admin-tickets')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        (payload) => {
          const ticket = payload.new as any;
          playNotificationSound();
          triggerVibration();
          toast.error(`🎫 تكت جديد من ${ticket.user_name}`, {
            description: ticket.subject,
            duration: 8000,
            action: {
              label: 'اذهب',
              onClick: () => window.location.href = '/admin?tab=support_tickets',
            },
          });
        }
      )
      .subscribe();

    activeChannelsRef.current.tickets = ticketsChannel;
    return () => {
      if (activeChannelsRef.current.tickets) {
        supabase.removeChannel(activeChannelsRef.current.tickets);
      }
    };
  }, [playNotificationSound, triggerVibration]);

  useEffect(() => {
    const chatsChannel = supabase
      .channel('admin-vip-chats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_chat_sessions' },
        (payload) => {
          const session = payload.new as any;
          if (session.status === 'waiting') {
            playNotificationSound();
            triggerVibration();
            toast.error(`💬 طلب شات VIP جديد من ${session.user_name}`, {
              description: `المستوى: VIP ${session.vip_level}`,
              duration: 10000,
              action: {
                label: 'اقبل',
                onClick: () => window.location.href = '/admin?tab=support_chats',
              },
            });
          }
        }
      )
      .subscribe();

    activeChannelsRef.current.chats = chatsChannel;
    return () => {
      if (activeChannelsRef.current.chats) {
        supabase.removeChannel(activeChannelsRef.current.chats);
      }
    };
  }, [playNotificationSound, triggerVibration]);
}
