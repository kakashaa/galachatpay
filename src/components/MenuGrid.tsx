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
  bg: string;
  iconColor: string;
}

const menuItems: MenuItem[] = [
  { icon: Wallet, label: "سحب راتب", route: "/salary", bg: "rgba(34,197,94,0.12)", iconColor: "text-emerald-400" },
  { icon: Headset, label: "الدعم السريع", route: "/support", bg: "rgba(59,130,246,0.12)", iconColor: "text-blue-400" },
  { icon: Fingerprint, label: "تغيير الآيدي", route: "/change-id", bg: "rgba(168,85,247,0.12)", iconColor: "text-purple-400" },
  { icon: Crown, label: "طلب VIP", route: "/request-vip", bg: "rgba(234,179,8,0.12)", iconColor: "text-yellow-400" },
  { icon: Gift, label: "هدية مخصصة", route: "/gift", bg: "rgba(236,72,153,0.12)", iconColor: "text-pink-400" },
  { icon: Sparkles, label: "دخولية", route: "/gift", bg: "rgba(6,182,212,0.12)", iconColor: "text-cyan-400" },
  { icon: PlayCircle, label: "صورة متحركة", route: "/gift", bg: "rgba(249,115,22,0.12)", iconColor: "text-orange-400" },
  { icon: Frame, label: "إطار", route: "/gift", bg: "rgba(99,102,241,0.12)", iconColor: "text-indigo-400" },
  { icon: ShieldCheck, label: "توثيق BD", route: "/bd-request", bg: "rgba(239,68,68,0.12)", iconColor: "text-red-400" },
  { icon: FileText, label: "طلباتي", route: "/my-requests", bg: "rgba(20,184,166,0.12)", iconColor: "text-teal-400" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
};

const itemVariant = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 20 } },
};

const MenuGrid: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-4 gap-y-5 gap-x-2 mb-28 px-1"
      dir="rtl"
    >
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={index}
            variants={itemVariant}
            whileTap={{ scale: 0.8, y: -4 }}
            onClick={() => navigate(item.route)}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className="w-14 h-14 rounded-[16px] flex items-center justify-center transition-shadow"
              style={{
                background: item.bg,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Icon className={`w-6 h-6 ${item.iconColor}`} />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground leading-tight text-center">
              {item.label}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export default MenuGrid;
