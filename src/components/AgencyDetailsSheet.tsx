import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2, ArrowLeftRight, PieChart, FileText,
  Calendar, ImageIcon, AlertTriangle, Wallet,
  X, Globe,
} from "lucide-react";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";

const API = "https://galachat.site/project-z/api.php";
const RECEIPT_BASE = "https://galachat.site/project-z/data/receipts/";

interface Agency {
  username: string;
  name: string;
  agency_id: string;
  balance: number;
  original_balance: number;
  status: string;
  phone: string;
  today_charges: number;
  today_count: number;
  last_login: string;
}

interface Transaction {
  id: string;
  txn_code: string;
  user_name: string;
  user_uuid: string;
  amount_coins: number;
  amount_usd: number;
  bank: string;
  country: string;
  receipt_path: string;
  created_at: string;
  status: string;
}

interface AgencyDetailsSheetProps {
  agency: Agency | null;
  open: boolean;
  onClose: () => void;
}

type SubTab = "transactions" | "distribution" | "summary";

const BANK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "الراجحي": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  "جيب": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  "كريمي": { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  "Zelle": { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
  "Cash App": { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  "حساب الوكيل": { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
};

const COUNTRY_LABELS: Record<string, string> = {
  "السعودية": "SA",
  "اليمن": "YE",
  "أمريكا": "US",
  "مصر": "EG",
  "العراق": "IQ",
};

const getBankColor = (bank: string) => {
  for (const [key, val] of Object.entries(BANK_COLORS)) {
    if (bank?.includes(key)) return val;
  }
  return { bg: "bg-muted/10", text: "text-muted-foreground", border: "border-border/20" };
};

const AgencyDetailsSheet: React.FC<AgencyDetailsSheetProps> = ({ agency, open, onClose }) => {
  const [subTab, setSubTab] = useState<SubTab>("transactions");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalUsd, setTotalUsd] = useState(0);
  const [byBank, setByBank] = useState<Record<string, { total_usd: number; count: number }>>({});
  const [byCountry, setByCountry] = useState<Record<string, { total_usd: number; count: number }>>({});
  const [dateFilter, setDateFilter] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  useEffect(() => {
    if (open && agency) {
      setSubTab("transactions");
      fetchTransactions();
    }
  }, [open, agency]);

  const fetchTransactions = async () => {
    if (!agency) return;
    setLoading(true);
    try {
      const url = `${API}?action=agent_transactions&admin_key=ghala2026owner&username=${agency.username}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        setTotalCount(data.total_count || 0);
        setTotalUsd(data.total_usd || 0);
        setByBank(data.by_bank || {});
        setByCountry(data.by_country || {});
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (!agency) return null;

  const isActive = agency.status === "active";
  const balanceUSD = (agency.balance / 8500).toFixed(2);
  const totalCharged = agency.original_balance - agency.balance;
  const totalChargedUSD = (totalCharged / 8500).toFixed(2);
  const consumptionPct = agency.original_balance > 0
    ? Math.min(100, Math.round((totalCharged / agency.original_balance) * 100))
    : 0;
  const remainingPct = 100 - consumptionPct;

  // Theft alert: if API total_usd significantly exceeds what balance was deducted
  const expectedDeductionUSD = totalCharged / 8500;
  const hasDiscrepancy = totalUsd > 0 && Math.abs(totalUsd - expectedDeductionUSD) > 5;

  const filteredTxns = dateFilter
    ? transactions.filter(t => t.created_at?.startsWith(dateFilter))
    : transactions;

  const tabs: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: "transactions", label: "العمليات", icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
    { key: "distribution", label: "التوزيع", icon: <PieChart className="w-3.5 h-3.5" /> },
    { key: "summary", label: "الملخص", icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl bg-[#12141f] border-white/10 p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/5">
              <SheetHeader className="mb-0">
                <SheetTitle className="text-right flex items-center justify-between">
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <div className="text-right">
                    <h2 className="text-base font-bold text-foreground">{agency.name}</h2>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      <span className="text-[10px] text-muted-foreground font-mono">ID: {agency.agency_id}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {isActive ? "نشط" : "مجمّد"}
                      </span>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              {/* Balance bar */}
              <div className="mt-3 bg-white/[0.03] rounded-xl p-3 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">الرصيد المتبقي</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">${balanceUSD}</span>
                </div>
                <p className="text-lg font-black text-amber-400 font-mono text-right">{agency.balance?.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">كوينز</span></p>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 mt-3 bg-white/[0.03] rounded-xl p-1 border border-white/5">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setSubTab(t.key)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 ${
                      subTab === t.key ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {/* ===== Transactions Tab ===== */}
                  {subTab === "transactions" && (
                    <motion.div key="txns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {/* Date filter */}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <input
                          type="date"
                          value={dateFilter}
                          onChange={e => setDateFilter(e.target.value)}
                          className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground"
                        />
                        {dateFilter && (
                          <button onClick={() => setDateFilter("")} className="text-[10px] text-amber-400 hover:underline">
                            مسح
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-muted-foreground">{filteredTxns.length} عملية</p>

                      {filteredTxns.length === 0 ? (
                        <div className="text-center py-14">
                          <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">لا توجد عمليات</p>
                        </div>
                      ) : (
                        filteredTxns.map((txn, i) => {
                          const bankColor = getBankColor(txn.bank || "");
                          return (
                            <motion.div
                              key={txn.id || i}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.3 }}
                              className="bg-[#1c1e2e] border border-white/5 rounded-2xl p-4 space-y-2.5 hover:border-white/10 transition-colors"
                            >
                              {/* TXN code + status */}
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-muted-foreground">{txn.txn_code || `TXN-${txn.id?.slice(-8)}`}</span>
                                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  ناجحة
                                </span>
                              </div>

                              {/* User */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold text-foreground">{txn.user_name || "مستخدم"}</p>
                                  <p className="text-[9px] font-mono text-muted-foreground">{txn.user_uuid}</p>
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-black text-amber-400 font-mono">{txn.amount_coins?.toLocaleString()}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">${txn.amount_usd?.toFixed(2)}</p>
                                </div>
                              </div>

                              {/* Bank + Date */}
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] px-2 py-1 rounded-lg ${bankColor.bg} ${bankColor.text} border ${bankColor.border} font-bold`}>
                                  {txn.bank}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {txn.created_at ? new Date(txn.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : "—"}
                                </span>
                              </div>

                              {/* Receipt button */}
                              {txn.receipt_path && (
                                <button
                                  onClick={() => setReceiptPreview(`${RECEIPT_BASE}${txn.receipt_path}`)}
                                  className="flex items-center gap-1.5 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  عرض الإيصال
                                </button>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </motion.div>
                  )}

                  {/* ===== Distribution Tab ===== */}
                  {subTab === "distribution" && (
                    <motion.div key="dist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      {/* By Bank */}
                      <div>
                        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-amber-400" />
                          حسب البنك
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(byBank).length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-6">لا توجد بيانات</p>
                          ) : (
                            Object.entries(byBank).map(([bank, info], i) => {
                              const bankColor = getBankColor(bank);
                              return (
                                <motion.div
                                  key={bank}
                                  initial={{ opacity: 0, x: -12 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.06, duration: 0.35 }}
                                  className={`${bankColor.bg} border ${bankColor.border} rounded-2xl p-4 flex items-center justify-between`}
                                >
                                  <div>
                                    <p className={`text-sm font-bold ${bankColor.text}`}>{bank}</p>
                                    <p className="text-[10px] text-muted-foreground">{info.count} عملية</p>
                                  </div>
                                  <span className={`text-lg font-black font-mono ${bankColor.text}`}>${info.total_usd?.toFixed(2)}</span>
                                </motion.div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* By Country */}
                      <div>
                        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-blue-400" />
                          حسب الدولة
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(byCountry).length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-6 col-span-2">لا توجد بيانات</p>
                          ) : (
                            Object.entries(byCountry).map(([country, info], i) => (
                              <motion.div
                                key={country}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.06, duration: 0.3 }}
                                className="bg-[#1c1e2e] border border-white/5 rounded-2xl p-4 text-center"
                              >
                                <span className="text-2xl">{COUNTRY_FLAGS[country] || "🌍"}</span>
                                <p className="text-xs font-bold text-foreground mt-1">{country}</p>
                                <p className="text-base font-black text-amber-400 font-mono mt-1">${info.total_usd?.toFixed(2)}</p>
                                <p className="text-[9px] text-muted-foreground">{info.count} عملية</p>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ===== Summary Tab ===== */}
                  {subTab === "summary" && (
                    <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      {/* Discrepancy alert */}
                      {hasDiscrepancy && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3"
                        >
                          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-red-400">تنبيه: يوجد فرق في الأرقام</p>
                            <p className="text-[10px] text-red-400/70 mt-1">
                              المشحون حسب API: ${totalUsd.toFixed(2)} — المخصوم من الرصيد: ${expectedDeductionUSD.toFixed(2)}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Stats cards */}
                      <div className="space-y-3">
                        {[
                          { label: "الرصيد الأصلي", value: agency.original_balance?.toLocaleString(), sub: `$${(agency.original_balance / 8500).toFixed(2)}`, color: "text-blue-400" },
                          { label: "إجمالي المشحون", value: totalCharged.toLocaleString(), sub: `$${totalChargedUSD}`, color: "text-amber-400" },
                          { label: "المتبقي", value: agency.balance?.toLocaleString(), sub: `$${balanceUSD}`, color: "text-emerald-400" },
                          { label: "عدد العمليات الكلي", value: totalCount.toString(), sub: `$${totalUsd.toFixed(2)} إجمالي`, color: "text-violet-400" },
                        ].map((item, i) => (
                          <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.35 }}
                            className="bg-[#1c1e2e] border border-white/5 rounded-2xl p-4 flex items-center justify-between"
                          >
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                            <div className="text-left">
                              <p className={`text-base font-black font-mono ${item.color}`}>{item.value} <span className="text-[9px] text-muted-foreground font-normal">كوينز</span></p>
                              <p className="text-[10px] text-muted-foreground font-mono">{item.sub}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Consumption progress */}
                      <div className="bg-[#1c1e2e] border border-white/5 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">نسبة الاستهلاك</span>
                          <span className="text-sm font-bold text-amber-400 font-mono">{consumptionPct}%</span>
                        </div>
                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${consumptionPct}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                            className={`h-full rounded-full ${
                              consumptionPct > 80 ? "bg-red-500" : consumptionPct > 50 ? "bg-orange-500" : "bg-amber-500"
                            }`}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>مستهلك: {consumptionPct}%</span>
                          <span>متبقي: {remainingPct}%</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Receipt Preview Dialog */}
      <Dialog open={!!receiptPreview} onOpenChange={() => setReceiptPreview(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-2 bg-black/90 border-white/10">
          {receiptPreview && (
            <img src={receiptPreview} alt="إيصال" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgencyDetailsSheet;
