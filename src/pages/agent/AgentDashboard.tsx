import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Wallet, TrendingUp, Hash, Clock, RefreshCw } from "lucide-react";
import { useAgentAuth } from "@/hooks/use-agent-auth";
import AgentBottomNav from "@/components/AgentBottomNav";

const AGENT_API = "https://galachat.site/admin-panel-api.php";

interface DashboardData {
  agency_id: string;
  name: string;
  balance: number;
  balance_usd: number;
  today_charges: number;
  today_count: number;
  last_charge_time: string;
  recent_transactions: Array<{
    id: string;
    user_name: string;
    amount_usd: number;
    coins: number;
    bank: string;
    time: string;
  }>;
}

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token, agentName, logout } = useAgentAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedBalance, setAnimatedBalance] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_API}?action=agent_dashboard&token=${token}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Animate balance count-up
  useEffect(() => {
    if (!data?.balance) return;
    const target = data.balance;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedBalance(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [data?.balance]);

  const balancePercent = data ? Math.min((data.balance / (data.balance + (data.today_charges * 8500 || 1))) * 100, 100) : 0;
  const barColor = balancePercent > 30 ? "from-green-400 to-green-500" : balancePercent > 10 ? "from-amber-400 to-amber-500" : "from-red-400 to-red-500";

  if (loading) {
    return (
      <div className="mobile-container flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mobile-container text-foreground pb-32 overflow-y-auto bg-background">
        {/* Header */}
        <header className="flex justify-between items-center px-4 pt-6 pb-3">
          <button onClick={logout} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10">
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-black text-amber-400">{agentName || "وكيل الشحن"}</h1>
            {data?.agency_id && <p className="text-[10px] text-muted-foreground" dir="ltr">#{data.agency_id}</p>}
          </div>
          <button onClick={fetchData} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </header>

        <main className="px-4 space-y-4">
          {/* Balance Card */}
          <div className="glass-card rounded-3xl p-5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">رصيد الوكالة</span>
            </div>
            <div className="text-center py-3">
              <p className="text-3xl font-black text-foreground" dir="ltr">
                {animatedBalance.toLocaleString()} <span className="text-base text-muted-foreground">كوينز</span>
              </p>
              {data?.balance_usd !== undefined && (
                <p className="text-lg text-amber-400 font-bold mt-1" dir="ltr">= ${data.balance_usd.toLocaleString()}</p>
              )}
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full bg-gradient-to-l ${barColor} rounded-full transition-all duration-1000`}
                style={{ width: `${balancePercent}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">{Math.round(balancePercent)}% متبقي</p>
          </div>

          {/* Today Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-2xl p-3 text-center">
              <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-black text-foreground" dir="ltr">${data?.today_charges || 0}</p>
              <p className="text-[9px] text-muted-foreground">شحنات اليوم</p>
            </div>
            <div className="glass-card rounded-2xl p-3 text-center">
              <Hash className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-black text-foreground">{data?.today_count || 0}</p>
              <p className="text-[9px] text-muted-foreground">عدد العمليات</p>
            </div>
            <div className="glass-card rounded-2xl p-3 text-center">
              <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{data?.last_charge_time || "--:--"}</p>
              <p className="text-[9px] text-muted-foreground">آخر شحنة</p>
            </div>
          </div>

          {/* Charge Button */}
          <button
            onClick={() => navigate("/agent/charge")}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xl shadow-lg shadow-amber-500/25 active:scale-[0.97] transition-all animate-pulse-glow flex items-center justify-center gap-3"
          >
            <Wallet className="w-6 h-6" />
            شحن جديد
          </button>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => navigate("/agent/history")} className="text-xs text-amber-400 font-bold">عرض الكل</button>
              <h3 className="text-sm font-bold text-foreground">آخر العمليات</h3>
            </div>
            {(!data?.recent_transactions || data.recent_transactions.length === 0) ? (
              <div className="glass-card rounded-2xl p-6 text-center">
                <p className="text-sm text-muted-foreground">لا توجد عمليات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recent_transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="glass-card rounded-2xl p-3 flex items-center justify-between">
                    <div className="text-left" dir="ltr">
                      <p className="text-sm font-bold text-green-400">${tx.amount_usd}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{tx.user_name}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.bank}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <AgentBottomNav />
    </>
  );
};

export default AgentDashboard;
