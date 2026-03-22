import React, { useState, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import {
  RefreshCw, Loader2, Search, AlertTriangle, Shield,
  TrendingUp, Activity, CheckCircle, XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── DB Proxy Helper ─── */
const DB_PROXY = "https://hola-chat.com/db-proxy.php";
const API_KEY = "ghala2026proxy";

async function apiCall(action: string, params?: Record<string, string | number>) {
  const url = new URL(DB_PROXY);
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("action", action);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  if (json.ok === false) throw new Error(json.error || json.message || "API returned error");
  return json.data !== undefined ? json.data : json;
}

/* ─── Helpers ─── */
const formatCoins = (n: number) => {
  if (!n && n !== 0) return "0";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("en-US");
};

const formatDateTime = (d: string) => {
  try {
    const date = new Date(d);
    return date.toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
};

/* ─── Category Config ─── */
const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  purchase: { label: "شحن", icon: "💳", color: "emerald" },
  salary_withdraw: { label: "سحب راتب", icon: "💰", color: "indigo" },
  admin_manual: { label: "يدوي (أدمن)", icon: "🔴", color: "red" },
  host_withdraw: { label: "سحب هوست", icon: "🏠", color: "amber" },
  freight: { label: "شحن وكالة", icon: "📦", color: "blue" },
  room_reward: { label: "مكافأة غرفة", icon: "🎁", color: "green" },
  target_reward: { label: "مكافأة تارقت", icon: "🎯", color: "purple" },
  game_reward: { label: "لعبة", icon: "🎮", color: "cyan" },
};

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

/* ═══════════════════════════════════════ */
/*             MAIN COMPONENT             */
/* ═══════════════════════════════════════ */
const AdminMonitorPage: React.FC = () => {
  const { handleLogout } = useAdminSession();

  /* ── All Data States ── */
  const [alertsData, setAlertsData] = useState<any>(null);
  const [feedData, setFeedData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("");

  /* ── Salary Check ── */
  const [salaryUuid, setSalaryUuid] = useState("");
  const [salaryResult, setSalaryResult] = useState<any>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  /* ── Feed Filter ── */
  const [feedFilter, setFeedFilter] = useState("all");

  /* ── Refresh All ── */
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [alerts, feed, daily, audit] = await Promise.all([
        apiCall("monitor-alerts").catch(() => null),
        apiCall("activity-feed", { limit: 100 }).catch(() => null),
        apiCall("daily-summary").catch(() => null),
        apiCall("salary-audit").catch(() => null),
      ]);
      setAlertsData(alerts);
      setFeedData(feed);
      setDailyData(daily);
      setAuditData(audit);
      setLastRefresh(new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      toast.success("تم التحديث");
    } catch (e: any) {
      toast.error("فشل التحديث: " + (e.message || "خطأ"));
    }
    setLoading(false);
  }, []);

  /* ── Salary Check ── */
  const checkSalary = useCallback(async () => {
    if (!salaryUuid.trim()) { toast.error("أدخل UUID"); return; }
    setSalaryLoading(true);
    setSalaryResult(null);
    try {
      const result = await apiCall("salary-check", { uuid: salaryUuid.trim() });
      setSalaryResult(result);
    } catch (e: any) {
      toast.error(e.message || "فشل الفحص");
    }
    setSalaryLoading(false);
  }, [salaryUuid]);

  /* ── Alerts Section ── */
  const alerts = alertsData?.alerts || {};
  const summary = alertsData?.summary || {};

  /* ── Feed ── */
  const activities: any[] = feedData?.activities || [];
  const feedSummary = feedData?.summary || {};
  const categoryCounts: Record<string, number> = {};
  activities.forEach(a => { categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1; });
  const filteredActivities = feedFilter === "all" ? activities : activities.filter(a => a.category === feedFilter);

  /* ── Audit ── */
  const suspicious: any[] = auditData?.suspicious || [];

  return (
    <AdminPageLayout title="المراقبة" onLogout={handleLogout} hideBottomNav>
      <div className="space-y-6 pb-10" dir="rtl">
        {/* ── Header with Refresh ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">لوحة المراقبة</h1>
            {lastRefresh && <p className="text-xs text-muted-foreground">آخر تحديث: {lastRefresh}</p>}
          </div>
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تحديث
          </button>
        </div>

        {!alertsData && !loading && (
          <div className="text-center py-16 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">اضغط "تحديث" لتحميل البيانات</p>
          </div>
        )}

        {/* ═══ Section 1: Alert Cards ═══ */}
        {alertsData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> التنبيهات
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <AlertCard
                icon="🔴" title="عمليات يدوية (أدمن)"
                count={alerts.dash_additions?.count || 0}
                sub={`${formatCoins(alerts.dash_additions?.total_coins || 0)} كوينز`}
                danger={alerts.dash_additions?.count > 0}
              />
              <AlertCard
                icon="⚠️" title="رواتب مشبوهة"
                count={alerts.fake_salary?.count || 0}
                sub={`فائض $${alerts.fake_salary?.total_excess || 0}`}
                danger={alerts.fake_salary?.count > 0}
              />
              <AlertCard
                icon="💰" title="سحوبات كبيرة (+$200)"
                count={alerts.large_withdrawals?.count || 0}
                sub={`$${alerts.large_withdrawals?.total_usd || 0}`}
                danger={alerts.large_withdrawals?.count > 0} amber
              />
              <AlertCard
                icon="💵" title="إجمالي السحوبات"
                count={summary.total_withdrawals_today || 0}
                sub={`$${summary.total_withdraw_usd_today || 0}`}
              />
              <AlertCard
                icon="📦" title="شحن وكالات مشبوه"
                count={alerts.suspicious_freight?.count || 0}
                sub={`${formatCoins(alerts.suspicious_freight?.total_coins || 0)} كوينز`}
                danger={alerts.suspicious_freight?.count > 0} amber
              />
            </div>
          </motion.div>
        )}

        {/* ═══ Section 2: Activity Feed ═══ */}
        {feedData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h2 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> سجل العمليات
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{feedSummary.total || 0}</span>
              {(feedSummary.danger_count || 0) > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{feedSummary.danger_count} خطر</span>
              )}
            </h2>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-3">
              <FilterTab label={`الكل (${feedSummary.total || 0})`} active={feedFilter === "all"} onClick={() => setFeedFilter("all")} />
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <FilterTab
                  key={cat}
                  label={`${categoryConfig[cat]?.icon || "📋"} ${categoryConfig[cat]?.label || cat} (${count})`}
                  active={feedFilter === cat}
                  onClick={() => setFeedFilter(cat)}
                />
              ))}
            </div>

            {/* Feed List */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 rounded-xl border border-border/40 bg-card/50 p-2">
              {filteredActivities.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">لا توجد عمليات</p>
              )}
              <AnimatePresence>
                {filteredActivities.map((item, i) => (
                  <FeedItem key={item.id || i} item={item} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ═══ Section 3: User Salary Check ═══ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" /> فحص راتب مستخدم
          </h2>
          <div className="flex gap-2 mb-3">
            <input
              value={salaryUuid}
              onChange={e => setSalaryUuid(e.target.value)}
              placeholder="UUID"
              className="flex-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/40 text-foreground text-sm placeholder:text-muted-foreground"
              onKeyDown={e => e.key === "Enter" && checkSalary()}
            />
            <button
              onClick={checkSalary}
              disabled={salaryLoading}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
            >
              {salaryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "فحص"}
            </button>
          </div>

          {salaryResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`rounded-xl border p-4 space-y-3 ${salaryResult.is_suspicious ? "border-red-500/40 bg-red-500/5" : "border-green-500/40 bg-green-500/5"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{salaryResult.user?.name || "—"} ({salaryResult.user?.uuid})</p>
                  <p className="text-xs text-muted-foreground">وكالة: {salaryResult.user?.agency_id || "—"}</p>
                </div>
                {salaryResult.is_suspicious
                  ? <span className="flex items-center gap-1 text-red-400 text-sm font-bold"><XCircle className="w-4 h-4" /> 🚨 مشبوه</span>
                  : <span className="flex items-center gap-1 text-green-400 text-sm font-bold"><CheckCircle className="w-4 h-4" /> ✅ نظيف</span>
                }
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoCell label="ألماسات الشهر" value={formatCoins(salaryResult.monthly_diamonds || 0)} />
                <InfoCell label="الراتب المتوقع" value={`$${salaryResult.salary_expected || 0}`} />
                <InfoCell label="الراتب الفعلي" value={`$${salaryResult.salary_actual || 0}`} />
                <InfoCell label="الفائض" value={`$${salaryResult.excess || 0}`} highlight={salaryResult.excess > 0} />
                <InfoCell label="يمكنه السحب" value={salaryResult.can_withdraw ? "نعم ✅" : "لا ❌"} />
                {salaryResult.salary_record && (
                  <InfoCell label="الشهر" value={`${salaryResult.salary_record.month}/${salaryResult.salary_record.year}`} />
                )}
              </div>
              {salaryResult.salary_record && (
                <p className="text-xs text-muted-foreground">
                  Diamond: {salaryResult.salary_record.diamond} | Cut: ${salaryResult.salary_record.cut_amount}
                </p>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* ═══ Section 4: Daily Summary ═══ */}
        {dailyData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> الملخص اليومي
              <span className="text-xs text-muted-foreground">({dailyData.date})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <SummaryCard icon="💰" title="سحوبات رواتب" count={dailyData.withdrawals?.count || 0} sub={`$${dailyData.withdrawals?.total_usd || 0}`} />
              <SummaryCard icon="🏠" title="سحوبات هوست" count={dailyData.host_withdrawals?.count || 0} sub={`$${dailyData.host_withdrawals?.total_usd || 0}`} />
              <SummaryCard icon="🎁" title="مكافآت غرف" count={dailyData.room_rewards?.count || 0} sub={`${formatCoins(dailyData.room_rewards?.total_coins || 0)} كوينز`} />
              <SummaryCard icon="📦" title="شحن وكالات" count={dailyData.freight?.count || 0} sub={`${formatCoins(dailyData.freight?.total_coins || 0)} كوينز`} />
              <SummaryCard icon="🔧" title="عمليات أدمن" count={dailyData.dashboard_ops?.count || 0} sub={`${formatCoins(dailyData.dashboard_ops?.total_coins || 0)} كوينز`} />
            </div>
          </motion.div>
        )}

        {/* ═══ Section 5: Salary Audit ═══ */}
        {auditData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> تدقيق الرواتب
              <span className="text-xs text-muted-foreground">({auditData.month})</span>
            </h2>

            {suspicious.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-green-500/20 bg-green-500/5">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-bold text-sm">لا توجد رواتب مشبوهة</p>
                <p className="text-xs text-muted-foreground">{auditData.clean || 0} راتب نظيف ✅</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                    {auditData.suspicious_count} مشبوه
                  </span>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                    {auditData.clean} نظيف
                  </span>
                </div>
                {suspicious.map((s, i) => (
                  <div key={i} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground text-sm">{s.name} ({s.uuid})</p>
                      <span className="text-xs text-muted-foreground">وكالة: {s.agency_id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-muted-foreground">المسجل: <b className="text-foreground">${s.salary_recorded}</b></span>
                      <span className="text-muted-foreground">المتوقع: <b className="text-foreground">${s.salary_expected}</b></span>
                      <span className="text-red-400 font-bold">فائض: ${s.excess_usd}</span>
                      <span className="text-muted-foreground">ألماسات: {formatCoins(s.monthly_diamonds)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </AdminPageLayout>
  );
};

/* ─── Sub-Components ─── */

function AlertCard({ icon, title, count, sub, danger, amber: isAmber }: {
  icon: string; title: string; count: number; sub: string; danger?: boolean; amber?: boolean;
}) {
  const borderClass = danger
    ? isAmber ? "border-amber-500/40" : "border-red-500/40"
    : "border-border/40";
  const bgClass = danger
    ? isAmber ? "bg-amber-500/5" : "bg-red-500/5"
    : "bg-card/50";
  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} p-3 text-center space-y-1`}>
      <span className="text-lg">{icon}</span>
      <p className="text-xs text-muted-foreground leading-tight">{title}</p>
      <p className="text-2xl font-bold text-foreground">{count}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function SummaryCard({ icon, title, count, sub }: { icon: string; title: string; count: number; sub: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-3 text-center space-y-1">
      <span className="text-lg">{icon}</span>
      <p className="text-xs text-muted-foreground leading-tight">{title}</p>
      <p className="text-2xl font-bold text-foreground">{count}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function FeedItem({ item }: { item: any }) {
  const cat = categoryConfig[item.category] || { label: item.category, icon: "📋", color: "blue" };
  const borderClass = item.severity === "danger" ? "border-r-red-500" : item.severity === "warning" ? "border-r-amber-500" : "border-r-transparent";
  const isPositive = item.amount_coins > 0;

  let description = "";
  if (item.category === "purchase") {
    description = `${item.from_name} شحن عبر ${item.method || "—"}`;
  } else {
    description = `${item.from_name || "—"} (${item.from_uuid}) → ${item.to_name || "—"} (${item.to_uuid})`;
  }

  const amountDisplay = item.amount_usd
    ? `${isPositive ? "+" : ""}${formatCoins(item.amount_coins)} ($${item.amount_usd})`
    : `${isPositive ? "+" : ""}${formatCoins(item.amount_coins)}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className={`flex items-start gap-3 p-2.5 rounded-lg bg-background/50 border-r-[3px] ${borderClass}`}
    >
      <span className="text-lg mt-0.5 shrink-0">{cat.icon}</span>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm text-foreground truncate">{description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>{amountDisplay}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colorMap[cat.color] || colorMap.blue}`}>{cat.label}</span>
          <span className="text-[10px] text-muted-foreground">{formatDateTime(item.date)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-lg p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${highlight ? "text-red-400" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

export default AdminMonitorPage;
