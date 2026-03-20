import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, XCircle, Clock, Search, Upload,
  Loader2, FileText, Image, Printer, Building2,
  Eye, Phone, User, Hash, CalendarDays,
  MessageSquare, CreditCard, ClipboardList, AlertTriangle, BarChart3, ShieldCheck,
  ShieldAlert, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sendUserNotification } from "@/utils/sendUserNotification";
import { sendWhatsAppNotification } from "@/utils/sendWhatsAppNotification";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { BANK_LABELS, COUNTRY_LABELS } from "@/lib/constants";
import { getAvatarUrl } from "@/lib/utils";

const AvatarCircle = ({ src, name, size = "w-10 h-10" }: { src?: string; name: string; size?: string }) => {
  const [failed, setFailed] = React.useState(false);
  const initial = name?.charAt(0) || "?";
  if (!src || failed) {
    return (
      <div className={`${size} rounded-xl bg-primary/20 border border-white/10 flex items-center justify-center shrink-0`}>
        <span className="text-sm font-bold text-primary">{initial}</span>
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
  reference_id?: string;
  transferred_usd?: number;
  approved_amount?: number;
  salary_type?: string;
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
  { value: "all", label: "الكل" },
  ...Object.entries(COUNTRY_LABELS).map(([k, v]) => ({ value: k, label: v })),
];

const BANKS = [
  { value: "all", label: "الكل" },
  ...Object.entries(BANK_LABELS).map(([k, v]) => ({ value: k, label: v })),
];

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

const getUserSecurityChecks = (data: any, req: WithdrawRequest) => {
  const checks: { status: "safe" | "danger" | "warning"; text: string }[] = [];
  if (data?.security) {
    const sec = data.security;
    checks.push({ status: sec.salary_official ? "safe" : "danger", text: sec.salary_official ? "الراتب رسمي (من الدعم)" : "الراتب غير رسمي" });
    checks.push({ status: sec.no_manual ? "safe" : "danger", text: sec.no_manual ? "لا يوجد مبالغ يدوية" : `يوجد مبلغ يدوي: $${data.manual_amount || 0}` });
    checks.push({ status: sec.transfer_verified ? "safe" : "warning", text: sec.transfer_verified ? "الحوالة موجودة ومؤكدة" : "الحوالة غير مؤكدة" });
    checks.push({ status: sec.reference_new ? "safe" : "warning", text: sec.reference_new ? "الرقم المرجعي جديد" : "الرقم المرجعي مستخدم سابقاً" });
    if (data.is_suspicious) checks.push({ status: "danger", text: "الراتب مشبوه — يحتاج مراجعة" });
  } else {
    const hs = data?.host_salary;
    if (hs) {
      checks.push(hs.deduction > hs.salary && hs.salary > 0
        ? { status: "danger", text: `راتب مشبوه — مبلغ يدوي $${(hs.deduction - hs.salary).toFixed(2)}` }
        : { status: "safe", text: "الراتب رسمي (من الدعم)" });
      checks.push(hs.salary === 0 && hs.net > 0
        ? { status: "danger", text: "الراتب كله يدوي — غير مدعوم" }
        : { status: "safe", text: "لا يوجد مبالغ يدوية" });
    }
    checks.push(req.reference_id
      ? { status: "safe", text: `الرقم المرجعي: ${req.reference_id}` }
      : { status: "warning", text: "بدون رقم مرجعي" });
  }
  return checks;
};

const AdminSalaryWithdrawManager: React.FC<Props> = ({ canAct }) => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [_stats, setStats] = useState<Stats>({ total: 0, delivered: 0, delivered_amount: 0, pending: 0, pending_amount: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "delivered" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const monthOptions = useMemo(getMonthOptions, []);
  const [bankFilter, setBankFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // Unified detail sheet
  const [detailReq, setDetailReq] = useState<WithdrawRequest | null>(null);
  const [detailReport, setDetailReport] = useState<any>(null);
  const [detailReportLoading, setDetailReportLoading] = useState(false);
  const [detailAvatar, setDetailAvatar] = useState("");

  // Approve/Reject sheets
  const [approveSheet, setApproveSheet] = useState<WithdrawRequest | null>(null);
  const [rejectSheet, setRejectSheet] = useState<WithdrawRequest | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectImage, setRejectImage] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const openDetailSheet = async (req: WithdrawRequest) => {
    setDetailReq(req);
    setDetailReport(null);
    setDetailAvatar(req.avatar || "");
    setDetailReportLoading(true);
    try {
      const [reportRes, avatarRes] = await Promise.all([
        fetch(`${API}?action=salary_report&uuid=${req.user_uuid}`),
        !req.avatar ? fetch(`${API}?action=get_avatar&uuid=${req.user_uuid}`) : Promise.resolve(null),
      ]);
      const reportData = await reportRes.json();
      setDetailReport(reportData);
      if (avatarRes) {
        try {
          const ad = await avatarRes.json();
          if (ad.success && ad.avatar) setDetailAvatar(ad.avatar.startsWith("http") ? ad.avatar : getAvatarUrl(ad.avatar));
        } catch { /* silent */ }
      }
    } catch {
      toast.error("فشل في جلب بيانات المستخدم");
    } finally {
      setDetailReportLoading(false);
    }
  };

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
          reference_id: r.reference_id || null,
          transferred_usd: r.transferred_usd || null,
          approved_amount: r.approved_amount || null,
          salary_type: r.salary_type || "host",
        }));
        const enriched = await enrichWithAvatars(rawRequests);
        setRequests(enriched);
        const deliveredReqs = rawRequests.filter(r => r.status === "delivered");
        const pendingReqs = rawRequests.filter(r => r.status === "pending");
        const rejectedReqs = rawRequests.filter(r => r.status === "rejected");
        const apiStats = data.stats || {};
        setStats({
          total: apiStats.total || rawRequests.length,
          delivered: apiStats.delivered || deliveredReqs.length,
          delivered_amount: deliveredReqs.reduce((s, r) => s + (r.amount || 0), 0),
          pending: apiStats.pending || pendingReqs.length,
          pending_amount: pendingReqs.reduce((s, r) => s + (r.amount || 0), 0),
          rejected: apiStats.rejected || rejectedReqs.length,
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
            const res = await fetch(`${API}?action=agent_lookup_user&admin_key=ghala2026owner&uuid=${req.user_uuid}`);
            const data = await res.json();
            return data.avatar ? getAvatarUrl(data.avatar) : "";
          } catch { return ""; }
        })
      );
      batch.forEach((req, j) => { result[i + j] = { ...req, avatar: avatars[j] }; });
    }
    return result;
  };

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
        body: JSON.stringify({ action: "salary_withdraw_approve", admin_key: "ghala2026owner", request_id: approveSheet.id, receipt_image: receiptBase64, notes: approveNote }),
      });
      const data = await res.json();
      if (data.success) {
        await sendUserNotification(
          approveSheet.user_uuid,
          "تم قبول سحب الراتب",
          `تم قبول طلب سحب الراتب بمبلغ $${approveSheet.amount}. سيتم التحويل قريباً.`
        );
        toast.success("تم قبول الطلب وإرسال الإشعار");
        setRequests(prev => prev.map(r => r.id === approveSheet.id ? { ...r, status: "delivered" } : r));
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
        await sendUserNotification(
          rejectSheet.user_uuid,
          "تم رفض سحب الراتب",
          `تم رفض طلب سحب الراتب. السبب: ${rejectReason}.`
        );
        toast.success("تم رفض الطلب وإرسال الإشعار");
        setRequests(prev => prev.map(r => r.id === rejectSheet.id ? { ...r, status: "rejected", reject_reason: rejectReason } : r));
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
      if (bankFilter !== "all") {
        const bankLabel = BANK_LABELS[bankFilter] || bankFilter;
        if (!r.bank?.includes(bankFilter) && !r.bank?.includes(bankLabel)) return false;
      }
      if (countryFilter !== "all") {
        const countryLabel = COUNTRY_LABELS[countryFilter] || countryFilter;
        if (countryFilter === "other") {
          if (["sa", "SA", "السعودية", "ye", "YE", "اليمن", "us", "US", "أمريكا"].some(c => r.country?.includes(c))) return false;
        } else if (!r.country?.includes(countryFilter) && !r.country?.includes(countryLabel)) return false;
      }
      if (amountMin && r.amount < parseFloat(amountMin)) return false;
      if (amountMax && r.amount > parseFloat(amountMax)) return false;
      return true;
    });
  }, [requests, filter, search, bankFilter, countryFilter, amountMin, amountMax]);

  const countrySummary = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    filtered.forEach(r => {
      const c = COUNTRY_LABELS[r.country] || r.country || "أخرى";
      if (!map[c]) map[c] = { count: 0, amount: 0 };
      map[c].count++;
      map[c].amount += r.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [filtered]);

  const handlePrint = () => window.print();

  const statusConfig: Record<string, { label: string; textClass: string; bgClass: string; icon: React.ReactNode }> = {
    pending: { label: "قيد المراجعة", textClass: "text-amber-400", bgClass: "bg-amber-500/10", icon: <Clock className="w-3 h-3" /> },
    delivered: { label: "تم التسليم", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", icon: <CheckCircle className="w-3 h-3" /> },
    approved: { label: "تم التسليم", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", icon: <CheckCircle className="w-3 h-3" /> },
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

  const filteredStats = useMemo(() => {
    const pending = filtered.filter(r => r.status === "pending");
    const delivered = filtered.filter(r => r.status === "delivered");
    const rejected = filtered.filter(r => r.status === "rejected");
    return {
      total: filtered.length,
      totalAmount: filtered.reduce((s, r) => s + r.amount, 0),
      pending: pending.length,
      pendingAmount: pending.reduce((s, r) => s + r.amount, 0),
      delivered: delivered.length,
      deliveredAmount: delivered.reduce((s, r) => s + r.amount, 0),
      rejected: rejected.length,
      rejectedAmount: rejected.reduce((s, r) => s + r.amount, 0),
    };
  }, [filtered]);

  return (
    <div className="space-y-5 print-area" dir="rtl">
      {/* ===== 1. STAT CARDS ===== */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: "all" as const, label: "الكل", icon: <ClipboardList className="w-4 h-4" />, count: filteredStats.total, amount: filteredStats.totalAmount, color: "text-foreground", border: "border-white/5", bg: "bg-card/50" },
          { key: "pending" as const, label: "معلقة", icon: <Clock className="w-4 h-4" />, count: filteredStats.pending, amount: filteredStats.pendingAmount, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
          { key: "delivered" as const, label: "مسلّمة", icon: <CheckCircle className="w-4 h-4" />, count: filteredStats.delivered, amount: filteredStats.deliveredAmount, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
          { key: "rejected" as const, label: "مرفوضة", icon: <XCircle className="w-4 h-4" />, count: filteredStats.rejected, amount: filteredStats.rejectedAmount, color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5" },
        ].map((card, i) => (
          <motion.button
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
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

      {/* ===== 2. FILTERS ===== */}
      <div className="space-y-2 no-print">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث: UUID، اسم، كود الطلب..."
              className="bg-white/5 border-white/10 pr-9 text-xs h-9 rounded-xl" dir="rtl" />
          </div>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl text-xs px-2 h-9 text-foreground w-[150px]">
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl text-[10px] px-2 h-8 text-foreground flex-1 min-w-[70px]">
            <option value="all">البنك</option>
            {BANKS.filter(b => b.value !== "all").map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl text-[10px] px-2 h-8 text-foreground flex-1 min-w-[70px]">
            {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <Input type="number" placeholder="من $" value={amountMin} onChange={e => setAmountMin(e.target.value)}
            className="bg-white/5 border-white/10 w-[60px] text-[10px] h-8 px-1.5 rounded-xl" dir="ltr" />
          <Input type="number" placeholder="إلى $" value={amountMax} onChange={e => setAmountMax(e.target.value)}
            className="bg-white/5 border-white/10 w-[60px] text-[10px] h-8 px-1.5 rounded-xl" dir="ltr" />
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 px-2 border-white/10 rounded-xl hover:bg-white/5">
            <Printer className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ===== 3. COMPACT CARDS LIST ===== */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card/50 border border-white/5 rounded-xl p-3 animate-pulse">
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">لا توجد طلبات {filter !== "all" ? statusConfig[filter]?.label : ""}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req, i) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="bg-card/50 backdrop-blur-sm border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(req.status)}
                    {req.status === "rejected" && req.admin_note && (
                      <span className="text-[9px] text-red-400/70 truncate max-w-[120px]">({req.admin_note})</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground truncate">
                    <span className="font-bold">{req.user_name}</span>
                    <span className="text-muted-foreground"> • UUID: {req.user_uuid} • </span>
                    <span className="font-bold font-mono">${req.amount}</span>
                    <span className="text-muted-foreground"> • {BANK_LABELS[req.bank] || req.bank}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">{req.request_code}</p>
                </div>
                <div className="shrink-0">
                  {req.status === "pending" && canAct && isCurrentMonth ? (
                    <Button size="sm" onClick={() => openDetailSheet(req)}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] h-7 px-3 rounded-lg">
                      معالجة
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => openDetailSheet(req)}
                      className="text-muted-foreground hover:text-foreground text-[10px] h-7 px-3 rounded-lg">
                      {req.status === "pending" ? "التفاصيل" : "عرض التفاصيل"}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== 4. MONTHLY SUMMARY ===== */}
      {!loading && filtered.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> ملخص الشهر
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-500/5 rounded-xl p-2.5">
              <p className="text-[10px] text-emerald-400 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> مسلّمة</p>
              <p className="text-sm font-bold font-mono tabular-nums text-emerald-400">{filteredStats.delivered}</p>
              <p className="text-[10px] font-semibold font-mono text-emerald-400/70">${filteredStats.deliveredAmount.toLocaleString()}</p>
            </div>
            <div className="bg-rose-500/5 rounded-xl p-2.5">
              <p className="text-[10px] text-rose-400 flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> مرفوضة</p>
              <p className="text-sm font-bold font-mono tabular-nums text-rose-400">{filteredStats.rejected}</p>
              <p className="text-[10px] font-semibold font-mono text-rose-400/70">${filteredStats.rejectedAmount.toLocaleString()}</p>
            </div>
            <div className="bg-amber-500/5 rounded-xl p-2.5">
              <p className="text-[10px] text-amber-400 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> معلقة</p>
              <p className="text-sm font-bold font-mono tabular-nums text-amber-400">{filteredStats.pending}</p>
              <p className="text-[10px] font-semibold font-mono text-amber-400/70">${filteredStats.pendingAmount.toLocaleString()}</p>
            </div>
          </div>
          {countrySummary.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-bold">التوزيع حسب الدولة:</p>
              {countrySummary.map(([country, data]) => (
                <div key={country} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2 text-xs">
                  <span className="text-foreground">{country}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">{data.count} طلب — <strong className="text-primary">${data.amount.toLocaleString()}</strong></span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ===== UNIFIED DETAIL SHEET ===== */}
      <Sheet open={!!detailReq} onOpenChange={() => setDetailReq(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0f1117] border-white/5" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/5">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Hash className="w-4 h-4 text-primary" /> تفاصيل الطلب
            </SheetTitle>
          </SheetHeader>
          {detailReq && (
            <div className="space-y-4 pt-4">
              {/* User header */}
              <div className="flex items-center gap-3">
                <AvatarCircle src={detailAvatar || detailReq.avatar} name={detailReq.user_name || detailReq.account_name} size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{detailReq.user_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">UUID: {detailReq.user_uuid}</p>
                </div>
                <div className="text-left">
                  {statusBadge(detailReq.status)}
                  <p className="text-lg font-bold font-mono tabular-nums text-primary mt-1">${detailReq.amount}</p>
                </div>
              </div>

              {/* ━━━ Request Info ━━━ */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/5 pb-1">تفاصيل الطلب</p>
                <div className="grid grid-cols-2 gap-2">
                  <DetailCell icon={<Building2 className="w-3 h-3" />} label="البنك" value={`${BANK_LABELS[detailReq.bank] || detailReq.bank} — ${COUNTRY_LABELS[detailReq.country] || detailReq.country}`} />
                  <DetailCell icon={<User className="w-3 h-3" />} label="المستلم" value={detailReq.account_name} />
                  <DetailCell icon={<CreditCard className="w-3 h-3" />} label="رقم الحساب" value={detailReq.account_number} dir="ltr" />
                  <DetailCell icon={<Phone className="w-3 h-3" />} label="واتساب" value={detailReq.whatsapp} dir="ltr" />
                </div>
                <DetailCell icon={<Hash className="w-3 h-3" />} label="المرجعي" value={detailReq.reference_id ? `#${detailReq.reference_id}` : "—"} />
                <DetailCell icon={<CalendarDays className="w-3 h-3" />} label="تاريخ الطلب" value={formatDateSA(detailReq.created_at)} />
                {detailReq.salary_type && (
                  <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-xs flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">نوع الراتب:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${detailReq.salary_type === "agency" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {detailReq.salary_type === "agency" ? "وكالة" : "مضيف"}
                    </span>
                  </div>
                )}
                {detailReq.notes && <DetailCell icon={<MessageSquare className="w-3 h-3" />} label="ملاحظات" value={detailReq.notes} />}
                {detailReq.admin_note && (
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5 text-xs">
                    <span className="text-rose-400 text-[10px] font-bold flex items-center gap-1 mb-0.5"><XCircle className="w-3 h-3" /> سبب الرفض</span>
                    <p className="text-foreground">{detailReq.admin_note}</p>
                  </div>
                )}
                {detailReq.receipt_image && (
                  <button onClick={() => setImagePreview(`${RECEIPT_BASE}${detailReq.receipt_image}`)}
                    className="flex items-center gap-2 text-xs text-primary hover:underline">
                    <Eye className="w-3.5 h-3.5" /> عرض الإيصال
                  </button>
                )}
              </div>

              {/* ━━━ Salary Report (loaded async) ━━━ */}
              {detailReportLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">جاري جلب التقرير...</span>
                </div>
              ) : detailReport && (
                <>
                  {/* Support details */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-primary" /> الدعم والهدايا
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "أرسل هذا الشهر", value: detailReport.monthly_sent || 0 },
                        { label: "استلم هذا الشهر", value: detailReport.monthly_received || 0 },
                        { label: "مستوى الإرسال", value: detailReport.sender_level || 0 },
                        { label: "مستوى الاستقبال", value: detailReport.receiver_level || 0 },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white/[0.03] rounded-lg px-3 py-2 flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground">{item.label}</span>
                          <span className="text-xs font-bold font-mono text-foreground">{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    {(detailReport.charger_level || 0) > 0 && (
                      <div className="bg-white/[0.03] rounded-lg px-3 py-2 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">مستوى الشحن</span>
                        <span className="text-xs font-bold font-mono text-foreground">{detailReport.charger_level}</span>
                      </div>
                    )}
                  </div>

                  {/* Salary report */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-primary" /> تقرير الراتب
                    </p>
                    {detailReport.salary !== undefined ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                          <span className="text-[10px] text-muted-foreground">الراتب الأصلي</span>
                          <span className="text-xs font-bold font-mono text-foreground">${detailReport.salary?.toLocaleString() || 0}</span>
                        </div>
                        {(detailReport.deduction || 0) > 0 && (
                          <div className="flex justify-between bg-rose-500/5 rounded-lg px-3 py-2">
                            <span className="text-[10px] text-rose-400">المقتطع</span>
                            <span className="text-xs font-bold font-mono text-rose-400">-${detailReport.deduction}</span>
                          </div>
                        )}
                        <div className="flex justify-between bg-emerald-500/5 rounded-lg px-3 py-2">
                          <span className="text-[10px] text-emerald-400 font-bold">الصافي</span>
                          <span className="text-xs font-bold font-mono text-emerald-400">${detailReport.net?.toLocaleString() || 0}</span>
                        </div>
                        {detailReport.agency_salary > 0 && (
                          <div className="flex justify-between bg-amber-500/5 rounded-lg px-3 py-2">
                            <span className="text-[10px] text-amber-400">عمولة الوكالة</span>
                            <span className="text-xs font-bold font-mono text-amber-400">${detailReport.agency_salary}</span>
                          </div>
                        )}
                        {detailReport.agency_id > 0 && (
                          <div className="flex justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                            <span className="text-[10px] text-muted-foreground">الوكالة</span>
                            <span className="text-xs font-bold text-foreground">#{detailReport.agency_id}</span>
                          </div>
                        )}
                      </div>
                    ) : detailReport.host_salary ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                          <span className="text-[10px] text-muted-foreground">الراتب الأصلي</span>
                          <span className="text-xs font-bold font-mono text-foreground">${detailReport.host_salary.salary?.toLocaleString() || 0}</span>
                        </div>
                        {(detailReport.host_salary.deduction || 0) > 0 && (
                          <div className="flex justify-between bg-rose-500/5 rounded-lg px-3 py-2">
                            <span className="text-[10px] text-rose-400">المقتطع</span>
                            <span className="text-xs font-bold font-mono text-rose-400">-${detailReport.host_salary.deduction}</span>
                          </div>
                        )}
                        <div className="flex justify-between bg-emerald-500/5 rounded-lg px-3 py-2">
                          <span className="text-[10px] text-emerald-400 font-bold">الصافي</span>
                          <span className="text-xs font-bold font-mono text-emerald-400">${detailReport.host_salary.net?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Security checks */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" /> حالة الأمان
                    </p>
                    {getUserSecurityChecks(detailReport, detailReq).map((check, idx) => (
                      <div key={idx} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                        check.status === "safe" ? "bg-emerald-500/5 text-emerald-400" :
                        check.status === "danger" ? "bg-rose-500/5 text-rose-400" :
                        "bg-amber-500/5 text-amber-400"
                      }`}>
                        {check.status === "safe" && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                        {check.status === "danger" && <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
                        {check.status === "warning" && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                        <span className="font-medium">{check.text}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ━━━ Actions ━━━ */}
              {canAct && isCurrentMonth && detailReq.status === "pending" && (
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <Button onClick={() => { setApproveSheet(detailReq); setDetailReq(null); setReceiptFile(null); setReceiptPreview(""); setApproveNote(""); }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-10 rounded-xl active:scale-[0.98] transition-all">
                    <CheckCircle className="w-4 h-4 ml-1.5" /> قبول + إيصال
                  </Button>
                  <button onClick={() => { setRejectSheet(detailReq); setDetailReq(null); setRejectReason(""); setRejectImage(null); }}
                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-medium text-xs h-10 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                    <XCircle className="w-4 h-4" /> رفض + سبب
                  </button>
                </div>
              )}
              {!isCurrentMonth && detailReq.status === "pending" && (
                <div className="bg-muted/20 rounded-xl p-2.5 text-center text-[10px] text-muted-foreground">
                  📁 أرشيف — لا يمكن التعديل على طلبات الأشهر السابقة
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== APPROVE SHEET ===== */}
      <Sheet open={!!approveSheet} onOpenChange={() => setApproveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0f1117] border-white/5" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/5">
            <SheetTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> تأكيد تسليم الراتب
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {approveSheet && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-1.5 text-xs">
                <p className="flex items-center gap-1.5"><User className="w-3 h-3 text-emerald-400" /> <strong>{approveSheet.user_name}</strong> — <strong className="text-primary">${approveSheet.amount}</strong></p>
                <p className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-emerald-400" /> {approveSheet.bank} — {approveSheet.account_number}</p>
                <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-emerald-400" /> {approveSheet.whatsapp}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-muted-foreground" /> ارفع صورة إيصال التحويل *
              </label>
              <label className="flex items-center justify-center gap-3 p-5 border-2 border-dashed border-emerald-500/20 rounded-2xl cursor-pointer hover:bg-emerald-500/5 transition-colors">
                <Upload className="w-6 h-6 text-emerald-400" />
                <span className="text-xs text-muted-foreground">{receiptFile ? receiptFile.name : "اضغط لرفع صورة"}</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)); }
                  }} />
              </label>
              {receiptPreview && <img src={receiptPreview} alt="receipt" className="w-full h-40 object-cover rounded-xl border border-white/5" />}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> ملاحظات (اختياري)
              </label>
              <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
                placeholder="ملاحظات إضافية..." className="bg-white/5 border-white/10 min-h-[60px] rounded-xl" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setApproveSheet(null)} className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all duration-200">إلغاء</button>
              <Button onClick={handleApprove} disabled={actionLoading || !receiptFile}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-4 h-4 ml-1.5" /> تأكيد التسليم</>}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ===== REJECT SHEET ===== */}
      <Sheet open={!!rejectSheet} onOpenChange={() => setRejectSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0f1117] border-white/5" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/5">
            <SheetTitle className="flex items-center gap-2 text-base">
              <XCircle className="w-5 h-5 text-rose-400" /> رفض طلب السحب
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {rejectSheet && (
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-xs space-y-1.5">
                <p className="flex items-center gap-1.5"><User className="w-3 h-3 text-rose-400" /> <strong>{rejectSheet.user_name}</strong> — <strong className="text-primary">${rejectSheet.amount}</strong></p>
                <p className="flex items-center gap-1.5"><Hash className="w-3 h-3 text-rose-400" /> {rejectSheet.request_code}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> سبب الرفض (إجباري) *
              </label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="مثال: اسم المستلم غير مطابق..." className="bg-white/5 border-white/10 min-h-[80px] rounded-xl" />
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
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              سيتم إرجاع المبلغ لحساب المستخدم تلقائياً
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRejectSheet(null)} className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all duration-200">إلغاء</button>
              <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold h-12 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><XCircle className="w-4 h-4" /> تأكيد الرفض</>}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ===== IMAGE PREVIEW ===== */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 rounded-2xl bg-black/90 border-white/5">
          {imagePreview && <img src={imagePreview} alt="preview" className="w-full h-full object-contain rounded-xl" />}
        </DialogContent>
      </Dialog>

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

const DetailCell: React.FC<{ icon: React.ReactNode; label: string; value: string; dir?: string }> = ({ icon, label, value, dir }) => (
  <div className="bg-white/[0.03] rounded-xl p-2.5 text-xs">
    <span className="text-muted-foreground text-[10px] flex items-center gap-1 mb-0.5">{icon} {label}</span>
    <span className="font-bold text-foreground" dir={dir}>{value}</span>
  </div>
);

export default AdminSalaryWithdrawManager;
