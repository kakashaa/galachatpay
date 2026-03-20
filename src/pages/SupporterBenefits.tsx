import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Crown, Gift, Star, Trophy, Zap, ArrowUp, Clock, Users, Check, Award, Gem, Sparkles, Frame, UserCheck, Coins, Image, BadgeCheck, X, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import MobileLayout from "@/components/MobileLayout";

interface Tier {
  id: string;
  name: string;
  min_coins: number;
  color: string;
  sort_order: number;
  rewards: any[];
  is_active: boolean;
}

interface Reward {
  id: string;
  uuid: string;
  tier_name: string;
  month: string;
  type: string;
  value: number;
  ware_id: number;
  duration_days: number;
  count: number;
  status: string;
  used_at: string | null;
  used_for: string | null;
  expires_at: string | null;
  created_at: string;
}

const REWARD_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  vip: { label: "VIP", icon: Crown },
  frame: { label: "إطار", icon: Frame },
  entry: { label: "دخولية", icon: Sparkles },
  necklace: { label: "قلادة", icon: Gem },
  coins: { label: "كوينز", icon: Coins },
  uuid_change: { label: "تغيير UUID", icon: UserCheck },
  animated_photo: { label: "صورة متحركة", icon: Image },
  custom_gift: { label: "هدية مخصصة", icon: Gift },
  badge: { label: "شارة", icon: BadgeCheck },
};

const formatCoins = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
};

const SupporterBenefits: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [monthlyCoins, setMonthlyCoins] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [giftDialog, setGiftDialog] = useState<{ open: boolean; reward: Reward | null }>({ open: false, reward: null });
  const [giftUuid, setGiftUuid] = useState("");
  const [giftUserName, setGiftUserName] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rewardHistory, setRewardHistory] = useState<Reward[]>([]);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load tiers
      const { data: tiersData } = await supabase
        .from("supporter_tiers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setTiers((tiersData || []) as any);

      if (user?.uuid) {
        // Load available rewards
        const { data: rewardsData } = await supabase
          .from("supporter_rewards")
          .select("*")
          .eq("uuid", user.uuid)
          .eq("month", currentMonth)
          .order("created_at", { ascending: false });
        setRewards((rewardsData || []) as any);

        // Load history
        const { data: historyData } = await supabase
          .from("supporter_rewards")
          .select("*")
          .eq("uuid", user.uuid)
          .neq("month", currentMonth)
          .order("created_at", { ascending: false })
          .limit(50);
        setRewardHistory((historyData || []) as any);

        // Load monthly charges from cache
        const { data: chargeData } = await supabase
          .from("supporter_monthly_charges")
          .select("*")
          .eq("uuid", user.uuid)
          .eq("month", currentMonth)
          .single();
        if (chargeData) setMonthlyCoins((chargeData as any).total_coins || 0);

        // Fetch fresh charges from API
        try {
          const res = await fetch("https://hola-chat.com/wares-api.php?key=ghala2026actions&action=monitor-query", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `question=كم+شحن+UUID+${user.uuid}+هالشهر`,
          });
          const apiData = await res.json();
          if (apiData?.total_coins || apiData?.coins) {
            const coins = apiData.total_coins || apiData.coins || 0;
            setMonthlyCoins(coins);
          }
        } catch { /* use cached */ }
      }

      // Leaderboard
      try {
        const res = await fetch("https://hola-chat.com/wares-api.php?key=ghala2026actions&action=monitor-query", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "question=أعلى+الداعمين+هالشهر",
        });
        const lbData = await res.json();
        if (Array.isArray(lbData)) setLeaderboard(lbData.slice(0, 10));
        else if (lbData?.users) setLeaderboard(lbData.users.slice(0, 10));
      } catch { /* silent */ }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [user?.uuid, currentMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresh leaderboard every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("https://hola-chat.com/wares-api.php?key=ghala2026actions&action=monitor-query", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "question=أعلى+الداعمين+هالشهر",
        });
        const lbData = await res.json();
        if (Array.isArray(lbData)) setLeaderboard(lbData.slice(0, 10));
        else if (lbData?.users) setLeaderboard(lbData.users.slice(0, 10));
      } catch { /* silent */ }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate current tier
  const currentTier = tiers.filter(t => monthlyCoins >= t.min_coins).pop();
  const nextTier = tiers.find(t => t.min_coins > monthlyCoins);
  const progressToNext = nextTier
    ? Math.min(100, ((monthlyCoins - (currentTier?.min_coins || 0)) / (nextTier.min_coins - (currentTier?.min_coins || 0))) * 100)
    : 100;
  const coinsToNext = nextTier ? nextTier.min_coins - monthlyCoins : 0;

  // Days remaining in month
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const availableRewards = rewards.filter(r => r.status === "available");

  // Use reward for self
  const useForSelf = async (reward: Reward) => {
    if (processing) return;
    setProcessing(true);
    try {
      if (reward.type === "vip") {
        await fetch("https://galachat.site/project-z/api.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "admin_give_vip",
            admin_key: "ghala2026owner",
            uuid: user?.uuid,
            level: reward.value,
            duration: reward.duration_days,
          }),
        });
      } else if (reward.type === "frame" || reward.type === "entry" || reward.type === "necklace") {
        const actionMap: Record<string, string> = { frame: "set-frame", entry: "set-entry", necklace: "set-necklace" };
        await fetch(`https://18.219.229.240/website/admin-actions.php?key=ghala2026actions&action=${actionMap[reward.type]}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid: user?.uuid, ware_id: reward.ware_id }),
        });
      }
      await supabase
        .from("supporter_rewards")
        .update({ status: "used", used_at: new Date().toISOString(), used_for: user?.uuid } as any)
        .eq("id", reward.id);
      toast.success("تم تفعيل المكافأة!");
      loadData();
    } catch { toast.error("فشل التفعيل"); }
    setProcessing(false);
  };

  // Lookup UUID
  const lookupUser = async (uuid: string) => {
    if (!uuid.trim()) return;
    setLookingUp(true);
    setGiftUserName("");
    try {
      const res = await fetch(`https://18.219.229.240/website/admin-actions.php?key=ghala2026actions&action=user-info&uuid=${uuid}`);
      const data = await res.json();
      if (data?.name) setGiftUserName(data.name);
      else toast.error("UUID غير موجود");
    } catch { toast.error("فشل البحث"); }
    setLookingUp(false);
  };

  // Gift reward
  const giftReward = async () => {
    if (!giftDialog.reward || !giftUuid.trim() || processing) return;
    setProcessing(true);
    const reward = giftDialog.reward;
    try {
      if (reward.type === "vip") {
        await fetch("https://galachat.site/project-z/api.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "admin_give_vip",
            admin_key: "ghala2026owner",
            uuid: giftUuid,
            level: reward.value,
            duration: reward.duration_days,
          }),
        });
      } else if (reward.type === "frame" || reward.type === "entry" || reward.type === "necklace") {
        const actionMap: Record<string, string> = { frame: "set-frame", entry: "set-entry", necklace: "set-necklace" };
        await fetch(`https://18.219.229.240/website/admin-actions.php?key=ghala2026actions&action=${actionMap[reward.type]}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid: giftUuid, ware_id: reward.ware_id }),
        });
      }
      await supabase
        .from("supporter_rewards")
        .update({ status: "gifted", used_at: new Date().toISOString(), used_for: giftUuid } as any)
        .eq("id", reward.id);
      toast.success(`تم إهداء المكافأة لـ ${giftUuid}!`);
      setGiftDialog({ open: false, reward: null });
      setGiftUuid("");
      setGiftUserName("");
      loadData();
    } catch { toast.error("فشل الإهداء"); }
    setProcessing(false);
  };

  // Group history by month
  const historyByMonth: Record<string, Reward[]> = {};
  rewardHistory.forEach(r => {
    if (!historyByMonth[r.month]) historyByMonth[r.month] = [];
    historyByMonth[r.month].push(r);
  });

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-24" dir="rtl">
        {/* Header */}
        <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3" style={{ background: "hsl(var(--card))", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowRight className="w-5 h-5 text-foreground" />
          </button>
          <Crown className="w-5 h-5 text-yellow-400" />
          <h1 className="text-sm font-bold text-foreground">مزايا الداعم</h1>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* User card */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 text-center"
              style={{ background: "linear-gradient(135deg, hsl(0 0% 100% / 0.04), hsl(0 0% 100% / 0.02))", border: "1px solid hsl(0 0% 100% / 0.06)" }}
            >
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden mb-2" style={{ border: `2px solid ${currentTier?.color || "hsl(0 0% 100% / 0.1)"}` }}>
                {user.profile?.image ? (
                  <img src={user.profile.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-foreground/60" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
                    {(user.name || "?").charAt(0)}
                  </div>
                )}
              </div>
              <p className="text-sm font-bold text-foreground">{user.name}</p>
              <p className="text-[10px] text-muted-foreground mb-3">UUID: {user.uuid}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-base font-bold text-foreground tabular-nums">{formatCoins(user.my_store?.coins || 0)}</p>
                  <p className="text-[9px] text-muted-foreground">كوينز</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-foreground tabular-nums">{formatCoins(user.my_store?.diamonds || 0)}</p>
                  <p className="text-[9px] text-muted-foreground">ماسات</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-foreground tabular-nums">${user.my_store?.usd || 0}</p>
                  <p className="text-[9px] text-muted-foreground">الراتب</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Current tier */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-4"
            style={{
              background: currentTier
                ? `linear-gradient(135deg, ${currentTier.color}15, ${currentTier.color}08)`
                : "hsl(0 0% 100% / 0.03)",
              border: `1px solid ${currentTier?.color || "hsl(0 0% 100% / 0.06)"}30`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${currentTier?.color || "#666"}25` }}>
                <Trophy className="w-4 h-4" style={{ color: currentTier?.color || "#666" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {currentTier ? `المستوى ${currentTier.name}` : "لم تبدأ بعد"}
                </p>
                <p className="text-[10px] text-muted-foreground">هذا الشهر</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">شحنك هالشهر:</span>
                <span className="font-bold text-foreground tabular-nums">
                  {formatCoins(monthlyCoins)} كوينز (${(monthlyCoins / 7500).toFixed(0)})
                </span>
              </div>

              {nextTier && (
                <>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">المستوى الجاي: {nextTier.name}</span>
                    <span className="font-bold tabular-nums" style={{ color: nextTier.color }}>{Math.round(progressToNext)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNext}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${currentTier?.color || "#666"}, ${nextTier.color})` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>باقي {formatCoins(coinsToNext)} كوينز</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{daysRemaining} يوم متبقي</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Special offer */}
          {nextTier && coinsToNext > 0 && coinsToNext <= nextTier.min_coins * 0.3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              className="rounded-2xl p-4"
              style={{ background: "linear-gradient(135deg, hsl(45 93% 47% / 0.08), hsl(45 93% 47% / 0.03))", border: "1px solid hsl(45 93% 47% / 0.15)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <p className="text-xs font-bold text-yellow-400">عرض خاص</p>
              </div>
              <p className="text-[11px] text-foreground leading-relaxed">
                اشحن {formatCoins(coinsToNext)} كوينز قبل نهاية الشهر واحصل على مكافآت {nextTier.name}!
              </p>
            </motion.div>
          )}

          {/* Available rewards */}
          {availableRewards.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-foreground">مكافآتك المتاحة</h2>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">{availableRewards.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {availableRewards.map((reward, i) => {
                  const typeInfo = REWARD_TYPE_LABELS[reward.type];
                  const Icon = typeInfo?.icon || Gift;
                  const daysLeft = reward.expires_at
                    ? Math.max(0, Math.ceil((new Date(reward.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                    : 30;
                  return (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="rounded-xl p-3"
                      style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-yellow-400" />
                        <div>
                          <p className="text-[11px] font-bold text-foreground">
                            {typeInfo?.label || reward.type}
                            {reward.type === "vip" && ` ${reward.value}`}
                          </p>
                          {reward.duration_days && (
                            <p className="text-[9px] text-muted-foreground">{reward.duration_days} يوم</p>
                          )}
                          {reward.type === "coins" && (
                            <p className="text-[9px] text-muted-foreground">{formatCoins(reward.value)} كوينز</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => useForSelf(reward)}
                          disabled={processing}
                          className="w-full py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 disabled:opacity-40"
                          style={{ background: "hsl(160 84% 39% / 0.12)", color: "hsl(160 84% 50%)" }}
                        >
                          لنفسي
                        </button>
                        {reward.type !== "coins" && (
                          <button
                            onClick={() => { setGiftDialog({ open: true, reward }); setGiftUuid(""); setGiftUserName(""); }}
                            disabled={processing}
                            className="w-full py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 disabled:opacity-40"
                            style={{ background: "hsl(217 91% 50% / 0.12)", color: "hsl(217 91% 70%)" }}
                          >
                            إهداء
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                        <p className="text-[8px] text-muted-foreground">ينتهي خلال {daysLeft} يوم</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tier table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-400" />
              <h2 className="text-xs font-bold text-foreground">جدول المستويات</h2>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              {tiers.map((tier, i) => {
                const isCurrent = currentTier?.id === tier.id;
                const isAchieved = monthlyCoins >= tier.min_coins;
                return (
                  <div
                    key={tier.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{
                      background: isCurrent ? `${tier.color}10` : "transparent",
                      borderBottom: i < tiers.length - 1 ? "1px solid hsl(0 0% 100% / 0.04)" : undefined,
                    }}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${tier.color}20` }}>
                      {isAchieved ? (
                        <Check className="w-3 h-3" style={{ color: tier.color }} />
                      ) : (
                        <Star className="w-3 h-3" style={{ color: tier.color }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold" style={{ color: tier.color }}>{tier.name}</span>
                        {isCurrent && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-bold">أنت هنا</span>
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground">{formatCoins(tier.min_coins)}+ كوينز</p>
                    </div>
                    <div className="text-[9px] text-muted-foreground text-left max-w-[120px] truncate">
                      {(tier.rewards || []).map((r: any) => REWARD_TYPE_LABELS[r.type]?.label || r.type).join(" + ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reward history */}
          {Object.keys(historyByMonth).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-blue-400" />
                <h2 className="text-xs font-bold text-foreground">سجل المكافآت</h2>
              </div>
              {Object.entries(historyByMonth).map(([month, rews]) => (
                <div key={month} className="mb-3">
                  <p className="text-[10px] font-bold text-muted-foreground mb-1.5">{month} — {rews[0]?.tier_name || ""}</p>
                  {rews.map(r => {
                    const typeInfo = REWARD_TYPE_LABELS[r.type];
                    return (
                      <div key={r.id} className="flex items-center gap-2 py-1">
                        {r.status === "used" && <Check className="w-3 h-3 text-emerald-400" />}
                        {r.status === "gifted" && <Gift className="w-3 h-3 text-blue-400" />}
                        {r.status === "expired" && <Clock className="w-3 h-3 text-red-400/60" />}
                        {r.status === "available" && <Clock className="w-3 h-3 text-yellow-400" />}
                        <span className="text-[10px] text-foreground/80">
                          {typeInfo?.label || r.type}
                          {r.type === "vip" && ` ${r.value}`}
                          {r.duration_days ? ` (${r.duration_days} يوم)` : ""}
                          {r.status === "used" && r.used_for === r.uuid && " — استخدمت لنفسي"}
                          {r.status === "gifted" && ` — أهديت لـ ${r.used_for}`}
                          {r.status === "expired" && " — انتهت الصلاحية"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* How it works */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUp className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-bold text-foreground">كيف يعمل النظام؟</h2>
            </div>
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
              {[
                "شحناتك تتجمع تلقائي كل شهر",
                "أول يوم من الشهر الجديد تنزل مكافآتك",
                "كل مكافأة تقدر تستخدمها لنفسك أو تهديها",
                "المكافآت صالحة 30 يوم — استخدمها قبل تنتهي!",
                "الكوينزات تنزل بحسابك فوري — الباقي تختار",
                "كل ما شحنت أكثر مستواك يرتفع ومكافآتك أحسن",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold text-foreground">أعلى 10 داعمين هالشهر</h2>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                {leaderboard.map((entry: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2"
                    style={{
                      background: entry.uuid === user?.uuid ? "hsl(45 93% 47% / 0.06)" : "transparent",
                      borderBottom: i < leaderboard.length - 1 ? "1px solid hsl(0 0% 100% / 0.04)" : undefined,
                    }}
                  >
                    <span className="text-[10px] font-bold text-muted-foreground w-5 text-center tabular-nums">
                      {i === 0 ? <Crown className="w-3.5 h-3.5 text-yellow-400 mx-auto" /> : i + 1}
                    </span>
                    <span className="text-[11px] text-foreground flex-1 truncate">{entry.name || entry.uuid}</span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{formatCoins(entry.total_coins || entry.coins || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gift dialog */}
        <Dialog open={giftDialog.open} onOpenChange={(o) => setGiftDialog({ open: o, reward: giftDialog.reward })}>
          <DialogContent className="max-w-[340px] rounded-2xl p-0" style={{ background: "hsl(var(--card))", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">
                  إهداء: {REWARD_TYPE_LABELS[giftDialog.reward?.type || ""]?.label}
                  {giftDialog.reward?.type === "vip" && ` ${giftDialog.reward.value}`}
                  {giftDialog.reward?.duration_days && ` (${giftDialog.reward.duration_days} يوم)`}
                </p>
                <button onClick={() => setGiftDialog({ open: false, reward: null })} className="p-1 rounded-lg hover:bg-white/5">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">UUID المستلم:</label>
                <div className="flex gap-2">
                  <input
                    value={giftUuid}
                    onChange={(e) => setGiftUuid(e.target.value)}
                    placeholder="ادخل UUID..."
                    className="flex-1 py-2 px-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
                    dir="ltr"
                  />
                  <button
                    onClick={() => lookupUser(giftUuid)}
                    disabled={lookingUp || !giftUuid.trim()}
                    className="px-3 rounded-xl disabled:opacity-40"
                    style={{ background: "hsl(217 91% 50% / 0.12)" }}
                  >
                    {lookingUp ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Search className="w-4 h-4 text-blue-400" />}
                  </button>
                </div>
              </div>

              {giftUserName && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(160 84% 39% / 0.08)" }}>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-foreground">{giftUserName} (UUID: {giftUuid})</span>
                </motion.div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={giftReward}
                  disabled={!giftUserName || processing}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 transition-all active:scale-95"
                  style={{ background: "hsl(160 84% 39% / 0.15)", color: "hsl(160 84% 50%)" }}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تأكيد الإهداء"}
                </button>
                <button
                  onClick={() => setGiftDialog({ open: false, reward: null })}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: "hsl(0 0% 100% / 0.04)" }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default SupporterBenefits;
