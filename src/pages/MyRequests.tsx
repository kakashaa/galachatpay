import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Wallet, Zap, Globe, CreditCard, User, Image as ImageIcon, Sparkles, Frame, RefreshCw, Headset,
  ArrowUpRight, Hash, Link2,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const EXT_API = "https://galachat.site/project-z/api.php";

interface SalaryRequest {
  id: string;
  request_type: string;
  amount_usd: number;
  amount_coins: number | null;
  recipient_name: string;
  recipient_country: string;
  payment_method: string;
  payment_details: string;
  status: string;
  admin_note: string | null;
  transfer_image_url: string | null;
  created_at: string;
  transaction_id?: string | null;
}

interface ClaimRecord {
  id: string;
  user_uuid: string;
  claim_type: string;
  gift_usage?: string;
  friend_uuid: string | null;
  claim_month: string;
  charger_level_at_claim: number;
  created_at: string;
  type: "entry" | "frame";
}

interface ApiRequest {
  id: string;
  request_type: string;
  status: string;
  details: any;
  created_at: string;
  admin_note?: string;
}

interface Transfer {
  reference_id: string;
  amount_usd: number;
  time: string;
  is_used: boolean;
  selectable: boolean;
}

interface ExtSalaryRequest {
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
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  pending: { label: "قيد المراجعة", color: "text-yellow-400", icon: <Clock className="w-4 h-4" />, bg: "bg-yellow-500/10 border-yellow-500/20" },
  approved: { label: "تم التسليم", color: "text-emerald-400", icon: <CheckCircle className="w-4 h-4" />, bg: "bg-emerald-500/10 border-emerald-500/20" },
  rejected: { label: "مرفوض", color: "text-red-400", icon: <XCircle className="w-4 h-4" />, bg: "bg-red-500/10 border-red-500/20" },
  completed: { label: "مكتمل", color: "text-emerald-400", icon: <CheckCircle className="w-4 h-4" />, bg: "bg-emerald-500/10 border-emerald-500/20" },
};

const requestTypeLabels: Record<string, string> = {
  gift: "طلب هدية",
  entry_effect: "دخولية",
  animated_photo: "صورة متحركة",
  support: "دعم سريع",
  bd_verify: "works",
  frame: "إطار",
};

const MyRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<SalaryRequest[]>([]);
  const [entryClaims, setEntryClaims] = useState<ClaimRecord[]>([]);
  const [frameClaims, setFrameClaims] = useState<ClaimRecord[]>([]);
  const [apiRequests, setApiRequests] = useState<ApiRequest[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [extSalaryRequests, setExtSalaryRequests] = useState<ExtSalaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"salary" | "claims" | "general">("salary");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    fetchAll();
  }, [isAuthenticated]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);

    // Parallel: Supabase + external API
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [salaryRes, entryRes, frameRes, transfersRes, extRequestsRes] = await Promise.all([
      supabase.from("salary_requests").select("*").eq("user_uuid", user.uuid).order("created_at", { ascending: false }),
      supabase.from("entry_gift_claims").select("*").eq("user_uuid", user.uuid).order("created_at", { ascending: false }),
      supabase.from("frame_claims").select("*").eq("user_uuid", user.uuid).order("created_at", { ascending: false }),
      fetch(`${EXT_API}?action=user_transfers&uuid=${user.uuid}`).then(r => r.json()).catch(() => ({ transfers: [] })),
      fetch(`${EXT_API}?action=my_salary_requests&uuid=${user.uuid}&month=${month}`).then(r => r.json()).catch(() => ({ requests: [] })),
    ]);

    if (salaryRes.data) setRequests(salaryRes.data as SalaryRequest[]);
    if (entryRes.data) setEntryClaims((entryRes.data as any[]).map(c => ({ ...c, type: "entry" as const })));
    if (frameRes.data) setFrameClaims((frameRes.data as any[]).map(c => ({ ...c, type: "frame" as const })));
    if (transfersRes?.transfers) setTransfers(transfersRes.transfers);
    if (extRequestsRes?.requests) setExtSalaryRequests(extRequestsRes.requests);

    // Fetch general requests from API
    try {
      const { data, error } = await supabase.functions.invoke(
        `gala-actions?action=list-requests&user_uuid=${encodeURIComponent(user.uuid)}`
      );
      if (!error && data && Array.isArray(data.data)) {
        setApiRequests(data.data);
      } else if (!error && data && Array.isArray(data)) {
        setApiRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch API requests:", err);
    }

    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Link transfers to salary requests by reference_id
  const getTransferStatus = (transfer: Transfer) => {
    const linkedReq = extSalaryRequests.find(r => r.reference_id === transfer.reference_id);
    if (linkedReq) {
      if (linkedReq.status === "rejected") {
        return { status: "rejected" as const, label: `الطلب مرفوض`, reqId: linkedReq.id };
      }
      return { status: "linked" as const, label: `مرتبطة بطلب ${linkedReq.id}`, reqId: linkedReq.id };
    }
    if (transfer.is_used) {
      return { status: "used" as const, label: "مستخدمة", reqId: null };
    }
    return { status: "waiting" as const, label: "بانتظار الربط — اسحب راتبك", reqId: null };
  };

  const allClaims = [...entryClaims, ...frameClaims].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <MobileLayout showHeader headerTitle="طلباتي" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 css-fade-up">
          <button
            onClick={() => setActiveTab("salary")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${activeTab === "salary" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}
          >
            <Wallet className="w-4 h-4 mx-auto mb-0.5" />
            السحوبات ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab("claims")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${activeTab === "claims" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}
          >
            <Sparkles className="w-4 h-4 mx-auto mb-0.5" />
            الدخوليات ({allClaims.length})
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${activeTab === "general" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}
          >
            <Headset className="w-4 h-4 mx-auto mb-0.5" />
            الطلبات ({apiRequests.length})
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Salary Tab */}
        {!loading && activeTab === "salary" && (
          <>
            <div className="grid grid-cols-3 gap-3 css-fade-up">
              <div className="glass-card p-3 text-center">
                <p className="text-lg font-bold text-foreground">{requests.length}</p>
                <p className="text-[10px] text-muted-foreground">إجمالي</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-lg font-bold text-yellow-400">{requests.filter((r) => r.status === "pending").length}</p>
                <p className="text-[10px] text-muted-foreground">قيد المراجعة</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">{requests.filter((r) => r.status === "approved").length}</p>
                <p className="text-[10px] text-muted-foreground">تم التحويل</p>
              </div>
            </div>

            {/* ━━━ Transfers Section ━━━ */}
            {transfers.length > 0 && (
              <div className="space-y-2.5 css-fade-up">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2 px-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-primary" /> حوالات الراتب ({transfers.length})
                </h3>
                {transfers.map((t) => {
                  const tStatus = getTransferStatus(t);
                  const statusColors = {
                    linked: { dot: "🟢", border: "border-emerald-500/20", text: "text-emerald-400" },
                    waiting: { dot: "🟡", border: "border-amber-500/20", text: "text-amber-400" },
                    rejected: { dot: "🔴", border: "border-red-500/20", text: "text-red-400" },
                    used: { dot: "⚪", border: "border-muted/20", text: "text-muted-foreground" },
                  };
                  const sc = statusColors[tStatus.status];
                  return (
                    <div key={t.reference_id} className={`glass-card p-3.5 rounded-xl border ${sc.border} space-y-2`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{sc.dot}</span>
                          <span className="text-xs font-mono font-bold text-foreground">حوالة #{t.reference_id}</span>
                        </div>
                        <span className="text-sm font-black text-foreground" dir="ltr">${t.amount_usd.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" /> UUID 10000
                        </span>
                        <span className="text-[10px] text-muted-foreground">{t.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {tStatus.status === "linked" && <Link2 className="w-3 h-3 text-emerald-400" />}
                        {tStatus.status === "rejected" && <XCircle className="w-3 h-3 text-red-400" />}
                        {tStatus.status === "waiting" && <Clock className="w-3 h-3 text-amber-400" />}
                        <span className={`text-[11px] font-bold ${sc.text}`}>{tStatus.label}</span>
                      </div>
                      {tStatus.status === "waiting" && (
                        <button onClick={() => navigate("/salary")}
                          className="w-full text-[10px] text-primary font-bold py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                          اسحب راتبك الآن →
                        </button>
                      )}
                      {tStatus.status === "rejected" && (
                        <button onClick={() => navigate("/salary")}
                          className="w-full text-[10px] text-red-400 font-bold py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors">
                          إعادة المحاولة →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ━━━ Salary Requests Section ━━━ */}
            {extSalaryRequests.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2 px-1">
                  <FileText className="w-3.5 h-3.5 text-primary" /> طلبات السحب ({extSalaryRequests.length})
                </h3>
                {extSalaryRequests.map((req) => {
                  const st = statusConfig[req.status] || statusConfig.pending;
                  const isExpanded = expandedId === `ext-${req.id}`;
                  return (
                    <div key={req.id} className={`glass-card overflow-hidden border ${st.bg}`}>
                      <button onClick={() => setExpandedId(isExpanded ? null : `ext-${req.id}`)} className="w-full p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                            <Wallet className="w-4.5 h-4.5 text-primary" />
                          </div>
                          <div className="text-right min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{req.id}</p>
                            <p className="text-[10px] text-muted-foreground">{req.bank} — {req.country}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 mr-2">
                          <div className="text-left">
                            <p className="text-sm font-bold font-mono text-foreground" dir="ltr">${req.amount}</p>
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${st.color}`}>{st.icon}{st.label}</span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-3.5 pb-3.5 space-y-2 border-t border-border/20 pt-3">
                          <div className="text-xs space-y-1.5">
                            {req.reference_id && (
                              <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                                <span className="text-muted-foreground flex items-center gap-1"><Hash className="w-3 h-3" /> المرجعي</span>
                                <span className="font-bold font-mono text-foreground">#{req.reference_id}</span>
                              </div>
                            )}
                            {req.account_name && (
                              <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                                <span className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> المستلم</span>
                                <span className="font-bold text-foreground">{req.account_name}</span>
                              </div>
                            )}
                            {req.account_number && (
                              <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                                <span className="text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" /> الحساب</span>
                                <span className="font-bold text-foreground" dir="ltr">{req.account_number}</span>
                              </div>
                            )}
                            <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                              <span className="text-muted-foreground">التاريخ</span>
                              <span className="font-bold text-foreground">{formatDate(req.created_at)}</span>
                            </div>
                          </div>
                          {req.status === "approved" && req.transfer_image_url && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5" /> إيصال التحويل:
                              </p>
                              <img src={req.transfer_image_url} alt="إيصال"
                                className="w-full max-h-48 object-contain rounded-xl border border-emerald-500/20 cursor-pointer bg-black/20"
                                onClick={() => setImagePreview(req.transfer_image_url!)} />
                            </div>
                          )}
                          {req.status === "rejected" && req.admin_note && (
                            <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-xs">
                              <p className="text-[10px] text-red-400 font-bold mb-0.5">سبب الرفض:</p>
                              <p className="text-foreground">{req.admin_note}</p>
                            </div>
                          )}
                          {req.status === "rejected" && req.rejection_image_url && (
                            <img src={req.rejection_image_url} alt="توضيح"
                              className="w-full max-h-48 object-contain rounded-xl border border-red-500/20 cursor-pointer"
                              onClick={() => setImagePreview(req.rejection_image_url!)} />
                          )}
                          {req.status === "rejected" && (
                            <Button onClick={() => navigate("/salary")} className="w-full" size="sm">
                              <RefreshCw className="w-4 h-4 ml-1" /> إعادة المحاولة
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ━━━ Supabase Salary Requests (legacy) ━━━ */}
            {requests.length > 0 && extSalaryRequests.length === 0 && requests.map((req, index) => {
              const status = statusConfig[req.status] || statusConfig.pending;
              const isExpanded = expandedId === req.id;
              return (
                <div key={req.id} className={`glass-card overflow-hidden border ${status.bg} css-fade-up`} style={{ animationDelay: `${index * 0.05}s` }}>
                  <button onClick={() => setExpandedId(isExpanded ? null : req.id)} className="w-full p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${req.request_type === "monthly" ? "bg-primary/10" : "bg-yellow-500/10"}`}>
                        {req.request_type === "monthly" ? <Wallet className="w-5 h-5 text-primary" /> : <Zap className="w-5 h-5 text-yellow-400" />}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{req.request_type === "monthly" ? "سحب شهري" : "سحب فوري"}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(req.created_at)} • {formatTime(req.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold flex items-center gap-1 ${status.color}`}>{status.icon}{status.label}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 css-expand">
                      <div className="border-t border-border/20 pt-3 space-y-2 text-xs">
                        <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                          <span className="text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> المبلغ</span>
                          <span className="font-bold text-primary">${req.amount_usd}</span>
                        </div>
                        {req.amount_coins && (
                          <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                            <span className="text-muted-foreground">الكوينز</span>
                            <span className="font-bold text-foreground">{req.amount_coins.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                          <span className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> المستلم</span>
                          <span className="font-bold text-foreground">{req.recipient_name}</span>
                        </div>
                        <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                          <span className="text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> الدولة</span>
                          <span className="font-bold text-foreground">{req.recipient_country}</span>
                        </div>
                        <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                          <span className="text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" /> الدفع</span>
                          <span className="font-bold text-foreground">{req.payment_method}</span>
                        </div>
                        <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                          <span className="text-muted-foreground">تفاصيل الحساب</span>
                          <span className="font-bold text-foreground" dir="ltr">{req.payment_details}</span>
                        </div>
                        {req.admin_note && (
                          <div className={`p-3 rounded-xl ${req.status === "rejected" ? "bg-red-500/5 border border-red-500/10" : "bg-primary/5 border border-primary/10"}`}>
                            <p className="text-[11px] text-muted-foreground mb-1">{req.status === "rejected" ? "سبب الرفض:" : "ملاحظة الإدارة:"}</p>
                            <p className="text-xs text-foreground">{req.admin_note}</p>
                          </div>
                        )}
                        {req.transfer_image_url && req.status === "approved" && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" /> صورة إيصال التحويل:
                            </p>
                            <img 
                              src={req.transfer_image_url} 
                              alt="إيصال التحويل" 
                              className="w-full max-h-64 object-contain rounded-xl border border-emerald-500/20 cursor-pointer bg-black/20"
                              onClick={() => setImagePreview(req.transfer_image_url)}
                            />
                            <p className="text-[9px] text-muted-foreground text-center">اضغط على الصورة لعرضها بالكامل</p>
                          </div>
                        )}
                        {req.status === "rejected" && (
                          <Button onClick={() => navigate(req.request_type === "instant" ? "/instant-request" : "/salary")} className="w-full" size="sm">
                            <RefreshCw className="w-4 h-4 ml-1" />إعادة إرسال الطلب مع التعديل
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {requests.length === 0 && transfers.length === 0 && extSalaryRequests.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center css-fade-up">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">لا توجد طلبات</h3>
                <p className="text-sm text-muted-foreground mb-6">لم تقم بإرسال أي طلب سحب راتب بعد</p>
                <button onClick={() => navigate("/salary")} className="px-6 py-3 rounded-xl gold-gradient text-primary-foreground font-bold text-sm">
                  سحب راتب جديد
                </button>
              </div>
            )}
          </>
        )}

        {/* Claims Tab */}
        {!loading && activeTab === "claims" && (
          <>
            {allClaims.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center css-fade-up">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">لا توجد طلبات</h3>
                <p className="text-sm text-muted-foreground">لم تقم بطلب أي دخولية أو إطار بعد</p>
              </div>
            )}
            {allClaims.map((claim, index) => (
              <div key={claim.id} className="glass-card overflow-hidden border bg-emerald-500/10 border-emerald-500/20 css-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${claim.type === "entry" ? "bg-primary/10" : "bg-purple-500/10"}`}>
                      {claim.type === "entry" ? <Sparkles className="w-5 h-5 text-primary" /> : <Frame className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{claim.type === "entry" ? "دخولية" : "إطار"} - {claim.claim_type === "self" ? "لنفسي" : "لصديق"}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(claim.created_at)} • {formatTime(claim.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold flex items-center gap-1 text-emerald-400"><CheckCircle className="w-4 h-4" />تم</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* General Requests Tab (API) */}
        {!loading && activeTab === "general" && (
          <>
            {apiRequests.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center css-fade-up">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <Headset className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">لا توجد طلبات</h3>
                <p className="text-sm text-muted-foreground">لم تقم بإرسال أي طلب عام بعد</p>
              </div>
            )}
            {apiRequests.map((req, index) => {
              const status = statusConfig[req.status] || statusConfig.pending;
              return (
                <div key={req.id} className={`glass-card overflow-hidden border ${status.bg} css-fade-up`} style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{requestTypeLabels[req.request_type] || req.request_type}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(req.created_at)} • {formatTime(req.created_at)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold flex items-center gap-1 ${status.color}`}>{status.icon}{status.label}</span>
                  </div>
                  {req.admin_note && (
                    <div className="px-4 pb-3">
                      <div className="p-2.5 rounded-lg bg-muted/20 text-xs">
                        <span className="text-muted-foreground">ملاحظة: </span>
                        <span className="text-foreground">{req.admin_note}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {imagePreview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setImagePreview(null)}>
          <img src={imagePreview} alt="صورة الحوالة" className="max-w-full max-h-[80vh] rounded-2xl css-scale-up" />
        </div>
      )}
    </MobileLayout>
  );
};

export default MyRequests;
