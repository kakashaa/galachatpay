import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export function useAnimatedPhotosRealtime(
  onUpdate: (request: Tables<'animated_photo_requests'>) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('animated_photos_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'animated_photo_requests',
        },
        (payload) => {
          const updatedRequest = payload.new as Tables<'animated_photo_requests'>;
          onUpdate(updatedRequest);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'animated_photo_requests',
        },
        (payload) => {
          const newRequest = payload.new as Tables<'animated_photo_requests'>;
          onUpdate(newRequest);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
