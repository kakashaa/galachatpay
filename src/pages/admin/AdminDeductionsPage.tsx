import React, { useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Loader2, Search, Eye, Trash2, RotateCcw, AlertTriangle, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { cn } from "@/lib/utils";
import { galaApi } from "@/services/galaApi";

const COINS_PER_USD = 7500;
const FETCH_TIMEOUT = 120000;

type DatePeriod = "today" | "yesterday" | "week" | "month";

const DATE_PERIODS: { id: DatePeriod; label: string; emoji: string; color: string }[] = [
  { id: "today", label: "اليوم", emoji: "🟢", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  { id: "yesterday", label: "أمس", emoji: "🔵", color: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
  { id: "week", label: "آخر أسبوع", emoji: "🟡", color: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" },
  { id: "month", label: "الشهر كامل", emoji: "🟣", color: "border-violet-500/30 bg-violet-500/10 text-violet-400" },
];

function getDateRange(period: DatePeriod): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  switch (period) {
    case "today": return { from: fmt(today), to: fmt(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
    case "week": {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      return { from: fmt(w), to: fmt(today) };
    }
    case "month": {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: fmt(m), to: fmt(today) };
    }
  }
}

async function apiCallWithTimeout(action: string, params: Record<string, string | number>, requireAdmin = false): Promise<any> {
  return galaApi.dbProxy(action, params, requireAdmin);
}

interface Receiver {
  uuid: string;
  name: string;
  total: number;
  count: number;
  gifts?: any[];
}

interface LookupResult {
  ok: boolean;
  sender: { uuid: string; name: string };
  total_gifts: number;
  total_coins: number;
  total_usd: number;
  receivers: Receiver[];
}

interface ImpactReceiver {
  uuid: string;
  name: string;
  deduct_diamonds: number;
  deduct_usd?: number;
  monthly_before?: number;
  monthly_after?: number;
  salary_before: number;
  salary_after: number;
  agency_before: number;
  agency_after: number;
}

interface ImpactResult {
  ok: boolean;
  sender: { uuid: string; name: string };
  total_deduct_coins: number;
  receivers: ImpactReceiver[];
}

const AdminDeductionsPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const { confirm, ConfirmDialog } = useConfirmModal();

  // Search form
  const [senderUuid, setSenderUuid] = useState("");
  const [receiverUuid, setReceiverUuid] = useState("");
  const [period, setPeriod] = useState<DatePeriod>("month");

  // State
  const [loading, setLoading] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);
  const [lookupData, setLookupData] = useState<LookupResult | null>(null);
  const [impactData, setImpactData] = useState<ImpactResult | null>(null);

  // Execute deduction
  const [execLoading, setExecLoading] = useState(false);
  const [execProgress, setExecProgress] = useState<{ done: number; total: number; results: any[] }>({ done: 0, total: 0, results: [] });
  const [execDone, setExecDone] = useState(false);

  // Restore
  const [restoreUuid, setRestoreUuid] = useState("");
  const [restoreAmount, setRestoreAmount] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ before: number; restored: number; after: number } | null>(null);

  // Manual deduct
  const [deductUuid, setDeductUuid] = useState("");
  const [deductAmount, setDeductAmount] = useState("");
  const [deductManualLoading, setDeductManualLoading] = useState(false);
  const [deductManualResult, setDeductManualResult] = useState<{
    uuid: string; user?: string; deducted: number; before: number; after: number;
  } | null>(null);

  const buildParams = () => {
    const { from, to } = getDateRange(period);
    const params: Record<string, string> = { sender_uuid: senderUuid.trim(), date_from: from, date_to: to };
    if (receiverUuid.trim()) params.receiver_uuid = receiverUuid.trim();
    return params;
  };

  const handleSearch = async () => {
    if (!senderUuid.trim()) { toast.error("أدخل UUID المرسل"); return; }
    setLoading(true);
    setLookupData(null);
    setImpactData(null);
    setExecDone(false);
    try {
      const data = await apiCallWithTimeout("gift-lookup", buildParams());
      if (!data.ok) { toast.error(data.error || "فشل البحث"); return; }
      setLookupData(data);
      if (!data.receivers?.length) toast("لا توجد نتائج");
    } catch (e: any) {
      toast.error(e.name === "AbortError" ? "انتهت المهلة — حاول تقليل الفترة" : "خطأ بالاتصال");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewImpact = async () => {
    if (!senderUuid.trim()) { toast.error("أدخل UUID المرسل أولاً"); return; }
    setImpactLoading(true);
    setImpactData(null);
    setExecDone(false);
    try {
      const data: ImpactResult = await apiCallWithTimeout("gift-impact", buildParams());
      if (!data.ok) { toast.error("فشل عرض التأثير"); return; }
      setImpactData(data);
    } catch (e: any) {
      toast.error(e.name === "AbortError" ? "انتهت المهلة" : "خطأ بالاتصال");
    } finally {
      setImpactLoading(false);
    }
  };

  const handleExecuteDeduction = async () => {
    if (!impactData || !senderUuid.trim()) return;
    const affected = impactData.receivers.filter(r => r.salary_before !== r.salary_after || r.agency_before !== r.agency_after);
    if (affected.length === 0) { toast("لا يوجد متأثرين"); return; }

    const ok = await confirm({
      title: "تأكيد تنفيذ الخصم",
      message: `سيتم خصم ${impactData.total_deduct_coins.toLocaleString()} كوينز من ${affected.length} مستخدم وتعديل رواتبهم`,
      danger: true,
      confirmText: "⚡ تنفيذ الخصم",
    });
    if (!ok) return;

    setExecLoading(true);
    setExecProgress({ done: 0, total: affected.length, results: [] });

    const { from, to } = getDateRange(period);
    const results: any[] = [];

    for (const recv of affected) {
      try {
        const data = await galaApi.giftDeduct(senderUuid.trim(), recv.uuid, from, to) as any;
        results.push({ ...data, receiver_name: recv.name, receiver_uuid: recv.uuid });
      } catch {
        results.push({ ok: false, receiver_name: recv.name, receiver_uuid: recv.uuid, error: "timeout" });
      }
      setExecProgress({ done: results.length, total: affected.length, results: [...results] });
    }

    setExecLoading(false);
    setExecDone(true);
    toast.success("تم تنفيذ الخصم");
  };

  const handleRestore = async () => {
    if (!restoreUuid.trim() || !restoreAmount.trim()) { toast.error("أدخل UUID والمبلغ"); return; }
    const ok = await confirm({
      title: "تأكيد الاستعادة",
      message: `استعادة ${Number(restoreAmount).toLocaleString()} كوينز للمستخدم ${restoreUuid}`,
      confirmText: "استعادة",
    });
    if (!ok) return;
    setRestoreLoading(true);
    setRestoreResult(null);
    try {
      const data = await galaApi.giftRestore(restoreUuid.trim(), parseInt(restoreAmount.trim())) as any;
      if (data.ok) {
        setRestoreResult({ before: data.before, restored: data.restored, after: data.after });
        toast.success(`تم استعادة ${data.restored?.toLocaleString()} كوينز — الرصيد: ${data.before?.toLocaleString()} → ${data.after?.toLocaleString()}`);
      } else {
        toast.error(data.error || "فشل الاستعادة");
      }
    } catch { toast.error("خطأ بالاتصال"); }
    finally { setRestoreLoading(false); }
  };

  const parsedDeductAmount = parseInt(deductAmount) || 0;

  const handleManualDeduct = async () => {
    if (!deductUuid.trim() || !deductAmount.trim()) { toast.error("أدخل UUID والمبلغ"); return; }
    const ok = await confirm({
      title: "تأكيد الخصم اليدوي",
      message: `هل أنت متأكد من خصم ${parsedDeductAmount.toLocaleString()} كوينز من ${deductUuid}؟`,
      danger: true,
      confirmText: "تنفيذ الخصم",
    });
    if (!ok) return;
    setDeductManualLoading(true);
    setDeductManualResult(null);
    try {
      const data = await galaApi.deductDiamonds(deductUuid.trim(), parsedDeductAmount) as any;
      if (data.ok) {
        setDeductManualResult({
          uuid: data.uuid || deductUuid.trim(),
          user: data.user,
          deducted: data.deducted ?? parsedDeductAmount,
          before: data.before,
          after: data.after,
        });
        toast.success(`تم خصم ${(data.deducted ?? parsedDeductAmount).toLocaleString()} كوينز من ${data.user || deductUuid}`);
      } else {
        toast.error(data.error || "فشل الخصم");
      }
    } catch { toast.error("خطأ بالاتصال"); }
    finally { setDeductManualLoading(false); }
  };

  const affectedReceivers = impactData?.receivers.filter(r => r.salary_before !== r.salary_after || r.agency_before !== r.agency_after) || [];

  return (
    <AdminPageLayout title="الخصومات" accentColor="hsl(0 84% 60%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">

        {/* ── Gift Search Section ── */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-xs font-bold text-red-400 flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> بحث الهدايا</p>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">UUID المرسل *</label>
              <Input value={senderUuid} onChange={e => setSenderUuid(e.target.value.replace(/\D/g, ""))}
                placeholder="مثال: 4282859" dir="ltr" className="h-9 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">UUID المستقبل (اختياري)</label>
              <Input value={receiverUuid} onChange={e => setReceiverUuid(e.target.value.replace(/\D/g, ""))}
                placeholder="اتركه فارغاً للكل" dir="ltr" className="h-9 text-xs font-mono" />
            </div>

            {/* Quick date buttons */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">فترة البحث</label>
              <div className="grid grid-cols-4 gap-1.5">
                {DATE_PERIODS.map(p => (
                  <button key={p.id} onClick={() => setPeriod(p.id)}
                    className={cn(
                      "py-2 px-1 rounded-xl text-[10px] font-bold border transition-all text-center",
                      period === p.id
                        ? `${p.color} ring-1 ring-offset-1 ring-offset-background`
                        : "border-border/20 bg-muted/5 text-muted-foreground hover:bg-muted/10"
                    )}>
                    <span className="block text-sm">{p.emoji}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={loading || !senderUuid.trim()}
              className="flex-1 h-9 text-xs font-bold bg-red-600 hover:bg-red-700">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin ml-1" /> جاري البحث...</> : <><Search className="w-3.5 h-3.5 ml-1" /> بحث</>}
            </Button>
            <Button onClick={handlePreviewImpact} disabled={impactLoading || !senderUuid.trim()}
              variant="outline" className="flex-1 h-9 text-xs font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              {impactLoading ? <><Loader2 className="w-4 h-4 animate-spin ml-1" /> جاري المعاينة...</> : <><Eye className="w-3.5 h-3.5 ml-1" /> معاينة التأثير</>}
            </Button>
          </div>

          {/* Explanation */}
          <div className="rounded-xl bg-muted/5 border border-border/10 p-2.5 space-y-1">
            <p className="text-[10px] text-muted-foreground">🔍 <span className="font-bold text-foreground/80">بحث</span>: يعرض كل الهدايا المرسلة مع تفاصيل المستقبلين</p>
            <p className="text-[10px] text-muted-foreground">👁 <span className="font-bold text-foreground/80">معاينة التأثير</span>: يحسب كيف راح يتأثر راتب كل مستقبل لو تم الخصم — بدون تنفيذ أي خصم فعلي</p>
          </div>

          {/* Loading indicator */}
          {(loading || impactLoading) && (
            <div className="flex items-center justify-center gap-2 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-red-400" />
              <span className="text-xs text-muted-foreground">جاري البحث... قد يستغرق دقيقة</span>
            </div>
          )}
        </div>

        {/* ── Search Results ── */}
        <AnimatePresence mode="wait">
          {lookupData && (
            <motion.div key="lookup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* Summary */}
              <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div>
                  <p className="text-xs text-muted-foreground">المرسل: <span className="text-foreground font-bold">{lookupData.sender.name}</span> <span className="text-red-400 font-mono text-[10px]">({lookupData.sender.uuid})</span></p>
                  <p className="text-lg font-bold text-red-400 tabular-nums">{lookupData.total_coins.toLocaleString()} <span className="text-xs text-muted-foreground">(${lookupData.total_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-foreground tabular-nums">{lookupData.total_gifts}</p>
                  <p className="text-[9px] text-muted-foreground">هدية</p>
                </div>
              </div>

              {/* Receivers table */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-[9px] font-bold text-muted-foreground" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>#  المستقبل</span>
                  <span>UUID</span>
                  <span>الهدايا</span>
                  <span>المبلغ</span>
                </div>
                {[...lookupData.receivers].sort((a, b) => b.total - a.total).map((r, i) => (
                  <div key={r.uuid} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 items-center"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <span className="text-xs font-bold text-foreground truncate">{r.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{r.uuid}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{r.count}</span>
                    <div className="text-left">
                      <p className="text-xs font-bold text-foreground tabular-nums">{r.total.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground tabular-nums">${(r.total / COINS_PER_USD).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Impact Results ── */}
        <AnimatePresence>
          {impactData && (
            <motion.div key="impact" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> معاينة التأثير</p>

                {/* Impact table */}
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-1 px-2 py-1.5 text-[8px] font-bold text-muted-foreground" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span>المستقبل</span>
                    <span>الخصم</span>
                    <span>الراتب قبل</span>
                    <span>الراتب بعد</span>
                    <span>التغيير</span>
                  </div>
                  {impactData.receivers.map(r => {
                    const salaryDiff = r.salary_after - r.salary_before;
                    const changed = salaryDiff !== 0 || r.agency_before !== r.agency_after;
                    return (
                      <div key={r.uuid} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-1 px-2 py-2 items-center"
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: changed ? 'rgba(245,158,11,0.06)' : 'transparent',
                        }}>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-foreground truncate">{r.name}</p>
                          <p className="text-[8px] text-muted-foreground font-mono">{r.uuid}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-red-400 tabular-nums">{r.deduct_diamonds.toLocaleString()}</p>
                          <p className="text-[8px] text-muted-foreground tabular-nums">${(r.deduct_diamonds / COINS_PER_USD).toFixed(2)}</p>
                        </div>
                        <span className="text-[10px] text-foreground tabular-nums">${r.salary_before.toFixed(0)}</span>
                        <span className="text-[10px] text-foreground tabular-nums">${r.salary_after.toFixed(0)}</span>
                        <span className={cn("text-[10px] font-bold tabular-nums", salaryDiff < 0 ? "text-red-400" : "text-muted-foreground")}>
                          {salaryDiff < 0 ? `↓ $${Math.abs(salaryDiff).toFixed(0)}` : "= $0"}
                        </span>
                      </div>
                    );
                  })}
                  {/* Total */}
                  <div className="px-2 py-2" style={{ background: 'rgba(245,158,11,0.1)', borderTop: '1px solid rgba(245,158,11,0.2)' }}>
                    <p className="text-[10px] font-bold text-amber-400">
                      إجمالي الخصم: {impactData.total_deduct_coins.toLocaleString()} كوينز (${(impactData.total_deduct_coins / COINS_PER_USD).toFixed(2)})
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Execute Deduction Section ── */}
              {affectedReceivers.length > 0 && !execDone && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-xs font-bold text-red-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> تنفيذ خصم الهدايا</p>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>المرسل: <span className="text-foreground font-bold">{impactData.sender?.name} ({senderUuid})</span></p>
                    <p>إجمالي الخصم: <span className="text-red-400 font-bold">{impactData.total_deduct_coins.toLocaleString()} كوينز</span></p>
                    <p>عدد المتأثرين: <span className="text-foreground font-bold">{affectedReceivers.length}</span></p>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {affectedReceivers.map(r => (
                      <div key={r.uuid} className="flex justify-between text-[9px] bg-muted/10 rounded-lg px-2 py-1">
                        <span className="text-foreground">{r.name} ({r.uuid})</span>
                        <span className="text-amber-400">${r.salary_before} → ${r.salary_after}</span>
                      </div>
                    ))}
                  </div>

                  {execLoading && (
                    <div className="space-y-2">
                      <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
                        <div className="h-full bg-red-500 transition-all" style={{ width: `${(execProgress.done / execProgress.total) * 100}%` }} />
                      </div>
                      <p className="text-[10px] text-center text-muted-foreground">{execProgress.done} / {execProgress.total}</p>
                    </div>
                  )}

                  <Button onClick={handleExecuteDeduction} disabled={execLoading}
                    className="w-full h-10 text-xs font-bold bg-red-600 hover:bg-red-700">
                    {execLoading ? <><Loader2 className="w-4 h-4 animate-spin ml-1" /> جاري التنفيذ...</> : <><Zap className="w-3.5 h-3.5 ml-1" /> تنفيذ الخصم</>}
                  </Button>
                </motion.div>
              )}

              {/* Execution results */}
              {execDone && execProgress.results.length > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-sm font-bold text-emerald-400">✅ تم تنفيذ الخصم</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {execProgress.results.map((r, i) => (
                      <div key={i} className={cn("text-[10px] rounded-lg px-2 py-1.5", r.ok ? "bg-emerald-500/10" : "bg-red-500/10")}>
                        <span className="font-bold text-foreground">{r.receiver_name}</span>
                        {r.ok ? (
                          <span className="text-emerald-400 mr-2">✓ خصم {r.deducted?.toLocaleString()} — الراتب: ${r.salary_before} → ${r.salary_after}</span>
                        ) : (
                          <span className="text-red-400 mr-2">✗ فشل: {r.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Restore Section ── */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
          <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> استعادة كوينز</p>
          <div className="grid grid-cols-2 gap-2">
            <Input value={restoreUuid} onChange={e => setRestoreUuid(e.target.value.replace(/\D/g, ""))}
              placeholder="UUID المستقبل" dir="ltr" className="h-9 text-xs font-mono" />
            <Input value={restoreAmount} onChange={e => setRestoreAmount(e.target.value)}
              placeholder="المبلغ (كوينز)" dir="ltr" type="number" className="h-9 text-xs font-mono" />
          </div>
          <Button onClick={handleRestore} disabled={restoreLoading} className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700">
            {restoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-3.5 h-3.5 ml-1" /> استعادة</>}
          </Button>
          {restoreResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-3 text-[11px] text-emerald-400 font-bold" style={{ background: 'rgba(16,185,129,0.1)' }}>
              ✅ تم استعادة {restoreResult.restored?.toLocaleString()} كوينز — الرصيد: {restoreResult.before?.toLocaleString()} → {restoreResult.after?.toLocaleString()}
            </motion.div>
          )}
        </div>

        {/* ── Manual Deduct Section ── */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <p className="text-xs font-bold text-red-400 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> خصم يدوي</p>
          <div className="grid grid-cols-2 gap-2">
            <Input value={deductUuid} onChange={e => { setDeductUuid(e.target.value.replace(/\D/g, "")); setDeductManualResult(null); }}
              placeholder="UUID" dir="ltr" className="h-9 text-xs font-mono" />
            <Input value={deductAmount} onChange={e => { setDeductAmount(e.target.value); setDeductManualResult(null); }}
              placeholder="المبلغ (كوينز)" dir="ltr" type="number" className="h-9 text-xs font-mono" />
          </div>
          {parsedDeductAmount > 0 && (
            <p className="text-[10px] text-muted-foreground text-center">≈ ${(parsedDeductAmount / COINS_PER_USD).toFixed(2)}</p>
          )}
          <Button onClick={handleManualDeduct} disabled={deductManualLoading} className="w-full h-9 text-xs font-bold bg-red-600 hover:bg-red-700">
            {deductManualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 ml-1" /> خصم</>}
          </Button>

          {deductManualResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-3.5 space-y-1.5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p className="text-xs font-bold text-emerald-400">✅ تم خصم {deductManualResult.deducted.toLocaleString()} كوينز من {deductManualResult.user || deductManualResult.uuid}</p>
              <p className="text-[10px] text-muted-foreground">
                الرصيد: <span className="text-foreground font-bold">{deductManualResult.before?.toLocaleString()}</span> → <span className="text-foreground font-bold">{deductManualResult.after?.toLocaleString()}</span>
              </p>
            </motion.div>
          )}
        </div>
      </div>
      {ConfirmDialog}
    </AdminPageLayout>
  );
};

export default AdminDeductionsPage;
