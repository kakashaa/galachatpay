import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useVerifiedWhatsApp(userUuid: string | undefined) {
  // Check localStorage first for instant result
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(() => {
    if (!userUuid) return null;
    const cached = localStorage.getItem('wa_verified_' + userUuid);
    return cached || null;
  });
  const [loading, setLoading] = useState(() => {
    if (!userUuid) return false;
    return !localStorage.getItem('wa_verified_' + userUuid);
  });

  useEffect(() => {
    if (!userUuid) { setLoading(false); return; }
    // Always verify against DB even if we have cached value
    supabase
      .from('user_whatsapp' as any)
      .select('phone_number')
      .eq('user_uuid', userUuid)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        const phone = (data as any)?.phone_number || null;
        setVerifiedPhone(phone);
        if (phone) {
          localStorage.setItem('wa_verified_' + userUuid, phone);
        } else {
          localStorage.removeItem('wa_verified_' + userUuid);
        }
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
    const phone = (data as any)?.phone_number || null;
    setVerifiedPhone(phone);
    if (phone) {
      localStorage.setItem('wa_verified_' + userUuid, phone);
    } else {
      localStorage.removeItem('wa_verified_' + userUuid);
    }
  };

  const unlink = async () => {
    if (!userUuid) return;
    await supabase
      .from('user_whatsapp' as any)
      .update({ is_active: false } as any)
      .eq('user_uuid', userUuid);
    setVerifiedPhone(null);
    localStorage.removeItem('wa_verified_' + userUuid);
  };

  return { verifiedPhone, loading, refresh, unlink };
}
