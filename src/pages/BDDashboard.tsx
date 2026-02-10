import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Briefcase, User, Crown, Link2, Copy, Users, DollarSign, TrendingUp, Building2, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const BDDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Demo BD data
  const bd = {
    id: "123456789",
    name: "محمد أحمد",
    level: 35,
    vipLevel: 3,
    referralLink: "https://gala.live/ref/bd-123456789",
    totalRegistrations: 24,
    totalAgencies: 3,
    totalRechargeFromUsers: 485000,
    commission2Percent: 9700,
    agencyCommission: 3200,
    totalEarnings: 12900,
    isPaid: false,
  };

  const registrations = [
    { id: "user001", name: "أحمد علي", type: "مستخدم", recharge: 15000, commission: 300 },
    { id: "user002", name: "سارة محمد", type: "مستخدم", recharge: 32000, commission: 640 },
    { id: "user003", name: "خالد عبدالله", type: "وكيل", recharge: 120000, commission: 2400 },
    { id: "user004", name: "فاطمة حسن", type: "مستخدم", recharge: 8500, commission: 170 },
    { id: "user005", name: "عمر يوسف", type: "وكيل", recharge: 95000, commission: 1900 },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bd.referralLink);
    toast({ title: "تم النسخ", description: "تم نسخ الرابط بنجاح" });
  };

  return (
    <MobileLayout showHeader headerTitle="صفحة BD" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        {/* BD Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{bd.name}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success" /> BD معتمد
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">ID</span>
              <span className="font-bold text-foreground">{bd.id}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">VIP</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <Crown className="w-3 h-3" /> {bd.vipLevel}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Referral Link */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            رابط الإحالة الخاص بك
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2.5 bg-muted/30 rounded-lg text-xs text-muted-foreground truncate" dir="ltr">
              {bd.referralLink}
            </div>
            <Button onClick={handleCopyLink} size="sm" variant="outline" className="shrink-0 border-primary/30 text-primary">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">شارك هذا الرابط لتسجيل مستخدمين جدد واحتساب النسب</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{bd.totalRegistrations}</p>
            <p className="text-[10px] text-muted-foreground">إجمالي التسجيلات</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{bd.totalAgencies}</p>
            <p className="text-[10px] text-muted-foreground">الوكالات المفتوحة</p>
          </div>
          <div className="glass-card p-3 text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{bd.totalRechargeFromUsers.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">إجمالي الشحن</p>
          </div>
          <div className="glass-card p-3 text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">{bd.totalEarnings.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">إجمالي الأرباح</p>
          </div>
        </motion.div>

        {/* Commission Breakdown */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            تفاصيل الأرباح
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">نسبة 2% من الشحن</span>
              <span className="font-bold text-foreground">{bd.commission2Percent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">عمولة الوكالات</span>
              <span className="font-bold text-foreground">{bd.agencyCommission.toLocaleString()}</span>
            </div>
            <div className="flex justify-between bg-primary/10 rounded-lg p-2.5 border border-primary/20">
              <span className="text-primary font-semibold">الإجمالي</span>
              <span className="font-bold text-primary">{bd.totalEarnings.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">تُصرف المكافآت في نهاية كل شهر</p>
        </motion.div>

        {/* Registrations List */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            التسجيلات عبر رابطك
          </h3>
          <div className="space-y-2">
            {registrations.map((reg, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{reg.name}</p>
                    <p className="text-[10px] text-muted-foreground">{reg.type} • ID: {reg.id}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground">{reg.recharge.toLocaleString()}</p>
                  <p className="text-[10px] text-primary">+{reg.commission.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default BDDashboard;
