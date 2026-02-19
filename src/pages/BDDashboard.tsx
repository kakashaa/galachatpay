import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users, Wallet, Search, TrendingUp, DollarSign, Loader2, UserPlus, RefreshCw, CalendarDays, FileText, Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateAr } from "@/utils/dateFormat";

type Tab = "overview" | "supporters" | "agents" | "history" | "today" | "commission_report";

interface BDData {
  bd: any;
  supporters: any[];
  agents: any[];
  withdrawals: any[];
  wallets_paused: boolean;
  auto_withdrawal: boolean;
}

const BDDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<BDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [commissionLogs, setCommissionLogs] = useState<any[]>([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionMonth, setCommissionMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const loadData = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [dashRes, logsRes] = await Promise.all([
        supabase.functions.invoke("bd-manage", {
          body: { action: "get_dashboard", bd_uuid: user.uuid },
        }),
        supabase
          .from("bd_commission_logs")
          .select("*")
          .eq("bd_uuid", user.uuid)
          .gte("created_at", todayStart.toISOString())
          .order("created_at", { ascending: false }),
      ]);

      const res = dashRes.data;
      if (res?.bd) {
        setData(res);
      } else {
        navigate("/bd", { replace: true });
      }
      setTodayLogs(logsRes.data || []);
    } catch {
      toast.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [user?.uuid, navigate]);

  const loadCommissionReport = useCallback(async () => {
    if (!user?.uuid) return;
    setCommissionLoading(true);
    try {
      const startDate = `${commissionMonth}-01T00:00:00Z`;
      const [y, m] = commissionMonth.split("-").map(Number);
      const endDate = new Date(y, m, 1).toISOString();

      const { data } = await supabase
        .from("bd_commission_logs")
        .select("*")
        .eq("bd_uuid", user.uuid)
        .gte("created_at", startDate)
        .lt("created_at", endDate)
        .order("created_at", { ascending: false })
        .limit(500);
      setCommissionLogs(data || []);
    } catch {
      toast.error("فشل تحميل تقرير العمولات");
    } finally {
      setCommissionLoading(false);
    }
  }, [user?.uuid, commissionMonth]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (tab === "commission_report") {
      loadCommissionReport();
    }
  }, [tab, loadCommissionReport]);

  if (loading) {
    return (
      <div className="mobile-container min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.bd) return null;

  const { bd, supporters, agents, withdrawals, wallets_paused } = data;
  const totalSupporterCommission = supporters.reduce((s: number, m: any) => s + (m.current_month_commission || 0), 0);
  const totalAgentCommission = agents.reduce((s: number, m: any) => s + (m.current_month_commission || 0), 0);
  const currentMonthEarnings = bd.current_month_earnings || 0;
  const todayTotal = todayLogs.reduce((s: number, l: any) => s + (l.amount || 0), 0);

  const filteredSupporters = supporters.filter((m: any) =>
    m.member_name?.includes(search) || m.member_uuid?.includes(search)
  );
  const filteredAgents = agents.filter((m: any) =>
    m.member_name?.includes(search) || m.member_uuid?.includes(search)
  );

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "نظرة عامة", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "today", label: "عمولة اليوم", icon: <CalendarDays className="w-4 h-4" /> },
    { key: "commission_report", label: "تقرير العمولات", icon: <FileText className="w-4 h-4" /> },
    { key: "supporters", label: `داعمين (${supporters.length})`, icon: <Users className="w-4 h-4" /> },
    { key: "agents", label: `وكلاء (${agents.length})`, icon: <Users className="w-4 h-4" /> },
    { key: "history", label: "سجل السحب", icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <div className="mobile-container min-h-screen bg-background text-foreground pb-6" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="p-1.5 rounded-xl hover:bg-muted">
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg">لوحة البيدي</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-2 rounded-xl hover:bg-muted">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/bd/add-member")}
              className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20"
            >
              <UserPlus className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (wallets_paused) {
                toast.error("ليس وقت السحب الآن");
              } else {
                navigate("/bd/withdraw");
              }
            }}
            className="p-4 rounded-2xl border border-green-500/30 bg-card/50"
          >
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">الرصيد المتاح</span>
            </div>
            <div className="text-2xl font-bold text-green-400">${(bd.available_balance || 0).toFixed(2)}</div>
            {wallets_paused && <span className="text-[10px] text-red-400 font-bold">🔒 السحب متوقف</span>}
          </motion.button>

          <div className="p-4 rounded-2xl border border-primary/30 bg-card/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">أرباح الشهر</span>
            </div>
            <div className="text-2xl font-bold text-primary">${currentMonthEarnings.toFixed(2)}</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card/50 border border-border/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-foreground">${(bd.total_earned || 0).toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">إجمالي الأرباح</div>
          </div>
          <div className="bg-card/50 border border-border/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-foreground">{supporters.length}</div>
            <div className="text-[10px] text-muted-foreground">داعمين</div>
          </div>
          <div className="bg-card/50 border border-border/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-foreground">{agents.length}</div>
            <div className="text-[10px] text-muted-foreground">وكلاء</div>
          </div>
        </div>

        {/* BD Code */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">كود البيدي الخاص بك</span>
          <span className="font-mono font-bold text-primary text-sm">{bd.referral_code}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                tab === t.key ? "bg-primary text-primary-foreground" : "bg-card border border-border/30 text-muted-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {(tab === "supporters" || tab === "agents") && (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الآيدي..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
              dir="rtl"
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Overview */}
          {tab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-emerald-400">📊 نظرة عامة - الداعمين</h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div><div className="text-sm font-bold">{supporters.length}</div><div className="text-[10px] text-muted-foreground">عدد الداعمين</div></div>
                  <div><div className="text-sm font-bold">{bd.user_commission_pct || 2}%</div><div className="text-[10px] text-muted-foreground">نسبة العمولة</div></div>
                </div>
                <div className="text-center pt-1 border-t border-border/20">
                  <div className="text-lg font-bold text-emerald-400">${totalSupporterCommission.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">عمولة الداعمين هذا الشهر</div>
                </div>
              </div>

              <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-amber-400">📊 نظرة عامة - الوكلاء</h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div><div className="text-sm font-bold">{agents.length}</div><div className="text-[10px] text-muted-foreground">عدد الوكلاء</div></div>
                  <div><div className="text-sm font-bold">{bd.agency_commission_pct || 5}%</div><div className="text-[10px] text-muted-foreground">نسبة العمولة</div></div>
                </div>
                <div className="text-center pt-1 border-t border-border/20">
                  <div className="text-lg font-bold text-amber-400">${totalAgentCommission.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">عمولة الوكلاء هذا الشهر</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Today's Commission */}
          {tab === "today" && (
            <motion.div key="today" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {/* Today Total */}
              <div className="bg-card border border-primary/30 rounded-2xl p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">إجمالي عمولة اليوم</div>
                <div className="text-3xl font-bold text-primary">${todayTotal.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{todayLogs.length} عملية</div>
              </div>

              {/* Supporter vs Agent breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-emerald-500/30 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">عمولة الداعمين</div>
                  <div className="text-lg font-bold text-emerald-400">
                    ${todayLogs.filter((l: any) => l.member_type === "supporter").reduce((s: number, l: any) => s + (l.amount || 0), 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {todayLogs.filter((l: any) => l.member_type === "supporter").length} عملية
                  </div>
                </div>
                <div className="bg-card border border-amber-500/30 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">عمولة الوكلاء</div>
                  <div className="text-lg font-bold text-amber-400">
                    ${todayLogs.filter((l: any) => l.member_type === "agency").reduce((s: number, l: any) => s + (l.amount || 0), 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {todayLogs.filter((l: any) => l.member_type === "agency").length} عملية
                  </div>
                </div>
              </div>

              {/* Today Logs */}
              {todayLogs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">لا توجد عمولات اليوم بعد</div>
              ) : (
                todayLogs.map((log: any) => (
                  <div key={log.id} className="bg-card border border-border/40 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        log.member_type === "agency" ? "bg-amber-500/10" : "bg-emerald-500/10"
                      }`}>
                        <Users className={`w-4 h-4 ${log.member_type === "agency" ? "text-amber-400" : "text-emerald-400"}`} />
                      </div>
                      <div>
                        <div className="text-xs font-mono text-muted-foreground" dir="ltr">{log.member_uuid}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {log.member_type === "agency" ? "وكيل" : "داعم"} • {log.commission_pct}%
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-primary">+${(log.amount || 0).toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">من ${(log.source_amount || 0).toFixed(2)}</div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}


          {/* Commission Report */}
          {tab === "commission_report" && (
            <motion.div key="commission_report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {/* How commissions work */}
              <div className="bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>كيف تُحتسب العمولة؟</span>
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1.5 pr-5 list-disc marker:text-primary/60">
                  <li><span className="text-emerald-400 font-bold">الداعمين:</span> تحصل على <span className="text-foreground font-bold">2%</span> من إجمالي شحنهم الشهري الجديد</li>
                  <li><span className="text-amber-400 font-bold">الوكلاء:</span> تحصل على <span className="text-foreground font-bold">5%</span> من إجمالي دخل وكالتهم الشهري الجديد</li>
                  <li>تُحتسب العمولة تلقائياً مع كل مزامنة بناءً على <span className="text-foreground font-semibold">الفارق</span> بين القيمة الحالية والسابقة</li>
                  <li>تُجمع الأرباح في "أرباح الشهر" وتُنقل للرصيد المتاح بنهاية كل شهر</li>
                </ul>
              </div>
              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const [y, m] = commissionMonth.split("-").map(Number);
                    const prev = new Date(y, m - 2, 1);
                    setCommissionMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
                  }}
                  className="p-2 rounded-xl bg-card border border-border/40 hover:bg-muted text-sm"
                >
                  ←
                </button>
                <div className="flex-1 text-center">
                  <span className="text-sm font-bold">
                    {new Date(Number(commissionMonth.split("-")[0]), Number(commissionMonth.split("-")[1]) - 1).toLocaleDateString("ar-SA", { month: "long", year: "numeric" })}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const [y, m] = commissionMonth.split("-").map(Number);
                    const next = new Date(y, m, 1);
                    const now = new Date();
                    if (next <= new Date(now.getFullYear(), now.getMonth() + 1, 1)) {
                      setCommissionMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
                    }
                  }}
                  className="p-2 rounded-xl bg-card border border-border/40 hover:bg-muted text-sm"
                >
                  →
                </button>
              </div>

              {/* Summary */}
              {!commissionLoading && commissionLogs.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-card border border-primary/30 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-primary">
                      ${commissionLogs.reduce((s, l) => s + (l.amount || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">إجمالي العمولات</div>
                  </div>
                  <div className="bg-card border border-emerald-500/30 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-emerald-400">
                      ${commissionLogs.filter(l => l.member_type === "supporter").reduce((s, l) => s + (l.amount || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">داعمين</div>
                  </div>
                  <div className="bg-card border border-amber-500/30 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-amber-400">
                      ${commissionLogs.filter(l => l.member_type === "agency").reduce((s, l) => s + (l.amount || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">وكلاء</div>
                  </div>
                </div>
              )}

              {/* Logs */}
              {commissionLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : commissionLogs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">لا توجد عمولات في هذا الشهر</div>
              ) : (
                commissionLogs.map((log: any) => (
                  <div key={log.id} className="bg-card border border-border/40 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          log.member_type === "agency" ? "bg-amber-500/10" : "bg-emerald-500/10"
                        }`}>
                          <Users className={`w-4 h-4 ${log.member_type === "agency" ? "text-amber-400" : "text-emerald-400"}`} />
                        </div>
                        <div>
                          <div className="text-xs font-mono text-muted-foreground" dir="ltr">{log.member_uuid}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {log.member_type === "agency" ? "وكيل" : "داعم"}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-primary">+${(log.amount || 0).toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                      <span>المبلغ المصدر: <span className="font-bold text-foreground">${(log.source_amount || 0).toLocaleString()}</span></span>
                      <span>النسبة: <span className="font-bold text-foreground">{log.commission_pct}%</span></span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDateAr(log.created_at)}
                    </div>
                  </div>
                ))
              )}

              {/* Total count */}
              {!commissionLoading && commissionLogs.length > 0 && (
                <div className="text-center text-[10px] text-muted-foreground py-2">
                  إجمالي العمليات: {commissionLogs.length}
                </div>
              )}
            </motion.div>
          )}

          {tab === "supporters" && (
            <motion.div key="supporters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {filteredSupporters.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">لا يوجد داعمين حالياً</div>
              ) : (
                filteredSupporters.map((m: any) => (
                  <MemberCard key={m.id} member={m} commissionPct={bd.user_commission_pct || 2} />
                ))
              )}
            </motion.div>
          )}

          {/* Agents */}
          {tab === "agents" && (
            <motion.div key="agents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {filteredAgents.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">لا يوجد وكلاء حالياً</div>
              ) : (
                filteredAgents.map((m: any) => (
                  <MemberCard key={m.id} member={m} commissionPct={bd.agency_commission_pct || 5} />
                ))
              )}
            </motion.div>
          )}

          {/* History */}
          {tab === "history" && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {withdrawals.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">لا يوجد سجل سحب</div>
              ) : (
                withdrawals.map((w: any) => (
                  <div key={w.id} className="bg-card border border-border/40 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">${w.amount}</div>
                      <div className="text-[10px] text-muted-foreground">{formatDateAr(w.created_at)}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                      w.status === "completed" ? "bg-green-500/10 text-green-400" :
                      w.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>
                      {w.status === "completed" ? "مكتمل" : w.status === "pending" ? "قيد المراجعة" : "مرفوض"}
                    </span>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// Member card component
const MemberCard: React.FC<{ member: any; commissionPct: number }> = ({ member, commissionPct }) => {
  return (
    <div className="bg-card border border-border/40 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold">{member.member_name || "بدون اسم"}</div>
            <div className="text-[10px] text-muted-foreground font-mono" dir="ltr">{member.member_uuid}</div>
          </div>
        </div>
        <div className="text-left">
          <div className="text-sm font-bold text-green-400">${(member.current_month_commission || 0).toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground">{commissionPct}% عمولة</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/20">
        <span>انضم: {formatDateAr(member.created_at)}</span>
        <span>إجمالي: ${(member.total_commission || 0).toFixed(2)}</span>
      </div>
    </div>
  );
};

export default BDDashboard;
