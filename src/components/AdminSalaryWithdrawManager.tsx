import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, Clock, Search, Upload,
  Loader2, FileText, Image, Building2,
  Eye, Phone, User, Hash, CalendarDays,
  MessageSquare, CreditCard, AlertTriangle,
  Wallet, TrendingUp, Filter, Trash2, Globe, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { BANK_LABELS, COUNTRY_LABELS } from "@/lib/constants";
import { getAvatarUrl } from "@/lib/utils";

/* ─── Avatar with initials fallback ─── */
const AvatarCircle = ({ src, name, size = "w-10 h-10" }: { src?: string; name: string; size?: string }) => {
  const [failed, setFailed] = React.useState(false);
  const initial = name?.charAt(0) || "?";
  if (!src || failed) {
    return (
      <div className={`${size} rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0`}>
        <span className="text-sm font-bold text-emerald-400">{initial}</span>
      </div>
    );
  }
  return (
    <img src={src} alt={name} className={`${size} rounded-xl object-cover shrink-0 border border-white/10`}
      onError={() => setFailed(true)} />
  );
};

const API = "https://galachat.site/project-z/api.php";
const RECEIPT_BASE = "https://galachat.site/project-z/data/salary-receipts/";

interface WithdrawRequest {
  id: string;
  request_code: string;
  user_uuid: string;
  user_name: string;
  amount: number;
  coins?: number;
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
  transfer_verified?: boolean;
  screenshot?: string;
  avatar?: string;
}

interface Stats {
  total: number;
  total_amount: number;
  delivered: number;
  delivered_amount: number;
  pending: number;
  pending_amount: number;
  rejected: number;
  rejected_amount: number;
}

interface Props {
  canAct: boolean;
}

const COUNTRIES_FILTER = [
  { value: "all", label: "كل البلدان" },
  ...Object.entries(COUNTRY_LABELS).map(([k, v]) => ({ value: k, label: v })),
];

const AdminSalaryWithdrawManager: React.FC<Props> = ({ canAct }) => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, total_amount: 0, delivered: 0, delivered_amount: 0, pending: 0, pending_amount: 0, rejected: 0, rejected_amount: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "delivered" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [countryFilter, setCountryFilter] = useState("all");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [detailSheet, setDetailSheet] = useState<WithdrawRequest | null>(null);
  const [approveSheet, setApproveSheet] = useState<WithdrawRequest | null>(null);
  const [rejectSheet, setRejectSheet] = useState<WithdrawRequest | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectImage, setRejectImage] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const mapStatus = (s: string): "pending" | "delivered" | "rejected" => {
    if (s === "approved" || s === "delivered") return "delivered";
    if (s === "rejected") return "rejected";
    return "pending";
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?action=salary_withdraw_list&admin_key=ghala2026owner&month=${selectedMonth}`);
      const data = await res.json();
      if (data.success || data.requests) {
        const rawRequests: WithdrawRequest[] = (data.requests || []).map((r: any) => ({
          ...r,
          user_uuid: r.uuid || r.user_uuid || "",
          user_name: r.user_name || r.account_name || "",
          request_code: r.id || "",
          status: mapStatus(r.status),
          coins: r.coins || 0,
          bank: r.bank || "",
          country: r.country || "",
          account_name: r.account_name || "",
          account_number: r.account_number || "",
          whatsapp: r.whatsapp || "",
          notes: r.notes || "",
          admin_note: r.admin_note || r.reason || "",
          transfer_verified: r.transfer_verified ?? true,
          screenshot: r.screenshot || "",
          approved_at: r.approved_at || null,
          rejected_at: r.rejected_at || null,
        }));
        const enriched = await enrichWithAvatars(rawRequests);
        setRequests(enriched);
        const deliveredReqs = rawRequests.filter(r => r.status === "delivered");
        const pendingReqs = rawRequests.filter(r => r.status === "pending");
        const rejectedReqs = rawRequests.filter(r => r.status === "rejected");
        setStats({
          total: rawRequests.length,
          total_amount: rawRequests.reduce((s, r) => s + (r.amount || 0), 0),
          delivered: deliveredReqs.length,
          delivered_amount: deliveredReqs.reduce((s, r) => s + (r.amount || 0), 0),
          pending: pendingReqs.length,
          pending_amount: pendingReqs.reduce((s, r) => s + (r.amount || 0), 0),
          rejected: rejectedReqs.length,
          rejected_amount: rejectedReqs.reduce((s, r) => s + (r.amount || 0), 0),
        });
      }
    } catch {
      toast.error("فشل في جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const enrichWithAvatars = async (reqs: WithdrawRequest[]): Promise<WithdrawRequest[]> => {
    const BATCH = 5;
    const result = [...reqs];
    for (let i = 0; i < result.length; i += BATCH) {
      const batch = result.slice(i, i + BATCH);
      const avatars = await Promise.all(
        batch.map(async (req) => {
          try {
            const r = await fetch(`${API}?action=agent_lookup_user&admin_key=ghala2026owner&uuid=${req.user_uuid}`);
            const d = await r.json();
            return d.avatar ? getAvatarUrl(d.avatar) : "";
          } catch { return ""; }
        })
      );
      batch.forEach((req, j) => { result[i + j] = { ...req, avatar: avatars[j] }; });
    }
    return result;
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file); });

  const handleApprove = async () => {
    if (!approveSheet || !receiptFile) { toast.error("يجب رفع إيصال التحويل"); return; }
    setActionLoading(true);
    try {
      const receiptBase64 = await fileToBase64(receiptFile);
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "salary_withdraw_approve", admin_key: "ghala2026owner", request_id: approveSheet.id, receipt_image: receiptBase64, notes: approveNote }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم قبول الطلب وإرسال الإشعار");
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
        body: JSON.stringify({ action: "salary_withdraw_reject", admin_key: "ghala2026owner", request_id: rejectSheet.id, reason: rejectReason, image: imageBase64 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم رفض الطلب وإرسال الإشعار");
        setRejectSheet(null); setRejectReason(""); setRejectImage(null);
        fetchData();
      } else toast.error(data.error || "فشل في رفض الطلب");
    } catch { toast.error("حدث خطأ"); } finally { setActionLoading(false); }
  };

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filter !== "all" && r.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(r.user_name?.toLowerCase().includes(q) || r.user_uuid?.includes(q) || r.request_code?.toLowerCase().includes(q) || r.account_name?.toLowerCase().includes(q)))
          return false;
      }
      if (countryFilter !== "all") {
        if (countryFilter === "other") {
          if (["sa", "ye", "us"].includes(r.country)) return false;
        } else if (r.country !== countryFilter) return false;
      }
      if (amountMin && r.amount < parseFloat(amountMin)) return false;
      if (amountMax && r.amount > parseFloat(amountMax)) return false;
      return true;
    });
  }, [requests, filter, search, countryFilter, amountMin, amountMax]);

  const statusConfig = {
    pending: { label: "قيد المراجعة", chipLabel: "انتظار", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: <Clock className="w-3.5 h-3.5" /> },
    delivered: { label: "تم التحويل", chipLabel: "تحويل", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    rejected: { label: "مرفوض", chipLabel: "مرفوض", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: <XCircle className="w-3.5 h-3.5" /> },
  };

  const statusBadge = (status: string) => {
    const s = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${s.color} ${s.bg} border ${s.border}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" }); }
    catch { return d; }
  };

  // Status chips data
  const chips = [
    { key: "pending" as const, count: stats.pending, amount: stats.pending_amount },
    { key: "delivered" as const, count: stats.delivered, amount: stats.delivered_amount },
    { key: "rejected" as const, count: stats.rejected, amount: stats.rejected_amount },
  ];

  return (
    <div className="space-y-4" dir="rtl">

      {/* ═══════ 1. STAT CARDS — 2×2 + 2×1 ═══════ */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "إجمالي الطلبات", value: stats.total, icon: <Wallet className="w-5 h-5" />, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
          { label: "تم التحويل", value: stats.delivered, icon: <CheckCircle className="w-5 h-5" />, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
          { label: "مرفوض", value: stats.rejected, icon: <XCircle className="w-5 h-5" />, color: "text-rose-400", bg: "bg-rose-500/5", border: "border-rose-500/10" },
          { label: "قيد الانتظار", value: stats.pending, icon: <Clock className="w-5 h-5" />, color: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/10" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className={`rounded-2xl p-4 border ${card.border} ${card.bg} backdrop-blur-sm`}
          >
            <div className={`${card.color} mb-2`}>{card.icon}</div>
            <p className="text-[11px] text-muted-foreground mb-1">{card.label}</p>
            <p className={`text-2xl font-bold font-mono tabular-nums ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Amount cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "مبلغ الانتظار", value: stats.pending_amount, icon: <TrendingUp className="w-5 h-5" />, color: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/10" },
          { label: "مبلغ التحويل", value: stats.delivered_amount, icon: <TrendingUp className="w-5 h-5" />, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06, duration: 0.4 }}
            className={`rounded-2xl p-4 border ${card.border} ${card.bg} backdrop-blur-sm`}
          >
            <div className={`${card.color} mb-2`}>{card.icon}</div>
            <p className="text-[11px] text-muted-foreground mb-1">{card.label}</p>
            <p className={`text-2xl font-bold font-mono tabular-nums ${card.color}`}>${card.value.toLocaleString()}</p>
          </motion.div>
        ))}
      </div>

      {/* ═══════ 2. SEARCH + FILTERS ═══════ */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالآيدي، الاسم، كود التتبع..."
            className="bg-[#12121a] border-emerald-500/10 pr-10 text-xs h-11 rounded-2xl placeholder:text-muted-foreground/50" dir="rtl" />
        </div>

        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <Filter className="w-3.5 h-3.5" />
          {showFilters ? "إخفاء التصفية" : "تصفية متقدمة"}
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={filter === "all" ? "all" : filter} onChange={e => setFilter(e.target.value as any)}
                  className="bg-[#12121a] border border-emerald-500/10 rounded-xl text-[11px] px-3 h-10 text-foreground">
                  <option value="all">كل الحالات</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="delivered">تم التحويل</option>
                  <option value="rejected">مرفوض</option>
                </select>
                <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
                  className="bg-[#12121a] border border-emerald-500/10 rounded-xl text-[11px] px-3 h-10 text-foreground">
                  {COUNTRIES_FILTER.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">المبلغ ($):</span>
                <Input type="number" placeholder="من" value={amountMin} onChange={e => setAmountMin(e.target.value)}
                  className="bg-[#12121a] border-emerald-500/10 text-[11px] h-9 px-2.5 rounded-xl flex-1" dir="ltr" />
                <Input type="number" placeholder="إلى" value={amountMax} onChange={e => setAmountMax(e.target.value)}
                  className="bg-[#12121a] border-emerald-500/10 text-[11px] h-9 px-2.5 rounded-xl flex-1" dir="ltr" />
              </div>
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                className="bg-[#12121a] border-emerald-500/10 text-[11px] h-10 rounded-xl" dir="ltr" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════ 3. STATUS CHIPS ═══════ */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {chips.map(chip => {
          const cfg = statusConfig[chip.key];
          const isActive = filter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(isActive ? "all" : chip.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-200 flex items-center gap-1.5 ${
                isActive
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : `${cfg.bg} ${cfg.border} ${cfg.color} hover:border-white/20`
              }`}
            >
              {cfg.icon}
              <span>{chip.count} {cfg.chipLabel}</span>
              <span className="font-mono text-[10px] opacity-70">${chip.amount.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════ 4. REQUESTS LIST ═══════ */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#12121a] border border-emerald-500/10 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-white/5 rounded-lg w-1/3 mb-3" />
              <div className="h-3 bg-white/5 rounded-lg w-2/3 mb-2" />
              <div className="h-3 bg-white/5 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className="bg-[#12121a] border border-emerald-500/10 rounded-2xl p-4 space-y-3 transition-all hover:border-emerald-500/20"
            >
              {/* Header: status + date */}
              <div className="flex items-center justify-between">
                {statusBadge(req.status)}
                <span className="text-[10px] text-muted-foreground font-mono">{formatDate(req.created_at)}</span>
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {req.account_name || req.user_name}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  {req.user_uuid}
                </p>
                <p className="text-xl font-bold font-mono tabular-nums text-emerald-400 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 shrink-0" />
                  ${req.amount.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  {COUNTRY_LABELS[req.country] || req.country} · {BANK_LABELS[req.bank] || req.bank}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Tag className="w-3.5 h-3.5 shrink-0" />
                  المرجعي: {req.request_code}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => setDetailSheet(req)}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium text-xs h-10 rounded-xl"
                  variant="ghost"
                >
                  <Eye className="w-4 h-4 ml-1" /> عرض ومعالجة
                </Button>
                {canAct && req.status === "pending" && (
                  <button className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center transition-colors">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ═══════ DETAIL & ACTION SHEET ═══════ */}
      <Sheet open={!!detailSheet} onOpenChange={() => setDetailSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-[#0a0a0f] border-emerald-500/10" dir="rtl">
          <SheetHeader className="pb-3 border-b border-emerald-500/10">
            <SheetTitle className="flex items-center gap-2 text-base text-foreground">
              <Eye className="w-5 h-5 text-emerald-400" /> تفاصيل الطلب
            </SheetTitle>
          </SheetHeader>
          {detailSheet && (
            <div className="space-y-4 pt-4">
              {/* User info */}
              <div className="flex items-center gap-3">
                <AvatarCircle src={detailSheet.avatar} name={detailSheet.user_name || detailSheet.account_name} size="w-14 h-14" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{detailSheet.account_name || detailSheet.user_name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">UUID: {detailSheet.user_uuid}</p>
                  <div className="mt-1">{statusBadge(detailSheet.status)}</div>
                </div>
                <p className="text-2xl font-bold font-mono tabular-nums text-emerald-400">${detailSheet.amount}</p>
              </div>

              {/* Details grid */}
              <div className="space-y-2">
                <DetailCell icon={<Globe className="w-3.5 h-3.5" />} label="البلد" value={COUNTRY_LABELS[detailSheet.country] || detailSheet.country} />
                <DetailCell icon={<Building2 className="w-3.5 h-3.5" />} label="البنك" value={BANK_LABELS[detailSheet.bank] || detailSheet.bank} />
                <DetailCell icon={<User className="w-3.5 h-3.5" />} label="اسم المستلم" value={detailSheet.account_name} />
                <DetailCell icon={<CreditCard className="w-3.5 h-3.5" />} label="رقم الحساب" value={detailSheet.account_number} dir="ltr" />
                <DetailCell icon={<Phone className="w-3.5 h-3.5" />} label="واتساب" value={detailSheet.whatsapp} dir="ltr" />
                <DetailCell icon={<CalendarDays className="w-3.5 h-3.5" />} label="تاريخ الطلب" value={new Date(detailSheet.created_at).toLocaleString("ar")} />
                <DetailCell icon={<Tag className="w-3.5 h-3.5" />} label="رقم المرجعي" value={detailSheet.request_code} />
                {detailSheet.coins ? <DetailCell icon={<Wallet className="w-3.5 h-3.5" />} label="الكوينز" value={detailSheet.coins.toLocaleString()} /> : null}
                {detailSheet.notes && <DetailCell icon={<MessageSquare className="w-3.5 h-3.5" />} label="ملاحظات" value={detailSheet.notes} />}
              </div>

              {/* Transfer verification */}
              <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold border ${detailSheet.transfer_verified ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" : "bg-amber-500/5 text-amber-400 border-amber-500/20"}`}>
                {detailSheet.transfer_verified ? <><CheckCircle className="w-4 h-4" /> تم التحقق من التحويل</> : <><Clock className="w-4 h-4" /> لم يتم التحقق — مرفق إيصال</>}
              </div>

              {/* Receipt image */}
              {detailSheet.receipt_image && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground font-bold">إيصال التحويل:</p>
                  <img src={`${RECEIPT_BASE}${detailSheet.receipt_image}`} alt="receipt"
                    className="w-full rounded-xl border border-emerald-500/10 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setImagePreview(`${RECEIPT_BASE}${detailSheet.receipt_image}`)} />
                </div>
              )}

              {/* Approved info */}
              {detailSheet.approved_at && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-xs space-y-1">
                  <p className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> تم التسليم</p>
                  <p className="text-muted-foreground">تاريخ: {new Date(detailSheet.approved_at).toLocaleString("ar")}</p>
                  {detailSheet.approved_by && <p className="text-muted-foreground">بواسطة: {detailSheet.approved_by}</p>}
                </div>
              )}

              {/* Rejection info */}
              {detailSheet.admin_note && (
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-xs">
                  <span className="text-rose-400 font-bold flex items-center gap-1 mb-1"><XCircle className="w-3.5 h-3.5" /> سبب الرفض</span>
                  <p className="text-foreground">{detailSheet.admin_note}</p>
                </div>
              )}

              {/* Action buttons */}
              {canAct && detailSheet.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => { setApproveSheet(detailSheet); setDetailSheet(null); setReceiptFile(null); setReceiptPreview(""); setApproveNote(""); }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl active:scale-[0.98] transition-all"
                  >
                    <CheckCircle className="w-4 h-4 ml-1.5" /> قبول + إيصال
                  </Button>
                  <button
                    onClick={() => { setRejectSheet(detailSheet); setDetailSheet(null); setRejectReason(""); setRejectImage(null); }}
                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold h-12 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> رفض
                  </button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══════ APPROVE SHEET ═══════ */}
      <Sheet open={!!approveSheet} onOpenChange={() => setApproveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0a0a0f] border-emerald-500/10" dir="rtl">
          <SheetHeader className="pb-3 border-b border-emerald-500/10">
            <SheetTitle className="flex items-center gap-2 text-base text-foreground">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> تأكيد تسليم الراتب
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {approveSheet && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-1.5 text-xs">
                <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-emerald-400" /> <strong>{approveSheet.account_name}</strong> — <strong className="text-emerald-400 font-mono">${approveSheet.amount}</strong></p>
                <p className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-emerald-400" /> {BANK_LABELS[approveSheet.bank] || approveSheet.bank} — {approveSheet.account_number}</p>
                <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {approveSheet.whatsapp}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-muted-foreground" /> ارفع صورة إيصال التحويل *
              </label>
              <label className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-emerald-500/20 rounded-2xl cursor-pointer hover:bg-emerald-500/5 transition-colors">
                <Upload className="w-6 h-6 text-emerald-400" />
                <span className="text-xs text-muted-foreground">{receiptFile ? receiptFile.name : "اضغط لرفع صورة"}</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)); } }} />
              </label>
              {receiptPreview && <img src={receiptPreview} alt="receipt" className="w-full h-40 object-cover rounded-xl border border-emerald-500/10" />}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> ملاحظات (اختياري)
              </label>
              <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
                placeholder="ملاحظات إضافية..." className="bg-[#12121a] border-emerald-500/10 min-h-[60px] rounded-xl" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setApproveSheet(null)} className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all">إلغاء</button>
              <Button onClick={handleApprove} disabled={actionLoading || !receiptFile}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-4 h-4 ml-1.5" /> تأكيد التسليم</>}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══════ REJECT SHEET ═══════ */}
      <Sheet open={!!rejectSheet} onOpenChange={() => setRejectSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0a0a0f] border-emerald-500/10" dir="rtl">
          <SheetHeader className="pb-3 border-b border-emerald-500/10">
            <SheetTitle className="flex items-center gap-2 text-base text-foreground">
              <XCircle className="w-5 h-5 text-rose-400" /> رفض طلب السحب
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {rejectSheet && (
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-xs space-y-1.5">
                <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-rose-400" /> <strong>{rejectSheet.account_name}</strong> — <strong className="text-rose-400 font-mono">${rejectSheet.amount}</strong></p>
                <p className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-rose-400" /> {rejectSheet.request_code}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> سبب الرفض (إجباري) *
              </label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="مثال: اسم المستلم غير مطابق..." className="bg-[#12121a] border-emerald-500/10 min-h-[80px] rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-muted-foreground" /> صورة توضيحية (اختياري)
              </label>
              <label className="flex items-center justify-center gap-3 p-4 border border-dashed border-rose-500/20 rounded-2xl cursor-pointer hover:bg-rose-500/5 transition-colors">
                <Image className="w-5 h-5 text-rose-400" />
                <span className="text-[10px] text-muted-foreground">{rejectImage ? rejectImage.name : "رفع صورة"}</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setRejectImage(e.target.files[0]); }} />
              </label>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2 text-[11px] text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              سيتم إرجاع المبلغ لحساب المستخدم تلقائياً
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRejectSheet(null)} className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all">إلغاء</button>
              <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold h-12 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><XCircle className="w-4 h-4" /> تأكيد الرفض</>}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══════ IMAGE PREVIEW ═══════ */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 rounded-2xl bg-black/90 border-emerald-500/10">
          {imagePreview && <img src={imagePreview} alt="preview" className="w-full h-full object-contain rounded-xl" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Detail Cell ─── */
const DetailCell: React.FC<{ icon: React.ReactNode; label: string; value: string; dir?: string }> = ({ icon, label, value, dir }) => (
  <div className="bg-[#12121a] border border-emerald-500/5 rounded-xl p-3 text-xs">
    <span className="text-muted-foreground text-[10px] flex items-center gap-1 mb-0.5">{icon} {label}</span>
    <span className="font-bold text-foreground" dir={dir}>{value}</span>
  </div>
);

export default AdminSalaryWithdrawManager;
