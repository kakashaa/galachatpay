import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, DollarSign, IdCard, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";

interface Props {
  userUuid: string;
  onBack: () => void;
}

interface Transaction {
  id: string;
  type: "gift_sent" | "gift_received" | "cashout" | "id_purchase";
  amount: number;
  label: string;
  detail: string;
  date: string;
}

const StarTransactionHistory: React.FC<Props> = ({ userUuid, onBack }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const [giftRes, idRes] = await Promise.all([
          supabase
            .from("star_gift_logs")
            .select("*")
            .or(`sender_uuid.eq.${userUuid},recipient_uuid.eq.${userUuid}`)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("id_changes")
            .select("*")
            .eq("user_uuid", userUuid)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        const txns: Transaction[] = [];

        if (giftRes.data) {
          for (const g of giftRes.data) {
            if (g.recipient_uuid === "CASHOUT") {
              txns.push({
                id: g.id,
                type: "cashout",
                amount: g.amount,
                label: "تحويل كاش",
                detail: `${g.amount} نجمة → $${g.amount * 5}`,
                date: g.created_at,
              });
            } else if (g.sender_uuid === userUuid) {
              txns.push({
                id: g.id,
                type: "gift_sent",
                amount: g.amount,
                label: "إهداء نجوم",
                detail: `إلى ${g.recipient_uuid.substring(0, 8)}...`,
                date: g.created_at,
              });
            } else {
              txns.push({
                id: g.id,
                type: "gift_received",
                amount: g.amount,
                label: "نجوم مستلمة",
                detail: `من ${g.sender_name}`,
                date: g.created_at,
              });
            }
          }
        }

        if (idRes.data) {
          for (const c of idRes.data) {
            txns.push({
              id: c.id,
              type: "id_purchase",
              amount: 0,
              label: "شراء آيدي",
              detail: c.new_id,
              date: c.created_at,
            });
          }
        }

        txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(txns);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userUuid]);

  const getIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "gift_sent":
        return <ArrowUp className="w-4 h-4 text-red-400" />;
      case "gift_received":
        return <ArrowDown className="w-4 h-4 text-emerald-400" />;
      case "cashout":
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case "id_purchase":
        return <IdCard className="w-4 h-4 text-primary" />;
    }
  };

  const getBg = (type: Transaction["type"]) => {
    switch (type) {
      case "gift_sent":
        return "bg-red-500/10";
      case "gift_received":
        return "bg-emerald-500/10";
      case "cashout":
        return "bg-emerald-500/10";
      case "id_purchase":
        return "bg-primary/10";
    }
  };

  return (
    <div className="space-y-3 pt-2 animate-fade-in" dir="rtl">
      <p className="text-sm font-bold text-center text-foreground">سجل العمليات</p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>لا توجد عمليات سابقة</p>
        </div>
      ) : (
        <div className="max-h-[340px] overflow-y-auto space-y-1.5 scrollbar-thin">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className={`flex items-center gap-2.5 rounded-xl p-2.5 ${getBg(tx.type)} border border-border/10`}
            >
              <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
                {getIcon(tx.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">{tx.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{tx.detail}</p>
              </div>
              <div className="text-left shrink-0">
                {tx.amount > 0 && (
                  <p className={`text-xs font-black ${tx.type === "gift_received" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "gift_received" ? "+" : "-"}{tx.amount}
                  </p>
                )}
                <p className="text-[9px] text-muted-foreground">
                  {format(new Date(tx.date), "dd/MM")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onBack} className="w-full text-center text-sm text-muted-foreground py-1">
        رجوع
      </button>
    </div>
  );
};

export default StarTransactionHistory;
