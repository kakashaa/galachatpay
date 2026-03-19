import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Users, DollarSign, Shield, Trash2, RefreshCw,
  Settings, UserPlus, UserMinus, Edit2, Save, X, Search, RotateCcw, Lock, Unlock, Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateAr } from "@/utils/dateFormat";

type SubTab = "registrations" | "bds" | "withdrawals" | "settings" | "deleted" | "banned";

interface AdminBDManagerProps {
  readOnly?: boolean;
}

const AdminBDManager: React.FC<AdminBDManagerProps> = ({ readOnly = false }) => {
  const { confirm, ConfirmDialog } = useConfirmModal();
  const [subTab, setSubTab] = useState<SubTab>("registrations");
  const [loading, setLoading] = useState(false);

  // Registration requests
  const [registrations, setRegistrations] = useState<any[]>([]);

  // BD list
  const [bds, setBds] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [deletedBds, setDeletedBds] = useState<any[]>([]);
  const [deletedMembers, setDeletedMembers] = useState<any[]>([]);
  const [bannedBds, setBannedBds] = useState<any[]>([]);
  const [expandedBd, setExpandedBd] = useState<string | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<Record<string, number>>({});
  const [bdSearchQuery, setBdSearchQuery] = useState("");
  const [editingBd, setEditingBd] = useState<string | null>(null);
  const [editBdData, setEditBdData] = useState<any>({});

  // Add member
  const [addMemberBd, setAddMemberBd] = useState<string | null>(null);
  const [newMemberUuid, setNewMemberUuid] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberType, setNewMemberType] = useState<"supporter" | "agency">("supporter");
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberCommission, setEditMemberCommission] = useState<string>("");
  const [editingMemberAmount, setEditingMemberAmount] = useState<string | null>(null);
  const [editMemberTotalComm, setEditMemberTotalComm] = useState<string>("");

  // Inline stats editing
  const [editingStatsBd, setEditingStatsBd] = useState<string | null>(null);
  const [editStatsValues, setEditStatsValues] = useState<{ today: string; month: string; total: string }>({ today: "", month: "", total: "" });
  const [savingStats, setSavingStats] = useState(false);

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<"all" | "pending" | "completed" | "rejected">("pending");

  // Settings
  const [walletsPaused, setWalletsPaused] = useState(false);
  const [autoWithdrawal, setAutoWithdrawal] = useState(false);
  const [syncSchedule, setSyncSchedule] = useState<"hourly" | "daily">("daily");
  const [settingsLoading, setSettingsLoading] = useState(false);

  const bdCall = async (action: string, params: any = {}) => {
    const { data, error } = await supabase.functions.invoke("bd-manage", {
      body: { action, ...params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      switch (subTab) {
        case "registrations": {
          const res = await bdCall("admin_list_registrations");
          setRegistrations(res.data || []);
          break;
        }
        case "bds": {
          const res = await bdCall("admin_list_bds");
          setBds(res.bds || []);
          setAllMembers(res.members || []);
          break;
        }
        case "withdrawals": {
          const { data } = await supabase
            .from("bd_withdrawals")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
          setWithdrawals(data || []);
          break;
        }
        case "settings": {
          const { data } = await supabase
            .from("app_settings")
            .select("*")
            .in("key", ["bd_wallets_paused", "bd_auto_withdrawal", "bd_sync_schedule"]);
          const map: Record<string, string> = {};
          (data || []).forEach((s: any) => { map[s.key] = s.value; });
          setWalletsPaused(map.bd_wallets_paused === "true");
          setAutoWithdrawal(map.bd_auto_withdrawal === "true");
          setSyncSchedule((map.bd_sync_schedule as "hourly" | "daily") || "daily");
          break;
        }
        case "deleted": {
          const res = await bdCall("admin_list_bds", { include_deleted: true });
          setDeletedBds(res.bds || []);
          setDeletedMembers(res.members || []);
          break;
        }
        case "banned": {
          const { data } = await supabase
            .from("bd_commission_settings")
            .select("*")
            .not("banned_at", "is", null)
            .order("banned_at", { ascending: false });
          setBannedBds(data || []);
          break;
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [subTab]);

  useEffect(() => { loadData(); }, [loadData]);

  // Preload banned count for badge
  useEffect(() => {
    supabase
      .from("bd_commission_settings")
      .select("id, bd_uuid, bd_name, banned_at, available_balance, referral_code, is_active, is_approved, current_month_earnings, total_earned, user_commission_pct, agency_commission_pct")
      .not("banned_at", "is", null)
      .then(({ data }) => { if (data) setBannedBds(data); });
  }, []);

  // Registration actions
  const approveRegistration = async (id: string) => {
    try {
      await bdCall("admin_approve_registration", { request_id: id });
      toast.success("تمت الموافقة");
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) { toast.error(err?.message || "فشل"); }
  };

  const rejectRegistration = async (id: string) => {
    try {
      await bdCall("admin_reject_registration", { request_id: id });
      toast.success("تم الرفض");
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) { toast.error(err?.message || "فشل"); }
  };

  // BD actions
  const updateBd = async (bdUuid: string) => {
    try {
      await bdCall("admin_update_bd", { bd_uuid: bdUuid, ...editBdData });
      toast.success("تم التحديث");
      setEditingBd(null);
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل"); }
  };

  const deleteBd = async (bdUuid: string) => {
    const ok = await confirm({ title: "حذف البيدي", message: "هل تريد حذف هذا البيدي وجميع أعضائه؟", danger: true, confirmText: "حذف" });
    if (!ok) return;
    try {
      await bdCall("admin_delete_bd", { bd_uuid: bdUuid });
      toast.success("تم الحذف");
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل"); }
  };

  const restoreBd = async (bdUuid: string) => {
    const ok = await confirm({ title: "استعادة البيدي", message: "هل تريد استعادة هذا البيدي وجميع أعضائه؟", danger: false, confirmText: "استعادة" });
    if (!ok) return;
    try {
      await bdCall("admin_restore_bd", { bd_uuid: bdUuid });
      toast.success("تم استعادة البيدي بنجاح");
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل"); }
  };

  const removeMember = async (memberId: string) => {
    try {
      await bdCall("admin_remove_member", { member_id: memberId });
      toast.success("تم إزالة العضو");
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل"); }
  };

  const addMember = async () => {
    if (!addMemberBd || !newMemberUuid.trim()) { toast.error("UUID مطلوب"); return; }
    setAddMemberLoading(true);
    try {
      await bdCall("admin_add_member", {
        bd_uuid: addMemberBd,
        member_uuid: newMemberUuid.trim(),
        member_name: newMemberName.trim(),
        member_type: newMemberType,
      });
      toast.success("تم إضافة العضو");
      setAddMemberBd(null);
      setNewMemberUuid("");
      setNewMemberName("");
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل"); }
    finally { setAddMemberLoading(false); }
  };

  // Settings toggle
  const toggleSetting = async (key: string) => {
    setSettingsLoading(true);
    try {
      const res = await bdCall("admin_toggle_setting", { key });
      if (key === "bd_wallets_paused") setWalletsPaused(res.value === "true");
      if (key === "bd_auto_withdrawal") setAutoWithdrawal(res.value === "true");
      toast.success("تم التحديث");
    } catch (err: any) { toast.error(err?.message || "فشل"); }
    finally { setSettingsLoading(false); }
  };

  const updateSyncSchedule = async (schedule: "hourly" | "daily") => {
    if (schedule === syncSchedule) return;
    setSettingsLoading(true);
    try {
      await bdCall("admin_toggle_setting", { key: "bd_sync_schedule", value: schedule });
      setSyncSchedule(schedule);
      toast.success(schedule === "hourly" ? "المزامنة: كل ساعة" : "المزامنة: يومياً الساعة 12 ص");
    } catch (err: any) { toast.error(err?.message || "فشل"); }
    finally { setSettingsLoading(false); }
  };

  // Manual sync
  const [syncing, setSyncing] = useState(false);
  const triggerSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("bd-sync", { body: { time: "manual" } });
      if (error) throw error;
      const synced = data?.synced_members || 0;
      const commissions = data?.commission_updates || 0;
      const profit = data?.profit_synced || 0;
      toast.success(`تم المزامنة: ${synced} عضو تم تحديثه، ${commissions} عمولة جديدة، ${profit} ربح BD`);
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل المزامنة"); }
    finally { setSyncing(false); }
  };

  // Withdrawal actions
  const approveWithdrawal = async (id: string) => {
    try {
      await supabase.from("bd_withdrawals").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
      toast.success("تم تأكيد السحب");
      setWithdrawals((prev) => prev.map((w) => w.id === id ? { ...w, status: "completed" } : w));
    } catch { toast.error("فشل"); }
  };

  const rejectWithdrawal = async (id: string, bdUuid: string, amount: number) => {
    try {
      // Refund balance
      const { data: bd } = await supabase
        .from("bd_commission_settings")
        .select("available_balance")
        .eq("bd_uuid", bdUuid)
        .maybeSingle();
      if (bd) {
        await supabase.from("bd_commission_settings")
          .update({ available_balance: (bd.available_balance || 0) + amount })
          .eq("bd_uuid", bdUuid);
      }
      await supabase.from("bd_withdrawals").update({ status: "rejected", rejected_at: new Date().toISOString() }).eq("id", id);
      toast.success("تم رفض السحب وإعادة الرصيد");
      setWithdrawals((prev) => prev.map((w) => w.id === id ? { ...w, status: "rejected" } : w));
    } catch { toast.error("فشل"); }
  };

  const subTabs: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: "registrations", label: "طلبات التوثيق", icon: <Shield className="w-4 h-4" /> },
    { key: "bds", label: "إدارة البيدي", icon: <Users className="w-4 h-4" /> },
    ...(!readOnly ? [
      { key: "deleted" as SubTab, label: "المحذوف", icon: <Trash2 className="w-4 h-4" /> },
      { key: "banned" as SubTab, label: "المحظور", icon: <Lock className="w-4 h-4" /> },
    ] : []),
    { key: "withdrawals", label: "طلبات السحب", icon: <DollarSign className="w-4 h-4" /> },
    ...(!readOnly ? [
      { key: "settings" as SubTab, label: "إعدادات", icon: <Settings className="w-4 h-4" /> },
    ] : []),
  ];

  const pendingRegs = registrations.filter((r) => r.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending").length;
  const bannedCount = bannedBds.length;

  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              subTab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border/40 text-muted-foreground hover:border-primary/30"
            }`}
          >
            {t.icon}
            {t.label}
            {t.key === "registrations" && pendingRegs > 0 && (
              <span className="ml-1 min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{pendingRegs}</span>
            )}
            {t.key === "withdrawals" && pendingWithdrawals > 0 && (
              <span className="ml-1 min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{pendingWithdrawals}</span>
            )}
            {t.key === "banned" && bannedCount > 0 && (
              <span className="ml-1 min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{bannedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Sync button */}
      <div className="flex justify-end">
        <Button onClick={triggerSync} disabled={syncing} size="sm" variant="outline" className="text-xs">
          <RefreshCw className={`w-3 h-3 ml-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "جاري المزامنة..." : "مزامنة الآن"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Registrations */}
          {subTab === "registrations" && (
            <div className="space-y-3">
              {registrations.filter((r) => r.status === "pending").length === 0 && <p className="text-center text-muted-foreground py-10">لا توجد طلبات معلقة</p>}
              {registrations.filter((reg) => reg.status === "pending").map((reg) => (
                <div key={reg.id} className="bg-card border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{reg.user_name || reg.user_uuid}</p>
                      <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{reg.user_uuid}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      reg.status === "pending" ? "bg-orange-500/20 text-orange-400" :
                      reg.status === "approved" ? "bg-green-500/20 text-green-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>{reg.status === "pending" ? "معلق" : reg.status === "approved" ? "مقبول" : "مرفوض"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>لفل: {reg.user_level}</span>
                    <span>•</span>
                    <span>{formatDateAr(reg.created_at)}</span>
                  </div>
                  {reg.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button onClick={() => approveRegistration(reg.id)} size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-3 h-3 ml-1" />قبول
                      </Button>
                      <Button onClick={() => rejectRegistration(reg.id)} size="sm" variant="destructive" className="flex-1">
                        <XCircle className="w-3 h-3 ml-1" />رفض
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* BD List */}
          {subTab === "bds" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالآيدي أو الاسم..."
                  value={bdSearchQuery}
                  onChange={(e) => setBdSearchQuery(e.target.value)}
                  className="pr-9 text-xs"
                  dir="rtl"
                />
              </div>
              {bds.filter((bd) => {
                if (!bdSearchQuery.trim()) return true;
                const q = bdSearchQuery.trim().toLowerCase();
                return (
                  bd.bd_uuid?.toLowerCase().includes(q) ||
                  bd.bd_name?.toLowerCase().includes(q) ||
                  bd.referral_code?.toLowerCase().includes(q)
                );
              }).length === 0 && <p className="text-center text-muted-foreground py-10">{bdSearchQuery ? "لا توجد نتائج" : "لا يوجد بيدي مسجل"}</p>}
              {bds.filter((bd) => {
                if (!bdSearchQuery.trim()) return true;
                const q = bdSearchQuery.trim().toLowerCase();
                return (
                  bd.bd_uuid?.toLowerCase().includes(q) ||
                  bd.bd_name?.toLowerCase().includes(q) ||
                  bd.referral_code?.toLowerCase().includes(q)
                );
              }).map((bd) => {
                const members = allMembers.filter((m) => m.bd_uuid === bd.bd_uuid);
                const supporters = members.filter((m) => m.member_type === "supporter");
                const agents = members.filter((m) => m.member_type === "agency");
                const isExpanded = expandedBd === bd.bd_uuid;
                const isEditing = editingBd === bd.bd_uuid;

                return (
                  <div key={bd.id} className={`bg-card border rounded-xl overflow-hidden ${!bd.is_active ? "opacity-50" : ""}`}>
                    {/* BD Header */}
                    <button
                      onClick={async () => {
                        const newExpanded = isExpanded ? null : bd.bd_uuid;
                        setExpandedBd(newExpanded);
                        if (newExpanded) {
                          const todayStart = new Date();
                          todayStart.setHours(0, 0, 0, 0);
                          const { data: logs } = await supabase
                            .from("bd_commission_logs")
                            .select("amount")
                            .eq("bd_uuid", bd.bd_uuid)
                            .gte("created_at", todayStart.toISOString());
                          const total = logs?.reduce((sum: number, l: any) => sum + (l.amount || 0), 0) || 0;
                          setTodayEarnings(prev => ({ ...prev, [bd.bd_uuid]: total }));
                        }
                      }}
                      className="w-full p-4 flex items-center justify-between text-right"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-sm">{bd.bd_name || bd.bd_uuid}</p>
                        <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{bd.bd_uuid}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>كود: <span className="text-primary font-bold">{bd.referral_code}</span></span>
                          <span>داعمين: {supporters.length}</span>
                          <span>وكلاء: {agents.length}</span>
                        </div>
                        {/* Team Activity Rate */}
                        {(() => {
                          const total = members.length;
                          const active = members.filter((m: any) => m.is_active).length;
                          const pct = total > 0 ? Math.round((active / total) * 100) : 0;
                          return total > 0 ? (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 bg-muted/40 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-bold ${
                                pct >= 80 ? "text-green-400" : pct >= 50 ? "text-blue-400" : "text-red-400"
                              }`}>
                                {active}/{total} ({pct}%)
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-left">
                          <p className="text-xs font-bold text-green-400">${Number(bd.available_balance || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">رصيد متاح</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t"
                        >
                          <div className="p-4 space-y-4">
                            {/* Stats - Inline Editable */}
                            {editingStatsBd === bd.bd_uuid ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                  <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                                    <p className="text-muted-foreground">اليوم</p>
                                    <p className="h-7 flex items-center justify-center text-xs font-bold text-emerald-400">${(todayEarnings[bd.bd_uuid] ?? 0).toFixed(2)}</p>
                                    <p className="text-[9px] text-muted-foreground/60">تلقائي من الأعضاء</p>
                                  </div>
                                  <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                                    <p className="text-muted-foreground">الشهر</p>
                                    <Input
                                      type="number" step="0.01" dir="ltr"
                                      className="h-7 text-xs text-center font-bold"
                                      value={editStatsValues.month}
                                      onChange={(e) => setEditStatsValues(prev => ({ ...prev, month: e.target.value }))}
                                    />
                                  </div>
                                  <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                                    <p className="text-muted-foreground">الإجمالي</p>
                                    <Input
                                      type="number" step="0.01" dir="ltr"
                                      className="h-7 text-xs text-center font-bold"
                                      value={editStatsValues.total}
                                      onChange={(e) => setEditStatsValues(prev => ({ ...prev, total: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                {/* Show diffs */}
                                {(() => {
                                  const origMonth = Number(bd.current_month_earnings || 0);
                                  const origTotal = Number(bd.total_earned || 0);
                                  const newMonth = Number(editStatsValues.month) || 0;
                                  const newTotal = Number(editStatsValues.total) || 0;
                                  const diffMonth = newMonth - origMonth;
                                  const diffTotal = newTotal - origTotal;
                                  const totalDiff = diffMonth + diffTotal;
                                  const hasDiff = diffMonth !== 0 || diffTotal !== 0;
                                  return hasDiff ? (
                                    <div className="bg-muted/20 rounded-lg p-2 text-[10px] space-y-1">
                                      {diffMonth !== 0 && (
                                        <div className="flex justify-between">
                                          <span>فارق الشهر:</span>
                                          <span className={diffMonth > 0 ? "text-emerald-400" : "text-red-400"}>
                                            {diffMonth > 0 ? "+" : ""}{diffMonth.toFixed(2)}$
                                          </span>
                                        </div>
                                      )}
                                      {diffTotal !== 0 && (
                                        <div className="flex justify-between">
                                          <span>فارق الإجمالي:</span>
                                          <span className={diffTotal > 0 ? "text-emerald-400" : "text-red-400"}>
                                            {diffTotal > 0 ? "+" : ""}{diffTotal.toFixed(2)}$
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex justify-between border-t border-border/30 pt-1 font-bold">
                                        <span>إجمالي التعديل على الرصيد:</span>
                                        <span className={totalDiff > 0 ? "text-emerald-400" : "text-red-400"}>
                                          {totalDiff > 0 ? "+" : ""}{totalDiff.toFixed(2)}$
                                        </span>
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={async () => {
                                      setSavingStats(true);
                                      try {
                                        const newMonth = Number(editStatsValues.month) || 0;
                                        const newTotal = Number(editStatsValues.total) || 0;

                                        // Update bd_commission_settings (Today is read-only, derived from member logs)
                                        await supabase
                                          .from("bd_commission_settings")
                                          .update({
                                            current_month_earnings: newMonth,
                                            total_earned: newTotal,
                                            updated_at: new Date().toISOString(),
                                          })
                                          .eq("bd_uuid", bd.bd_uuid);

                                        toast.success("تم التحديث بنجاح");
                                        setEditingStatsBd(null);
                                        loadData();
                                      } catch (err: any) {
                                        toast.error(err?.message || "فشل التحديث");
                                      } finally {
                                        setSavingStats(false);
                                      }
                                    }}
                                    size="sm"
                                    className="flex-1 text-xs"
                                    disabled={savingStats}
                                  >
                                    {savingStats ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Save className="w-3 h-3 ml-1" />}
                                    حفظ
                                  </Button>
                                  <Button onClick={() => setEditingStatsBd(null)} size="sm" variant="outline" className="flex-1 text-xs">
                                    <X className="w-3 h-3 ml-1" />إلغاء
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!readOnly) {
                                      setEditingStatsBd(bd.bd_uuid);
                                      setEditStatsValues({
                                        today: (todayEarnings[bd.bd_uuid] ?? 0).toFixed(2),
                                        month: Number(bd.current_month_earnings || 0).toFixed(2),
                                        total: Number(bd.total_earned || 0).toFixed(2),
                                      });
                                    }
                                  }}
                                  className="bg-muted/30 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                                >
                                  <p className="text-muted-foreground">اليوم</p>
                                  <p className="font-bold text-emerald-400">${(todayEarnings[bd.bd_uuid] ?? 0).toFixed(2)}</p>
                                  {!readOnly && <Edit2 className="w-2.5 h-2.5 mx-auto mt-0.5 text-muted-foreground/50" />}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!readOnly) {
                                      setEditingStatsBd(bd.bd_uuid);
                                      setEditStatsValues({
                                        today: (todayEarnings[bd.bd_uuid] ?? 0).toFixed(2),
                                        month: Number(bd.current_month_earnings || 0).toFixed(2),
                                        total: Number(bd.total_earned || 0).toFixed(2),
                                      });
                                    }
                                  }}
                                  className="bg-muted/30 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                                >
                                  <p className="text-muted-foreground">الشهر</p>
                                  <p className="font-bold text-primary">${Number(bd.current_month_earnings || 0).toFixed(2)}</p>
                                  {!readOnly && <Edit2 className="w-2.5 h-2.5 mx-auto mt-0.5 text-muted-foreground/50" />}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!readOnly) {
                                      setEditingStatsBd(bd.bd_uuid);
                                      setEditStatsValues({
                                        today: (todayEarnings[bd.bd_uuid] ?? 0).toFixed(2),
                                        month: Number(bd.current_month_earnings || 0).toFixed(2),
                                        total: Number(bd.total_earned || 0).toFixed(2),
                                      });
                                    }
                                  }}
                                  className="bg-muted/30 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                                >
                                  <p className="text-muted-foreground">الإجمالي</p>
                                  <p className="font-bold">${Number(bd.total_earned || 0).toFixed(2)}</p>
                                  {!readOnly && <Edit2 className="w-2.5 h-2.5 mx-auto mt-0.5 text-muted-foreground/50" />}
                                </button>
                                <div className="bg-muted/30 rounded-lg p-2">
                                  <p className="text-muted-foreground">نسب</p>
                                  <p className="font-bold">{bd.user_commission_pct}% / {bd.agency_commission_pct}%</p>
                                </div>
                              </div>
                            )}

                            {/* Monthly Goal Progress */}
                            {(() => {
                              const goal = bd.monthly_goal || 500;
                              const earnings = Number(bd.current_month_earnings || 0);
                              const pct = Math.min((earnings / goal) * 100, 100);
                              return (
                                <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold">هدف الشهر</span>
                                    <span className="text-muted-foreground">${earnings.toFixed(2)} / ${goal.toFixed(2)}</span>
                                  </div>
                                  <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-700 ${
                                        pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-primary" : "bg-orange-400"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <p className={`text-center text-xs font-bold ${pct >= 100 ? "text-green-400" : "text-primary"}`}>
                                    {pct.toFixed(0)}%{pct >= 100 ? "" : ""}
                                  </p>
                                </div>
                              );
                            })()}

                            {/* Edit BD */}
                            {isEditing ? (
                              <div className="space-y-2 bg-muted/20 rounded-xl p-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">نسبة الداعمين %</label>
                                    <Input type="number" value={editBdData.user_commission_pct ?? bd.user_commission_pct}
                                      onChange={(e) => setEditBdData({ ...editBdData, user_commission_pct: Number(e.target.value) })} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">نسبة الوكلاء %</label>
                                    <Input type="number" value={editBdData.agency_commission_pct ?? bd.agency_commission_pct}
                                      onChange={(e) => setEditBdData({ ...editBdData, agency_commission_pct: Number(e.target.value) })} />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">الرصيد المتاح $</label>
                                  <Input type="number" step="0.01" value={editBdData.available_balance ?? bd.available_balance}
                                    onChange={(e) => setEditBdData({ ...editBdData, available_balance: Number(e.target.value) })} />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">أرباح الشهر الحالي $</label>
                                  <Input type="number" step="0.01" value={editBdData.current_month_earnings ?? bd.current_month_earnings}
                                    onChange={(e) => setEditBdData({ ...editBdData, current_month_earnings: Number(e.target.value) })} />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">هدف العمولات الشهري $</label>
                                  <Input type="number" step="1" value={editBdData.monthly_goal ?? bd.monthly_goal ?? 500}
                                    onChange={(e) => setEditBdData({ ...editBdData, monthly_goal: Number(e.target.value) })} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch checked={editBdData.withdraw_exempt ?? bd.withdraw_exempt}
                                    onCheckedChange={(c) => setEditBdData({ ...editBdData, withdraw_exempt: c })} />
                                  <span className="text-xs">معفى من قيود السحب</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => updateBd(bd.bd_uuid)} size="sm" className="flex-1">
                                    <Save className="w-3 h-3 ml-1" />حفظ
                                  </Button>
                                  <Button onClick={() => setEditingBd(null)} size="sm" variant="outline" className="flex-1">
                                    <X className="w-3 h-3 ml-1" />إلغاء
                                  </Button>
                                </div>
                              </div>
                            ) : !readOnly ? (
                              <div className="flex gap-2">
                                <Button onClick={() => { setEditingBd(bd.bd_uuid); setEditBdData({}); }} size="sm" variant="outline" className="flex-1 text-xs">
                                  <Edit2 className="w-3 h-3 ml-1" />تعديل
                                </Button>
                                <Button onClick={() => deleteBd(bd.bd_uuid)} size="sm" variant="destructive" className="text-xs">
                                  <Trash2 className="w-3 h-3 ml-1" />حذف
                                </Button>
                              </div>
                            ) : null}

                            {/* Members */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold">الأعضاء ({members.length})</p>
                                {!readOnly && (
                                  <Button onClick={() => setAddMemberBd(addMemberBd === bd.bd_uuid ? null : bd.bd_uuid)} size="sm" variant="ghost" className="text-xs h-7">
                                    <UserPlus className="w-3 h-3 ml-1" />{addMemberBd === bd.bd_uuid ? "إلغاء" : "إضافة"}
                                  </Button>
                                )}
                              </div>

                              {/* Add member form */}
                              {addMemberBd === bd.bd_uuid && (
                                <div className="bg-muted/20 rounded-lg p-3 space-y-2 mb-2">
                                  <Input placeholder="UUID العضو" value={newMemberUuid} onChange={(e) => setNewMemberUuid(e.target.value)} dir="ltr" />
                                  <Input placeholder="اسم العضو (اختياري)" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
                                  <div className="flex gap-2">
                                    <button onClick={() => setNewMemberType("supporter")}
                                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold ${newMemberType === "supporter" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border/30"}`}>
                                      داعم
                                    </button>
                                    <button onClick={() => setNewMemberType("agency")}
                                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold ${newMemberType === "agency" ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/30"}`}>
                                      وكيل
                                    </button>
                                  </div>
                                  <Button onClick={addMember} disabled={addMemberLoading} size="sm" className="w-full">
                                    {addMemberLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "إضافة العضو"}
                                  </Button>
                                </div>
                              )}

                              {members.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground text-center py-2">لا يوجد أعضاء</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {members.map((m) => {
                                    const isEditingMember = editingMember === m.id;
                                    const isEditingAmount = editingMemberAmount === m.id;
                                    const defaultPct = m.member_type === "agency" ? bd.agency_commission_pct : bd.user_commission_pct;
                                    const displayPct = m.custom_commission_pct != null ? m.custom_commission_pct : defaultPct;
                                    return (
                                      <div key={m.id} className="bg-muted/20 rounded-lg px-3 py-2 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-xs font-bold">{m.member_name || m.member_uuid}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">ID: {m.member_uuid} <button onClick={() => { navigator.clipboard.writeText(m.member_uuid); toast.success("تم نسخ ID"); }} className="hover:text-primary"><Copy className="w-3 h-3" /></button></p>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                              <span className={m.member_type === "agency" ? "text-amber-400" : "text-emerald-400"}>
                                                {m.member_type === "agency" ? "وكيل" : "داعم"}
                                              </span>
                                              <span>الشهر: ${Number(m.current_month_commission || 0).toFixed(2)}</span>
                                              <span>الإجمالي: ${Number(m.total_commission || 0).toFixed(2)}</span>
                                              <span>({displayPct}%{m.custom_commission_pct != null ? " مخصص" : ""})</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {!readOnly && (
                                              <>
                                                <button
                                                  onClick={() => {
                                                    if (isEditingAmount) {
                                                      setEditingMemberAmount(null);
                                                    } else {
                                                      setEditingMemberAmount(m.id);
                                                      setEditingMember(null);
                                                      setEditMemberTotalComm(String(Number(m.total_commission || 0)));
                                                    }
                                                  }}
                                                  className="p-1.5 rounded-lg hover:bg-green-500/10"
                                                  title="تعديل العمولة المحققة"
                                                >
                                                  <DollarSign className="w-3.5 h-3.5 text-green-400" />
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (isEditingMember) {
                                                      setEditingMember(null);
                                                    } else {
                                                      setEditingMember(m.id);
                                                      setEditingMemberAmount(null);
                                                      setEditMemberCommission(m.custom_commission_pct != null ? String(m.custom_commission_pct) : "");
                                                    }
                                                  }}
                                                  className="p-1.5 rounded-lg hover:bg-primary/10"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5 text-primary" />
                                                </button>
                                                <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-lg hover:bg-destructive/10">
                                                  <UserMinus className="w-3.5 h-3.5 text-destructive" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        {/* Edit commission amount */}
                                        {isEditingAmount && (
                                          <div className="bg-muted/30 rounded-lg p-2.5 space-y-2 border border-green-500/20">
                                            <p className="text-[10px] text-green-400 font-bold">تعديل العمولة المحققة</p>
                                            <div>
                                              <label className="text-[10px] text-muted-foreground">إجمالي العمولة الكلية $</label>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                value={editMemberTotalComm}
                                                onChange={(e) => setEditMemberTotalComm(e.target.value)}
                                                className="h-7 text-xs mt-0.5"
                                                dir="ltr"
                                              />
                                            </div>
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                className="h-7 text-[10px] px-3 flex-1 bg-green-600 hover:bg-green-700"
                                                onClick={async () => {
                                                  try {
                                                    const newTotal = Number(editMemberTotalComm);
                                                    const oldTotal = Number(m.total_commission || 0);
                                                    const diff = newTotal - oldTotal;
                                                    
                                                    // Update member
                                                    const newMonthComm = Math.max(0, Number(m.current_month_commission || 0) + diff);
                                                    await supabase.from("bd_members").update({
                                                      total_commission: newTotal,
                                                      current_month_commission: newMonthComm,
                                                    }).eq("id", m.id);
                                                    
                                                    // Update BD stats
                                                    const newBdMonth = Math.max(0, Number(bd.current_month_earnings || 0) + diff);
                                                    const newBdTotal = Math.max(0, Number(bd.total_earned || 0) + diff);
                                                    await supabase.from("bd_commission_settings").update({
                                                      current_month_earnings: newBdMonth,
                                                      total_earned: newBdTotal,
                                                    }).eq("bd_uuid", bd.bd_uuid);
                                                    
                                                    // Add commission log for today
                                                    const now = new Date();
                                                    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                                                    await supabase.from("bd_commission_logs").insert({
                                                      bd_uuid: bd.bd_uuid,
                                                      member_uuid: m.member_uuid,
                                                      member_type: m.member_type,
                                                      amount: diff,
                                                      source_amount: 0,
                                                      commission_pct: Number(displayPct),
                                                      month,
                                                    });
                                                    
                                                    // Update local state
                                                    setAllMembers(prev => prev.map(mm => mm.id === m.id ? { ...mm, total_commission: newTotal, current_month_commission: newMonthComm } : mm));
                                                    setBds(prev => prev.map(b => b.bd_uuid === bd.bd_uuid ? { ...b, current_month_earnings: newBdMonth, total_earned: newBdTotal } : b));
                                                    
                                                    // Re-fetch today earnings from DB for accuracy
                                                    const todayRefresh = new Date();
                                                    todayRefresh.setHours(0, 0, 0, 0);
                                                    const { data: refreshLogs } = await supabase
                                                      .from("bd_commission_logs")
                                                      .select("amount")
                                                      .eq("bd_uuid", bd.bd_uuid)
                                                      .gte("created_at", todayRefresh.toISOString());
                                                    const refreshTotal = refreshLogs?.reduce((s: number, l: any) => s + (l.amount || 0), 0) || 0;
                                                    setTodayEarnings(prev => ({ ...prev, [bd.bd_uuid]: refreshTotal }));
                                                    
                                                    setEditingMemberAmount(null);
                                                    toast.success(`تم تعديل العمولة (${diff >= 0 ? "+" : ""}${diff.toFixed(2)}$)`);
                                                  } catch { toast.error("فشل التحديث"); }
                                                }}
                                              >
                                                <Save className="w-3 h-3 ml-1" />حفظ
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-[10px] px-3"
                                                onClick={() => setEditingMemberAmount(null)}
                                              >
                                                إلغاء
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                        {/* Edit commission percentage */}
                                        {isEditingMember && (
                                          <div className="flex items-center gap-2 pt-1">
                                            <Input
                                              type="number"
                                              step="0.1"
                                              placeholder={`الافتراضي: ${defaultPct}%`}
                                              value={editMemberCommission}
                                              onChange={(e) => setEditMemberCommission(e.target.value)}
                                              className="h-7 text-xs flex-1"
                                              dir="ltr"
                                            />
                                            <Button
                                              size="sm"
                                              className="h-7 text-[10px] px-2"
                                              onClick={async () => {
                                                try {
                                                  const val = editMemberCommission.trim() === "" ? null : Number(editMemberCommission);
                                                  await supabase.from("bd_members").update({ custom_commission_pct: val }).eq("id", m.id);
                                                  toast.success("تم تحديث العمولة");
                                                  setEditingMember(null);
                                                  setAllMembers(prev => prev.map(mm => mm.id === m.id ? { ...mm, custom_commission_pct: val } : mm));
                                                } catch { toast.error("فشل التحديث"); }
                                              }}
                                            >
                                              <Save className="w-3 h-3" />
                                            </Button>
                                            {m.custom_commission_pct != null && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-[10px] px-2"
                                                onClick={async () => {
                                                  try {
                                                    await supabase.from("bd_members").update({ custom_commission_pct: null }).eq("id", m.id);
                                                    toast.success("تم إعادة العمولة للافتراضي");
                                                    setEditingMember(null);
                                                    setAllMembers(prev => prev.map(mm => mm.id === m.id ? { ...mm, custom_commission_pct: null } : mm));
                                                  } catch { toast.error("فشل"); }
                                                }}
                                              >
                                                <RotateCcw className="w-3 h-3" />
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* Deleted BDs */}
          {subTab === "deleted" && (
            <div className="space-y-3">
              {deletedBds.length === 0 && <p className="text-center text-muted-foreground py-10">لا يوجد بيدي محذوف</p>}
              {deletedBds.map((bd) => {
                const members = deletedMembers.filter((m) => m.bd_uuid === bd.bd_uuid);
                const isExpanded = expandedBd === bd.bd_uuid;
                return (
                  <div key={bd.id} className="bg-card border border-destructive/30 rounded-xl overflow-hidden opacity-70 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setExpandedBd(isExpanded ? null : bd.bd_uuid)}
                      className="w-full p-4 flex items-center justify-between text-right"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4 text-destructive" />
                          <p className="font-bold text-sm">{bd.bd_name || bd.bd_uuid}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{bd.bd_uuid}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>كود: <span className="text-primary font-bold">{bd.referral_code}</span></span>
                          <span>أعضاء: {members.length}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-left">
                          <p className="text-xs font-bold text-muted-foreground">${Number(bd.available_balance || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">رصيد</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t"
                        >
                          <div className="p-4 space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="bg-muted/30 rounded-lg p-2">
                                <p className="text-muted-foreground">الشهر</p>
                                <p className="font-bold text-primary">${Number(bd.current_month_earnings || 0).toFixed(2)}</p>
                              </div>
                              <div className="bg-muted/30 rounded-lg p-2">
                                <p className="text-muted-foreground">الإجمالي</p>
                                <p className="font-bold">${Number(bd.total_earned || 0).toFixed(2)}</p>
                              </div>
                              <div className="bg-muted/30 rounded-lg p-2">
                                <p className="text-muted-foreground">نسب</p>
                                <p className="font-bold">{bd.user_commission_pct}% / {bd.agency_commission_pct}%</p>
                              </div>
                            </div>

                            {/* Restore button */}
                            <Button onClick={() => restoreBd(bd.bd_uuid)} className="w-full bg-green-600 hover:bg-green-700" size="sm">
                              <RotateCcw className="w-4 h-4 ml-1" />
                              استعادة البيدي وجميع الأعضاء
                            </Button>

                            {/* Members list */}
                            {members.length > 0 && (
                              <div>
                                <p className="text-xs font-bold mb-2">الأعضاء ({members.length})</p>
                                <div className="space-y-1.5">
                                  {members.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                                      <div>
                                        <p className="text-xs font-bold">{m.member_name || m.member_uuid}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">ID: {m.member_uuid} <button onClick={() => { navigator.clipboard.writeText(m.member_uuid); toast.success("تم نسخ ID"); }} className="hover:text-primary"><Copy className="w-3 h-3" /></button></p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                          <span className={m.member_type === "agency" ? "text-amber-400" : "text-emerald-400"}>
                                            {m.member_type === "agency" ? "وكيل" : "داعم"}
                                          </span>
                                          <span>عمولة: ${Number(m.current_month_commission || 0).toFixed(2)}</span>
                                          <span className={m.is_active ? "text-green-400" : "text-destructive"}>
                                            {m.is_active ? "نشط" : "غير نشط"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* Banned BDs */}
          {subTab === "banned" && (
            <div className="space-y-3">
              {bannedBds.length === 0 && <p className="text-center text-muted-foreground py-10">لا يوجد بيدي محظور</p>}
              {bannedBds.map((bd) => {
                const bannedDate = bd.banned_at ? new Date(bd.banned_at) : null;
                const unbanDate = bannedDate ? new Date(bannedDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
                const daysRemaining = unbanDate ? Math.max(0, Math.ceil((unbanDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

                return (
                  <div key={bd.id} className="bg-card border border-red-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-red-400" />
                        <div>
                          <p className="font-bold text-sm">{bd.bd_name || bd.bd_uuid}</p>
                          <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{bd.bd_uuid}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400">محظور</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground">تاريخ الحظر</p>
                        <p className="font-bold">{bannedDate ? formatDateAr(bd.banned_at) : "-"}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground">تاريخ الفك</p>
                        <p className="font-bold">{unbanDate ? unbanDate.toLocaleDateString("ar-EG") : "-"}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground">أيام متبقية</p>
                        <p className="font-bold text-amber-400">{daysRemaining}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground">الرصيد</p>
                        <p className="font-bold">${Number(bd.available_balance || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground">كود الإحالة</p>
                        <p className="font-bold text-primary">{bd.referral_code}</p>
                      </div>
                    </div>

                    <Button
                      onClick={async () => {
                        if (!(await confirm({ title: "فك الحظر", message: "هل تريد فك الحظر عن هذا البيدي؟", danger: false, confirmText: "فك الحظر" }))) return;
                        try {
                          await supabase
                            .from("bd_commission_settings")
                            .update({ banned_at: null, is_active: true, is_approved: true })
                            .eq("bd_uuid", bd.bd_uuid);
                          await supabase
                            .from("bd_violations")
                            .delete()
                            .eq("bd_uuid", bd.bd_uuid);
                          toast.success("تم فك الحظر بنجاح");
                          loadData();
                        } catch { toast.error("فشل فك الحظر"); }
                      }}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700 text-xs"
                    >
                      <Unlock className="w-3 h-3 ml-1" />
                      فك الحظر وتصفير المخالفات
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Withdrawals */}
          {subTab === "withdrawals" && (
            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(["all", "pending", "completed", "rejected"] as const).map((f) => (
                  <button key={f} onClick={() => setWithdrawalFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                      withdrawalFilter === f ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"
                    }`}>
                    {f === "all" ? "الكل" : f === "pending" ? "معلقة" : f === "completed" ? "مكتملة" : "مرفوضة"}
                  </button>
                ))}
              </div>

              {withdrawals
                .filter((w) => withdrawalFilter === "all" || w.status === withdrawalFilter)
                .map((w) => (
                  <div key={w.id} className="bg-card border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">{w.bd_name || w.bd_uuid}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDateAr(w.created_at)}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary">${Number(w.amount || 0).toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {Math.floor((w.amount || 0) * 8500).toLocaleString()} كوينز
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        w.status === "pending" ? "bg-orange-500/20 text-orange-400" :
                        w.status === "completed" ? "bg-green-500/20 text-green-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {w.status === "pending" ? "معلق" : w.status === "completed" ? "مكتمل" : "مرفوض"}
                      </span>
                      {w.recipient_name && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          → {w.recipient_name}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(w.recipient_name || "");
                              toast.success("تم نسخ آيدي المستقبل");
                            }}
                            className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                            title="نسخ آيدي المستقبل"
                          >
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </span>
                      )}
                    </div>
                    {w.status === "pending" && !readOnly && (
                      <div className="flex gap-2 pt-1">
                        <Button onClick={() => approveWithdrawal(w.id)} size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-xs">
                          <CheckCircle className="w-3 h-3 ml-1" />تأكيد
                        </Button>
                        <Button onClick={() => rejectWithdrawal(w.id, w.bd_uuid, w.amount)} size="sm" variant="destructive" className="flex-1 text-xs">
                          <XCircle className="w-3 h-3 ml-1" />رفض وإعادة الرصيد
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              {withdrawals.filter((w) => withdrawalFilter === "all" || w.status === withdrawalFilter).length === 0 && (
                <p className="text-center text-muted-foreground py-10">لا توجد طلبات سحب</p>
              )}
            </div>
          )}

          {/* Settings */}
          {subTab === "settings" && (
            <div className="space-y-4">
              <div className="bg-card border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">إيقاف المحافظ</p>
                    <p className="text-[10px] text-muted-foreground">تعطيل عمليات السحب لجميع البيدي</p>
                  </div>
                  <Switch checked={walletsPaused} onCheckedChange={() => toggleSetting("bd_wallets_paused")} disabled={settingsLoading} />
                </div>
                <div className="border-t pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">السحب التلقائي</p>
                    <p className="text-[10px] text-muted-foreground">إرسال الكوينزات مباشرة بدون مراجعة</p>
                  </div>
                  <Switch checked={autoWithdrawal} onCheckedChange={() => toggleSetting("bd_auto_withdrawal")} disabled={settingsLoading} />
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold">جدولة المزامنة التلقائية</p>
                      <p className="text-[10px] text-muted-foreground">تحديث بيانات الأعضاء والعمولات تلقائياً</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateSyncSchedule("hourly")}
                      disabled={settingsLoading}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        syncSchedule === "hourly"
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      ⏰ كل ساعة
                    </button>
                    <button
                      onClick={() => updateSyncSchedule("daily")}
                      disabled={settingsLoading}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        syncSchedule === "daily"
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      📅 يومياً (12 ص)
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    {syncSchedule === "hourly" ? "المزامنة تعمل كل ساعة تلقائياً" : "المزامنة تعمل يومياً الساعة 12:00 صباحاً (UTC)"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminBDManager;
