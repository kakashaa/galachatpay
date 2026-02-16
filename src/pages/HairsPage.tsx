import React, { useState, useEffect, useMemo } from "react";
import MobileLayout from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sticker, Lock, Loader2, Check } from "lucide-react";
import SvgaPlayer from "@/components/SvgaPlayer";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface HairItem {
  id: string;
  title: string;
  file_url: string;
  display_order: number;
  is_active: boolean;
}

// Level thresholds for unlocking hairs
const LEVEL_TIERS = [
  { minLevel: 40, count: 5 },
  { minLevel: 50, count: 10 },
  { minLevel: 60, count: 15 },
  { minLevel: 70, count: Infinity },
];

function getUnlockCount(chargerLevel: number): number {
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (chargerLevel >= LEVEL_TIERS[i].minLevel) return LEVEL_TIERS[i].count;
  }
  return 0;
}

function getNextTier(chargerLevel: number) {
  for (const tier of LEVEL_TIERS) {
    if (chargerLevel < tier.minLevel) return tier;
  }
  return null;
}

const HairsPage: React.FC = () => {
  const { user } = useAuth();
  const [hairs, setHairs] = useState<HairItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [previewHair, setPreviewHair] = useState<HairItem | null>(null);

  const chargerLevel = user?.level?.charger_level || 0;
  const unlockCount = getUnlockCount(chargerLevel);
  const nextTier = getNextTier(chargerLevel);
  const maxWeeklySelections = 7;

  // Current week key for selections
  const weekKey = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("hairs")
        .select("id, title, file_url, display_order, is_active")
        .eq("is_deleted", false)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setHairs(data || []);

      // Load user's current week selections
      if (user?.uuid) {
        const { data: selections } = await supabase
          .from("hair_selections")
          .select("hair_id")
          .eq("user_uuid", user.uuid)
          .eq("selection_week", weekKey);
        if (selections) {
          const ids = new Set(selections.map(s => s.hair_id));
          setSelectedIds(ids);
          setSavedIds(ids);
        }
      }
      setLoading(false);
    };
    loadData();
  }, [user?.uuid, weekKey]);

  const toggleSelect = (hairId: string, isLocked: boolean) => {
    if (isLocked) {
      toast.error("هذه الشعرة مقفلة، ارفع مستواك لفتحها");
      return;
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(hairId)) {
        next.delete(hairId);
      } else {
        if (next.size >= maxWeeklySelections) {
          toast.error(`الحد الأقصى ${maxWeeklySelections} شعرات في الأسبوع`);
          return prev;
        }
        next.add(hairId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user?.uuid) return;
    setSaving(true);

    // Delete old selections for this week
    await supabase
      .from("hair_selections")
      .delete()
      .eq("user_uuid", user.uuid)
      .eq("selection_week", weekKey);

    // Insert new selections
    if (selectedIds.size > 0) {
      const rows = Array.from(selectedIds).map(hair_id => ({
        user_uuid: user.uuid,
        hair_id,
        selection_week: weekKey,
      }));
      await supabase.from("hair_selections").insert(rows);
    }

    setSavedIds(new Set(selectedIds));
    setSaving(false);
    toast.success(`✅ تم حفظ ${selectedIds.size} شعرة لهذا الأسبوع`);
  };

  const hasChanges = useMemo(() => {
    if (selectedIds.size !== savedIds.size) return true;
    for (const id of selectedIds) if (!savedIds.has(id)) return true;
    return false;
  }, [selectedIds, savedIds]);

  if (chargerLevel < 40) {
    return (
      <MobileLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sticker className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold text-foreground">شعرات</h1>
          </div>
          <div className="text-center py-20">
            <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              تحتاج لفل شحن <span className="text-amber-400 font-bold">40</span> على الأقل لفتح الشعرات
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              مستواك الحالي: <span className="text-primary font-bold">{chargerLevel}</span>
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-4 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sticker className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold text-foreground">شعرات</h1>
          </div>
          <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-full font-medium">
            {selectedIds.size}/{maxWeeklySelections}
          </span>
        </div>

        {/* Level info */}
        <div className="bg-card border border-border/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
          <p>🔓 مفتوح لك: <span className="text-foreground font-bold">{unlockCount === Infinity ? "الكل" : unlockCount}</span> شعرة (لفل شحن {chargerLevel})</p>
          {nextTier && (
            <p>⬆️ لفل {nextTier.minLevel} يفتح {nextTier.count === Infinity ? "الكل" : nextTier.count} شعرة</p>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {hairs.map((hair, index) => {
            const isLocked = index >= unlockCount;
            const isSelected = selectedIds.has(hair.id);

            return (
              <motion.div
                key={hair.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSelect(hair.id, isLocked)}
                onDoubleClick={() => !isLocked && setPreviewHair(hair)}
                className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : isLocked
                    ? "border-border/20 bg-muted/20"
                    : "border-border/40 bg-card hover:border-primary/50"
                }`}
              >
                <div className="aspect-[4/3] flex items-center justify-center overflow-hidden relative">
                  <SvgaPlayer src={hair.file_url} loop={0} width={150} height={112} className="w-full h-full object-contain" />
                  {isLocked && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
                      <Lock className="w-6 h-6 text-muted-foreground/60" />
                    </div>
                  )}
                </div>
                <div className="px-1 pb-1.5 pt-0.5">
                  <p className="text-[10px] text-center truncate text-muted-foreground leading-tight">{hair.title || "—"}</p>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Save button */}
        {hasChanges && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-20 left-4 right-4 z-50"
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30 disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : `حفظ الاختيارات (${selectedIds.size})`}
            </button>
          </motion.div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewHair && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/90 flex items-center justify-center"
            onClick={() => setPreviewHair(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="w-64 h-64"
              onClick={e => e.stopPropagation()}
            >
              <SvgaPlayer src={previewHair.file_url} loop={0} width={300} height={300} className="w-full h-full" />
              <p className="text-center text-foreground text-sm mt-3">{previewHair.title}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileLayout>
  );
};

export default HairsPage;
