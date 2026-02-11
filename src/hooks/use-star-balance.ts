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
      const { data, error } = await supabase
        .from("user_star_balance")
        .select("*")
        .eq("user_uuid", userUuid)
        .eq("current_month", currentMonth)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        // Get last recorded level (single source of truth)
        const lastLevel = localStorage.getItem(STAR_LAST_LEVEL_KEY)
          ? parseInt(localStorage.getItem(STAR_LAST_LEVEL_KEY)!)
          : chargerLevel;

        const levelDiff = chargerLevel - lastLevel;
        const levelBonus = levelDiff >= 5 ? Math.floor(levelDiff / 5) : 0;
        const newTotal = monthlyStars + levelBonus;

        const { data: insertedData, error: insertError } = await supabase
          .from("user_star_balance")
          .insert({
            user_uuid: userUuid,
            current_month: currentMonth,
            monthly_stars: monthlyStars,
            carryover_stars: 0,
            total_stars: newTotal,
            last_level: chargerLevel,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Update single source of truth
        localStorage.setItem(STAR_LAST_LEVEL_KEY, chargerLevel.toString());

        if (insertedData) {
          setStarBalance(insertedData as UserStarBalance);
        }
      } else {
        setStarBalance(data as UserStarBalance);
        // Keep localStorage in sync
        localStorage.setItem(STAR_LAST_LEVEL_KEY, chargerLevel.toString());
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
