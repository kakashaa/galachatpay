import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Wallet, Coins, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const COIN_RATE = 8500; // $1 = 8500 coins

const BDWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [targetUuid, setTargetUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [bdName, setBdName] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user?.uuid) return;
      const { data } = await supabase.functions.invoke("bd-manage", {
        body: { action: "check_status", user_uuid: user.uuid },
      });
      if (data?.bd) {
        setBalance(data.bd.available_balance || 0);
        setBdName(data.bd.bd_name || "");
      }
    };
    load();
  }, [user?.uuid]);

  const amountNum = parseFloat(amount) || 0;
  const coinEquivalent = Math.floor(amountNum * COIN_RATE);
  const balanceCoins = Math.floor(balance * COIN_RATE);

  const handleWithdraw = async () => {
    if (!user?.uuid || amountNum <= 0 || !targetUuid.trim()) return;
    if (amountNum > balance) {
      toast.error("المبلغ أكبر من الرصيد المتاح");
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("bd-manage", {
        body: {
          action: "withdraw",
          bd_uuid: user.uuid,
          bd_name: bdName,
          amount: amountNum,
          target_uuid: targetUuid.trim(),
        },
      });

      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || "تم رفع الطلب بنجاح");
        navigate("/bd/dashboard");
      }
    } catch {
      toast.error("فشل رفع الطلب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-background text-foreground pb-10" dir="rtl">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/bd/dashboard")} className="p-2 rounded-xl hover:bg-muted">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">سحب الأرباح</h1>
      </header>

      <main className="px-4 space-y-5">
        {/* Balance Display */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-green-500/30 rounded-2xl p-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5 text-green-400" />
            <span className="text-sm text-muted-foreground">الرصيد المتاح</span>
          </div>
          <div className="text-3xl font-bold text-green-400">${balance.toFixed(2)}</div>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>ما يعادل {balanceCoins.toLocaleString()} كوينز</span>
          </div>
        </motion.div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-sm font-bold">المبلغ المراد سحبه ($)</label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            dir="ltr"
            className="text-center text-lg font-bold"
            min="0"
            max={balance}
            step="0.01"
          />
        </div>

        {/* Coin Equivalent */}
        {amountNum > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">ما يعادل من كوينزات</span>
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Coins className="w-4 h-4" />
              {coinEquivalent.toLocaleString()}
            </span>
          </motion.div>
        )}

        {/* Target UUID */}
        <div className="space-y-2">
          <label className="text-sm font-bold">آيدي المستلم (UUID)</label>
          <Input
            placeholder="أدخل الآيدي المراد إرسال الكوينزات إليه..."
            value={targetUuid}
            onChange={(e) => setTargetUuid(e.target.value)}
            dir="ltr"
            className="text-center font-mono"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleWithdraw}
          disabled={loading || amountNum <= 0 || amountNum > balance || !targetUuid.trim()}
          className="w-full h-12 text-base font-bold rounded-xl"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <><Send className="w-5 h-5 ml-2" />رفع طلب السحب</>
          )}
        </Button>
      </main>
    </div>
  );
};

export default BDWithdraw;
