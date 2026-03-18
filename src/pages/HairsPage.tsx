import React, { useState, useEffect, useMemo } from "react";
import MobileLayout from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sticker, Lock, Loader2, Check, ArrowRight, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LazySvgaPlayer from "@/components/LazySvgaPlayer";
import SvgaPlayer from "@/components/SvgaPlayer";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useStarBalance } from "@/hooks/use-star-balance";
import ServicePreviousRequests from "@/components/ServicePreviousRequests";

interface HairItem {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  display_order: number;
  is_active: boolean;
  star_cost: number;
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
  const navigate = useNavigate();
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

  // Star balance
  const { starBalance, fetchStarBalance } = useStarBalance(user?.uuid, chargerLevel);

  useEffect(() => {
    if (user?.uuid) fetchStarBalance();
  }, [user?.uuid, fetchStarBalance]);

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
        .select("id, title, file_url, thumbnail_url, display_order, is_active, star_cost" as any)
        .eq("is_deleted", false)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setHairs((data as any) || []);

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

  const toggleSelect = (hair: HairItem, isLocked: boolean) => {
    if (isLocked) {
      toast.error("هذه الشعرة مقفلة، ارفع مستواك لفتحها");
      return;
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(hair.id)) {
        next.delete(hair.id);
      } else {
        if (next.size >= maxWeeklySelections) {
          toast.error(`الحد الأقصى ${maxWeeklySelections} شعرات في الأسبوع`);
          return prev;
        }
        // Check star balance for new selections
        const cost = hair.star_cost || 0;
        if (cost > 0 && !savedIds.has(hair.id)) {
          const totalStars = starBalance?.total_stars || 0;
          // Count cost of other new selections
          const otherNewCost = Array.from(prev)
            .filter(id => !savedIds.has(id))
            .reduce((sum, id) => {
              const h = hairs.find(x => x.id === id);
              return sum + (h?.star_cost || 0);
            }, 0);
          if (otherNewCost + cost > totalStars) {
            toast.error(`رصيد النجوم غير كافي (${totalStars} ⭐)`);
            return prev;
          }
        }
        next.add(hair.id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user?.uuid) return;
    setSaving(true);

    // Calculate total star cost for new selections
    const newSelections = Array.from(selectedIds).filter(id => !savedIds.has(id));
    const totalCost = newSelections.reduce((sum, id) => {
      const h = hairs.find(x => x.id === id);
      return sum + (h?.star_cost || 0);
    }, 0);

    if (totalCost > 0 && (starBalance?.total_stars || 0) < totalCost) {
      toast.error(`رصيد النجوم غير كافي! تحتاج ${totalCost} ⭐`);
      setSaving(false);
      return;
    }

    try {
      // Step 1: Delete old selections (fast - Supabase)
      await supabase.from("hair_selections").delete().eq("user_uuid", user.uuid).eq("selection_week", weekKey);

      // Step 2: Insert new selections (fast - Supabase)
      if (selectedIds.size > 0) {
        const rows = Array.from(selectedIds).map(hair_id => ({
          user_uuid: user.uuid, hair_id, selection_week: weekKey, status: "pending",
        }));
        await supabase.from("hair_selections").insert(rows as any);
      }

      // Step 3: Deduct stars (fast - Supabase)
      if (totalCost > 0 && starBalance) {
        const newTotal = starBalance.total_stars - totalCost;
        await supabase.from("user_star_balance").update({ total_stars: newTotal }).eq("user_uuid", user.uuid).eq("current_month", starBalance.current_month);
        fetchStarBalance();
      }

      // Success! Show immediately
      setSavedIds(new Set(selectedIds));
      setSaving(false);
      toast.success(`✅ تم حفظ ${selectedIds.size} شعرة لهذا الأسبوع`);

      // Step 4: Background notifications - user doesn't wait
      for (const hairId of Array.from(selectedIds)) {
        const h = hairs.find(x => x.id === hairId);
        if (h) {
          supabase.functions.invoke("telegram-notify", {
            body: { type: "hair_selection", record: { user_name: user.name || user.uuid, hair_title: h.title, file_url: h.file_url, star_cost: h.star_cost } },
          }).catch(() => {});
          supabase.functions.invoke("gala-actions?action=submit-request", {
            body: { user_uuid: user.uuid, user_name: user.name, request_type: "hair", details: { file_url: h.file_url, title: h.title, star_cost: h.star_cost }, evidence_url: h.file_url, image_url: h.thumbnail_url || h.file_url },
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "فشل الحفظ");
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (selectedIds.size !== savedIds.size) return true;
    for (const id of selectedIds) if (!savedIds.has(id)) return true;
    return false;
  }, [selectedIds, savedIds]);

  // Calculate total cost of new selections
  const newSelectionCost = useMemo(() => {
    return Array.from(selectedIds)
      .filter(id => !savedIds.has(id))
      .reduce((sum, id) => {
        const h = hairs.find(x => x.id === id);
        return sum + (h?.star_cost || 0);
      }, 0);
  }, [selectedIds, savedIds, hairs]);

  if (chargerLevel < 40) {
    return (
      <MobileLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors">
              <ArrowRight className="w-4 h-4 text-foreground" />
            </button>
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
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors">
              <ArrowRight className="w-4 h-4 text-foreground" />
            </button>
            <Sticker className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold text-foreground">شعرات</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full font-medium flex items-center gap-1">
              <Star className="w-3 h-3" /> {starBalance?.total_stars ?? 0}
            </span>
            <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-full font-medium">
              {selectedIds.size}/{maxWeeklySelections}
            </span>
          </div>
        </div>

        {/* Previous requests */}
        {user?.uuid && <ServicePreviousRequests userUuid={user.uuid} serviceType="hair" />}

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
            const cost = hair.star_cost || 0;

            return (
              <motion.div
                key={hair.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSelect(hair, isLocked)}
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
                  <LazySvgaPlayer src={hair.file_url} loop={0} width={150} height={112} thumbnailUrl={hair.thumbnail_url} className="w-full h-full object-contain" />
                  {isLocked && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
                      <Lock className="w-6 h-6 text-muted-foreground/60" />
                    </div>
                  )}
                </div>
                <div className="px-1 pb-1.5 pt-0.5 flex items-center justify-between">
                  <p className="text-[10px] truncate text-muted-foreground leading-tight flex-1">{hair.title || "—"}</p>
                  {cost > 0 && !isLocked && (
                    <span className="text-[9px] text-amber-400 flex items-center gap-0.5 shrink-0">
                      <Star className="w-2.5 h-2.5" />{cost}
                    </span>
                  )}
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
              {saving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>جاري الحفظ...</span>
                </div>
              ) : (
                <>حفظ الاختيارات ({selectedIds.size}){newSelectionCost > 0 && ` — ${newSelectionCost} ⭐`}</>
              )}
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
