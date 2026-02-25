import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Gift, Wallet, Headset, Crown, Sparkles, Camera, Frame, Scissors,
  Briefcase, Ban, Star, DollarSign, Loader2,
} from "lucide-react";

const ELEMENT_SETTINGS_PREFIX = "element_enabled_";

interface ElementItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const ELEMENTS: ElementItem[] = [
  { key: "star_gifting", label: "إهداء نجوم", icon: <Gift className="w-5 h-5 text-yellow-400" /> },
  { key: "star_cashout", label: "كاش نجوم", icon: <DollarSign className="w-5 h-5 text-emerald-400" /> },
  { key: "salary", label: "سحب راتب", icon: <Wallet className="w-5 h-5 text-green-400" /> },
  { key: "quick_support", label: "دعم سريع", icon: <Headset className="w-5 h-5 text-blue-400" /> },
  { key: "vip", label: "طلب VIP", icon: <Crown className="w-5 h-5 text-yellow-400" /> },
  { key: "gifts", label: "هدية مخصصة", icon: <Gift className="w-5 h-5 text-pink-400" /> },
  { key: "entries", label: "دخولية", icon: <Sparkles className="w-5 h-5 text-cyan-400" /> },
  { key: "animated_photos", label: "صور متحركة", icon: <Camera className="w-5 h-5 text-orange-400" /> },
  { key: "frames", label: "إطارات", icon: <Frame className="w-5 h-5 text-indigo-400" /> },
  { key: "hairs", label: "شعرات", icon: <Scissors className="w-5 h-5 text-fuchsia-400" /> },
  { key: "works", label: "Works", icon: <Briefcase className="w-5 h-5 text-amber-400" /> },
  { key: "ban_check", label: "حظر", icon: <Ban className="w-5 h-5 text-red-400" /> },
];

interface Props {
  readOnly?: boolean;
  adminUsername: string;
}

const AdminElementSettings: React.FC<Props> = ({ readOnly, adminUsername }) => {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .like("key", `${ELEMENT_SETTINGS_PREFIX}%`);

      const map: Record<string, boolean> = {};
      ELEMENTS.forEach((el) => {
        map[el.key] = true;
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
  }, [loadSettings]);

  const toggleElement = async (key: string, enabled: boolean) => {
    if (readOnly) return;
    setToggling(key);
    try {
      const dbKey = `${ELEMENT_SETTINGS_PREFIX}${key}`;
      const { data: existing } = await supabase
        .from("app_settings")
        .select("key")
        .eq("key", dbKey)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("app_settings")
          .update({ value: enabled ? "true" : "false", updated_at: new Date().toISOString() })
          .eq("key", dbKey);
      } else {
        await supabase
          .from("app_settings")
          .insert({ key: dbKey, value: enabled ? "true" : "false" });
      }

      setSettings((prev) => ({ ...prev, [key]: enabled }));
      toast.success(enabled ? `تم تفعيل ${ELEMENTS.find(e => e.key === key)?.label}` : `تم إيقاف ${ELEMENTS.find(e => e.key === key)?.label}`);
    } catch {
      toast.error("فشل في تحديث الإعداد");
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-xs text-muted-foreground mb-4">
        تحكم في تفعيل أو إيقاف العناصر لجميع المستخدمين. العنصر الموقف سيظهر للمستخدم برسالة "قيد التطوير".
      </p>
      {ELEMENTS.map((el) => {
        const isEnabled = settings[el.key] !== false;
        const isToggling = toggling === el.key;

        return (
          <div
            key={el.key}
            className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
              isEnabled
                ? "bg-card border-border"
                : "bg-destructive/5 border-destructive/20"
            }`}
          >
            <div className="flex items-center gap-3">
              {el.icon}
              <span className="text-sm font-medium">{el.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {isToggling && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <span className={`text-[10px] font-bold ${isEnabled ? "text-emerald-400" : "text-destructive"}`}>
                {isEnabled ? "مفعّل" : "موقف"}
              </span>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => toggleElement(el.key, checked)}
                disabled={readOnly || isToggling}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminElementSettings;
