import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, CheckCircle, XCircle, Clock, Search, Upload,
  Loader2, FileText, Image,
  ChevronDown, ChevronUp, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const API = "https://galachat.site/admin-panel-api.php";
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
}

interface Stats {
  total: number;
  delivered: number;
  delivered_amount: number;
  pending: number;
  pending_amount: number;
  rejected: number;
}

interface Props {
  canAct: boolean;
}

const AdminSalaryWithdrawManager: React.FC<Props> = ({ canAct }) => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, delivered: 0, delivered_amount: 0, pending: 0, pending_amount: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "delivered" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  // Action modals
  const [approveModal, setApproveModal] = useState<WithdrawRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<WithdrawRequest | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectImage, setRejectImage] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Image preview
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const token = sessionStorage.getItem("admin_session_token") || "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?action=salary_withdraw_list&admin_key=ghala2026owner&month=${selectedMonth}&status=${filter}`);
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
  }, [token, selectedMonth, filter]);

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
    if (!approveModal || !receiptFile) {
      toast.error("يجب رفع إيصال التحويل");
      return;
    }
    setActionLoading(true);
    try {
      const receiptBase64 = await fileToBase64(receiptFile);
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "salary_withdraw_approve",
          token,
          request_id: approveModal.id,
          receipt_image: receiptBase64,
          notes: approveNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("✅ تم قبول الطلب وإرسال الإشعار");
        setApproveModal(null);
        setReceiptFile(null);
        setReceiptPreview("");
        setApproveNote("");
        fetchData();
      } else {
        toast.error(data.error || "فشل في قبول الطلب");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) {
      toast.error("يجب كتابة سبب الرفض");
      return;
    }
    setActionLoading(true);
    try {
      let imageBase64: string | undefined;
      if (rejectImage) imageBase64 = await fileToBase64(rejectImage);

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "salary_withdraw_reject",
          token,
          request_id: rejectModal.id,
          reason: rejectReason,
          image: imageBase64,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("❌ تم رفض الطلب وإرسال الإشعار");
        setRejectModal(null);
        setRejectReason("");
        setRejectImage(null);
        fetchData();
      } else {
        toast.error(data.error || "فشل في رفض الطلب");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = requests.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      return r.user_name?.toLowerCase().includes(q) ||
        r.user_uuid?.includes(q) ||
        r.request_code?.toLowerCase().includes(q) ||
        r.account_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: "قيد المراجعة", color: "text-amber-400 bg-amber-500/10", icon: <Clock className="w-3 h-3" /> },
      delivered: { label: "تم التسليم", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { label: "مرفوض", color: "text-red-400 bg-red-500/10", icon: <XCircle className="w-3 h-3" /> },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.color}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">إجمالي الطلبات</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center">
          <p className="text-[10px] text-emerald-400 mb-1">✅ تم التسليم</p>
          <p className="text-xl font-bold text-emerald-400">${stats.delivered_amount}</p>
          <p className="text-[9px] text-muted-foreground">{stats.delivered} طلب</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-center">
          <p className="text-[10px] text-amber-400 mb-1">⏳ قيد المراجعة</p>
          <p className="text-xl font-bold text-amber-400">${stats.pending_amount}</p>
          <p className="text-[9px] text-muted-foreground">{stats.pending} طلب</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-center">
          <p className="text-[10px] text-red-400 mb-1">❌ مرفوضة</p>
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="bg-muted/20 border-border/30 flex-1" dir="ltr" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "pending", "delivered", "rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-colors ${
                filter === f ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground hover:bg-muted/20"
              }`}>
              {f === "all" ? "الكل" : f === "pending" ? "معلّق" : f === "delivered" ? "مسلّم" : "مرفوض"}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، UUID، أو كود الطلب..."
            className="bg-muted/20 border-border/30 pr-10" dir="rtl" />
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <button onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                className="w-full flex items-center justify-between p-3 text-right">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-primary">{req.request_code}</span>
                      {statusBadge(req.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {req.user_name} ({req.user_uuid})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-foreground">${req.amount}</span>
                  {expanded === req.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded details */}
              <AnimatePresence>
                {expanded === req.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/20 rounded-lg p-2">
                          <span className="text-muted-foreground block text-[10px]">🏦 البنك</span>
                          <span className="font-bold text-foreground">{req.bank} — {req.country}</span>
                        </div>
                        <div className="bg-muted/20 rounded-lg p-2">
                          <span className="text-muted-foreground block text-[10px]">👤 المستلم</span>
                          <span className="font-bold text-foreground">{req.account_name}</span>
                        </div>
                        <div className="bg-muted/20 rounded-lg p-2">
                          <span className="text-muted-foreground block text-[10px]">🔢 الحساب</span>
                          <span className="font-bold text-foreground" dir="ltr">{req.account_number}</span>
                        </div>
                        <div className="bg-muted/20 rounded-lg p-2">
                          <span className="text-muted-foreground block text-[10px]">📱 واتساب</span>
                          <span className="font-bold text-foreground" dir="ltr">{req.whatsapp}</span>
                        </div>
                      </div>
                      <div className="bg-muted/20 rounded-lg p-2 text-xs">
                        <span className="text-muted-foreground text-[10px]">📅 التاريخ</span>
                        <span className="font-bold text-foreground mr-2">{new Date(req.created_at).toLocaleString("ar")}</span>
                      </div>
                      {req.notes && (
                        <div className="bg-muted/20 rounded-lg p-2 text-xs">
                          <span className="text-muted-foreground text-[10px]">📝 ملاحظات</span>
                          <p className="text-foreground">{req.notes}</p>
                        </div>
                      )}
                      {req.receipt_image && (
                        <button onClick={() => setImagePreview(`${RECEIPT_BASE}${req.receipt_image}`)}
                          className="flex items-center gap-2 text-xs text-primary hover:underline">
                          <Eye className="w-3 h-3" /> عرض الإيصال
                        </button>
                      )}
                      {req.admin_note && (
                        <div className="bg-muted/20 rounded-lg p-2 text-xs">
                          <span className="text-muted-foreground text-[10px]">ملاحظة الأدمن</span>
                          <p className="text-foreground">{req.admin_note}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      {canAct && req.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <Button onClick={() => { setApproveModal(req); setReceiptFile(null); setReceiptPreview(""); setApproveNote(""); }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9">
                            <CheckCircle className="w-3.5 h-3.5 ml-1" /> قبول + إيصال
                          </Button>
                          <Button onClick={() => { setRejectModal(req); setRejectReason(""); setRejectImage(null); }}
                            variant="outline" className="flex-1 border-destructive/30 text-destructive font-bold text-xs h-9">
                            <XCircle className="w-3.5 h-3.5 ml-1" /> رفض
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

      {/* Approve Modal */}
      <Dialog open={!!approveModal} onOpenChange={() => setApproveModal(null)}>
        <DialogContent className="max-w-[380px] rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> قبول الطلب + رفع إيصال
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {approveModal && (
              <div className="bg-muted/20 rounded-xl p-3 text-xs space-y-1">
                <p><span className="text-muted-foreground">الكود:</span> <strong>{approveModal.request_code}</strong></p>
                <p><span className="text-muted-foreground">المبلغ:</span> <strong className="text-primary">${approveModal.amount}</strong></p>
                <p><span className="text-muted-foreground">المستلم:</span> <strong>{approveModal.account_name}</strong></p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">صورة إيصال التحويل *</label>
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border/30 rounded-xl cursor-pointer hover:bg-muted/10 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{receiptFile ? receiptFile.name : "اختر صورة الإيصال"}</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)); }
                  }} />
              </label>
              {receiptPreview && (
                <img src={receiptPreview} alt="receipt" className="w-full h-32 object-cover rounded-lg" />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">ملاحظات (اختياري)</label>
              <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
                placeholder="ملاحظات إضافية..." className="bg-muted/20 border-border/30 min-h-[50px]" />
            </div>
            <Button onClick={handleApprove} disabled={actionLoading || !receiptFile}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 disabled:opacity-40">
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد التسليم ✅"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
        <DialogContent className="max-w-[380px] rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <XCircle className="w-5 h-5 text-destructive" /> رفض الطلب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {rejectModal && (
              <div className="bg-muted/20 rounded-xl p-3 text-xs space-y-1">
                <p><span className="text-muted-foreground">الكود:</span> <strong>{rejectModal.request_code}</strong></p>
                <p><span className="text-muted-foreground">المستخدم:</span> <strong>{rejectModal.user_name}</strong></p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">سبب الرفض *</label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="اكتب سبب الرفض..." className="bg-muted/20 border-border/30 min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">صورة توضيحية (اختياري)</label>
              <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-border/30 rounded-xl cursor-pointer hover:bg-muted/10">
                <Image className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{rejectImage ? rejectImage.name : "رفع صورة"}</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setRejectImage(e.target.files[0]); }} />
              </label>
            </div>
            <Button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}
              variant="destructive" className="w-full font-bold h-11 disabled:opacity-40">
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد الرفض ❌"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 rounded-2xl">
          {imagePreview && <img src={imagePreview} alt="preview" className="w-full h-full object-contain rounded-xl" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSalaryWithdrawManager;
