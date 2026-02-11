import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Briefcase, User, Crown, DollarSign, TrendingUp, Building2, CheckCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ChargeRecord {
  id: number;
  charger_id: number;
  charger_type: string;
  user_id: number;
  amount: number;
  amount_type?: number;
  agency_id?: number;
  created_at: string;
}

interface CoinLogRecord {
  id: number;
  paid_usd?: number;
  obtained_coins?: number;
  user_id: number;
  method?: string;
  status?: number;
  created_at: string;
  transaction?: string;
}

const BDDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [charges, setCharges] = useState<ChargeRecord[]>([]);
  const [coinLogs, setCoinLogs] = useState<CoinLogRecord[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("gala-transactions");

      if (fnError || !data?.success) {
        setError(data?.error || "فشل في تحميل البيانات");
        setLoading(false);
        return;
      }

      setMonth(data.month || "");
      setCharges(data.charges || []);
      setCoinLogs(data.coin_logs || []);
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchData();
  }, []);

  const totalChargesAmount = charges.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalCoinLogsUsd = coinLogs.reduce((sum, c) => sum + (c.paid_usd || 0), 0);

  if (!user) return null;

  if (loading) {
    return (
      <MobileLayout showHeader headerTitle="التقارير الشهرية" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="التقارير الشهرية" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{user.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  تقرير شهر: <span className="font-bold text-primary">{month || "—"}</span>
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchData} className="text-primary">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3 text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{charges.length}</p>
            <p className="text-[10px] text-muted-foreground">عدد عمليات الشحن</p>
          </div>
          <div className="glass-card p-3 text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{totalChargesAmount.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">إجمالي مبالغ الشحن</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{coinLogs.length}</p>
            <p className="text-[10px] text-muted-foreground">عدد سجلات العملات</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Crown className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">${totalCoinLogsUsd.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">إجمالي USD</p>
          </div>
        </motion.div>

        {/* Charges List */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            عمليات الشحن ({charges.length})
          </h3>
          {charges.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">لا توجد عمليات شحن لهذا الشهر</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {charges.slice(0, 20).map((charge) => (
                <div key={charge.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">مستخدم #{charge.user_id}</p>
                      <p className="text-[10px] text-muted-foreground">{charge.charger_type} • {new Date(charge.created_at).toLocaleDateString("ar")}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-primary">{charge.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {charges.length > 20 && (
                <p className="text-[10px] text-muted-foreground text-center">و {charges.length - 20} عملية أخرى...</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Coin Logs List */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            سجلات العملات ({coinLogs.length})
          </h3>
          {coinLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">لا توجد سجلات لهذا الشهر</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {coinLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{log.method || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleDateString("ar")}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">{(log.obtained_coins || 0).toLocaleString()} عملة</p>
                    <p className="text-[10px] text-primary">${(log.paid_usd || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {coinLogs.length > 20 && (
                <p className="text-[10px] text-muted-foreground text-center">و {coinLogs.length - 20} سجل آخر...</p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default BDDashboard;
