import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useVerifiedWhatsApp(userUuid: string | undefined) {
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userUuid) { setLoading(false); return; }
    supabase
      .from('user_whatsapp' as any)
      .select('phone_number')
      .eq('user_uuid', userUuid)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        setVerifiedPhone((data as any)?.phone_number || null);
        setLoading(false);
      });
  }, [userUuid]);

  const refresh = async () => {
    if (!userUuid) return;
    const { data } = await supabase
      .from('user_whatsapp' as any)
      .select('phone_number')
      .eq('user_uuid', userUuid)
      .eq('is_active', true)
      .maybeSingle();
    setVerifiedPhone((data as any)?.phone_number || null);
  };

  const unlink = async () => {
    if (!userUuid) return;
    await supabase
      .from('user_whatsapp' as any)
      .update({ is_active: false } as any)
      .eq('user_uuid', userUuid);
    setVerifiedPhone(null);
  };

  return { verifiedPhone, loading, refresh, unlink };
}
