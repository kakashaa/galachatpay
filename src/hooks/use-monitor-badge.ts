import { useState, useEffect } from "react";
import { galaApi } from "@/services/galaApi";

export function useMonitorBadge(intervalMs = 60000) {
  const [dangerCount, setDangerCount] = useState(0);

  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const json = await galaApi.activityFeed(1) as any;
        const count = json?.data?.summary?.danger_count ?? json?.summary?.danger_count ?? 0;
        setDangerCount(count);
      } catch {}
    };
    fetchBadge();
    const id = setInterval(fetchBadge, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return dangerCount;
}
