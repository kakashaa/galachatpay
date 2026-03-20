import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Coins, Gift, Zap, Loader2, DollarSign, TrendingDown,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import SalaryRequestsHistory from "@/components/SalaryRequestsHistory";

const API = "https://galachat.site/project-z/api.php";
const USD_TO_COINS = 7500;

interface SalaryInfo {
  salary: number;
  deduction: number;
  net: number;
  loading: boolean;
  error: boolean;
}

const SalaryHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [salary, setSalary] = useState<SalaryInfo>({ salary: 0, deduction: 0, net: 0, loading: true, error: false });

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchSalary();
  }, [user?.uuid]);

  const fetchSalary = async () => {
    setSalary(s => ({ ...s, loading: true, error: false }));
    try {
      // Try salary_check first (has deduction/net), fallback to salary_check_all
      const res = await fetch(`${API}?action=salary_check&uuid=${user!.uuid}`);
      const data = await res.json();

      const salaryAmount = data?.salary ?? data?.salary_usd ?? data?.total_salary ?? data?.amount ?? 0;
      const deduction = data?.deduction ?? 0;
      const net = data?.net ?? (salaryAmount - deduction);

      setSalary({ salary: salaryAmount, deduction, net, loading: false, error: false });
    } catch {
      // Fallback to salary_check_all
      try {
        const res2 = await fetch(`${API}?action=salary_check_all&uuid=${user!.uuid}`);
        const data2 = await res2.json();
        const amount = data2?.salary_usd ?? data2?.total_salary ?? data2?.amount ?? 0;
        setSalary({ salary: amount, deduction: 0, net: amount, loading: false, error: false });
      } catch {
        setSalary({ salary: 0, deduction: 0, net: 0, loading: false, error: true });
      }
    }
  };

  if (!user) return null;

  const options = [
    {
      id: "cash",
      icon: Wallet,
      label: "سحب نقدي",
      desc: "تحويل بنكي",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      route: "/salary/cash",
    },
    {
      id: "charge_self",
      icon: Coins,
      label: "شحن لحسابي",
      desc: "كوينزات بحسابك",
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      route: "/salary/charge-self",
    },
    {
      id: "charge_other",
      icon: Gift,
      label: "شحن لحساب آخر",
      desc: "أرسل لصديقك",
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
      route: "/salary/charge-other",
    },
    {
      id: "instant",
      icon: Zap,
      label: "سحب فوري",
      desc: "بيع كوينزاتك",
      color: "text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/20",
      route: "/salary/instant",
    },
  ];

  return (
    <MobileLayout showHeader headerTitle="راتبي" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-6 space-y-6">
        {/* Salary display */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card p-6 text-center space-y-3"
        >
          <p className="text-sm text-muted-foreground">راتبك هذا الشهر</p>
          {salary.loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          ) : salary.error ? (
            <p className="text-sm text-destructive">فشل جلب الراتب</p>
          ) : (
            <>
              {/* Full salary */}
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-400" />
                <p className="text-3xl font-black text-foreground tabular-nums" dir="ltr">
                  {salary.salary.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground tabular-nums">
                {(salary.salary * USD_TO_COINS).toLocaleString()} كوينز
              </p>

              {/* Deduction & remaining */}
              {salary.deduction > 0 && (
                <div className="flex items-center justify-center gap-4 pt-2 border-t border-border/20">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs text-red-400 font-bold tabular-nums" dir="ltr">
                      تم صرف ${salary.deduction.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-border/30" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-emerald-400 font-bold tabular-nums" dir="ltr">
                      المتبقي ${salary.net.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* 4 options grid */}
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, i) => {
            const Icon = opt.icon;
            return (
              <motion.button
                key={opt.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate(opt.route)}
                className={`glass-card p-5 text-center space-y-2 border ${opt.bg} active:scale-[0.97] transition-transform`}
              >
                <div className={`w-12 h-12 rounded-2xl ${opt.bg} flex items-center justify-center mx-auto`}>
                  <Icon className={`w-6 h-6 ${opt.color}`} />
                </div>
                <p className="font-bold text-sm text-foreground">{opt.label}</p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Request history */}
        <SalaryRequestsHistory userUuid={user.uuid} />
      </div>
    </MobileLayout>
  );
};

export default SalaryHome;