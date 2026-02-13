import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BDCacheRecord {
  id: string;
  user_uuid: string;
  user_name: string;
  request_type: string;
  status: number;
  details: any;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export function useBdRequestsRealtime(
  onUpdate: (record: BDCacheRecord) => void,
  onInsert: (record: BDCacheRecord) => void,
  pollIntervalMs = 30000
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync function that calls the edge function
  const syncBdRequests = useCallback(async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-bd-requests`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      console.error("BD sync failed:", err);
    }
  }, []);

  // Poll external API periodically to keep cache fresh
  useEffect(() => {
    // Initial sync
    syncBdRequests();

    intervalRef.current = setInterval(syncBdRequests, pollIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [syncBdRequests, pollIntervalMs]);

  // Listen to realtime changes on the cache table
  useEffect(() => {
    const channel = supabase
      .channel('bd_requests_cache_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bd_requests_cache',
        },
        (payload) => {
          const record = payload.new as BDCacheRecord;
          const statusLabel = record.status === 0 ? 'معلق' : record.status === 1 ? 'مقبول' : 'مرفوض';
          toast.success(`✅ تم تحديث طلب BD من ${record.user_name}`, {
            description: `الحالة: ${statusLabel}`,
            duration: 4000,
          });
          onUpdate(record);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bd_requests_cache',
        },
        (payload) => {
          const record = payload.new as BDCacheRecord;
          toast.info(`🆕 طلب BD جديد من ${record.user_name}`, {
            description: `النوع: ${record.request_type}`,
            duration: 4000,
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
