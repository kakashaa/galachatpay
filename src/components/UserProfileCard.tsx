import React, { useState, useEffect } from "react";
import { Copy, Sparkles, Gift, DollarSign, Crown } from "lucide-react";
import PulsingHelpIcon from "@/components/PulsingHelpIcon";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import avatarMale from "@/assets/avatar-male.png";
import avatarFemale from "@/assets/avatar-female.png";
import { getAvatarUrl } from "@/lib/utils";
import StarWalletDialog from "@/components/StarWalletDialog";
import StarSystemTutorial from "@/components/StarSystemTutorial";
import { useVipChime } from "@/hooks/use-vip-chime";

const getUserTypeLabel = (type: number): string => {
  switch (type) {
    case 0: return "مستخدم";
    case 1: return "مضيف";
    case 2: return "وكيل مضيفين";
    case 3: return "وكيل شحن";
    case 4: return "وكيل شحن ومضيفين";
    case 5: return "وكيل شحن ومضيف";
    case 6: return "الكل";
    default: return "مستخدم";
  }
};

const getMonthlyStars = (chargerLevel: number) => {
  if (chargerLevel >= 100) return 8;
  if (chargerLevel >= 90) return 7;
  if (chargerLevel >= 80) return 6;
  if (chargerLevel >= 70) return 5;
  if (chargerLevel >= 60) return 4;
  if (chargerLevel >= 50) return 3;
  if (chargerLevel >= 40) return 2;
  if (chargerLevel >= 30) return 1;
  return 0;
};

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const UserProfileCard: React.FC = () => {
  const { user } = useAuth();
  const [showStarWallet, setShowStarWallet] = useState(false);
  const [starWalletView, setStarWalletView] = useState<"main" | "cashout">("main");
  const [showTutorial, setShowTutorial] = useState(false);
  const [totalStars, setTotalStars] = useState(0);
  const [salaryData, setSalaryData] = useState<{ salary: number; deduction: number; net: number } | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  const hasVip = !!(user?.vip && Object.keys(user.vip).length > 0 &&
    ((user.vip as any).vip_level || (user.vip as any).level || 0) > 0);
  useVipChime(hasVip);

  useEffect(() => {
    if (!user?.uuid) return;
    let cancelled = false;
    const fetchStars = async () => {
      const currentMonth = getCurrentMonth();
      const { data } = await supabase
        .from("user_star_balance")
        .select("total_stars")
        .eq("user_uuid", user.uuid)
        .eq("current_month", currentMonth)
        .maybeSingle();
      if (cancelled) return;
      if (data) setTotalStars((data as any).total_stars ?? 0);
      else setTotalStars(getMonthlyStars(user.level?.charger_level ?? 0));
    };
    fetchStars();
    return () => { cancelled = true; };
  }, [user?.uuid]);

  useEffect(() => {
    if (!user?.uuid) return;
    let cancelled = false;
    setSalaryLoading(true);
    fetch(`https://galachat.site/project-z/api.php?action=salary_check&uuid=${user.uuid}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.has_salary) setSalaryData({ salary: data.salary, deduction: data.deduction, net: data.net });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSalaryLoading(false); });
    return () => { cancelled = true; };
  }, [user?.uuid]);

  const handleOpenWallet = (view: "main" | "cashout") => {
    setStarWalletView(view);
    requestAnimationFrame(() => setShowStarWallet(true));
  };

  if (!user) return null;

  const typeLabel = getUserTypeLabel(user.type_user);
  const userAvatar = getAvatarUrl(user.profile?.image || "");
  const avatarSrc = userAvatar || (user.profile?.gender === 2 ? avatarFemale : avatarMale);
  const salaryDisplay = salaryData?.net ?? (user as any)?.agency_salary?.amount_usd ?? 0;
  const copyId = () => navigator.clipboard.writeText(user.uuid);

  return (
    <div className="mb-3 animate-fade-in">
      <div className="bg-card/50 border border-white/5 rounded-2xl p-4">
        {/* Avatar + Name + VIP — compact */}
        <div className="flex items-center gap-3" dir="rtl">
          <div className="relative flex-shrink-0">
            <img
              src={avatarSrc}
              alt={user.name}
              className="w-14 h-14 rounded-2xl object-cover border border-white/10"
              loading="lazy"
              onError={(e) => { e.currentTarget.src = user.profile?.gender === 2 ? avatarFemale : avatarMale; }}
            />
            <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <h2 className="text-base font-bold text-foreground truncate">{user.name}</h2>
              {hasVip && (() => {
                const vipLevel = (user.vip as any).vip_level || (user.vip as any).level || Object.values(user.vip)[0];
                if (!vipLevel || vipLevel === 0) return null;
                return (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}>
                    <Crown className="w-2.5 h-2.5 text-yellow-400" />
                    <span className="text-yellow-300">VIP {vipLevel}</span>
                  </span>
                );
              })()}
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/10 border border-white/20 text-foreground">
                {typeLabel}
              </span>
            </div>
            <button onClick={copyId} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <span className="text-[10px] font-mono">UUID: {user.uuid}</span>
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* 3 Stats: Coins / Diamonds / Salary */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-sm font-bold font-mono text-yellow-400">{(user.my_store.coins || 0).toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">كوينز</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-sm font-bold font-mono text-blue-400">
              {user.my_store.diamonds >= 1000000 ? `${(user.my_store.diamonds / 1000000).toFixed(1)}M` : user.my_store.diamonds.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground">ماسات</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-sm font-bold font-mono text-emerald-400">{salaryLoading ? "..." : `$${salaryDisplay}`}</p>
            <p className="text-[9px] text-muted-foreground">الراتب</p>
          </div>
        </div>

        {/* Star Banner — compact */}
        <div className="mt-3 rounded-xl p-2.5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(234,179,8,0.10), rgba(45,212,191,0.06))",
            border: "1px solid rgba(234,179,8,0.15)",
          }}>
          <div className="flex items-center justify-between gap-2" dir="rtl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #eab308, #f59e0b)", boxShadow: "0 0 8px rgba(234,179,8,0.3)" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground leading-none">نجومي</p>
                <p className="text-lg font-black text-yellow-400 leading-tight">{totalStars}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleOpenWallet("main")}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.3)" }}>
                <Gift className="w-2.5 h-2.5 text-yellow-400" />
                <span className="text-yellow-300">إهداء</span>
              </button>
              <button onClick={() => handleOpenWallet("cashout")}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-300">كاش</span>
              </button>
              <button onClick={() => setShowTutorial(true)}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <PulsingHelpIcon size={10} />
                <span className="text-destructive font-bold">الشروط</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <StarWalletDialog open={showStarWallet} onClose={() => setShowStarWallet(false)} initialView={starWalletView} />
      <StarSystemTutorial open={showTutorial} onClose={() => setShowTutorial(false)} itemType="entry" />
    </div>
  );
};

export default UserProfileCard;
