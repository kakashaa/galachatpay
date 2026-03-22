import { useState, useEffect } from "react";

const DB_PROXY = "https://hola-chat.com/db-proxy.php";
const API_KEY = "ghala2026proxy";

export function useMonitorBadge(intervalMs = 60000) {
  const [dangerCount, setDangerCount] = useState(0);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${DB_PROXY}?key=${API_KEY}&action=activity-feed&limit=1`);
        const json = await res.json();
        const count = json?.data?.summary?.danger_count ?? json?.summary?.danger_count ?? 0;
        setDangerCount(count);
      } catch {}
    };
    fetch_();
    const id = setInterval(fetch_, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return dangerCount;
}
