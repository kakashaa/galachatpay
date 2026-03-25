import { supabase } from '@/integrations/supabase/client';
import { sendWhatsAppNotification } from '@/utils/sendWhatsAppNotification';

export async function getOnDutyAdmin(roleType: 'admin' | 'super_admin' | 'owner' = 'admin') {
  try {
    const now = new Date();
    const saudiHour = (now.getUTCHours() + 3) % 24;
    const timeStr = `${String(saudiHour).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:00`;

    const { data } = await supabase
      .from('admin_shifts')
      .select('admin_username, admin_display_name, phone_number, role_type')
      .eq('is_active', true)
      .eq('role_type', roleType)
      .lte('shift_start', timeStr)
      .gte('shift_end', timeStr)
      .limit(1)
      .maybeSingle();

    return data;
  } catch {
    return null;
  }
}

export async function notifyOnDutyAdmin(
  message: string,
  roleType: 'admin' | 'super_admin' = 'admin'
) {
  try {
    const admin = await getOnDutyAdmin(roleType);
    if (admin?.phone_number) {
      await sendWhatsAppNotification(admin.phone_number, message);
      return admin;
    }

    // Fallback: notify all super_admins + owner
    const { data: allAdmins } = await supabase
      .from('admin_shifts')
      .select('phone_number')
      .in('role_type', ['super_admin', 'owner'])
      .eq('is_active', true);

    for (const sa of allAdmins || []) {
      if (sa.phone_number) {
        await sendWhatsAppNotification(sa.phone_number, message);
      }
    }
    return null;
  } catch {
    return null;
  }
}
