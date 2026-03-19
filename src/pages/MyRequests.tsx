import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Clock, CheckCircle, XCircle, ChevronLeft,
  Wallet, Zap, Image as ImageIcon, Sparkles, Frame, RefreshCw, Headset,
  Hash, Crown, Camera, Scissors, X,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EXT_API = "https://galachat.site/project-z/api.php";

/* ─── Types ─── */
interface UnifiedRequest {
  id: string;
  type: string;
  typeLabel: string;
  typeIcon: React.ReactNode;
  typeColor: string;
  status: "pending" | "approved" | "rejected" | "completed" | "done";
  statusLabel: string;
  statusColor: string;
  statusIcon: React.ReactNode;
  date: string;
  detail?: string;
  amount?: string;
  adminNote?: string | null;
  transferImageUrl?: string | null;
  rejectionImageUrl?: string | null;
  navigateTo?: string;
  extraInfo?: { label: string; value: string }[];
}

/* ─── Helpers ─── */
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};
const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "قيد المراجعة", color: "text-amber-400", icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: "تمت الموافقة", color: "text-emerald-400", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { label: "مرفوض", color: "text-red-400", icon: <XCircle className="w-3.5 h-3.5" /> },
  completed: { label: "مكتمل", color: "text-emerald-400", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  done: { label: "تم", color: "text-emerald-400", icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  salary_monthly: { label: "سحب شهري", icon: <Wallet className="w-4 h-4" />, color: "bg-primary/15" },
  salary_instant: { label: "سحب فوري", icon: <Zap className="w-4 h-4 text-amber-400" />, color: "bg-amber-500/15" },
  salary_stars: { label: "كود نجوم", icon: <Sparkles className="w-4 h-4 text-purple-400" />, color: "bg-purple-500/15" },
  entry: { label: "دخولية", icon: <Sparkles className="w-4 h-4 text-primary" />, color: "bg-primary/15" },
  frame: { label: "إطار", icon: <Frame className="w-4 h-4 text-purple-400" />, color: "bg-purple-500/15" },
  vip: { label: "VIP", icon: <Crown className="w-4 h-4 text-amber-400" />, color: "bg-amber-500/15" },
  animated_photo: { label: "صورة متحركة", icon: <Camera className="w-4 h-4 text-pink-400" />, color: "bg-pink-500/15" },
  custom_gift: { label: "هدية مخصصة", icon: <Sparkles className="w-4 h-4 text-rose-400" />, color: "bg-rose-500/15" },
  gift: { label: "طلب هدية", icon: <Sparkles className="w-4 h-4 text-primary" />, color: "bg-primary/15" },
  hair: { label: "تسريحة شعر", icon: <Scissors className="w-4 h-4 text-violet-400" />, color: "bg-violet-500/15" },
  change_id: { label: "تغيير الآيدي", icon: <Hash className="w-4 h-4 text-sky-400" />, color: "bg-sky-500/15" },
  support: { label: "دعم فني", icon: <Headset className="w-4 h-4 text-primary" />, color: "bg-primary/15" },
  general: { label: "طلب عام", icon: <FileText className="w-4 h-4 text-primary" />, color: "bg-primary/15" },
};

const tabs = [
  { key: "all", label: "الكل", icon: <FileText className="w-3.5 h-3.5" /> },
  { key: "salary", label: "السحوبات", icon: <Wallet className="w-3.5 h-3.5" /> },
  { key: "items", label: "الإطارات والدخوليات", icon: <Frame className="w-3.5 h-3.5" /> },
  { key: "other", label: "أخرى", icon: <Sparkles className="w-3.5 h-3.5" /> },
];

const MyRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [allRequests, setAllRequests] = useState<UnifiedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedReq, setSelectedReq] = useState<UnifiedRequest | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/"); return; }
    fetchAll();
  }, [isAuthenticated]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const unified: UnifiedRequest[] = [];

    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [salaryRes, entryRes, frameRes, vipRes, animatedRes, customGiftRes, hairRes, idRes, extRequestsRes] = await Promise.all([
        supabase.from("salary_requests").select("*").eq("user_uuid", user.uuid).order("created_at", { ascending: false }).limit(30),
        supabase.from("entry_gift_claims").select("id, claim_type, gift_usage, claim_month, created_at, status, admin_note, title, duration_days").eq("user_uuid", user.uuid).order("created_at", { ascending: false }).limit(20),
        supabase.from("frame_claims").select("id, claim_type, claim_month, created_at, status, admin_note, title, duration_days").eq("user_uuid", user.uuid).order("created_at", { ascending: false }).limit(20),
        supabase.from("vip_requests").select("id, vip_level, created_at, request_month, recipient_uuid").eq("user_uuid", user.uuid).order("created_at", { ascending: false }).limit(20),
        supabase.from("animated_photo_requests").select("id, status, duration_label, created_at, admin_note, rejection_image_url, is_final_rejection").eq("user_uuid", user.uuid).order("created_at", { ascending: false }).limit(20),
        supabase.from("custom_gifts").select("id, title, status, created_at, admin_note, rejection_image_url, is_final_rejection").eq("user_uuid", user.uuid).order("created_at", { ascending: false }).limit(20),
        supabase.from("hair_selections").select("id, selection_week, status, created_at, admin_note, hairs(title)").eq("user_uuid", user.uuid).order("created_at", { ascending: false }).limit(20),
        supabase.from("id_changes").select("id, new_id, level_milestone, created_at").or(`user_uuid.eq.${user.uuid},new_id.eq.${user.uuid}`).order("created_at", { ascending: false }).limit(10),
        fetch(`${EXT_API}?action=my_salary_requests&uuid=${user.uuid}&month=${month}`).then(r => r.json()).catch(() => ({ requests: [] })),
      ]);

    // Salary
    for (const r of (salaryRes.data || []) as any[]) {
      const t = r.request_type === "monthly" ? "salary_monthly" : r.request_type === "instant" ? "salary_instant" : "salary_stars";
      const tc = typeConfig[t];
      const st = statusMap[r.status] || statusMap.pending;
      unified.push({
        id: r.id, type: t, typeLabel: tc.label, typeIcon: tc.icon, typeColor: tc.color,
        status: r.status, statusLabel: st.label, statusColor: st.color, statusIcon: st.icon,
        date: r.created_at, amount: `$${r.amount_usd}`, adminNote: r.admin_note,
        transferImageUrl: r.transfer_image_url, rejectionImageUrl: null,
        navigateTo: r.request_type === "instant" ? "/instant-request" : "/salary",
        extraInfo: [
          { label: "المستلم", value: r.recipient_name },
          { label: "الدولة", value: r.recipient_country },
          { label: "طريقة الدفع", value: r.payment_method },
          { label: "تفاصيل الحساب", value: r.payment_details },
          ...(r.transaction_id ? [{ label: "رقم المعاملة", value: String(r.transaction_id) }] : []),
        ],
      });
    }

    // External salary
    for (const r of (extRequestsRes?.requests || []) as any[]) {
      const st = statusMap[r.status] || statusMap.pending;
      unified.push({
        id: `ext-${r.id}`, type: "salary_monthly", typeLabel: "سحب راتب", typeIcon: <Wallet className="w-4 h-4" />, typeColor: "bg-primary/15",
        status: r.status, statusLabel: st.label, statusColor: st.color, statusIcon: st.icon,
        date: r.created_at, amount: `$${r.amount}`, adminNote: r.admin_note,
        transferImageUrl: r.transfer_image_url, rejectionImageUrl: r.rejection_image_url,
        navigateTo: "/salary",
        extraInfo: [
          { label: "البنك", value: r.bank },
          { label: "الدولة", value: r.country },
          ...(r.account_name ? [{ label: "اسم المستلم", value: r.account_name }] : []),
          ...(r.reference_id ? [{ label: "المرجعي", value: `#${r.reference_id}` }] : []),
        ],
      });
    }

    // Entries
    for (const r of (entryRes.data || []) as any[]) {
      const st = statusMap[r.status] || statusMap.pending;
      unified.push({
        id: r.id, type: "entry", typeLabel: r.title || "دخولية", typeIcon: typeConfig.entry.icon, typeColor: typeConfig.entry.color,
        status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
        statusLabel: st.label, statusColor: st.color, statusIcon: st.icon,
        date: r.created_at, detail: r.claim_type === "self" ? "لنفسي" : "لصديق", adminNote: r.admin_note,
        navigateTo: "/entry-request",
        extraInfo: [
          { label: "الشهر", value: r.claim_month },
          ...(r.duration_days ? [{ label: "المدة", value: `${r.duration_days} يوم` }] : []),
        ],
      });
    }

    // Frames
    for (const r of (frameRes.data || []) as any[]) {
      const st = statusMap[r.status] || statusMap.pending;
      unified.push({
        id: r.id, type: "frame", typeLabel: r.title || "إطار", typeIcon: typeConfig.frame.icon, typeColor: typeConfig.frame.color,
        status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
        statusLabel: st.label, statusColor: st.color, statusIcon: st.icon,
        date: r.created_at, detail: r.claim_type === "self" ? "لنفسي" : "لصديق", adminNote: r.admin_note,
        navigateTo: "/frames",
        extraInfo: [
          { label: "الشهر", value: r.claim_month },
          ...(r.duration_days ? [{ label: "المدة", value: `${r.duration_days} يوم` }] : []),
        ],
      });
    }

    // VIP
    for (const r of (vipRes.data || []) as any[]) {
      unified.push({
        id: r.id, type: "vip", typeLabel: `VIP ${r.vip_level}`, typeIcon: typeConfig.vip.icon, typeColor: typeConfig.vip.color,
        status: "done", statusLabel: "تم", statusColor: "text-emerald-400", statusIcon: <CheckCircle className="w-3.5 h-3.5" />,
        date: r.created_at, detail: r.recipient_uuid ? "إهداء" : "لنفسي",
        navigateTo: "/request-vip",
        extraInfo: [{ label: "الشهر", value: r.request_month }],
      });
    }

    // Animated photos
    for (const r of (animatedRes.data || []) as any[]) {
      const st = statusMap[r.status] || statusMap.pending;
      unified.push({
        id: r.id, type: "animated_photo", typeLabel: "صورة متحركة", typeIcon: typeConfig.animated_photo.icon, typeColor: typeConfig.animated_photo.color,
        status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
        statusLabel: st.label, statusColor: st.color, statusIcon: st.icon,
        date: r.created_at, detail: r.duration_label, adminNote: r.admin_note,
        rejectionImageUrl: r.rejection_image_url, navigateTo: "/animated-photo",
      });
    }

    // Custom gifts
    for (const r of (customGiftRes.data || []) as any[]) {
      const st = statusMap[r.status] || statusMap.pending;
      unified.push({
        id: r.id, type: "custom_gift", typeLabel: r.title || "هدية مخصصة", typeIcon: typeConfig.custom_gift.icon, typeColor: typeConfig.custom_gift.color,
        status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
        statusLabel: st.label, statusColor: st.color, statusIcon: st.icon,
        date: r.created_at, adminNote: r.admin_note, rejectionImageUrl: r.rejection_image_url,
        navigateTo: "/custom-gift",
      });
    }

    // Hairs
    for (const r of (hairRes.data || []) as any[]) {
      const st = statusMap[r.status] || statusMap.pending;
      unified.push({
        id: r.id, type: "hair", typeLabel: (r as any).hairs?.title || "تسريحة شعر", typeIcon: typeConfig.hair.icon, typeColor: typeConfig.hair.color,
        status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
        statusLabel: st.label, statusColor: st.color, statusIcon: st.icon,
        date: r.created_at, detail: `أسبوع ${r.selection_week}`, adminNote: r.admin_note,
        navigateTo: "/hairs",
      });
    }

    // ID changes
    for (const r of (idRes.data || []) as any[]) {
      unified.push({
        id: r.id, type: "change_id", typeLabel: `تغيير إلى ${r.new_id}`, typeIcon: typeConfig.change_id.icon, typeColor: typeConfig.change_id.color,
        status: "done", statusLabel: "تم", statusColor: "text-emerald-400", statusIcon: <CheckCircle className="w-3.5 h-3.5" />,
        date: r.created_at, extraInfo: [{ label: "عند لفل", value: String(r.level_milestone) }],
      });
    }

    // Sort by date descending
    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAllRequests(unified);
    } catch (err) {
      console.error("fetchAll error:", err);
    }
    setLoading(false);
  };

  const filteredRequests = allRequests.filter(r => {
    if (activeTab === "all") return true;
    if (activeTab === "salary") return r.type.startsWith("salary");
    if (activeTab === "items") return r.type === "entry" || r.type === "frame" || r.type === "hair";
    return !r.type.startsWith("salary") && r.type !== "entry" && r.type !== "frame" && r.type !== "hair";
  });

  const statusBg = (status: string) => {
    if (status === "pending") return "border-amber-500/20 bg-amber-500/5";
    if (status === "approved" || status === "completed" || status === "done") return "border-emerald-500/20 bg-emerald-500/5";
    if (status === "rejected") return "border-red-500/20 bg-red-500/5";
    return "border-border/20";
  };

  const pendingCount = allRequests.filter(r => r.status === "pending").length;
  const approvedCount = allRequests.filter(r => r.status === "approved" || r.status === "done" || r.status === "completed").length;

  return (
    <MobileLayout showHeader headerTitle="طلباتي" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-3 space-y-3" dir="rtl">
        
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card/50 border border-border/20 p-2.5 text-center">
            <p className="text-lg font-black text-foreground">{allRequests.length}</p>
            <p className="text-[9px] text-muted-foreground font-bold">إجمالي الطلبات</p>
          </div>
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-2.5 text-center">
            <p className="text-lg font-black text-amber-400">{pendingCount}</p>
            <p className="text-[9px] text-muted-foreground font-bold">قيد المراجعة</p>
          </div>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-2.5 text-center">
            <p className="text-lg font-black text-emerald-400">{approvedCount}</p>
            <p className="text-[9px] text-muted-foreground font-bold">مكتملة</p>
          </div>
        </div>

        {/* Tabs - scrollable */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all shrink-0
                ${activeTab === tab.key
                  ? "gold-gradient text-primary-foreground"
                  : "bg-card/40 border border-border/20 text-muted-foreground"
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredRequests.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/20 flex items-center justify-center mb-3">
              <FileText className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">لا توجد طلبات</p>
            <p className="text-[11px] text-muted-foreground">لم تقم بإرسال أي طلب في هذا القسم بعد</p>
          </div>
        )}

        {/* Request cards */}
        {!loading && filteredRequests.map((req, i) => (
          <button
            key={req.id}
            onClick={() => setSelectedReq(req)}
            className={`w-full rounded-xl border overflow-hidden text-right transition-all active:scale-[0.98] ${statusBg(req.status)}`}
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            <div className="px-3.5 py-3 flex items-center gap-3">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${req.typeColor}`}>
                {req.typeIcon}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-foreground truncate">{req.typeLabel}</p>
                  {req.amount && (
                    <span className="text-[11px] font-black font-mono text-foreground shrink-0" dir="ltr">{req.amount}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-[9px] font-bold ${req.statusColor}`}>
                      {req.statusIcon} {req.statusLabel}
                    </span>
                    {req.detail && (
                      <span className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{req.detail}</span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground">{formatDate(req.date)}</span>
                </div>
              </div>
              
              {/* Arrow */}
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-[92vw] rounded-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedReq && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedReq.typeColor}`}>
                    {selectedReq.typeIcon}
                  </div>
                  {selectedReq.typeLabel}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                {/* Status badge */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${statusBg(selectedReq.status)}`}>
                  <span className={`flex items-center gap-1.5 text-xs font-bold ${selectedReq.statusColor}`}>
                    {selectedReq.statusIcon} {selectedReq.statusLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(selectedReq.date)} • {formatTime(selectedReq.date)}</span>
                </div>

                {/* Amount */}
                {selectedReq.amount && (
                  <div className="flex items-center justify-between bg-muted/20 rounded-xl p-3">
                    <span className="text-xs text-muted-foreground">المبلغ</span>
                    <span className="text-sm font-black text-primary font-mono" dir="ltr">{selectedReq.amount}</span>
                  </div>
                )}

                {/* Extra info */}
                {selectedReq.extraInfo?.map((info, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/15 rounded-xl p-2.5">
                    <span className="text-[11px] text-muted-foreground">{info.label}</span>
                    <span className="text-[11px] font-bold text-foreground">{info.value}</span>
                  </div>
                ))}

                {/* Detail */}
                {selectedReq.detail && (
                  <div className="flex items-center justify-between bg-muted/15 rounded-xl p-2.5">
                    <span className="text-[11px] text-muted-foreground">النوع</span>
                    <span className="text-[11px] font-bold text-foreground">{selectedReq.detail}</span>
                  </div>
                )}

                {/* Transfer image */}
                {selectedReq.transferImageUrl && selectedReq.status === "approved" && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> إيصال التحويل:
                    </p>
                    <img 
                      src={selectedReq.transferImageUrl} alt="إيصال"
                      className="w-full max-h-48 object-contain rounded-xl border border-emerald-500/20 cursor-pointer bg-black/20"
                      onClick={() => setImagePreview(selectedReq.transferImageUrl!)}
                    />
                  </div>
                )}

                {/* Admin note (rejected) */}
                {selectedReq.status === "rejected" && selectedReq.adminNote && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 space-y-1">
                    <p className="text-[10px] font-bold text-red-400">سبب الرفض:</p>
                    <p className="text-[11px] text-foreground leading-relaxed">{selectedReq.adminNote}</p>
                  </div>
                )}

                {/* Rejection image */}
                {selectedReq.rejectionImageUrl && (
                  <img
                    src={selectedReq.rejectionImageUrl} alt="توضيح"
                    className="w-full max-h-40 object-contain rounded-xl border border-red-500/20 cursor-pointer"
                    onClick={() => setImagePreview(selectedReq.rejectionImageUrl!)}
                  />
                )}

                {/* Resubmit */}
                {selectedReq.status === "rejected" && selectedReq.navigateTo && (
                  <Button onClick={() => { setSelectedReq(null); navigate(selectedReq.navigateTo!); }} className="w-full" size="sm">
                    <RefreshCw className="w-4 h-4 ml-1" /> إعادة المحاولة
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen image preview */}
      {imagePreview && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
          <button className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" onClick={() => setImagePreview(null)}>
            <X className="w-4 h-4 text-white" />
          </button>
          <img src={imagePreview} alt="معاينة" className="max-w-full max-h-[85vh] rounded-2xl" />
        </div>
      )}
    </MobileLayout>
  );
};

export default MyRequests;
