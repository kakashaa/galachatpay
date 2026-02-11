import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FileText, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Wallet, Zap, Globe, CreditCard, User, Image as ImageIcon,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  pending: {
    label: "قيد المراجعة",
    color: "text-yellow-400",
    icon: <Clock className="w-4 h-4" />,
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  approved: {
    label: "تم التحويل",
    color: "text-emerald-400",
    icon: <CheckCircle className="w-4 h-4" />,
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  rejected: {
    label: "مرفوض",
    color: "text-red-400",
    icon: <XCircle className="w-4 h-4" />,
    bg: "bg-red-500/10 border-red-500/20",
  },
};

const MyRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<SalaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    fetchRequests();
  }, [isAuthenticated]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("salary_requests")
      .select("*")
      .eq("user_uuid", user.uuid)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as SalaryRequest[]);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <MobileLayout showHeader headerTitle="طلباتي" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-4">
        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="glass-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{requests.length}</p>
            <p className="text-[10px] text-muted-foreground">إجمالي</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-lg font-bold text-yellow-400">
              {requests.filter((r) => r.status === "pending").length}
            </p>
            <p className="text-[10px] text-muted-foreground">قيد المراجعة</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">
              {requests.filter((r) => r.status === "approved").length}
            </p>
            <p className="text-[10px] text-muted-foreground">تم التحويل</p>
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">لا توجد طلبات</h3>
            <p className="text-sm text-muted-foreground mb-6">لم تقم بإرسال أي طلب سحب راتب بعد</p>
            <button
              onClick={() => navigate("/salary")}
              className="px-6 py-3 rounded-xl gold-gradient text-primary-foreground font-bold text-sm"
            >
              سحب راتب جديد
            </button>
          </motion.div>
        )}

        {/* Requests List */}
        {!loading &&
          requests.map((req, index) => {
            const status = statusConfig[req.status] || statusConfig.pending;
            const isExpanded = expandedId === req.id;

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card overflow-hidden border ${status.bg}`}
              >
                {/* Header - clickable */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      req.request_type === "monthly" ? "bg-primary/10" : "bg-yellow-500/10"
                    }`}>
                      {req.request_type === "monthly" ? (
                        <Wallet className="w-5 h-5 text-primary" />
                      ) : (
                        <Zap className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        {req.request_type === "monthly" ? "سحب شهري" : "سحب فوري"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(req.created_at)} • {formatTime(req.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold flex items-center gap-1 ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 space-y-2"
                  >
                    <div className="border-t border-border/20 pt-3 space-y-2 text-xs">
                      <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Wallet className="w-3 h-3" /> المبلغ
                        </span>
                        <span className="font-bold text-primary">${req.amount_usd}</span>
                      </div>
                      {req.amount_coins && (
                        <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                          <span className="text-muted-foreground">الكوينز</span>
                          <span className="font-bold text-foreground">{req.amount_coins.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> المستلم
                        </span>
                        <span className="font-bold text-foreground">{req.recipient_name}</span>
                      </div>
                      <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" /> الدولة
                        </span>
                        <span className="font-bold text-foreground">{req.recipient_country}</span>
                      </div>
                      <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> الدفع
                        </span>
                        <span className="font-bold text-foreground">{req.payment_method}</span>
                      </div>
                      <div className="flex justify-between bg-muted/20 rounded-lg p-2.5">
                        <span className="text-muted-foreground">تفاصيل الحساب</span>
                        <span className="font-bold text-foreground" dir="ltr">{req.payment_details}</span>
                      </div>

                      {/* Admin Note */}
                      {req.admin_note && (
                        <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl">
                          <p className="text-[11px] text-muted-foreground mb-1">ملاحظة الإدارة:</p>
                          <p className="text-xs text-foreground">{req.admin_note}</p>
                        </div>
                      )}

                      {/* Transfer Image */}
                      {req.transfer_image_url && req.status === "approved" && (
                        <button
                          onClick={() => setImagePreview(req.transfer_image_url)}
                          className="w-full p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 justify-center"
                        >
                          <ImageIcon className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-400">عرض صورة الحوالة</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
      </div>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setImagePreview(null)}
        >
          <motion.img
            src={imagePreview}
            alt="صورة الحوالة"
            className="max-w-full max-h-[80vh] rounded-2xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          />
        </div>
      )}
    </MobileLayout>
  );
};

export default MyRequests;
