import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle, XCircle, Clock, Search, Upload,
  Loader2, FileText, Image, Printer, Building2,
  Eye, Phone, User, Hash, CalendarDays,
  MessageSquare, CreditCard, ClipboardList, AlertTriangle, BarChart3, ShieldCheck,
  ShieldAlert, DollarSign, SlidersHorizontal, X, Lock, Trash2,
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

import { galaApi } from "@/services/galaApi";
const RECEIPT_BASE = "https://hola-chat.com/project-z/data/salary-receipts/";

/** How old (in hours) is the transfer relative to the request? */
const getTransferAgeHours = (req: { created_at: string; transaction_date?: string }) => {
  try {
    const requestDate = new Date(req.created_at).getTime();
    if (req.transaction_date) {
      const txDate = new Date(req.transaction_date).getTime();
      if (!isNaN(txDate) && txDate < requestDate) {
        return Math.round((requestDate - txDate) / 3600000);
      }
    }
    // fallback: how old is the request itself
    return Math.round((Date.now() - requestDate) / 3600000);
  } catch { return 0; }
};

const isOldTransfer = (req: { created_at: string; transaction_date?: string }) => getTransferAgeHours(req) > 48;

const formatTransferAge = (hours: number) => {
  if (hours < 24) return `${hours} ساعة`;
  const days = Math.round(hours / 24);
  return `${days} يوم`;
};

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
  status: "pending" | "delivered" | "approved" | "rejected" | "reserved" | "review";
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
  is_duplicate_flagged?: boolean;
  reject_reason?: string;
  reserve_reason?: string;
  user_edited?: boolean;
  transaction_date?: string;
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
  reserved?: number;
  reserved_amount?: number;
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
      checks.push(hs.salary === 0 && (hs.net_salary ?? hs.net ?? 0) > 0
        ? { status: "danger", text: "الراتب كله يدوي — غير مدعوم" }
        : { status: "safe", text: "لا يوجد مبالغ يدوية" });
    }
    checks.push(req.reference_id
      ? { status: "safe", text: `الرقم المرجعي: ${req.reference_id}` }
      : { status: "warning", text: "بدون رقم مرجعي" });
  }
  // Old transfer check
  const ageHours = getTransferAgeHours(req);
  if (ageHours > 48) {
    checks.push({ status: "danger", text: `⚠️ حوالة قديمة — عمرها ${formatTransferAge(ageHours)} — يُنصح بالرفض` });
  } else {
    checks.push({ status: "safe", text: `حوالة حديثة (${formatTransferAge(ageHours)})` });
  }
  return checks;
};

/* ═══════════════════════════════════════════════════
   TAB CONFIG
   ═══════════════════════════════════════════════════ */
type TabKey = "pending" | "delivered" | "rejected" | "reserved" | "edited";

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ReactNode; color: string; border: string; bg: string; glow: string }[] = [
  { key: "pending",   label: "انتظار",  icon: <Clock className="w-3.5 h-3.5" />,       color: "text-amber-400",   border: "border-amber-500/30",   bg: "bg-amber-500/10",   glow: "shadow-amber-500/20" },
  { key: "delivered",  label: "تحويل",  icon: <CheckCircle className="w-3.5 h-3.5" />,  color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/20" },
  { key: "rejected",  label: "مرفوض",   icon: <XCircle className="w-3.5 h-3.5" />,      color: "text-rose-400",    border: "border-rose-500/30",    bg: "bg-rose-500/10",    glow: "shadow-rose-500/20" },
  { key: "reserved",  label: "محجوز",   icon: <Lock className="w-3.5 h-3.5" />,         color: "text-orange-400",  border: "border-orange-500/30",  bg: "bg-orange-500/10",  glow: "shadow-orange-500/20" },
  { key: "edited",    label: "معدل",    icon: <FileText className="w-3.5 h-3.5" />,     color: "text-yellow-400",  border: "border-yellow-500/30",  bg: "bg-yellow-500/10",  glow: "shadow-yellow-500/20" },
];

const AdminSalaryWithdrawManager: React.FC<Props> = ({ canAct }) => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [_stats, setStats] = useState<Stats>({ total: 0, delivered: 0, delivered_amount: 0, pending: 0, pending_amount: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const monthOptions = useMemo(getMonthOptions, []);
  const [bankFilter, setBankFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Unified detail sheet
  const [detailReq, setDetailReq] = useState<WithdrawRequest | null>(null);
  const [detailReport, setDetailReport] = useState<any>(null);
  const [detailReportLoading, setDetailReportLoading] = useState(false);
  const [detailAvatar, setDetailAvatar] = useState("");

  // Approve/Reject sheets
  const [approveSheet, setApproveSheet] = useState<WithdrawRequest | null>(null);
  const [rejectSheet, setRejectSheet] = useState<WithdrawRequest | null>(null);
  const [editSheet, setEditSheet] = useState<WithdrawRequest | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectImage, setRejectImage] = useState<File | null>(null);
  const [isFinalRejection, setIsFinalRejection] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const hasActiveFilters = search || bankFilter !== "all" || countryFilter !== "all" || amountMin || amountMax;

  const clearFilters = () => {
    setSearch(""); setBankFilter("all"); setCountryFilter("all"); setAmountMin(""); setAmountMax("");
  };

  const openDetailSheet = async (req: WithdrawRequest) => {
    setDetailReq(req);
    setDetailReport(null);
    setDetailAvatar(req.avatar || "");
    setDetailReportLoading(true);
    try {
      const [reportData, avatarData] = await Promise.all([
        galaApi.salaryReport(req.user_uuid),
        !req.avatar ? galaApi.getAvatar(req.user_uuid) : Promise.resolve(null),
      ]);
      setDetailReport(reportData as any);
      if (avatarData) {
        try {
          const ad = avatarData as any;
          if (ad.success && ad.avatar) setDetailAvatar(ad.avatar.startsWith("http") ? ad.avatar : getAvatarUrl(ad.avatar));
        } catch { /* silent */ }
      }
    } catch (e) {
      console.warn("salary report failed — non-critical", e);
    } finally {
      setDetailReportLoading(false);
    }
  };

  const mapStatus = (s: string): WithdrawRequest["status"] => {
    if (s === "approved" || s === "delivered") return "delivered";
    if (s === "rejected") return "rejected";
    if (s === "reserved") return "reserved";
    if (s === "review") return "pending";
    return "pending";
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch from external API + Supabase in parallel
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const [apiResult, supabaseResult] = await Promise.all([
        galaApi.salaryWithdrawList(selectedMonth).catch(() => ({ success: false, requests: [] })),
        supabase
          .from("salary_requests")
          .select("*")
          .in("request_type", ["agency_cash", "agency_coins", "agency_transfer", "cash", "monthly"])
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .order("created_at", { ascending: false })
          .then(r => r.data || []),
      ]);

      const data = apiResult as any;
      // Map API requests
      const apiRequests: WithdrawRequest[] = (data.requests || []).map((r: any) => ({
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
        is_duplicate_flagged: r.is_duplicate_flagged || false,
        reject_reason: r.reject_reason || r.admin_note || "",
        reserve_reason: r.reserve_reason || "",
        user_edited: r.user_edited || false,
        transaction_date: r.transaction_date || null,
      }));

      // Map Supabase-only requests
      const supabaseRequests: WithdrawRequest[] = (supabaseResult as any[]).map((r: any) => ({
        id: r.id,
        user_uuid: r.user_uuid || "",
        user_name: r.user_name || r.recipient_name || "",
        request_code: r.id?.substring(0, 8) || "",
        amount: r.amount_usd || 0,
        status: mapStatus(r.status),
        coins: r.amount_coins || 0,
        bank: r.payment_method || "",
        country: r.recipient_country || "",
        account_name: r.recipient_name || "",
        account_number: r.payment_details || "",
        whatsapp: r.user_phone || "",
        notes: r.admin_note || "",
        admin_note: r.admin_note || "",
        transfer_verified: true,
        screenshot: "",
        approved_at: null,
        rejected_at: null,
        reference_id: r.transfer_id || r.transaction_id || null,
        transferred_usd: null,
        approved_amount: r.amount_usd || null,
        salary_type: r.request_type?.includes("agency") ? "agency" : "host",
        is_duplicate_flagged: false,
        reject_reason: r.admin_note || "",
        reserve_reason: "",
        user_edited: false,
        transaction_date: r.transaction_date || null,
        created_at: r.created_at,
        receipt_image: r.transfer_image_url || "",
      }));

      // Merge: deduplicate by id
      const apiIds = new Set(apiRequests.map(r => r.id));
      const merged = [...apiRequests, ...supabaseRequests.filter(r => !apiIds.has(r.id))];
      // Sort by date descending
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const rawRequests = merged;
      setRequests(rawRequests);
      enrichWithAvatars(rawRequests).then(enriched => setRequests(enriched)).catch(() => {});
      const deliveredReqs = rawRequests.filter(r => r.status === "delivered");
      const pendingReqs = rawRequests.filter(r => r.status === "pending" || r.status === "review" as any);
      const rejectedReqs = rawRequests.filter(r => r.status === "rejected");
      const reservedReqs = rawRequests.filter(r => r.status === "reserved");
      const _apiStats = data.stats || {};
      setStats({
        total: rawRequests.length,
        delivered: deliveredReqs.length,
        delivered_amount: deliveredReqs.reduce((s, r) => s + (r.amount || 0), 0),
        pending: pendingReqs.length,
        pending_amount: pendingReqs.reduce((s, r) => s + (r.amount || 0), 0),
        rejected: rejectedReqs.length,
        rejected_amount: rejectedReqs.reduce((s, r) => s + (r.amount || 0), 0),
        reserved: reservedReqs.length,
        reserved_amount: reservedReqs.reduce((s, r) => s + (r.amount || 0), 0),
      });
    } catch {
      toast.error("فشل في جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const enrichWithAvatars = async (reqs: WithdrawRequest[]): Promise<WithdrawRequest[]> => {
    const BATCH = 10;
    const result = [...reqs];
    for (let i = 0; i < result.length; i += BATCH) {
      const batch = result.slice(i, i + BATCH);
      const avatars = await Promise.all(
        batch.map(async (req) => {
          try {
            const data = await galaApi.agentLookupUser(req.user_uuid) as any;
            return data.avatar ? getAvatarUrl(data.avatar) : "";
          } catch { return ""; }
        })
      );
      batch.forEach((req, j) => { result[i + j] = { ...req, avatar: avatars[j] }; });
    }
    return result;
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const fileToBase64 = async (file: File): Promise<string> => {
    const { compressImageToBase64 } = await import("@/utils/compressImage");
    return compressImageToBase64(file, 1200, 0.7);
  };

  const handleEditAmount = async () => {
    if (!editSheet || !editAmount.trim()) { toast.error("أدخل المبلغ الجديد"); return; }
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount <= 0) { toast.error("مبلغ غير صالح"); return; }
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("salary_requests")
        .update({ amount_usd: newAmount, admin_note: `تعديل المبلغ: $${editSheet.amount} → $${newAmount}`, updated_at: new Date().toISOString() } as any)
        .eq("id", editSheet.id);
      if (error) throw error;
      toast.success(`تم تعديل المبلغ: $${editSheet.amount} → $${newAmount}`);
      setRequests(prev => prev.map(r => r.id === editSheet.id ? { ...r, amount: newAmount, admin_note: `تعديل: $${editSheet.amount}→$${newAmount}` } : r));
      setEditSheet(null); setEditAmount("");
      fetchData();
    } catch (e: any) { toast.error(e?.message || "فشل التعديل"); }
    finally { setActionLoading(false); }
  };

  const handleApprove = async () => {
    if (!approveSheet || !receiptFile) { toast.error("يجب رفع إيصال التحويل"); return; }
    setActionLoading(true);
    try {
      const receiptBase64 = await fileToBase64(receiptFile);
      const data = await galaApi.salaryWithdrawApprove(approveSheet.id, receiptBase64, approveNote) as any;
      if (data.success) {
        await sendUserNotification(approveSheet.user_uuid, "تم قبول سحب الراتب", `تم قبول طلب سحب الراتب بمبلغ $${approveSheet.amount}. سيتم التحويل قريباً.`);
        sendWhatsAppNotification(approveSheet.whatsapp, `غلا شات 💬\n\n✅ تم قبول طلب سحب الراتب!\nالمبلغ: $${approveSheet.amount}\nالبنك: ${approveSheet.bank}\nالحساب: ${approveSheet.account_number}`);
        toast.success("تم قبول الطلب وإرسال الإشعار");
        setRequests(prev => prev.map(r => r.id === approveSheet.id ? { ...r, status: "approved" as any } : r));
        setApproveSheet(null); setReceiptFile(null); setReceiptPreview(""); setApproveNote("");
        fetchData();
      } else toast.error(data.error || "فشل في قبول الطلب");
    } catch (e: any) {
      toast.error(e?.message || "حدث خطأ");
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectSheet || !rejectReason.trim()) { toast.error("يجب كتابة سبب الرفض"); return; }
    setActionLoading(true);
    try {
      let imageBase64: string | undefined;
      if (rejectImage) imageBase64 = await fileToBase64(rejectImage);
      const data = await galaApi.salaryWithdrawReject(rejectSheet.id, rejectReason, imageBase64) as any;
      if (data.success) {
        // If final rejection, update salary_request to mark transfer_id as permanently locked
        if (isFinalRejection) {
          await supabase
            .from("salary_requests")
            .update({ is_final_rejection: true } as any)
            .eq("id", rejectSheet.id);
        }
        const notifSuffix = isFinalRejection ? "\n⛔ رفض نهائي — لا يمكن إعادة الإرسال" : "\nيمكنك تعديل الطلب وإعادة الإرسال";
        await sendUserNotification(rejectSheet.user_uuid, "تم رفض سحب الراتب", `تم رفض طلب سحب الراتب. السبب: ${rejectReason}.${notifSuffix}`);
        sendWhatsAppNotification(rejectSheet.whatsapp, `غلا شات 💬\n\n❌ تم رفض طلب سحب الراتب\nالسبب: ${rejectReason}${notifSuffix}`);
        toast.success(isFinalRejection ? "تم الرفض النهائي وتسكير الحوالة" : "تم رفض الطلب وإرسال الإشعار");
        setRequests(prev => prev.map(r => r.id === rejectSheet.id ? { ...r, status: "rejected", reject_reason: rejectReason } : r));
        setRejectSheet(null); setRejectReason(""); setRejectImage(null); setIsFinalRejection(false);
        fetchData();
      } else toast.error(data.error || "فشل في رفض الطلب");
    } catch (e: any) {
      toast.error(e?.message || "حدث خطأ");
    } finally { setActionLoading(false); }
  };

  /* ─── Filtering ─── */
  const filtered = useMemo(() => {
    return requests.filter(r => {
      // Tab filter
      if (activeTab === "pending" && r.status !== "pending") return false;
      if (activeTab === "delivered" && r.status !== "delivered") return false;
      if (activeTab === "rejected" && r.status !== "rejected") return false;
      if (activeTab === "reserved" && r.status !== "reserved") return false;
      if (activeTab === "edited" && !(r.admin_note || "").includes("تعديل")) return false;

      if (search) {
        const q = search.toLowerCase();
        if (!(r.user_name?.toLowerCase().includes(q) || r.user_uuid?.includes(q) || r.request_code?.toLowerCase().includes(q) || r.account_name?.toLowerCase().includes(q) || r.whatsapp?.includes(q) || r.reference_id?.includes(q)))
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
  }, [requests, activeTab, search, bankFilter, countryFilter, amountMin, amountMax]);

  /* ─── Tab counts ─── */
  const tabCounts = useMemo(() => {
    const applySearchFilters = (r: WithdrawRequest) => {
      if (search) {
        const q = search.toLowerCase();
        if (!(r.user_name?.toLowerCase().includes(q) || r.user_uuid?.includes(q) || r.request_code?.toLowerCase().includes(q) || r.account_name?.toLowerCase().includes(q) || r.whatsapp?.includes(q) || r.reference_id?.includes(q)))
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
    };

    const pending = requests.filter(r => r.status === "pending" && applySearchFilters(r));
    const delivered = requests.filter(r => r.status === "delivered" && applySearchFilters(r));
    const rejected = requests.filter(r => r.status === "rejected" && applySearchFilters(r));
    const reserved = requests.filter(r => r.status === "reserved" && applySearchFilters(r));
    const edited = requests.filter(r => r.user_edited === true && applySearchFilters(r));
    return {
      pending: { count: pending.length, amount: pending.reduce((s, r) => s + r.amount, 0) },
      delivered: { count: delivered.length, amount: delivered.reduce((s, r) => s + r.amount, 0) },
      rejected: { count: rejected.length, amount: rejected.reduce((s, r) => s + r.amount, 0) },
      reserved: { count: reserved.length, amount: reserved.reduce((s, r) => s + r.amount, 0) },
      edited: { count: edited.length, amount: edited.reduce((s, r) => s + r.amount, 0) },
    };
  }, [requests, search, bankFilter, countryFilter, amountMin, amountMax]);

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
    pending:   { label: "قيد الانتظار", textClass: "text-amber-400",   bgClass: "bg-amber-500/10",   icon: <Clock className="w-3 h-3" /> },
    delivered: { label: "تم التحويل",   textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", icon: <CheckCircle className="w-3 h-3" /> },
    approved:  { label: "تم التحويل",   textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", icon: <CheckCircle className="w-3 h-3" /> },
    rejected:  { label: "مرفوض",        textClass: "text-rose-400",    bgClass: "bg-rose-500/10",    icon: <XCircle className="w-3 h-3" /> },
    reserved:  { label: "محجوز",        textClass: "text-orange-400",  bgClass: "bg-orange-500/10",  icon: <Lock className="w-3 h-3" /> },
    review:    { label: "مراجعة",       textClass: "text-blue-400",    bgClass: "bg-blue-500/10",    icon: <Eye className="w-3 h-3" /> },
  };

  const statusBadge = (status: string) => {
    const s = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.textClass} ${s.bgClass}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  const adminRole = localStorage.getItem("admin_role");
  const isSuperAdmin = adminRole === "owner" || adminRole === "super_admin";

  return (
    <div className="space-y-4 print-area" dir="rtl">

      {/* ═══ MONTH SELECTOR ═══ */}
      <div className="flex items-center gap-2">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs px-3 h-9 text-foreground font-bold">
          {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        {!isCurrentMonth && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <CalendarDays className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] text-amber-400 font-bold">أرشيف</span>
          </div>
        )}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-4 gap-1.5">
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.key;
          const data = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative rounded-xl p-2.5 text-center transition-all duration-200 border ${
                isActive
                  ? `${tab.border} ${tab.bg} shadow-lg ${tab.glow}`
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className={`flex items-center justify-center gap-1 mb-1 ${isActive ? tab.color : "text-muted-foreground"}`}>
                {tab.icon}
                <span className="text-[10px] font-bold">{tab.label}</span>
              </div>
              <p className={`text-lg font-black tabular-nums font-mono ${isActive ? tab.color : "text-foreground/60"}`}>
                {data.count}
              </p>
              <p className={`text-[9px] font-mono tabular-nums ${isActive ? tab.color + "/70" : "text-muted-foreground"}`}>
                ${data.amount.toLocaleString()}
              </p>
              {isActive && (
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${tab.bg.replace("/10", "")}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ SEARCH + ADVANCED FILTERS ═══ */}
      <div className="space-y-2 no-print">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث: الآيدي، الاسم، كود التتبع، الهاتف، المرجعي..."
            className="bg-white/[0.04] border-white/[0.08] pr-9 text-xs h-9 rounded-xl" dir="rtl" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              showAdvancedFilters ? "bg-primary/10 text-primary border border-primary/20" : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.06]"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            فلترة متقدمة
          </button>

          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/15 transition-all">
              <X className="w-3 h-3" /> مسح الفلاتر
            </button>
          )}

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={handlePrint}
            className="h-7 px-2 border-white/[0.08] rounded-lg hover:bg-white/[0.04] text-muted-foreground">
            <Printer className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Advanced filters panel */}
        {showAdvancedFilters && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2.5 css-fade-up">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" /> الدولة
                </label>
                <select value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setBankFilter("all"); }}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-[10px] px-2 h-8 text-foreground">
                  {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                  <CreditCard className="w-2.5 h-2.5" /> طريقة الدفع
                </label>
                <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-[10px] px-2 h-8 text-foreground">
                  <option value="all">الكل</option>
                  {BANKS.filter(b => b.value !== "all").map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                <DollarSign className="w-2.5 h-2.5" /> نطاق المبلغ
              </label>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="من $" value={amountMin} onChange={e => setAmountMin(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] flex-1 text-[10px] h-8 px-2 rounded-lg" dir="ltr" />
                <span className="text-[10px] text-muted-foreground">—</span>
                <Input type="number" placeholder="إلى $" value={amountMax} onChange={e => setAmountMax(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] flex-1 text-[10px] h-8 px-2 rounded-lg" dir="ltr" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ REQUEST CARDS ═══ */}
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/[0.05] rounded w-2/3" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">لا توجد طلبات {statusConfig[activeTab]?.label || ""}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((req, i) => {
            const sc = statusConfig[req.status] || statusConfig.pending;
            return (
              <div key={req.id}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 hover:border-white/[0.1] transition-all duration-200 css-fade-up"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                {/* Old transfer warning */}
                {req.status === "pending" && isOldTransfer(req) && (
                  <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="text-[9px] text-rose-400 font-bold">⚠️ حوالة قديمة — عمرها {formatTransferAge(getTransferAgeHours(req))} — يُنصح بالرفض</span>
                  </div>
                )}
                {/* Duplicate warning */}
                {req.is_duplicate_flagged && (
                  <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-[9px] text-amber-400 font-bold">تحذير كوينز — طلب مكرر</span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <AvatarCircle src={req.avatar} name={req.account_name || req.user_name} size="w-10 h-10" />

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(req.status)}
                        {req.user_edited && req.status === "reserved" && (
                          <span className="text-[8px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full font-bold">معدّل</span>
                        )}
                      </div>
                      <p className="text-base font-black tabular-nums font-mono text-foreground">${req.amount}</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground truncate">{req.account_name || req.user_name}</p>
                      <p className="text-[10px] text-emerald-400 font-mono truncate">{req.user_uuid}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[9px] text-muted-foreground">
                      <span>{COUNTRY_LABELS[req.country] || req.country}</span>
                      <span className="text-white/10">·</span>
                      <span>{BANK_LABELS[req.bank] || req.bank}</span>
                      {req.reference_id && (
                        <>
                          <span className="text-white/10">·</span>
                          <span className="font-mono text-foreground/60">#{req.reference_id}</span>
                        </>
                      )}
                    </div>

                    {/* Reject/Reserve reason */}
                    {req.status === "rejected" && (req.admin_note || req.reject_reason) && (
                      <div className="flex items-start gap-1.5 mt-1">
                        <XCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-rose-400/80 leading-relaxed">{req.reject_reason || req.admin_note}</p>
                      </div>
                    )}
                    {req.status === "reserved" && req.reserve_reason && (
                      <div className="flex items-start gap-1.5 mt-1">
                        <Lock className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-orange-400/80 leading-relaxed">{req.reserve_reason}</p>
                      </div>
                    )}

                    {/* Process date */}
                    {(req.status === "delivered" && req.approved_at) && (
                      <p className="text-[9px] text-emerald-400/60 font-mono">{formatDateSA(req.approved_at)}</p>
                    )}
                    {(req.status === "rejected" && req.rejected_at) && (
                      <p className="text-[9px] text-rose-400/60 font-mono">{formatDateSA(req.rejected_at)}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {req.status === "pending" && canAct && isCurrentMonth && isSuperAdmin ? (
                        <button onClick={() => openDetailSheet(req)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-gradient-to-br from-amber-500/15 to-amber-600/10 text-amber-400 border border-amber-500/20 hover:from-amber-500/25 transition-all active:scale-95">
                          <Eye className="w-3 h-3" /> عرض ومعالجة
                        </button>
                      ) : (
                        <button onClick={() => openDetailSheet(req)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.06] transition-all active:scale-95">
                          <Eye className="w-3 h-3" /> عرض التفاصيل
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button className="p-1.5 rounded-lg bg-rose-500/5 text-rose-400/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MONTHLY SUMMARY ═══ */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3 css-fade-up">
          <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> ملخص الشهر
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5">
              <p className="text-[10px] text-emerald-400 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> تحويل</p>
              <p className="text-sm font-bold font-mono tabular-nums text-emerald-400">{tabCounts.delivered.count}</p>
              <p className="text-[10px] font-semibold font-mono text-emerald-400/70">${tabCounts.delivered.amount.toLocaleString()}</p>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5">
              <p className="text-[10px] text-rose-400 flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> مرفوض</p>
              <p className="text-sm font-bold font-mono tabular-nums text-rose-400">{tabCounts.rejected.count}</p>
              <p className="text-[10px] font-semibold font-mono text-rose-400/70">${tabCounts.rejected.amount.toLocaleString()}</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-2.5">
              <p className="text-[10px] text-amber-400 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> انتظار</p>
              <p className="text-sm font-bold font-mono tabular-nums text-amber-400">{tabCounts.pending.count}</p>
              <p className="text-[10px] font-semibold font-mono text-amber-400/70">${tabCounts.pending.amount.toLocaleString()}</p>
            </div>
          </div>
          {countrySummary.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-bold">التوزيع حسب الدولة:</p>
              {countrySummary.map(([country, data]) => (
                <div key={country} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.04] rounded-xl px-3 py-2 text-xs">
                  <span className="text-foreground">{country}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">{data.count} طلب — <strong className="text-primary">${data.amount.toLocaleString()}</strong></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ DETAIL SHEET ═══ */}
      <Sheet open={!!detailReq} onOpenChange={() => setDetailReq(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0c0f1d] border-white/[0.06]" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/[0.06]">
            <SheetTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Hash className="w-4 h-4 text-primary" /> تفاصيل الطلب
            </SheetTitle>
          </SheetHeader>
          {detailReq && (
            <div className="space-y-4 pt-4">
              {/* Code + Status */}
              <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-[9px] text-muted-foreground">كود التتبع</p>
                  <p className="text-xs font-bold font-mono text-foreground">{detailReq.request_code}</p>
                </div>
                {statusBadge(detailReq.status)}
              </div>

              {/* Reference */}
              {detailReq.reference_id && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                  <p className="text-[9px] text-muted-foreground">الرقم المرجعي</p>
                  <p className="text-xs font-bold font-mono text-primary">#{detailReq.reference_id}</p>
                </div>
              )}

              {/* Duplicate warning */}
              {detailReq.is_duplicate_flagged && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[10px] text-amber-400 font-bold">تحذير كوينز — طلب مكرر محتمل</span>
                </div>
              )}

              {/* User header */}
              <div className="flex items-center gap-3">
                <AvatarCircle src={detailAvatar || detailReq.avatar} name={detailReq.user_name || detailReq.account_name} size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{detailReq.user_name}</p>
                  <p className="text-[10px] text-emerald-400 font-mono">UUID: {detailReq.user_uuid}</p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-black font-mono tabular-nums text-primary">${detailReq.amount}</p>
                </div>
              </div>

              {/* Request details */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/[0.06] pb-1">تفاصيل الطلب</p>
                <div className="grid grid-cols-2 gap-2">
                  <DetailCell icon={<User className="w-3 h-3" />} label="المستلم" value={detailReq.account_name} />
                  <DetailCell icon={<DollarSign className="w-3 h-3" />} label="المبلغ" value={`$${detailReq.amount}`} />
                  <DetailCell icon={<Building2 className="w-3 h-3" />} label="الدولة" value={COUNTRY_LABELS[detailReq.country] || detailReq.country} />
                  <DetailCell icon={<Phone className="w-3 h-3" />} label="الهاتف" value={detailReq.whatsapp} dir="ltr" />
                  <DetailCell icon={<CreditCard className="w-3 h-3" />} label="طريقة الدفع" value={BANK_LABELS[detailReq.bank] || detailReq.bank} />
                  <DetailCell icon={<Hash className="w-3 h-3" />} label="رقم الحساب" value={detailReq.account_number} dir="ltr" />
                </div>
                <DetailCell icon={<CalendarDays className="w-3 h-3" />} label="تاريخ الطلب" value={formatDateSA(detailReq.created_at)} />
                {detailReq.salary_type && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs flex items-center gap-2">
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

                {/* User-uploaded supporter receipt from Supabase */}
                {(detailReq as any).transfer_image_url && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                      <Upload className="w-3 h-3" /> إيصال تحويل الداعم (مرفق من المستخدم)
                    </p>
                    <button onClick={() => setImagePreview((detailReq as any).transfer_image_url)}
                      className="w-full rounded-xl overflow-hidden border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                      <img src={(detailReq as any).transfer_image_url} alt="supporter receipt" className="w-full h-40 object-cover" />
                    </button>
                  </div>
                )}
              </div>

              {/* Salary report */}
              {detailReportLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">جاري جلب التقرير...</span>
                </div>
              ) : detailReport && (
                <>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/[0.06] pb-1 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-primary" /> الدعم والهدايا
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "أرسل هذا الشهر", value: detailReport.monthly_sent || 0 },
                        { label: "استلم هذا الشهر", value: detailReport.monthly_received || 0 },
                        { label: "مستوى الإرسال", value: detailReport.sender_level || 0 },
                        { label: "مستوى الاستقبال", value: detailReport.receiver_level || 0 },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white/[0.03] border border-white/[0.04] rounded-lg px-3 py-2 flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground">{item.label}</span>
                          <span className="text-xs font-bold font-mono text-foreground">{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    {(detailReport.charger_level || 0) > 0 && (
                      <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg px-3 py-2 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">مستوى الشحن</span>
                        <span className="text-xs font-bold font-mono text-foreground">{detailReport.charger_level}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/[0.06] pb-1 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-primary" /> تقرير الراتب
                    </p>
                    {detailReport.salary !== undefined ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between bg-white/[0.03] border border-white/[0.04] rounded-lg px-3 py-2">
                          <span className="text-[10px] text-muted-foreground">الراتب الأصلي</span>
                          <span className="text-xs font-bold font-mono text-foreground">${detailReport.salary?.toLocaleString() || 0}</span>
                        </div>
                        {(detailReport.deduction || 0) > 0 && (
                          <div className="flex justify-between bg-rose-500/5 border border-rose-500/10 rounded-lg px-3 py-2">
                            <span className="text-[10px] text-rose-400">المقتطع</span>
                            <span className="text-xs font-bold font-mono text-rose-400">-${detailReport.deduction}</span>
                          </div>
                        )}
                        <div className="flex justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                          <span className="text-[10px] text-emerald-400 font-bold">الصافي</span>
                          <span className="text-xs font-bold font-mono text-emerald-400">${(detailReport.net_salary ?? detailReport.net ?? 0).toLocaleString()}</span>
                        </div>
                        {detailReport.agency_salary > 0 && (
                          <div className="flex justify-between bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                            <span className="text-[10px] text-amber-400">عمولة الوكالة</span>
                            <span className="text-xs font-bold font-mono text-amber-400">${detailReport.agency_salary}</span>
                          </div>
                        )}
                        {detailReport.agency_id > 0 && (
                          <div className="flex justify-between bg-white/[0.03] border border-white/[0.04] rounded-lg px-3 py-2">
                            <span className="text-[10px] text-muted-foreground">الوكالة</span>
                            <span className="text-xs font-bold text-foreground">#{detailReport.agency_id}</span>
                          </div>
                        )}
                      </div>
                    ) : detailReport.host_salary ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between bg-white/[0.03] border border-white/[0.04] rounded-lg px-3 py-2">
                          <span className="text-[10px] text-muted-foreground">الراتب الأصلي</span>
                          <span className="text-xs font-bold font-mono text-foreground">${detailReport.host_salary.salary?.toLocaleString() || 0}</span>
                        </div>
                        {(detailReport.host_salary.deduction || 0) > 0 && (
                          <div className="flex justify-between bg-rose-500/5 border border-rose-500/10 rounded-lg px-3 py-2">
                            <span className="text-[10px] text-rose-400">المقتطع</span>
                            <span className="text-xs font-bold font-mono text-rose-400">-${detailReport.host_salary.deduction}</span>
                          </div>
                        )}
                        <div className="flex justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                          <span className="text-[10px] text-emerald-400 font-bold">الصافي</span>
                          <span className="text-xs font-bold font-mono text-emerald-400">${(detailReport.host_salary.net_salary ?? detailReport.host_salary.net ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Security */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/[0.06] pb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" /> حالة الأمان
                    </p>
                    {getUserSecurityChecks(detailReport, detailReq).map((check, idx) => (
                      <div key={idx} className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${
                        check.status === "safe" ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" :
                        check.status === "danger" ? "bg-rose-500/5 border-rose-500/10 text-rose-400" :
                        "bg-amber-500/5 border-amber-500/10 text-amber-400"
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

              {/* Actions */}
              {canAct && isCurrentMonth && detailReq.status === "pending" && isSuperAdmin && (
                <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                  <Button onClick={() => { setApproveSheet(detailReq); setDetailReq(null); setReceiptFile(null); setReceiptPreview(""); setApproveNote(""); }}
                    className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs h-10 rounded-xl active:scale-[0.98] transition-all">
                    <CheckCircle className="w-4 h-4 ml-1.5" /> تأكيد الدفع
                  </Button>
                  <button onClick={() => { setEditSheet(detailReq); setEditAmount(String(detailReq.amount)); setDetailReq(null); }}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold text-xs h-10 px-3 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> تعديل
                  </button>
                  <button onClick={() => { setRejectSheet(detailReq); setDetailReq(null); setRejectReason(""); setRejectImage(null); }}
                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs h-10 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                    <XCircle className="w-4 h-4" /> رفض
                  </button>
                </div>
              )}
              {!isCurrentMonth && detailReq.status === "pending" && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> أرشيف — لا يمكن التعديل على طلبات الأشهر السابقة
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ APPROVE SHEET ═══ */}
      <Sheet open={!!approveSheet} onOpenChange={() => setApproveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0c0f1d] border-white/[0.06]" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/[0.06]">
            <SheetTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> تأكيد تسليم الراتب
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {approveSheet && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-1.5 text-xs">
                <p className="flex items-center gap-1.5"><User className="w-3 h-3 text-emerald-400" /> <strong>{approveSheet.user_name}</strong> — <strong className="text-primary">${approveSheet.amount}</strong></p>
                <p className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-emerald-400" /> {BANK_LABELS[approveSheet.bank] || approveSheet.bank} — {approveSheet.account_number}</p>
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
              {receiptPreview && <img src={receiptPreview} alt="receipt" className="w-full h-40 object-cover rounded-xl border border-white/[0.06]" />}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> ملاحظات (اختياري)
              </label>
              <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
                placeholder="ملاحظات إضافية..." className="bg-white/[0.04] border-white/[0.08] min-h-[60px] rounded-xl" />
            </div>

            {approveSheet?.is_duplicate_flagged && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                تحذير: هذا الطلب مشبوه بالتكرار — تأكد قبل التحويل
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setApproveSheet(null)} className="flex-1 h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-sm transition-all duration-200 text-foreground">إلغاء</button>
              <Button onClick={handleApprove} disabled={actionLoading || !receiptFile}
                className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 text-white font-bold h-12 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-4 h-4 ml-1.5" /> تأكيد التسليم</>}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ REJECT SHEET ═══ */}
      <Sheet open={!!rejectSheet} onOpenChange={() => setRejectSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0c0f1d] border-white/[0.06]" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/[0.06]">
            <SheetTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
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
                placeholder="مثال: اسم المستلم غير مطابق..." className="bg-white/[0.04] border-white/[0.08] min-h-[80px] rounded-xl" />
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
            {/* Final rejection checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFinalRejection}
                onChange={e => setIsFinalRejection(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-rose-500"
              />
              <div className="flex-1">
                <p className="text-xs font-bold text-rose-400">رفض نهائي (تسكير الحوالة)</p>
                <p className="text-[10px] text-rose-400/70 mt-0.5">
                  {isFinalRejection
                    ? "⛔ المستخدم لن يتمكن من إعادة الإرسال بنفس رقم الحوالة"
                    : "المستخدم يقدر يعدل ويعيد الإرسال بنفس الحوالة"}
                </p>
              </div>
            </label>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {isFinalRejection ? "سيتم تسكير الحوالة نهائياً — لا يمكن استخدامها مرة أخرى" : "سيتم إرجاع المبلغ لحساب المستخدم تلقائياً"}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setRejectSheet(null); setIsFinalRejection(false); }} className="flex-1 h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-sm transition-all duration-200 text-foreground">إلغاء</button>
              <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold h-12 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><XCircle className="w-4 h-4" /> تأكيد الرفض</>}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ EDIT AMOUNT SHEET ═══ */}
      <Sheet open={!!editSheet} onOpenChange={() => setEditSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl" style={{ background: "#0c0e14", border: "none" }}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-amber-400">
              <FileText className="w-5 h-5" /> تعديل المبلغ
            </SheetTitle>
          </SheetHeader>
          {editSheet && (
            <div className="space-y-4 pt-4">
              <div className="rounded-2xl p-3 bg-white/[0.03] space-y-1 text-sm">
                <p><strong>{editSheet.user_name}</strong> — UUID: {editSheet.user_uuid}</p>
                <p>المبلغ الحالي: <strong className="text-primary">${editSheet.amount}</strong></p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">المبلغ الجديد ($)</label>
                <Input value={editAmount} onChange={e => setEditAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="أدخل المبلغ الجديد" className="h-12 rounded-xl text-lg font-bold text-center" dir="ltr" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEditAmount} disabled={actionLoading || !editAmount.trim()} className="flex-1 h-12 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-xl">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديل"}
                </Button>
                <button onClick={() => setEditSheet(null)} className="flex-1 h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-sm text-foreground">إلغاء</button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ IMAGE PREVIEW ═══ */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 rounded-2xl bg-black/90 border-white/[0.06]">
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
  <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-2.5 text-xs">
    <span className="text-muted-foreground text-[10px] flex items-center gap-1 mb-0.5">{icon} {label}</span>
    <span className="font-bold text-foreground" dir={dir}>{value}</span>
  </div>
);

export default AdminSalaryWithdrawManager;
