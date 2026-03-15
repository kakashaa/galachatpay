import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, Wallet, Gem, Zap, Calculator, Users, Clock } from "lucide-react";
import { useAgentAuth } from "@/hooks/use-agent-auth";
import AgentBottomNav from "@/components/AgentBottomNav";
import { BANK_LABELS } from "@/lib/constants";

const AGENT_API = "https://galachat.site/project-z/api.php";

interface WeeklyItem {
  date: string;
  day: string;
  total: number;
  count: number;
}

interface Transaction {
  uuid?: string;
  user_uuid?: string;
  user_name?: string;
  amount_usd: number;
  bank?: string;
  created_at?: string;
  date?: string;
}

interface StatsData {
  original_balance: number;
  original_balance_usd: number;
  current_balance: number;
  current_balance_usd: number;
  total_charged_coins: number;
  total_charged_usd: number;
  consumption_percent: number;
  bonus_percent: number;
  tier: string;
  today_usd: number;
  today_count: number;
  by_bank: Record<string, number>;
  weekly: WeeklyItem[];
  recent_transactions?: Transaction[];
}

interface DashboardData {
  recent_transactions?: Transaction[];
}


const AgentStats: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAgentAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, dashRes] = await Promise.all([
        fetch(`${AGENT_API}?action=agent_stats&token=${token}`),
        fetch(`${AGENT_API}?action=agent_dashboard&token=${token}`),
      ]);
      const statsData = await statsRes.json();
      const dashData: DashboardData = await dashRes.json();

      if (statsData.success) {
        setStats(statsData);
        // Merge transactions from both sources
        const txs = statsData.recent_transactions || dashData.recent_transactions || [];
        setTransactions(txs);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Computed highlights
  const highlights = useMemo(() => {
    if (!stats) return null;
    const weekly = stats.weekly || [];
    const bestDay = weekly.length ? weekly.reduce((b, d) => d.total > b.total ? d : b, weekly[0]) : null;
    const biggestCharge = transactions.length ? transactions.reduce((b, tx) => (tx.amount_usd || 0) > (b.amount_usd || 0) ? tx : b, transactions[0]) : null;
    const totalCount = weekly.reduce((s, w) => s + (w.count || 0), 0);
    const totalUsd = stats.total_charged_usd || 0;
    const avgCharge = totalCount > 0 ? totalUsd / totalCount : 0;
    const uniqueUsers = new Set(transactions.map(tx => tx.user_uuid || tx.uuid)).size;

    return { bestDay, biggestCharge, avgCharge, uniqueUsers };
  }, [stats, transactions]);

  if (loading) {
    return (
      <div className="mobile-container flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const maxBank = stats?.by_bank ? Math.max(...Object.values(stats.by_bank), 1) : 1;
  const weekly = stats?.weekly || [];
  const maxWeekly = weekly.length ? Math.max(...weekly.map(w => w.total), 1) : 1;

  return (
    <>
      <div className="mobile-container text-foreground pb-32 overflow-y-auto bg-background">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <button onClick={() => navigate("/agent")} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <h1 className="text-base font-black text-amber-400">الإحصائيات</h1>
          <div className="w-8" />
        </header>

        <div className="px-4 space-y-4">
          {/* Agency Summary */}
          <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">ملخص الوكالة</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">الرصيد الأصلي</p>
                  <p className="text-sm font-black text-foreground" dir="ltr">
                    {(stats?.original_balance || 0).toLocaleString()} كوينز
                  </p>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">
                    (${(stats?.original_balance_usd || 0).toLocaleString()})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">إجمالي المشحون</p>
                  <p className="text-sm font-black text-green-400" dir="ltr">
                    {(stats?.total_charged_coins || 0).toLocaleString()} كوينز
                  </p>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">
                    (${(stats?.total_charged_usd || 0).toLocaleString()})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">المتبقي</p>
                  <p className="text-sm font-black text-amber-400" dir="ltr">
                    {(stats?.current_balance || 0).toLocaleString()} كوينز
                  </p>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">
                    (${(stats?.current_balance_usd || 0).toLocaleString()})
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-amber-400 to-amber-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${stats?.consumption_percent || 0}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">نسبة الاستهلاك: {stats?.consumption_percent || 0}%</p>
          </div>

          {/* Highlight Stats */}
          {highlights && (
            <div className="grid grid-cols-2 gap-3">
              <HighlightCard
                icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
                label="أكثر يوم شحناً"
                value={highlights.bestDay ? `$${highlights.bestDay.total.toFixed(2)}` : "$0"}
                sub={highlights.bestDay?.day || "—"}
                delay={0}
              />
              <HighlightCard
                icon={<Zap className="w-4 h-4 text-amber-400" />}
                label="أكثر شحنة"
                value={highlights.biggestCharge ? `$${highlights.biggestCharge.amount_usd.toFixed(2)}` : "$0"}
                sub={highlights.biggestCharge ? `UUID: ${(highlights.biggestCharge.user_uuid || highlights.biggestCharge.uuid || "—").toString().slice(-6)}` : "—"}
                delay={1}
              />
              <HighlightCard
                icon={<Calculator className="w-4 h-4 text-amber-400" />}
                label="متوسط الشحنة"
                value={`$${highlights.avgCharge.toFixed(2)}`}
                sub="لكل عملية"
                delay={2}
              />
              <HighlightCard
                icon={<Users className="w-4 h-4 text-amber-400" />}
                label="عدد المستخدمين"
                value={String(highlights.uniqueUsers)}
                sub="مستخدم فريد"
                delay={3}
              />
            </div>
          )}

          {/* Bonus/Tier Card */}
          {stats?.tier && (
            <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center gap-2 mb-2">
                <Gem className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">نسبة الوكالة</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">الفئة</p>
                  <p className="text-sm font-black text-foreground">{stats.tier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">البونص</p>
                  <p className="text-sm font-black text-green-400">{stats.bonus_percent || 0}%</p>
                </div>
              </div>
            </div>
          )}

          {/* By Bank */}
          <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">توزيع حسب البنك</span>
            </div>
            {stats?.by_bank && Object.keys(stats.by_bank).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.by_bank).map(([bank, amount]) => {
                  const label = BANK_LABELS[bank] || bank;
                  const pct = (amount / maxBank) * 100;
                  return (
                    <div key={bank}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground" dir="ltr">${amount.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-l from-amber-400 to-amber-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
            )}
          </div>

          {/* Improved Weekly Chart */}
          {weekly.length > 0 && (
            <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: "400ms" }}>
              <p className="text-sm font-bold text-amber-400 mb-4">شحنات الأسبوع</p>
              <div className="space-y-2.5">
                {weekly.map((w, i) => {
                  const pct = maxWeekly > 0 ? (w.total / maxWeekly) * 100 : 0;
                  const isBest = w.total === maxWeekly && w.total > 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`text-[11px] w-14 text-left font-medium ${isBest ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {w.day || "—"}
                      </span>
                      <div className="flex-1 bg-white/5 h-5 rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full rounded-lg transition-all ease-out ${isBest ? 'bg-gradient-to-l from-amber-400 to-amber-500' : 'bg-white/10'}`}
                          style={{
                            width: `${pct}%`,
                            minWidth: w.total > 0 ? '8px' : '0px',
                            transitionDuration: `${800 + i * 100}ms`,
                            transitionDelay: `${i * 80}ms`,
                          }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-16 text-left tabular-nums ${isBest ? 'text-amber-400' : 'text-muted-foreground'}`} dir="ltr">
                        ${w.total.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: "500ms" }}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">آخر الشحنات</span>
              </div>
              <div className="space-y-2">
                {transactions.slice(0, 10).map((tx, i) => {
                  const name = tx.user_name || "مستخدم";
                  const uid = (tx.user_uuid || tx.uuid || "").toString().slice(-6);
                  const dateStr = tx.created_at || tx.date || "";
                  let formattedDate = "";
                  if (dateStr) {
                    try {
                      const d = new Date(dateStr);
                      formattedDate = d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
                    } catch { formattedDate = dateStr; }
                  }
                  return (
                    <div
                      key={i}
                      className="bg-white/[0.03] border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors"
                      style={{ animationDelay: `${600 + i * 60}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-xs border border-amber-500/10">
                            {name.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">#{uid}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-green-400" dir="ltr">${(tx.amount_usd || 0).toFixed(2)}</p>
                          {formattedDate && <p className="text-[9px] text-muted-foreground">{formattedDate}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <AgentBottomNav />
    </>
  );
};

// Highlight card component
function HighlightCard({ icon, label, value, sub, delay }: { icon: React.ReactNode; label: string; value: string; sub: string; delay: number }) {
  return (
    <div
      className="glass-card rounded-2xl p-3.5 animate-fade-in"
      style={{ animationDelay: `${100 + delay * 80}ms` }}
    >
      <div className="flex items-center gap-1.5 mb-2">{icon}<span className="text-[10px] text-muted-foreground">{label}</span></div>
      <p className="text-lg font-black text-foreground" dir="ltr">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

export default AgentStats;
