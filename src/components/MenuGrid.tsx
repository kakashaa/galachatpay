import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { IdCard, Crown, Wallet, ShieldAlert, Headset, Gift } from "lucide-react";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  route: string;
  color: string;
}

const menuItems: MenuItem[] = [
  {
    icon: <IdCard className="w-7 h-7" />,
    label: "تغيير الـ ID",
    description: "تغيير معرف حسابك",
    route: "/change-id",
    color: "from-amber-500/20 to-amber-700/10",
  },
  {
    icon: <Crown className="w-7 h-7" />,
    label: "طلب VIP",
    description: "VIP من 1 إلى 6",
    route: "/request-vip",
    color: "from-yellow-500/20 to-orange-700/10",
  },
  {
    icon: <Wallet className="w-7 h-7" />,
    label: "سحب الراتب",
    description: "شهري أو فوري",
    route: "/salary",
    color: "from-emerald-500/20 to-emerald-700/10",
  },
  {
    icon: <ShieldAlert className="w-7 h-7" />,
    label: "بلاغ / حظر",
    description: "رفع بلاغ أو طلب حظر",
    route: "/report",
    color: "from-red-500/20 to-red-700/10",
  },
  {
    icon: <Headset className="w-7 h-7" />,
    label: "الدعم السريع",
    description: "تواصل مع الدعم",
    route: "/support",
    color: "from-blue-500/20 to-blue-700/10",
  },
  {
    icon: <Gift className="w-7 h-7" />,
    label: "طلب هدية",
    description: "مخصصة أو إطار",
    route: "/gift",
    color: "from-purple-500/20 to-pink-700/10",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const MenuGrid: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 px-5 mt-6 pb-8"
    >
      {menuItems.map((menuItem, index) => (
        <motion.button
          key={index}
          variants={item}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate(menuItem.route)}
          className={`glass-card p-4 flex flex-col items-center gap-3 text-center active:scale-95 transition-transform bg-gradient-to-br ${menuItem.color}`}
        >
          <div className="text-primary">{menuItem.icon}</div>
          <div>
            <p className="text-sm font-bold text-foreground">{menuItem.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{menuItem.description}</p>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
};

export default MenuGrid;
