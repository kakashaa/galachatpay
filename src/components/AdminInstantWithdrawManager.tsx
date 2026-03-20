import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, XCircle, Clock, Search, Upload,
  Loader2, Image, User, Hash,
  MessageSquare, ClipboardList, Zap,
  Eye, Phone, Building2, Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sendUserNotification } from "@/utils/sendUserNotification";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { getAvatarUrl } from "@/lib/utils";

const API = "https://galachat.site/project-z/api.php";
const COINS_PER_USD = 8500;

interface InstantRequest {
  id: string;
  user_uuid: string;
  user_name: string;
  user_phone: string;
  amount_usd: number;
  amount_coins: number;
  transfer_id: string;
  target_uuid: string;
  target_name: string;
  recipient_name: string;
  recipient_country: string;
  payment_method: string;
  payment_details: string;
  status: string;
  admin_note: string;
  transfer_image_url: string;
  rejection_image_url: string;
  created_at: string;
  updated_at: string;
  avatar?: string;
  target_avatar?: string;
}

interface Props {
  canAct: boolean;
}

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

const AdminInstantWithdrawManager: React.FC<Props> = ({ canAct }) => {
  const [requests, setRequests] = useState<InstantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");

  // Detail sheet
  const [detailReq, setDetailReq] = useState<InstantRequest | null>(null);

  // Approve
  const [approveSheet, setApproveSheet] = useState<InstantRequest | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [approveNote, setApproveNote] = useState("");

  // Reject
  const [rejectSheet, setRejectSheet] = useState<InstantRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectImage, setRejectImage] = useState<File | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("salary_requests")
        .select("*")
        .eq("request_type", "instant")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: InstantRequest[] = (data || []).map((r: any) => ({
        id: r.id,
        user_uuid: r.user_uuid || "",
        user_name: r.user_name || "",
        user_phone: r.user_phone || "",
        amount_usd: r.amount_usd || 0,
        amount_coins: r.amount_coins || 0,
        transfer_id: r.transfer_id || "",
        target_uuid: r.target_uuid || "",
        target_name: r.target_name || "",
        recipient_name: r.recipient_name || "",
        recipient_country: r.recipient_country || "",
        payment_method: r.payment_method || "",
        payment_details: r.payment_details || "",
        status: r.status || "pending",
        admin_note: r.admin_note || "",
        transfer_image_url: r.transfer_image_url || "",
        rejection_image_url: r.rejection_image_url || "",
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      // Enrich with avatars (batch)
      const enriched = await enrichAvatars(mapped);
      setRequests(enriched);
    } catch {
      toast.error("فشل في جلب طلبات السحب الفوري");
    } finally {
      setLoading(false);
    }
  }, []);

  const enrichAvatars = async (reqs: InstantRequest[]): Promise<InstantRequest[]> => {
    const result = [...reqs];
    const uuids = new Set<string>();
    result.forEach(r => { uuids.add(r.user_uuid); if (r.target_uuid) uuids.add(r.target_uuid); });
    const avatarMap: Record<string, string> = {};

    const uuidArr = Array.from(uuids);
    const BATCH = 5;
    for (let i = 0; i < uuidArr.length; i += BATCH) {
      const batch = uuidArr.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (uuid) => {
          try {
            const res = await fetch(`${API}?action=agent_lookup_user&admin_key=ghala2026owner&uuid=${uuid}`);
            const data = await res.json();
            return { uuid, avatar: data.avatar ? getAvatarUrl(data.avatar) : "" };
          } catch { return { uuid, avatar: "" }; }
        })
      );
      results.forEach(r => { avatarMap[r.uuid] = r.avatar; });
    }

    return result.map(r => ({
      ...r,
      avatar: avatarMap[r.user_uuid] || "",
      target_avatar: avatarMap[r.target_uuid] || "",
    }));
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
      // Upload receipt to storage
      const ext = receiptFile.name.split(".").pop() || "jpg";
      const filePath = `receipts/instant_${approveSheet.id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, receiptFile, { contentType: receiptFile.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(filePath);
      const receiptUrl = urlData?.publicUrl || "";

      // Update request
      const { error: updateError } = await supabase
        .from("salary_requests")
        .update({
          status: "approved",
          admin_note: approveNote || "تمت الموافقة",
          transfer_image_url: receiptUrl,
        } as any)
        .eq("id", approveSheet.id);

      if (updateError) throw updateError;

      // Also call external API to charge coins to supporter
      try {
        await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "salary_charge_manual",
            admin_key: "ghala2026owner",
            uuid: approveSheet.user_uuid,
            target_uuid: approveSheet.target_uuid,
            amount: approveSheet.amount_usd,
            reference_id: approveSheet.transfer_id,
            request_type: "instant_approved",
          }),
        });
      } catch { /* non-critical */ }

      // Send notification
      await sendUserNotification(
        approveSheet.user_uuid,
        "تم قبول طلب السحب الفوري ✅",
        `تم تحويل $${approveSheet.amount_usd} إلى حسابك البنكي. الكوينزات تم شحنها لحساب الداعم.`
      );

      toast.success("تم قبول الطلب وإرسال الإيصال");
      setApproveSheet(null); setReceiptFile(null); setReceiptPreview(""); setApproveNote("");
      fetchData();
    } catch (e: any) {
      toast.error("حدث خطأ: " + (e?.message || ""));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectSheet || !rejectReason.trim()) { toast.error("يجب كتابة سبب الرفض"); return; }
    setActionLoading(true);
    try {
      let rejectionUrl = "";
      if (rejectImage) {
        const ext = rejectImage.name.split(".").pop() || "jpg";
        const filePath = `receipts/instant_reject_${rejectSheet.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(filePath, rejectImage, { contentType: rejectImage.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(filePath);
          rejectionUrl = urlData?.publicUrl || "";
        }
      }

      const { error: updateError } = await supabase
        .from("salary_requests")
        .update({
          status: "rejected",
          admin_note: rejectReason,
          rejection_image_url: rejectionUrl || null,
        } as any)
        .eq("id", rejectSheet.id);

      if (updateError) throw updateError;

      await sendUserNotification(
        rejectSheet.user_uuid,
        "تم رفض طلب السحب الفوري ❌",
        `تم رفض طلب السحب الفوري. السبب: ${rejectReason}`
      );

      toast.success("تم رفض الطلب وإرسال الإشعار");
      setRejectSheet(null); setRejectReason(""); setRejectImage(null);
      fetchData();
    } catch (e: any) {
      toast.error("حدث خطأ: " + (e?.message || ""));
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filter !== "all" && r.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(r.user_name?.toLowerCase().includes(q) || r.user_uuid?.includes(q) || r.target_name?.toLowerCase().includes(q) || r.target_uuid?.includes(q) || r.transfer_id?.includes(q)))
          return false;
      }
      return true;
    });
  }, [requests, filter, search]);

  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === "pending");
    const approved = requests.filter(r => r.status === "approved");
    const rejected = requests.filter(r => r.status === "rejected");
    return {
      total: requests.length,
      totalAmount: requests.reduce((s, r) => s + r.amount_usd, 0),
      pending: pending.length,
      pendingAmount: pending.reduce((s, r) => s + r.amount_usd, 0),
      approved: approved.length,
      approvedAmount: approved.reduce((s, r) => s + r.amount_usd, 0),
      rejected: rejected.length,
    };
  }, [requests]);

  const statusConfig: Record<string, { label: string; textClass: string; bgClass: string; icon: React.ReactNode }> = {
    pending: { label: "قيد المراجعة", textClass: "text-amber-400", bgClass: "bg-amber-500/10", icon: <Clock className="w-3 h-3" /> },
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

  return (
    <div className="space-y-5" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: "all" as const, label: "الكل", icon: <ClipboardList className="w-4 h-4" />, count: stats.total, amount: stats.totalAmount, color: "text-foreground", border: "border-white/5", bg: "bg-card/50" },
          { key: "pending" as const, label: "معلقة", icon: <Clock className="w-4 h-4" />, count: stats.pending, amount: stats.pendingAmount, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
          { key: "approved" as const, label: "مسلّمة", icon: <CheckCircle className="w-4 h-4" />, count: stats.approved, amount: stats.approvedAmount, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
          { key: "rejected" as const, label: "مرفوضة", icon: <XCircle className="w-4 h-4" />, count: stats.rejected, amount: 0, color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5" },
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
            {card.amount > 0 && <p className={`text-xs font-semibold font-mono tabular-nums ${card.color} mt-0.5`}>${card.amount.toLocaleString()}</p>}
          </motion.button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث: UUID، اسم، رقم الحوالة..."
          className="bg-white/5 border-white/10 pr-9 text-xs h-9 rounded-xl" dir="rtl" />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card/50 border border-white/5 rounded-xl p-3 animate-pulse">
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">لا توجد طلبات سحب فوري</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req, i) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="bg-card/50 backdrop-blur-sm border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <AvatarCircle src={req.avatar} name={req.user_name} size="w-10 h-10" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(req.status)}
                    <span className="text-[10px] text-muted-foreground font-mono">#{req.transfer_id}</span>
                  </div>
                  <p className="text-xs text-foreground truncate">
                    <span className="font-bold">{req.user_name}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-bold text-violet-400">{req.target_name}</span>
                    <span className="text-muted-foreground"> • </span>
                    <span className="font-bold font-mono text-primary">${req.amount_usd}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{req.payment_method} — {req.recipient_country}</p>
                </div>
                <div className="shrink-0">
                  {req.status === "pending" && canAct ? (
                    <Button size="sm" onClick={() => setDetailReq(req)}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] h-7 px-3 rounded-lg">
                      معالجة
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setDetailReq(req)}
                      className="text-muted-foreground hover:text-foreground text-[10px] h-7 px-3 rounded-lg">
                      التفاصيل
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== DETAIL SHEET ===== */}
      <Sheet open={!!detailReq} onOpenChange={() => setDetailReq(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0f1117] border-white/5" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/5">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-primary" /> تفاصيل السحب الفوري
            </SheetTitle>
          </SheetHeader>
          {detailReq && (
            <div className="space-y-4 pt-4">
              {/* User header */}
              <div className="flex items-center gap-3">
                <AvatarCircle src={detailReq.avatar} name={detailReq.user_name} size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{detailReq.user_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">UUID: {detailReq.user_uuid}</p>
                </div>
                <div className="text-left">
                  {statusBadge(detailReq.status)}
                  <p className="text-lg font-bold font-mono tabular-nums text-primary mt-1">${detailReq.amount_usd}</p>
                </div>
              </div>

              {/* Transfer info */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-primary" /> الحوالة
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground block">رقم الحوالة</span>
                    <span className="text-xs font-bold font-mono text-foreground">#{detailReq.transfer_id}</span>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground block">المبلغ</span>
                    <span className="text-xs font-bold font-mono text-foreground">${detailReq.amount_usd}</span>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground block">الكوينزات</span>
                    <span className="text-xs font-bold font-mono text-amber-400">{(detailReq.amount_coins || detailReq.amount_usd * COINS_PER_USD).toLocaleString()}</span>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground block">التاريخ</span>
                    <span className="text-xs text-foreground">{formatDateSA(detailReq.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Supporter info */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-400" /> الداعم (يستلم الكوينزات)
                </p>
                <div className="flex items-center gap-3 p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                  <AvatarCircle src={detailReq.target_avatar} name={detailReq.target_name} size="w-10 h-10" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{detailReq.target_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">UUID: {detailReq.target_uuid}</p>
                  </div>
                </div>
              </div>

              {/* Bank info */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" /> بيانات التحويل البنكي
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground block">الاسم</span>
                    <span className="text-xs font-bold text-foreground">{detailReq.recipient_name}</span>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground block">الدولة</span>
                    <span className="text-xs font-bold text-foreground">{detailReq.recipient_country}</span>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground block">البنك</span>
                    <span className="text-xs font-bold text-foreground">{detailReq.payment_method}</span>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground block">الحساب</span>
                    <span className="text-xs font-bold text-foreground font-mono" dir="ltr">{detailReq.payment_details}</span>
                  </div>
                </div>
                {detailReq.user_phone && (
                  <div className="bg-white/[0.03] rounded-lg px-3 py-2 flex items-center gap-2">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">واتساب:</span>
                    <span className="text-xs font-bold text-foreground font-mono" dir="ltr">{detailReq.user_phone}</span>
                  </div>
                )}
              </div>

              {/* Admin note / receipt */}
              {detailReq.admin_note && detailReq.status === "rejected" && (
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5 text-xs">
                  <span className="text-rose-400 text-[10px] font-bold flex items-center gap-1 mb-0.5"><XCircle className="w-3 h-3" /> سبب الرفض</span>
                  <p className="text-foreground">{detailReq.admin_note}</p>
                </div>
              )}

              {detailReq.transfer_image_url && (
                <button onClick={() => setImagePreview(detailReq.transfer_image_url)}
                  className="flex items-center gap-2 text-xs text-primary hover:underline">
                  <Eye className="w-3.5 h-3.5" /> عرض إيصال التحويل
                </button>
              )}

              {/* Actions */}
              {canAct && detailReq.status === "pending" && (
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
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== APPROVE SHEET ===== */}
      <Sheet open={!!approveSheet} onOpenChange={() => setApproveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0f1117] border-white/5" dir="rtl">
          <SheetHeader className="pb-3 border-b border-white/5">
            <SheetTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> تأكيد السحب الفوري
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {approveSheet && (
              <>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-1.5 text-xs">
                  <p className="flex items-center gap-1.5"><User className="w-3 h-3 text-emerald-400" /> المضيف: <strong>{approveSheet.user_name}</strong> — <strong className="text-primary">${approveSheet.amount_usd}</strong></p>
                  <p className="flex items-center gap-1.5"><Coins className="w-3 h-3 text-amber-400" /> الداعم: <strong className="text-violet-400">{approveSheet.target_name}</strong> (UUID: {approveSheet.target_uuid})</p>
                  <p className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-emerald-400" /> {approveSheet.payment_method} — {approveSheet.payment_details}</p>
                  <p className="flex items-center gap-1.5"><Hash className="w-3 h-3 text-emerald-400" /> حوالة: #{approveSheet.transfer_id}</p>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-xs space-y-1">
                  <p className="font-bold text-foreground">عند القبول:</p>
                  <p className="text-muted-foreground">• الكوينزات تُشحن لحساب الداعم <span className="font-bold text-violet-400">{approveSheet.target_name}</span></p>
                  <p className="text-muted-foreground">• الفلوس تُحول للمضيف عبر <span className="font-bold text-foreground">{approveSheet.payment_method}</span></p>
                </div>
              </>
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
              <XCircle className="w-5 h-5 text-rose-400" /> رفض طلب السحب الفوري
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {rejectSheet && (
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-xs space-y-1.5">
                <p className="flex items-center gap-1.5"><User className="w-3 h-3 text-rose-400" /> <strong>{rejectSheet.user_name}</strong> — <strong className="text-primary">${rejectSheet.amount_usd}</strong></p>
                <p className="flex items-center gap-1.5"><Hash className="w-3 h-3 text-rose-400" /> حوالة: #{rejectSheet.transfer_id}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> سبب الرفض (إجباري) *
              </label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="مثال: الداعم لم يحوّل المبلغ..." className="bg-white/5 border-white/10 min-h-[80px] rounded-xl" />
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

      {/* Image Preview */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 rounded-2xl bg-black/90 border-white/5">
          {imagePreview && <img src={imagePreview} alt="preview" className="w-full h-auto rounded-xl object-contain max-h-[80vh]" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInstantWithdrawManager;
