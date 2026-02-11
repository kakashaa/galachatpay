import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserStarBalance {
  id: string;
  user_uuid: string;
  current_month: string;
  monthly_stars: number;
  carryover_stars: number;
  total_stars: number;
  last_level: number;
}

const getMonthlyStars = (chargerLevel: number) => {
  if (chargerLevel >= 100) return 8;
  if (chargerLevel >= 90) return 7;
  if (chargerLevel >= 80) return 6;
  if (chargerLevel >= 70) return 5;
  if (chargerLevel >= 60) return 4;
  if (chargerLevel >= 50) return 3;
  if (chargerLevel >= 40) return 2;
  if (chargerLevel >= 30) return 1;
  return 0;
};

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// مفتاح واحد موحد لتخزين آخر مستوى
const STAR_LAST_LEVEL_KEY = "star_last_level";

export const useStarBalance = (userUuid: string | undefined, chargerLevel: number) => {
  const [starBalance, setStarBalance] = useState<UserStarBalance | null>(null);
  const [loading, setLoading] = useState(false);

  const currentMonth = getCurrentMonth();
  const monthlyStars = getMonthlyStars(chargerLevel);

  const fetchStarBalance = useCallback(async () => {
    if (!userUuid) return;
    setLoading(true);
    try {
      // First check if balance exists for current month
      const { data, error } = await supabase
        .from("user_star_balance")
        .select("*")
        .eq("user_uuid", userUuid)
        .eq("current_month", currentMonth)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        // Balance exists — just use it
        setStarBalance(data as UserStarBalance);
        localStorage.setItem(STAR_LAST_LEVEL_KEY, chargerLevel.toString());
      } else {
        // Check for carryover from previous month
        const { data: prevData } = await supabase
          .from("user_star_balance")
          .select("total_stars, carryover_stars")
          .eq("user_uuid", userUuid)
          .neq("current_month", currentMonth)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const carryover = prevData ? (prevData as any).total_stars ?? 0 : 0;

        // Calculate level bonus
        const lastLevel = localStorage.getItem(STAR_LAST_LEVEL_KEY)
          ? parseInt(localStorage.getItem(STAR_LAST_LEVEL_KEY)!)
          : chargerLevel;
        const levelDiff = chargerLevel - lastLevel;
        const levelBonus = levelDiff >= 5 ? Math.floor(levelDiff / 5) : 0;
        const newTotal = monthlyStars + levelBonus + carryover;

        // Use upsert to prevent race condition duplicates
        const { data: upsertedData, error: upsertError } = await supabase
          .from("user_star_balance")
          .upsert(
            {
              user_uuid: userUuid,
              current_month: currentMonth,
              monthly_stars: monthlyStars,
              carryover_stars: carryover,
              total_stars: newTotal,
              last_level: chargerLevel,
            },
            { onConflict: "user_uuid,current_month", ignoreDuplicates: false }
          )
          .select()
          .single();

        if (upsertError) throw upsertError;

        localStorage.setItem(STAR_LAST_LEVEL_KEY, chargerLevel.toString());

        if (upsertedData) {
          setStarBalance(upsertedData as UserStarBalance);
        }
      }
    } catch (err) {
      console.error("Error fetching star balance:", err);
    } finally {
      setLoading(false);
    }
  }, [userUuid, chargerLevel, currentMonth, monthlyStars]);

  return {
    starBalance,
    setStarBalance,
    fetchStarBalance,
    loading,
    currentMonth,
    monthlyStars,
  };
};
