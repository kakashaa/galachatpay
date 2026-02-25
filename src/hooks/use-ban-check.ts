import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActiveBan {
  id: string;
  ban_type: string;
  duration_hours: number;
  reason: string;
  created_at: string;
  banned_by: string;
}

export function useBanCheck(userUuid: string | undefined) {
  const [isBanned, setIsBanned] = useState(false);
  const [activeBan, setActiveBan] = useState<ActiveBan | null>(null);
  const [loading, setLoading] = useState(false);

  const checkBan = useCallback(async () => {
    if (!userUuid) {
      setIsBanned(false);
      setActiveBan(null);
      return;
    }

    try {
      setLoading(true);
      const { data: bans } = await supabase
        .from("manual_bans")
        .select("*")
        .eq("target_uuid", userUuid)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!bans || bans.length === 0) {
        setIsBanned(false);
        setActiveBan(null);
        return;
      }

      // Check if any ban is still active (not expired)
      const now = new Date();
      const stillActive = bans.find((ban) => {
        if (ban.duration_hours === 999999) return true; // permanent
        const created = new Date(ban.created_at);
        const expiresAt = new Date(created.getTime() + ban.duration_hours * 60 * 60 * 1000);
        return expiresAt > now;
      });

      if (stillActive) {
        setIsBanned(true);
        setActiveBan(stillActive as ActiveBan);
      } else {
        setIsBanned(false);
        setActiveBan(null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userUuid]);

  useEffect(() => {
    checkBan();
    // Re-check every 60 seconds
    const interval = setInterval(checkBan, 60_000);
    return () => clearInterval(interval);
  }, [checkBan]);

  // Listen to realtime changes
  useEffect(() => {
    if (!userUuid) return;
    const channel = supabase
      .channel(`ban-check-${userUuid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "manual_bans",
          filter: `target_uuid=eq.${userUuid}`,
        },
        () => {
          checkBan();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userUuid, checkBan]);

  const getRemainingTime = useCallback((): string => {
    if (!activeBan) return "";
    if (activeBan.duration_hours === 999999) return "أبدي ♾️";
    const created = new Date(activeBan.created_at);
    const expiresAt = new Date(created.getTime() + activeBan.duration_hours * 60 * 60 * 1000);
    const remaining = expiresAt.getTime() - Date.now();
    if (remaining <= 0) return "منتهي";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} يوم و ${hours % 24} ساعة`;
    }
    return `${hours} ساعة و ${minutes} دقيقة`;
  }, [activeBan]);

  return { isBanned, activeBan, loading, checkBan, getRemainingTime };
}
