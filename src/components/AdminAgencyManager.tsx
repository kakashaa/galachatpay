import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Plus, X, Save, Search,
  Snowflake, Play, DollarSign, Phone, Clock,
  ChevronDown, ChevronUp, Receipt, Wallet, Eye, Pencil, AlertTriangle,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import AgencyDetailsSheet from "./AgencyDetailsSheet";

const ADMIN_API = "https://galachat.site/project-z/api.php";

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

const AGENCY_TIERS = [
  { id: "1000",  label: "$1,000",  usd: 1000,  coins: 8500000,   bonusPercent: 10,   bonusUsd: 100,   bonusCoins: 850000,    total: 9350000 },
  { id: "3000",  label: "$3,000",  usd: 3000,  coins: 25500000,  bonusPercent: 12,   bonusUsd: 360,   bonusCoins: 3060000,   total: 28560000 },
  { id: "5000",  label: "$5,000",  usd: 5000,  coins: 42500000,  bonusPercent: 15,   bonusUsd: 750,   bonusCoins: 6375000,   total: 48875000 },
  { id: "10000", label: "$10,000", usd: 10000, coins: 85000000,  bonusPercent: 18,   bonusUsd: 1800,  bonusCoins: 15300000,  total: 100300000 },
  { id: "15000", label: "$15,000", usd: 15000, coins: 127500000, bonusPercent: 18.7, bonusUsd: 2800,  bonusCoins: 23800000,  total: 151300000 },
  { id: "20000", label: "$20,000", usd: 20000, coins: 170000000, bonusPercent: 20,   bonusUsd: 4000,  bonusCoins: 34000000,  total: 204000000 },
];

interface AdminAgencyManagerProps {
  canAct: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

const AdminAgencyManager: React.FC<AdminAgencyManagerProps> = ({ canAct }) => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Details sheet
  const [detailsAgency, setDetailsAgency] = useState<Agency | null>(null);

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

  // Edit agency
  const [editAgency, setEditAgency] = useState<Agency | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", new_password: "", transfer_to_uuid: "" });
  const [editLoading, setEditLoading] = useState(false);

  const adminToken = localStorage.getItem("admin_session_token");

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

  const getSelectedTier = (tierLabel: string) => AGENCY_TIERS.find(t => t.label === tierLabel);

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
      const bonusPercent = isCustom ? 0 : tier!.bonusPercent;

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

  const handleAddBalance = async (username: string) => {
    setAddBalanceLoading(true);
    try {
      const tier = getSelectedTier(addBalanceTier);
      const coins = tier ? tier.total : parseInt(addBalanceCustom) || 0;
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

  const handleEditAgency = async () => {
    if (!editAgency) return;
    const body: Record<string, string> = { admin_key: "ghala2026owner", username: editAgency.username };
    if (editForm.name.trim()) body.name = editForm.name.trim();
    if (editForm.phone.trim()) body.phone = editForm.phone.trim();
    if (editForm.new_password.trim()) body.new_password = editForm.new_password.trim();
    if (editForm.transfer_to_uuid.trim()) body.transfer_to_uuid = editForm.transfer_to_uuid.trim();

    if (Object.keys(body).length <= 2) { toast.error("لم يتم تعديل أي بيانات"); return; }

    setEditLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}?action=agency_update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم تحديث بيانات الوكالة");
        setEditAgency(null);
        fetchAgencies();
      } else {
        toast.error(data.message || data.error || "فشل التحديث");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setEditLoading(false);
    }
  };

  const openEditSheet = (agency: Agency) => {
    setEditForm({ name: agency.name, phone: agency.phone || "", new_password: "", transfer_to_uuid: "" });
    setEditAgency(agency);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* ===== Summary Cards ===== */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "وكالات نشطة", value: activeAgencies.length, sub: `من ${agencies.length}`, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
          { label: "شحنات اليوم", value: `$${totalTodayCharges.toLocaleString()}`, sub: `${agencies.reduce((s, a) => s + (a.today_count || 0), 0)} عملية`, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
          { label: "إجمالي الرصيد", value: `${(totalBalance / 1000000).toFixed(1)}M`, sub: `$${(totalBalance / 8500).toFixed(0)}`, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/5" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
            className={`${card.bg} border ${card.border} rounded-2xl p-4 text-center`}
          >
            <p className="text-[10px] text-muted-foreground mb-1">{card.label}</p>
            <span className={`text-xl font-black ${card.color} font-mono`}>{card.value}</span>
            <p className="text-[9px] text-muted-foreground mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ===== Search + Create ===== */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9 bg-muted/20 border-border/30 h-9 text-xs"
          />
        </div>
        {canAct && (
          <Button
            onClick={() => setShowCreate(!showCreate)}
            variant={showCreate ? "outline" : "default"}
            className={showCreate ? "" : "bg-amber-500 hover:bg-amber-600 text-white"}
            size="sm"
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* ===== Create Form ===== */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-amber-500/20 rounded-2xl p-4 space-y-3 overflow-hidden"
          >
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Plus className="w-4 h-4" /> إنشاء وكالة جديدة
            </h3>
            <Input placeholder="اسم الوكيل *" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className="bg-muted/20 border-border/30" />
            <Input placeholder="اسم المستخدم (للدخول) *" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} dir="ltr" className="bg-muted/20 border-border/30" />
            <Input placeholder="ID الوكالة (UUID) *" value={createForm.agency_id} onChange={e => setCreateForm({ ...createForm, agency_id: e.target.value })} dir="ltr" className="bg-muted/20 border-border/30" />
            <Input placeholder="رقم الواتساب" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} dir="ltr" className="bg-muted/20 border-border/30" />

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">اختر الفئة</label>
              {/* Tier Table */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-1.5 px-1 text-right text-muted-foreground font-normal">المبلغ</th>
                      <th className="py-1.5 px-1 text-right text-muted-foreground font-normal">الكوينز</th>
                      <th className="py-1.5 px-1 text-right text-muted-foreground font-normal">بونص</th>
                      <th className="py-1.5 px-1 text-right text-muted-foreground font-normal">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AGENCY_TIERS.map(t => (
                      <tr
                        key={t.id}
                        onClick={() => setCreateForm({ ...createForm, tier: t.label })}
                        className={`cursor-pointer border-b border-white/5 transition-colors ${
                          createForm.tier === t.label
                            ? "bg-amber-500/10 border-amber-500/20"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className={`py-2 px-1 font-bold ${createForm.tier === t.label ? "text-amber-400" : "text-foreground"}`}>{t.label}</td>
                        <td className="py-2 px-1 font-mono text-muted-foreground">{(t.coins / 1e6).toFixed(1)}M</td>
                        <td className="py-2 px-1 font-mono text-emerald-400">{t.bonusPercent}% (${t.bonusUsd})</td>
                        <td className="py-2 px-1 font-mono font-bold text-foreground">{(t.total / 1e6).toFixed(1)}M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setCreateForm({ ...createForm, tier: "custom" })}
                className={`w-full text-xs py-2 rounded-xl border transition-colors ${
                  createForm.tier === "custom"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                مخصص
              </button>
            </div>

            {createForm.tier === "custom" && (
              <Input
                placeholder="عدد الكوينز"
                type="number"
                value={createForm.custom_coins}
                onChange={e => setCreateForm({ ...createForm, custom_coins: e.target.value })}
                dir="ltr"
                className="bg-muted/20 border-border/30"
              />
            )}

            <Button
              onClick={handleCreate}
              disabled={createLoading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-11 font-bold"
            >
              {createLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
              إنشاء الوكالة
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Agencies List ===== */}
      {filtered.length === 0 ? (
        <div className="text-center py-14">
          <DollarSign className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">{search ? "لا توجد نتائج" : "لا توجد وكالات"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((agency, i) => {
            const isActive = agency.status === "active";
            const balanceUSD = (agency.balance / 8500).toFixed(2);
            const isExpanded = expanded === agency.username;
            const balancePct = agency.original_balance > 0
              ? Math.min(100, Math.round((agency.balance / agency.original_balance) * 100))
              : 0;

            return (
              <motion.div
                key={agency.username}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                layout
                className={`bg-[#1c1e2e] border rounded-2xl overflow-hidden transition-all hover:border-amber-500/30 ${
                  isActive ? "border-white/10" : "border-red-500/20 opacity-70"
                }`}
              >
                {/* Main info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                        isActive ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20"
                      }`}>
                        <Wallet className={`w-5 h-5 ${isActive ? "text-amber-400" : "text-red-400"}`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{agency.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">ID: {agency.agency_id}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          }`}>
                            {isActive ? "نشط" : "مجمّد"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balance section with progress bar */}
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">الرصيد المتبقي</span>
                      <span className="text-[10px] text-muted-foreground font-mono">${balanceUSD}</span>
                    </div>
                    <p className="text-lg font-black text-amber-400 font-mono">{agency.balance?.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">كوينز</span></p>
                    {agency.original_balance > 0 && (
                      <div className="space-y-1">
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${balancePct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.06 + 0.3 }}
                            className={`h-full rounded-full ${
                              balancePct > 50 ? "bg-amber-500" : balancePct > 20 ? "bg-orange-500" : "bg-red-500"
                            }`}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>{balancePct}% متبقي</span>
                          <span>من {agency.original_balance?.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Today stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-500/5 rounded-xl p-2.5 border border-emerald-500/10 text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">شحنات اليوم</p>
                      <p className="text-base font-black text-emerald-400 font-mono">${agency.today_charges || 0}</p>
                    </div>
                    <div className="bg-blue-500/5 rounded-xl p-2.5 border border-blue-500/10 text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">عدد العمليات</p>
                      <p className="text-base font-black text-blue-400 font-mono">{agency.today_count || 0}</p>
                    </div>
                  </div>

                  {/* Quick info expand */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : agency.username)}
                    className="w-full flex items-center justify-center gap-1 mt-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? "إخفاء" : "معلومات سريعة"}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/[0.02] rounded-lg px-3 py-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span>آخر دخول: <strong className="text-foreground">{agency.last_login || "—"}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/[0.02] rounded-lg px-3 py-2">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span dir="ltr"><strong className="text-foreground">{agency.phone || "—"}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/[0.02] rounded-lg px-3 py-2">
                            <Receipt className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span>الرصيد الأصلي: <strong className="text-foreground font-mono">{agency.original_balance?.toLocaleString() || "—"}</strong></span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                {canAct && (
                  <div className="flex border-t border-white/5">
                    <button
                      onClick={() => setAddBalanceTarget(addBalanceTarget === agency.username ? null : agency.username)}
                      className="flex-1 py-3 text-[11px] font-bold text-amber-400 hover:bg-amber-500/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> إضافة رصيد
                    </button>
                    <div className="w-px bg-white/5" />
                    <button
                      onClick={() => handleToggle(agency.username)}
                      disabled={toggleLoading === agency.username}
                      className={`flex-1 py-3 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 ${
                        isActive ? "text-blue-400 hover:bg-blue-500/5" : "text-emerald-400 hover:bg-emerald-500/5"
                      }`}
                    >
                      {toggleLoading === agency.username ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isActive ? (
                        <><Snowflake className="w-3.5 h-3.5" /> تجميد</>
                      ) : (
                        <><Play className="w-3.5 h-3.5" /> تفعيل</>
                      )}
                    </button>
                    <div className="w-px bg-white/5" />
                    <button
                      onClick={() => openEditSheet(agency)}
                      className="flex-1 py-3 text-[11px] font-bold text-orange-400 hover:bg-orange-500/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" /> تعديل
                    </button>
                    <div className="w-px bg-white/5" />
                    <button
                      onClick={() => setDetailsAgency(agency)}
                      className="flex-1 py-3 text-[11px] font-bold text-violet-400 hover:bg-violet-500/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> التفاصيل
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
                        <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5" /> إضافة رصيد لـ {agency.name}
                        </h4>
                        <select
                          value={addBalanceTier}
                          onChange={e => setAddBalanceTier(e.target.value)}
                          className="w-full bg-muted/20 border border-border/30 rounded-xl p-2.5 text-sm text-foreground"
                        >
                          {AGENCY_TIERS.map(t => (
                            <option key={t.label} value={t.label}>{t.label} — بونص {t.bonusPercent}%</option>
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
                            className="bg-muted/20 border-border/30"
                          />
                        ) : (
                          <div className="bg-card rounded-xl p-3 border border-border/20 text-xs">
                            {(() => {
                              const t = getSelectedTier(addBalanceTier);
                              if (!t) return null;
                              return (
                                <div className="space-y-1">
                                  <div className="flex justify-between"><span className="text-muted-foreground">أساسي:</span><span className="font-mono">{t.coins.toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">بونص ({t.bonusPercent}%):</span><span className="font-mono text-emerald-400">+{t.bonusCoins.toLocaleString()}</span></div>
                                  <div className="flex justify-between border-t border-border/20 pt-1"><span className="font-bold">الإجمالي:</span><span className="font-mono font-bold text-amber-400">{t.total.toLocaleString()}</span></div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAddBalance(agency.username)}
                            disabled={addBalanceLoading}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
                            size="sm"
                          >
                            {addBalanceLoading ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Plus className="w-3 h-3 ml-1" />}
                            إضافة
                          </Button>
                          <Button onClick={() => setAddBalanceTarget(null)} variant="outline" size="sm" className="rounded-xl">
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

      {/* Agency Details Sheet */}
      <AgencyDetailsSheet
        agency={detailsAgency}
        open={!!detailsAgency}
        onClose={() => setDetailsAgency(null)}
      />

      {/* Edit Agency Sheet */}
      <Sheet open={!!editAgency} onOpenChange={() => setEditAgency(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0f1117] border-white/5" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/5">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Pencil className="w-5 h-5 text-orange-400" /> تعديل بيانات الوكالة
            </SheetTitle>
          </SheetHeader>
          {editAgency && (
            <div className="space-y-4 pt-4">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-xs">
                <p className="text-muted-foreground mb-0.5">اسم المستخدم (لا يتغير)</p>
                <p className="text-sm font-bold text-foreground font-mono">@{editAgency.username}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">اسم الوكيل</label>
                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="الاسم الجديد" className="bg-white/5 border-white/10 rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">رقم الواتساب</label>
                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+967..." dir="ltr" className="bg-white/5 border-white/10 rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">إعادة تعيين كلمة المرور</label>
                <Input value={editForm.new_password} onChange={e => setEditForm({ ...editForm, new_password: e.target.value })}
                  placeholder="كلمة مرور جديدة" type="password" dir="ltr" className="bg-white/5 border-white/10 rounded-xl" />
                {editForm.new_password && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> الوكيل سيضطر لتغييرها عند الدخول
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">نقل الوكالة لشخص آخر</label>
                <Input value={editForm.transfer_to_uuid} onChange={e => setEditForm({ ...editForm, transfer_to_uuid: e.target.value })}
                  placeholder="UUID الشخص الجديد" dir="ltr" className="bg-white/5 border-white/10 rounded-xl" />
                {editForm.transfer_to_uuid && (
                  <p className="text-[10px] text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> سيتم نقل كل البيانات والرصيد للشخص الجديد
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditAgency(null)}
                  className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all duration-200">إلغاء</button>
                <Button onClick={handleEditAgency} disabled={editLoading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all">
                  {editLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 ml-1.5" /> حفظ التعديلات</>}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminAgencyManager;
