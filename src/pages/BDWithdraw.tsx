import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Wallet, Coins, Loader2, Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const BDWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bdName, setBdName] = useState("");
  const [targetUuid, setTargetUuid] = useState("");
  const [requestType, setRequestType] = useState<"withdraw" | "charge">("withdraw");

  // Get earnings from navigation state
  const totalCoins = (location.state as any)?.totalCoins || 0;
  const totalUsd = (location.state as any)?.totalUsd || 0;

  // Lock: only first 5 days of month
  const dayOfMonth = new Date().getDate();
  const canWithdraw = dayOfMonth <= 5;

  // Previous month label
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const withdrawMonth = lastMonth.toISOString().slice(0, 7);

  useEffect(() => {
    const load = async () => {
      if (!user?.uuid) return;
      const { data } = await supabase.functions.invoke("bd-manage", {
        body: { action: "check_status", user_uuid: user.uuid },
      });
      if (data?.bd) {
        setBdName(data.bd.bd_name || "");
      }
    };
    load();
  }, [user?.uuid]);

  const handleWithdraw = async () => {
    if (!user?.uuid || !canWithdraw || totalCoins <= 0) return;

    if (requestType === "charge" && !targetUuid.trim()) {
      toast.error("أدخل آيدي المستلم");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("bd_withdrawals").insert({
        bd_uuid: user.uuid,
        bd_name: bdName,
        amount: totalUsd,
        status: "pending",
        country: withdrawMonth,
        transfer_type: requestType,
        recipient_name: requestType === "charge" ? targetUuid.trim() : null,
        admin_note: `كوينز: ${totalCoins.toLocaleString()} | شهر: ${withdrawMonth}`,
      });

      if (error) {
        toast.error("فشل رفع الطلب: " + error.message);
      } else {
        toast.success("تم إرسال طلب الصرف بنجاح!");
        navigate("/bd/dashboard");
      }
    } catch {
      toast.error("فشل رفع الطلب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container bg-background text-foreground pb-10 overflow-y-auto" dir="rtl">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/bd/dashboard")} className="p-2 rounded-xl hover:bg-muted">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">طلب صرف الأرباح</h1>
      </header>

      <main className="px-4 space-y-5">
        {/* Earnings Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-emerald-500/30 rounded-2xl p-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-muted-foreground">أرباح الشهر السابق ({withdrawMonth})</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">{totalCoins.toLocaleString()} كوينز</div>
          <div className="text-sm font-bold text-foreground">${totalUsd.toFixed(2)}</div>
        </motion.div>

        {!canWithdraw ? (
          /* Locked state */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-muted/20 border border-border rounded-2xl p-6 text-center space-y-3">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-bold text-muted-foreground">الصرف مقفل حالياً</p>
            <p className="text-xs text-muted-foreground">متاح من يوم 1 إلى 5 من كل شهر جديد</p>
          </motion.div>
        ) : (
          <>
            {/* Request Type */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRequestType("withdraw")}
                className={`p-3 rounded-xl border text-center transition-all ${requestType === "withdraw" ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-card"}`}
              >
                <span className="material-symbols-outlined text-lg text-emerald-400">payments</span>
                <p className="text-xs font-bold mt-1">سحب نقدي</p>
              </button>
              <button
                onClick={() => setRequestType("charge")}
                className={`p-3 rounded-xl border text-center transition-all ${requestType === "charge" ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}
              >
                <Coins className="w-5 h-5 text-primary mx-auto" />
                <p className="text-xs font-bold mt-1">شحن كوينزات</p>
              </button>
            </div>

            {/* Target UUID for charge */}
            {requestType === "charge" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                <label className="text-sm font-bold">آيدي المستلم (UUID)</label>
                <Input
                  placeholder="أدخل الآيدي المراد شحنه..."
                  value={targetUuid}
                  onChange={(e) => setTargetUuid(e.target.value)}
                  dir="ltr"
                  className="text-center font-mono"
                />
              </motion.div>
            )}

            {/* Submit */}
            <Button
              onClick={handleWithdraw}
              disabled={loading || totalCoins <= 0 || (requestType === "charge" && !targetUuid.trim())}
              className="w-full h-12 text-base font-bold rounded-xl"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <><Send className="w-5 h-5 ml-2" />{requestType === "withdraw" ? "طلب سحب نقدي" : "طلب شحن كوينزات"}</>
              )}
            </Button>
          </>
        )}

        {/* Info */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">ملاحظة</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              الأرباح لا تُصرف تلقائياً. يجب طلب الصرف يدوياً خلال أول 5 أيام من الشهر الجديد. الطلب يراجع من الإدارة ويتم الرد خلال 24 ساعة.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BDWithdraw;
