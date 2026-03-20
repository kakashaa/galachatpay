import React, { useState, useEffect, useCallback } from "react";
import { Crown, Gift, Users, Settings, Star, Trash2, Plus, Save, Clock, Check, X, Edit2, Loader2, Search, Frame, Sparkles, Gem, Coins, UserCheck, Image, BadgeCheck, Trophy } from "lucide-react";
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

interface SettingsData {
  id: string;
  is_active: boolean;
  reward_validity_days: number;
  distribution_mode: string;
  notify_user: boolean;
  notify_admin: boolean;
  reminder_days: number;
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
  const [tab, setTab] = useState<"tiers" | "supporters" | "rewards" | "settings">("tiers");
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

  // Load tab-specific data
  useEffect(() => {
    if (tab === "supporters") {
      supabase.from("supporter_monthly_charges").select("*").eq("month", currentMonth).order("total_coins", { ascending: false }).limit(200)
        .then(({ data }) => setSupporters((data || []) as any));
    } else if (tab === "rewards") {
      supabase.from("supporter_rewards").select("*").order("created_at", { ascending: false }).limit(200)
        .then(({ data }) => setRewards((data || []) as any));
    }
  }, [tab, currentMonth]);

  // Save tier
  const saveTier = async () => {
    if (!editTier) return;
    setSaving(true);
    try {
      if (editTier.id && editTier.id !== "new") {
        await supabase.from("supporter_tiers").update({
          name: editTier.name,
          min_coins: editTier.min_coins,
          color: editTier.color,
          sort_order: editTier.sort_order,
          rewards: editTier.rewards as any,
          is_active: editTier.is_active,
        } as any).eq("id", editTier.id);
      } else {
        await supabase.from("supporter_tiers").insert({
          name: editTier.name,
          min_coins: editTier.min_coins,
          color: editTier.color,
          sort_order: tiers.length + 1,
          rewards: editTier.rewards as any,
        } as any);
      }
      toast.success("تم الحفظ");
      setEditDialog(false);
      loadData();
    } catch { toast.error("فشل الحفظ"); }
    setSaving(false);
  };

  // Delete tier
  const deleteTier = async (id: string) => {
    if (!confirm("حذف هذا المستوى؟")) return;
    await supabase.from("supporter_tiers").delete().eq("id", id);
    toast.success("تم الحذف");
    loadData();
  };

  // Save settings
  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    await supabase.from("supporter_settings").update({
      is_active: settings.is_active,
      reward_validity_days: settings.reward_validity_days,
      distribution_mode: settings.distribution_mode,
      notify_user: settings.notify_user,
      notify_admin: settings.notify_admin,
      reminder_days: settings.reminder_days,
      special_offers: settings.special_offers as any,
      updated_at: new Date().toISOString(),
    } as any).eq("id", settings.id);
    toast.success("تم حفظ الإعدادات");
    setSaving(false);
  };

  // Toggle reward in editTier
  const toggleReward = (type: string, enabled: boolean) => {
    if (!editTier) return;
    let rews = [...(editTier.rewards || [])];
    if (enabled) {
      if (!rews.find(r => r.type === type)) {
        rews.push({ type, value: 0, ware_id: 0, duration_days: 7, count: 1 });
      }
    } else {
      rews = rews.filter(r => r.type !== type);
    }
    setEditTier({ ...editTier, rewards: rews });
  };

  const updateRewardField = (type: string, field: string, value: any) => {
    if (!editTier) return;
    const rews = editTier.rewards.map((r: any) =>
      r.type === type ? { ...r, [field]: Number(value) || value } : r
    );
    setEditTier({ ...editTier, rewards: rews });
  };

  const tabs = [
    { key: "tiers", label: "المستويات", icon: Star },
    { key: "supporters", label: "الداعمين", icon: Users },
    { key: "rewards", label: "المكافآت", icon: Gift },
    { key: "settings", label: "الإعدادات", icon: Settings },
  ] as const;

  const filteredSupporters = supporters.filter(s => {
    if (searchUuid && !s.uuid.includes(searchUuid)) return false;
    if (filterTier !== "all" && s.tier_name !== filterTier) return false;
    return true;
  });

  const filteredRewards = rewards.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <AdminPageLayout title="نادي الداعم">
      <div className="px-4 py-3 space-y-4" dir="rtl">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all ${tab === t.key ? "text-foreground" : "text-muted-foreground"}`}
                style={tab === t.key ? { background: "hsl(0 0% 100% / 0.06)" } : {}}
              >
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
            {/* TIERS TAB */}
            {tab === "tiers" && (
              <div className="space-y-2">
                {tiers.map(tier => (
                  <div key={tier.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: `${tier.color}08`, border: `1px solid ${tier.color}20` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${tier.color}20` }}>
                      <Trophy className="w-4 h-4" style={{ color: tier.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: tier.color }}>{tier.name}</p>
                      <p className="text-[9px] text-muted-foreground">{formatCoins(tier.min_coins)}+ كوينز</p>
                      <p className="text-[8px] text-muted-foreground mt-0.5 truncate">
                        {(tier.rewards || []).map((r: any) => REWARD_TYPES.find(rt => rt.type === r.type)?.label || r.type).join(" + ")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditTier({ ...tier }); setEditDialog(true); }} className="p-1.5 rounded-lg hover:bg-white/5">
                        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                      <button onClick={() => deleteTier(tier.id)} className="p-1.5 rounded-lg hover:bg-white/5">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    setEditTier({ id: "new", name: "", min_coins: 0, color: "#cd7f32", sort_order: tiers.length + 1, rewards: [], is_active: true });
                    setEditDialog(true);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px dashed hsl(0 0% 100% / 0.1)" }}
                >
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  إضافة مستوى جديد
                </button>
              </div>
            )}

            {/* SUPPORTERS TAB */}
            {tab === "supporters" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchUuid}
                      onChange={(e) => setSearchUuid(e.target.value)}
                      placeholder="بحث UUID..."
                      className="w-full py-2 pr-8 pl-3 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                      style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.06)" }}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {["all", ...tiers.map(t => t.name)].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterTier(f)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all ${filterTier === f ? "text-foreground" : "text-muted-foreground"}`}
                      style={filterTier === f ? { background: "hsl(0 0% 100% / 0.08)" } : { background: "hsl(0 0% 100% / 0.03)" }}
                    >
                      {f === "all" ? "الكل" : f}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-muted-foreground">الداعمين هذا الشهر ({filteredSupporters.length})</p>

                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[9px] font-bold text-muted-foreground" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                    <span>UUID</span>
                    <span>الشحن</span>
                    <span>المستوى</span>
                    <span></span>
                  </div>
                  {filteredSupporters.length === 0 ? (
                    <p className="text-center py-6 text-[10px] text-muted-foreground">لا يوجد داعمين</p>
                  ) : (
                    filteredSupporters.map((s, i) => {
                      const tier = tiers.find(t => s.total_coins >= t.min_coins);
                      return (
                        <div key={s.id || i} className="grid grid-cols-4 gap-2 px-3 py-2 text-[10px]" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.04)" }}>
                          <span className="text-foreground font-mono tabular-nums">{s.uuid}</span>
                          <span className="text-foreground tabular-nums">{formatCoins(s.total_coins)}</span>
                          <span style={{ color: tier?.color || "#666" }}>{tier?.name || "—"}</span>
                          <span></span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* REWARDS TAB */}
            {tab === "rewards" && (
              <div className="space-y-3">
                <div className="flex gap-1.5">
                  {["all", "available", "used", "gifted", "expired"].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterStatus(f)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all ${filterStatus === f ? "text-foreground" : "text-muted-foreground"}`}
                      style={filterStatus === f ? { background: "hsl(0 0% 100% / 0.08)" } : { background: "hsl(0 0% 100% / 0.03)" }}
                    >
                      {f === "all" ? "الكل" : f === "available" ? "متاح" : f === "used" ? "مستخدم" : f === "gifted" ? "مُهدى" : "منتهي"}
                    </button>
                  ))}
                </div>

                {filteredRewards.length === 0 ? (
                  <p className="text-center py-8 text-[10px] text-muted-foreground">لا توجد مكافآت</p>
                ) : (
                  filteredRewards.map(r => {
                    const typeInfo = REWARD_TYPES.find(rt => rt.type === r.type);
                    return (
                      <div key={r.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                        {r.status === "available" && <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                        {r.status === "used" && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {r.status === "gifted" && <Gift className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        {r.status === "expired" && <X className="w-3.5 h-3.5 text-red-400/60 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-foreground">
                            <span className="font-bold">{r.uuid}</span> — {r.tier_name || ""} — {typeInfo?.label || r.type}
                            {r.type === "vip" && ` ${r.value}`}
                          </p>
                          <p className="text-[8px] text-muted-foreground">
                            {r.month}
                            {r.status === "used" && ` — استخدم لـ ${r.used_for}`}
                            {r.status === "gifted" && ` — أهدى لـ ${r.used_for}`}
                            {r.status === "expired" && " — انتهت"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SETTINGS TAB */}
            {tab === "settings" && settings && (
              <div className="space-y-4">
                <div className="rounded-xl p-4 space-y-4" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                  {/* Active toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">تفعيل النظام</span>
                    <button
                      onClick={() => setSettings({ ...settings, is_active: !settings.is_active })}
                      className={`w-10 h-5 rounded-full transition-all ${settings.is_active ? "bg-emerald-500" : "bg-white/10"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* Validity */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground">صلاحية المكافآت (أيام)</span>
                    <input
                      type="number"
                      value={settings.reward_validity_days}
                      onChange={(e) => setSettings({ ...settings, reward_validity_days: Number(e.target.value) })}
                      className="w-16 py-1.5 px-2 rounded-lg text-xs text-center text-foreground focus:outline-none"
                      style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
                    />
                  </div>

                  {/* Distribution mode */}
                  <div>
                    <span className="text-[11px] text-foreground block mb-2">توزيع المكافآت</span>
                    <div className="flex gap-2">
                      {[{ value: "auto", label: "تلقائي" }, { value: "manual", label: "يدوي" }].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setSettings({ ...settings, distribution_mode: opt.value })}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${settings.distribution_mode === opt.value ? "text-foreground" : "text-muted-foreground"}`}
                          style={settings.distribution_mode === opt.value ? { background: "hsl(217 91% 50% / 0.12)" } : { background: "hsl(0 0% 100% / 0.03)" }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="space-y-2">
                    <span className="text-[11px] text-foreground">الإشعارات</span>
                    {[
                      { key: "notify_user" as const, label: "إشعار المستخدم عند نزول المكافآت" },
                      { key: "notify_admin" as const, label: "إشعار المسؤول عند توزيع المكافآت" },
                    ].map(opt => (
                      <div key={opt.key} className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{opt.label}</span>
                        <button
                          onClick={() => setSettings({ ...settings, [opt.key]: !settings[opt.key] })}
                          className={`w-8 h-4 rounded-full transition-all ${settings[opt.key] ? "bg-emerald-500" : "bg-white/10"}`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-white transition-transform ${settings[opt.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Reminder */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">تذكير قبل الانتهاء (أيام)</span>
                    <input
                      type="number"
                      value={settings.reminder_days}
                      onChange={(e) => setSettings({ ...settings, reminder_days: Number(e.target.value) })}
                      className="w-14 py-1 px-2 rounded-lg text-xs text-center text-foreground focus:outline-none"
                      style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
                    />
                  </div>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: "hsl(160 84% 39% / 0.15)", color: "hsl(160 84% 50%)" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ الإعدادات
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Tier Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-[380px] max-h-[85vh] overflow-y-auto rounded-2xl p-0" style={{ background: "hsl(var(--card))", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
          {editTier && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">
                  {editTier.id === "new" ? "إضافة مستوى" : `تعديل: ${editTier.name}`}
                </p>
                <button onClick={() => setEditDialog(false)} className="p-1 rounded-lg hover:bg-white/5">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">الاسم</label>
                <input
                  value={editTier.name}
                  onChange={(e) => setEditTier({ ...editTier, name: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl text-sm text-foreground focus:outline-none"
                  style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
                />
              </div>

              {/* Min coins */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">الحد الأدنى (كوينز)</label>
                <input
                  type="number"
                  value={editTier.min_coins}
                  onChange={(e) => setEditTier({ ...editTier, min_coins: Number(e.target.value) })}
                  className="w-full py-2 px-3 rounded-xl text-sm text-foreground focus:outline-none"
                  style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
                  dir="ltr"
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">اللون</label>
                <div className="flex gap-2 flex-wrap">
                  {TIER_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setEditTier({ ...editTier, color: c.value })}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        background: c.value,
                        outline: editTier.color === c.value ? `2px solid ${c.value}` : "none",
                        outlineOffset: "2px",
                        opacity: editTier.color === c.value ? 1 : 0.5,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Rewards */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-2 block">المكافآت</label>
                <div className="space-y-2">
                  {REWARD_TYPES.map(rt => {
                    const rew = editTier.rewards.find((r: any) => r.type === rt.type);
                    const enabled = !!rew;
                    const Icon = rt.icon;
                    return (
                      <div key={rt.type} className="rounded-lg p-2.5" style={{ background: enabled ? "hsl(0 0% 100% / 0.04)" : "transparent", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <button
                            onClick={() => toggleReward(rt.type, !enabled)}
                            className={`w-4 h-4 rounded border flex items-center justify-center ${enabled ? "bg-emerald-500 border-emerald-500" : "border-white/20"}`}
                          >
                            {enabled && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[10px] font-bold text-foreground">{rt.label}</span>
                        </div>
                        {enabled && (
                          <div className="flex gap-2 mr-6 flex-wrap">
                            {(rt.type === "vip") && (
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] text-muted-foreground">مستوى:</span>
                                <input type="number" value={rew.value || 0} onChange={(e) => updateRewardField(rt.type, "value", e.target.value)}
                                  className="w-10 py-0.5 px-1 rounded text-[9px] text-center text-foreground focus:outline-none" style={{ background: "hsl(0 0% 100% / 0.06)" }} />
                              </div>
                            )}
                            {(rt.type !== "coins" && rt.type !== "uuid_change") && (
                              <>
                                {rt.type !== "vip" && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-muted-foreground">ware_id:</span>
                                    <input type="number" value={rew.ware_id || 0} onChange={(e) => updateRewardField(rt.type, "ware_id", e.target.value)}
                                      className="w-12 py-0.5 px-1 rounded text-[9px] text-center text-foreground focus:outline-none" style={{ background: "hsl(0 0% 100% / 0.06)" }} />
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] text-muted-foreground">مدة:</span>
                                  <input type="number" value={rew.duration_days || 0} onChange={(e) => updateRewardField(rt.type, "duration_days", e.target.value)}
                                    className="w-10 py-0.5 px-1 rounded text-[9px] text-center text-foreground focus:outline-none" style={{ background: "hsl(0 0% 100% / 0.06)" }} />
                                  <span className="text-[8px] text-muted-foreground">يوم</span>
                                </div>
                              </>
                            )}
                            {rt.type === "coins" && (
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] text-muted-foreground">مبلغ:</span>
                                <input type="number" value={rew.value || 0} onChange={(e) => updateRewardField(rt.type, "value", e.target.value)}
                                  className="w-16 py-0.5 px-1 rounded text-[9px] text-center text-foreground focus:outline-none" style={{ background: "hsl(0 0% 100% / 0.06)" }} />
                              </div>
                            )}
                            {rt.type === "uuid_change" && (
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] text-muted-foreground">عدد:</span>
                                <input type="number" value={rew.count || 1} onChange={(e) => updateRewardField(rt.type, "count", e.target.value)}
                                  className="w-10 py-0.5 px-1 rounded text-[9px] text-center text-foreground focus:outline-none" style={{ background: "hsl(0 0% 100% / 0.06)" }} />
                                <span className="text-[8px] text-muted-foreground">مرة</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveTier}
                  disabled={saving || !editTier.name}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
                  style={{ background: "hsl(160 84% 39% / 0.15)", color: "hsl(160 84% 50%)" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ
                </button>
                <button
                  onClick={() => setEditDialog(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: "hsl(0 0% 100% / 0.04)" }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
};

export default AdminSupporterClubPage;
