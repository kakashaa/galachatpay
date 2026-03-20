import React, { useState, useEffect, useCallback } from "react";
import {
  Crown, Gift, Users, Settings, Star, Trash2, Plus, Save, Clock, Check, X,
  Edit2, Loader2, Search, Frame, Sparkles, Gem, Coins, UserCheck, Image,
  BadgeCheck, Trophy, BarChart3, AlertTriangle
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

const AdminSupporterClubPage: React.FC = () => {
  const [tab, setTab] = useState<"tiers" | "supporters" | "rewards" | "reports" | "settings">("tiers");
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
    if (tab === "supporters") {
      supabase.from("supporter_monthly_charges").select("*").eq("month", currentMonth).order("total_coins", { ascending: false }).limit(500)
        .then(({ data }) => setSupporters((data || []) as any));
    } else if (tab === "rewards" || tab === "reports") {
      supabase.from("supporter_rewards").select("*").order("created_at", { ascending: false }).limit(500)
        .then(({ data }) => setRewards((data || []) as any));
    }
  }, [tab, currentMonth]);

  const saveTier = async () => {
    if (!editTier) return;
    setSaving(true);
    try {
      const payload = {
        name: editTier.name,
        min_coins: editTier.min_coins,
        color: editTier.color,
        sort_order: editTier.sort_order,
        use_validity_days: editTier.use_validity_days || 15,
        rewards: editTier.rewards as any,
        is_active: editTier.is_active,
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
      is_active: settings.is_active,
      default_use_validity_days: settings.default_use_validity_days,
      distribution_mode: settings.distribution_mode,
      coins_mode: settings.coins_mode,
      notify_user: settings.notify_user,
      notify_admin: settings.notify_admin,
      notify_whatsapp: settings.notify_whatsapp,
      reminder_days_before: settings.reminder_days_before,
      special_offers: settings.special_offers as any,
      updated_at: new Date().toISOString(),
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

  const tabs = [
    { key: "tiers", label: "المستويات", icon: Star },
    { key: "supporters", label: "الداعمين", icon: Users },
    { key: "rewards", label: "المكافآت", icon: Gift },
    { key: "reports", label: "التقارير", icon: BarChart3 },
    { key: "settings", label: "الإعدادات", icon: Settings },
  ] as const;

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
    ? Math.round(((reportStats.rewardStats.used + reportStats.rewardStats.gifted) / reportStats.rewardStats.total) * 100)
    : 0;

  return (
    <AdminPageLayout title="نادي الداعم">
      <div className="px-4 py-3 space-y-4" dir="rtl">
        {/* Tabs */}
        <div className="flex gap-0.5 p-1 rounded-xl bg-muted/30 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-shrink-0 flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-[9px] font-bold transition-all ${tab === t.key ? "text-foreground bg-card shadow-sm" : "text-muted-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />
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
                          {r.type === "vip" && ` ${r.value}`}
                          {r.item_duration_days ? ` (${r.item_duration_days}d)` : ""}
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

            {/* ===== REPORTS ===== */}
            {tab === "reports" && (
              <div className="space-y-3">
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
                        <span className="text-[9px] text-muted-foreground tabular-nums w-6">{t.count}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl p-3 bg-card border border-border space-y-2">
                  <p className="text-xs font-bold text-foreground">نسبة الاستخدام</p>
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
              </div>
            )}

            {/* ===== SETTINGS ===== */}
            {tab === "settings" && settings && (
              <div className="space-y-4">
                <div className="rounded-xl p-4 space-y-4 bg-card border border-border">
                  {/* Active */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">تفعيل النظام</span>
                    <button onClick={() => setSettings({ ...settings, is_active: !settings.is_active })}
                      className={`w-10 h-5 rounded-full transition-all ${settings.is_active ? "bg-emerald-500" : "bg-muted"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* Distribution mode */}
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

                  {/* Use validity */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground">صلاحية الاستخدام الافتراضية (أيام)</span>
                    <input type="number" value={settings.default_use_validity_days}
                      onChange={e => setSettings({ ...settings, default_use_validity_days: Number(e.target.value) })}
                      className="w-16 py-1.5 px-2 rounded-lg text-xs text-center bg-muted border border-border text-foreground focus:outline-none" />
                  </div>

                  {/* Coins mode */}
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

                  {/* Notifications */}
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

                  {/* Reminder days */}
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
      </div>
    </AdminPageLayout>
  );
};

export default AdminSupporterClubPage;
