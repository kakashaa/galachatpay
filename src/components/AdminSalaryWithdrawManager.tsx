import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, CheckCircle, XCircle, Clock, Search, Upload,
  Loader2, FileText, Image, Printer, Globe, Building2,
  ChevronDown, ChevronUp, Eye, Phone, User, Hash, CalendarDays,
  MessageSquare, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

const API = "https://galachat.site/project-z/api.php";
const RECEIPT_BASE = "https://galachat.site/admin-panel-data/salary-receipts/";

interface WithdrawRequest {
  id: string;
  request_code: string;
  user_uuid: string;
  user_name: string;
  amount: number;
  country: string;
  bank: string;
  account_name: string;
  account_number: string;
  whatsapp: string;
  notes?: string;
  status: "pending" | "delivered" | "rejected";
  admin_note?: string;
  receipt_image?: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  approved_by?: string;
  rejected_by?: string;
}

interface Stats {
  total: number;
  total_amount?: number;
  delivered: number;
  delivered_amount: number;
  pending: number;
  pending_amount: number;
  rejected: number;
  rejected_amount?: number;
}

interface Props {
  canAct: boolean;
}

const COUNTRIES = [
  { value: "all", label: "🌍 الكل" },
  { value: "SA", label: "🇸🇦 السعودية" },
  { value: "YE", label: "🇾🇪 اليمن" },
  { value: "US", label: "🇺🇸 أمريكا" },
  { value: "other", label: "🌐 أخرى" },
];

const BANKS = [
  { value: "all", label: "الكل" },
  { value: "الراجحي", label: "الراجحي" },
  { value: "جيب", label: "جيب" },
  { value: "كريمي", label: "كريمي" },
  { value: "Zelle", label: "Zelle" },
  { value: "Cash App", label: "Cash App" },
  { value: "other", label: "أخرى" },
];

const AdminSalaryWithdrawManager: React.FC<Props> = ({ canAct }) => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, delivered: 0, delivered_amount: 0, pending: 0, pending_amount: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "delivered" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [bankFilter, setBankFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Detail view
  const [detailReq, setDetailReq] = useState<WithdrawRequest | null>(null);

  // Action sheets
  const [approveSheet, setApproveSheet] = useState<WithdrawRequest | null>(null);
  const [rejectSheet, setRejectSheet] = useState<WithdrawRequest | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectImage, setRejectImage] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const token = sessionStorage.getItem("admin_session_token") || "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?action=salary_withdraw_list&admin_key=ghala2026owner&month=${selectedMonth}`);
      const data = await res.json();
      if (data.success || data.requests) {
        setRequests(data.requests || []);
        setStats(data.stats || { total: 0, delivered: 0, delivered_amount: 0, pending: 0, pending_amount: 0, rejected: 0 });
      }
    } catch {
      toast.error("فشل في جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, [token, selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleApprove = async () => {
    if (!approveSheet || !receiptFile) { toast.error("يجب رفع إيصال التحويل"); return; }
    setActionLoading(true);
    try {
      const receiptBase64 = await fileToBase64(receiptFile);
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "salary_withdraw_approve", token, request_id: approveSheet.id, receipt_image: receiptBase64, notes: approveNote }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("✅ تم قبول الطلب وإرسال الإشعار");
        setApproveSheet(null); setReceiptFile(null); setReceiptPreview(""); setApproveNote("");
        fetchData();
      } else toast.error(data.error || "فشل في قبول الطلب");
    } catch { toast.error("حدث خطأ"); } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectSheet || !rejectReason.trim()) { toast.error("يجب كتابة سبب الرفض"); return; }
    setActionLoading(true);
    try {
      let imageBase64: string | undefined;
      if (rejectImage) imageBase64 = await fileToBase64(rejectImage);
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "salary_withdraw_reject", token, request_id: rejectSheet.id, reason: rejectReason, image: imageBase64 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("❌ تم رفض الطلب وإرسال الإشعار");
        setRejectSheet(null); setRejectReason(""); setRejectImage(null);
        fetchData();
      } else toast.error(data.error || "فشل في رفض الطلب");
    } catch { toast.error("حدث خطأ"); } finally { setActionLoading(false); }
  };

  // Advanced filtering
  const filtered = useMemo(() => {
    return requests.filter(r => {
      // Status filter
      if (filter !== "all" && r.status !== filter) return false;
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!(r.user_name?.toLowerCase().includes(q) || r.user_uuid?.includes(q) || r.request_code?.toLowerCase().includes(q) || r.account_name?.toLowerCase().includes(q)))
          return false;
      }
      // Bank
      if (bankFilter !== "all") {
        if (bankFilter === "other") {
          const known = ["الراجحي", "جيب", "كريمي", "Zelle", "Cash App"];
          if (known.some(b => r.bank?.includes(b))) return false;
        } else if (!r.bank?.includes(bankFilter)) return false;
      }
      // Country
      if (countryFilter !== "all") {
        if (countryFilter === "other") {
          if (["SA", "السعودية", "YE", "اليمن", "US", "أمريكا"].some(c => r.country?.includes(c))) return false;
        } else if (!r.country?.includes(countryFilter) && !r.country?.includes(COUNTRIES.find(c => c.value === countryFilter)?.label.slice(3) || "")) return false;
      }
      // Amount range
      if (amountMin && r.amount < parseFloat(amountMin)) return false;
      if (amountMax && r.amount > parseFloat(amountMax)) return false;
      return true;
    });
  }, [requests, filter, search, bankFilter, countryFilter, amountMin, amountMax]);

  // Country distribution for summary
  const countrySummary = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    filtered.forEach(r => {
      const c = r.country || "أخرى";
      if (!map[c]) map[c] = { count: 0, amount: 0 };
      map[c].count++;
      map[c].amount += r.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [filtered]);

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split("-");
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    return `${months[parseInt(m) - 1]} ${y}`;
  })();

  const handlePrint = () => window.print();

  const countryFlag = (c: string) => {
    if (c?.includes("سعود") || c?.includes("SA")) return "🇸🇦";
    if (c?.includes("يمن") || c?.includes("YE")) return "🇾🇪";
    if (c?.includes("أمريك") || c?.includes("US")) return "🇺🇸";
    return "🌍";
  };

  const statusConfig: Record<string, { label: string; textClass: string; bgClass: string; icon: React.ReactNode }> = {
    pending: { label: "قيد المراجعة", textClass: "text-amber-400", bgClass: "bg-amber-500/10", icon: <Clock className="w-3 h-3" /> },
    delivered: { label: "تم التسليم", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { label: "مرفوض", textClass: "text-red-400", bgClass: "bg-red-500/10", icon: <XCircle className="w-3 h-3" /> },
  };

  const statusBadge = (status: string) => {
    const s = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.textClass} ${s.bgClass}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-5 print-area" dir="rtl">
      {/* ===== 1. STAT CARDS (clickable) ===== */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: "all" as const, label: "📋 الكل", count: stats.total, amount: stats.total_amount ?? (stats.delivered_amount + stats.pending_amount + (stats.rejected_amount || 0)), color: "text-foreground", border: "border-border", bg: "bg-card" },
          { key: "pending" as const, label: "⏳ معلقة", count: stats.pending, amount: stats.pending_amount, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
          { key: "delivered" as const, label: "✅ مسلّمة", count: stats.delivered, amount: stats.delivered_amount, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
          { key: "rejected" as const, label: "❌ مرفوضة", count: stats.rejected, amount: stats.rejected_amount || 0, color: "text-red-400", border: "border-red-500/20", bg: "bg-red-500/5" },
        ].map((card, i) => (
          <motion.button
            key={card.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            onClick={() => setFilter(card.key)}
            className={`relative rounded-2xl p-2.5 text-center transition-all border ${card.border} ${card.bg} ${
              filter === card.key ? "ring-2 ring-primary/50 scale-[1.03]" : "hover:bg-muted/20"
            }`}>
            <p className="text-[9px] text-muted-foreground mb-0.5">{card.label}</p>
            <p className={`text-lg font-black ${card.color}`}>{card.count}</p>
            <p className={`text-[10px] font-bold ${card.color} opacity-80`}>${card.amount?.toLocaleString()}</p>
          </motion.button>
        ))}
      </div>

      {/* ===== 2. FILTERS ===== */}
      <div className="space-y-2 no-print">
        {/* Row 1: Search + Month */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث: UUID، اسم، كود الطلب..."
              className="bg-muted/20 border-border/30 pr-9 text-xs h-9" dir="rtl" />
          </div>
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="bg-muted/20 border-border/30 w-[130px] text-xs h-9" dir="ltr" />
        </div>
        {/* Row 2: Bank, Country, Amount range, PDF */}
        <div className="flex gap-1.5 flex-wrap">
          <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
            className="bg-muted/20 border border-border/30 rounded-lg text-[10px] px-2 h-8 text-foreground flex-1 min-w-[70px]">
            <option value="all">🏦 البنك</option>
            {BANKS.filter(b => b.value !== "all").map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
            className="bg-muted/20 border border-border/30 rounded-lg text-[10px] px-2 h-8 text-foreground flex-1 min-w-[70px]">
            {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <Input type="number" placeholder="من $" value={amountMin} onChange={e => setAmountMin(e.target.value)}
            className="bg-muted/20 border-border/30 w-[60px] text-[10px] h-8 px-1.5" dir="ltr" />
          <Input type="number" placeholder="إلى $" value={amountMax} onChange={e => setAmountMax(e.target.value)}
            className="bg-muted/20 border-border/30 w-[60px] text-[10px] h-8 px-1.5" dir="ltr" />
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 px-2 border-border/30">
            <Printer className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ===== 3. REQUESTS LIST ===== */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">لا توجد طلبات {filter !== "all" ? statusConfig[filter]?.label : ""}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((req, i) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {/* Card header */}
              <button onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                className="w-full flex items-center justify-between p-3 text-right">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    req.status === "delivered" ? "bg-emerald-500/10" : req.status === "rejected" ? "bg-red-500/10" : "bg-amber-500/10"
                  }`}>
                    <DollarSign className={`w-5 h-5 ${
                      req.status === "delivered" ? "text-emerald-400" : req.status === "rejected" ? "text-red-400" : "text-amber-400"
                    }`} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-primary font-bold">{req.request_code}</span>
                      {statusBadge(req.status)}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      👤 {req.user_name} ({req.user_uuid})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 mr-2">
                  <div className="text-left">
                    <p className="text-sm font-black text-foreground">${req.amount?.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">{countryFlag(req.country)} {req.bank}</p>
                  </div>
                  {expanded === req.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded */}
              <AnimatePresence>
                {expanded === req.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-3">
                      {/* Detail grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <DetailCell icon={<Building2 className="w-3 h-3" />} label="البنك" value={`${req.bank} — ${req.country}`} flag={countryFlag(req.country)} />
                        <DetailCell icon={<User className="w-3 h-3" />} label="المستلم" value={req.account_name} />
                        <DetailCell icon={<CreditCard className="w-3 h-3" />} label="رقم الحساب" value={req.account_number} dir="ltr" />
                        <DetailCell icon={<Phone className="w-3 h-3" />} label="واتساب" value={req.whatsapp} dir="ltr" />
                      </div>
                      <DetailCell icon={<CalendarDays className="w-3 h-3" />} label="تاريخ الطلب" value={new Date(req.created_at).toLocaleString("ar")} />
                      {req.notes && <DetailCell icon={<MessageSquare className="w-3 h-3" />} label="ملاحظات" value={req.notes} />}

                      {/* Receipt / rejection info */}
                      {req.receipt_image && (
                        <button onClick={() => setImagePreview(`${RECEIPT_BASE}${req.receipt_image}`)}
                          className="flex items-center gap-2 text-xs text-primary hover:underline">
                          <Eye className="w-3.5 h-3.5" /> عرض الإيصال
                        </button>
                      )}
                      {req.admin_note && (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 text-xs">
                          <span className="text-red-400 text-[10px] font-bold block mb-0.5">❌ سبب الرفض</span>
                          <p className="text-foreground">{req.admin_note}</p>
                        </div>
                      )}

                      {/* View details button */}
                      <Button variant="ghost" size="sm" onClick={() => setDetailReq(req)}
                        className="w-full text-xs text-muted-foreground hover:text-primary h-8">
                        <Eye className="w-3.5 h-3.5 ml-1" /> عرض التفاصيل الكاملة
                      </Button>

                      {/* Action buttons */}
                      {canAct && req.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button onClick={() => { setApproveSheet(req); setReceiptFile(null); setReceiptPreview(""); setApproveNote(""); }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl">
                            <CheckCircle className="w-4 h-4 ml-1.5" /> قبول + إيصال
                          </Button>
                          <Button onClick={() => { setRejectSheet(req); setRejectReason(""); setRejectImage(null); }}
                            variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs h-10 rounded-xl">
                            <XCircle className="w-4 h-4 ml-1.5" /> رفض + سبب
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== 5. MONTHLY SUMMARY ===== */}
      {!loading && filtered.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            📊 ملخص شهر {monthLabel}
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/20 rounded-xl p-2">
              <p className="text-[10px] text-muted-foreground">إجمالي</p>
              <p className="text-sm font-black text-foreground">{filtered.length} طلب</p>
              <p className="text-[10px] font-bold text-primary">${totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-500/5 rounded-xl p-2">
              <p className="text-[10px] text-emerald-400">✅ مسلّمة</p>
              <p className="text-sm font-black text-emerald-400">{filtered.filter(r => r.status === "delivered").length}</p>
              <p className="text-[10px] font-bold text-emerald-400/70">${filtered.filter(r => r.status === "delivered").reduce((s, r) => s + r.amount, 0).toLocaleString()}</p>
            </div>
            <div className="bg-amber-500/5 rounded-xl p-2">
              <p className="text-[10px] text-amber-400">⏳ معلقة</p>
              <p className="text-sm font-black text-amber-400">{filtered.filter(r => r.status === "pending").length}</p>
              <p className="text-[10px] font-bold text-amber-400/70">${filtered.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0).toLocaleString()}</p>
            </div>
          </div>
          {/* Country distribution */}
          {countrySummary.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-bold">التوزيع حسب الدولة:</p>
              {countrySummary.map(([country, data]) => (
                <div key={country} className="flex items-center justify-between bg-muted/10 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-foreground">{countryFlag(country)} {country}</span>
                  <span className="text-muted-foreground">{data.count} طلب — <strong className="text-primary">${data.amount.toLocaleString()}</strong></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== APPROVE SHEET ===== */}
      <Sheet open={!!approveSheet} onOpenChange={() => setApproveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <SheetHeader className="pb-3 border-b border-border/20">
            <SheetTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> تأكيد تسليم الراتب
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {approveSheet && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-1 text-xs">
                <p>👤 <strong>{approveSheet.user_name}</strong> — <strong className="text-primary">${approveSheet.amount}</strong></p>
                <p>🏦 {approveSheet.bank} — {approveSheet.account_number}</p>
                <p>📱 {approveSheet.whatsapp}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">📎 ارفع صورة إيصال التحويل *</label>
              <label className="flex items-center justify-center gap-3 p-5 border-2 border-dashed border-emerald-500/20 rounded-2xl cursor-pointer hover:bg-emerald-500/5 transition-colors">
                <Upload className="w-6 h-6 text-emerald-400" />
                <span className="text-xs text-muted-foreground">{receiptFile ? receiptFile.name : "📷 اضغط لرفع صورة"}</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)); }
                  }} />
              </label>
              {receiptPreview && <img src={receiptPreview} alt="receipt" className="w-full h-40 object-cover rounded-xl border border-border/20" />}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">📝 ملاحظات (اختياري)</label>
              <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
                placeholder="ملاحظات إضافية..." className="bg-muted/20 border-border/30 min-h-[60px] rounded-xl" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setApproveSheet(null)} className="flex-1 h-12 rounded-xl">إلغاء</Button>
              <Button onClick={handleApprove} disabled={actionLoading || !receiptFile}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl disabled:opacity-40">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "✅ تأكيد التسليم"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ===== REJECT SHEET ===== */}
      <Sheet open={!!rejectSheet} onOpenChange={() => setRejectSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <SheetHeader className="pb-3 border-b border-border/20">
            <SheetTitle className="flex items-center gap-2 text-base">
              <XCircle className="w-5 h-5 text-red-400" /> رفض طلب السحب
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {rejectSheet && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-xs space-y-1">
                <p>👤 <strong>{rejectSheet.user_name}</strong> — <strong className="text-primary">${rejectSheet.amount}</strong></p>
                <p>📋 {rejectSheet.request_code}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">📝 سبب الرفض (إجباري) *</label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="مثال: اسم المستلم غير مطابق..." className="bg-muted/20 border-border/30 min-h-[80px] rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">📎 صورة توضيحية (اختياري)</label>
              <label className="flex items-center justify-center gap-3 p-4 border border-dashed border-red-500/20 rounded-2xl cursor-pointer hover:bg-red-500/5">
                <Image className="w-5 h-5 text-red-400" />
                <span className="text-[10px] text-muted-foreground">{rejectImage ? rejectImage.name : "رفع صورة"}</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setRejectImage(e.target.files[0]); }} />
              </label>
            </div>
            <p className="text-[10px] text-amber-400 bg-amber-500/5 rounded-lg p-2">⚠️ سيتم إرجاع المبلغ لحساب المستخدم تلقائياً</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setRejectSheet(null)} className="flex-1 h-12 rounded-xl">إلغاء</Button>
              <Button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}
                variant="destructive" className="flex-1 font-bold h-12 rounded-xl disabled:opacity-40">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "❌ تأكيد الرفض"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ===== DETAIL DIALOG ===== */}
      <Dialog open={!!detailReq} onOpenChange={() => setDetailReq(null)}>
        <DialogContent className="max-w-[420px] rounded-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" /> تفاصيل الطلب {detailReq?.request_code}
            </DialogTitle>
          </DialogHeader>
          {detailReq && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                {statusBadge(detailReq.status)}
                <span className="text-lg font-black text-primary">${detailReq.amount}</span>
              </div>
              <div className="space-y-2">
                <DetailCell icon={<User className="w-3 h-3" />} label="المستخدم" value={`${detailReq.user_name} (${detailReq.user_uuid})`} />
                <DetailCell icon={<Building2 className="w-3 h-3" />} label="البنك" value={`${detailReq.bank} — ${detailReq.country}`} flag={countryFlag(detailReq.country)} />
                <DetailCell icon={<User className="w-3 h-3" />} label="اسم المستلم" value={detailReq.account_name} />
                <DetailCell icon={<CreditCard className="w-3 h-3" />} label="رقم الحساب" value={detailReq.account_number} dir="ltr" />
                <DetailCell icon={<Phone className="w-3 h-3" />} label="واتساب" value={detailReq.whatsapp} dir="ltr" />
                <DetailCell icon={<CalendarDays className="w-3 h-3" />} label="تاريخ الطلب" value={new Date(detailReq.created_at).toLocaleString("ar")} />
                {detailReq.notes && <DetailCell icon={<MessageSquare className="w-3 h-3" />} label="ملاحظات" value={detailReq.notes} />}
                {detailReq.approved_at && <DetailCell icon={<CheckCircle className="w-3 h-3" />} label="تاريخ القبول" value={new Date(detailReq.approved_at).toLocaleString("ar")} />}
                {detailReq.approved_by && <DetailCell icon={<User className="w-3 h-3" />} label="وافق عليه" value={detailReq.approved_by} />}
                {detailReq.rejected_at && <DetailCell icon={<XCircle className="w-3 h-3" />} label="تاريخ الرفض" value={new Date(detailReq.rejected_at).toLocaleString("ar")} />}
                {detailReq.rejected_by && <DetailCell icon={<User className="w-3 h-3" />} label="رفض بواسطة" value={detailReq.rejected_by} />}
                {detailReq.admin_note && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-2.5">
                    <span className="text-red-400 text-[10px] font-bold block mb-0.5">سبب الرفض</span>
                    <p className="text-foreground">{detailReq.admin_note}</p>
                  </div>
                )}
              </div>
              {detailReq.receipt_image && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-bold">إيصال التحويل:</p>
                  <img src={`${RECEIPT_BASE}${detailReq.receipt_image}`} alt="receipt"
                    className="w-full rounded-xl border border-border/20 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setImagePreview(`${RECEIPT_BASE}${detailReq.receipt_image}`)} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== IMAGE PREVIEW ===== */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 rounded-2xl bg-black/90">
          {imagePreview && <img src={imagePreview} alt="preview" className="w-full h-full object-contain rounded-xl" />}
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          nav, button, .no-print, header, footer { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-area { padding: 20px; }
        }
      `}</style>
    </div>
  );
};

// Reusable detail cell
const DetailCell: React.FC<{ icon: React.ReactNode; label: string; value: string; dir?: string; flag?: string }> = ({ icon, label, value, dir, flag }) => (
  <div className="bg-muted/15 rounded-lg p-2 text-xs">
    <span className="text-muted-foreground text-[10px] flex items-center gap-1 mb-0.5">{icon} {label}</span>
    <span className="font-bold text-foreground" dir={dir}>{flag && `${flag} `}{value}</span>
  </div>
);

export default AdminSalaryWithdrawManager;
