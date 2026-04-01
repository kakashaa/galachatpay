import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle, FileText, Camera } from "lucide-react";
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
    color: "#e9c176",
    bg: "rgba(233,193,118,0.08)",
    dotColor: "#e9c176",
  },
  approved: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: "تم التسليم",
    color: "#4ae183",
    bg: "rgba(74,225,131,0.08)",
    dotColor: "#4ae183",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    label: "مرفوض",
    color: "#ffb4ab",
    bg: "rgba(255,180,171,0.08)",
    dotColor: "#ffb4ab",
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
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Manrope:wght@400;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Cairo',sans-serif;background:#10141a;color:#dfe2eb;padding:24px;display:flex;justify-content:center;align-items:center;min-height:100vh}
        .card{background:linear-gradient(145deg,#0f1a2e,#1c2028);border-radius:24px;padding:28px;max-width:360px;width:100%;margin:auto;box-shadow:0 8px 40px rgba(0,0,0,0.5)}
        .logo{font-size:22px;font-weight:900;color:#e9c176;margin-bottom:8px;text-align:center}
        .subtitle{font-size:11px;color:#78839c;text-align:center;margin-bottom:20px;letter-spacing:0.1em;text-transform:uppercase}
        .amount{font-size:36px;font-weight:800;color:#e9c176;margin:16px 0;text-align:center;letter-spacing:-1px;font-family:'Manrope',sans-serif}
        .divider{height:1px;background:linear-gradient(90deg,transparent,rgba(187,198,226,0.1),transparent);margin:16px 0}
        .row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;font-size:13px}
        .label{color:#78839c;font-weight:600}
        .value{color:#dfe2eb;font-weight:700}
        .status{display:inline-block;padding:4px 14px;border-radius:12px;font-size:11px;font-weight:800}
        .delivered,.approved,.completed,.done{background:rgba(74,225,131,0.12);color:#4ae183}
        .pending{background:rgba(233,193,118,0.12);color:#e9c176}
        .rejected{background:rgba(255,180,171,0.12);color:#ffb4ab}
        .footer{color:#78839c;font-size:9px;margin-top:20px;text-align:center;letter-spacing:0.5px}
        .save-hint{color:#78839c;font-size:10px;text-align:center;margin-top:12px}
      </style></head>
      <body>
      <div class="card">
        <div class="logo">غلا شات</div>
        <div class="subtitle">إيصال سحب الراتب</div>
        <div class="amount">$${(request.amount || 0).toFixed(2)}</div>
        <div class="divider"></div>
        <div class="row"><span class="label">الحالة</span><span class="value"><span class="status ${statusClass}">${statusLabel}</span></span></div>
        <div class="row"><span class="label">رقم الطلب</span><span class="value">${request.id || '-'}</span></div>
        <div class="row"><span class="label">التاريخ</span><span class="value">${new Date(request.created_at).toLocaleDateString('ar-EG')}</span></div>
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
    const label = d.toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
    months.push({ value, label });
  }
  return months;
};

const getCurrentMonth = () => {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // On first 3 days of month, default to previous month (users still checking old requests)
  if (now.getDate() <= 3 && now.getMonth() > 0) {
    return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  }
  return current;
};

type FilterTab = "all" | "delivered" | "pending" | "rejected" | "coins";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "delivered", label: "تم التسليم" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "rejected", label: "مرفوض" },
  { key: "coins", label: "شحنات" },
];

const SalaryRequestsHistory: React.FC<Props> = ({ userUuid, onResubmit, onWithdrawnCalculated }) => {
  const [requests, setRequests] = useState<SalaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<SalaryRequest | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
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
            .order("created_at", { ascending: false })
            .then(res => res).catch(() => ({ data: [], error: null })),
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

        // Get status + images from Supabase for all transfers
        const allTransferRefs = ((transfersRes.transfers || []) as any[]).map((t: any) => String(t.reference_id)).filter(Boolean);
        const { data: supaTransfers } = allTransferRefs.length > 0
          ? await supabase.from("salary_requests").select("transfer_id, status, transfer_image_url, rejection_image_url, admin_note, request_type, amount_usd").in("transfer_id", allTransferRefs).then(r => r).catch(() => ({ data: [] }))
          : { data: [] };
        const supaMap = new Map<string, any>();
        (supaTransfers || []).forEach((r: any) => { if (r.transfer_id) supaMap.set(String(r.transfer_id), r); });

        const usedTransfers: SalaryRequest[] = ((transfersRes.transfers || []) as any[])
          .filter((t: any) => {
            const ref = String(t.reference_id);
            // Include if: has Supabase record OR is_used
            return (supaMap.has(ref) || t.is_used) && !externalIds.has(ref) && !externalRefs.has(ref)
              && !localData.some((l: any) => l.transfer_id === ref || l.transaction_id === ref);
          })
          .map((t: any) => {
            const ref = String(t.reference_id);
            const supa = supaMap.get(ref);
            const status = supa?.status || (t.is_used ? "approved" : "pending");
            return {
              id: `#${t.reference_id}`,
              amount: supa?.amount_usd || t.amount_usd || 0,
              status,
              bank: (supa?.request_type === "cash" || t.request_type === "cash") ? "سحب نقدي" : "شحن كوينزات",
              country: "",
              created_at: t.time ? new Date(t.time).toISOString() : new Date().toISOString(),
              reference_id: ref,
              amount_coins: t.amount_coins || undefined,
              request_type: supa?.request_type || t.request_type || "charge_self",
              target_name: t.target_name || undefined,
              target_uuid: t.target_uuid || undefined,
              transfer_image_url: supa?.transfer_image_url || undefined,
              rejection_image_url: supa?.rejection_image_url || undefined,
              admin_note: supa?.admin_note || undefined,
            };
          });

        const all = [...externalRequests, ...localRequests, ...usedTransfers].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setRequests(all);

        const withdrawn = all
          .reduce((sum, r) => sum + (r.amount || 0), 0);
        onWithdrawnCalculated?.(withdrawn);
      } catch (err) {
        console.error("SalaryRequestsHistory fetch error:", err);
      } finally {
        setLoading(false);
      }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-4 w-4 rounded" style={{ background: "rgba(15,26,46,0.6)" }} />
          <div className="h-4 w-32 rounded" style={{ background: "rgba(15,26,46,0.6)" }} />
        </div>
        {[1, 2].map(n => (
          <div key={n} className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(15,26,46,0.4)" }}>
            <div className="flex justify-between">
              <div className="h-5 w-20 rounded-full animate-pulse" style={{ background: "rgba(187,198,226,0.06)" }} />
              <div className="h-5 w-16 rounded animate-pulse" style={{ background: "rgba(187,198,226,0.06)" }} />
            </div>
            <div className="h-3 w-full rounded animate-pulse" style={{ background: "rgba(187,198,226,0.04)" }} />
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold" style={{ color: "#dfe2eb" }}>العمليات الأخيرة</h3>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="rounded-xl text-[10px] px-2.5 py-1.5 font-bold"
            style={{ background: "rgba(15,26,46,0.6)", color: "#dfe2eb", border: "none", outline: "none" }}>
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(15,26,46,0.4)" }}>
          <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(120,131,156,0.3)" }} />
          <p className="text-xs" style={{ color: "#78839c" }}>لا توجد طلبات في هذا الشهر — جرب اختيار شهر آخر</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* Header: العمليات الأخيرة */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold" style={{ color: "#dfe2eb" }}>العمليات الأخيرة</h3>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="rounded-xl text-[10px] px-2.5 py-1.5 font-bold"
            style={{ background: "rgba(15,26,46,0.6)", color: "#dfe2eb", border: "none", outline: "none" }}
          >
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className="shrink-0 px-4 py-2 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap"
                style={{
                  background: isActive ? "rgba(233,193,118,0.12)" : "#181c22",
                  color: isActive ? "#e9c176" : "#78839c",
                  border: isActive ? "1px solid rgba(233,193,118,0.25)" : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Transaction cards */}
        <div className="space-y-3">
          {requests.filter(req => {
            if (activeFilter === "all") return true;
            if (activeFilter === "delivered") return ["approved", "completed", "done", "delivered"].includes(req.status);
            if (activeFilter === "pending") return !["approved", "completed", "done", "delivered", "rejected"].includes(req.status);
            if (activeFilter === "rejected") return req.status === "rejected";
            if (activeFilter === "coins") return isCoinsRequest(req);
            return true;
          }).map((req, i) => {
            const st = getStatus(req.status);
            const dateStr = new Date(req.created_at).toLocaleDateString("ar-EG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
            const bankLabel = getRequestTypeLabel(req.request_type) || req.bank || "";
            const isApproved = req.status === "approved" || req.status === "delivered";
            const isRejected = req.status === "rejected";
            const isPending = !isApproved && !isRejected;
            const hasReceipt = isApproved && req.transfer_image_url;

            return (
              <motion.button
                key={`${req.id}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedReq(req)}
                className="w-full rounded-2xl p-4 text-right transition-all active:scale-[0.98] relative overflow-hidden flex items-center gap-3"
                style={{
                  background: "#181c22",
                  borderRight: isApproved ? "3px solid #4ae183" : isPending ? "3px solid #e9c176" : "3px solid #ffb4ab",
                }}
              >
                {/* Icon circle (right side in RTL) */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: st.bg }}>
                  <span style={{ color: st.color }}>{st.icon}</span>
                </div>

                {/* Center: title + date */}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs font-bold truncate" style={{ color: "#dfe2eb" }}>{bankLabel || "عملية"}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#78839c" }}>{dateStr}</p>
                  {req.reference_id && <p className="text-[9px] font-mono mt-0.5" style={{ color: "rgba(120,131,156,0.6)" }}>#{req.reference_id}</p>}
                  {isPending && (
                    <p className="text-[9px] mt-1 animate-pulse" style={{ color: "rgba(233,193,118,0.7)" }}>جاري المراجعة...</p>
                  )}
                  {isRejected && req.admin_note && (
                    <p className="text-[9px] mt-1 truncate" style={{ color: "#ffb4ab" }}>السبب: {req.admin_note}</p>
                  )}
                </div>

                {/* Left: amount + status */}
                <div className="text-left shrink-0">
                  <p className="text-sm font-extrabold tabular-nums" dir="ltr"
                    style={{ color: isApproved ? "#e9c176" : "#dfe2eb", fontFamily: "'Manrope', sans-serif" }}>
                    ${req.amount.toFixed(2)}
                  </p>
                  <p className="text-[9px] font-bold" style={{ color: st.color }}>{st.label}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto"
          style={{ background: "#10141a", border: "none" }}>
          {selectedReq && (
            <div className="space-y-4 pb-6">
              <SheetHeader>
                <SheetTitle className="text-center text-sm" style={{ color: "#dfe2eb" }}>تفاصيل الطلب</SheetTitle>
              </SheetHeader>

              {(() => {
                const st = getStatus(selectedReq.status);
                return (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-2xl"
                    style={{ background: st.bg }}>
                    <span style={{ color: st.color }}>{st.icon}</span>
                    <span className="text-sm font-bold" style={{ color: st.color }}>{st.label}</span>
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
                  <div key={r.label} className="flex justify-between items-center rounded-2xl p-3"
                    style={{ background: "rgba(15,26,46,0.6)" }}>
                    <span className="text-xs" style={{ color: "#78839c" }}>{r.label}</span>
                    <span className="text-xs font-bold" dir="auto" style={{ color: "#dfe2eb" }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {selectedReq.status === "rejected" && selectedReq.admin_note && (
                <div className="p-3 rounded-2xl space-y-1" style={{ background: "rgba(255,180,171,0.06)" }}>
                  <p className="text-[10px] font-bold" style={{ color: "#ffb4ab" }}>سبب الرفض:</p>
                  <p className="text-xs" style={{ color: "#dfe2eb" }}>{selectedReq.admin_note}</p>
                </div>
              )}

              {selectedReq.status === "rejected" && !selectedReq.is_final_rejection && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams({
                      edit: selectedReq.id,
                      transfer_id: selectedReq.transfer_id || "",
                      amount: String(selectedReq.amount_usd || ""),
                    });
                    window.location.href = `/salary/cash?${params.toString()}`;
                  }}
                  className="w-full py-2.5 rounded-2xl text-xs font-bold transition-colors"
                  style={{ background: "rgba(233,193,118,0.1)", color: "#e9c176" }}
                >
                  تعديل وإعادة الطلب
                </button>
              )}

              {selectedReq.status === "rejected" && selectedReq.is_final_rejection && (
                <div className="p-2.5 rounded-2xl text-center" style={{ background: "rgba(255,180,171,0.04)" }}>
                  <p className="text-[10px]" style={{ color: "#ffb4ab" }}>رفض نهائي — لا يمكن إعادة الطلب</p>
                </div>
              )}

              {selectedReq.status === "rejected" && selectedReq.rejection_image_url && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold" style={{ color: "#ffb4ab" }}>صورة توضيحية:</p>
                  <img src={selectedReq.rejection_image_url} alt="rejection" className="w-full max-h-[400px] object-contain rounded-xl border border-red-500/20 cursor-pointer" onClick={() => window.open(selectedReq.rejection_image_url || "", "_blank")} />
                </div>
              )}

              {["approved","delivered","completed","done"].includes(selectedReq.status) && selectedReq.transfer_image_url && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold" style={{ color: "#4ae183" }}>إيصال التحويل:</p>
                  <img src={selectedReq.transfer_image_url} alt="receipt" className="w-full max-h-[400px] object-contain rounded-xl border border-emerald-500/20 cursor-pointer" onClick={() => window.open(selectedReq.transfer_image_url || "", "_blank")} />
                </div>
              )}

              {/* Save as image button in detail sheet */}
              <Button
                onClick={() => handleSaveReceipt(selectedReq)}
                variant="outline"
                className="w-full h-11 text-sm font-bold gap-2 rounded-2xl"
                style={{ background: "rgba(187,198,226,0.06)", borderColor: "rgba(187,198,226,0.1)", color: "#bbc6e2" }}
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
                  className="w-full font-bold h-12 rounded-2xl"
                  style={{ background: "linear-gradient(135deg, #e9c176, #d4a853)", color: "#10141a" }}
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
