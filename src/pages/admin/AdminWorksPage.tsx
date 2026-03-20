import React, { useState, useEffect, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, X, Users, Plus, Lock, UserX, DollarSign, Percent, Shield, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

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

  // Owner freeze dialog
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [freezeTarget, setFreezeTarget] = useState<{ type: "bd" | "user"; id: string; name: string } | null>(null);
  const [freezeReason, setFreezeReason] = useState("");

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

  const fetchMembers = useCallback(async (wid: string) => {
    setLoading(true);
    try { const d = await adminCall("works_get_members", { works_id: wid }); setMembers(d || []); } catch { }
    setLoading(false);
  }, [adminCall]);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try { const d = await adminCall("works_list_withdrawals"); setWithdrawals(d || []); } catch { }
    setLoading(false);
  }, [adminCall]);

  useEffect(() => {
    if (tab === "requests") fetchRequests();
    else if (tab === "accounts") fetchAccounts();
    else if (tab === "withdrawals") fetchWithdrawals();
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
    try { await adminCall("works_update_member", { id, status: "removed" }); toast.success("تم الإزالة"); if (selectedWorksId) fetchMembers(selectedWorksId); }
    catch { toast.error("فشل"); }
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
      await adminCall("works_update_member", {
        id: editMember.id,
        commission_pct: pct,
      });
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
        await adminCall("works_update_account", {
          id: freezeTarget.id,
          status: "frozen",
          freeze_reason: freezeReason || "تجميد بواسطة المالك",
        });
        toast.success("تم تجميد حساب البيدي");
        fetchAccounts();
      } else {
        // Freeze user - insert into manual_bans
        await supabase.from("manual_bans").insert({
          target_uuid: freezeTarget.id,
          ban_type: "service_freeze",
          reason: freezeReason || "تجميد خدمات بواسطة المالك",
          banned_by: "naz",
          duration_hours: 8760, // 1 year
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

  return (
    <AdminPageLayout title="إدارة البيدي" onLogout={handleLogout}>
      <div className="max-w-3xl mx-auto p-4" dir="rtl">

        {/* Owner-only toolbar */}
        {isOwner && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-[10px] text-red-400 font-bold">صلاحيات المالك</span>
            <div className="flex-1" />
            <button onClick={() => setShowManualAdd(true)}
              className="text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1" style={{ background: 'rgba(16,185,129,0.12)', color: 'hsl(160 84% 39%)' }}>
              <Plus className="w-3 h-3" /> إضافة يدوية
            </button>
            <button onClick={() => { setShowFreezeDialog(true); setFreezeTarget(null); }}
              className="text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1" style={{ background: 'rgba(239,68,68,0.12)', color: 'hsl(350 89% 60%)' }}>
              <Lock className="w-3 h-3" /> تجميد
            </button>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="requests">الطلبات</TabsTrigger>
            <TabsTrigger value="accounts">الحسابات</TabsTrigger>
            <TabsTrigger value="withdrawals">السحوبات</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
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
                      <span className="text-sm font-bold">{r.user_name || "—"}</span>
                      <Badge variant="outline" className="text-[10px]">مستوى {r.user_level}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">{r.user_uuid}</p>
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
            {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <div className="space-y-3">
                {accounts.length === 0 && <p className="text-center text-muted-foreground text-sm py-10">لا توجد حسابات</p>}
                {accounts.map(a => (
                  <div key={a.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{a.user_name || "—"}</span>
                      <span className="text-xs font-mono text-emerald-400">{a.works_code}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">{a.user_uuid}</p>
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                      <div><p className="font-bold text-green-400">${Number(a.balance_usd).toFixed(2)}</p><p className="text-muted-foreground">الرصيد</p></div>
                      <div><p className="font-bold text-emerald-400">${Number(a.total_earnings_usd).toFixed(2)}</p><p className="text-muted-foreground">الأرباح</p></div>
                      <div><p className="font-bold text-pink-400">{a.supporter_count}</p><p className="text-muted-foreground">داعمين</p></div>
                      <div><p className="font-bold text-orange-400">{a.agent_count}</p><p className="text-muted-foreground">وكلاء</p></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedWorksId(a.id); fetchMembers(a.id); setTab("members"); }}
                        className="flex-1 bg-muted py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" /> الأعضاء
                      </button>
                      <button onClick={() => updateAccount(a.id, { status: a.status === "active" ? "suspended" : "active" })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold ${a.status === "active" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {a.status === "active" ? "تعليق" : "تفعيل"}
                      </button>
                      {isOwner && (
                        <button onClick={() => { setFreezeTarget({ type: "bd", id: a.id, name: a.user_name || a.works_code }); setShowFreezeDialog(true); }}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> تجميد
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">اختر حساب Works من تبويب الحسابات لتعديل إعداداته.</p>
              {accounts.map(a => (
                <div key={a.id} className="bg-card border border-border rounded-xl p-3 space-y-3">
                  <p className="text-sm font-bold">{a.works_code} — {a.user_name}</p>
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
            </div>
          </TabsContent>
        </Tabs>

        {/* Members sub-view */}
        {tab === "members" && selectedWorksId && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">أعضاء الفريق</h3>
              <div className="flex items-center gap-2">
                {isOwner && (
                  <button onClick={() => { setManualTargetWorksId(selectedWorksId); setShowManualAdd(true); }}
                    className="text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1" style={{ background: 'rgba(16,185,129,0.12)', color: 'hsl(160 84% 39%)' }}>
                    <Plus className="w-3 h-3" /> إضافة يدوية
                  </button>
                )}
                <button onClick={() => setTab("accounts")} className="text-xs text-muted-foreground">← رجوع</button>
              </div>
            </div>
            {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <>
                {members.length === 0 && <p className="text-center text-muted-foreground text-sm py-10">لا يوجد أعضاء</p>}
                {members.map(m => (
                  <div key={m.id} className="bg-card border border-border rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{m.member_name || m.member_uuid.slice(0, 10)}</span>
                      <Badge variant={m.member_type === "supporter" ? "default" : "secondary"} className="text-[9px]">
                        {m.member_type === "supporter" ? "داعم" : "وكيل"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">{m.member_uuid}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">العمولة: ${Number(m.total_commission_usd || 0).toFixed(2)}</span>
                      <Badge variant={m.status === "active" ? "default" : "outline"} className="text-[9px]">{m.status}</Badge>
                    </div>
                    <div className="flex gap-2 mt-1">
                      {m.status !== "removed" && (
                        <button onClick={() => removeMember(m.id)}
                          className="flex-1 bg-destructive/10 text-destructive py-1.5 rounded-lg text-[10px] font-bold">
                          إزالة العضو
                        </button>
                      )}
                      {isOwner && m.status !== "removed" && (
                        <>
                          <button onClick={() => { setEditMember(m); setEditCommission(String(m.commission_pct || "")); }}
                            className="px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1" style={{ background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)' }}>
                            <Percent className="w-3 h-3" /> نسبة
                          </button>
                          <button onClick={() => { setFreezeTarget({ type: "user", id: m.member_uuid, name: m.member_name }); setShowFreezeDialog(true); }}
                            className="px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1" style={{ background: 'rgba(239,68,68,0.12)', color: 'hsl(350 89% 60%)' }}>
                            <UserX className="w-3 h-3" /> تجميد
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

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
                    <option key={a.id} value={a.id}>{a.works_code} — {a.user_name}</option>
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
                className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'hsl(160 84% 39%)', color: 'white' }}>
                {manualAddLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> إضافة</>}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Owner: Edit Commission Dialog */}
        <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4" /> تعديل النسبة — {editMember?.member_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">نسبة العمولة الجديدة (%)</label>
                <Input type="number" value={editCommission} onChange={e => setEditCommission(e.target.value)}
                  placeholder="مثال: 2.5" dir="ltr" className="mt-1" min="0" max="100" step="0.1" />
              </div>
              <button onClick={handleEditCommission}
                className="w-full h-10 rounded-xl text-sm font-bold" style={{ background: 'hsl(38 92% 50%)', color: 'black' }}>
                حفظ
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Owner: Freeze Dialog */}
        <Dialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm text-red-400">
                <Lock className="w-4 h-4" /> تجميد {freezeTarget?.type === "bd" ? "حساب بيدي" : "مستخدم"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!freezeTarget && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">نوع التجميد</label>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setFreezeTarget({ type: "bd", id: "", name: "" })}
                        className="flex-1 py-3 rounded-xl text-xs font-bold border border-border/50 hover:border-red-400/50 transition-colors">
                        <Lock className="w-4 h-4 mx-auto mb-1 text-red-400" />
                        تجميد حساب بيدي
                      </button>
                      <button onClick={() => setFreezeTarget({ type: "user", id: "", name: "" })}
                        className="flex-1 py-3 rounded-xl text-xs font-bold border border-border/50 hover:border-red-400/50 transition-colors">
                        <UserX className="w-4 h-4 mx-auto mb-1 text-red-400" />
                        تجميد خدمات مستخدم
                      </button>
                    </div>
                  </div>
                </>
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
                    className="w-full h-10 rounded-xl text-sm font-bold bg-red-500 text-white">
                    تأكيد التجميد
                  </button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageLayout>
  );
};

export default AdminWorksPage;
