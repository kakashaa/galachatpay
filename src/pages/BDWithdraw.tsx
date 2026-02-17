import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, DollarSign, Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BDWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [step, setStep] = useState<"balance" | "form" | "success">("balance");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balanceUsd, setBalanceUsd] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    if (!authUser?.uuid) return;
    const loadBalance = async () => {
      setLoadingBalance(true);
      const { data } = await supabase
        .from("bd_commission_settings")
        .select("available_balance")
        .eq("bd_uuid", authUser.uuid)
        .maybeSingle();
      if (data) {
        setBalanceUsd(Number(data.available_balance) || 0);
      }
      setLoadingBalance(false);
    };
    loadBalance();
  }, [authUser?.uuid]);

  if (!authUser) { navigate("/"); return null; }

  const parsedAmount = parseFloat(amount) || 0;
  const canSubmit = parsedAmount >= 60 && parsedAmount <= balanceUsd;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("bd-manage", {
        body: {
          action: "request_withdrawal",
          bd_uuid: authUser.uuid,
          amount: parsedAmount,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) {
        setError(data?.error || "فشل عملية السحب");
        setLoading(false);
        return;
      }

      setStep("success");
      // Refresh balance
      const { data: refreshed } = await supabase
        .from("bd_commission_settings")
        .select("available_balance")
        .eq("bd_uuid", authUser.uuid)
        .maybeSingle();
      if (refreshed) setBalanceUsd(Number(refreshed.available_balance) || 0);
      
      toast.success("تم رفع طلب السحب بنجاح 📋");
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  if (loadingBalance) {
    return (
      <MobileLayout showHeader headerTitle="السحب" onBack={() => navigate("/bd/dashboard")}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="السحب" onBack={() => navigate("/bd/dashboard")}>
      <div className="px-5 py-6 space-y-5" dir="rtl">

        {/* ─── Balance Card ─── */}
        <div
          className={`glass-card p-5 space-y-4 transition-all ${step === "balance" ? "cursor-pointer active:scale-[0.98]" : ""}`}
          onClick={() => step === "balance" && setStep("form")}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">رصيدك المتاح</p>
              <p className="text-[10px] text-muted-foreground">الحد الأدنى للسحب: $60</p>
            </div>
          </div>

          <div className="bg-primary/10 rounded-xl p-4 text-center">
            <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-400">${balanceUsd.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground">بالدولار</p>
          </div>

          {step === "balance" && (
            <Button className="w-full gap-2 h-12 mt-2" disabled={balanceUsd < 60}>
              <Wallet className="w-4 h-4" />
              {balanceUsd < 60 ? "الرصيد غير كافٍ (الحد الأدنى $60)" : "طلب سحب"}
            </Button>
          )}
        </div>

        {/* ─── Withdrawal Form ─── */}
        {step === "form" && (
          <div className="glass-card p-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-foreground">طلب سحب جديد</h3>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">المبلغ بالدولار (الحد الأدنى $60)</label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-lg font-bold h-12"
                min={60}
                max={balanceUsd}
                step="0.01"
              />
              {parsedAmount > 0 && parsedAmount < 60 && (
                <p className="text-[10px] text-destructive text-center">الحد الأدنى للسحب $60</p>
              )}
              {parsedAmount > balanceUsd && (
                <p className="text-[10px] text-destructive text-center">المبلغ أكبر من الرصيد المتاح</p>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground text-center">
                بعد الموافقة على الطلب، سيُطلب منك إدخال معلومات المستلم لإتمام التحويل
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => { setStep("balance"); setError(""); setAmount(""); }}
              >
                <ArrowLeft className="w-4 h-4 ml-1" />
                رجوع
              </Button>
              <Button
                className="flex-1 h-11 gap-2"
                disabled={!canSubmit || loading}
                onClick={handleSubmit}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                رفع الطلب
              </Button>
            </div>
          </div>
        )}

        {/* ─── Success ─── */}
        {step === "success" && (
          <div className="glass-card p-5 space-y-4 animate-fade-in text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">تم رفع طلب السحب بنجاح! 📋</h3>
            <p className="text-xs text-muted-foreground">
              تم رفع طلب سحب بمبلغ <span className="text-green-400 font-bold">${parsedAmount.toFixed(2)}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              سيتم مراجعة الطلب من قبل الإدارة وإشعارك بالنتيجة
            </p>
            <Button
              className="w-full h-11"
              onClick={() => { setStep("balance"); setAmount(""); setError(""); }}
            >
              تم
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default BDWithdraw;
