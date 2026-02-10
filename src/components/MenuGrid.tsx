import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Headset, Fingerprint, Crown, Gift,
  Sparkles, PlayCircle, Frame, ShieldCheck,
} from "lucide-react";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  iconColor: string;
  bgColor: string;
  borderHighlight?: boolean;
}

const menuItems: MenuItem[] = [
  {
    icon: <Wallet className="w-6 h-6" />,
    label: "سحب راتب",
    route: "/salary",
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: <Headset className="w-6 h-6" />,
    label: "الدعم السريع",
    route: "/support",
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: <Fingerprint className="w-6 h-6" />,
    label: "تغيير الآيدي",
    route: "/change-id",
    iconColor: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: <Crown className="w-6 h-6" />,
    label: "طلب VIP",
    route: "/request-vip",
    iconColor: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderHighlight: true,
  },
  {
    icon: <Gift className="w-6 h-6" />,
    label: "هدية مخصصة",
    route: "/gift",
    iconColor: "text-pink-400",
    bgColor: "bg-pink-500/10",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    label: "دخولية",
    route: "/gift",
    iconColor: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  {
    icon: <PlayCircle className="w-6 h-6" />,
    label: "صورة متحركة",
    route: "/gift",
    iconColor: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: <Frame className="w-6 h-6" />,
    label: "إطار",
    route: "/gift",
    iconColor: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    label: "توثيق BD",
    route: "/bd-request",
    iconColor: "text-red-400",
    bgColor: "bg-red-500/10",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const MenuGrid: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-3 mb-12"
    >
      {menuItems.map((menuItem, index) => (
        <motion.button
          key={index}
          variants={item}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(menuItem.route)}
          className={`glass-card rounded-2xl p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform ${
            menuItem.borderHighlight ? "border-yellow-500/20" : ""
          }`}
        >
          <div className={`w-12 h-12 rounded-xl icon-glass flex items-center justify-center relative overflow-hidden ${
            menuItem.borderHighlight ? "border border-yellow-500/30" : ""
          }`}>
            <div className={`absolute inset-0 ${menuItem.bgColor}`} />
            <span className={`${menuItem.iconColor} z-10`}>{menuItem.icon}</span>
          </div>
          <span className="text-[11px] font-medium text-gray-200">{menuItem.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};

export default MenuGrid;
