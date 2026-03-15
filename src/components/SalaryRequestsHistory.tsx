import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle, ChevronLeft, Loader2, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatDateAr } from "@/utils/dateFormat";

const API = "https://galachat.site/project-z/api.php";

interface SalaryRequest {
  id: string;
  amount: number;
  status: string;
  bank: string;
  country: string;
  created_at: string;
  reference_id?: string;
  account_name?: string;
  account_number?: string;
  whatsapp?: string;
  admin_note?: string;
  transfer_image_url?: string;
  rejection_image_url?: string;
  request_type?: string;
  notes?: string;
}

interface Props {
  userUuid: string;
  onResubmit?: (req: SalaryRequest) => void;
  onWithdrawnCalculated?: (amount: number) => void;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    label: "⏳ قيد المراجعة",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  approved: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: "✅ تم التسليم",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    label: "❌ مرفوض",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
};

const SalaryRequestsHistory: React.FC<Props> = ({ userUuid, onResubmit }) => {
  const [requests, setRequests] = useState<SalaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<SalaryRequest | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const res = await fetch(`${API}?action=my_salary_requests&uuid=${userUuid}&month=${month}`);
        const data = await res.json();
        if (data.requests) setRequests(data.requests);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [userUuid]);

  if (loading) {
    return (
      <div className="glass-card p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="glass-card p-4 text-center">
        <p className="text-xs text-muted-foreground">لا توجد طلبات سحب سابقة هذا الشهر</p>
      </div>
    );
  }

  const getStatus = (s: string) => STATUS_CONFIG[s] || STATUS_CONFIG.pending;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-2 px-1">
          <FileText className="w-3.5 h-3.5 text-primary" /> طلباتي السابقة ({requests.length})
        </h3>

        {requests.map((req, i) => {
          const st = getStatus(req.status);
          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedReq(req)}
              className="glass-card p-4 space-y-2.5 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-muted-foreground">{req.id}</span>
                <span className="text-sm font-black text-foreground" dir="ltr">${req.amount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {req.bank} — {req.country}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatDateAr(req.created_at)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${st.bg}`}>
                  <span className={st.color}>{st.icon}</span>
                  <span className={`text-[11px] font-bold ${st.color}`}>{st.label}</span>
                </div>
                {req.reference_id && (
                  <span className="text-[10px] text-muted-foreground">المرجعي: {req.reference_id}</span>
                )}
              </div>

              <div className="flex items-center justify-center pt-1">
                <span className="text-[10px] text-primary flex items-center gap-1">
                  عرض التفاصيل <ChevronLeft className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {selectedReq && (
            <div className="space-y-4 pb-6">
              <SheetHeader>
                <SheetTitle className="text-center text-sm">تفاصيل الطلب</SheetTitle>
              </SheetHeader>

              {/* Status badge */}
              {(() => {
                const st = getStatus(selectedReq.status);
                return (
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${st.bg}`}>
                    <span className={st.color}>{st.icon}</span>
                    <span className={`text-sm font-bold ${st.color}`}>{st.label}</span>
                  </div>
                );
              })()}

              {/* Info rows */}
              <div className="space-y-2">
                {[
                  { label: "رقم الطلب", value: selectedReq.id },
                  { label: "المبلغ", value: `$${selectedReq.amount}` },
                  { label: "البنك", value: `${selectedReq.bank} — ${selectedReq.country}` },
                  { label: "المستلم", value: selectedReq.account_name },
                  { label: "رقم الحساب", value: selectedReq.account_number },
                  { label: "واتساب", value: selectedReq.whatsapp },
                  { label: "الرقم المرجعي", value: selectedReq.reference_id },
                  { label: "التاريخ", value: formatDateAr(selectedReq.created_at) },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="flex justify-between items-center bg-muted/20 rounded-xl p-3">
                    <span className="text-xs text-muted-foreground">{r.label}</span>
                    <span className="text-xs font-bold text-foreground" dir="auto">{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Rejection reason */}
              {selectedReq.status === "rejected" && selectedReq.admin_note && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                  <p className="text-[10px] text-red-400 font-bold">سبب الرفض:</p>
                  <p className="text-xs text-foreground">{selectedReq.admin_note}</p>
                </div>
              )}

              {/* Rejection image */}
              {selectedReq.status === "rejected" && selectedReq.rejection_image_url && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold">صورة توضيحية:</p>
                  <img src={selectedReq.rejection_image_url} alt="rejection" className="w-full rounded-xl border border-border/20" />
                </div>
              )}

              {/* Approved receipt */}
              {selectedReq.status === "approved" && selectedReq.transfer_image_url && (
                <div className="space-y-1">
                  <p className="text-[10px] text-emerald-400 font-bold">إيصال التحويل:</p>
                  <img src={selectedReq.transfer_image_url} alt="receipt" className="w-full rounded-xl border border-emerald-500/20" />
                </div>
              )}

              {/* Resubmit button for rejected */}
              {selectedReq.status === "rejected" && onResubmit && (
                <Button
                  onClick={() => {
                    onResubmit(selectedReq);
                    setSelectedReq(null);
                  }}
                  className="w-full gold-gradient text-primary-foreground font-bold h-12"
                >
                  ✏️ تعديل وإعادة الإرسال
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SalaryRequestsHistory;
