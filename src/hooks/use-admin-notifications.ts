import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAdminNotifications() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeChannelsRef = useRef<{ tickets?: any; chats?: any }>({});

  // Play notification sound
  const playNotificationSound = () => {
    if (!audioRef.current) {
      // Create audio context for beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;
      
      // Create oscillator for beep
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      // Double beep notification
      osc.frequency.value = 900; // Hz
      gain.gain.setValueAtTime(0.3, now);
      osc.start(now);
      osc.stop(now + 0.15);
      
      osc.start(now + 0.2);
      osc.stop(now + 0.35);
    }
  };

  // Trigger vibration on mobile
  const triggerVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  // Listen for new support tickets
  useEffect(() => {
    const ticketsChannel = supabase
      .channel('admin-tickets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
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
  }, []);

  // Listen for new VIP chat requests
  useEffect(() => {
    const chatsChannel = supabase
      .channel('admin-vip-chats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_chat_sessions',
        },
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
  }, []);
}
