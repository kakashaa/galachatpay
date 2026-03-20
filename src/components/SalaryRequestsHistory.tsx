import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle, ChevronLeft, Loader2, FileText, Coins } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatDateAr } from "@/utils/dateFormat";
import { supabase } from "@/integrations/supabase/client";

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
  target_name?: string;
  target_uuid?: string;
  amount_coins?: number;
}

interface Props {
  userUuid: string;
  onResubmit?: (req: SalaryRequest) => void;
  onWithdrawnCalculated?: (amount: number) => void;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    label: "قيد المراجعة",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  approved: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: "تم التسليم",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    label: "مرفوض",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
};

const SalaryRequestsHistory: React.FC<Props> = ({ userUuid, onResubmit, onWithdrawnCalculated }) => {
  const [requests, setRequests] = useState<SalaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<SalaryRequest | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthStart = `${month}-01T00:00:00`;
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const monthEnd = nextMonth.toISOString();

        // Fetch from external API + local DB + user_transfers in parallel
        const [externalRes, localRes, transfersRes] = await Promise.all([
          fetch(`${API}?action=my_salary_requests&uuid=${userUuid}&month=${month}`).then(r => r.json()).catch(() => ({})),
          supabase
            .from("salary_requests")
            .select("*")
            .eq("user_uuid", userUuid)
            .gte("created_at", monthStart)
            .lt("created_at", monthEnd)
            .order("created_at", { ascending: false }),
          fetch(`${API}?action=user_transfers&uuid=${userUuid}`).then(r => r.json()).catch(() => ({})),
        ]);

        const externalRequests: SalaryRequest[] = externalRes.requests || [];

        // Map local DB records to SalaryRequest format
        const localData = (localRes.data || []) as any[];
        const externalIds = new Set(externalRequests.map(r => r.id));
        const externalRefs = new Set(externalRequests.map(r => r.reference_id).filter(Boolean));

        const localRequests: SalaryRequest[] = localData
          .filter(r => !externalIds.has(r.id) && !externalRefs.has(r.transfer_id))
          .map(r => ({
            id: r.id?.slice(0, 13) || r.id,
            amount: r.amount_usd || 0,
            status: r.status || "pending",
            bank: r.payment_method === "coins_charge"
              ? (r.request_type === "charge_other" ? "شحن لحساب آخر" : "شحن كوينزات")
              : (r.payment_method || ""),
            country: r.recipient_country || "",
            created_at: r.created_at,
            reference_id: r.transfer_id || r.transaction_id || undefined,
            account_name: r.recipient_name || undefined,
            account_number: r.payment_details || undefined,
            admin_note: r.admin_note || undefined,
            transfer_image_url: r.transfer_image_url || undefined,
            rejection_image_url: r.rejection_image_url || undefined,
            request_type: r.request_type || undefined,
            target_name: r.target_name || undefined,
            target_uuid: r.target_uuid || undefined,
            amount_coins: r.amount_coins || undefined,
          }));

        // Map used transfers from user_transfers API as completed history
        const usedTransfers: SalaryRequest[] = ((transfersRes.transfers || []) as any[])
          .filter((t: any) => t.is_used)
          .filter((t: any) => {
            const ref = String(t.reference_id);
            return !externalIds.has(ref) && !externalRefs.has(ref)
              && !localData.some((l: any) => l.transfer_id === ref || l.transaction_id === ref);
          })
          .map((t: any) => ({
            id: `#${t.reference_id}`,
            amount: t.amount_usd || 0,
            status: "approved",
            bank: "شحن كوينزات",
            country: "",
            created_at: t.time ? new Date(t.time).toISOString() : new Date().toISOString(),
            reference_id: String(t.reference_id),
            amount_coins: t.amount_coins || undefined,
            request_type: t.request_type || "charge_self",
            target_name: t.target_name || undefined,
            target_uuid: t.target_uuid || undefined,
          }));

        // Merge and sort by date
        const all = [...externalRequests, ...localRequests, ...usedTransfers].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setRequests(all);

        // Calculate already withdrawn (non-rejected)
        const withdrawn = all
          .filter(r => r.status !== "rejected")
          .reduce((sum, r) => sum + (r.amount || 0), 0);
        onWithdrawnCalculated?.(withdrawn);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
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

  const getStatus = (s: string) => {
    if (["approved", "completed", "done", "delivered"].includes(s)) return STATUS_CONFIG.approved;
    return STATUS_CONFIG[s] || STATUS_CONFIG.pending;
  };

  const isCoinsRequest = (req: SalaryRequest) =>
    req.request_type === "charge_self" || req.request_type === "charge_other";

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-2 px-1">
          <FileText className="w-3.5 h-3.5 text-primary" /> طلباتي السابقة ({requests.length})
        </h3>

        {requests.map((req, i) => {
          const st = getStatus(req.status);
          const coins = isCoinsRequest(req);
          return (
            <motion.div
              key={`${req.id}-${i}`}
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
                  {req.bank}{req.country ? ` — ${req.country}` : ""}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatDateAr(req.created_at)}</span>
              </div>

              {/* Show coins info for charge requests */}
              {coins && req.amount_coins && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <Coins className="w-3.5 h-3.5" />
                  <span className="font-bold">{req.amount_coins.toLocaleString()} كوينز</span>
                  {req.target_name && (
                    <span className="text-muted-foreground mr-1">→ {req.target_name}</span>
                  )}
                </div>
              )}

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
                  ...(isCoinsRequest(selectedReq) && selectedReq.amount_coins
                    ? [{ label: "الكوينز", value: `${selectedReq.amount_coins.toLocaleString()} كوينز` }]
                    : []),
                  { label: "البنك", value: `${selectedReq.bank}${selectedReq.country ? ` — ${selectedReq.country}` : ""}` },
                  { label: "المستلم", value: selectedReq.target_name || selectedReq.account_name },
                  ...(selectedReq.target_uuid
                    ? [{ label: "UUID المستلم", value: selectedReq.target_uuid }]
                    : []),
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
                  تعديل وإعادة الإرسال
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