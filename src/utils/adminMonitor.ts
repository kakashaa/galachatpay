import { supabase } from "@/integrations/supabase/client";

export interface DelayAlert {
  type: string;
  count: number;
  oldest?: string;
}

export async function checkPendingRequests(): Promise<DelayAlert[]> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const alerts: DelayAlert[] = [];

  const tables = [
    { table: "animated_photo_requests", statusField: "status", statusValue: "pending", label: "صور متحركة" },
    { table: "custom_gifts", statusField: "status", statusValue: "pending", label: "هدايا مخصصة" },
    { table: "salary_requests", statusField: "status", statusValue: "pending", label: "رواتب" },
  ];

  for (const t of tables) {
    try {
      const { count } = await supabase
        .from(t.table as any)
        .select("*", { count: "exact", head: true })
        .eq(t.statusField, t.statusValue)
        .lt("created_at", thirtyMinAgo);

      if (count && count > 0) {
        alerts.push({ type: t.label, count });
      }
    } catch { /* silent */ }
  }

  // Support tickets without reply
  try {
    const { count } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")
      .is("admin_reply", null)
      .lt("created_at", thirtyMinAgo);

    if (count && count > 0) {
      alerts.push({ type: "دعم بدون رد", count });
    }
  } catch { /* silent */ }

  return alerts;
}
