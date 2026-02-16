import React, { useState } from "react";
import { ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, FileText, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RequestItem {
  id: string;
  label: string;
  detail?: string;
  refId?: string;
  status?: "pending" | "approved" | "rejected" | "completed" | "done";
  date: string;
  transferImageUrl?: string | null;
}

interface ServicePreviousRequestsProps {
  userUuid: string;
  serviceType: "vip" | "animated_photo" | "salary" | "change_id" | "custom_gift" | "entry_gift" | "frame" | "gift";
}

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "قيد المراجعة", color: "text-yellow-400", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "مقبول", color: "text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "مرفوض", color: "text-red-400", icon: <XCircle className="w-3 h-3" /> },
  completed: { label: "مكتمل", color: "text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
  done: { label: "تم", color: "text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};

const ServicePreviousRequests: React.FC<ServicePreviousRequestsProps> = ({ userUuid, serviceType }) => {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

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
            id: r.id,
            label: `VIP ${r.vip_level}`,
            detail: `شهر ${r.request_month}`,
            status: "done" as const,
            date: r.created_at,
          }));
          break;
        }
        case "animated_photo": {
          const { data } = await supabase
            .from("animated_photo_requests")
            .select("id, status, duration_label, created_at")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id,
            label: `صورة متحركة`,
            detail: r.duration_label,
            status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
            date: r.created_at,
          }));
          break;
        }
        case "salary": {
          const { data } = await supabase
            .from("salary_requests")
            .select("id, request_type, amount_usd, status, created_at, transaction_id, transfer_image_url")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id,
            label: r.request_type === "monthly" ? "سحب شهري" : r.request_type === "instant" ? "سحب فوري" : "كود نجوم",
            detail: `$${r.amount_usd}`,
            refId: r.transaction_id ? String(r.transaction_id) : r.id?.slice(0, 8)?.toUpperCase(),
            status: r.status as any,
            date: r.created_at,
            transferImageUrl: r.transfer_image_url,
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
            id: r.id,
            label: `تغيير إلى ${r.new_id}`,
            detail: `عند لفل ${r.level_milestone}`,
            status: "done" as const,
            date: r.created_at,
          }));
          break;
        }
        case "custom_gift": {
          const { data } = await supabase
            .from("custom_gifts")
            .select("id, title, status, created_at")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id,
            label: r.title || "هدية مخصصة",
            status: r.status as any,
            date: r.created_at,
          }));
          break;
        }
        case "entry_gift": {
          const { data } = await supabase
            .from("entry_gift_claims")
            .select("id, claim_type, gift_usage, claim_month, created_at")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id,
            label: r.claim_type === "self" ? "لنفسي" : "لصديق",
            detail: r.claim_month,
            status: "done" as const,
            date: r.created_at,
          }));
          break;
        }
        case "frame": {
          const { data } = await supabase
            .from("frame_claims")
            .select("id, claim_type, claim_month, created_at")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id,
            label: r.claim_type === "self" ? "لنفسي" : "لصديق",
            detail: r.claim_month,
            status: "done" as const,
            date: r.created_at,
          }));
          break;
        }
        case "gift": {
          // General gift requests from API cache
          const { data } = await supabase
            .from("bd_requests_cache")
            .select("id, request_type, status, created_at, details")
            .eq("user_uuid", userUuid)
            .eq("request_type", "gift")
            .order("created_at", { ascending: false })
            .limit(20);
          items = (data || []).map((r: any) => ({
            id: r.id,
            label: "طلب هدية",
            status: r.status === 1 ? "approved" : r.status === 2 ? "rejected" : "pending",
            date: r.created_at,
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

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full p-3 flex items-center justify-between"
        dir="rtl"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">طلباتي السابقة</span>
          {fetched && requests.length > 0 && (
            <span className="text-[10px] text-muted-foreground">({requests.length})</span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-3">لا توجد طلبات سابقة</p>
          ) : (
            requests.map((req) => {
              const st = statusMap[req.status || "done"] || statusMap.done;
              const isApprovedSalary = req.status === "approved" && req.transferImageUrl;
              return (
                <div
                  key={req.id}
                  className="bg-muted/20 rounded-lg px-2.5 py-2 space-y-2"
                  dir="rtl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-foreground truncate">{req.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-muted-foreground">{formatDate(req.date)}</span>
                        {req.detail && (
                          <span className="text-[9px] text-muted-foreground">• {req.detail}</span>
                        )}
                        {req.refId && (
                          <span className="text-[9px] font-mono text-primary/70">#{req.refId}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${isApprovedSalary ? "text-emerald-400" : st.color}`}>
                      {isApprovedSalary ? <CheckCircle className="w-3 h-3" /> : st.icon}
                      {isApprovedSalary ? "تم التحويل ✅" : st.label}
                    </span>
                  </div>
                  {isApprovedSalary && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> إيصال التحويل:
                      </p>
                      <img
                        src={req.transferImageUrl!}
                        alt="إيصال التحويل"
                        className="w-full max-h-48 object-contain rounded-lg border border-emerald-500/20 bg-black/20"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ServicePreviousRequests;
