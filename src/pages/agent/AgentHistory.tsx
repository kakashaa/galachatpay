import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, X, ZoomIn, Receipt } from "lucide-react";
import { useAgentAuth } from "@/hooks/use-agent-auth";
import AgentBottomNav from "@/components/AgentBottomNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";

const AGENT_API = "https://galachat.site/project-z/api.php";
const RECEIPT_BASE = "https://galachat.site/admin-panel-data/agent-receipts/";

const bankOptions = [
  { value: "all", label: "الكل" },
  { value: "rajhi", label: "الراجحي" },
  { value: "jeep", label: "جيب" },
  { value: "kareem", label: "كريم" },
  { value: "zelle", label: "Zelle" },
  { value: "cashapp", label: "Cash App" },
  { value: "agent", label: "حساب الوكيل" },
];

const bankColors: Record<string, string> = {
  rajhi: "border-green-500/30 bg-green-500/5",
  jeep: "border-blue-500/30 bg-blue-500/5",
  kareem: "border-violet-500/30 bg-violet-500/5",
  zelle: "border-purple-700/30 bg-purple-700/5",
  cashapp: "border-emerald-400/30 bg-emerald-400/5",
  agent: "border-gray-500/30 bg-gray-500/5",
};

const bankLabels: Record<string, string> = {
  rajhi: "الراجحي", jeep: "جيب", kareem: "كريم", zelle: "Zelle", cashapp: "Cash App", agent: "حساب الوكيل",
};

const countryLabels: Record<string, string> = {
  sa: "السعودية 🇸🇦", ye: "اليمن 🇾🇪", us: "أمريكا 🇺🇸", agent: "الوكيل",
};

interface Transaction {
  id: string;
  user_name: string;
  uuid: string;
  amount_usd: number;
  coins: number;
  payment_method: string;
  payment_country: string;
  time: string;
  status: string;
  receipt_path?: string;
  notes?: string;
  balance_after?: number;
  receipt_confirmed?: boolean;
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
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [imageViewer, setImageViewer] = useState<string | null>(null);

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

  const formatTime = (time: string) => {
    if (!time) return "";
    const d = new Date(time);
    if (isNaN(d.getTime())) return time;
    return d.toLocaleString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

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
              <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">لا توجد عمليات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, i) => {
                const bankColor = bankColors[tx.payment_method] || "border-white/10";
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`glass-card rounded-2xl p-4 border ${bankColor}`}
                  >
                    {/* Transaction ID */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tx.status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        {tx.status === "success" ? "ناجحة" : "فشلت"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">🔖 {tx.id}</span>
                    </div>

                    {/* User & Amount */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-left" dir="ltr">
                        <p className="text-base font-black text-green-400">${tx.amount_usd?.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.coins?.toLocaleString()} كوينز</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{tx.user_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">UUID: {tx.uuid}</p>
                      </div>
                    </div>

                    {/* Bank & Date */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>📅 {formatTime(tx.time)}</span>
                      <span>{bankLabels[tx.payment_method] || tx.payment_method} — {countryLabels[tx.payment_country] || tx.payment_country}</span>
                    </div>

                    {/* Details button */}
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="w-full mt-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-amber-400 hover:bg-amber-500/5 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> عرض التفاصيل
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Sheet */}
      <Sheet open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background border-t border-amber-500/20">
          <SheetHeader>
            <SheetTitle className="text-amber-400 text-center">تفاصيل العملية</SheetTitle>
          </SheetHeader>
          {selectedTx && (
            <div className="space-y-4 py-4 px-1" dir="rtl">
              {/* TXN ID */}
              <div className="bg-muted/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">رقم العملية</p>
                <p className="text-sm font-mono font-bold text-foreground" dir="ltr">{selectedTx.id}</p>
              </div>

              {/* User */}
              <div className="bg-muted/10 rounded-xl p-3">
                <p className="text-xs font-bold text-foreground mb-2">المستخدم</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">الاسم:</span> <span className="font-bold">{selectedTx.user_name}</span></div>
                  <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono" dir="ltr">{selectedTx.uuid}</span></div>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-muted/10 rounded-xl p-3">
                <p className="text-xs font-bold text-foreground mb-2">المبلغ</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">الكوينز:</span> <span className="font-bold font-mono">{selectedTx.coins?.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">بالدولار:</span> <span className="font-bold font-mono text-amber-400" dir="ltr">${selectedTx.amount_usd?.toLocaleString()}</span></div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-muted/10 rounded-xl p-3">
                <p className="text-xs font-bold text-foreground mb-2">الدفع</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">الطريقة:</span> <span className="font-bold">{bankLabels[selectedTx.payment_method] || selectedTx.payment_method}</span></div>
                  <div><span className="text-muted-foreground">البلد:</span> <span className="font-bold">{countryLabels[selectedTx.payment_country] || selectedTx.payment_country}</span></div>
                </div>
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">تأكيد الاستلام:</span> <span className="font-bold">{selectedTx.receipt_confirmed ? "نعم" : "لا"}</span>
                </div>
              </div>

              {/* Receipt Image */}
              <div className="bg-muted/10 rounded-xl p-3">
                <p className="text-xs font-bold text-foreground mb-2">صورة الإيصال</p>
                {selectedTx.receipt_path ? (
                  <button
                    onClick={() => setImageViewer(`${RECEIPT_BASE}${selectedTx.receipt_path}`)}
                    className="w-full rounded-xl overflow-hidden border border-white/10 relative group"
                  >
                    <img
                      src={`${RECEIPT_BASE}${selectedTx.receipt_path}`}
                      alt="إيصال"
                      className="w-full max-h-48 object-contain bg-black/20"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center py-1">اضغط للتكبير</p>
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">لا يوجد إيصال</p>
                )}
              </div>

              {/* Notes */}
              {selectedTx.notes && (
                <div className="bg-muted/10 rounded-xl p-3">
                  <p className="text-xs font-bold text-foreground mb-1">ملاحظات</p>
                  <p className="text-xs text-muted-foreground">{selectedTx.notes}</p>
                </div>
              )}

              {/* Footer info */}
              <div className="bg-muted/10 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">📅 التاريخ</span><span className="font-mono">{formatTime(selectedTx.time)}</span></div>
                {selectedTx.balance_after !== undefined && (
                  <div className="flex justify-between"><span className="text-muted-foreground">الرصيد بعد الشحن</span><span className="font-mono font-bold">{selectedTx.balance_after?.toLocaleString()} كوينز</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">الحالة</span><span className={`font-bold ${selectedTx.status === "success" ? "text-green-400" : "text-red-400"}`}>{selectedTx.status === "success" ? "ناجحة" : "فاشلة"}</span></div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Full-screen Image Viewer */}
      <AnimatePresence>
        {imageViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setImageViewer(null)}
          >
            <button className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center z-10">
              <X className="w-5 h-5 text-white" />
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={imageViewer}
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
              alt="إيصال"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AgentBottomNav />
    </>
  );
};

export default AgentHistory;
