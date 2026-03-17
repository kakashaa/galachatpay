import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Clock, Search, Loader2, FileText, Hash, CalendarDays,
  User, Coins, ClipboardList, Zap, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

const API = "https://galachat.site/project-z/api.php";
const COINS_PER_USD = 8500;

interface SalaryCharge {
  id: string;
  uuid: string;
  user_name: string;
  amount_usd: number;
  coins_charged: number;
  reference_id: string;
  transfer_verified: boolean;
  status: "completed" | "pending" | "failed";
  created_at: string;
}

interface Props {
  canAct: boolean;
}

const getMonthOptions = () => {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("ar-SA", { year: "numeric", month: "long" });
    months.push({ value, label });
  }
  return months;
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatDateSA = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
};

const AdminSalaryChargeManager: React.FC<Props> = ({ canAct }) => {
  const [charges, setCharges] = useState<SalaryCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const monthOptions = useMemo(getMonthOptions, []);

  // Manual charge sheet
  const [chargeSheet, setChargeSheet] = useState(false);
  const [chargeUuid, setChargeUuid] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeRef, setChargeRef] = useState("");
  const [chargeLoading, setChargeLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?action=salary_charge_list&admin_key=ghala2026owner&month=${selectedMonth}`);
      const data = await res.json();
      if (data.success || data.charges) {
        setCharges((data.charges || []).map((c: any) => ({
          id: c.id || c.reference_id || Math.random().toString(),
          uuid: c.uuid || c.user_uuid || "",
          user_name: c.user_name || c.name || "",
          amount_usd: c.amount_usd || c.amount || 0,
          coins_charged: c.coins_charged || c.coins || (c.amount_usd || c.amount || 0) * COINS_PER_USD,
          reference_id: c.reference_id || c.ref_id || "",
          transfer_verified: c.transfer_verified ?? true,
          status: c.status === "completed" || c.status === "done" ? "completed" : c.status === "failed" ? "failed" : "pending",
          created_at: c.created_at || c.date || new Date().toISOString(),
        })));
      } else {
        setCharges([]);
      }
    } catch {
      toast.error("فشل في جلب بيانات شحن الرواتب");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleManualCharge = async () => {
    if (!chargeUuid.trim() || !chargeAmount.trim() || !chargeRef.trim()) {
      toast.error("يجب ملء جميع الحقول");
      return;
    }
    const amountNum = parseFloat(chargeAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("المبلغ غير صحيح");
      return;
    }
    setChargeLoading(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "salary_charge_manual",
          admin_key: "ghala2026owner",
          uuid: chargeUuid.trim(),
          amount: amountNum,
          reference_id: chargeRef.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تم شحن ${(amountNum * COINS_PER_USD).toLocaleString()} كوينز بنجاح`);
        setChargeSheet(false);
        setChargeUuid("");
        setChargeAmount("");
        setChargeRef("");
        fetchData();
      } else {
        toast.error(data.error || "فشل في الشحن");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setChargeLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return charges.filter(c => {
      if (filter === "completed" && c.status !== "completed") return false;
      if (filter === "pending" && c.status !== "pending") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(c.user_name?.toLowerCase().includes(q) || c.uuid?.includes(q) || c.reference_id?.includes(q)))
          return false;
      }
      return true;
    });
  }, [charges, filter, search]);

  const stats = useMemo(() => {
    const completed = filtered.filter(c => c.status === "completed");
    const pending = filtered.filter(c => c.status === "pending");
    return {
      total: filtered.length,
      totalAmount: filtered.reduce((s, c) => s + c.amount_usd, 0),
      completed: completed.length,
      completedAmount: completed.reduce((s, c) => s + c.amount_usd, 0),
      pending: pending.length,
      pendingAmount: pending.reduce((s, c) => s + c.amount_usd, 0),
    };
  }, [filtered]);

  const statusBadge = (status: string) => {
    if (status === "completed") return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10">
        <CheckCircle className="w-3 h-3" /> تم الشحن
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-400 bg-amber-500/10">
        <Clock className="w-3 h-3" /> معلقة
      </span>
    );
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: "all" as const, label: "الكل", icon: <ClipboardList className="w-4 h-4" />, count: stats.total, amount: stats.totalAmount, color: "text-foreground", border: "border-white/5", bg: "bg-card/50" },
          { key: "completed" as const, label: "تم الشحن", icon: <CheckCircle className="w-4 h-4" />, count: stats.completed, amount: stats.completedAmount, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
          { key: "pending" as const, label: "معلقة", icon: <Clock className="w-4 h-4" />, count: stats.pending, amount: stats.pendingAmount, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
        ].map((card, i) => (
          <motion.button
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            onClick={() => setFilter(card.key)}
            className={`relative rounded-xl p-3 text-center transition-all duration-300 border backdrop-blur-sm ${card.border} ${card.bg} ${
              filter === card.key ? "border-white/20 scale-[1.02]" : "hover:border-white/10"
            }`}>
            <div className={`${card.color} mb-1 flex justify-center`}>{card.icon}</div>
            <p className={`text-2xl font-bold font-mono tabular-nums ${card.color}`}>{card.count}</p>
            <p className="text-[10px] text-muted-foreground">{card.label}</p>
            <p className={`text-xs font-semibold font-mono tabular-nums ${card.color} mt-0.5`}>${card.amount?.toLocaleString()}</p>
          </motion.button>
        ))}
      </div>

      {/* ===== FILTERS ===== */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث: UUID، اسم، رقم مرجعي..."
            className="bg-white/5 border-white/10 pr-9 text-xs h-9 rounded-xl" dir="rtl" />
        </div>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl text-xs px-2 h-9 text-foreground w-[150px]">
          {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        {canAct && isCurrentMonth && (
          <Button onClick={() => setChargeSheet(true)} size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 rounded-xl text-xs px-3">
            <Zap className="w-3.5 h-3.5 ml-1" /> شحن يدوي
          </Button>
        )}
      </div>

      {/* ===== LIST ===== */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card/50 border border-white/5 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">لا توجد عمليات شحن رواتب</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((charge, i) => (
            <motion.div key={charge.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className="bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4 space-y-2.5 hover:border-white/10 transition-colors">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{charge.user_name || "مستخدم"}</span>
                      {statusBadge(charge.status)}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                      <Hash className="w-3 h-3" /> UUID: {charge.uuid}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">${charge.amount_usd.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-400 font-mono">{charge.coins_charged.toLocaleString()} كوينز</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.03] rounded-xl p-2.5 text-xs">
                  <span className="text-muted-foreground text-[10px] flex items-center gap-1 mb-0.5">
                    <Hash className="w-3 h-3" /> الرقم المرجعي
                  </span>
                  <span className="font-bold text-foreground font-mono">{charge.reference_id || "—"}</span>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-2.5 text-xs">
                  <span className="text-muted-foreground text-[10px] flex items-center gap-1 mb-0.5">
                    <CalendarDays className="w-3 h-3" /> التاريخ
                  </span>
                  <span className="font-bold text-foreground">{new Date(charge.created_at).toLocaleDateString("ar")}</span>
                </div>
              </div>

              {/* Transfer verification */}
              <div className={`flex items-center gap-2 rounded-xl p-2 text-xs font-bold ${
                charge.transfer_verified ? "bg-emerald-500/5 text-emerald-400" : "bg-amber-500/5 text-amber-400"
              }`}>
                {charge.transfer_verified
                  ? <><CheckCircle className="w-3.5 h-3.5" /> تم التحقق من التحويل</>
                  : <><Clock className="w-3.5 h-3.5" /> بانتظار التحقق</>
                }
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== MANUAL CHARGE SHEET ===== */}
      <Sheet open={chargeSheet} onOpenChange={setChargeSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0f1117] border-white/5" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/5">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-emerald-400" /> شحن راتب يدوي
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              شحن كوينز لحساب المستخدم مقابل راتبه
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" /> UUID المستخدم *
              </label>
              <Input value={chargeUuid} onChange={e => setChargeUuid(e.target.value)}
                placeholder="مثال: 4217361" dir="ltr"
                className="bg-white/5 border-white/10 rounded-xl h-11" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-muted-foreground" /> المبلغ بالدولار *
              </label>
              <Input type="number" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)}
                placeholder="مثال: 100" dir="ltr"
                className="bg-white/5 border-white/10 rounded-xl h-11" />
              {chargeAmount && !isNaN(parseFloat(chargeAmount)) && parseFloat(chargeAmount) > 0 && (
                <p className="text-[10px] text-emerald-400 font-mono">
                  = {(parseFloat(chargeAmount) * COINS_PER_USD).toLocaleString()} كوينز
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" /> الرقم المرجعي للتحويل *
              </label>
              <Input value={chargeRef} onChange={e => setChargeRef(e.target.value)}
                placeholder="مثال: 50602" dir="ltr"
                className="bg-white/5 border-white/10 rounded-xl h-11" />
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              سيتم شحن الكوينز مباشرة لحساب المستخدم ($1 = {COINS_PER_USD.toLocaleString()} كوينز)
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setChargeSheet(false)}
                className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all duration-200">
                إلغاء
              </button>
              <Button onClick={handleManualCharge}
                disabled={chargeLoading || !chargeUuid.trim() || !chargeAmount.trim() || !chargeRef.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all">
                {chargeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-4 h-4 ml-1.5" /> تأكيد الشحن</>}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminSalaryChargeManager;
