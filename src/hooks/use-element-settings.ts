import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ELEMENT_KEYS = [
  "star_gifting", "star_cashout", "salary", "quick_support", "vip",
  "gifts", "entries", "animated_photos", "frames", "hairs", "works", "ban_check"
] as const;

export type ElementKey = typeof ELEMENT_KEYS[number];

const ELEMENT_SETTINGS_PREFIX = "element_enabled_";

export function useElementSettings() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .like("key", `${ELEMENT_SETTINGS_PREFIX}%`);

      const map: Record<string, boolean> = {};
      ELEMENT_KEYS.forEach((k) => {
        map[k] = true; // default enabled
      });
      if (data) {
        data.forEach((row) => {
          const key = row.key.replace(ELEMENT_SETTINGS_PREFIX, "");
          map[key] = row.value === "true";
        });
      }
      setSettings(map);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    const channel = supabase
      .channel("element-settings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload: any) => {
          const key = payload.new?.key;
          if (key && key.startsWith(ELEMENT_SETTINGS_PREFIX)) {
            const elementKey = key.replace(ELEMENT_SETTINGS_PREFIX, "");
            setSettings((prev) => ({ ...prev, [elementKey]: payload.new.value === "true" }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSettings]);

  const isElementEnabled = useCallback(
    (key: string): boolean => {
      return settings[key] !== false; // default true
    },
    [settings]
  );

  return { settings, loading, isElementEnabled, reload: loadSettings };
}
