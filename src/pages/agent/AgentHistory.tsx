import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Filter, Image as ImageIcon } from "lucide-react";
import { useAgentAuth } from "@/hooks/use-agent-auth";
import AgentBottomNav from "@/components/AgentBottomNav";

const AGENT_API = "https://galachat.site/admin-panel-api.php";

const bankOptions = [
  { value: "all", label: "الكل" },
  { value: "rajhi", label: "الراجحي" },
  { value: "jeep", label: "جيب" },
  { value: "kareem", label: "كريم" },
  { value: "zelle", label: "Zelle" },
  { value: "cashapp", label: "Cash App" },
  { value: "agent", label: "حساب الوكيل" },
];

interface Transaction {
  id: string;
  user_name: string;
  user_uuid: string;
  amount_usd: number;
  coins: number;
  bank: string;
  country: string;
  time: string;
  date: string;
  status: string;
  receipt_url?: string;
}

const AgentHistory: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAgentAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("all");
  const [totalUsd, setTotalUsd] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [receiptModal, setReceiptModal] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "agent_history", token });
      if (dateFilter) params.set("date", dateFilter);
      if (bankFilter !== "all") params.set("bank", bankFilter);
      const res = await fetch(`${AGENT_API}?${params}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        setTotalUsd(data.total_usd || 0);
        setTotalCount(data.total_count || 0);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [token, dateFilter, bankFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <>
      <div className="mobile-container text-foreground pb-32 overflow-y-auto bg-background">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <button onClick={() => navigate("/agent")} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <h1 className="text-base font-black text-amber-400">سجل العمليات</h1>
          <div className="w-8" />
        </header>

        <div className="px-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-amber-400" dir="ltr">${totalUsd.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">إجمالي المبلغ</p>
            </div>
            <div className="glass-card rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-foreground">{totalCount}</p>
              <p className="text-[10px] text-muted-foreground">عدد العمليات</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm outline-none"
            />
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm outline-none"
            >
              {bankOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-sm text-muted-foreground">لا توجد عمليات</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className={`glass-card rounded-2xl p-3 border ${tx.status === "failed" ? "border-destructive/30" : "border-green-500/10"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-green-400" dir="ltr">${tx.amount_usd}</span>
                      {tx.receipt_url && (
                        <button onClick={() => setReceiptModal(tx.receipt_url!)} className="text-muted-foreground hover:text-foreground">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">{tx.user_name}</span>
                      <span className="text-[10px] text-muted-foreground mr-2" dir="ltr">{tx.user_uuid}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{tx.date} {tx.time}</span>
                    <span className="text-[10px] text-muted-foreground">{tx.bank} • {tx.country}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setReceiptModal(null)}>
          <img src={receiptModal} className="max-w-full max-h-[80vh] rounded-xl" alt="إيصال" />
        </div>
      )}

      <AgentBottomNav />
    </>
  );
};

export default AgentHistory;
