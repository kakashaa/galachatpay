import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, DollarSign, TrendingDown, CheckCircle, Clock, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SalaryEntry {
  month: number;
  year: number;
  sallary: number;
  cut_amount: number;
  is_paid: number;
}

interface SalaryData {
  ok: boolean;
  user: { uuid: number; name: string; di: number; agency_id: number; sender_level: number };
  agency_name: string;
  salaries: SalaryEntry[];
}

const monthNames: Record<number, string> = {
  1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل", 5: "مايو", 6: "يونيو",
  7: "يوليو", 8: "أغسطس", 9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر",
};

interface Props { userUuid: string; }

const SalaryHistory: React.FC<Props> = ({ userUuid }) => {
  const [data, setData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSalary = async () => {
      setLoading(true);
      try {
        const { data: res, error: fnErr } = await supabase.functions.invoke("bd-data", {
          body: { action: "host-salary", uuid: userUuid },
        });
        if (fnErr) throw fnErr;
        if (res?.ok) setData(res);
        else setError("لا توجد بيانات رواتب");
      } catch {
        setError("فشل جلب بيانات الراتب");
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, [userUuid]);

  if (loading) {
    return (
      <div className="glass-card p-4 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-4 text-center">
        <p className="text-xs text-muted-foreground">{error || "لا توجد بيانات"}</p>
      </div>
    );
  }

  const currentSalary = data.salaries?.[0];
  const net = currentSalary ? currentSalary.sallary - currentSalary.cut_amount : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Current Month Summary */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> سجل الرواتب
        </h3>

        {/* Agency Info */}
        <div className="flex items-center gap-2 p-2.5 bg-primary/5 rounded-xl">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">الوكالة:</span>
          <span className="text-xs font-bold text-foreground">{data.agency_name}</span>
        </div>

        {currentSalary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-emerald-400 mb-1">الراتب</p>
              <p className="text-base font-bold text-emerald-400">${currentSalary.sallary}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-red-400 mb-1">الخصم</p>
              <p className="text-base font-bold text-red-400">${currentSalary.cut_amount}</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-primary mb-1">الصافي</p>
              <p className="text-base font-bold text-primary">${net}</p>
            </div>
          </div>
        )}
      </div>

      {/* Salary History Table */}
      {data.salaries.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-primary" /> آخر 6 أشهر
          </h3>
          <div className="space-y-2">
            {data.salaries.map((s, i) => {
              const sNet = s.sallary - s.cut_amount;
              return (
                <motion.div
                  key={`${s.month}-${s.year}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between bg-muted/20 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.is_paid ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
                      {s.is_paid ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{monthNames[s.month]} {s.year}</p>
                      <p className="text-[10px] text-muted-foreground">{s.is_paid ? "مدفوع" : "بانتظار الدفع"}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">${sNet}</p>
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span>${s.sallary}</span>
                      <TrendingDown className="w-2.5 h-2.5 text-red-400" />
                      <span className="text-red-400">${s.cut_amount}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SalaryHistory;
