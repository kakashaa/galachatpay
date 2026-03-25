import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminPageLog(pagePath?: string) {
  useEffect(() => {
    const adminUsername = localStorage.getItem('admin_username');
    const adminRole = localStorage.getItem('admin_role') || 'admin';
    if (!adminUsername) return;

    supabase.from('admin_audit_log').insert({
      admin_username: adminUsername,
      admin_role: adminRole,
      action: 'page_visit',
      details: { page: pagePath || window.location.pathname },
    }).then(() => {});
  }, [pagePath]);
}
