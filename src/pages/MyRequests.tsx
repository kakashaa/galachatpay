import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Wallet, Zap, Globe, CreditCard, User, Image as ImageIcon, Sparkles, Frame, RefreshCw, Headset,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  pending: { label: "قيد المراجعة", color: "text-yellow-400", icon: <Clock className="w-4 h-4" />, bg: "bg-yellow-500/10 border-yellow-500/20" },
  approved: { label: "تم القبول", color: "text-emerald-400", icon: <CheckCircle className="w-4 h-4" />, bg: "bg-emerald-500/10 border-emerald-500/20" },
  rejected: { label: "مرفوض", color: "text-red-400", icon: <XCircle className="w-4 h-4" />, bg: "bg-red-500/10 border-red-500/20" },
  completed: { label: "مكتمل", color: "text-emerald-400", icon: <CheckCircle className="w-4 h-4" />, bg: "bg-emerald-500/10 border-emerald-500/20" },
};

const requestTypeLabels: Record<string, string> = {
  gift: "طلب هدية",
  entry_effect: "دخولية",
  animated_photo: "صورة متحركة",
  support: "دعم سريع",
  bd_verify: "توثيق BD",
  frame: "إطار",
};

const MyRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<SalaryRequest[]>([]);
  const [entryClaims, setEntryClaims] = useState<ClaimRecord[]>([]);
  const [frameClaims, setFrameClaims] = useState<ClaimRecord[]>([]);
  const [apiRequests, setApiRequests] = useState<ApiRequest[]>([]);
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
    const [salaryRes, entryRes, frameRes] = await Promise.all([
      supabase.from("salary_requests").select("*").eq("user_uuid", user.uuid).order("created_at", { ascending: false }),
      supabase.from("entry_gift_claims").select("*").eq("user_uuid", user.uuid).order("created_at", { ascending: false }),
      supabase.from("frame_claims").select("*").eq("user_uuid", user.uuid).order("created_at", { ascending: false }),
    ]);

    if (salaryRes.data) setRequests(salaryRes.data as SalaryRequest[]);
    if (entryRes.data) setEntryClaims((entryRes.data as any[]).map(c => ({ ...c, type: "entry" as const })));
    if (frameRes.data) setFrameClaims((frameRes.data as any[]).map(c => ({ ...c, type: "frame" as const })));

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

            {requests.length === 0 && (
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

            {requests.map((req, index) => {
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
