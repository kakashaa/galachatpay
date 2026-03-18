import React, { useState, useEffect, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, X, Users, Settings, Wallet } from "lucide-react";

const AdminWorksPage: React.FC = () => {
  const { handleLogout, adminCall, isModeratorRole } = useAdminSession();
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
    try { await adminCall("works_approve_request", { id }); toast.success("تم القبول ✅"); fetchRequests(); }
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
    try { await adminCall("works_approve_withdrawal", { id }); toast.success("تم قبول السحب ✅"); fetchWithdrawals(); }
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

  return (
    <AdminPageLayout title="إدارة Works" onLogout={handleLogout}>
      <div className="max-w-3xl mx-auto p-4" dir="rtl">
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

        {/* Members sub-view (shown when clicking members on an account) */}
        {tab === "members" && selectedWorksId && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">أعضاء الفريق</h3>
              <button onClick={() => setTab("accounts")} className="text-xs text-muted-foreground">← رجوع</button>
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
                    {m.status !== "removed" && (
                      <button onClick={() => removeMember(m.id)}
                        className="w-full mt-1 bg-destructive/10 text-destructive py-1.5 rounded-lg text-[10px] font-bold">
                        إزالة العضو
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminWorksPage;
