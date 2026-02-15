import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAdminNotifications() {
  const activeChannelsRef = useRef<Record<string, any>>({});

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
    // Support Tickets
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

    // VIP Chat Sessions
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

    // Salary Requests
    const salaryChannel = supabase
      .channel('admin-salary')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'salary_requests' },
        (payload) => {
          const req = payload.new as any;
          if (req.status === 'pending') {
            playNotificationSound();
            triggerVibration();
            toast.error(`💰 طلب سحب جديد من ${req.user_name}`, {
              description: `${req.amount_usd}$ - ${req.payment_method}`,
              duration: 8000,
            });
            
          }
        }
      )
      .subscribe();
    activeChannelsRef.current.salary = salaryChannel;

    // Animated Photo Requests
    const animatedChannel = supabase
      .channel('admin-animated')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'animated_photo_requests' },
        (payload) => {
          const req = payload.new as any;
          if (req.status === 'pending') {
            playNotificationSound();
            triggerVibration();
            toast.error(`📸 طلب صورة متحركة من ${req.user_name}`, {
              description: req.duration_label,
              duration: 8000,
            });
            
          }
        }
      )
      .subscribe();
    activeChannelsRef.current.animated = animatedChannel;

    // Quick Support Requests
    const quickSupportChannel = supabase
      .channel('admin-quick-support')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quick_support_requests' },
        (payload) => {
          const req = payload.new as any;
          if (req.status === 'pending') {
            playNotificationSound();
            triggerVibration();
            const typeMap: Record<string, string> = {
              admin_presence: 'طلب حضور إداري',
              report: 'بلاغ',
              complaint: 'شكوى',
              contact: 'طلب تواصل',
            };
            const typeName = typeMap[req.request_type] || req.request_type;
            toast.error(`⚡ دعم سريع: ${typeName}`, {
              description: `من ${req.user_name}`,
              duration: 8000,
            });
            
          }
        }
      )
      .subscribe();
    activeChannelsRef.current.quickSupport = quickSupportChannel;

    // Custom Gifts
    const customGiftsChannel = supabase
      .channel('admin-custom-gifts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'custom_gifts' },
        (payload) => {
          const req = payload.new as any;
          if (req.status === 'pending') {
            playNotificationSound();
            triggerVibration();
            toast.error(`🎁 هدية مخصصة جديدة من ${req.user_name}`, {
              description: req.title,
              duration: 8000,
            });
            
          }
        }
      )
      .subscribe();
    activeChannelsRef.current.customGifts = customGiftsChannel;

    return () => {
      Object.values(activeChannelsRef.current).forEach((channel) => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [playNotificationSound, triggerVibration]);
}
