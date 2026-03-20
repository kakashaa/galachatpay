import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Coins, Gift, Zap, Loader2, DollarSign,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import SalaryRequestsHistory from "@/components/SalaryRequestsHistory";

const API = "https://galachat.site/project-z/api.php";
const USD_TO_COINS = 7500;

interface SalaryInfo {
  salary_usd: number;
  loading: boolean;
  error: boolean;
}

const SalaryHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [salary, setSalary] = useState<SalaryInfo>({ salary_usd: 0, loading: true, error: false });

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchSalary();
  }, [user?.uuid]);

  const fetchSalary = async () => {
    setSalary(s => ({ ...s, loading: true, error: false }));
    try {
      const res = await fetch(`${API}?action=salary_check_all&uuid=${user!.uuid}`);
      const data = await res.json();
      const amount = data?.salary_usd ?? data?.total_salary ?? data?.amount ?? 0;
      setSalary({ salary_usd: amount, loading: false, error: false });
    } catch {
      setSalary({ salary_usd: 0, loading: false, error: true });
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
          className="glass-card p-6 text-center space-y-2"
        >
          <p className="text-sm text-muted-foreground">راتبك هذا الشهر</p>
          {salary.loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          ) : salary.error ? (
            <p className="text-sm text-destructive">فشل جلب الراتب</p>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-400" />
                <p className="text-3xl font-black text-foreground tabular-nums" dir="ltr">
                  {salary.salary_usd.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground tabular-nums">
                {(salary.salary_usd * USD_TO_COINS).toLocaleString()} كوينز
              </p>
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
