import React, { useState, useEffect, useCallback } from "react";
import {
  Crown, Gift, Users, Settings, Star, Trash2, Plus, Save, Clock, Check, X,
  Edit2, Loader2, Search, Frame, Sparkles, Gem, Coins, UserCheck, Image,
  BadgeCheck, Trophy, BarChart3, Ticket, Zap, Target, Bell, Send, Flag,
  TrendingUp, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

interface SettingsData {
  id: string;
  is_active: boolean;
  default_use_validity_days: number;
  distribution_mode: string;
  coins_mode: string;
  notify_user: boolean;
  notify_admin: boolean;
  notify_whatsapp: boolean;
  reminder_days_before: number;
  special_offers: any[];
}

const REWARD_TYPES = [
  { type: "vip", label: "VIP", icon: Crown },
  { type: "frame", label: "إطار", icon: Frame },
  { type: "entry", label: "دخولية", icon: Sparkles },
  { type: "necklace", label: "قلادة", icon: Gem },
  { type: "coins", label: "كوينز", icon: Coins },
  { type: "uuid_change", label: "تغيير UUID", icon: UserCheck },
  { type: "animated_photo", label: "صورة متحركة", icon: Image },
  { type: "custom_gift", label: "هدية مخصصة", icon: Gift },
  { type: "badge", label: "شارة", icon: BadgeCheck },
];

const TIER_COLORS = [
  { value: "#cd7f32", label: "برونزي" },
  { value: "#c0c0c0", label: "فضي" },
  { value: "#ffd700", label: "ذهبي" },
  { value: "#00bfff", label: "ماسي" },
  { value: "#9b59b6", label: "بنفسجي" },
  { value: "#e74c3c", label: "أحمر" },
  { value: "#2ecc71", label: "أخضر" },
];

const formatCoins = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
};

type TabKey = "tiers" | "supporters" | "rewards" | "coupons" | "offers" | "challenges" | "notifications" | "analytics" | "settings";

const AdminSupporterClubPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("tiers");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editTier, setEditTier] = useState<Tier | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [supporters, setSupporters] = useState<any[]>([]);
  const [searchUuid, setSearchUuid] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [saving, setSaving] = useState(false);

  // New tab states
  const [challenges, setChallenges] = useState<any[]>([]);
  const [challengeDialog, setChallengeDialog] = useState(false);
  const [editChallenge, setEditChallenge] = useState<any>(null);
  const [challengeProgress, setChallengeProgress] = useState<any[]>([]);
  const [offerDialog, setOfferDialog] = useState(false);
  const [editOffer, setEditOffer] = useState<any>(null);
  const [notifTarget, setNotifTarget] = useState<"all" | "uuid">("all");
  const [notifUuid, setNotifUuid] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");

  const currentMonth = new Date().toISOString().slice(0, 7);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tiersRes, settingsRes] = await Promise.all([
      supabase.from("supporter_tiers").select("*").order("sort_order", { ascending: true }),
      supabase.from("supporter_settings").select("*").limit(1).single(),
    ]);
    setTiers((tiersRes.data || []) as any);
    setSettings((settingsRes.data || null) as any);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (tab === "supporters" || tab === "analytics") {
      supabase.from("supporter_monthly_charges").select("*").eq("month", currentMonth).order("total_coins", { ascending: false }).limit(500)
        .then(({ data }) => setSupporters((data || []) as any));
    }
    if (tab === "rewards" || tab === "analytics" || tab === "coupons") {
      supabase.from("supporter_rewards").select("*").order("created_at", { ascending: false }).limit(500)
        .then(({ data }) => setRewards((data || []) as any));
    }
    if (tab === "challenges") {
      Promise.all([
        supabase.from("supporter_challenges").select("*").order("created_at", { ascending: false }),
        supabase.from("supporter_challenge_progress").select("*").limit(500),
      ]).then(([chRes, progRes]) => {
        setChallenges((chRes.data || []) as any);
        setChallengeProgress((progRes.data || []) as any);
      });
    }
  }, [tab, currentMonth]);

  // === Tier CRUD ===
  const saveTier = async () => {
    if (!editTier) return;
    setSaving(true);
    try {
      const payload = {
        name: editTier.name, min_coins: editTier.min_coins, color: editTier.color,
        sort_order: editTier.sort_order, use_validity_days: editTier.use_validity_days || 15,
        rewards: editTier.rewards as any, is_active: editTier.is_active,
      };
      if (editTier.id && editTier.id !== "new") {
        await supabase.from("supporter_tiers").update(payload as any).eq("id", editTier.id);
      } else {
        await supabase.from("supporter_tiers").insert({ ...payload, sort_order: tiers.length + 1 } as any);
      }
      toast.success("تم الحفظ");
      setEditDialog(false);
      loadData();
    } catch { toast.error("فشل الحفظ"); }
    setSaving(false);
  };

  const deleteTier = async (id: string) => {
    if (!confirm("حذف هذا المستوى؟")) return;
    await supabase.from("supporter_tiers").delete().eq("id", id);
    toast.success("تم الحذف");
    loadData();
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    await supabase.from("supporter_settings").update({
      is_active: settings.is_active, default_use_validity_days: settings.default_use_validity_days,
      distribution_mode: settings.distribution_mode, coins_mode: settings.coins_mode,
      notify_user: settings.notify_user, notify_admin: settings.notify_admin,
      notify_whatsapp: settings.notify_whatsapp, reminder_days_before: settings.reminder_days_before,
      special_offers: settings.special_offers as any, updated_at: new Date().toISOString(),
    } as any).eq("id", settings.id);
    toast.success("تم حفظ الإعدادات");
    setSaving(false);
  };

  const toggleReward = (type: string, enabled: boolean) => {
    if (!editTier) return;
    let rews = [...(editTier.rewards || [])];
    if (enabled) {
      if (!rews.find(r => r.type === type)) rews.push({ type, value: 0, ware_id: 0, item_duration_days: 7, count: 1 });
    } else {
      rews = rews.filter(r => r.type !== type);
    }
    setEditTier({ ...editTier, rewards: rews });
  };

  const updateRewardField = (type: string, field: string, value: any) => {
    if (!editTier) return;
    setEditTier({
      ...editTier,
      rewards: editTier.rewards.map((r: any) => r.type === type ? { ...r, [field]: Number(value) || value } : r),
    });
  };

  // === Challenge CRUD ===
  const saveChallenge = async () => {
    if (!editChallenge) return;
    setSaving(true);
    try {
      const payload = {
        title: editChallenge.title, description: editChallenge.description || "",
        target_amount: Number(editChallenge.target_amount) || 0,
        reward_type: editChallenge.reward_type || "coins",
        reward_value: Number(editChallenge.reward_value) || 0,
        reward_description: editChallenge.reward_description || "",
        duration_days: Number(editChallenge.duration_days) || 7,
        is_active: editChallenge.is_active !== false,
        challenge_type: editChallenge.challenge_type || "single",
        color: editChallenge.color || "#8b5cf6",
      };
      if (editChallenge.id && editChallenge.id !== "new") {
        await supabase.from("supporter_challenges").update(payload as any).eq("id", editChallenge.id);
      } else {
        await supabase.from("supporter_challenges").insert(payload as any);
      }
      toast.success("تم الحفظ");
      setChallengeDialog(false);
      // Reload
      const { data } = await supabase.from("supporter_challenges").select("*").order("created_at", { ascending: false });
      setChallenges((data || []) as any);
    } catch { toast.error("فشل الحفظ"); }
    setSaving(false);
  };

  // === Offer CRUD ===
  const saveOffer = async () => {
    if (!editOffer || !settings) return;
    setSaving(true);
    const offers = [...(settings.special_offers || [])];
    if (editOffer._index !== undefined) {
      offers[editOffer._index] = { ...editOffer, _index: undefined };
    } else {
      offers.push({ ...editOffer, _index: undefined });
    }
    await supabase.from("supporter_settings").update({ special_offers: offers as any, updated_at: new Date().toISOString() } as any).eq("id", settings.id);
    setSettings({ ...settings, special_offers: offers });
    toast.success("تم الحفظ");
    setOfferDialog(false);
    setSaving(false);
  };

  const deleteOffer = async (idx: number) => {
    if (!settings) return;
    const offers = [...(settings.special_offers || [])];
    offers.splice(idx, 1);
    await supabase.from("supporter_settings").update({ special_offers: offers as any } as any).eq("id", settings.id);
    setSettings({ ...settings, special_offers: offers });
    toast.success("تم الحذف");
  };

  // === Send Notification ===
  const sendNotification = async () => {
    if (!notifTitle || !notifBody) { toast.error("أكمل البيانات"); return; }
    setSaving(true);
    try {
      if (notifTarget === "uuid" && notifUuid) {
        await supabase.from("notifications").insert({ user_uuid: notifUuid, title: notifTitle, body: notifBody, type: "supporter_club" } as any);
        toast.success(`تم إرسال الإشعار لـ ${notifUuid}`);
      } else {
        // Send to all supporters this month
        const uuids = supporters.map(s => s.uuid).filter(Boolean);
        if (uuids.length === 0) { toast.error("لا يوجد داعمين"); setSaving(false); return; }
        const batch = uuids.map(uuid => ({ user_uuid: uuid, title: notifTitle, body: notifBody, type: "supporter_club" }));
        await supabase.from("notifications").insert(batch as any);
        toast.success(`تم إرسال ${batch.length} إشعار`);
      }
      setNotifTitle("");
      setNotifBody("");
      setNotifUuid("");
    } catch { toast.error("فشل الإرسال"); }
    setSaving(false);
  };

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "tiers", label: "المستويات", icon: Star },
    { key: "supporters", label: "الداعمين", icon: Users },
    { key: "rewards", label: "المكافآت", icon: Gift },
    { key: "coupons", label: "كوبونات", icon: Ticket },
    { key: "offers", label: "العروض", icon: Zap },
    { key: "challenges", label: "التحديات", icon: Target },
    { key: "notifications", label: "إشعارات", icon: Bell },
    { key: "analytics", label: "تحليلات", icon: BarChart3 },
    { key: "settings", label: "الإعدادات", icon: Settings },
  ];

  const filteredSupporters = supporters.filter(s => {
    if (searchUuid && !String(s.uuid).includes(searchUuid)) return false;
    if (filterTier !== "all" && s.tier_name !== filterTier) return false;
    return true;
  });

  const filteredRewards = rewards.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  // Reports stats
  const reportStats = {
    totalCoins: supporters.reduce((a, s) => a + (s.total_coins || 0), 0),
    totalSupporters: supporters.length,
    tierDistribution: tiers.map(t => ({
      name: t.name, color: t.color,
      count: supporters.filter(s => {
        const matched = tiers.filter(tr => s.total_coins >= tr.min_coins).pop();
        return matched?.id === t.id;
      }).length,
    })),
    rewardStats: {
      total: rewards.length,
      used: rewards.filter(r => r.status === "used").length,
      gifted: rewards.filter(r => r.status === "gifted").length,
      expired: rewards.filter(r => r.status === "expired").length,
      available: rewards.filter(r => r.status === "available").length,
    },
  };
  const usageRate = reportStats.rewardStats.total > 0
    ? Math.round(((reportStats.rewardStats.used + reportStats.rewardStats.gifted) / reportStats.rewardStats.total) * 100) : 0;

  // Top supporters for analytics
  const topSupporters = [...supporters].sort((a, b) => (b.total_coins || 0) - (a.total_coins || 0)).slice(0, 10);

  // Active vs idle
  const activeCount = supporters.filter(s => (s.total_coins || 0) >= 100000).length;
  const idleCount = supporters.length - activeCount;

  return (
    <AdminPageLayout title="نادي الداعم">
      <div className="px-4 py-3 space-y-4" dir="rtl">
        {/* Tabs - scrollable */}
        <div className="flex gap-0.5 p-1 rounded-xl bg-muted/30 overflow-x-auto no-scrollbar">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-shrink-0 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[8px] font-bold transition-all whitespace-nowrap ${tab === t.key ? "text-foreground bg-card shadow-sm" : "text-muted-foreground"}`}>
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* ===== TIERS ===== */}
            {tab === "tiers" && (
              <div className="space-y-2">
                {tiers.map(tier => (
                  <div key={tier.id} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: `${tier.color}08`, border: `1px solid ${tier.color}20` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${tier.color}20` }}>
                      <Trophy className="w-4 h-4" style={{ color: tier.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: tier.color }}>{tier.name}</p>
                      <p className="text-[9px] text-muted-foreground">{formatCoins(tier.min_coins)}+ كوينز — صلاحية: {tier.use_validity_days || 15} يوم</p>
                      <p className="text-[8px] text-muted-foreground mt-0.5 truncate">
                        {(tier.rewards || []).map((r: any) => {
                          const rt = REWARD_TYPES.find(t => t.type === r.type);
                          return `${rt?.label || r.type}${r.count > 1 ? `×${r.count}` : ""}${r.item_duration_days ? `(${r.item_duration_days}d)` : ""}`;
                        }).join(" + ")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditTier({ ...tier }); setEditDialog(true); }} className="p-1.5 rounded-lg hover:bg-muted/50">
                        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                      <button onClick={() => deleteTier(tier.id)} className="p-1.5 rounded-lg hover:bg-muted/50">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => {
                  setEditTier({ id: "new", name: "", min_coins: 0, color: "#cd7f32", sort_order: tiers.length + 1, use_validity_days: 15, rewards: [], is_active: true });
                  setEditDialog(true);
                }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-muted/30 border border-dashed border-border active:scale-95">
                  <Plus className="w-4 h-4 text-muted-foreground" /> إضافة مستوى جديد
                </button>
              </div>
            )}

            {/* ===== SUPPORTERS ===== */}
            {tab === "supporters" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={searchUuid} onChange={e => setSearchUuid(e.target.value)} placeholder="بحث UUID..."
                      className="w-full py-2 pr-8 pl-3 rounded-xl text-xs bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none" dir="ltr" />
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {["all", ...tiers.map(t => t.name)].map(f => (
                    <button key={f} onClick={() => setFilterTier(f)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all ${filterTier === f ? "text-foreground bg-muted" : "text-muted-foreground bg-muted/30"}`}>
                      {f === "all" ? "الكل" : f}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">الداعمين هذا الشهر ({filteredSupporters.length})</p>
                <div className="rounded-xl overflow-hidden border border-border">
                  <div className="grid grid-cols-3 gap-2 px-3 py-2 text-[9px] font-bold text-muted-foreground bg-muted/30">
                    <span>UUID</span><span>الشحن</span><span>المستوى</span>
                  </div>
                  {filteredSupporters.length === 0 ? (
                    <p className="text-center py-6 text-[10px] text-muted-foreground">لا يوجد داعمين</p>
                  ) : filteredSupporters.map((s, i) => {
                    const tier = tiers.filter(t => s.total_coins >= t.min_coins).pop();
                    return (
                      <div key={s.id || i} className="grid grid-cols-3 gap-2 px-3 py-2 text-[10px] border-t border-border">
                        <span className="text-foreground font-mono tabular-nums">{s.uuid}</span>
                        <span className="text-foreground tabular-nums">{formatCoins(s.total_coins)}</span>
                        <span style={{ color: tier?.color || "hsl(var(--muted-foreground))" }}>{tier?.name || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== REWARDS ===== */}
            {tab === "rewards" && (
              <div className="space-y-3">
                <div className="flex gap-1.5 flex-wrap">
                  {["all", "available", "used", "gifted", "expired"].map(f => (
                    <button key={f} onClick={() => setFilterStatus(f)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all ${filterStatus === f ? "text-foreground bg-muted" : "text-muted-foreground bg-muted/30"}`}>
                      {f === "all" ? "الكل" : f === "available" ? "متاح" : f === "used" ? "مستخدم" : f === "gifted" ? "مُهدى" : "منتهي"}
                    </button>
                  ))}
                </div>
                {filteredRewards.length === 0 ? (
                  <p className="text-center py-8 text-[10px] text-muted-foreground">لا توجد مكافآت</p>
                ) : filteredRewards.map(r => {
                  const typeInfo = REWARD_TYPES.find(rt => rt.type === r.type);
                  return (
                    <div key={r.id} className="rounded-xl p-3 flex items-center gap-3 bg-card border border-border">
                      {r.status === "available" && <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                      {r.status === "used" && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {r.status === "gifted" && <Gift className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      {r.status === "expired" && <X className="w-3.5 h-3.5 text-destructive/60 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-foreground">
                          <span className="font-bold">{r.uuid}</span> — {r.tier_name || ""} — {typeInfo?.label || r.type}
                          {r.type === "vip" && ` ${r.value}`}{r.item_duration_days ? ` (${r.item_duration_days}d)` : ""}
                        </p>
                        <p className="text-[8px] text-muted-foreground">
                          {r.month}
                          {r.status === "used" && ` — استخدم لـ ${r.used_for_uuid}`}
                          {r.status === "gifted" && ` — أهدى لـ ${r.used_for_uuid}`}
                          {r.status === "expired" && " — انتهت"}
                          {r.status === "available" && r.use_expires_at && ` — ينتهي: ${new Date(r.use_expires_at).toLocaleDateString("ar")}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-xl p-3 bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground">
                    إجمالي: {rewards.length} | مستخدمة: {reportStats.rewardStats.used} | مُهداة: {reportStats.rewardStats.gifted} | منتهية: {reportStats.rewardStats.expired} | متاحة: {reportStats.rewardStats.available}
                  </p>
                </div>
              </div>
            )}

            {/* ===== COUPONS (Tab 1) ===== */}
            {tab === "coupons" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5"><Ticket className="w-4 h-4 text-yellow-400" /> إدارة الكوبونات</h3>
                  <span className="text-[9px] text-muted-foreground">{rewards.length} كوبون</span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "متاح", count: reportStats.rewardStats.available, color: "#22c55e" },
                    { label: "مستخدم", count: reportStats.rewardStats.used, color: "#3b82f6" },
                    { label: "مُهدى", count: reportStats.rewardStats.gifted, color: "#8b5cf6" },
                    { label: "منتهي", count: reportStats.rewardStats.expired, color: "#ef4444" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-2.5 text-center bg-card border border-border">
                      <p className="text-sm font-bold tabular-nums" style={{ color: s.color }}>{s.count}</p>
                      <p className="text-[8px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Coupons list grouped by type */}
                {REWARD_TYPES.map(rt => {
                  const typeCoupons = rewards.filter(r => r.type === rt.type);
                  if (typeCoupons.length === 0) return null;
                  const used = typeCoupons.filter(r => r.status === "used" || r.status === "gifted").length;
                  const available = typeCoupons.filter(r => r.status === "available").length;
                  const Icon = rt.icon;
                  return (
                    <div key={rt.type} className="rounded-xl border border-border overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-foreground flex-1">{rt.label}</span>
                        <span className="text-[8px] text-muted-foreground">{available} متاح / {used} مستخدم / {typeCoupons.length} إجمالي</span>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        {typeCoupons.slice(0, 20).map(r => (
                          <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 border-t border-border/50">
                            <span className={`w-1.5 h-1.5 rounded-full ${r.status === "available" ? "bg-emerald-400" : r.status === "expired" ? "bg-destructive" : "bg-muted-foreground"}`} />
                            <span className="text-[9px] font-mono text-foreground">{r.uuid}</span>
                            <span className="text-[8px] text-muted-foreground flex-1">{r.month}</span>
                            <span className={`text-[8px] font-bold ${r.status === "available" ? "text-emerald-400" : "text-muted-foreground"}`}>
                              {r.status === "available" ? "متاح" : r.status === "used" ? "مستخدم" : r.status === "gifted" ? "مُهدى" : "منتهي"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== SMART OFFERS (Tab 2) ===== */}
            {tab === "offers" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-400" /> العروض الذكية</h3>
                  <button onClick={() => {
                    setEditOffer({ title: "", description: "", reward: "", condition: "", color: "#8b5cf6", min_coins: 0, is_active: true });
                    setOfferDialog(true);
                  }} className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-primary text-primary-foreground active:scale-95">
                    <Plus className="w-3 h-3 inline ml-1" />إضافة
                  </button>
                </div>

                {(settings?.special_offers || []).length === 0 ? (
                  <div className="rounded-xl p-8 text-center border border-dashed border-border">
                    <Zap className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-[10px] text-muted-foreground">لا توجد عروض — أضف عرضاً ذكياً</p>
                  </div>
                ) : (
                  (settings?.special_offers || []).map((offer: any, idx: number) => (
                    <div key={idx} className="rounded-xl p-3 bg-card border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${offer.color || "#8b5cf6"}15` }}>
                          <Zap className="w-4 h-4" style={{ color: offer.color || "#8b5cf6" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-foreground">{offer.title || "عرض"}</p>
                          <p className="text-[9px] text-muted-foreground">{offer.description || "—"}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[7px] font-bold bg-primary/10 text-primary">🎁 {offer.reward || "—"}</span>
                            {offer.condition && <span className="text-[7px] text-muted-foreground">📋 {offer.condition}</span>}
                            {offer.min_coins > 0 && <span className="text-[7px] text-muted-foreground">شرط: {formatCoins(offer.min_coins)}+</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditOffer({ ...offer, _index: idx }); setOfferDialog(true); }} className="p-1 rounded hover:bg-muted/50">
                            <Edit2 className="w-3 h-3 text-blue-400" />
                          </button>
                          <button onClick={() => deleteOffer(idx)} className="p-1 rounded hover:bg-muted/50">
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ===== CHALLENGES (Tab 3) ===== */}
            {tab === "challenges" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5"><Target className="w-4 h-4 text-purple-400" /> إدارة التحديات</h3>
                  <button onClick={() => {
                    setEditChallenge({ id: "new", title: "", description: "", target_amount: 1000000, reward_type: "coins", reward_value: 50000, reward_description: "", duration_days: 7, is_active: true, challenge_type: "single", color: "#8b5cf6" });
                    setChallengeDialog(true);
                  }} className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-primary text-primary-foreground active:scale-95">
                    <Plus className="w-3 h-3 inline ml-1" />إضافة
                  </button>
                </div>

                {challenges.length === 0 ? (
                  <div className="rounded-xl p-8 text-center border border-dashed border-border">
                    <Flag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-[10px] text-muted-foreground">لا توجد تحديات</p>
                  </div>
                ) : (
                  challenges.map((ch: any) => {
                    const progCount = challengeProgress.filter((p: any) => p.challenge_id === ch.id).length;
                    const completedCount = challengeProgress.filter((p: any) => p.challenge_id === ch.id && p.status === "completed").length;
                    return (
                      <div key={ch.id} className="rounded-xl p-3 bg-card border border-border">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${ch.color || "#8b5cf6"}15` }}>
                            <Target className="w-4 h-4" style={{ color: ch.color || "#8b5cf6" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[11px] font-bold text-foreground">{ch.title}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold ${ch.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"}`}>
                                {ch.is_active ? "نشط" : "معطّل"}
                              </span>
                            </div>
                            {ch.description && <p className="text-[9px] text-muted-foreground mb-1">{ch.description}</p>}
                            <div className="flex items-center gap-3 text-[8px] text-muted-foreground flex-wrap">
                              <span>🎯 {formatCoins(ch.target_amount)} كوينز</span>
                              <span>⏱️ {ch.duration_days} يوم</span>
                              <span>🎁 {ch.reward_description || `${ch.reward_value} ${ch.reward_type}`}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[8px]">
                              <span className="text-blue-400 font-bold">👥 {progCount} مشارك</span>
                              <span className="text-emerald-400 font-bold">✅ {completedCount} أكمل</span>
                              {progCount > 0 && (
                                <span className="text-muted-foreground">({Math.round((completedCount / progCount) * 100)}% نسبة إكمال)</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => { setEditChallenge({ ...ch }); setChallengeDialog(true); }} className="p-1 rounded hover:bg-muted/50">
                              <Edit2 className="w-3 h-3 text-blue-400" />
                            </button>
                            <button onClick={async () => {
                              await supabase.from("supporter_challenges").update({ is_active: !ch.is_active } as any).eq("id", ch.id);
                              const { data } = await supabase.from("supporter_challenges").select("*").order("created_at", { ascending: false });
                              setChallenges((data || []) as any);
                              toast.success(ch.is_active ? "تم التعطيل" : "تم التفعيل");
                            }} className="p-1 rounded hover:bg-muted/50">
                              {ch.is_active ? <X className="w-3 h-3 text-destructive" /> : <Check className="w-3 h-3 text-emerald-400" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ===== NOTIFICATIONS (Tab 4) ===== */}
            {tab === "notifications" && (
              <div className="space-y-4">
                <div className="rounded-xl p-4 bg-card border border-border space-y-3">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5"><Bell className="w-4 h-4 text-yellow-400" /> إرسال إشعار</h3>

                  <div className="flex gap-2">
                    {[{ v: "all" as const, l: "لجميع الداعمين" }, { v: "uuid" as const, l: "UUID محدد" }].map(o => (
                      <button key={o.v} onClick={() => setNotifTarget(o.v)}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-bold transition-all ${notifTarget === o.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>

                  {notifTarget === "uuid" && (
                    <input value={notifUuid} onChange={e => setNotifUuid(e.target.value)} placeholder="UUID المستهدف..."
                      className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none" dir="ltr" />
                  )}

                  <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="عنوان الإشعار..."
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none" />

                  <textarea value={notifBody} onChange={e => setNotifBody(e.target.value)} placeholder="نص الإشعار..."
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none resize-none h-20" />

                  <button onClick={sendNotification} disabled={saving || !notifTitle || !notifBody}
                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-primary text-primary-foreground disabled:opacity-50 active:scale-95">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    إرسال{notifTarget === "all" ? ` لـ ${supporters.length} داعم` : ""}
                  </button>
                </div>

                {notifTarget === "all" && supporters.length > 0 && (
                  <div className="rounded-xl p-3 bg-muted/20 border border-border">
                    <p className="text-[10px] text-muted-foreground mb-2">سيتم الإرسال لـ {supporters.length} داعم:</p>
                    <div className="flex flex-wrap gap-1">
                      {supporters.slice(0, 20).map((s: any, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[7px] font-mono bg-muted text-foreground">{s.uuid}</span>
                      ))}
                      {supporters.length > 20 && <span className="text-[8px] text-muted-foreground">+{supporters.length - 20} آخرين</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== ANALYTICS (Tab 5) ===== */}
            {tab === "analytics" && (
              <div className="space-y-3">
                {/* Main stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-3 bg-card border border-border text-center">
                    <p className="text-lg font-bold text-foreground tabular-nums">{formatCoins(reportStats.totalCoins)}</p>
                    <p className="text-[9px] text-muted-foreground">إجمالي الشحن</p>
                  </div>
                  <div className="rounded-xl p-3 bg-card border border-border text-center">
                    <p className="text-lg font-bold text-foreground tabular-nums">{reportStats.totalSupporters}</p>
                    <p className="text-[9px] text-muted-foreground">عدد الداعمين</p>
                  </div>
                </div>

                {/* Active vs Idle */}
                <div className="rounded-xl p-3 bg-card border border-border">
                  <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /> نشطين vs خاملين</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${supporters.length > 0 ? (activeCount / supporters.length) * 100 : 0}%` }} />
                      <div className="h-full bg-muted-foreground/30" style={{ width: `${supporters.length > 0 ? (idleCount / supporters.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px]">
                    <span className="text-emerald-400 font-bold">نشط: {activeCount} ({supporters.length > 0 ? Math.round((activeCount / supporters.length) * 100) : 0}%)</span>
                    <span className="text-muted-foreground">خامل: {idleCount}</span>
                  </div>
                </div>

                {/* Tier distribution */}
                <div className="rounded-xl p-3 bg-card border border-border space-y-2">
                  <p className="text-xs font-bold text-foreground">توزيع المستويات</p>
                  {reportStats.tierDistribution.map(t => {
                    const pct = reportStats.totalSupporters > 0 ? (t.count / reportStats.totalSupporters) * 100 : 0;
                    return (
                      <div key={t.name} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold w-14" style={{ color: t.color }}>{t.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground tabular-nums w-10">{t.count} ({pct.toFixed(0)}%)</span>
                      </div>
                    );
                  })}
                </div>

                {/* Usage rate */}
                <div className="rounded-xl p-3 bg-card border border-border space-y-2">
                  <p className="text-xs font-bold text-foreground">نسبة استخدام المكافآت</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${usageRate}%` }} />
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">{usageRate}%</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><p className="text-sm font-bold text-foreground tabular-nums">{reportStats.rewardStats.used}</p><p className="text-[8px] text-muted-foreground">مستخدم</p></div>
                    <div><p className="text-sm font-bold text-blue-400 tabular-nums">{reportStats.rewardStats.gifted}</p><p className="text-[8px] text-muted-foreground">مُهدى</p></div>
                    <div><p className="text-sm font-bold text-yellow-400 tabular-nums">{reportStats.rewardStats.available}</p><p className="text-[8px] text-muted-foreground">متاح</p></div>
                    <div><p className="text-sm font-bold text-destructive tabular-nums">{reportStats.rewardStats.expired}</p><p className="text-[8px] text-muted-foreground">منتهي</p></div>
                  </div>
                </div>

                {/* Top 10 supporters */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/20 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] font-bold text-foreground">أفضل 10 داعمين</span>
                  </div>
                  {topSupporters.length === 0 ? (
                    <p className="text-center py-6 text-[10px] text-muted-foreground">لا توجد بيانات</p>
                  ) : topSupporters.map((s: any, i: number) => {
                    const tier = tiers.filter(t => s.total_coins >= t.min_coins).pop();
                    return (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 border-t border-border">
                        <span className="text-[10px] font-bold text-muted-foreground w-5 tabular-nums">{i + 1}.</span>
                        {i === 0 && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                        <span className="text-[10px] font-mono text-foreground flex-1">{s.uuid}</span>
                        <span className="text-[10px] font-bold tabular-nums" style={{ color: tier?.color || "hsl(var(--foreground))" }}>{formatCoins(s.total_coins)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Reward type breakdown */}
                <div className="rounded-xl p-3 bg-card border border-border space-y-2">
                  <p className="text-xs font-bold text-foreground">أداء المكافآت حسب النوع</p>
                  {REWARD_TYPES.map(rt => {
                    const typeRewards = rewards.filter(r => r.type === rt.type);
                    if (typeRewards.length === 0) return null;
                    const usedCount = typeRewards.filter(r => r.status === "used" || r.status === "gifted").length;
                    const rate = typeRewards.length > 0 ? Math.round((usedCount / typeRewards.length) * 100) : 0;
                    const Icon = rt.icon;
                    return (
                      <div key={rt.type} className="flex items-center gap-2">
                        <Icon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[9px] font-bold text-foreground w-16">{rt.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-[8px] text-muted-foreground tabular-nums w-16">{usedCount}/{typeRewards.length} ({rate}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== SETTINGS ===== */}
            {tab === "settings" && settings && (
              <div className="space-y-4">
                <div className="rounded-xl p-4 space-y-4 bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">تفعيل النظام</span>
                    <button onClick={() => setSettings({ ...settings, is_active: !settings.is_active })}
                      className={`w-10 h-5 rounded-full transition-all ${settings.is_active ? "bg-emerald-500" : "bg-muted"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  <div>
                    <span className="text-[11px] text-foreground block mb-1">التوزيع التلقائي</span>
                    <div className="flex gap-2">
                      {[{ v: "auto", l: "تلقائي — أول يوم من كل شهر" }, { v: "manual", l: "يدوي — المسؤول يوزّع" }].map(o => (
                        <button key={o.v} onClick={() => setSettings({ ...settings, distribution_mode: o.v })}
                          className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-bold transition-all ${settings.distribution_mode === o.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground">صلاحية الاستخدام الافتراضية (أيام)</span>
                    <input type="number" value={settings.default_use_validity_days}
                      onChange={e => setSettings({ ...settings, default_use_validity_days: Number(e.target.value) })}
                      className="w-16 py-1.5 px-2 rounded-lg text-xs text-center bg-muted border border-border text-foreground focus:outline-none" />
                  </div>

                  <div>
                    <span className="text-[11px] text-foreground block mb-1">الكوينزات تنزل</span>
                    <div className="flex gap-2">
                      {[{ v: "auto", l: "فوري تلقائياً" }, { v: "manual", l: "تنتظر الاستخدام" }].map(o => (
                        <button key={o.v} onClick={() => setSettings({ ...settings, coins_mode: o.v })}
                          className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-bold transition-all ${settings.coins_mode === o.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] text-foreground">الإشعارات</span>
                    {[
                      { key: "notify_user", label: "إشعار المستخدم عند نزول المكافآت" },
                      { key: "notify_admin", label: "إشعار المسؤول عند التوزيع" },
                      { key: "notify_whatsapp", label: "إشعار واتساب للمالك" },
                    ].map(n => (
                      <div key={n.key} className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{n.label}</span>
                        <button onClick={() => setSettings({ ...settings, [n.key]: !(settings as any)[n.key] })}
                          className={`w-8 h-4 rounded-full transition-all ${(settings as any)[n.key] ? "bg-emerald-500" : "bg-muted"}`}>
                          <div className={`w-3 h-3 rounded-full bg-white transition-transform ${(settings as any)[n.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground">تذكير قبل الانتهاء بـ (أيام)</span>
                    <input type="number" value={settings.reminder_days_before}
                      onChange={e => setSettings({ ...settings, reminder_days_before: Number(e.target.value) })}
                      className="w-16 py-1.5 px-2 rounded-lg text-xs text-center bg-muted border border-border text-foreground focus:outline-none" />
                  </div>
                </div>

                <button onClick={saveSettings} disabled={saving}
                  className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-primary text-primary-foreground active:scale-95 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ الإعدادات
                </button>
              </div>
            )}
          </>
        )}

        {/* Edit Tier Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto p-4 rounded-2xl bg-card border-border" dir="rtl">
            <h3 className="text-sm font-bold text-foreground mb-3">
              {editTier?.id === "new" ? "إضافة مستوى" : `تعديل: ${editTier?.name}`}
            </h3>
            {editTier && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">الاسم</label>
                  <input value={editTier.name} onChange={e => setEditTier({ ...editTier, name: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">الحد الأدنى (كوينز)</label>
                  <input type="number" value={editTier.min_coins} onChange={e => setEditTier({ ...editTier, min_coins: Number(e.target.value) })}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">اللون</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {TIER_COLORS.map(c => (
                      <button key={c.value} onClick={() => setEditTier({ ...editTier, color: c.value })}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${editTier.color === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ background: c.value }} title={c.label} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">صلاحية الاستخدام/الإرسال (أيام)</label>
                  <input type="number" value={editTier.use_validity_days || 15}
                    onChange={e => setEditTier({ ...editTier, use_validity_days: Number(e.target.value) })}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                  <p className="text-[8px] text-muted-foreground mt-0.5">المدة اللي المستخدم يقدر يستخدم فيها المزايا</p>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground mb-2 block">المكافآت</label>
                  <div className="space-y-2">
                    {REWARD_TYPES.map(rt => {
                      const existing = editTier.rewards.find((r: any) => r.type === rt.type);
                      const Icon = rt.icon;
                      return (
                        <div key={rt.type} className="rounded-xl p-2.5 border border-border bg-muted/20">
                          <div className="flex items-center gap-2 mb-1.5">
                            <button onClick={() => toggleReward(rt.type, !existing)}
                              className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${existing ? "bg-primary border-primary" : "border-border"}`}>
                              {existing && <Check className="w-3 h-3 text-primary-foreground" />}
                            </button>
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-foreground">{rt.label}</span>
                          </div>
                          {existing && (
                            <div className="pr-7 grid grid-cols-2 gap-2">
                              {(rt.type === "vip" || rt.type === "coins") && (
                                <div>
                                  <label className="text-[8px] text-muted-foreground">{rt.type === "vip" ? "المستوى" : "المبلغ"}</label>
                                  <input type="number" value={existing.value || 0}
                                    onChange={e => updateRewardField(rt.type, "value", e.target.value)}
                                    className="w-full py-1 px-2 rounded-lg text-[10px] bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                                </div>
                              )}
                              {["frame", "entry", "necklace", "animated_photo", "custom_gift", "badge"].includes(rt.type) && (
                                <div>
                                  <label className="text-[8px] text-muted-foreground">ware_id</label>
                                  <input type="number" value={existing.ware_id || 0}
                                    onChange={e => updateRewardField(rt.type, "ware_id", e.target.value)}
                                    className="w-full py-1 px-2 rounded-lg text-[10px] bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                                </div>
                              )}
                              {rt.type !== "coins" && rt.type !== "uuid_change" && (
                                <div>
                                  <label className="text-[8px] text-muted-foreground">مدة العنصر (أيام)</label>
                                  <input type="number" value={existing.item_duration_days || 7}
                                    onChange={e => updateRewardField(rt.type, "item_duration_days", e.target.value)}
                                    className="w-full py-1 px-2 rounded-lg text-[10px] bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                                </div>
                              )}
                              <div>
                                <label className="text-[8px] text-muted-foreground">{rt.type === "uuid_change" ? "عدد المرات" : "العدد"}</label>
                                <input type="number" value={existing.count || 1}
                                  onChange={e => updateRewardField(rt.type, "count", e.target.value)}
                                  className="w-full py-1 px-2 rounded-lg text-[10px] bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                              </div>
                              {rt.type === "coins" && (
                                <p className="col-span-2 text-[8px] text-muted-foreground">تنزل فوري تلقائياً — ما تحتاج استخدام</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={saveTier} disabled={saving || !editTier.name}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-primary text-primary-foreground disabled:opacity-50 active:scale-95">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ
                  </button>
                  <button onClick={() => setEditDialog(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground active:scale-95">إلغاء</button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Challenge Dialog */}
        <Dialog open={challengeDialog} onOpenChange={setChallengeDialog}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto p-4 rounded-2xl bg-card border-border" dir="rtl">
            <h3 className="text-sm font-bold text-foreground mb-3">
              {editChallenge?.id === "new" ? "إضافة تحدي" : "تعديل تحدي"}
            </h3>
            {editChallenge && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">العنوان</label>
                  <input value={editChallenge.title || ""} onChange={e => setEditChallenge({ ...editChallenge, title: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">الوصف</label>
                  <textarea value={editChallenge.description || ""} onChange={e => setEditChallenge({ ...editChallenge, description: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none resize-none h-16" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">الهدف (كوينز)</label>
                    <input type="number" value={editChallenge.target_amount || 0}
                      onChange={e => setEditChallenge({ ...editChallenge, target_amount: Number(e.target.value) })}
                      className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">المدة (أيام)</label>
                    <input type="number" value={editChallenge.duration_days || 7}
                      onChange={e => setEditChallenge({ ...editChallenge, duration_days: Number(e.target.value) })}
                      className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">نوع المكافأة</label>
                    <select value={editChallenge.reward_type || "coins"}
                      onChange={e => setEditChallenge({ ...editChallenge, reward_type: e.target.value })}
                      className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none">
                      {REWARD_TYPES.map(rt => <option key={rt.type} value={rt.type}>{rt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">قيمة المكافأة</label>
                    <input type="number" value={editChallenge.reward_value || 0}
                      onChange={e => setEditChallenge({ ...editChallenge, reward_value: Number(e.target.value) })}
                      className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">وصف المكافأة</label>
                  <input value={editChallenge.reward_description || ""} onChange={e => setEditChallenge({ ...editChallenge, reward_description: e.target.value })}
                    placeholder="مثال: VIP 7 أيام + 50,000 كوينز"
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">اللون</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {TIER_COLORS.map(c => (
                      <button key={c.value} onClick={() => setEditChallenge({ ...editChallenge, color: c.value })}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${editChallenge.color === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ background: c.value }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveChallenge} disabled={saving || !editChallenge.title}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-primary text-primary-foreground disabled:opacity-50 active:scale-95">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
                  </button>
                  <button onClick={() => setChallengeDialog(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground active:scale-95">إلغاء</button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Offer Dialog */}
        <Dialog open={offerDialog} onOpenChange={setOfferDialog}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto p-4 rounded-2xl bg-card border-border" dir="rtl">
            <h3 className="text-sm font-bold text-foreground mb-3">
              {editOffer?._index !== undefined ? "تعديل عرض" : "إضافة عرض ذكي"}
            </h3>
            {editOffer && (
              <div className="space-y-3">
                {/* Offer type selector */}
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">نوع العرض</label>
                  <div className="flex gap-2">
                    {[
                      { v: "charge", l: "💰 شحن كوينز", desc: "يحسب من شحنات المستخدم" },
                      { v: "receive", l: "💎 استقبال كوينز", desc: "يحسب من الكوينز المستقبلة" },
                    ].map(o => (
                      <button key={o.v} onClick={() => setEditOffer({ ...editOffer, offer_type: o.v })}
                        className={`flex-1 py-2 px-2 rounded-xl text-center transition-all ${(editOffer.offer_type || "charge") === o.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <p className="text-[10px] font-bold">{o.l}</p>
                        <p className="text-[7px] mt-0.5 opacity-70">{o.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">العنوان</label>
                  <input value={editOffer.title || ""} onChange={e => setEditOffer({ ...editOffer, title: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">الوصف</label>
                  <textarea value={editOffer.description || ""} onChange={e => setEditOffer({ ...editOffer, description: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none resize-none h-16" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">المكافأة</label>
                  <input value={editOffer.reward || ""} onChange={e => setEditOffer({ ...editOffer, reward: e.target.value })}
                    placeholder="مثال: خصم 10% أو VIP 7 أيام"
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">الشرط</label>
                  <input value={editOffer.condition || ""} onChange={e => setEditOffer({ ...editOffer, condition: e.target.value })}
                    placeholder={(editOffer.offer_type || "charge") === "receive" ? "مثال: استلم 500K كوينز" : "مثال: اشحن 500K كوينز"}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">
                    {(editOffer.offer_type || "charge") === "receive" ? "الحد الأدنى للاستقبال (كوينز)" : "الحد الأدنى للشحن (كوينز)"}
                  </label>
                  <input type="number" value={editOffer.min_coins || 0}
                    onChange={e => setEditOffer({ ...editOffer, min_coins: Number(e.target.value) })}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-muted border border-border text-foreground focus:outline-none" dir="ltr" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">اللون</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {TIER_COLORS.map(c => (
                      <button key={c.value} onClick={() => setEditOffer({ ...editOffer, color: c.value })}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${editOffer.color === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ background: c.value }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveOffer} disabled={saving || !editOffer.title}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-primary text-primary-foreground disabled:opacity-50 active:scale-95">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
                  </button>
                  <button onClick={() => setOfferDialog(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground active:scale-95">إلغاء</button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageLayout>
  );
};

export default AdminSupporterClubPage;
