import React, { useState, useEffect, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import BDBansTab from "@/components/bd/BDBansTab";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, X, Users, Plus, Lock, UserX, DollarSign, Percent, Shield, Pencil, Calculator, Settings, Ban, Bell, Send, ShieldOff, Trash2, BarChart3, History, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import WorksCountdown from "@/components/WorksCountdown";


const AdminWorksPage: React.FC = () => {
  const { handleLogout, adminCall, adminUsername } = useAdminSession();
  const isOwner = adminUsername === "naz";
  const [tab, setTab] = useState("requests");
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Data
  const [requests, setRequests] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedWorksId, setSelectedWorksId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [rejectReason, setRejectReason] = useState("");

  // Owner manual add dialog
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualAddType, setManualAddType] = useState<"supporter" | "agent">("supporter");
  const [manualTargetUuid, setManualTargetUuid] = useState("");
  const [manualTargetWorksId, setManualTargetWorksId] = useState("");
  const [manualAddLoading, setManualAddLoading] = useState(false);

  // Owner edit commission dialog
  const [editMember, setEditMember] = useState<any | null>(null);
  const [editCommission, setEditCommission] = useState("");
  // Edit member total commission
  const [editMemberCommAmt, setEditMemberCommAmt] = useState<any | null>(null);
  const [editNewCommAmt, setEditNewCommAmt] = useState("");

  // Owner freeze dialog
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [freezeTarget, setFreezeTarget] = useState<{ type: "bd" | "user"; id: string; name: string } | null>(null);
  const [freezeReason, setFreezeReason] = useState("");

  // Owner edit financials dialog
  const [editFinAccount, setEditFinAccount] = useState<any | null>(null);
  const [editBalanceUsd, setEditBalanceUsd] = useState("");
  const [editTotalEarnings, setEditTotalEarnings] = useState("");
  const [editFinLoading, setEditFinLoading] = useState(false);

  // Global settings
  const [globalSettings, setGlobalSettings] = useState<Record<string, boolean>>({
    works_wallets_enabled: true,
    works_instant_commission: true,
    works_page_enabled: true,
  });
  const [globalSupporterPct, setGlobalSupporterPct] = useState("");
  const [globalAgentPct, setGlobalAgentPct] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Suspended accounts
  const [suspendedAccounts, setSuspendedAccounts] = useState<any[]>([]);

  // Commission logs
  const [commissionLogs, setCommissionLogs] = useState<any[]>([]);
  const [selectedCommBd, setSelectedCommBd] = useState<string | null>(null);

  // BD Notification
  const [notifSubTab, setNotifSubTab] = useState<"send_all" | "send_one" | "history">("send_all");
  const [notifTarget, setNotifTarget] = useState("all");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [notifHistory, setNotifHistory] = useState<any[]>([]);

  // UUID Search
  const [uuidSearch, setUuidSearch] = useState("");
  const [uuidSearchLoading, setUuidSearchLoading] = useState(false);
  const [uuidSearchResults, setUuidSearchResults] = useState<{ account: any; member: any; earnings: any[] } | null>(null);

  const searchByUuid = useCallback(async () => {
    const uuid = uuidSearch.trim();
    if (!uuid) return;
    setUuidSearchLoading(true);
    setUuidSearchResults(null);
    try {
      const [accRes, memRes, earnRes] = await Promise.all([
        supabase.from("works_accounts").select("*").eq("user_uuid", uuid).maybeSingle(),
        supabase.from("works_members" as any).select("*").eq("user_uuid", uuid).maybeSingle(),
        supabase.from("works_earnings" as any).select("*").eq("user_uuid", uuid).order("created_at", { ascending: false }).limit(10),
      ]);
      setUuidSearchResults({
        account: accRes.data || null,
        member: memRes.data || null,
        earnings: earnRes.data || [],
      });
    } catch { toast.error("فشل البحث"); }
    setUuidSearchLoading(false);
  }, [uuidSearch]);

  // Portal ban
  const [portalBanUuid, setPortalBanUuid] = useState("");
  const [portalBanType, setPortalBanType] = useState<"full" | "service">("full");
  const [portalBanService, setPortalBanService] = useState("salary");
  const [portalBanDuration, setPortalBanDuration] = useState("30d");
  const [portalBanReason, setPortalBanReason] = useState("");
  const [portalBanLoading, setPortalBanLoading] = useState(false);
  const [portalBans, setPortalBans] = useState<any[]>([]);

  const fetchGlobalSettings = useCallback(async () => {
    const keys = ["works_wallets_enabled", "works_instant_commission", "works_page_enabled", "global_supporter_commission_pct", "global_agent_commission_pct"];
    const { data } = await supabase.from("app_settings").select("key, value").in("key", keys);
    if (data) {
      const map: Record<string, boolean> = {};
      data.forEach((r: any) => {
        if (r.key.startsWith("global_")) return;
        map[r.key] = r.value !== "false";
      });
      setGlobalSettings(prev => ({ ...prev, ...map }));
      const supPct = data.find((r: any) => r.key === "global_supporter_commission_pct");
      const agPct = data.find((r: any) => r.key === "global_agent_commission_pct");
      if (supPct) setGlobalSupporterPct(supPct.value);
      if (agPct) setGlobalAgentPct(agPct.value);
    }
  }, []);

  const toggleGlobalSetting = async (key: string) => {
    setSettingsLoading(true);
    const newVal = !globalSettings[key];
    const { error } = await supabase.from("app_settings").upsert({ key, value: String(newVal), updated_at: new Date().toISOString() });
    if (error) { toast.error("فشل التحديث"); } else {
      setGlobalSettings(prev => ({ ...prev, [key]: newVal }));
      toast.success(`تم ${newVal ? "تفعيل" : "إيقاف"} الإعداد`);
    }
    setSettingsLoading(false);
  };

  const applyGlobalCommission = async () => {
    const supPct = parseFloat(globalSupporterPct);
    const agPct = parseFloat(globalAgentPct);
    if (isNaN(supPct) || isNaN(agPct) || supPct < 0 || supPct > 100 || agPct < 0 || agPct > 100) { toast.error("نسبة غير صالحة"); return; }
    setSettingsLoading(true);
    try {
      for (const a of accounts) {
        await adminCall("works_update_account", { id: a.id, supporter_commission_pct: supPct, agent_commission_pct: agPct });
      }
      // Save to app_settings
      await supabase.from("app_settings").upsert({ key: "global_supporter_commission_pct", value: String(supPct), updated_at: new Date().toISOString() });
      await supabase.from("app_settings").upsert({ key: "global_agent_commission_pct", value: String(agPct), updated_at: new Date().toISOString() });
      toast.success(`تم تعديل النسب — داعمين: ${supPct}% / وكلاء: ${agPct}%`);
      fetchAccounts();
    } catch { toast.error("فشل التحديث"); }
    setSettingsLoading(false);
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try { const d = await adminCall("works_list_requests"); setRequests(d || []); } catch { }
    setLoading(false);
  }, [adminCall]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try { const d = await adminCall("works_list_accounts"); setAccounts(d || []); } catch { }
    setLoading(false);
  }, [adminCall]);

  const [memberSalaryLoading] = useState(false); // kept for backward compat
  const [dynamicAccountEarnings, setDynamicAccountEarnings] = useState<number>(0);
  const [supporterDynamicEarnings, setSupporterDynamicEarnings] = useState<number>(0);
  const [agentDynamicEarnings, setAgentDynamicEarnings] = useState<number>(0);
  const [refreshingMemberId, setRefreshingMemberId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);

  const fetchMembers = useCallback(async (wid: string) => {
    setLoading(true);
    setDynamicAccountEarnings(0);
    setSupporterDynamicEarnings(0);
    setAgentDynamicEarnings(0);
    try {
      const d = await adminCall("works_get_members", { works_id: wid });
      if (d && d.members) {
        setMembers(d.members);
        setDynamicAccountEarnings(d.dynamic_earnings ?? 0);
        setSupporterDynamicEarnings(d.supporter_dynamic_earnings ?? 0);
        setAgentDynamicEarnings(d.agent_dynamic_earnings ?? 0);
        setAccounts(prev => prev.map(a => a.id === wid ? { ...a, dynamic_earnings: d.dynamic_earnings ?? 0, total_earnings_usd: d.dynamic_earnings ?? 0 } : a));
      } else {
        setMembers(d || []);
      }
    } catch { }
    setLoading(false);
  }, [adminCall]);

  const refreshSingleMember = useCallback(async (memberId: string) => {
    setRefreshingMemberId(memberId);
    try {
      const d = await adminCall("works_refresh_member", { member_id: memberId });
      if (d && !d.error) {
        setMembers(prev => {
          const updated = prev.map(m => m.id === memberId ? { ...d, needs_refresh: false } : m);
          // Recalculate totals
          let total = 0, sup = 0, agt = 0;
          for (const m of updated) {
            const v = Number(m.live_commission || 0);
            total += v;
            if (m.member_type === "supporter") sup += v;
            if (m.member_type === "agent") agt += v;
          }
          setDynamicAccountEarnings(Math.round(total * 100) / 100);
          setSupporterDynamicEarnings(Math.round(sup * 100) / 100);
          setAgentDynamicEarnings(Math.round(agt * 100) / 100);
          return updated;
        });
      } else {
        toast.error("فشل تحديث البيانات");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setRefreshingMemberId(null);
  }, [adminCall]);

  const refreshAllMembers = useCallback(async () => {
    const activeMembers = members.filter(m => m.status === "active");
    if (activeMembers.length === 0) return;
    setRefreshingAll(true);
    for (const m of activeMembers) {
      await refreshSingleMember(m.id);
      if (activeMembers.indexOf(m) < activeMembers.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    setRefreshingAll(false);
    toast.success("تم تحديث جميع الأعضاء");
  }, [members, refreshSingleMember]);



  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try { const d = await adminCall("works_list_withdrawals"); setWithdrawals(d || []); } catch { }
    setLoading(false);
  }, [adminCall]);

  const fetchSuspended = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("login_attempts")
        .select("*")
        .or("is_permanently_blocked.eq.true,blocked_until.gt." + new Date().toISOString())
        .order("updated_at", { ascending: false });
      setSuspendedAccounts(data || []);
    } catch { }
  }, []);

  const fetchCommissionLogs = useCallback(async (bdUuid: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("works_commission_logs" as any)
        .select("*")
        .eq("bd_uuid", bdUuid)
        .order("created_at", { ascending: false })
        .limit(50);
      setCommissionLogs(data || []);
    } catch { }
    setLoading(false);
  }, []);

  const fetchNotifHistory = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("works_notifications" as any)
        .select("*")
        .eq("type", "admin_message")
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifHistory(data || []);
    } catch { }
  }, []);

  const fetchPortalBans = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("portal_bans")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setPortalBans(data || []);
    } catch { }
  }, []);

  useEffect(() => {
    if (tab === "requests") fetchRequests();
    else if (tab === "accounts") fetchAccounts();
    else if (tab === "withdrawals") fetchWithdrawals();
    else if (tab === "settings") { fetchAccounts(); fetchGlobalSettings(); fetchSuspended(); }
    else if (tab === "commissions") fetchAccounts();
    else if (tab === "notify") { fetchAccounts(); fetchNotifHistory(); }
    else if (tab === "portal_ban") fetchPortalBans();
  }, [tab]);

  const approveRequest = async (id: string) => {
    if (processingId) return; setProcessingId(id);
    try { await adminCall("works_approve_request", { id }); toast.success("تم القبول"); fetchRequests(); }
    catch { toast.error("فشل"); }
    setProcessingId(null);
  };

  const rejectRequest = async (id: string) => {
    if (processingId) return; setProcessingId(id);
    try { await adminCall("works_reject_request", { id, reason: rejectReason || "تم الرفض" }); toast.success("تم الرفض"); fetchRequests(); }
    catch { toast.error("فشل"); }
    setProcessingId(null); setRejectReason("");
  };

  const approveWithdrawal = async (id: string) => {
    if (processingId) return; setProcessingId(id);
    try { await adminCall("works_approve_withdrawal", { id }); toast.success("تم قبول السحب"); fetchWithdrawals(); }
    catch { toast.error("فشل"); }
    setProcessingId(null);
  };

  const rejectWithdrawal = async (id: string) => {
    if (processingId) return; setProcessingId(id);
    try { await adminCall("works_reject_withdrawal", { id, reason: rejectReason || "تم الرفض" }); toast.success("تم الرفض"); fetchWithdrawals(); }
    catch { toast.error("فشل"); }
    setProcessingId(null); setRejectReason("");
  };

  const updateAccount = async (id: string, updates: any) => {
    try { await adminCall("works_update_account", { id, ...updates }); toast.success("تم التحديث"); fetchAccounts(); }
    catch { toast.error("فشل"); }
  };

  const removeMember = async (id: string) => {
    try {
      // Delete from bd_members entirely
      await adminCall("works_remove_member", { id });
      toast.success("تم إزالة العضو");
      if (selectedWorksId) fetchMembers(selectedWorksId);
    } catch {
      try { await adminCall("works_update_member", { id, status: "removed" }); toast.success("تم الإزالة"); if (selectedWorksId) fetchMembers(selectedWorksId); }
      catch { toast.error("فشل"); }
    }
  };

  const unblockAccount = async (id: string) => {
    try {
      await supabase.from("login_attempts").update({
        failed_attempts: 0,
        blocked_until: null,
        is_permanently_blocked: false,
        admin_unblocked_at: new Date().toISOString(),
      } as any).eq("id", id);
      toast.success("تم إعادة التفعيل");
      fetchSuspended();
    } catch { toast.error("فشل"); }
  };

  const deleteSuspendedAccount = async (id: string) => {
    try {
      await supabase.from("login_attempts").delete().eq("id", id);
      toast.success("تم الحذف");
      fetchSuspended();
    } catch { toast.error("فشل"); }
  };

  // Send BD notification
  const sendBdNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast.error("أدخل العنوان والنص");
      return;
    }
    setNotifSending(true);
    try {
      await supabase.from("works_notifications" as any).insert({
        target_uuid: notifTarget,
        title: notifTitle.trim(),
        body: notifBody.trim(),
        type: "admin_message",
        is_read: false,
        is_dismissed: false,
        sent_by: adminUsername,
      });
      toast.success("تم إرسال الإشعار");
      setNotifTitle("");
      setNotifBody("");
      setNotifTarget("all");
      fetchNotifHistory();
    } catch { toast.error("فشل الإرسال"); }
    setNotifSending(false);
  };

  // Portal ban
  const executePortalBan = async () => {
    if (!portalBanUuid.trim()) { toast.error("أدخل UUID"); return; }
    setPortalBanLoading(true);
    try {
      const durationMap: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720, "permanent": 999999 };
      const hours = durationMap[portalBanDuration] || 720;
      const expiresAt = portalBanDuration === "permanent" ? null : new Date(Date.now() + hours * 3600000).toISOString();

      await supabase.from("portal_bans").insert({
        uuid: portalBanUuid.trim(),
        ban_type: portalBanType,
        service: portalBanType === "service" ? portalBanService : null,
        duration: portalBanDuration,
        reason: portalBanReason || "حظر بوابة",
        banned_by: adminUsername,
        expires_at: expiresAt,
        is_active: true,
      });
      toast.success("تم حظر المستخدم من البوابة");
      setPortalBanUuid("");
      setPortalBanReason("");
      fetchPortalBans();
    } catch { toast.error("فشل الحظر"); }
    setPortalBanLoading(false);
  };

  const removePortalBan = async (id: string) => {
    try {
      await supabase.from("portal_bans").update({ is_active: false }).eq("id", id);
      toast.success("تم فك الحظر");
      fetchPortalBans();
    } catch { toast.error("فشل"); }
  };

  // Edit member total commission
  const handleEditMemberCommission = async () => {
    if (!editMemberCommAmt) return;
    const newAmt = parseFloat(editNewCommAmt);
    if (isNaN(newAmt) || newAmt < 0) { toast.error("مبلغ غير صالح"); return; }
    try {
      const oldAmt = editMemberCommAmt.total_commission_usd || editMemberCommAmt.total_commission || 0;
      const diff = newAmt - oldAmt;
      await adminCall("works_update_member", { id: editMemberCommAmt.id, total_commission_usd: newAmt });
      toast.success(`تم تعديل العمولة: $${oldAmt.toFixed(2)} → $${newAmt.toFixed(2)} (فرق: ${diff >= 0 ? '+' : ''}$${diff.toFixed(2)})`);
      setEditMemberCommAmt(null);
      if (selectedWorksId) fetchMembers(selectedWorksId);
    } catch { toast.error("فشل التعديل"); }
  };

  // === Owner-only actions ===
  const handleManualAdd = async () => {
    if (!manualTargetUuid.trim() || !manualTargetWorksId) {
      toast.error("أدخل UUID العضو واختر حساب البيدي");
      return;
    }
    setManualAddLoading(true);
    try {
      await adminCall("works_manual_add_member", {
        works_id: manualTargetWorksId,
        member_uuid: manualTargetUuid.trim(),
        member_type: manualAddType,
      });
      toast.success("تم إضافة العضو يدوياً");
      setShowManualAdd(false);
      setManualTargetUuid("");
      if (selectedWorksId) fetchMembers(selectedWorksId);
    } catch (err: any) {
      toast.error(err?.message || "فشلت الإضافة");
    }
    setManualAddLoading(false);
  };

  const handleEditCommission = async () => {
    if (!editMember) return;
    const pct = parseFloat(editCommission);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("نسبة غير صالحة (0-100)");
      return;
    }
    try {
      await adminCall("works_update_member", { id: editMember.id, commission_pct: pct });
      toast.success("تم تحديث النسبة");
      setEditMember(null);
      if (selectedWorksId) fetchMembers(selectedWorksId);
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    }
  };

  const handleFreeze = async () => {
    if (!freezeTarget) return;
    try {
      if (freezeTarget.type === "bd") {
        await adminCall("works_update_account", { id: freezeTarget.id, status: "frozen", freeze_reason: freezeReason || "تجميد بواسطة المالك" });
        toast.success("تم تجميد حساب البيدي");
        fetchAccounts();
      } else {
        await supabase.from("manual_bans").insert({
          target_uuid: freezeTarget.id,
          ban_type: "service_freeze",
          reason: freezeReason || "تجميد خدمات بواسطة المالك",
          banned_by: "naz",
          duration_hours: 8760,
          banned_elements: ["services"],
        });
        toast.success("تم تجميد خدمات المستخدم");
      }
      setShowFreezeDialog(false);
      setFreezeTarget(null);
      setFreezeReason("");
    } catch (err: any) {
      toast.error(err?.message || "فشل التجميد");
    }
  };

  const handleEditFinancials = async () => {
    if (!editFinAccount) return;
    setEditFinLoading(true);
    try {
      const updates: Record<string, number> = {};
      const newBalance = parseFloat(editBalanceUsd);
      const newEarnings = parseFloat(editTotalEarnings);
      if (!isNaN(newBalance)) updates.balance_usd = newBalance;
      if (!isNaN(newEarnings)) updates.total_earnings_usd = newEarnings;
      if (Object.keys(updates).length === 0) { toast.error("لا توجد تعديلات"); setEditFinLoading(false); return; }
      await adminCall("works_update_account", { id: editFinAccount.id, ...updates });
      toast.success("تم تحديث البيانات المالية");
      setEditFinAccount(null);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    }
    setEditFinLoading(false);
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  const services = [
    { value: "salary", label: "سحب راتب" },
    { value: "vip", label: "VIP" },
    { value: "id_change", label: "تغيير آيدي" },
    { value: "frames", label: "إطارات" },
    { value: "entries", label: "دخوليات" },
    { value: "gifts", label: "هدايا" },
    { value: "instant", label: "سحب فوري" },
    { value: "charge", label: "شحن كوينزات" },
  ];

  return (
    <AdminPageLayout title="إدارة البيدي" onLogout={handleLogout}>
      <div className="max-w-3xl mx-auto p-4" dir="rtl">

        {/* Owner-only toolbar */}
        {isOwner && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl bg-destructive/5 border border-destructive/10">
            <Shield className="w-4 h-4 text-destructive" />
            <span className="text-[10px] text-destructive font-bold">صلاحيات المالك</span>
            <div className="flex-1" />
            <button onClick={() => setShowManualAdd(true)}
              className="text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Plus className="w-3 h-3" /> إضافة يدوية
            </button>
            <button onClick={() => { setShowFreezeDialog(true); setFreezeTarget(null); }}
              className="text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20">
              <Lock className="w-3 h-3" /> تجميد
            </button>
          </div>
        )}

        {/* UUID Search */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="بحث UUID..."
            value={uuidSearch}
            onChange={e => { setUuidSearch(e.target.value); if (!e.target.value.trim()) setUuidSearchResults(null); }}
            onKeyDown={e => { if (e.key === "Enter") searchByUuid(); }}
            dir="ltr"
            className="flex-1 h-10 rounded-xl text-sm"
          />
          <button
            onClick={searchByUuid}
            disabled={uuidSearchLoading || !uuidSearch.trim()}
            className="h-10 px-4 rounded-xl text-xs font-bold bg-primary/10 text-primary disabled:opacity-50 flex items-center gap-1"
          >
            {uuidSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
          </button>
        </div>

        {/* UUID Search Results */}
        {uuidSearchResults && (
          <div className="mb-4 space-y-3 p-4 rounded-2xl border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">نتائج البحث: {uuidSearch}</p>
              <button onClick={() => { setUuidSearchResults(null); setUuidSearch(""); }} className="text-[10px] text-muted-foreground">✕ إغلاق</button>
            </div>

            {/* BD Account */}
            <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] font-bold text-primary">حساب البيدي</p>
              {uuidSearchResults.account ? (
                <div className="text-[10px] space-y-0.5">
                  <p>الاسم: <span className="font-bold">{uuidSearchResults.account.user_name || "—"}</span></p>
                  <p>الكود: <span className="font-bold">{uuidSearchResults.account.works_code || "—"}</span></p>
                  <p>الحالة: <span className="font-bold">{uuidSearchResults.account.status}</span></p>
                  <p>الرصيد: <span className="font-bold">${Number(uuidSearchResults.account.balance_usd || 0).toFixed(2)}</span></p>
                </div>
              ) : <p className="text-[10px] text-muted-foreground">لا يوجد حساب بيدي</p>}
            </div>

            {/* Membership */}
            <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] font-bold text-cyan-400">العضوية</p>
              {uuidSearchResults.member ? (
                <div className="text-[10px] space-y-0.5">
                  <p>النوع: <span className="font-bold">{uuidSearchResults.member.member_type === "supporter" ? "داعم" : "وكيل"}</span></p>
                  <p>الحالة: <span className="font-bold">{uuidSearchResults.member.status}</span></p>
                  <p>النسبة: <span className="font-bold">{uuidSearchResults.member.commission_pct || 0}%</span></p>
                </div>
              ) : <p className="text-[10px] text-muted-foreground">لا توجد عضوية</p>}
            </div>

            {/* Earnings */}
            <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] font-bold text-emerald-400">الأرباح</p>
              {uuidSearchResults.earnings.length > 0 ? (
                <div className="text-[10px] space-y-1">
                  {uuidSearchResults.earnings.map((e: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>{new Date(e.created_at).toLocaleDateString("ar-EG")}</span>
                      <span className="font-bold text-emerald-400">${Number(e.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[10px] text-muted-foreground">لا توجد أرباح</p>}
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4 mb-2">
            <TabsTrigger value="requests">الطلبات</TabsTrigger>
            <TabsTrigger value="accounts">الحسابات</TabsTrigger>
            <TabsTrigger value="withdrawals">السحوبات</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="commissions" className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> العمولات
            </TabsTrigger>
            <TabsTrigger value="notify" className="flex items-center gap-1">
              <Bell className="w-3 h-3" /> تنبيهات
            </TabsTrigger>
            <TabsTrigger value="portal_ban" className="flex items-center gap-1">
              <Ban className="w-3 h-3" /> حظر البوابة
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-1" disabled={!selectedWorksId}>
              <Users className="w-3 h-3" /> الأعضاء
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests">
            {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <div className="space-y-3">
                {requests.filter(r => r.status === "pending").length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-10">لا توجد طلبات معلقة</p>
                )}
                {requests.filter(r => r.status === "pending").map(r => (
                  <div key={r.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold">{r.user_name || "—"}</span>
                        <p className="text-[10px] text-muted-foreground font-mono">UUID: {r.user_uuid}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">مستوى {r.user_level}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar")}</p>
                    <div className="flex gap-2">
                      <button onClick={() => approveRequest(r.id)} disabled={!!processingId}
                        className="flex-1 bg-emerald-500 text-black py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                        {processingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} قبول
                      </button>
                      <button onClick={() => rejectRequest(r.id)} disabled={!!processingId}
                        className="flex-1 bg-destructive/10 text-destructive py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                        <X className="w-3 h-3" /> رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts">
            {/* Stats Cards */}
            {!loading && accounts.length > 0 && (() => {
              const totalEarnings = accounts.reduce((s: number, a: any) => s + Number(a.dynamic_earnings ?? a.total_earnings_usd ?? 0), 0);
              const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.balance_usd || 0), 0);
              const activeCount = accounts.filter((a: any) => a.status === "active").length;
              const totalSupporters = accounts.reduce((s: number, a: any) => s + Number(a.supporter_count ?? 0), 0);
              const totalAgents = accounts.reduce((s: number, a: any) => s + Number(a.agent_count ?? 0), 0);
              return (
                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-emerald-400">${totalEarnings.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">إجمالي الأرباح</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-blue-400">{activeCount}</p>
                      <p className="text-[10px] text-muted-foreground">حسابات نشطة</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-purple-400">${totalBalance.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">الأرصدة</p>
                    </div>
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-cyan-400">{totalSupporters}</p>
                      <p className="text-[10px] text-muted-foreground">داعمين</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-amber-400">{totalAgents}</p>
                      <p className="text-[10px] text-muted-foreground">وكلاء</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <div className="space-y-3">
                {accounts.length === 0 && <p className="text-center text-muted-foreground text-sm py-10">لا توجد حسابات</p>}
                {accounts.map(a => {
                  const earnings = Number(a.dynamic_earnings ?? a.total_earnings_usd ?? 0);
                  const balance = Number(a.available_balance || a.balance_usd || 0);
                  const supCount = Number(a.supporter_count ?? 0);
                  const agCount = Number(a.agent_count ?? 0);
                  const supPct = Number(a.supporter_pct ?? a.supporter_commission_pct ?? 0);
                  const agPct = Number(a.agent_pct ?? a.agent_commission_pct ?? 0);
                  return (
                    <div key={a.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between p-3 border-b border-border/50">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black truncate">{a.user_name || "—"}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold">{a.works_code}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">UUID: {a.user_uuid}</p>
                          {a.updated_at && <WorksCountdown updatedAt={a.updated_at} compact />}
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-xl font-black text-emerald-400">${earnings.toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground text-center">أرباح الشهر</p>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-4 divide-x divide-border/30 rtl:divide-x-reverse">
                        <div className="p-2.5 text-center">
                          <p className="text-base font-black text-cyan-400">{supCount}</p>
                          <p className="text-[9px] text-muted-foreground">داعمين</p>
                          <p className="text-[8px] text-cyan-400/60">{supPct}%</p>
                        </div>
                        <div className="p-2.5 text-center">
                          <p className="text-base font-black text-amber-400">{agCount}</p>
                          <p className="text-[9px] text-muted-foreground">وكلاء</p>
                          <p className="text-[8px] text-amber-400/60">{agPct}%</p>
                        </div>
                        <div className="p-2.5 text-center">
                          <p className="text-base font-black text-purple-400">${balance.toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground">الرصيد</p>
                        </div>
                        <div className="p-2.5 text-center">
                          <Badge variant={a.status === "active" ? "default" : "destructive"} className="text-[8px] px-1.5">
                            {a.status === "active" ? "نشط" : "معلق"}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5 p-2 border-t border-border/30">
                        <button onClick={async () => {
                          setSelectedWorksId(a.id);
                          setTab("members");
                          await fetchMembers(a.id);
                        }}
                          className="flex-1 bg-primary/10 text-primary py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5" /> الأعضاء
                        </button>
                        <button onClick={() => updateAccount(a.id, { status: a.status === "active" ? "suspended" : "active" })}
                          className={`px-3 py-2 rounded-xl text-[11px] font-bold ${a.status === "active" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {a.status === "active" ? "تعليق" : "تفعيل"}
                        </button>
                        {isOwner && (
                          <>
                            <button onClick={() => { setFreezeTarget({ type: "bd", id: a.id, name: a.user_name || a.works_code }); setShowFreezeDialog(true); }}
                              className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-destructive/10 text-destructive">
                              <Lock className="w-3 h-3" />
                            </button>
                            <button onClick={() => {
                              setEditFinAccount(a);
                              setEditBalanceUsd(String(Number(a.balance_usd || 0)));
                              setEditTotalEarnings(String(Number(a.total_earnings_usd || 0)));
                            }}
                              className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-amber-500/10 text-amber-400">
                              <Pencil className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <div className="space-y-3">
                {withdrawals.filter(w => w.status === "pending").length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-10">لا توجد سحوبات معلقة</p>
                )}
                {withdrawals.filter(w => w.status === "pending").map(w => (
                  <div key={w.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">${Number(w.amount_usd).toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">{Number(w.amount_coins).toLocaleString()} كوينز</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">المستلم: {w.recipient_uuid}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString("ar")}</p>
                    <div className="flex gap-2">
                      <button onClick={() => approveWithdrawal(w.id)} disabled={!!processingId}
                        className="flex-1 bg-emerald-500 text-black py-2 rounded-xl text-xs font-bold disabled:opacity-50">
                        {processingId === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "قبول"}
                      </button>
                      <button onClick={() => rejectWithdrawal(w.id)} disabled={!!processingId}
                        className="flex-1 bg-destructive/10 text-destructive py-2 rounded-xl text-xs font-bold disabled:opacity-50">
                        رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab — now includes suspended accounts */}
          <TabsContent value="settings">
            <div className="space-y-4">
              {/* Global Controls */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">إعدادات عامة</span>
                </div>
                {[
                  { key: "works_wallets_enabled", label: "المحافظ / السحب", desc: "تمكين أو إيقاف السحب لجميع حسابات البيدي", icon: <DollarSign className="w-4 h-4" /> },
                  { key: "works_instant_commission", label: "احتساب العمولة الفوري", desc: "تفعيل أو إيقاف حساب العمولات التلقائي", icon: <Calculator className="w-4 h-4" /> },
                  { key: "works_page_enabled", label: "صفحة البيدي", desc: "إخفاء أو إظهار صفحة البيدي لجميع المستخدمين", icon: <Ban className="w-4 h-4" /> },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${globalSettings[item.key] ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleGlobalSetting(item.key)}
                      disabled={settingsLoading}
                      className={`relative w-11 h-6 rounded-full transition-colors ${globalSettings[item.key] ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${globalSettings[item.key] ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}

                {/* Dual commission rates */}
                <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-400" />
                    <p className="text-xs font-bold">تعديل النسب للكل</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground">نسبة كل الداعمين %</label>
                      <Input type="number" value={globalSupporterPct} onChange={e => setGlobalSupporterPct(e.target.value)}
                        placeholder="2" dir="ltr" className="h-8 text-xs mt-1" min="0" max="100" step="0.5" />
                      <p className="text-[9px] text-muted-foreground mt-0.5">تنطبق على جميع الداعمين</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">نسبة كل الوكلاء %</label>
                      <Input type="number" value={globalAgentPct} onChange={e => setGlobalAgentPct(e.target.value)}
                        placeholder="3" dir="ltr" className="h-8 text-xs mt-1" min="0" max="100" step="0.5" />
                      <p className="text-[9px] text-muted-foreground mt-0.5">تنطبق على جميع الوكلاء</p>
                    </div>
                  </div>
                  <button onClick={applyGlobalCommission} disabled={settingsLoading || (!globalSupporterPct && !globalAgentPct)}
                    className="w-full px-4 h-8 rounded-xl text-xs font-bold disabled:opacity-50 bg-amber-500 text-black">
                    {settingsLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "تطبيق على الكل"}
                  </button>
                </div>

                {/* Merge BD Data Button */}
                {isOwner && (
                  <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                    <p className="text-xs font-bold text-amber-400">دمج البيانات القديمة</p>
                    <p className="text-[10px] text-muted-foreground">نقل حسابات وأعضاء bd_ إلى works_ (لمرة واحدة)</p>
                    <button
                      onClick={async () => {
                        setSettingsLoading(true);
                        try {
                          const res = await adminCall("works_merge_bd_data");
                          toast.success(`تم الدمج: ${res.accounts_merged} حساب + ${res.members_merged} عضو`);
                          fetchAccounts();
                        } catch { toast.error("فشل الدمج"); }
                        setSettingsLoading(false);
                      }}
                      disabled={settingsLoading}
                      className="w-full px-4 h-8 rounded-xl text-xs font-bold disabled:opacity-50 bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    >
                      {settingsLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "🔄 دمج الآن"}
                    </button>
                  </div>
                )}
              </div>

              {/* Per-account settings */}
              <p className="text-xs text-muted-foreground">إعدادات حسابات فردية:</p>
              {accounts.map(a => (
                <div key={a.id} className="bg-card border border-border rounded-xl p-3 space-y-3">
                  <div>
                    <p className="text-sm font-bold">{a.user_name || a.works_code}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">UUID: {a.user_uuid}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground">عمولة الداعمين %</label>
                      <Input type="number" defaultValue={a.supporter_commission_pct} className="h-8 text-xs"
                        onBlur={e => updateAccount(a.id, { supporter_commission_pct: parseFloat(e.target.value) })} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">عمولة الوكلاء %</label>
                      <Input type="number" defaultValue={a.agent_commission_pct} className="h-8 text-xs"
                        onBlur={e => updateAccount(a.id, { agent_commission_pct: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => updateAccount(a.id, { can_withdraw: !a.can_withdraw })}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold ${a.can_withdraw ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                      السحب: {a.can_withdraw ? "مفعّل" : "معطّل"}
                    </button>
                  </div>
                </div>
              ))}

              {/* Suspended accounts — moved here from separate tab */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldOff className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-bold">حسابات متوقفة</span>
                  {suspendedAccounts.length > 0 && <span className="bg-destructive text-destructive-foreground text-[8px] px-1.5 rounded-full">{suspendedAccounts.length}</span>}
                </div>
                {suspendedAccounts.length === 0 ? (
                  <div className="text-center py-6">
                    <Check className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                    <p className="text-xs text-muted-foreground">لا توجد حسابات متوقفة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suspendedAccounts.map(sa => (
                      <div key={sa.id} className="border border-destructive/20 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold font-mono">{sa.target_uuid}</span>
                            <p className="text-[9px] text-muted-foreground">السبب: {sa.failed_attempts} محاولات تسجيل فاشلة</p>
                          </div>
                          <Badge variant="destructive" className="text-[9px]">
                            {sa.is_permanently_blocked ? "دائم" : "مؤقت"}
                          </Badge>
                        </div>
                        {sa.blocked_until && <p className="text-[10px] text-muted-foreground">تاريخ الإيقاف: {formatDate(sa.blocked_until)}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => unblockAccount(sa.id)}
                            className="flex-1 bg-emerald-500/10 text-emerald-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                            <ShieldOff className="w-3 h-3" /> فك التوقيف
                          </button>
                          <button onClick={() => deleteSuspendedAccount(sa.id)}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-destructive/10 text-destructive flex items-center justify-center gap-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            {!selectedCommBd ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-2">اختر حساب بيدي لعرض عمولاته:</p>
                {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                  accounts.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-10">لا توجد حسابات</p>
                  ) : accounts.map(a => (
                    <button key={a.id} onClick={() => { setSelectedCommBd(a.user_uuid); fetchCommissionLogs(a.user_uuid); }}
                      className="w-full bg-card border border-border rounded-xl p-3 text-right hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold">{a.user_name || "—"}</span>
                          <p className="text-[10px] text-muted-foreground font-mono">UUID: {a.user_uuid}</p>
                        </div>
                        <BarChart3 className="w-4 h-4 text-primary" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    عمولات: {selectedCommBd}
                  </h3>
                  <button onClick={() => { setSelectedCommBd(null); setCommissionLogs([]); }}
                    className="text-xs text-muted-foreground">← رجوع</button>
                </div>
                {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                  commissionLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-10">لا توجد سجلات عمولة</p>
                  ) : (
                    <>
                      <div className="bg-card border border-emerald-500/20 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground">إجمالي هذا الشهر</p>
                        <p className="text-xl font-bold text-emerald-400">
                          {commissionLogs.reduce((s, l) => s + (l.amount || 0), 0).toLocaleString()} كوينز
                        </p>
                      </div>
                      <div className="space-y-2">
                        {commissionLogs.map(log => (
                          <div key={log.id} className="bg-card border border-border rounded-xl p-3">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold">{log.member_uuid}</span>
                              <span className="font-bold text-emerald-400">+{(log.amount || 0).toLocaleString()} ك</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                              <span>{log.member_type === "supporter" ? "داعم" : "وكيل"} • {log.commission_pct}%</span>
                              <span>مبلغ: {(log.source_amount || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-1">{formatDate(log.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                )}
              </div>
            )}
          </TabsContent>

          {/* Notification Tab — 3 sections */}
          <TabsContent value="notify">
            <div className="space-y-4">
              {/* Sub-tabs */}
              <div className="flex gap-1 rounded-xl bg-muted/30 p-1">
                {[
                  { key: "send_all" as const, label: "إرسال للكل", icon: <Send className="w-3 h-3" /> },
                  { key: "send_one" as const, label: "إرسال لحساب", icon: <Bell className="w-3 h-3" /> },
                  { key: "history" as const, label: "السجل", icon: <History className="w-3 h-3" /> },
                ].map(t => (
                  <button key={t.key} onClick={() => setNotifSubTab(t.key)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${notifSubTab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {notifSubTab === "send_all" && (
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-bold">إرسال تنبيه لجميع البيدي</p>
                  <Input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="العنوان" />
                  <Textarea value={notifBody} onChange={e => setNotifBody(e.target.value)} placeholder="نص الإشعار..." className="min-h-[80px]" />
                  <button onClick={() => { setNotifTarget("all"); sendBdNotification(); }} disabled={notifSending || !notifTitle.trim() || !notifBody.trim()}
                    className="w-full h-10 rounded-xl text-sm font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
                    {notifSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> إرسال للجميع</>}
                  </button>
                </div>
              )}

              {notifSubTab === "send_one" && (
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-bold">إرسال تنبيه لحساب بيدي محدد</p>
                  <div>
                    <label className="text-xs text-muted-foreground">اختر البيدي</label>
                    <select value={notifTarget} onChange={e => setNotifTarget(e.target.value)}
                      className="w-full h-10 rounded-xl bg-muted/30 border border-border/50 text-sm px-3 mt-1">
                      <option value="">اختر...</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.user_uuid}>{a.user_name || a.works_code}</option>
                      ))}
                    </select>
                  </div>
                  <Input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="العنوان" />
                  <Textarea value={notifBody} onChange={e => setNotifBody(e.target.value)} placeholder="نص الإشعار..." className="min-h-[60px]" />
                  <button onClick={sendBdNotification} disabled={notifSending || !notifTitle.trim() || !notifBody.trim() || !notifTarget || notifTarget === "all"}
                    className="w-full h-10 rounded-xl text-sm font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
                    {notifSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> إرسال</>}
                  </button>
                </div>
              )}

              {notifSubTab === "history" && (
                <div className="space-y-2">
                  <p className="text-sm font-bold flex items-center gap-2"><History className="w-4 h-4 text-primary" /> سجل التنبيهات</p>
                  {notifHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-10">لا توجد تنبيهات سابقة</p>
                  ) : notifHistory.map(n => (
                    <div key={n.id} className="bg-card border border-border rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{n.title}</span>
                        <span className="text-[9px] text-muted-foreground">{n.target_uuid === "all" ? "للجميع" : `لـ ${n.target_uuid}`}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{n.body}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">{formatDate(n.created_at)} — أرسله: {n.sent_by || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Portal Ban Tab */}
          <TabsContent value="portal_ban">
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-bold">حظر البوابة</span>
                </div>
                <p className="text-[10px] text-muted-foreground">حظر مستخدم من استخدام خدمات البوابة (galachatpay) فقط — مو من غلا لايف</p>

                <Input value={portalBanUuid} onChange={e => setPortalBanUuid(e.target.value)}
                  placeholder="UUID المستخدم" dir="ltr" />

                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">نوع الحظر</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPortalBanType("full")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border ${portalBanType === "full" ? "border-destructive bg-destructive/10 text-destructive" : "border-border/50 text-muted-foreground"}`}>
                      حظر كامل
                    </button>
                    <button onClick={() => setPortalBanType("service")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border ${portalBanType === "service" ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground"}`}>
                      حظر خدمة
                    </button>
                  </div>
                </div>

                {portalBanType === "service" && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">اختر الخدمة</p>
                    <select value={portalBanService} onChange={e => setPortalBanService(e.target.value)}
                      className="w-full h-9 rounded-xl bg-muted/30 border border-border/50 text-xs px-3">
                      {services.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">المدة</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "24h", label: "24 ساعة" },
                      { value: "7d", label: "7 أيام" },
                      { value: "30d", label: "30 يوم" },
                      { value: "permanent", label: "دائم" },
                    ].map(d => (
                      <button key={d.value} onClick={() => setPortalBanDuration(d.value)}
                        className={`py-2 rounded-xl text-[10px] font-bold transition-all ${portalBanDuration === d.value ? "bg-destructive text-destructive-foreground" : "bg-muted/30 text-muted-foreground border border-border/50"}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Input value={portalBanReason} onChange={e => setPortalBanReason(e.target.value)}
                  placeholder="السبب (اختياري)" />

                <button onClick={executePortalBan} disabled={portalBanLoading || !portalBanUuid.trim()}
                  className="w-full h-10 rounded-xl text-sm font-bold bg-destructive text-destructive-foreground flex items-center justify-center gap-2 disabled:opacity-50">
                  {portalBanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4" /> تنفيذ الحظر</>}
                </button>
              </div>

              {/* Active portal bans */}
              {portalBans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-destructive">المحظورين حالياً ({portalBans.length})</p>
                  {portalBans.map(b => (
                    <div key={b.id} className="bg-card border border-destructive/20 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold font-mono">{b.uuid}</span>
                          <p className="text-[9px] text-muted-foreground font-mono">UUID: {b.uuid}</p>
                        </div>
                        <Badge variant="destructive" className="text-[9px]">{b.ban_type === "full" ? "كامل" : b.service}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{b.reason || "—"}</p>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>المدة: {b.duration} — حظره: {b.banned_by}</span>
                        {b.expires_at && <span>ينتهي: {formatDate(b.expires_at)}</span>}
                      </div>
                      <button onClick={() => removePortalBan(b.id)}
                        className="w-full mt-1 bg-emerald-500/10 text-emerald-400 py-1.5 rounded-lg text-[10px] font-bold">
                        فك الحظر
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Members Tab — with supporters/agents sub-tabs */}
          <TabsContent value="members">
            {selectedWorksId && (
              <div className="space-y-3">
                {(() => {
                  const selectedAccount = accounts.find((a: any) => a.id === selectedWorksId);
                  const supporters = members.filter((m: any) => m.member_type === "supporter");
                  const agents = members.filter((m: any) => m.member_type === "agent");
                  const supporterPct = Number(selectedAccount?.supporter_pct ?? selectedAccount?.supporter_commission_pct ?? 0);
                  const agentPct = Number(selectedAccount?.agent_pct ?? selectedAccount?.agent_commission_pct ?? 0);

                  const acceptMember = async (memberId: string) => {
                    if (processingId) return; setProcessingId(memberId);
                    try { await adminCall("works_accept_member", { member_id: memberId }); toast.success("تم قبول العضو ✅"); if (selectedWorksId) fetchMembers(selectedWorksId); }
                    catch { toast.error("فشل القبول"); }
                    setProcessingId(null);
                  };
                  const rejectMember = async (memberId: string) => {
                    if (processingId) return; setProcessingId(memberId);
                    try { await adminCall("works_reject_member", { member_id: memberId }); toast.success("تم رفض العضو"); if (selectedWorksId) fetchMembers(selectedWorksId); }
                    catch { toast.error("فشل الرفض"); }
                    setProcessingId(null);
                  };

                  const renderMemberActions = (m: any) => (
                    <div className="flex gap-2 mt-1">
                      {m.status === "pending" && (
                        <>
                          <button onClick={() => acceptMember(m.id)} disabled={!!processingId}
                            className="flex-1 bg-emerald-500 text-black py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                            {processingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} قبول
                          </button>
                          <button onClick={() => rejectMember(m.id)} disabled={!!processingId}
                            className="flex-1 bg-destructive/10 text-destructive py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                            <X className="w-3 h-3" /> رفض
                          </button>
                        </>
                      )}
                      {m.status !== "removed" && m.status !== "pending" && (
                        <button onClick={() => removeMember(m.id)}
                          className="flex-1 bg-destructive/10 text-destructive py-1.5 rounded-lg text-[10px] font-bold">
                          إزالة
                        </button>
                      )}
                      {m.status !== "removed" && (
                        <>
                          <button onClick={() => { setEditMember(m); setEditCommission(String(m.commission_pct || "")); }}
                            className="px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-amber-500/10 text-amber-400">
                            <Percent className="w-3 h-3" /> نسبة
                          </button>
                          <button onClick={() => { setEditMemberCommAmt(m); setEditNewCommAmt(String(Number(m.total_commission_usd || 0))); }}
                            className="px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-primary/10 text-primary">
                            <DollarSign className="w-3 h-3" /> تعديل
                          </button>
                        </>
                      )}
                      {isOwner && m.status !== "removed" && (
                        <button onClick={() => { setFreezeTarget({ type: "user", id: m.member_uuid, name: m.member_name }); setShowFreezeDialog(true); }}
                          className="px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-destructive/10 text-destructive">
                          <UserX className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold">أعضاء الفريق</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={refreshAllMembers}
                            disabled={refreshingAll}
                            className="text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1 bg-primary/10 text-primary disabled:opacity-50"
                          >
                            {refreshingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
                            {refreshingAll ? "جاري التحديث..." : "تحديث الكل"}
                          </button>
                          {isOwner && (
                            <button onClick={() => { setManualTargetWorksId(selectedWorksId); setShowManualAdd(true); }}
                              className="text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1 bg-emerald-500/10 text-emerald-400">
                              <Plus className="w-3 h-3" /> إضافة
                            </button>
                          )}
                          <button onClick={() => setTab("accounts")} className="text-xs text-muted-foreground">← رجوع</button>
                        </div>
                      </div>

                      {!loading && members.length > 0 && (
                        <div className="space-y-2">
                          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">إجمالي أرباح الشهر (داعمين + وكلاء)</p>
                            <p className="text-lg font-black text-foreground">
                              {memberSalaryLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `$${dynamicAccountEarnings.toFixed(2)}`}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="bg-muted/40 border border-border rounded-lg p-2 text-center">
                              <p className="font-bold text-foreground">{supporters.length}</p>
                              <p className="text-muted-foreground">عدد الداعمين • نسبة {supporterPct}%</p>
                            </div>
                            <div className="bg-muted/40 border border-border rounded-lg p-2 text-center">
                              <p className="font-bold text-foreground">{agents.length}</p>
                              <p className="text-muted-foreground">عدد الوكلاء • نسبة {agentPct}%</p>
                            </div>
                            <div className="bg-muted/40 border border-border rounded-lg p-2 text-center">
                              <p className="font-bold text-foreground">${supporterDynamicEarnings.toFixed(2)}</p>
                              <p className="text-muted-foreground">أرباح الداعمين (شهري)</p>
                            </div>
                            <div className="bg-muted/40 border border-border rounded-lg p-2 text-center">
                              <p className="font-bold text-foreground">${agentDynamicEarnings.toFixed(2)}</p>
                              <p className="text-muted-foreground">أرباح الوكلاء (شهري)</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                        <>
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold">📋 الداعمين ({supporters.length})</h4>
                            {supporters.length === 0 && (
                              <p className="text-center text-muted-foreground text-sm py-5">لا يوجد داعمين</p>
                            )}
                            {supporters.map((m: any) => (
                              <div key={m.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-bold text-foreground">{m.member_name || "مستخدم"}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">UUID: {m.member_uuid}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => refreshSingleMember(m.id)}
                                      disabled={refreshingMemberId === m.id}
                                      className="p-1 rounded-lg bg-primary/10 text-primary disabled:opacity-50"
                                      title="تحديث البيانات"
                                    >
                                      {refreshingMemberId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                                    </button>
                                    <Badge variant={m.status === "active" ? "default" : "outline"} className="text-[9px]">{m.status}</Badge>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                                  <div className="bg-muted/30 rounded-lg p-2">
                                    <p className="text-muted-foreground">شحنات الشهر</p>
                                    <p className="font-bold text-foreground">{refreshingMemberId === m.id ? "..." : Number(m.monthly_charges || 0).toLocaleString()}</p>
                                  </div>
                                  <div className="bg-muted/30 rounded-lg p-2">
                                    <p className="text-muted-foreground">العمولة</p>
                                    <p className="font-bold text-foreground">{refreshingMemberId === m.id ? "..." : `$${Number(m.live_commission || 0).toFixed(2)}`}</p>
                                  </div>
                                  <div className="bg-muted/30 rounded-lg p-2">
                                    <p className="text-muted-foreground">النسبة</p>
                                    <p className="font-bold text-foreground">{Number(m.commission_pct ?? supporterPct)}%</p>
                                  </div>
                                </div>
                                {m.needs_refresh && !refreshingMemberId && (
                                  <p className="text-[9px] text-muted-foreground text-center">⚡ اضغط 🔄 لتحديث البيانات الحية</p>
                                )}
                                {renderMemberActions(m)}
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2 pt-2">
                            <h4 className="text-xs font-bold">📋 الوكلاء ({agents.length})</h4>
                            {agents.length === 0 && (
                              <p className="text-center text-muted-foreground text-sm py-5">لا يوجد وكلاء</p>
                            )}
                            {agents.map((m: any) => (
                              <div key={m.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-bold text-foreground">{m.member_name || "وكيل"}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">UUID: {m.member_uuid}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => refreshSingleMember(m.id)}
                                      disabled={refreshingMemberId === m.id}
                                      className="p-1 rounded-lg bg-primary/10 text-primary disabled:opacity-50"
                                      title="تحديث البيانات"
                                    >
                                      {refreshingMemberId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                                    </button>
                                    <Badge variant={m.status === "active" ? "default" : "outline"} className="text-[9px]">{m.status}</Badge>
                                  </div>
                                </div>
                                <div className="rounded-lg bg-muted/30 p-2 text-[10px]">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3 h-3 text-muted-foreground" />
                                    <span className="font-bold text-foreground">{m.agency_name || (m.agency_id ? `وكالة #${m.agency_id}` : "وكالة غير معروفة")}</span>
                                    {Number(m.agency_members_count || 0) > 0 && (
                                      <span className="text-muted-foreground">• {Number(m.agency_members_count)} عضو</span>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                                  <div className="bg-muted/30 rounded-lg p-2">
                                    <p className="text-muted-foreground">راتب الوكالة</p>
                                    <p className="font-bold text-foreground">{refreshingMemberId === m.id ? "..." : `$${Number(m.agency_salary || 0).toFixed(2)}`}</p>
                                  </div>
                                  <div className="bg-muted/30 rounded-lg p-2">
                                    <p className="text-muted-foreground">العمولة</p>
                                    <p className="font-bold text-foreground">{refreshingMemberId === m.id ? "..." : `$${Number(m.live_commission || 0).toFixed(2)}`}</p>
                                  </div>
                                  <div className="bg-muted/30 rounded-lg p-2">
                                    <p className="text-muted-foreground">النسبة</p>
                                    <p className="font-bold text-foreground">{Number(m.commission_pct ?? agentPct)}%</p>
                                  </div>
                                </div>
                                {m.needs_refresh && !refreshingMemberId && (
                                  <p className="text-[9px] text-muted-foreground text-center">⚡ اضغط 🔄 لتحديث البيانات الحية</p>
                                )}
                                {renderMemberActions(m)}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Owner: Manual Add Dialog */}
        <Dialog open={showManualAdd} onOpenChange={setShowManualAdd}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> إضافة عضو يدوية (Owner)
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">حساب البيدي</label>
                <select value={manualTargetWorksId} onChange={e => setManualTargetWorksId(e.target.value)}
                  className="w-full h-10 rounded-xl bg-muted/30 border border-border/50 text-sm px-3 mt-1">
                  <option value="">اختر...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.works_code || a.referral_code} — {a.user_name || a.bd_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">نوع العضو</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setManualAddType("supporter")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border ${manualAddType === "supporter" ? "border-primary bg-primary/10 text-primary" : "border-border/50"}`}>
                    داعم
                  </button>
                  <button onClick={() => setManualAddType("agent")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border ${manualAddType === "agent" ? "border-primary bg-primary/10 text-primary" : "border-border/50"}`}>
                    وكيل
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">UUID العضو</label>
                <Input value={manualTargetUuid} onChange={e => setManualTargetUuid(e.target.value)}
                  placeholder="أدخل UUID..." dir="ltr" className="mt-1" />
              </div>
              <button onClick={handleManualAdd} disabled={manualAddLoading}
                className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 bg-emerald-500 text-white">
                {manualAddLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> إضافة</>}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Commission % Dialog */}
        <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Percent className="w-4 h-4" /> تعديل النسبة — {editMember?.member_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-[10px] text-muted-foreground font-mono">UUID: {editMember?.member_uuid}</p>
              <div>
                <label className="text-xs text-muted-foreground">نسبة العمولة الجديدة (%)</label>
                <Input type="number" value={editCommission} onChange={e => setEditCommission(e.target.value)}
                  placeholder="مثال: 2.5" dir="ltr" className="mt-1" min="0" max="100" step="0.1" />
              </div>
              <button onClick={handleEditCommission}
                className="w-full h-10 rounded-xl text-sm font-bold bg-amber-500 text-black">
                حفظ
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Member Total Commission Dialog */}
        <Dialog open={!!editMemberCommAmt} onOpenChange={() => setEditMemberCommAmt(null)}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4" /> تعديل عمولة — {editMemberCommAmt?.member_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-[10px] text-muted-foreground font-mono">UUID: {editMemberCommAmt?.member_uuid}</p>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground">العمولة الحالية</p>
                <p className="text-lg font-bold text-foreground">${Number(editMemberCommAmt?.total_commission_usd || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">العمولة الجديدة ($)</label>
                <Input type="number" value={editNewCommAmt} onChange={e => setEditNewCommAmt(e.target.value)}
                  placeholder="15.00" dir="ltr" className="mt-1" min="0" step="0.01" />
              </div>
              {editNewCommAmt && !isNaN(parseFloat(editNewCommAmt)) && (
                <div className="text-center text-[11px]">
                  {(() => {
                    const diff = parseFloat(editNewCommAmt) - Number(editMemberCommAmt?.total_commission_usd || 0);
                    return (
                      <p className={diff >= 0 ? "text-emerald-400" : "text-destructive"}>
                        الفرق: {diff >= 0 ? '+' : ''}${diff.toFixed(2)} ({diff >= 0 ? 'سيزيد' : 'سينقص'} من إجمالي الأرباح)
                      </p>
                    );
                  })()}
                </div>
              )}
              <button onClick={handleEditMemberCommission}
                className="w-full h-10 rounded-xl text-sm font-bold bg-primary text-primary-foreground">
                حفظ التعديل
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Owner: Freeze Dialog */}
        <Dialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm text-destructive">
                <Lock className="w-4 h-4" /> تجميد {freezeTarget?.type === "bd" ? "حساب بيدي" : "مستخدم"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!freezeTarget && (
                <div>
                  <label className="text-xs text-muted-foreground">نوع التجميد</label>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setFreezeTarget({ type: "bd", id: "", name: "" })}
                      className="flex-1 py-3 rounded-xl text-xs font-bold border border-border/50 hover:border-destructive/50 transition-colors">
                      <Lock className="w-4 h-4 mx-auto mb-1 text-destructive" />
                      تجميد حساب بيدي
                    </button>
                    <button onClick={() => setFreezeTarget({ type: "user", id: "", name: "" })}
                      className="flex-1 py-3 rounded-xl text-xs font-bold border border-border/50 hover:border-destructive/50 transition-colors">
                      <UserX className="w-4 h-4 mx-auto mb-1 text-destructive" />
                      تجميد خدمات مستخدم
                    </button>
                  </div>
                </div>
              )}
              {freezeTarget && freezeTarget.type === "bd" && !freezeTarget.id && (
                <div>
                  <label className="text-xs text-muted-foreground">اختر حساب البيدي</label>
                  <select onChange={e => {
                    const a = accounts.find(acc => acc.id === e.target.value);
                    if (a) setFreezeTarget({ type: "bd", id: a.id, name: a.user_name || a.works_code });
                  }} className="w-full h-10 rounded-xl bg-muted/30 border border-border/50 text-sm px-3 mt-1">
                    <option value="">اختر...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.works_code} — {a.user_name}</option>)}
                  </select>
                </div>
              )}
              {freezeTarget && freezeTarget.type === "user" && !freezeTarget.id && (
                <div>
                  <label className="text-xs text-muted-foreground">UUID المستخدم</label>
                  <Input onChange={e => setFreezeTarget({ type: "user", id: e.target.value, name: e.target.value.slice(0, 10) })}
                    placeholder="أدخل UUID..." dir="ltr" className="mt-1" />
                </div>
              )}
              {freezeTarget?.id && (
                <>
                  <p className="text-xs text-foreground">الهدف: <span className="font-bold">{freezeTarget.name}</span></p>
                  <div>
                    <label className="text-xs text-muted-foreground">السبب</label>
                    <Input value={freezeReason} onChange={e => setFreezeReason(e.target.value)}
                      placeholder="سبب التجميد..." className="mt-1" />
                  </div>
                  <button onClick={handleFreeze}
                    className="w-full h-10 rounded-xl text-sm font-bold bg-destructive text-destructive-foreground">
                    تأكيد التجميد
                  </button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Owner: Edit Financials Dialog */}
        <Dialog open={!!editFinAccount} onOpenChange={() => setEditFinAccount(null)}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Pencil className="w-4 h-4" /> تعديل المالية — {editFinAccount?.user_name || editFinAccount?.works_code}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">الرصيد المتاح ($)</label>
                <Input type="number" value={editBalanceUsd} onChange={e => setEditBalanceUsd(e.target.value)}
                  placeholder="0.00" dir="ltr" className="mt-1" step="0.01" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">إجمالي الأرباح ($)</label>
                <Input type="number" value={editTotalEarnings} onChange={e => setEditTotalEarnings(e.target.value)}
                  placeholder="0.00" dir="ltr" className="mt-1" step="0.01" />
              </div>
              <button onClick={handleEditFinancials} disabled={editFinLoading}
                className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 bg-amber-500 text-black">
                {editFinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><DollarSign className="w-4 h-4" /> حفظ التعديلات</>}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageLayout>
  );
};

export default AdminWorksPage;
