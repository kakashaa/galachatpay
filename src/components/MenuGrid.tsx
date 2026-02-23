import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Headset, Fingerprint, Crown, Gift,
  Sparkles, PlayCircle, Frame, FileText, Sticker, Briefcase, Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import GuestLoginPrompt from "./GuestLoginPrompt";
import { supabase } from "@/integrations/supabase/client";

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
  { icon: Headset, label: "دعم سريع", route: "/support", bg: "rgba(59,130,246,0.12)", iconColor: "text-blue-400" },
  { icon: Fingerprint, label: "تغيير الآيدي", route: "/change-id", bg: "rgba(168,85,247,0.12)", iconColor: "text-purple-400" },
  { icon: Crown, label: "طلب VIP", route: "/request-vip", bg: "rgba(234,179,8,0.12)", iconColor: "text-yellow-400" },
  { icon: Gift, label: "هدية مخصصة", route: "/custom-gift", bg: "rgba(236,72,153,0.12)", iconColor: "text-pink-400" },
  { icon: Sparkles, label: "دخولية", route: "/entry-request", bg: "rgba(6,182,212,0.12)", iconColor: "text-cyan-400", guestAllowed: true },
  { icon: PlayCircle, label: "صورة متحركة", route: "/animated-photo", bg: "rgba(249,115,22,0.12)", iconColor: "text-orange-400" },
  { icon: Frame, label: "إطار", route: "/frames", bg: "rgba(99,102,241,0.12)", iconColor: "text-indigo-400", guestAllowed: true },
  { icon: Sticker, label: "شعرات", route: "/hairs", bg: "rgba(251,191,36,0.12)", iconColor: "text-amber-400" },
  { icon: Briefcase, label: "works", route: "/bd", bg: "rgba(212,165,116,0.15)", iconColor: "text-[#D4A574]" },
  { icon: FileText, label: "السياسة", route: "/policy", bg: "rgba(100,116,139,0.12)", iconColor: "text-slate-400", guestAllowed: true },
];

const MenuGrid: React.FC<{ extraButton?: React.ReactNode }> = ({ extraButton }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [bdBanned, setBdBanned] = useState(false);

  useEffect(() => {
    if (!user?.uuid) return;
    const checkBdBan = async () => {
      try {
        const { data } = await supabase
          .from("bd_commission_settings")
          .select("is_active, is_approved, banned_at")
          .eq("bd_uuid", user.uuid)
          .maybeSingle();
        if (data && !data.is_active && !data.is_approved) {
          setBdBanned(true);
        } else {
          setBdBanned(false);
        }
      } catch {
        // silent
      }
    };
    checkBdBan();
  }, [user?.uuid]);

  const handleClick = (item: MenuItem) => {
    if (!isAuthenticated && !item.guestAllowed) {
      setShowLogin(true);
      return;
    }
    navigate(item.route);
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-y-4 gap-x-1.5 mb-44 px-1" dir="rtl">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isBdItem = item.route === "/bd";
          const showLock = isBdItem && bdBanned;

          return (
            <button
              key={index}
              onClick={() => handleClick(item)}
              className="flex flex-col items-center gap-1 active:scale-90 active:-translate-y-1 transition-transform duration-150"
            >
              <div
                className="relative w-12 h-12 rounded-[14px] flex items-center justify-center"
                style={{
                  background: showLock ? "rgba(239,68,68,0.12)" : item.bg,
                  border: showLock ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {showLock ? (
                  <Lock className="w-5 h-5 text-red-400" />
                ) : (
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                )}
                {showLock && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">!</span>
                  </div>
                )}
              </div>
              <span className={`text-[9px] font-bold leading-tight text-center ${showLock ? "text-red-400" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {extraButton}
      </div>
      <GuestLoginPrompt open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default MenuGrid;