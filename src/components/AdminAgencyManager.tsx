import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Plus, X, Save, Eye, Search,
  Snowflake, Play, DollarSign, Phone, Clock,
  ChevronDown, ChevronUp, Receipt,
} from "lucide-react";

const ADMIN_API = "https://galachat.site/project-z/api.php";
// IMPORTANT: Use admin_key instead of token for all agency API calls

interface Agency {
  username: string;
  name: string;
  agency_id: string;
  balance: number;
  original_balance: number;
  status: string;
  phone: string;
  today_charges: number;
  today_count: number;
  last_login: string;
}

const TIERS = [
  { label: "$1,000", coins: 8500000, bonus: 10 },
  { label: "$3,000", coins: 25500000, bonus: 12 },
  { label: "$5,000", coins: 42500000, bonus: 15 },
  { label: "$10,000", coins: 85000000, bonus: 18 },
  { label: "$15,000", coins: 127500000, bonus: 18.7 },
  { label: "$20,000", coins: 170000000, bonus: 20 },
];

interface AdminAgencyManagerProps {
  canAct: boolean;
}

const AdminAgencyManager: React.FC<AdminAgencyManagerProps> = ({ canAct }) => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create agency
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", username: "", agency_id: "", phone: "", tier: "$1,000", custom_coins: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Add balance
  const [addBalanceTarget, setAddBalanceTarget] = useState<string | null>(null);
  const [addBalanceTier, setAddBalanceTier] = useState("$1,000");
  const [addBalanceCustom, setAddBalanceCustom] = useState("");
  const [addBalanceLoading, setAddBalanceLoading] = useState(false);

  // Toggle loading
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);


  const adminToken = sessionStorage.getItem("admin_session_token");

  const fetchAgencies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${ADMIN_API}?action=agency_list&admin_key=ghala2026owner`);
      const data = await res.json();
      if (data.success) {
        setAgencies(data.agencies || []);
      } else {
        toast.error(data.message || "فشل جلب الوكالات");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const activeAgencies = agencies.filter(a => a.status === "active");
  const totalTodayCharges = agencies.reduce((s, a) => s + (a.today_charges || 0), 0);
  const totalBalance = agencies.reduce((s, a) => s + (a.balance || 0), 0);

  const filtered = agencies.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.username?.toLowerCase().includes(search.toLowerCase()) ||
    a.agency_id?.includes(search)
  );

  const getSelectedTier = (tierLabel: string) => TIERS.find(t => t.label === tierLabel);

  // Create agency
  const handleCreate = async () => {
    if (!createForm.name || !createForm.username || !createForm.agency_id) {
      toast.error("الاسم واسم المستخدم والآيدي مطلوبين");
      return;
    }
    setCreateLoading(true);
    try {
      const tier = getSelectedTier(createForm.tier);
      const isCustom = !tier;
      const coins = isCustom ? parseInt(createForm.custom_coins) || 0 : tier!.coins;
      const bonusPercent = isCustom ? 0 : tier!.bonus;

      const res = await fetch(`${ADMIN_API}?action=agency_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_key: "ghala2026owner",
          username: createForm.username,
          name: createForm.name,
          agency_id: createForm.agency_id,
          balance: coins,
          bonus_percent: bonusPercent,
          tier: createForm.tier,
          phone: createForm.phone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إنشاء الوكالة بنجاح");
        setShowCreate(false);
        setCreateForm({ name: "", username: "", agency_id: "", phone: "", tier: "$1,000", custom_coins: "" });
        fetchAgencies();
      } else {
        toast.error(data.message || "فشل الإنشاء");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setCreateLoading(false);
    }
  };

  // Add balance
  const handleAddBalance = async (username: string) => {
    setAddBalanceLoading(true);
    try {
      const tier = getSelectedTier(addBalanceTier);
      const coins = tier ? tier.coins + Math.floor(tier.coins * tier.bonus / 100) : parseInt(addBalanceCustom) || 0;
      if (coins <= 0) { toast.error("أدخل كمية صحيحة"); return; }

      const res = await fetch(`${ADMIN_API}?action=agency_add_balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_key: "ghala2026owner", username, coins }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إضافة الرصيد");
        setAddBalanceTarget(null);
        fetchAgencies();
      } else {
        toast.error(data.message || "فشل الإضافة");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setAddBalanceLoading(false);
    }
  };

  // Toggle freeze
  const handleToggle = async (username: string) => {
    setToggleLoading(username);
    try {
      const res = await fetch(`${ADMIN_API}?action=agency_toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_key: "ghala2026owner", username }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم تحديث الحالة");
        fetchAgencies();
      } else {
        toast.error(data.message || "فشل التحديث");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setToggleLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">وكالات نشطة</p>
          <span className="text-2xl font-bold text-amber-400">{activeAgencies.length}</span>
        </div>
        <div className="bg-card border border-green-500/20 rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">شحنات اليوم</p>
          <span className="text-2xl font-bold text-green-400 font-mono">${totalTodayCharges.toLocaleString()}</span>
        </div>
        <div className="bg-card border border-blue-500/20 rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">إجمالي الرصيد</p>
          <span className="text-lg font-bold text-blue-400 font-mono">{(totalBalance / 1000000).toFixed(1)}M</span>
        </div>
      </div>

      {/* Search + Create */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        {canAct && (
          <Button
            onClick={() => setShowCreate(!showCreate)}
            variant={showCreate ? "outline" : "default"}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-amber-500/20 rounded-2xl p-4 space-y-3 overflow-hidden"
          >
            <h3 className="text-sm font-bold text-amber-400">إنشاء وكالة جديدة</h3>
            <Input placeholder="اسم الوكيل *" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            <Input placeholder="اسم المستخدم (للدخول) *" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} dir="ltr" />
            <Input placeholder="ID الوكالة (UUID) *" value={createForm.agency_id} onChange={e => setCreateForm({ ...createForm, agency_id: e.target.value })} dir="ltr" />
            <Input placeholder="رقم الواتساب" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} dir="ltr" />

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الفئة</label>
              <select
                value={createForm.tier}
                onChange={e => setCreateForm({ ...createForm, tier: e.target.value })}
                className="w-full bg-muted/20 border border-border/30 rounded-lg p-2.5 text-sm"
              >
                {TIERS.map(t => (
                  <option key={t.label} value={t.label}>{t.label} — بونص {t.bonus}%</option>
                ))}
                <option value="custom">مخصص</option>
              </select>
            </div>

            {createForm.tier === "custom" ? (
              <Input
                placeholder="عدد الكوينز"
                type="number"
                value={createForm.custom_coins}
                onChange={e => setCreateForm({ ...createForm, custom_coins: e.target.value })}
                dir="ltr"
              />
            ) : (
              <div className="bg-muted/10 rounded-xl p-3 border border-border/20">
                {(() => {
                  const t = getSelectedTier(createForm.tier);
                  if (!t) return null;
                  const bonus = Math.floor(t.coins * t.bonus / 100);
                  const total = t.coins + bonus;
                  return (
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">أساسي:</span><span className="font-mono">{t.coins.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">بونص ({t.bonus}%):</span><span className="font-mono text-green-400">+{bonus.toLocaleString()}</span></div>
                      <div className="flex justify-between border-t border-border/20 pt-1"><span className="font-bold">الإجمالي:</span><span className="font-mono font-bold text-amber-400">{total.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">≈</span><span className="font-mono text-muted-foreground">${(total / 8500).toFixed(2)}</span></div>
                    </div>
                  );
                })()}
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={createLoading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              {createLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
              إنشاء الوكالة
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agencies List */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>{search ? "لا توجد نتائج" : "لا توجد وكالات"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(agency => {
            const isActive = agency.status === "active";
            const balanceUSD = (agency.balance / 8500).toFixed(2);
            const isExpanded = expanded === agency.username;

            return (
              <motion.div
                key={agency.username}
                layout
                className={`bg-card border rounded-2xl overflow-hidden transition-colors ${isActive ? "border-amber-500/20" : "border-red-500/20 opacity-70"}`}
              >
                {/* Main info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border ${isActive ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                        💰
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">{agency.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">ID: {agency.agency_id}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {isActive ? "نشط" : "مجمّد"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/10 rounded-lg p-2">
                      <p className="text-muted-foreground text-[10px]">الرصيد</p>
                      <p className="font-mono font-bold">{agency.balance?.toLocaleString()} <span className="text-[9px] text-muted-foreground">كوينز</span></p>
                      <p className="text-[10px] text-muted-foreground font-mono">${balanceUSD}</p>
                    </div>
                    <div className="bg-muted/10 rounded-lg p-2">
                      <p className="text-muted-foreground text-[10px]">شحنات اليوم</p>
                      <p className="font-mono font-bold">${agency.today_charges || 0}</p>
                      <p className="text-[10px] text-muted-foreground">{agency.today_count || 0} عمليات</p>
                    </div>
                  </div>

                  {/* Expandable details */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : agency.username)}
                    className="w-full flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? "إخفاء" : "المزيد"}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2 text-xs border-t border-border/20 pt-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>آخر دخول: {agency.last_login || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span dir="ltr">{agency.phone || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Receipt className="w-3 h-3" />
                            <span>الرصيد الأصلي: {agency.original_balance?.toLocaleString() || "—"}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                {canAct && (
                  <div className="flex border-t border-border/20">
                    <button
                      onClick={() => setAddBalanceTarget(addBalanceTarget === agency.username ? null : agency.username)}
                      className="flex-1 py-2.5 text-[11px] font-bold text-amber-400 hover:bg-amber-500/5 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> إضافة رصيد
                    </button>
                    <div className="w-px bg-border/20" />
                    <button
                      onClick={() => handleToggle(agency.username)}
                      disabled={toggleLoading === agency.username}
                      className={`flex-1 py-2.5 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${isActive ? "text-blue-400 hover:bg-blue-500/5" : "text-green-400 hover:bg-green-500/5"}`}
                    >
                      {toggleLoading === agency.username ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isActive ? (
                        <><Snowflake className="w-3 h-3" /> تجميد</>
                      ) : (
                        <><Play className="w-3 h-3" /> تفعيل</>
                      )}
                    </button>
                    <div className="w-px bg-border/20" />
                    <button
                      onClick={() => setExpanded(isExpanded ? null : agency.username)}
                      className="flex-1 py-2.5 text-[11px] font-bold text-muted-foreground hover:bg-muted/10 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> التفاصيل
                    </button>
                  </div>
                )}

                {/* Add Balance Form */}
                <AnimatePresence>
                  {addBalanceTarget === agency.username && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-amber-500/20"
                    >
                      <div className="p-4 space-y-3 bg-amber-500/5">
                        <h4 className="text-xs font-bold text-amber-400">إضافة رصيد لـ {agency.name}</h4>
                        <select
                          value={addBalanceTier}
                          onChange={e => setAddBalanceTier(e.target.value)}
                          className="w-full bg-muted/20 border border-border/30 rounded-lg p-2.5 text-sm"
                        >
                          {TIERS.map(t => (
                            <option key={t.label} value={t.label}>{t.label} — بونص {t.bonus}%</option>
                          ))}
                          <option value="custom">مخصص</option>
                        </select>

                        {addBalanceTier === "custom" ? (
                          <Input
                            placeholder="عدد الكوينز"
                            type="number"
                            value={addBalanceCustom}
                            onChange={e => setAddBalanceCustom(e.target.value)}
                            dir="ltr"
                          />
                        ) : (
                          <div className="bg-card rounded-xl p-3 border border-border/20 text-xs">
                            {(() => {
                              const t = getSelectedTier(addBalanceTier);
                              if (!t) return null;
                              const bonus = Math.floor(t.coins * t.bonus / 100);
                              const total = t.coins + bonus;
                              return (
                                <div className="space-y-1">
                                  <div className="flex justify-between"><span className="text-muted-foreground">أساسي:</span><span className="font-mono">{t.coins.toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">بونص ({t.bonus}%):</span><span className="font-mono text-green-400">+{bonus.toLocaleString()}</span></div>
                                  <div className="flex justify-between border-t border-border/20 pt-1"><span className="font-bold">الإجمالي:</span><span className="font-mono font-bold text-amber-400">{total.toLocaleString()}</span></div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAddBalance(agency.username)}
                            disabled={addBalanceLoading}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                            size="sm"
                          >
                            {addBalanceLoading ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Plus className="w-3 h-3 ml-1" />}
                            إضافة
                          </Button>
                          <Button onClick={() => setAddBalanceTarget(null)} variant="outline" size="sm">
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminAgencyManager;
