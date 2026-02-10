import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Crown, Check, Lock, Users } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";

interface VipTier {
  level: number;
  label: string;
  description: string;
  available: boolean;
  requiresCheck: boolean;
  color: string;
}

const vipTiers: VipTier[] = [
  { level: 1, label: "VIP 1", description: "مجاني - 7 أيام شهرياً", available: true, requiresCheck: false, color: "from-amber-600/30 to-amber-800/10" },
  { level: 2, label: "VIP 2", description: "مجاني - 7 أيام شهرياً", available: true, requiresCheck: false, color: "from-amber-500/30 to-orange-700/10" },
  { level: 3, label: "VIP 3", description: "مجاني - 7 أيام شهرياً", available: true, requiresCheck: false, color: "from-yellow-500/30 to-amber-700/10" },
  { level: 4, label: "VIP 4", description: "يتطلب استيفاء شروط", available: false, requiresCheck: true, color: "from-yellow-400/30 to-yellow-700/10" },
  { level: 5, label: "VIP 5", description: "يتطلب استيفاء شروط", available: false, requiresCheck: true, color: "from-yellow-300/30 to-yellow-600/10" },
  { level: 6, label: "VIP 6", description: "خاص - شروط متقدمة", available: false, requiresCheck: true, color: "from-yellow-200/30 to-yellow-500/10" },
];

// Demo user type: 0=user, 1=host, 2=host agent, 3=recharge agent, 4=both agents
const userRoleLabels: Record<number, string> = {
  0: "مستخدم",
  1: "مضيف",
  2: "وكيل مضيفين",
  3: "وكيل شحن",
  4: "وكيل مضيفين وشحن",
};

const RequestVip: React.FC = () => {
  const navigate = useNavigate();
  const [selectedVip, setSelectedVip] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Demo data
  const userRole = 0;
  const isAgent = userRole >= 2;

  const handleRequest = () => {
    if (selectedVip === null) return;
    setSubmitted(true);
  };

  return (
    <MobileLayout showHeader headerTitle="طلب VIP" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-6 space-y-6">
        {/* User Role */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">نوع حسابك</p>
              <p className="text-xs text-primary font-semibold">{userRoleLabels[userRole]}</p>
            </div>
          </div>
          {isAgent && (
            <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-xs text-primary">بصفتك وكيلاً، يمكنك رفع طلب VIP لـ 5 أشخاص شهرياً</p>
            </div>
          )}
        </motion.div>

        {/* VIP Tiers */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">اختر نوع الـ VIP</h3>
          <div className="space-y-3">
            {vipTiers.map((tier, idx) => (
              <motion.button
                key={tier.level}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  if (tier.available || isAgent) {
                    setSelectedVip(tier.level);
                    setSubmitted(false);
                  }
                }}
                className={`w-full glass-card p-4 flex items-center gap-4 text-right transition-all bg-gradient-to-br ${tier.color} ${
                  selectedVip === tier.level ? "ring-2 ring-primary border-primary/50" : ""
                } ${!tier.available && !isAgent ? "opacity-50" : ""}`}
              >
                <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
                  <Crown className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{tier.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{tier.description}</p>
                </div>
                {selectedVip === tier.level ? (
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                ) : !tier.available && !isAgent ? (
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : null}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Submit */}
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.3)] rounded-xl text-center"
          >
            <Check className="w-8 h-8 text-[hsl(var(--success-foreground))] mx-auto mb-2" />
            <p className="text-sm font-bold text-[hsl(var(--success-foreground))]">تم إرسال طلب VIP {selectedVip} بنجاح!</p>
          </motion.div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRequest}
            disabled={selectedVip === null}
            className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          >
            <Crown className="w-5 h-5" />
            تقديم الطلب
          </motion.button>
        )}
      </div>
    </MobileLayout>
  );
};

export default RequestVip;
