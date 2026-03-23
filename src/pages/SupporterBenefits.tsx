import React, { useState, useEffect, useCallback } from "react";
import FancyLoading from "@/components/FancyLoading";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Crown, Gift, Star, Trophy, ArrowUp, Clock, Users,
  Check, Gem, Sparkles, Frame, UserCheck, Coins, Image, BadgeCheck,
  X, Search, Loader2, AlertTriangle, ChevronDown, ChevronUp, Send,
  TrendingUp, Target, Award, BarChart3, Medal, Copy, Ticket, Zap, Timer, Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import MobileLayout from "@/components/MobileLayout";
import { galaApi } from "@/services/galaApi";

interface Tier {
  id: string;
  name: string;
  min_coins: number;
  color: string;
  sort_order: number;
  use_validity_days: number;
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
  item_duration_days: number;
  count: number;
  status: string;
  used_at: string | null;
  used_for_uuid: string | null;
  use_expires_at: string | null;
  item_expires_at: string | null;
  created_at: string;
}

const REWARD_TYPE_MAP: Record<string, { label: string; icon: React.ElementType }> = {
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

const daysUntil = (dateStr: string | null) => {
  if (!dateStr) return 0;
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
};

const SupporterBenefits: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [monthlyCoins, setMonthlyCoins] = useState(0);
  const [prevMonthCoins, setPrevMonthCoins] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [giftDialog, setGiftDialog] = useState<{ open: boolean; reward: Reward | null }>({ open: false, reward: null });
  const [giftUuid, setGiftUuid] = useState("");
  const [giftUserName, setGiftUserName] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [, setApiMonthlyCharges] = useState<number | null>(null);
  const [couponTab, setCouponTab] = useState<"available" | "used" | "expired">("available");
  const [specialOffers, setSpecialOffers] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    available: true, used: false, expired: false, tiers: false, howto: false, leaderboard: false, coupons: true, offers: true,
  });

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const toggleSection = (key: string) => setExpandedSections(s => ({ ...s, [key]: !s[key] }));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel: tiers + rewards + charges + settings
      const tiersPromise = supabase.from("supporter_tiers").select("*").eq("is_active", true).order("sort_order", { ascending: true });

      const rewardsPromise = user?.uuid
        ? supabase.from("supporter_rewards").select("*").eq("uuid", user.uuid).order("created_at", { ascending: false }).limit(200)
        : Promise.resolve({ data: [] });

      const currentChargePromise = user?.uuid
        ? supabase.from("supporter_monthly_charges").select("*").eq("uuid", user.uuid).eq("month", currentMonth).maybeSingle()
        : Promise.resolve({ data: null });

      const prevChargePromise = user?.uuid
        ? supabase.from("supporter_monthly_charges").select("*").eq("uuid", user.uuid).eq("month", prevMonth).maybeSingle()
        : Promise.resolve({ data: null });

      const settingsPromise = supabase.from("supporter_settings").select("*").limit(1).single();

      const [tiersRes, rewardsRes, currentChargeRes, prevChargeRes, settingsRes] = await Promise.all([
        tiersPromise, rewardsPromise, currentChargePromise, prevChargePromise, settingsPromise,
      ]);

      setTiers((tiersRes.data || []) as any);
      setRewards((rewardsRes.data || []) as any);
      if (currentChargeRes.data) setMonthlyCoins((currentChargeRes.data as any).total_coins || 0);
      if (prevChargeRes.data) setPrevMonthCoins((prevChargeRes.data as any).total_coins || 0);

      // Load special offers from settings
      if (settingsRes.data) {
        const offers = (settingsRes.data as any).special_offers || [];
        setSpecialOffers(Array.isArray(offers) ? offers : []);
      }

      // Background: API calls for fresh data
      if (user?.uuid) {
        // Fresh monthly charges from wares-api
        galaApi.userMonthlyCharges(user.uuid, currentMonth).then(res => {
          const charges = res?.data?.total_charges || res?.total_charges || 0;
          if (charges > 0) {
            setMonthlyCoins(prev => Math.max(prev, charges));
            setApiMonthlyCharges(charges);
          }
        }).catch(() => {});

        // User diamonds (monthly_diamond_received)
        galaApi.userDiamonds(user.uuid).then(res => {
          const diamonds = res?.monthly_diamond_received || res?.data?.monthly_diamond_received || 0;
          if (diamonds > 0) setMonthlyCoins(prev => Math.max(prev, diamonds));
        }).catch(() => {});

        // Ranking among top chargers
        galaApi.getRanking(3, 2).then(res => {
          const topList = res?.data?.top || [];
          const otherList = res?.data?.other || [];
          const allRanked = [...topList, ...otherList];
          const myRank = allRanked.findIndex((u: any) => String(u.id) === String(user.uuid) || String(u.uuid) === String(user.uuid));
          if (myRank >= 0) setUserRank(myRank + 1);

          // Also use as leaderboard
          if (topList.length > 0) {
            setLeaderboard(topList.slice(0, 10).map((u: any) => ({
              name: u.name || u.nickname || `UUID ${u.id}`,
              uuid: u.id || u.uuid,
              total_coins: u.value || u.num || u.coins || 0,
            })));
          }
        }).catch(() => {});
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [user?.uuid, currentMonth, prevMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Tier calculations
  const currentTier = tiers.filter(t => monthlyCoins >= t.min_coins).pop();
  const nextTier = tiers.find(t => t.min_coins > monthlyCoins);
  const prevTier = tiers.filter(t => prevMonthCoins >= t.min_coins).pop();
  const progressToNext = nextTier
    ? Math.min(100, ((monthlyCoins - (currentTier?.min_coins || 0)) / (nextTier.min_coins - (currentTier?.min_coins || 0))) * 100)
    : 100;
  const coinsToNext = nextTier ? nextTier.min_coins - monthlyCoins : 0;
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / 86400000));

  // Categorize rewards
  const availableRewards = rewards.filter(r => r.status === "available");
  const usedRewards = rewards.filter(r => r.status === "used" || r.status === "gifted");
  const expiredRewards = rewards.filter(r => r.status === "expired");
  const prevMonthRewards = rewards.filter(r => r.month === prevMonth);

  // Use validity warning
  const useExpiryDays = availableRewards.length > 0 && availableRewards[0]?.use_expires_at
    ? daysUntil(availableRewards[0].use_expires_at)
    : null;

  // User status badge
  const getUserStatus = () => {
    if (monthlyCoins > 1000000) return { label: "داعم قوي 🔥", color: "#ffd700", bg: "rgba(255,215,0,0.12)" };
    if (monthlyCoins >= 100000) return { label: "داعم", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" };
    return { label: "جديد", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  };
  const userStatus = getUserStatus();

  const useReward = async (reward: Reward, targetUuid?: string) => {
    if (processing) return;
    const isGift = !!targetUuid;
    const uuid = targetUuid || user?.uuid;
    if (!uuid) return;

    if (reward.use_expires_at && new Date() > new Date(reward.use_expires_at)) {
      toast.error("انتهت صلاحية استخدام هذه المكافأة");
      return;
    }

    setProcessing(true);
    try {
      if (reward.type === "vip") {
        await galaApi.giveVip(uuid, reward.value, String(reward.item_duration_days));
      } else if (["frame", "entry", "necklace"].includes(reward.type)) {
        const methodMap: Record<string, (u: string, w: number) => Promise<any>> = {
          frame: galaApi.setFrame.bind(galaApi),
          entry: galaApi.setEntry.bind(galaApi),
          necklace: galaApi.setNecklace.bind(galaApi),
        };
        await methodMap[reward.type](uuid, reward.ware_id);
      } else if (reward.type === "coins" && isGift) {
        await galaApi.addDiamonds(uuid, reward.value);
      } else if (reward.type === "uuid_change") {
        navigate(`/change-id?free=true&reward_id=${reward.id}`);
        setProcessing(false);
        return;
      }

      const itemExpiresAt = reward.item_duration_days
        ? new Date(Date.now() + reward.item_duration_days * 86400000).toISOString()
        : null;

      await supabase.from("supporter_rewards").update({
        status: isGift ? "gifted" : "used",
        used_at: new Date().toISOString(),
        used_for_uuid: uuid,
        item_expires_at: itemExpiresAt,
      } as any).eq("id", reward.id);

      toast.success(isGift ? `تم إهداء المكافأة لـ ${uuid}!` : "تم تفعيل المكافأة!");
      loadData();
    } catch { toast.error("فشل التفعيل"); }
    setProcessing(false);
  };

  const lookupUser = async (uuid: string) => {
    if (!uuid.trim()) return;
    setLookingUp(true);
    setGiftUserName("");
    try {
      const data = await galaApi.awsUserInfo(uuid);
      if (data?.name || data?.data?.name) setGiftUserName(data.name || data.data?.name);
      else toast.error("UUID غير موجود");
    } catch { toast.error("فشل البحث"); }
    setLookingUp(false);
  };

  const giftReward = async () => {
    if (!giftDialog.reward || !giftUuid.trim() || processing) return;
    await useReward(giftDialog.reward, giftUuid);
    setGiftDialog({ open: false, reward: null });
    setGiftUuid("");
    setGiftUserName("");
  };

  const SectionHeader = ({ title, icon: Icon, sectionKey, count, color }: { title: string; icon: React.ElementType; sectionKey: string; count?: number; color?: string }) => (
    <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center gap-2 py-2">
      <Icon className="w-4 h-4" style={{ color: color || "hsl(var(--muted-foreground))" }} />
      <span className="text-xs font-bold text-foreground flex-1 text-right">{title}</span>
      {count !== undefined && count > 0 && (
        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white" style={{ background: "hsl(var(--destructive))" }}>{count}</span>
      )}
      {expandedSections[sectionKey] ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );

  if (loading) {
    return (
      <MobileLayout>
        <FancyLoading
          title="جاري التحميل"
          subtitle="نجلب لك مميزات الداعمين"
          tips={[
            "جاري فحص مستوى الدعم...",
            "نحضّر لك قائمة المميزات...",
            "ثواني وتظهر لك التفاصيل...",
          ]}
        />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-24" dir="rtl">
        {/* Header */}
        <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 bg-card" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors active:scale-95">
            <ArrowRight className="w-5 h-5 text-foreground" />
          </button>
          <Crown className="w-5 h-5 text-yellow-400" />
          <h1 className="text-sm font-bold text-foreground">مزايا الداعم</h1>
          {availableRewards.length > 0 && (
            <span className="mr-auto px-2 py-0.5 rounded-full text-[9px] font-bold text-white bg-emerald-500">{availableRewards.length} متاح</span>
          )}
        </div>

        <div className="px-4 py-4 space-y-4">

          {/* ═══════════ القسم 1 — معلومات المستخدم ═══════════ */}
          {user && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
              {/* User Header with gradient */}
              <div className="relative p-4 pb-3" style={{
                background: `linear-gradient(135deg, ${currentTier?.color || "hsl(var(--primary))"}15, ${currentTier?.color || "hsl(var(--primary))"}05)`,
              }}>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden" style={{ boxShadow: `0 0 0 2px ${currentTier?.color || "hsl(var(--border))"}` }}>
                      {user.profile?.image ? (
                        <img src={user.profile.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground bg-muted">
                          {(user.name || "?").charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* VIP badge */}
                    {user.level?.charger_level > 0 && (
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
                        {user.level.charger_level}
                      </div>
                    )}
                  </div>

                  {/* Name + UUID + Status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                        style={{ color: userStatus.color, background: userStatus.bg }}>
                        {userStatus.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono tabular-nums">UUID: {user.uuid}</p>
                    {user.vip && Object.keys(user.vip).length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Crown className="w-3 h-3 text-yellow-400" />
                        <span className="text-[9px] text-yellow-400 font-bold">VIP</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rank badge */}
                {userRank && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{ background: "hsl(var(--muted) / 0.8)" }}>
                    <Medal className="w-3 h-3 text-yellow-400" />
                    <span className="text-[9px] font-bold text-foreground">#{userRank}</span>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-0 divide-x divide-border" style={{ direction: "ltr" }}>
                {[
                  { v: formatCoins(monthlyCoins), l: "شحن الشهر", icon: TrendingUp, color: currentTier?.color || "hsl(var(--primary))" },
                  { v: userRank ? `#${userRank}` : "—", l: "ترتيبك", icon: Trophy, color: "#ffd700" },
                  { v: currentTier?.name || "—", l: "مستواك", icon: Star, color: currentTier?.color || "hsl(var(--muted-foreground))" },
                ].map((s, i) => (
                  <div key={i} className="text-center py-3 px-2" style={{ direction: "rtl" }}>
                    <s.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: s.color }} />
                    <p className="text-sm font-bold text-foreground tabular-nums">{s.v}</p>
                    <p className="text-[8px] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══════════ القسم 2 — إحصائياتي ═══════════ */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl p-4 bg-card" style={{ border: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-bold text-foreground">إحصائياتي</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Current month charges */}
              <div className="rounded-xl p-3" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                <p className="text-[9px] text-muted-foreground mb-1">شحن هذا الشهر</p>
                <p className="text-base font-bold text-foreground tabular-nums">{formatCoins(monthlyCoins)}</p>
                <p className="text-[8px] text-muted-foreground">${(monthlyCoins / 7500).toFixed(0)}</p>
              </div>

              {/* Previous month */}
              <div className="rounded-xl p-3" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                <p className="text-[9px] text-muted-foreground mb-1">شحن الشهر السابق</p>
                <p className="text-base font-bold text-foreground tabular-nums">{formatCoins(prevMonthCoins)}</p>
                <p className="text-[8px] text-muted-foreground">${(prevMonthCoins / 7500).toFixed(0)}</p>
              </div>

              {/* Rank */}
              <div className="rounded-xl p-3" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                <p className="text-[9px] text-muted-foreground mb-1">ترتيبك</p>
                <p className="text-base font-bold text-foreground tabular-nums">{userRank ? `#${userRank}` : "غير مصنف"}</p>
              </div>

              {/* Rewards count */}
              <div className="rounded-xl p-3" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                <p className="text-[9px] text-muted-foreground mb-1">الكوبونات</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-emerald-400 tabular-nums">{availableRewards.length}</span>
                  <span className="text-[8px] text-muted-foreground">متاح</span>
                  <span className="text-[8px] text-muted-foreground">/ {usedRewards.length} مستخدم</span>
                </div>
                {expiredRewards.length > 0 && (
                  <p className="text-[8px] text-destructive mt-0.5">{expiredRewards.length} منتهي</p>
                )}
              </div>
            </div>

            {/* Total rewards summary */}
            <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "hsl(var(--primary) / 0.06)" }}>
              <span className="text-[10px] text-muted-foreground">إجمالي المكافآت</span>
              <span className="text-xs font-bold text-foreground tabular-nums">{rewards.length} مكافأة</span>
            </div>
          </motion.div>

          {/* ═══════════ القسم 3 — التقدم نحو الهدف 🔥 ═══════════ */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-4" style={{
              background: currentTier ? `linear-gradient(135deg, ${currentTier.color}12, ${currentTier.color}06)` : "hsl(var(--card))",
              border: `1px solid ${currentTier?.color || "hsl(var(--border))"}25`,
            }}>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4" style={{ color: currentTier?.color || "hsl(var(--primary))" }} />
              <h2 className="text-xs font-bold text-foreground">التقدم نحو الهدف 🔥</h2>
              <div className="mr-auto flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">{daysRemaining} يوم متبقي</span>
              </div>
            </div>

            {/* Current level badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${currentTier?.color || "hsl(var(--muted))"}20` }}>
                <Trophy className="w-4 h-4" style={{ color: currentTier?.color || "hsl(var(--muted-foreground))" }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: currentTier?.color || "hsl(var(--muted-foreground))" }}>
                  {currentTier ? currentTier.name : "لم تصل لأي مستوى بعد"}
                </p>
                <p className="text-[9px] text-muted-foreground tabular-nums">{formatCoins(monthlyCoins)} كوينز</p>
              </div>
            </div>

            {/* Progress bar to next tier */}
            {nextTier && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">التالي: <span className="font-bold" style={{ color: nextTier.color }}>{nextTier.name}</span></span>
                  <span className="font-bold tabular-nums" style={{ color: nextTier.color }}>{Math.round(progressToNext)}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden bg-muted relative">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progressToNext}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full relative"
                    style={{ background: `linear-gradient(90deg, ${currentTier?.color || "#666"}, ${nextTier.color})` }}>
                    {/* Shimmer on progress */}
                    <div className="absolute inset-0 opacity-30" style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                      animation: "shimmer 2s infinite",
                    }} />
                  </motion.div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">تبقى لك <span className="font-bold text-foreground tabular-nums">{formatCoins(coinsToNext)}</span> كوينز</span>
                </div>

                {/* Next tier reward preview */}
                {nextTier.rewards && nextTier.rewards.length > 0 && (
                  <div className="mt-2 px-3 py-2 rounded-xl" style={{ background: `${nextTier.color}08`, border: `1px solid ${nextTier.color}15` }}>
                    <p className="text-[9px] text-muted-foreground mb-1">مكافأة المستوى التالي:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {nextTier.rewards.map((r: any, i: number) => {
                        const info = REWARD_TYPE_MAP[r.type];
                        const Icon = info?.icon || Gift;
                        return (
                          <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: `${nextTier.color}12` }}>
                            <Icon className="w-3 h-3" style={{ color: nextTier.color }} />
                            <span className="text-[8px] font-bold" style={{ color: nextTier.color }}>
                              {info?.label || r.type}
                              {r.type === "vip" ? ` ${r.value}` : ""}
                              {r.item_duration_days ? ` ${r.item_duration_days}d` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!nextTier && currentTier && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400">وصلت لأعلى مستوى! 🎉</span>
              </div>
            )}

            {/* All tiers milestones */}
            <div className="mt-3 space-y-1.5">
              {tiers.map((t, idx) => {
                const reached = monthlyCoins >= t.min_coins;
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: reached ? t.color : "hsl(var(--muted))",
                        opacity: reached ? 1 : 0.4,
                      }}>
                      {reached ? <Check className="w-3 h-3 text-white" /> : <span className="text-[8px] text-muted-foreground">{idx + 1}</span>}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${reached ? "" : "opacity-50"}`} style={{ color: reached ? t.color : "hsl(var(--muted-foreground))" }}>
                        {t.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground tabular-nums">{formatCoins(t.min_coins)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ═══════════ القسم 4 — مكافآت الشهر السابق ═══════════ */}
          {prevMonthCoins > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl p-4 bg-card" style={{ border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4 text-yellow-400" />
                <h2 className="text-xs font-bold text-foreground">مكافآت الشهر السابق ({prevMonth})</h2>
              </div>

              {/* Previous tier info */}
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl" style={{ background: `${prevTier?.color || "#666"}08` }}>
                <Trophy className="w-4 h-4" style={{ color: prevTier?.color || "hsl(var(--muted-foreground))" }} />
                <div>
                  <p className="text-[10px] font-bold" style={{ color: prevTier?.color }}>المستوى: {prevTier?.name || "لم تصل"}</p>
                  <p className="text-[9px] text-muted-foreground tabular-nums">{formatCoins(prevMonthCoins)} كوينز — ${(prevMonthCoins / 7500).toFixed(0)}</p>
                </div>
              </div>

              {/* Rewards from prev month */}
              {prevMonthRewards.length > 0 ? (
                <div className="space-y-2">
                  {prevMonthRewards.map(r => {
                    const info = REWARD_TYPE_MAP[r.type] || { label: r.type, icon: Star };
                    const Icon = info.icon;
                    const isExpiring = r.status === "available" && r.use_expires_at && daysUntil(r.use_expires_at) <= 5;
                    const expiryDays = r.use_expires_at ? daysUntil(r.use_expires_at) : null;

                    return (
                      <div key={r.id} className="rounded-xl p-3 flex items-start gap-3 relative overflow-hidden"
                        style={{
                          background: r.status === "available" ? "hsl(142 76% 36% / 0.04)" : "hsl(var(--muted) / 0.2)",
                          border: `1px solid ${r.status === "available" ? "hsl(142 76% 36% / 0.15)" : "hsl(var(--border))"}`,
                        }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{
                          background: r.status === "available" ? "hsl(142 76% 36% / 0.1)" : "hsl(var(--muted) / 0.5)",
                        }}>
                          <Icon className="w-4 h-4" style={{
                            color: r.status === "available" ? "hsl(142 76% 36%)" : "hsl(var(--muted-foreground))",
                          }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-bold text-foreground">
                              {info.label}{r.type === "vip" ? ` ${r.value}` : ""}
                            </p>
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold ${
                              r.status === "available" ? "bg-emerald-500/15 text-emerald-400" :
                              r.status === "used" || r.status === "gifted" ? "bg-blue-500/15 text-blue-400" :
                              "bg-destructive/15 text-destructive"
                            }`}>
                              {r.status === "available" ? "متاح" : r.status === "used" ? "مستخدم" : r.status === "gifted" ? "مُهدى" : "منتهي"}
                            </span>
                          </div>

                          {r.item_duration_days > 0 && (
                            <p className="text-[9px] text-muted-foreground mt-0.5">المدة بعد التفعيل: {r.item_duration_days} يوم</p>
                          )}

                          {r.status === "available" && expiryDays !== null && (
                            <p className={`text-[9px] mt-0.5 font-bold ${isExpiring ? "text-destructive" : "text-muted-foreground"}`}>
                              {isExpiring ? `⚠️ ستنتهي خلال ${expiryDays} أيام!` : `صلاحية الاستخدام: ${expiryDays} يوم`}
                            </p>
                          )}

                          {r.status === "used" && r.item_expires_at && daysUntil(r.item_expires_at) > 0 && (
                            <p className="text-[9px] text-emerald-400 mt-0.5">ينتهي العنصر خلال {daysUntil(r.item_expires_at)} يوم</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-4 text-[10px] text-muted-foreground">لا توجد مكافآت للشهر السابق</p>
              )}
            </motion.div>
          )}

          {/* ═══════════ Available Rewards ═══════════ */}
          <div>
            <SectionHeader title="مكافآتك المتاحة" icon={Gift} sectionKey="available" count={availableRewards.length} color="hsl(142 76% 36%)" />
            <AnimatePresence>
              {expandedSections.available && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2">
                  {useExpiryDays !== null && useExpiryDays <= 5 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(var(--destructive) / 0.08)", border: "1px solid hsl(var(--destructive) / 0.15)" }}>
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <p className="text-[10px] text-destructive font-bold">
                        ستنتهي صلاحية المزايا بعد {useExpiryDays} يوم — استخدمها قبل فوات الأوان!
                      </p>
                    </div>
                  )}
                  {useExpiryDays !== null && useExpiryDays > 5 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50" style={{ border: "1px solid hsl(var(--border))" }}>
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-[10px] text-muted-foreground">صلاحية الاستخدام: {useExpiryDays} يوم متبقي</p>
                    </div>
                  )}

                  {availableRewards.length === 0 ? (
                    <p className="text-center py-6 text-[10px] text-muted-foreground">لا توجد مكافآت متاحة حالياً</p>
                  ) : (
                    availableRewards.map(r => {
                      const info = REWARD_TYPE_MAP[r.type] || { label: r.type, icon: Star };
                      const Icon = info.icon;
                      const isCoinsAuto = r.type === "coins";

                      return (
                        <motion.div key={r.id} layout
                          className="rounded-xl p-3 relative overflow-hidden"
                          style={{ background: "hsl(var(--card))", border: "1px solid hsl(142 76% 36% / 0.15)" }}>
                          <div className="absolute inset-0 opacity-[0.03]" style={{
                            background: "linear-gradient(90deg, transparent, hsl(142 76% 36% / 0.3), transparent)",
                            animation: "shimmer 3s infinite",
                          }} />
                          <div className="relative flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(142 76% 36% / 0.1)" }}>
                              <Icon className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground">
                                {info.label}{r.type === "vip" ? ` ${r.value}` : ""}{r.count > 1 ? ` (${r.count} متاح)` : ""}
                              </p>
                              {r.item_duration_days && !isCoinsAuto && (
                                <p className="text-[9px] text-muted-foreground mt-0.5">المدة بعد التفعيل: {r.item_duration_days} يوم</p>
                              )}
                              {r.use_expires_at && (
                                <p className="text-[9px] text-muted-foreground">صلاحية الاستخدام: {daysUntil(r.use_expires_at)} يوم متبقي</p>
                              )}

                              {isCoinsAuto ? (
                                <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-[9px] font-bold text-emerald-400">نزلت بحسابك تلقائياً!</span>
                                </div>
                              ) : (
                                <div className="mt-2 flex gap-2">
                                  <button onClick={() => useReward(r)} disabled={processing}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 text-emerald-400"
                                    style={{ background: "hsl(142 76% 36% / 0.1)", border: "1px solid hsl(142 76% 36% / 0.15)" }}>
                                    <Check className="w-3 h-3" /> استخدم لنفسي
                                  </button>
                                  {r.type !== "uuid_change" && (
                                    <button onClick={() => { setGiftDialog({ open: true, reward: r }); setGiftUuid(""); setGiftUserName(""); }}
                                      disabled={processing}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 text-blue-400"
                                      style={{ background: "hsl(217 91% 60% / 0.1)", border: "1px solid hsl(217 91% 60% / 0.15)" }}>
                                      <Send className="w-3 h-3" /> إهداء لصديق
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Used Rewards */}
          {usedRewards.length > 0 && (
            <div>
              <SectionHeader title="مكافآت مستخدمة" icon={Check} sectionKey="used" color="hsl(var(--muted-foreground))" />
              <AnimatePresence>
                {expandedSections.used && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-2">
                    {usedRewards.map(r => {
                      const info = REWARD_TYPE_MAP[r.type] || { label: r.type, icon: Star };
                      const itemDaysLeft = r.item_expires_at ? daysUntil(r.item_expires_at) : null;
                      return (
                        <div key={r.id} className="rounded-xl p-3 flex items-start gap-3 bg-muted/30" style={{ border: "1px solid hsl(var(--border))" }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted shrink-0">
                            {r.status === "gifted" ? <Gift className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground">
                              {r.status === "gifted" ? "🎁" : "✅"} {info.label}{r.type === "vip" ? ` ${r.value}` : ""} — {r.item_duration_days || 0} يوم
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {r.status === "gifted" ? `أهديت لـ ${r.used_for_uuid}` : "استخدمت لنفسي"} — {r.used_at ? new Date(r.used_at).toLocaleDateString("ar") : ""}
                            </p>
                            {itemDaysLeft !== null && itemDaysLeft > 0 && (
                              <p className="text-[9px] text-emerald-400 mt-0.5">ينتهي خلال {itemDaysLeft} يوم</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Expired Rewards */}
          {expiredRewards.length > 0 && (
            <div>
              <SectionHeader title="مكافآت منتهية" icon={X} sectionKey="expired" color="hsl(var(--destructive))" />
              <AnimatePresence>
                {expandedSections.expired && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-2">
                    {expiredRewards.map(r => {
                      const info = REWARD_TYPE_MAP[r.type] || { label: r.type, icon: Star };
                      return (
                        <div key={r.id} className="rounded-xl p-3 flex items-center gap-3 opacity-50" style={{ background: "hsl(var(--destructive) / 0.04)", border: "1px solid hsl(var(--destructive) / 0.1)" }}>
                          <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground">{info.label} — لم يُستخدم</p>
                            <p className="text-[8px] text-muted-foreground">{r.month}</p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Tiers Table */}
          <div>
            <SectionHeader title="جدول المستويات" icon={Star} sectionKey="tiers" />
            <AnimatePresence>
              {expandedSections.tiers && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
                    <div className="grid grid-cols-3 gap-2 px-3 py-2 text-[9px] font-bold text-muted-foreground bg-muted/30">
                      <span>المستوى</span><span>الحد الأدنى</span><span>المكافآت</span>
                    </div>
                    {tiers.map(t => {
                      const isCurrentLevel = currentTier?.id === t.id;
                      return (
                        <div key={t.id} className="grid grid-cols-3 gap-2 px-3 py-2.5 text-[10px]"
                          style={{ borderTop: "1px solid hsl(var(--border))", background: isCurrentLevel ? `${t.color}08` : "transparent" }}>
                          <span className="font-bold flex items-center gap-1" style={{ color: t.color }}>
                            {isCurrentLevel && <ArrowUp className="w-3 h-3" />}{t.name}
                          </span>
                          <span className="text-foreground tabular-nums">{formatCoins(t.min_coins)}</span>
                          <span className="text-muted-foreground truncate text-[8px]">
                            {(t.rewards || []).map((r: any) => REWARD_TYPE_MAP[r.type]?.label || r.type).join(" + ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* How it works */}
          <div>
            <SectionHeader title="كيف يعمل النظام؟" icon={AlertTriangle} sectionKey="howto" />
            <AnimatePresence>
              {expandedSections.howto && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="rounded-xl p-3 space-y-2 bg-muted/20" style={{ border: "1px solid hsl(var(--border))" }}>
                    {[
                      "شحناتك تتجمع تلقائي كل شهر",
                      "أول يوم من الشهر الجديد تنزل مكافآتك",
                      "كل مكافأة لها صلاحيتين:\n  1. صلاحية الاستخدام — لازم تستخدمها خلالها\n  2. صلاحية العنصر — مدة العنصر بعد التفعيل",
                      "الكوينزات تنزل بحسابك فوري تلقائياً",
                      "باقي المكافآت تختار: لنفسك أو إهداء",
                      "المكافآت غير المستخدمة تُحذف بعد انتهاء الصلاحية",
                    ].map((t, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">• {t}</p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Leaderboard */}
          <div>
            <SectionHeader title="أعلى 10 داعمين هالشهر" icon={Users} sectionKey="leaderboard" />
            <AnimatePresence>
              {expandedSections.leaderboard && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
                    {leaderboard.length === 0 ? (
                      <p className="text-center py-6 text-[10px] text-muted-foreground">لا توجد بيانات</p>
                    ) : (
                      leaderboard.map((u: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2" style={{ borderTop: i > 0 ? "1px solid hsl(var(--border))" : "none" }}>
                          <span className="text-[10px] font-bold text-muted-foreground w-5 tabular-nums">{i + 1}.</span>
                          <span className="text-[10px] text-foreground flex-1 truncate">{u.name || u.uuid}</span>
                          <span className="text-[10px] font-bold text-foreground tabular-nums">{formatCoins(u.total_coins || u.coins || 0)}</span>
                          {i === 0 && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Gift Dialog */}
        <Dialog open={giftDialog.open} onOpenChange={(o) => !o && setGiftDialog({ open: false, reward: null })}>
          <DialogContent className="max-w-xs p-5 rounded-2xl bg-card border-border" dir="rtl">
            <h3 className="text-sm font-bold text-foreground mb-3">
              إهداء: {giftDialog.reward && REWARD_TYPE_MAP[giftDialog.reward.type]?.label}
              {giftDialog.reward?.type === "vip" ? ` ${giftDialog.reward.value}` : ""}
              {giftDialog.reward?.item_duration_days ? ` (${giftDialog.reward.item_duration_days} يوم)` : ""}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">UUID المستلم</label>
                <div className="flex gap-2">
                  <input value={giftUuid} onChange={e => setGiftUuid(e.target.value)} placeholder="UUID..."
                    className="flex-1 py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none" dir="ltr" />
                  <button onClick={() => lookupUser(giftUuid)} disabled={lookingUp}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground active:scale-95">
                    {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {giftUserName && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-bold">{giftUserName} (UUID: {giftUuid})</span>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={giftReward} disabled={!giftUserName || processing}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground disabled:opacity-50 active:scale-95">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تأكيد الإهداء"}
                </button>
                <button onClick={() => setGiftDialog({ open: false, reward: null })}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground active:scale-95">إلغاء</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </MobileLayout>
  );
};

export default SupporterBenefits;
