import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, DollarSign, Coins, Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COIN_RATE = 8500;

const BDWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [step, setStep] = useState<"balance" | "form" | "success">("balance");
  const [amount, setAmount] = useState("");
  const [recipientUuid, setRecipientUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balanceUsd, setBalanceUsd] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Load REAL balance from external API (source of truth)
  useEffect(() => {
    if (!authUser?.uuid) return;
    const loadBalance = async () => {
      setLoadingBalance(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("bd-referral", {
          body: { action: "dashboard", uuid: authUser.uuid },
        });
        if (!fnError && (data?.ok || data?.success)) {
          const realBalance = Number(data?.bidi?.balance_usd) || 0;
          setBalanceUsd(realBalance);
          // Sync local DB with external balance
          await supabase
            .from("bd_commission_settings")
            .update({ available_balance: realBalance, updated_at: new Date().toISOString() })
            .eq("bd_uuid", authUser.uuid);
        } else {
          // Fallback to local DB
          const { data: local } = await supabase
            .from("bd_commission_settings")
            .select("available_balance")
            .eq("bd_uuid", authUser.uuid)
            .maybeSingle();
          if (local) setBalanceUsd(Number(local.available_balance) || 0);
        }
      } catch {
        // Fallback to local DB on error
        const { data: local } = await supabase
          .from("bd_commission_settings")
          .select("available_balance")
          .eq("bd_uuid", authUser.uuid)
          .maybeSingle();
        if (local) setBalanceUsd(Number(local.available_balance) || 0);
      }
      setLoadingBalance(false);
    };
    loadBalance();
  }, [authUser?.uuid]);

  if (!authUser) { navigate("/"); return null; }

  const balanceCoins = Math.round(balanceUsd * COIN_RATE);

  const parsedAmount = parseFloat(amount) || 0;
  const amountCoins = Math.round(parsedAmount * COIN_RATE);
  const canSubmit = parsedAmount > 0 && parsedAmount <= balanceUsd && recipientUuid.trim().length >= 3;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("bd-referral", {
        body: {
          action: "bd_withdraw_coins",
          uuid: authUser.uuid,
          amount: parsedAmount,
          recipient_uuid: recipientUuid.trim(),
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) {
        setError(data?.error || "فشل عملية السحب");
        setLoading(false);
        return;
      }

      setStep("success");
      // Refresh balance from external API
      try {
        const { data: refreshData } = await supabase.functions.invoke("bd-referral", {
          body: { action: "dashboard", uuid: authUser.uuid },
        });
        if (refreshData?.ok || refreshData?.success) {
          const newBal = Number(refreshData?.bidi?.balance_usd) || 0;
          setBalanceUsd(newBal);
          await supabase
            .from("bd_commission_settings")
            .update({ available_balance: newBal, updated_at: new Date().toISOString() })
            .eq("bd_uuid", authUser.uuid);
        }
      } catch {}
      
      toast.success("تم شحن الكوينزات بنجاح ⚡");
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

          {step === "balance" && (
            <Button className="w-full gap-2 h-12 mt-2">
              <Wallet className="w-4 h-4" />
              سحب الرصيد
            </Button>
          )}
        </div>

        {/* ─── Withdrawal Form ─── */}
        {step === "form" && (
          <div className="glass-card p-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-foreground">طلب سحب جديد</h3>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">المبلغ بالدولار</label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-lg font-bold h-12"
                min={0}
                max={balanceUsd}
                step="0.01"
              />
              {parsedAmount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-2">
                  <p className="text-[10px] text-muted-foreground text-center mb-1">ما يعادلها بالكوينزات</p>
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span className="text-xl font-bold text-amber-400">{amountCoins.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">كوينز</span>
                  </div>
                </div>
              )}
              {parsedAmount > balanceUsd && (
                <p className="text-[10px] text-destructive text-center">المبلغ أكبر من الرصيد المتاح</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">آيدي المستلم (UUID) في غلا</label>
              <Input
                type="text"
                placeholder="أدخل آيدي المستلم"
                value={recipientUuid}
                onChange={(e) => setRecipientUuid(e.target.value)}
                className="text-center h-12"
                maxLength={64}
              />
              <p className="text-[10px] text-muted-foreground text-center">
                يمكنك شحن لحسابك أو لحساب آخر
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
                onClick={() => { setStep("balance"); setError(""); setAmount(""); setRecipientUuid(""); }}
              >
                <ArrowLeft className="w-4 h-4 ml-1" />
                رجوع
              </Button>
              <Button
                className="flex-1 h-11 gap-2"
                disabled={!canSubmit || loading}
                onClick={handleSubmit}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                شحن الكوينزات
              </Button>
            </div>
          </div>
        )}

        {/* ─── Success ─── */}
        {step === "success" && (
          <div className="glass-card p-5 space-y-4 animate-fade-in text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">تم الشحن بنجاح! ⚡</h3>
            <p className="text-xs text-muted-foreground">
              تم شحن <span className="text-amber-400 font-bold">{amountCoins.toLocaleString()}</span> كوينز
              إلى الحساب <span className="text-primary font-bold">{recipientUuid}</span>
            </p>
            <Button
              className="w-full h-11"
              onClick={() => { setStep("balance"); setAmount(""); setRecipientUuid(""); setError(""); }}
            >
              سحب آخر
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default BDWithdraw;
