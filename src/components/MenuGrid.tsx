import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Headset, Fingerprint, Crown, Gift,
  Sparkles, PlayCircle, Frame, ShieldCheck, FileText,
} from "lucide-react";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  route: string;
  gradient: string;
  shadowColor: string;
}

const menuItems: MenuItem[] = [
  {
    icon: Wallet,
    label: "سحب راتب",
    route: "/salary",
    gradient: "from-emerald-500 to-emerald-700",
    shadowColor: "shadow-emerald-500/20",
  },
  {
    icon: Headset,
    label: "الدعم السريع",
    route: "/support",
    gradient: "from-blue-500 to-blue-700",
    shadowColor: "shadow-blue-500/20",
  },
  {
    icon: Fingerprint,
    label: "تغيير الآيدي",
    route: "/change-id",
    gradient: "from-purple-500 to-purple-700",
    shadowColor: "shadow-purple-500/20",
  },
  {
    icon: Crown,
    label: "طلب VIP",
    route: "/request-vip",
    gradient: "from-yellow-400 to-amber-600",
    shadowColor: "shadow-yellow-500/30",
  },
  {
    icon: Gift,
    label: "هدية مخصصة",
    route: "/gift",
    gradient: "from-pink-500 to-rose-600",
    shadowColor: "shadow-pink-500/20",
  },
  {
    icon: Sparkles,
    label: "دخولية",
    route: "/gift",
    gradient: "from-cyan-400 to-teal-600",
    shadowColor: "shadow-cyan-500/20",
  },
  {
    icon: PlayCircle,
    label: "صورة متحركة",
    route: "/gift",
    gradient: "from-orange-400 to-orange-600",
    shadowColor: "shadow-orange-500/20",
  },
  {
    icon: Frame,
    label: "إطار",
    route: "/gift",
    gradient: "from-indigo-400 to-indigo-600",
    shadowColor: "shadow-indigo-500/20",
  },
  {
    icon: ShieldCheck,
    label: "توثيق BD",
    route: "/bd-request",
    gradient: "from-red-500 to-red-700",
    shadowColor: "shadow-red-500/20",
  },
  {
    icon: FileText,
    label: "طلباتي",
    route: "/my-requests",
    gradient: "from-teal-400 to-teal-600",
    shadowColor: "shadow-teal-500/20",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.15 },
  },
};

const itemVariant = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
};

const MenuGrid: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 mb-28"
    >
      {menuItems.map((menuItem, index) => {
        const Icon = menuItem.icon;
        return (
          <motion.button
            key={index}
            variants={itemVariant}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(menuItem.route)}
            className={`relative overflow-hidden rounded-2xl p-4 flex items-center gap-3 text-right transition-all ${menuItem.shadowColor} shadow-lg`}
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${menuItem.gradient} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-[13px] font-bold text-foreground leading-tight">{menuItem.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export default MenuGrid;
