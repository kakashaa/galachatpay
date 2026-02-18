import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, DollarSign, RefreshCw, Loader2, Wallet, BarChart3, Receipt } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBD } from "@/contexts/BDContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


interface BDData {
  settings: any;
  agencies: any[];
  hosts: any[];
  users: any[];
  supporters: any[];
  totals: { agency: number; host: number; user: number };
  withdrawals: any[];
}

const NOW = new Date();
const CURRENT_MONTH = NOW.getMonth() + 1;
const CURRENT_YEAR = NOW.getFullYear();

const BDInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { logout: bdLogout } = useBD();
  const [data, setData] = useState<BDData | null>(null);
  const [loading, setLoading] = useState(true);


  // ── New: API data sections ──
  const [activeTab, setActiveTab] = useState<"overview" | "salaries" | "charges">("overview");
  const [salaryMonth, setSalaryMonth] = useState(CURRENT_MONTH);
  const [salaryYear, setSalaryYear] = useState(CURRENT_YEAR);
  const [bdDashboard, setBdDashboard] = useState<any>(null);
  const [agencySalaries, setAgencySalaries] = useState<any>(null);
  const [agencyCharges, setAgencyCharges] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    if (!authUser?.uuid) { navigate("/"); return; }
    loadData();
  }, [authUser?.uuid]);

  // Realtime subscription for withdrawals
  useEffect(() => {
    if (!authUser?.uuid) return;
    const channel = supabase
      .channel("bd-withdrawals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bd_withdrawals" }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authUser?.uuid]);

  const loadData = async () => {
    if (!authUser?.uuid) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("bd-manage", {
        body: { action: "get_bd_info", bd_uuid: authUser.uuid },
      });
      if (error) throw error;
      if (result?.success) {
        setData(result.data);
      } else if (result?.error === "BD not found") {
        bdLogout();
        navigate("/bd", { replace: true });
        return;
      } else {
        toast.error(result?.error || "فشل تحميل البيانات");
      }
    } catch (e: any) {
      toast.error(e.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch from bd-data edge function ──
  const fetchBdData = useCallback(async (action: string, params: Record<string, any> = {}) => {
    const { data: result, error } = await supabase.functions.invoke("bd-data", {
      body: { action, ...params },
    });
    if (error) throw error;
    return result;
  }, []);

  // Load BD dashboard overview
  const loadBdDashboard = useCallback(async () => {
    setApiLoading(true);
    try {
      const res = await fetchBdData("bd-dashboard", { month: salaryMonth, year: salaryYear });
      setBdDashboard(res);
    } catch (e: any) {
      toast.error("فشل تحميل النظرة العامة");
    } finally {
      setApiLoading(false);
    }
  }, [fetchBdData, salaryMonth, salaryYear]);

  // Load agency salaries
  const loadAgencySalaries = useCallback(async (agencyId: number) => {
    setApiLoading(true);
    try {
      const res = await fetchBdData("agency-salaries", { agency_id: agencyId, month: salaryMonth, year: salaryYear });
      setAgencySalaries(res);
    } catch (e: any) {
      toast.error("فشل تحميل الرواتب");
    } finally {
      setApiLoading(false);
    }
  }, [fetchBdData, salaryMonth, salaryYear]);

  // Load agency charges
  const loadAgencyCharges = useCallback(async (agencyId: number) => {
    setApiLoading(true);
    try {
      const res = await fetchBdData("agency-charges", { agency_id: agencyId });
      setAgencyCharges(res);
    } catch (e: any) {
      toast.error("فشل تحميل بيانات الشحن");
    } finally {
      setApiLoading(false);
    }
  }, [fetchBdData]);

  // Load tab data when tab changes
  useEffect(() => {
    if (!bdDashboard && activeTab === "overview") {
      loadBdDashboard();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <MobileLayout showHeader headerTitle="لوحة البيدي" onBack={() => navigate("/")}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!data) {
    return (
      <MobileLayout showHeader headerTitle="لوحة البيدي" onBack={() => navigate("/")}>
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">لم يتم العثور على بيانات BD</p>
          <Button onClick={() => navigate("/")} variant="outline">العودة</Button>
        </div>
      </MobileLayout>
    );
  }

  // Check if BD is deleted
  if (data.settings && data.settings.is_approved === false) {
    return (
      <MobileLayout showHeader headerTitle="لوحة البيدي" onBack={() => navigate("/")}>
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-base font-bold text-destructive">لقد تم حذفك كبيدي</p>
          <p className="text-sm text-muted-foreground">تواصل مع الإدارة لمعرفة السبب</p>
          <Button onClick={() => navigate("/")} variant="outline">العودة للرئيسية</Button>
        </div>
      </MobileLayout>
    );
  }

  const { settings, withdrawals = [] } = data;
  const availableBalance = Number(settings.available_balance || 0);

  const pendingWithdrawal = withdrawals.find((w: any) => w.status === "pending");
  const infoSubmittedWithdrawal = withdrawals.find((w: any) => w.status === "info_submitted");
  const hasActiveWithdrawal = pendingWithdrawal || infoSubmittedWithdrawal;
  const completedWithdrawal = !hasActiveWithdrawal ? withdrawals.find((w: any) => w.status === "completed" && w.receipt_url) : null;

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2026, i).toLocaleDateString("ar-EG", { month: "long" }),
  }));

  return (
    <MobileLayout showHeader headerTitle="لوحة البيدي" onBack={() => navigate("/")}>
      <div className="px-4 py-4 space-y-4" dir="rtl">

        {/* Completed transfer notification */}
        {completedWithdrawal && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <p className="text-sm font-bold text-primary">تم تحويل أرباحك!</p>
            </div>
            <p className="text-xs text-muted-foreground">
              تم تحويل <span className="font-bold text-primary">${Number(completedWithdrawal.amount).toFixed(2)}</span> بنجاح
            </p>
            <p className="text-xs text-foreground">رقم الحوالة: <span className="font-mono font-bold" dir="ltr">{completedWithdrawal.transfer_number}</span></p>
            {completedWithdrawal.receipt_url && (
              <a href={completedWithdrawal.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">📎 عرض الإيصال</a>
            )}
          </div>
        )}

        {/* User info card */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{settings.bd_name || authUser?.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate" dir="ltr">{authUser?.uuid}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={loadData} disabled={loading} className="h-8 w-8">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {/* Balance */}
          <div className="mb-3">
            <button
              className="w-full bg-primary/10 rounded-xl p-3 text-center transition-all hover:bg-primary/20 active:scale-95"
              onClick={() => navigate("/bd/withdraw")}
            >
              <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-base font-bold text-green-400">${availableBalance.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">الرصيد المتاح</p>
              <p className="text-[8px] text-primary mt-1">اضغط للسحب</p>
            </button>
          </div>

          {/* Add member button */}
          <div className="bg-muted/20 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" /> إضافة أعضاء
            </p>
            <p className="text-[10px] text-muted-foreground">أضف أعضاء جدد يدوياً عبر إدخال الآيدي الخاص بهم</p>
            <Button size="sm" variant="default" onClick={() => navigate("/bd/add-member")} className="w-full gap-2 text-xs">
              <UserPlus className="w-3.5 h-3.5" />
              إضافة عضو جديد
            </Button>
          </div>
        </div>

        {/* ── NEW: API Data Tabs ── */}
        <div className="glass-card overflow-hidden">
          <div className="flex border-b border-border/20">
            {([
              { key: "overview", label: "نظرة عامة", icon: BarChart3 },
              { key: "salaries", label: "رواتب فريقي", icon: DollarSign },
              { key: "charges", label: "إحصائيات الشحن", icon: Receipt },
            ] as const).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 py-3 px-2 text-center text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                    activeTab === t.key
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-4">
            {/* ── Overview Tab ── */}
            {activeTab === "overview" && (
              <OverviewTab
                data={bdDashboard}
                loading={apiLoading}
                month={salaryMonth}
                year={salaryYear}
                onMonthChange={(m) => { setSalaryMonth(m); }}
                onRefresh={loadBdDashboard}
              />
            )}

            {/* ── Salaries Tab ── */}
            {activeTab === "salaries" && (
              <SalariesTab
                data={agencySalaries}
                loading={apiLoading}
                month={salaryMonth}
                year={salaryYear}
                monthOptions={monthOptions}
                onMonthChange={(m) => setSalaryMonth(m)}
                agencies={bdDashboard?.agencies || []}
                onLoadSalaries={loadAgencySalaries}
                onRefreshDashboard={loadBdDashboard}
              />
            )}

            {/* ── Charges Tab ── */}
            {activeTab === "charges" && (
              <ChargesTab
                data={agencyCharges}
                loading={apiLoading}
                agencies={bdDashboard?.agencies || []}
                onLoadCharges={loadAgencyCharges}
                onRefreshDashboard={loadBdDashboard}
              />
            )}
          </div>
        </div>

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              سجل طلبات السحب
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {withdrawals.map((w: any) => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  pending: { label: "قيد المراجعة", cls: "bg-amber-500/20 text-amber-400" },
                  approved: { label: "تمت الموافقة", cls: "bg-emerald-500/20 text-emerald-400" },
                  info_submitted: { label: "بانتظار التحويل", cls: "bg-blue-500/20 text-blue-400" },
                  completed: { label: "مكتمل", cls: "bg-green-500/20 text-green-400" },
                  rejected: { label: "مرفوض", cls: "bg-destructive/20 text-destructive" },
                };
                const st = statusMap[w.status] || { label: w.status, cls: "bg-muted/20 text-muted-foreground" };
                return (
                  <div key={w.id} className="p-3 bg-muted/10 rounded-lg border border-border/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">${Number(w.amount).toFixed(2)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString("ar-EG")}</p>
                    {w.admin_note && <p className="text-[10px] text-destructive">ملاحظة: {w.admin_note}</p>}
                    {w.transfer_number && <p className="text-[10px] text-foreground">رقم الحوالة: <span className="font-mono" dir="ltr">{w.transfer_number}</span></p>}
                    {w.receipt_url && (
                      <a href={w.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline flex items-center gap-1">📎 صورة الإيصال</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Note */}
      </div>
    </MobileLayout>
  );
};

// ═══════════════════════════════════════════
// Sub-components for tabs
// ═══════════════════════════════════════════

const OverviewTab: React.FC<{
  data: any;
  loading: boolean;
  month: number;
  year: number;
  onMonthChange: (m: number) => void;
  onRefresh: () => void;
}> = ({ data, loading, onRefresh }) => {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!data?.ok && !data?.agencies) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-xs text-muted-foreground">اضغط لتحميل البيانات من السيرفر</p>
        <Button size="sm" variant="outline" onClick={onRefresh} className="gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> تحميل النظرة العامة
        </Button>
      </div>
    );
  }

  const agenciesList = data?.agencies || [];
  const totalMembers = agenciesList.reduce((s: number, a: any) => s + (a.member_count || 0), 0);
  const totalSalary = agenciesList.reduce((s: number, a: any) => s + (Number(a.agency_salary) || 0), 0);
  const totalCut = agenciesList.reduce((s: number, a: any) => s + (Number(a.agency_cut) || 0), 0);
  const totalNet = totalSalary - totalCut;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-foreground">نظرة عامة على الوكالات</h4>
        <Button variant="ghost" size="icon" onClick={onRefresh} className="h-7 w-7">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-primary/5 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-foreground">{agenciesList.length}</p>
          <p className="text-[9px] text-muted-foreground">وكالة</p>
        </div>
        <div className="bg-primary/5 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalMembers}</p>
          <p className="text-[9px] text-muted-foreground">عضو</p>
        </div>
        <div className="bg-emerald-500/5 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">${totalSalary.toFixed(2)}</p>
          <p className="text-[9px] text-muted-foreground">إجمالي الرواتب</p>
        </div>
        <div className="bg-amber-500/5 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-amber-400">${totalCut.toFixed(2)}</p>
          <p className="text-[9px] text-muted-foreground">الخصومات</p>
        </div>
      </div>

      <div className="bg-primary/10 rounded-lg p-3 text-center">
        <p className="text-[9px] text-muted-foreground mb-1">الصافي</p>
        <p className="text-xl font-bold text-primary">${totalNet.toFixed(2)}</p>
      </div>

      {/* Agencies list */}
      {agenciesList.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground">تفاصيل الوكالات</p>
          {agenciesList.map((a: any) => (
            <div key={a.id} className="p-3 bg-muted/10 rounded-lg border border-border/20">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-foreground">{a.name}</p>
                <span className="text-[10px] text-muted-foreground">{a.member_count} عضو</span>
              </div>
              <div className="flex gap-3 text-[10px]">
                <span className="text-emerald-400">الراتب: ${Number(a.agency_salary || 0).toFixed(2)}</span>
                <span className="text-amber-400">الخصم: ${Number(a.agency_cut || 0).toFixed(2)}</span>
                <span className="text-primary font-bold">الصافي: ${(Number(a.agency_salary || 0) - Number(a.agency_cut || 0)).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SalariesTab: React.FC<{
  data: any;
  loading: boolean;
  month: number;
  year: number;
  monthOptions: { value: number; label: string }[];
  onMonthChange: (m: number) => void;
  agencies: any[];
  onLoadSalaries: (agencyId: number) => void;
  onRefreshDashboard: () => void;
}> = ({ data, loading, month, year, monthOptions, onMonthChange, agencies, onLoadSalaries, onRefreshDashboard }) => {
  const [selectedAgency, setSelectedAgency] = useState<number | null>(null);

  const handleLoad = () => {
    if (selectedAgency) {
      onLoadSalaries(selectedAgency);
    }
  };

  // Auto-load dashboard if agencies not available
  useEffect(() => {
    if (agencies.length === 0) onRefreshDashboard();
  }, []);

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold text-foreground">رواتب فريقي</h4>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={selectedAgency || ""}
          onChange={(e) => setSelectedAgency(Number(e.target.value))}
          className="flex-1 bg-muted/20 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground"
        >
          <option value="">اختر الوكالة</option>
          {agencies.map((a: any) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="bg-muted/20 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground"
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <Button size="sm" variant="default" onClick={handleLoad} disabled={!selectedAgency || loading} className="w-full text-xs gap-2">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
        عرض الرواتب
      </Button>

      {/* Salary table */}
      {data?.ok && data?.salaries && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border/20">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/20 border-b border-border/20">
                  <th className="text-right p-2 font-bold text-foreground">الاسم</th>
                  <th className="text-center p-2 font-bold text-foreground">الراتب</th>
                  <th className="text-center p-2 font-bold text-foreground">الخصم</th>
                  <th className="text-center p-2 font-bold text-foreground">الصافي</th>
                  <th className="text-center p-2 font-bold text-foreground">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.salaries.map((s: any, i: number) => {
                  const salary = Number(s.sallary || s.salary || 0);
                  const cut = Number(s.cut_amount || 0);
                  const net = salary - cut;
                  return (
                    <tr key={i} className="border-b border-border/10 hover:bg-muted/10">
                      <td className="p-2">
                        <p className="font-bold text-foreground">{s.name || s.user?.name || "—"}</p>
                        <p className="text-[9px] text-muted-foreground font-mono" dir="ltr">{s.uuid || s.user?.uuid || ""}</p>
                      </td>
                      <td className="p-2 text-center text-emerald-400">${salary.toFixed(2)}</td>
                      <td className="p-2 text-center text-amber-400">${cut.toFixed(2)}</td>
                      <td className="p-2 text-center font-bold text-primary">${net.toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          s.is_paid ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {s.is_paid ? "مدفوع" : "معلق"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-primary/5">
                  <td className="p-2 font-bold text-foreground">الإجمالي</td>
                  <td className="p-2 text-center font-bold text-emerald-400">
                    ${data.salaries.reduce((s: number, r: any) => s + Number(r.sallary || r.salary || 0), 0).toFixed(2)}
                  </td>
                  <td className="p-2 text-center font-bold text-amber-400">
                    ${data.salaries.reduce((s: number, r: any) => s + Number(r.cut_amount || 0), 0).toFixed(2)}
                  </td>
                  <td className="p-2 text-center font-bold text-primary">
                    ${data.salaries.reduce((s: number, r: any) => s + (Number(r.sallary || r.salary || 0) - Number(r.cut_amount || 0)), 0).toFixed(2)}
                  </td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {data.agency_name && (
            <p className="text-[10px] text-muted-foreground text-center">وكالة: {data.agency_name}</p>
          )}
        </div>
      )}

      {data && !data?.ok && (
        <p className="text-xs text-destructive text-center py-4">{data?.error || "لا توجد بيانات"}</p>
      )}
    </div>
  );
};

const ChargesTab: React.FC<{
  data: any;
  loading: boolean;
  agencies: any[];
  onLoadCharges: (agencyId: number) => void;
  onRefreshDashboard: () => void;
}> = ({ data, loading, agencies, onLoadCharges, onRefreshDashboard }) => {
  const [selectedAgency, setSelectedAgency] = useState<number | null>(null);

  useEffect(() => {
    if (agencies.length === 0) onRefreshDashboard();
  }, []);

  const handleLoad = () => {
    if (selectedAgency) onLoadCharges(selectedAgency);
  };

  const members = data?.members || data?.chargers || [];

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold text-foreground">إحصائيات الشحن</h4>

      <div className="flex gap-2">
        <select
          value={selectedAgency || ""}
          onChange={(e) => setSelectedAgency(Number(e.target.value))}
          className="flex-1 bg-muted/20 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground"
        >
          <option value="">اختر الوكالة</option>
          {agencies.map((a: any) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <Button size="sm" variant="default" onClick={handleLoad} disabled={!selectedAgency || loading} className="text-xs gap-2">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
          عرض
        </Button>
      </div>

      {data?.ok && members.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">أكثر الشاحنين نشاطاً</p>
          {members
            .sort((a: any, b: any) => (Number(b.charger_level || b.charger_exp || 0)) - (Number(a.charger_level || a.charger_exp || 0)))
            .map((m: any, i: number) => (
              <div key={i} className="p-3 bg-muted/10 rounded-lg border border-border/20 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${i < 3 ? "text-amber-400" : "text-muted-foreground"}`}>#{i + 1}</span>
                    <p className="text-xs font-bold text-foreground truncate">{m.name || "—"}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{m.uuid || ""}</p>
                </div>
                <div className="text-left shrink-0 mr-2">
                  {m.charger_level !== undefined && (
                    <p className="text-[10px] font-bold text-primary">مستوى: {m.charger_level}</p>
                  )}
                  {m.charger_exp !== undefined && (
                    <p className="text-[9px] text-muted-foreground">خبرة: {Number(m.charger_exp).toLocaleString()}</p>
                  )}
                  {m.total_charged !== undefined && (
                    <p className="text-[9px] text-emerald-400">${Number(m.total_charged).toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {data?.ok && members.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات شحن</p>
      )}
      {data && !data?.ok && (
        <p className="text-xs text-destructive text-center py-4">{data?.error || "لا توجد بيانات"}</p>
      )}
    </div>
  );
};

export default BDInfoPage;
