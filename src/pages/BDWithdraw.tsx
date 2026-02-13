import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, DollarSign, Loader2, AlertCircle, CheckCircle, Clock, Coins } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useBD } from "@/contexts/BDContext";

const COIN_RATE = 7500;

const BDWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const { bdUser, withdraw, loading, refreshDashboard } = useBD();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!bdUser) { navigate("/bd"); return null; }

  const balanceUsd = bdUser.available_balance || 0;
  const balanceCoins = Math.round(balanceUsd * COIN_RATE);
  const today = new Date();
  const dayOfMonth = today.getDate();
  const canWithdraw = dayOfMonth <= 7;

  const handleWithdraw = async () => {
    setError("");
    setSuccess(false);
    const res = await withdraw();
    if (res.success) {
      setSuccess(true);
      refreshDashboard();
    } else {
      setError(res.error || "فشل السحب");
    }
  };

  return (
    <MobileLayout showHeader headerTitle="السحب" onBack={() => navigate("/bd/dashboard")}>
      <div className="px-5 py-6 space-y-5" dir="rtl">
        {/* Balance card */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">رصيدك المتاح</p>
              <p className="text-[10px] text-muted-foreground">$1 = {COIN_RATE.toLocaleString()} كوينز</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-400">${balanceUsd.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">بالدولار</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <Coins className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-amber-400">{balanceCoins.toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground">بالكوينز</p>
            </div>
          </div>

          {!canWithdraw && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400">السحب متاح فقط أول 7 أيام من الشهر</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-400 text-xs p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>تم إرسال طلب السحب بنجاح</span>
            </div>
          )}

          <Button
            onClick={handleWithdraw}
            disabled={loading || !canWithdraw || balanceUsd <= 0}
            className="w-full gap-2 h-12"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            طلب سحب
          </Button>
        </div>

        {/* Withdrawal history */}
        {(bdUser.withdrawals || []).length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground">سجل السحوبات</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bdUser.withdrawals.map((w: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border/20">
                  <div>
                    <p className="text-xs font-bold text-foreground">${(w.amount || 0).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{w.created_at ? new Date(w.created_at).toLocaleDateString("ar") : "—"}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    w.status === "completed" ? "bg-green-500/20 text-green-400" :
                    w.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                    "bg-muted/20 text-muted-foreground"
                  }`}>
                    {w.status === "completed" ? "مكتمل" : w.status === "pending" ? "قيد المعالجة" : w.status || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default BDWithdraw;
