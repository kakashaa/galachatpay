import React, { useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Loader2, Search, Eye, Trash2, RotateCcw, Check, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useConfirmModal } from "@/hooks/use-confirm-modal";

const API = "https://hola-chat.com/db-proxy.php?key=ghala2026proxy";
const COINS_PER_USD = 7500;

interface Gift {
  id: number;
  name: string;
  price: number;
  date: string;
}

interface Receiver {
  uuid: string;
  name: string;
  total: number;
  count: number;
  gifts: Gift[];
  // impact fields (filled after preview)
  deduct_diamonds?: number;
  salary_before?: number;
  salary_after?: number;
  agency_before?: number;
  agency_after?: number;
}

interface LookupResult {
  ok: boolean;
  sender: { uuid: string; name: string };
  total_gifts: number;
  total_coins: number;
  total_usd: number;
  receivers: Receiver[];
}

interface ImpactResult {
  ok: boolean;
  total_deduct_coins: number;
  total_salary_impact: number;
  total_agency_impact: number;
  receivers: {
    uuid: string;
    name: string;
    deduct_diamonds: number;
    salary_before: number;
    salary_after: number;
    agency_before: number;
    agency_after: number;
  }[];
  agencies: Record<string, number>;
}

interface DeductResult {
  ok: boolean;
  receivers_affected?: number;
  total_deducted?: number;
  total_deducted_usd?: number;
  salary_impact?: number;
  agencies?: Record<string, number>;
  rankings_cleared?: boolean;
}

const AdminDeductionsPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const { confirm, ConfirmDialog } = useConfirmModal();

  // Search form
  const [senderUuid, setSenderUuid] = useState("");
  const [receiverUuid, setReceiverUuid] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // State
  const [loading, setLoading] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);
  const [deductLoading, setDeductLoading] = useState(false);
  const [lookupData, setLookupData] = useState<LookupResult | null>(null);
  const [impactData, setImpactData] = useState<ImpactResult | null>(null);
  const [deductResult, setDeductResult] = useState<DeductResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Restore
  const [restoreUuid, setRestoreUuid] = useState("");
  const [restoreAmount, setRestoreAmount] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);

  const buildParams = () => {
    const p = new URLSearchParams();
    p.set("key", "ghala2026proxy");
    if (senderUuid.trim()) p.set("sender_uuid", senderUuid.trim());
    if (receiverUuid.trim()) p.set("receiver_uuid", receiverUuid.trim());
    if (singleDate) {
      p.set("date", singleDate);
    } else {
      if (dateFrom) p.set("date_from", dateFrom);
      if (dateTo) p.set("date_to", dateTo);
    }
    return p;
  };

  const handleSearch = async () => {
    if (!senderUuid.trim()) { toast.error("أدخل UUID المرسل"); return; }
    setLoading(true);
    setLookupData(null);
    setImpactData(null);
    setDeductResult(null);
    setSelected(new Set());
    try {
      const p = buildParams();
      p.set("action", "gift-lookup");
      const res = await fetch(`${API}?${p.toString()}`);
      const data = await res.json();
      if (!data.ok) { toast.error(data.error || "فشل البحث"); return; }
      setLookupData(data);
      if (data.receivers?.length === 0) toast("لا توجد نتائج");
    } catch { toast.error("خطأ بالاتصال"); }
    finally { setLoading(false); }
  };

  const handlePreviewImpact = async () => {
    if (!senderUuid.trim()) { toast.error("ابحث أولاً"); return; }
    setImpactLoading(true);
    try {
      const p = buildParams();
      p.set("action", "gift-impact");
      const res = await fetch(`${API}?${p.toString()}`);
      const data: ImpactResult = await res.json();
      if (!data.ok) { toast.error("فشل عرض التأثير"); return; }
      setImpactData(data);
      // Merge impact into lookup receivers
      if (lookupData) {
        const merged = lookupData.receivers.map(r => {
          const impact = data.receivers?.find(ir => ir.uuid === r.uuid);
          return impact ? { ...r, ...impact } : r;
        });
        setLookupData({ ...lookupData, receivers: merged });
      }
    } catch { toast.error("خطأ بالاتصال"); }
    finally { setImpactLoading(false); }
  };

  const handleDeduct = async (mode: "all" | "selected") => {
    const receiversToDeduct = mode === "all"
      ? lookupData?.receivers || []
      : lookupData?.receivers.filter(r => selected.has(r.uuid)) || [];

    if (receiversToDeduct.length === 0) { toast.error("لا يوجد مستلمين"); return; }

    const totalCoins = receiversToDeduct.reduce((s, r) => s + r.total, 0);
    const ok = await confirm({
      title: "تأكيد الخصم",
      message: `سيتم خصم ${totalCoins.toLocaleString()} كوينز ($${(totalCoins / COINS_PER_USD).toFixed(0)}) من ${receiversToDeduct.length} مستلم، وتعديل الرواتب والوكالات وحذف الترتيب.`,
      danger: true,
      confirmText: "تنفيذ الخصم",
    });
    if (!ok) return;

    setDeductLoading(true);
    try {
      const body: any = {
        action: "gift-deduct",
        sender_uuid: senderUuid.trim(),
      };
      if (mode === "selected") {
        body.receiver_uuids = receiversToDeduct.map(r => r.uuid);
      }
      if (receiverUuid.trim()) body.receiver_uuid = receiverUuid.trim();
      if (singleDate) body.date = singleDate;
      else {
        if (dateFrom) body.date_from = dateFrom;
        if (dateTo) body.date_to = dateTo;
      }

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: DeductResult = await res.json();
      if (data.ok) {
        setDeductResult(data);
        toast.success("تم تنفيذ الخصم بنجاح");
      } else {
        toast.error("فشل تنفيذ الخصم");
      }
    } catch { toast.error("خطأ بالاتصال"); }
    finally { setDeductLoading(false); }
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
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gift-restore", uuid: restoreUuid.trim(), amount: Number(restoreAmount) }),
      });
      const data = await res.json();
      if (data.ok) toast.success("تم الاستعادة بنجاح");
      else toast.error(data.error || "فشل الاستعادة");
    } catch { toast.error("خطأ"); }
    finally { setRestoreLoading(false); }
  };

  const toggleSelect = (uuid: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(uuid) ? next.delete(uuid) : next.add(uuid);
      return next;
    });
  };

  const toggleAll = () => {
    if (!lookupData) return;
    if (selected.size === lookupData.receivers.length) setSelected(new Set());
    else setSelected(new Set(lookupData.receivers.map(r => r.uuid)));
  };

  return (
    <AdminPageLayout title="الخصومات" accentColor="hsl(0 84% 60%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">

        {/* Search Form */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-xs font-bold text-red-400 flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> بحث الهدايا</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground mb-1 block">UUID المرسل *</label>
              <Input value={senderUuid} onChange={e => setSenderUuid(e.target.value)} placeholder="مثال: 4282859" dir="ltr" className="h-9 text-xs font-mono" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground mb-1 block">UUID المستقبل (اختياري)</label>
              <Input value={receiverUuid} onChange={e => setReceiverUuid(e.target.value)} placeholder="اتركه فارغاً للكل" dir="ltr" className="h-9 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">تاريخ محدد</label>
              <Input type="date" value={singleDate} onChange={e => { setSingleDate(e.target.value); setDateFrom(""); setDateTo(""); }} className="h-9 text-xs" />
            </div>
            <div className="flex items-end">
              <span className="text-[9px] text-muted-foreground/50 pb-2">أو نطاق ↓</span>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">من تاريخ</label>
              <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setSingleDate(""); }} className="h-9 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">إلى تاريخ</label>
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setSingleDate(""); }} className="h-9 text-xs" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={loading} className="flex-1 h-9 text-xs font-bold bg-red-600 hover:bg-red-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-3.5 h-3.5 ml-1" /> بحث</>}
            </Button>
            <Button onClick={handlePreviewImpact} disabled={impactLoading || !lookupData} variant="outline" className="flex-1 h-9 text-xs font-bold border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
              {impactLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Eye className="w-3.5 h-3.5 ml-1" /> معاينة التأثير</>}
            </Button>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {lookupData && (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">

              {/* Summary */}
              <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div>
                  <p className="text-xs text-muted-foreground">المرسل: <span className="text-white font-bold">{lookupData.sender.name}</span> <span className="text-red-400 font-mono text-[10px]">({lookupData.sender.uuid})</span></p>
                  <p className="text-lg font-bold text-red-400 tabular-nums">{lookupData.total_coins.toLocaleString()} <span className="text-xs text-muted-foreground">(${lookupData.total_usd.toLocaleString()})</span></p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white tabular-nums">{lookupData.total_gifts}</p>
                  <p className="text-[9px] text-muted-foreground">هدية</p>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Header */}
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 px-3 py-2 text-[9px] font-bold text-muted-foreground" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={toggleAll} className="w-5 h-5 rounded border border-white/20 flex items-center justify-center hover:bg-white/10">
                    {selected.size === lookupData.receivers.length && lookupData.receivers.length > 0 && <Check className="w-3 h-3 text-red-400" />}
                  </button>
                  <span>المستقبل</span>
                  <span>الهدايا</span>
                  <span>الكوينز</span>
                </div>

                {lookupData.receivers.map((r, i) => (
                  <motion.div key={r.uuid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-1 px-3 py-2.5 items-center"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: selected.has(r.uuid) ? 'rgba(239,68,68,0.08)' : 'transparent' }}
                  >
                    <button onClick={() => toggleSelect(r.uuid)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selected.has(r.uuid) ? 'border-red-500 bg-red-500/20' : 'border-white/15 hover:bg-white/10'}`}>
                      {selected.has(r.uuid) && <Check className="w-3 h-3 text-red-400" />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{r.uuid}</p>
                      {r.salary_before !== undefined && (
                        <p className="text-[9px] text-amber-400 mt-0.5">
                          الراتب: ${r.salary_before} → ${r.salary_after}
                          {r.agency_before !== undefined && ` | وكالة: $${r.agency_before} → $${r.agency_after}`}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{r.count}</span>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white tabular-nums">{r.total.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground tabular-nums">${(r.total / COINS_PER_USD).toFixed(1)}</p>
                    </div>
                  </motion.div>
                ))}

                {/* Totals */}
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.06)', borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                  <div className="w-5" />
                  <p className="text-xs font-bold text-red-400">المجموع ({lookupData.receivers.length} مستقبل)</p>
                  <span className="text-xs font-bold text-white tabular-nums">{lookupData.total_gifts}</span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-red-400 tabular-nums">{lookupData.total_coins.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground tabular-nums">${lookupData.total_usd.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Impact summary */}
              {impactData && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> معاينة التأثير</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-bold text-white tabular-nums">{impactData.total_deduct_coins.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">كوينز مخصومة</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-400 tabular-nums">${Math.abs(impactData.total_salary_impact)}</p>
                      <p className="text-[9px] text-muted-foreground">تأثير الراتب</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-orange-400 tabular-nums">${Math.abs(impactData.total_agency_impact)}</p>
                      <p className="text-[9px] text-muted-foreground">تأثير الوكالة</p>
                    </div>
                  </div>
                  {impactData.agencies && Object.keys(impactData.agencies).length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      الوكالات: {Object.entries(impactData.agencies).map(([id, val]) => `#${id}: $${val}`).join("، ")}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Action buttons */}
              {!deductResult && (
                <div className="flex gap-2">
                  <Button onClick={() => handleDeduct("all")} disabled={deductLoading} className="flex-1 h-10 text-xs font-bold bg-red-600 hover:bg-red-700">
                    {deductLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 ml-1" /> خصم الكل</>}
                  </Button>
                  {selected.size > 0 && (
                    <Button onClick={() => handleDeduct("selected")} disabled={deductLoading} variant="outline" className="flex-1 h-10 text-xs font-bold border-red-500/30 text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-3.5 h-3.5 ml-1" /> خصم المحدد ({selected.size})
                    </Button>
                  )}
                </div>
              )}

              {/* Deduction Result */}
              {deductResult && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl p-5 space-y-2" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">✅ تم الخصم بنجاح</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {deductResult.receivers_affected !== undefined && <p>المستقبلين المتأثرين: <span className="text-white font-bold">{deductResult.receivers_affected}</span></p>}
                    {deductResult.total_deducted !== undefined && <p>إجمالي المخصوم: <span className="text-white font-bold">{deductResult.total_deducted.toLocaleString()} كوينز (${deductResult.total_deducted_usd?.toLocaleString()})</span></p>}
                    {deductResult.salary_impact !== undefined && <p>تأثير الراتب: <span className="text-amber-400 font-bold">-${Math.abs(deductResult.salary_impact)}</span></p>}
                    {deductResult.agencies && Object.keys(deductResult.agencies).length > 0 && (
                      <p>الوكالات: {Object.entries(deductResult.agencies).map(([id, val]) => `#${id}: $${val}`).join("، ")}</p>
                    )}
                    {deductResult.rankings_cleared && <p>الترتيب: <span className="text-emerald-400 font-bold">تم مسحه ✓</span></p>}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restore Section */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
          <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> استعادة كوينز</p>
          <div className="grid grid-cols-2 gap-2">
            <Input value={restoreUuid} onChange={e => setRestoreUuid(e.target.value)} placeholder="UUID المستقبل" dir="ltr" className="h-9 text-xs font-mono" />
            <Input value={restoreAmount} onChange={e => setRestoreAmount(e.target.value)} placeholder="المبلغ (كوينز)" dir="ltr" type="number" className="h-9 text-xs font-mono" />
          </div>
          <Button onClick={handleRestore} disabled={restoreLoading} className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700">
            {restoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-3.5 h-3.5 ml-1" /> استعادة</>}
          </Button>
        </div>
      </div>
      {ConfirmDialog}
    </AdminPageLayout>
  );
};

export default AdminDeductionsPage;
