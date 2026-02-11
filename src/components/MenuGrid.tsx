import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Headset, Fingerprint, Crown, Gift,
  Sparkles, PlayCircle, Frame, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import GuestLoginPrompt from "./GuestLoginPrompt";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  route: string;
  bg: string;
  iconColor: string;
  guestAllowed?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: Wallet, label: "سحب راتب", route: "/salary", bg: "rgba(34,197,94,0.12)", iconColor: "text-emerald-400" },
  { icon: Headset, label: "الدعم السريع", route: "/support", bg: "rgba(59,130,246,0.12)", iconColor: "text-blue-400" },
  { icon: Fingerprint, label: "تغيير الآيدي", route: "/change-id", bg: "rgba(168,85,247,0.12)", iconColor: "text-purple-400" },
  { icon: Crown, label: "طلب VIP", route: "/request-vip", bg: "rgba(234,179,8,0.12)", iconColor: "text-yellow-400" },
  { icon: Gift, label: "هدية مخصصة", route: "/gift", bg: "rgba(236,72,153,0.12)", iconColor: "text-pink-400" },
  { icon: Sparkles, label: "دخولية", route: "/entry-request", bg: "rgba(6,182,212,0.12)", iconColor: "text-cyan-400", guestAllowed: true },
  { icon: PlayCircle, label: "صورة متحركة", route: "/animated-photo", bg: "rgba(249,115,22,0.12)", iconColor: "text-orange-400" },
  { icon: Frame, label: "إطار", route: "/frames", bg: "rgba(99,102,241,0.12)", iconColor: "text-indigo-400", guestAllowed: true },
  { icon: ShieldCheck, label: "توثيق BD", route: "/bd-request", bg: "rgba(239,68,68,0.12)", iconColor: "text-red-400" },
];

const MenuGrid: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const handleClick = (item: MenuItem) => {
    if (!isAuthenticated && !item.guestAllowed) {
      setShowLogin(true);
      return;
    }
    navigate(item.route);
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-y-4 gap-x-1.5 mb-24 px-1" dir="rtl">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => handleClick(item)}
              className="flex flex-col items-center gap-1 active:scale-90 active:-translate-y-1 transition-transform duration-150"
            >
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                style={{
                  background: item.bg,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground leading-tight text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <GuestLoginPrompt open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default MenuGrid;
