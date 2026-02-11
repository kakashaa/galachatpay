import { supabase } from '@/integrations/supabase/client';

interface BanReportData {
  id: string;
  reporter_gala_id: string;
  reported_user_id: string;
  ban_type: string;
  created_at: string;
}

export async function notifyNewBanReport(data: BanReportData) {
  try {
    await supabase.functions.invoke('webhook-notify', {
      body: { type: 'ban_report', data },
    });
  } catch (error) {
    console.error('Webhook notification failed:', error);
  }
}
