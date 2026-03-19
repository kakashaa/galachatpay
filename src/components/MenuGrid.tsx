import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Headset, Fingerprint, Crown, Gift,
  Sparkles, PlayCircle, Frame, FileText, BadgeCheck, Briefcase,
  Ban, Clock, Construction, Landmark, AlertTriangle,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBanCheck } from "@/hooks/use-ban-check";
import { useElementSettings } from "@/hooks/use-element-settings";
import GuestLoginPrompt from "./GuestLoginPrompt";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";

const isEligibleForQuickSupport = (user: any): boolean => {
  if (!user) return false;
  const vipLevel = user.vip?.vip_level || user.vip?.level || 0;
  const isHostAgent = (user.agency_id || 0) > 0;
  const typeUser = user.type_user || 0;
  const isAgentType = [2, 4, 5, 6].includes(typeUser);
  return vipLevel >= 5 || isHostAgent || isAgentType;
};

interface MenuItem {
  icon: React.ElementType;
  label: string;
  route: string;
  bg: string;
  iconColor: string;
  guestAllowed?: boolean;
  banKey?: string;
  isSpecial?: boolean;
}

const ELEMENT_LABELS: Record<string, string> = {
  entries: "🎁 دخوليات",
  frames: "🖼️ إطارات",
  gifts: "🎀 هدايا مخصصة",
  animated_photos: "📸 صور متحركة",
  change_id: "🔄 تغيير آيدي",
  hairs: "💇 تسريحات",
  vip: "⭐ VIP",
  salary: "💰 رواتب",
  quick_support: "🎧 دعم سريع",
  works: "💼 works",
  stars: "🌟 نجومي",
};

const MenuGrid: React.FC<{ extraButton?: React.ReactNode }> = ({ extraButton }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isElementBanned, activeBan, getRemainingTime } = useBanCheck(user?.uuid);
  const { isElementEnabled } = useElementSettings();
  const [showLogin, setShowLogin] = useState(false);
  const [bdBanned, setBdBanned] = useState(false);
  const [banDialog, setBanDialog] = useState<{ open: boolean; elementKey: string }>({ open: false, elementKey: "" });
  const [disabledDialog, setDisabledDialog] = useState<{ open: boolean; label: string }>({ open: false, label: "" });

  const agencyLoggedIn = !!localStorage.getItem("ghala_token") && localStorage.getItem("ghala_type") === "agent";

  const menuItems: MenuItem[] = [
    { icon: Wallet, label: "سحب راتب", route: "/salary", bg: "rgba(34,197,94,0.12)", iconColor: "text-emerald-400", banKey: "salary" },
    { icon: Headset, label: "دعم سريع", route: "/support", bg: "rgba(59,130,246,0.12)", iconColor: "text-blue-400", banKey: "quick_support", isSpecial: true },
    { icon: Fingerprint, label: "تغيير الآيدي", route: "/change-id", bg: "rgba(168,85,247,0.12)", iconColor: "text-purple-400", banKey: "change_id" },
    { icon: Crown, label: "طلب VIP", route: "/request-vip", bg: "rgba(234,179,8,0.12)", iconColor: "text-yellow-400", banKey: "vip" },
    { icon: Gift, label: "هدية مخصصة", route: "/custom-gift", bg: "rgba(236,72,153,0.12)", iconColor: "text-pink-400", banKey: "gifts" },
    { icon: Sparkles, label: "دخولية", route: "/entry-request", bg: "rgba(6,182,212,0.12)", iconColor: "text-cyan-400", guestAllowed: true, banKey: "entries" },
    { icon: PlayCircle, label: "صورة متحركة", route: "/animated-photo", bg: "rgba(249,115,22,0.12)", iconColor: "text-orange-400", banKey: "animated_photos" },
    { icon: Frame, label: "إطار", route: "/frames", bg: "rgba(99,102,241,0.12)", iconColor: "text-indigo-400", guestAllowed: true, banKey: "frames" },
    { icon: BadgeCheck, label: "مركز الشارة", route: "/hairs", bg: "rgba(251,191,36,0.12)", iconColor: "text-amber-400", banKey: "hairs" },
    { icon: Briefcase, label: "البيدي", route: "/works", bg: "rgba(212,165,116,0.15)", iconColor: "text-[#D4A574]", banKey: "works" },
    ...(agencyLoggedIn ? [{ icon: Landmark, label: "وكالة الشحن", route: "/agent", bg: "rgba(245,158,11,0.12)", iconColor: "text-amber-400", guestAllowed: true }] : []),
    { icon: AlertTriangle, label: "بلاغ على أدمن", route: "/admin-complaint", bg: "rgba(239,68,68,0.12)", iconColor: "text-red-400" },
    { icon: FileText, label: "السياسة", route: "/policy", bg: "rgba(100,116,139,0.12)", iconColor: "text-slate-400", guestAllowed: true },
  ];

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
    // Check if element is disabled globally
    if (item.banKey && !isElementEnabled(item.banKey)) {
      setDisabledDialog({ open: true, label: item.label });
      return;
    }
    // Check element ban
    if (item.banKey && isElementBanned(item.banKey)) {
      setBanDialog({ open: true, elementKey: item.banKey });
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
          const isBanned = item.banKey ? isElementBanned(item.banKey) : false;
          const isSpecialEligible = item.isSpecial && isEligibleForQuickSupport(user);

          if (isSpecialEligible && !isBanned) {
            return (
              <button
                key={index}
                onClick={() => handleClick(item)}
                className="flex flex-col items-center gap-1 active:scale-90 active:-translate-y-1 transition-transform duration-150"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(59,130,246,0.5)",
                      "0 0 0 10px rgba(59,130,246,0)",
                      "0 0 0 0 rgba(59,130,246,0)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative w-12 h-12 rounded-[14px] flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25))",
                    border: "1px solid rgba(99,102,241,0.4)",
                  }}
                >
                  <Icon className="w-5 h-5 text-blue-300" />
                  <div className="absolute -top-1.5 -left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                    style={{ background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(271 81% 56%))", boxShadow: "0 2px 8px rgba(99,102,241,0.4)" }}>
                    <Zap className="w-2 h-2 text-white" />
                    <span className="text-[7px] font-black text-white leading-none">فوري</span>
                  </div>
                </motion.div>
                <span className="text-[9px] font-bold leading-tight text-center text-blue-300">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => handleClick(item)}
              className="flex flex-col items-center gap-1 active:scale-90 active:-translate-y-1 transition-transform duration-150"
            >
              <div
                className="relative w-12 h-12 rounded-[14px] flex items-center justify-center"
                style={{
                  background: showLock || isBanned ? "rgba(239,68,68,0.12)" : item.bg,
                  border: showLock || isBanned ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {showLock || isBanned ? (
                  <Ban className="w-5 h-5 text-red-400" />
                ) : (
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                )}
                {(showLock || isBanned) && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">!</span>
                  </div>
                )}
              </div>
              <span className={`text-[9px] font-bold leading-tight text-center ${showLock || isBanned ? "text-red-400" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {extraButton}
      </div>

      {/* Element Ban Dialog */}
      <Dialog open={banDialog.open} onOpenChange={(o) => setBanDialog({ ...banDialog, open: o })}>
        <DialogContent className="max-w-xs text-center p-6 rounded-2xl border-destructive/30 bg-background" dir="rtl">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-3">
            <Ban className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-destructive mb-1">🚫 محظور</h3>
          <p className="text-sm text-muted-foreground mb-3">
            تم حظرك من استخدام <span className="font-bold text-foreground">{ELEMENT_LABELS[banDialog.elementKey] || banDialog.elementKey}</span>
          </p>

          {activeBan?.reason && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 mb-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">السبب</p>
              <p className="text-sm font-medium text-foreground">{activeBan.reason}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">المدة المتبقية:</span>
            <span className="font-bold text-foreground">{getRemainingTime()}</span>
          </div>

          <p className="text-[10px] text-muted-foreground">
            إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم الفني
          </p>
        </DialogContent>
      </Dialog>

      {/* Element Disabled Dialog */}
      <Dialog open={disabledDialog.open} onOpenChange={(o) => setDisabledDialog({ ...disabledDialog, open: o })}>
        <DialogContent className="max-w-xs text-center p-6 rounded-2xl border-border bg-background" dir="rtl">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
            <Construction className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">🚧 قيد التطوير</h3>
          <p className="text-sm text-muted-foreground mb-3">
            <span className="font-bold text-foreground">{disabledDialog.label}</span> قيد التطوير حالياً
          </p>
          <p className="text-xs text-muted-foreground">
            سوف يتوفر قريباً إن شاء الله
          </p>
        </DialogContent>
      </Dialog>

      <GuestLoginPrompt open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default MenuGrid;