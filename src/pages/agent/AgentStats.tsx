import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, Wallet, Gem } from "lucide-react";
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
}

const AgentStats: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAgentAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_API}?action=agent_stats&token=${token}`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="mobile-container flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const maxBank = stats?.by_bank ? Math.max(...Object.values(stats.by_bank), 1) : 1;
  const weeklyTotals = stats?.weekly?.map(w => w.total) || [];
  const maxWeekly = weeklyTotals.length ? Math.max(...weeklyTotals, 1) : 1;

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
          <div className="glass-card rounded-2xl p-4 space-y-3">
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
                className="h-full bg-gradient-to-l from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${stats?.consumption_percent || 0}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">نسبة الاستهلاك: {stats?.consumption_percent || 0}%</p>
          </div>

          {/* Bonus/Tier Card */}
          {stats?.tier && (
            <div className="glass-card rounded-2xl p-4">
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
          <div className="glass-card rounded-2xl p-4">
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
                        <div className="h-full bg-gradient-to-l from-amber-400 to-amber-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
            )}
          </div>

          {/* Weekly Chart */}
          {stats?.weekly && stats.weekly.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm font-bold text-amber-400 mb-3">شحنات الأسبوع</p>
              <div className="flex items-end gap-2 h-24">
                {stats.weekly.map((w, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(w.total / maxWeekly) * 100}%`, minHeight: w.total > 0 ? 4 : 0 }}
                    />
                    <span className="text-[8px] text-muted-foreground">{w.day || ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <AgentBottomNav />
    </>
  );
};

export default AgentStats;
