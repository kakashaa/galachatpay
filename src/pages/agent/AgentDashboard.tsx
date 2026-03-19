import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Wallet, TrendingUp, Hash, Clock, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useAgentAuth } from "@/hooks/use-agent-auth";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import AgentBottomNav from "@/components/AgentBottomNav";
import { BANK_LABELS } from "@/lib/constants";

const AGENT_API = "https://galachat.site/project-z/api.php";

interface Transaction {
  id: string;
  user_name: string;
  uuid?: string;
  user_uuid?: string;
  amount_usd: number;
  coins: number;
  bank: string;
  time: string;
  avatar?: string;
}

interface DashboardData {
  agency_id: string;
  name: string;
  balance: number;
  original_balance: number;
  balance_usd: number;
  today_charges: number;
  today_count: number;
  last_charge: string;
  bonus_percent: number;
  recent_transactions: Transaction[];
}

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token, agentName, logout } = useAgentAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedBalance, setAnimatedBalance] = useState(0);
  const [enrichedTxs, setEnrichedTxs] = useState<Transaction[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_API}?action=agent_dashboard&token=${token}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        // Enrich transactions with avatars
        const txs: Transaction[] = (json.recent_transactions || []).slice(0, 5);
        setEnrichedTxs(txs);
        // Fetch avatars in background
        Promise.all(
          txs.map(async (tx) => {
            try {
              const r = await fetch(`${AGENT_API}?action=agent_lookup_user&token=${token}&uuid=${tx.uuid || tx.user_uuid}`);
              const d = await r.json();
              return { ...tx, avatar: d.avatar || "" };
            } catch { return { ...tx, avatar: "" }; }
          })
        ).then(setEnrichedTxs);
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

  const originalBalance = data?.original_balance || data?.balance || 1;
  const balancePercent = data ? Math.min((data.balance / originalBalance) * 100, 100) : 0;
  const barColor = balancePercent > 50 ? "from-green-400 to-green-500" : balancePercent > 20 ? "from-amber-400 to-amber-500" : "from-red-400 to-red-500";

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
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-5 border border-amber-500/20"
          >
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
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${balancePercent}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className={`h-full bg-gradient-to-l ${barColor} rounded-full`}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">{Math.round(balancePercent)}% متبقي</p>
          </motion.div>

          {/* Wallet Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-400">محفظة الوكيل</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-black/20 rounded-xl p-2">
                <p className="text-lg font-bold font-mono text-foreground" dir="ltr">${data?.today_charges || 0}</p>
                <p className="text-[9px] text-muted-foreground">شحنات اليوم</p>
              </div>
              <div className="bg-black/20 rounded-xl p-2">
                <p className="text-lg font-bold font-mono text-foreground">{data?.today_count || 0}</p>
                <p className="text-[9px] text-muted-foreground">عدد العمليات</p>
              </div>
              <div className="bg-black/20 rounded-xl p-2">
                <p className="text-lg font-bold font-mono text-foreground">{data?.bonus_percent || 0}%</p>
                <p className="text-[9px] text-muted-foreground">نسبة البونص</p>
              </div>
            </div>
          </motion.div>

          {/* Today Stats */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-3"
          >
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
              <p className="text-sm font-bold text-foreground">{data?.last_charge ? data.last_charge.split(" ")[1]?.slice(0, 5) : "لا يوجد"}</p>
              <p className="text-[9px] text-muted-foreground">آخر شحنة</p>
            </div>
          </motion.div>

          {/* Charge Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate("/agent/charge")}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xl shadow-lg shadow-amber-500/25 active:scale-[0.97] transition-all animate-pulse-glow flex items-center justify-center gap-3"
          >
            <Wallet className="w-6 h-6" />
            شحن جديد
          </motion.button>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => navigate("/agent/history")} className="text-xs text-amber-400 font-bold">عرض الكل</button>
              <h3 className="text-sm font-bold text-foreground">آخر العمليات</h3>
            </div>
            {enrichedTxs.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center">
                <p className="text-sm text-muted-foreground">لا توجد عمليات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-2">
                {enrichedTxs.map((tx, i) => (
                  <motion.div
                    key={tx.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className="bg-white/5 rounded-xl p-3 flex items-center gap-3"
                  >
                    {tx.avatar ? (
                      <img
                        src={tx.avatar}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        alt=""
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-sm">
                        {tx.user_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{tx.user_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">UUID: {tx.uuid || tx.user_uuid || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{BANK_LABELS[tx.bank] || tx.bank} · {tx.time}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-sm font-bold font-mono text-amber-400" dir="ltr">${tx.amount_usd}</p>
                      {tx.coins > 0 && <p className="text-[9px] text-muted-foreground font-mono">{tx.coins.toLocaleString()} كوينز</p>}
                    </div>
                  </motion.div>
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
