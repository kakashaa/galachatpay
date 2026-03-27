import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle, ChevronLeft, Loader2, FileText, Coins, Camera } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatDateAr } from "@/utils/dateFormat";
import { supabase } from "@/integrations/supabase/client";
import { galaApi } from "@/services/galaApi";

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
  is_final_rejection?: boolean;
  transfer_id?: string;
  amount_usd?: number;
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

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string; dotColor: string }> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    label: "قيد المراجعة",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    dotColor: "bg-amber-400",
  },
  approved: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: "تم التسليم",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    dotColor: "bg-emerald-400",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    label: "مرفوض",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    dotColor: "bg-red-400",
  },
};

const getStatus = (s: string) => {
  if (["approved", "completed", "done", "delivered"].includes(s)) return STATUS_CONFIG.approved;
  return STATUS_CONFIG[s] || STATUS_CONFIG.pending;
};

const isCoinsRequest = (req: SalaryRequest) =>
  req.request_type === "charge_self" || req.request_type === "charge_other"
  || req.request_type === "agency_coins" || req.request_type === "agency_transfer";

const getRequestTypeLabel = (type?: string): string => {
  switch (type) {
    case "agency_cash": return "سحب نقدي (وكالة)";
    case "agency_coins": return "شحن كوينز (وكالة)";
    case "agency_transfer": return "تحويل لمستخدم (وكالة)";
    case "charge_self": return "شحن لنفسي";
    case "charge_other": return "شحن لمستخدم آخر";
    case "cash": return "سحب نقدي";
    case "monthly": return "راتب شهري";
    case "instant": return "سحب فوري";
    case "star_code": return "كود نجوم";
    default: return "";
  }
};

const handleSaveReceipt = (request: SalaryRequest) => {
  const st = getStatus(request.status);
  const statusClass = ["approved", "completed", "done", "delivered"].includes(request.status) ? "delivered" : request.status;
  const statusLabel = st.label;
  const receiptWindow = window.open('', '_blank', 'width=420,height=650');
  if (receiptWindow) {
    receiptWindow.document.write(`
      <html dir="rtl">
      <head><title>إيصال سحب الراتب</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Cairo',sans-serif;background:#0a0a0f;color:#fff;padding:24px;display:flex;justify-content:center;align-items:center;min-height:100vh}
        .card{background:linear-gradient(145deg,#1a1a2e,#16162a);border:1px solid #2a2a4a;border-radius:20px;padding:28px;max-width:360px;width:100%;margin:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
        .logo{font-size:22px;font-weight:900;color:#e50914;margin-bottom:8px;text-align:center}
        .subtitle{font-size:11px;color:#666;text-align:center;margin-bottom:20px}
        .amount{font-size:36px;font-weight:900;color:#10b981;margin:16px 0;text-align:center;letter-spacing:-1px}
        .divider{height:1px;background:linear-gradient(90deg,transparent,#333,transparent);margin:16px 0}
        .row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #1a1a2e;font-size:13px}
        .row:last-child{border-bottom:none}
        .label{color:#666;font-weight:600}
        .value{color:#eee;font-weight:700}
        .status{display:inline-block;padding:4px 14px;border-radius:10px;font-size:11px;font-weight:800}
        .delivered,.approved,.completed,.done{background:rgba(16,185,129,0.15);color:#10b981}
        .pending{background:rgba(245,158,11,0.15);color:#f59e0b}
        .rejected{background:rgba(239,68,68,0.15);color:#ef4444}
        .footer{color:#444;font-size:9px;margin-top:20px;text-align:center;letter-spacing:0.5px}
        .save-hint{color:#555;font-size:10px;text-align:center;margin-top:12px}
      </style></head>
      <body>
      <div class="card">
        <div class="logo">غلا شات</div>
        <div class="subtitle">إيصال سحب الراتب</div>
        <div class="amount">$${(request.amount || 0).toFixed(2)}</div>
        <div class="divider"></div>
        <div class="row"><span class="label">الحالة</span><span class="value"><span class="status ${statusClass}">${statusLabel}</span></span></div>
        <div class="row"><span class="label">رقم الطلب</span><span class="value">${request.id || '-'}</span></div>
        <div class="row"><span class="label">التاريخ</span><span class="value">${new Date(request.created_at).toLocaleDateString('ar-SA')}</span></div>
        <div class="row"><span class="label">نوع الطلب</span><span class="value">${getRequestTypeLabel(request.request_type) || request.bank || '-'}</span></div>
        ${request.reference_id ? `<div class="row"><span class="label">المرجعي</span><span class="value">${request.reference_id}</span></div>` : ''}
        ${request.account_name ? `<div class="row"><span class="label">المستلم</span><span class="value">${request.account_name}</span></div>` : ''}
        ${request.account_number ? `<div class="row"><span class="label">رقم الحساب</span><span class="value">${request.account_number}</span></div>` : ''}
        ${request.amount_coins ? `<div class="row"><span class="label">الكوينز</span><span class="value">${request.amount_coins.toLocaleString()}</span></div>` : ''}
        ${request.admin_note ? `<div class="row"><span class="label">ملاحظة</span><span class="value">${request.admin_note}</span></div>` : ''}
        <div class="divider"></div>
        <div class="footer">© ${new Date().getFullYear()} غلا شات — GhalaChat Pay</div>
        <div class="save-hint">📸 التقط صورة للشاشة لحفظ الإيصال</div>
      </div>
      </body></html>
    `);
    receiptWindow.document.close();
  }
};

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

const SalaryRequestsHistory: React.FC<Props> = ({ userUuid, onResubmit, onWithdrawnCalculated }) => {
  const [requests, setRequests] = useState<SalaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<SalaryRequest | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const monthOptions = getMonthOptions();

  useEffect(() => {
    fetchAll();
  }, [userUuid, selectedMonth]);

  const fetchAll = async () => {
      setLoading(true);
      try {
        const [year, monthNum] = selectedMonth.split("-").map(Number);
        const month = selectedMonth;
        const monthStart = `${month}-01T00:00:00`;
        const nextMonth = new Date(year, monthNum, 1);
        const monthEnd = nextMonth.toISOString();

        const [externalRes, localRes, transfersRes] = await Promise.all([
          galaApi.mySalaryRequests(userUuid, month).catch(() => ({})),
          supabase
            .from("salary_requests")
            .select("*")
            .eq("user_uuid", userUuid)
            .gte("created_at", monthStart)
            .lt("created_at", monthEnd)
            .order("created_at", { ascending: false }),
          galaApi.userTransfers(userUuid).catch(() => ({})),
        ]);

        const externalRequests: SalaryRequest[] = externalRes.requests || [];
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
            transfer_image_url: r.receipt_url || r.transfer_image_url || undefined,
            rejection_image_url: r.rejection_image_url || undefined,
            request_type: r.request_type || undefined,
            target_name: r.target_name || undefined,
            target_uuid: r.target_uuid || undefined,
            amount_coins: r.amount_coins || undefined,
          }));

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

        const all = [...externalRequests, ...localRequests, ...usedTransfers].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setRequests(all);

        const withdrawn = all
          // Show ALL requests including rejected
          .reduce((sum, r) => sum + (r.amount || 0), 0);
        onWithdrawnCalculated?.(withdrawn);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </div>
        {[1, 2].map(n => (
          <div key={n} className="rounded-2xl border border-border/10 bg-card/30 p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
              <div className="h-5 w-16 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-border/10 bg-card/20 p-6 text-center">
        <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">لا توجد طلبات سحب سابقة هذا الشهر</p>
      </div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        {/* Header with month selector */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> طلباتي
            <span className="text-[10px] text-muted-foreground font-normal">({requests.length})</span>
          </h3>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-muted/20 border border-border/20 rounded-lg text-[10px] px-2 py-1 text-foreground font-bold"
          >
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Compact one-line per request */}
        <div className="space-y-1">
          {requests.map((req, i) => {
            const st = getStatus(req.status);
            const dateStr = new Date(req.created_at).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit" });
            const bankLabel = getRequestTypeLabel(req.request_type) || req.bank || "";
            const shortBank = bankLabel.length > 15 ? bankLabel.slice(0, 15) + "…" : bankLabel;
            return (
              <motion.button
                key={`${req.id}-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setSelectedReq(req)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border/10 bg-card/20 active:bg-card/40 transition-all text-right"
              >
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${st.dotColor}`} />
                
                {/* Amount */}
                <span className="text-xs font-black text-foreground tabular-nums min-w-[50px]" dir="ltr">
                  ${req.amount.toFixed(0)}
                </span>

                {/* Bank/type */}
                <span className="text-[10px] text-muted-foreground truncate flex-1">
                  {shortBank}
                </span>

                {/* Date */}
                <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
                  {dateStr}
                </span>

                {/* Status label */}
                <span className={`text-[10px] font-bold shrink-0 ${st.color}`}>
                  {st.label === "تم التسليم" ? "✓" : st.label === "مرفوض" ? "✗" : "⏳"}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {selectedReq && (
            <div className="space-y-4 pb-6">
              <SheetHeader>
                <SheetTitle className="text-center text-sm">تفاصيل الطلب</SheetTitle>
              </SheetHeader>

              {(() => {
                const st = getStatus(selectedReq.status);
                return (
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${st.bg}`}>
                    <span className={st.color}>{st.icon}</span>
                    <span className={`text-sm font-bold ${st.color}`}>{st.label}</span>
                  </div>
                );
              })()}

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

              {selectedReq.status === "rejected" && selectedReq.admin_note && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                  <p className="text-[10px] text-red-400 font-bold">سبب الرفض:</p>
                  <p className="text-xs text-foreground">{selectedReq.admin_note}</p>
                </div>
              )}

              {selectedReq.status === "rejected" && !selectedReq.is_final_rejection && (
                <button
                  onClick={() => {
                    // Navigate to salary withdraw with pre-filled data for editing
                    const params = new URLSearchParams({
                      edit: selectedReq.id,
                      transfer_id: selectedReq.transfer_id || "",
                      amount: String(selectedReq.amount_usd || ""),
                    });
                    window.location.href = `/salary/cash?${params.toString()}`;
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition-colors"
                >
                  تعديل وإعادة الطلب
                </button>
              )}

              {selectedReq.status === "rejected" && selectedReq.is_final_rejection && (
                <div className="p-2 bg-red-500/5 border border-red-500/10 rounded-xl text-center">
                  <p className="text-[10px] text-red-400">رفض نهائي — لا يمكن إعادة الطلب</p>
                </div>
              )}

              {selectedReq.status === "rejected" && selectedReq.rejection_image_url && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold">صورة توضيحية:</p>
                  <img src={selectedReq.rejection_image_url} alt="rejection" className="w-full rounded-xl border border-border/20" />
                </div>
              )}

              {selectedReq.status === "approved" && selectedReq.transfer_image_url && (
                <div className="space-y-1">
                  <p className="text-[10px] text-emerald-400 font-bold">إيصال التحويل:</p>
                  <img src={selectedReq.transfer_image_url} alt="receipt" className="w-full rounded-xl border border-emerald-500/20" />
                </div>
              )}

              {/* Save as image button in detail sheet */}
              <Button
                onClick={() => handleSaveReceipt(selectedReq)}
                variant="outline"
                className="w-full h-11 text-sm font-bold gap-2"
              >
                <Camera className="w-4 h-4" />
                حفظ كصورة
              </Button>

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
