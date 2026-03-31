import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Clock, CheckCircle, XCircle, FileText, Image as ImageIcon, Ban, RefreshCw, Eye, Calendar, User, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import SvgaPlayer from "@/components/SvgaPlayer";

interface RequestItem {
  id: string;
  label: string;
  detail?: string;
  refId?: string;
  status?: "pending" | "approved" | "rejected" | "completed" | "done";
  date: string;
  transferImageUrl?: string | null;
  adminNote?: string | null;
  rejectionImageUrl?: string | null;
  isFinalRejection?: boolean;
  fileUrl?: string | null;
  adminName?: string | null;
  duration?: number | null;
}

interface ServicePreviousRequestsProps {
  userUuid: string;
  serviceType: "vip" | "animated_photo" | "salary" | "change_id" | "custom_gift" | "entry_gift" | "frame" | "gift" | "hair";
}

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending: { label: "قيد المراجعة", bg: "bg-amber-500/10", text: "text-amber-400", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "مقبول", bg: "bg-emerald-500/10", text: "text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "مرفوض", bg: "bg-red-500/10", text: "text-red-400", icon: <XCircle className="w-3 h-3" /> },
  completed: { label: "مكتمل", bg: "bg-emerald-500/10", text: "text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
  done: { label: "تم", bg: "bg-emerald-500/10", text: "text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};

const serviceRoutes: Record<string, string> = {
  salary: "/salary",
  animated_photo: "/animated-photo",
  custom_gift: "/custom-gift",
  vip: "/request-vip",
  frame: "/frames",
  entry_gift: "/entry-request",
  gift: "/gift",
  change_id: "/change-id",
  hair: "/hairs",
};

const isSvga = (url: string) => url?.toLowerCase().endsWith(".svga");
const isVideo = (url: string) => {
  const l = url?.toLowerCase() || "";
  return l.endsWith(".mp4") || l.endsWith(".webm") || l.endsWith(".mov");
};

const ServicePreviousRequests: React.FC<ServicePreviousRequestsProps> = ({ userUuid, serviceType }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [svgaPreview, setSvgaPreview] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      let items: RequestItem[] = [];

      switch (serviceType) {
        case "vip": {
          const { data } = await supabase
            .from("vip_requests")
            .select("id, vip_level, created_at, request_month")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id, label: `VIP ${r.vip_level}`, detail: `شهر ${r.request_month}`,
            status: "done" as const, date: r.created_at,
          }));
          break;
        }
        case "animated_photo": {
          const { data } = await supabase
            .from("animated_photo_requests")
            .select("id, status, duration_label, created_at, admin_note, rejection_image_url, is_final_rejection, gif_url")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id, label: "صورة متحركة", detail: r.duration_label,
            status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
            date: r.created_at, adminNote: r.admin_note,
            rejectionImageUrl: r.rejection_image_url, isFinalRejection: r.is_final_rejection,
            fileUrl: r.gif_url,
          }));
          break;
        }
        case "salary": {
          const { data } = await supabase
            .from("salary_requests")
            .select("id, request_type, amount_usd, status, created_at, transaction_id, transfer_image_url, admin_note, rejection_image_url, is_final_rejection")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id,
            label: r.request_type === "monthly" ? "سحب شهري" : r.request_type === "instant" ? "سحب فوري" : "كود نجوم",
            detail: `$${r.amount_usd}`,
            refId: r.transaction_id ? String(r.transaction_id) : r.id?.slice(0, 8)?.toUpperCase(),
            status: r.status as any, date: r.created_at,
            transferImageUrl: r.transfer_image_url, adminNote: r.admin_note,
            rejectionImageUrl: r.rejection_image_url, isFinalRejection: r.is_final_rejection,
          }));
          break;
        }
        case "change_id": {
          const { data } = await supabase
            .from("id_changes")
            .select("id, new_id, level_milestone, created_at")
            .or(`user_uuid.eq.${userUuid},new_id.eq.${userUuid}`)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id, label: `تغيير إلى ${r.new_id}`, detail: `عند لفل ${r.level_milestone}`,
            status: "done" as const, date: r.created_at,
          }));
          break;
        }
        case "custom_gift": {
          const { data } = await supabase
            .from("custom_gifts")
            .select("id, title, status, created_at, admin_note, rejection_image_url, is_final_rejection, video_url")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id, label: r.title || "هدية مخصصة", status: r.status as any,
            date: r.created_at, adminNote: r.admin_note,
            rejectionImageUrl: r.rejection_image_url, isFinalRejection: r.is_final_rejection,
            fileUrl: r.video_url,
          }));
          break;
        }
        case "entry_gift": {
          const { data } = await supabase
            .from("entry_gift_claims")
            .select("id, claim_type, gift_usage, claim_month, created_at, status, admin_note, file_url, title, duration_days")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id, label: r.title || (r.claim_type === "self" ? "لنفسي" : "لصديق"),
            detail: r.claim_month,
            status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
            date: r.created_at, adminNote: r.admin_note,
            fileUrl: r.file_url, duration: r.duration_days,
          }));
          break;
        }
        case "frame": {
          const { data } = await supabase
            .from("frame_claims")
            .select("id, claim_type, claim_month, created_at, status, admin_note, file_url, title, duration_days")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id, label: r.title || (r.claim_type === "self" ? "لنفسي" : "لصديق"),
            detail: r.claim_month,
            status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
            date: r.created_at, adminNote: r.admin_note,
            fileUrl: r.file_url, duration: r.duration_days,
          }));
          break;
        }
        case "gift": {
          const { data } = await supabase
            .from("bd_requests_cache")
            .select("id, request_type, status, created_at, details, admin_note, rejection_image_url, is_final_rejection")
            .eq("user_uuid", userUuid)
            .eq("request_type", "gift")
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id, label: "طلب هدية",
            status: r.status === 1 ? "approved" : r.status === 2 ? "rejected" : "pending",
            date: r.created_at, adminNote: r.admin_note,
            rejectionImageUrl: r.rejection_image_url, isFinalRejection: r.is_final_rejection,
          }));
          break;
        }
        case "hair": {
          const { data } = await supabase
            .from("hair_selections")
            .select("id, hair_id, selection_week, status, created_at, admin_note, hairs(title, file_url, thumbnail_url)")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id, 
            label: r.hairs?.title || "شعرة",
            detail: `أسبوع ${r.selection_week}`,
            status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
            date: r.created_at, adminNote: r.admin_note,
            fileUrl: r.hairs?.file_url || null,
          }));
          break;
        }
      }

      setRequests(items);
      setFetched(true);
    } catch (err) {
      console.error("Error fetching previous requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!open) fetchRequests();
    setOpen(!open);
  };

  const canResubmit = serviceType !== "vip" && serviceType !== "change_id" && serviceType !== "entry_gift" && serviceType !== "frame" && serviceType !== "hair";

  const handlePreviewFile = (url: string) => {
    if (isSvga(url)) setSvgaPreview(url);
    else if (isVideo(url)) setVideoPreview(url);
    else setImagePreview(url);
  };

  return (
    <>
      <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
        <button onClick={handleToggle} className="w-full px-4 py-3 flex items-center justify-between" dir="rtl">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-bold text-foreground">طلباتي السابقة</span>
            {fetched && requests.length > 0 && (
              <span className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-md">{requests.length}</span>
            )}
          </div>
          <div className={`w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center transition-transform ${open ? "rotate-180" : ""}`}>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </button>

        {open && (
          <div className="px-3 pb-3 space-y-2">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">لا توجد طلبات سابقة</p>
            ) : (
              requests.map((req) => {
                const st = statusConfig[req.status || "done"] || statusConfig.done;
                const isApproved = req.status === "approved" || req.status === "completed" || req.status === "done";
                const isRejected = req.status === "rejected";
                const isPending = req.status === "pending";
                const isApprovedSalary = req.status === "approved" && req.transferImageUrl;

                return (
                  <div key={req.id} className="rounded-xl border border-border/20 overflow-hidden" dir="rtl">
                    {/* Status strip */}
                    <div className={`px-3 py-2 flex items-center justify-between ${st.bg}`}>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-[10px] font-bold ${st.text}`}>
                          {isRejected && req.isFinalRejection ? (
                            <><Ban className="w-3 h-3" /> مرفوض نهائياً</>
                          ) : (
                            <>{st.icon} {st.label}</>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDate(req.date)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-3 py-2.5 space-y-2 bg-card/30">
                      {/* Info row */}
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-foreground">{req.label}</p>
                        {req.detail && (
                          <span className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{req.detail}</span>
                        )}
                      </div>

                      {/* Meta info for approved */}
                      {isApproved && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {req.duration && (
                            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                              <Timer className="w-2.5 h-2.5" /> {req.duration} يوم
                            </span>
                          )}
                          {req.refId && (
                            <span className="text-[9px] font-mono text-primary/70">#{req.refId}</span>
                          )}
                          {req.adminName && (
                            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                              <User className="w-2.5 h-2.5" /> {req.adminName}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Pending - show ref if exists */}
                      {isPending && req.refId && (
                        <span className="text-[9px] font-mono text-primary/70">#{req.refId}</span>
                      )}

                      {/* View file button - for approved items with file */}
                      {isApproved && req.fileUrl && (
                        <button
                          onClick={() => handlePreviewFile(req.fileUrl!)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/5 border border-primary/15 text-primary text-[10px] font-bold hover:bg-primary/10 active:scale-[0.98] transition-all"
                        >
                          <Eye className="w-3 h-3" /> اضغط هنا للعرض
                        </button>
                      )}

                      {/* Approved salary - receipt */}
                      {isApprovedSalary && (
                        <button
                          onClick={() => setImagePreview(req.transferImageUrl!)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
                        >
                          <ImageIcon className="w-3 h-3" /> عرض إيصال التحويل
                        </button>
                      )}

                      {/* Rejected info */}
                      {isRejected && req.adminNote && (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 space-y-1.5">
                          <p className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> سبب الرفض:
                          </p>
                          <p className="text-[10px] text-red-300/80 leading-relaxed">{req.adminNote}</p>
                          {req.rejectionImageUrl && (
                            <button
                              onClick={() => setImagePreview(req.rejectionImageUrl!)}
                              className="flex items-center gap-1 text-[10px] text-red-400 underline underline-offset-2"
                            >
                              <ImageIcon className="w-3 h-3" /> عرض الصورة التوضيحية
                            </button>
                          )}
                        </div>
                      )}

                      {/* Resubmit for rejected (non-final) */}
                      {isRejected && !req.isFinalRejection && canResubmit && (
                        <button
                          onClick={() => navigate(serviceRoutes[serviceType] || "/")}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/5 border border-primary/15 text-primary text-[10px] font-bold hover:bg-primary/10 active:scale-[0.98] transition-all"
                        >
                          <RefreshCw className="w-3 h-3" /> تعديل وإعادة الإرسال
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Image preview dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-sm p-3 bg-background rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm text-center">عرض الصورة</DialogTitle>
          </DialogHeader>
          {imagePreview && (
            <img src={imagePreview} alt="صورة" className="w-full max-h-[70vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Video preview dialog */}
      <Dialog open={!!videoPreview} onOpenChange={() => setVideoPreview(null)}>
        <DialogContent className="max-w-sm p-3 bg-background rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm text-center">عرض الملف</DialogTitle>
          </DialogHeader>
          {videoPreview && (
            <video src={videoPreview} autoPlay loop playsInline controls className="w-full max-h-[70vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* SVGA preview dialog */}
      <Dialog open={!!svgaPreview} onOpenChange={() => setSvgaPreview(null)}>
        <DialogContent className="max-w-sm p-3 bg-background rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm text-center">عرض الملف</DialogTitle>
          </DialogHeader>
          {svgaPreview && (
            <div className="flex items-center justify-center py-4">
              <SvgaPlayer src={svgaPreview} width={250} height={250} className="w-[250px] h-[250px]" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServicePreviousRequests;
