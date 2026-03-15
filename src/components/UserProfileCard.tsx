import React, { useState, useEffect } from "react";
import { Copy, Zap, Diamond, Gift, DollarSign, Sparkles, Crown } from "lucide-react";
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

const getUserTypeBadgeStyle = (type: number) => {
  if (type >= 1) return "gold-leaf-badge text-black";
  return "bg-white/10 border border-white/20 text-foreground";
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
      else {
        const monthly = getMonthlyStars(user.level?.charger_level ?? 0);
        setTotalStars(monthly);
      }
    };
    fetchStars();
    return () => { cancelled = true; };
  }, [user?.uuid]);

  // Fetch salary from project-z API
  useEffect(() => {
    if (!user?.uuid) return;
    let cancelled = false;
    setSalaryLoading(true);
    
    fetch(`https://galachat.site/project-z/api.php?action=salary_check&uuid=${user.uuid}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.has_salary) {
          setSalaryData({ salary: data.salary, deduction: data.deduction, net: data.net });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSalaryLoading(false); });
    
    return () => { cancelled = true; };
  }, [user?.uuid]);

  const handleOpenWallet = (view: "main" | "cashout") => {
    setStarWalletView(view);
    requestAnimationFrame(() => {
      setShowStarWallet(true);
    });
  };

  if (!user) return null;

  const typeLabel = getUserTypeLabel(user.type_user);
  const badgeStyle = getUserTypeBadgeStyle(user.type_user);
  const userAvatar = getAvatarUrl(user.profile?.image || "");
  const avatarSrc = userAvatar || (user.profile?.gender === 2 ? avatarFemale : avatarMale);

  const salaryDisplay = salaryData?.net ?? (user as any)?.agency_salary?.amount_usd ?? 0;

  const copyId = () => navigator.clipboard.writeText(user.uuid);

  const idRewards = [
    { stars: 10, format: "AAAAA", label: "خماسي موحد" },
    { stars: 9, format: "AAAAB", label: "خماسي مع حرف" },
    { stars: 8, format: "AAABB", label: "ثلاثي + ثنائي" },
    { stars: 7, format: "AABABA", label: "نمط متكرر" },
  ];

  return (
    <div className="mb-2 animate-fade-in">
      <div className="rounded-2xl p-3.5 relative overflow-hidden border border-white/5"
        style={{ background: "linear-gradient(145deg, rgba(18,18,26,1), rgba(26,26,46,1))" }}>

        {/* Top Row: Avatar + Name + VIP */}
        <div className="flex items-center gap-3 mb-3" dir="rtl">
          <div className="relative flex-shrink-0">
            <img
              src={avatarSrc}
              alt={user.name}
              className="w-12 h-12 rounded-xl object-cover border border-white/10"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = user.profile?.gender === 2 ? avatarFemale : avatarMale;
              }}
            />
            <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <h2 className="text-sm font-bold text-foreground truncate">{user.name}</h2>
              {hasVip && (() => {
                const vipLevel = (user.vip as any).vip_level || (user.vip as any).level || Object.values(user.vip)[0];
                if (!vipLevel || vipLevel === 0) return null;
                return (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[9px] font-bold"
                    style={{
                      background: "rgba(234,179,8,0.15)",
                      border: "1px solid rgba(234,179,8,0.3)",
                    }}>
                    <Crown className="w-2.5 h-2.5 text-yellow-400" />
                    <span className="text-yellow-300">VIP {vipLevel}</span>
                  </span>
                );
              })()}
              <div className={`px-1.5 py-px rounded-full text-[9px] font-bold ${badgeStyle}`}>
                {typeLabel}
              </div>
            </div>
            <button onClick={copyId} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <span className="text-[10px] font-mono">UUID: {user.uuid}</span>
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* 3 Cards: Coins + Diamonds + Salary */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-sm font-bold font-mono text-yellow-400">
              {(user.my_store.coins || 0).toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground">كوينز 💰</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-sm font-bold font-mono text-blue-400">
              {user.my_store.diamonds >= 1000000
                ? `${(user.my_store.diamonds / 1000000).toFixed(1)}M`
                : user.my_store.diamonds.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground">ماسات 💎</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-sm font-bold font-mono text-emerald-400">
              {salaryLoading ? "..." : `$${salaryDisplay}`}
            </p>
            <p className="text-[9px] text-muted-foreground">الراتب 💵</p>
          </div>
        </div>

        {/* Levels */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { icon: Zap, level: user.level.charger_level, from: "#22c55e", label: "شحن" },
            { icon: Diamond, level: user.level.receiver_level, from: "#ec4899", label: "استقبال" },
            { icon: Gift, level: user.level.sender_level, from: "#eab308", label: "إرسال" },
          ].map((l, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-0.5">
                <l.icon className="w-3 h-3" style={{ color: l.from }} />
                <span className="text-xs font-bold text-foreground">{l.level}</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.max(Math.min((l.level / 100) * 100, 100), 5)}%`,
                    background: l.from,
                  }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground font-semibold">{l.label}</span>
            </div>
          ))}
        </div>

        {/* ⭐ Star Banner */}
        <div className="rounded-xl p-2.5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(234,179,8,0.12), rgba(45,212,191,0.08), rgba(168,85,247,0.06))",
            border: "1px solid rgba(234,179,8,0.18)",
          }}>
          <div className="flex items-center justify-between gap-2" dir="rtl">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #eab308, #f59e0b)", boxShadow: "0 0 8px rgba(234,179,8,0.35)" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground leading-none">نجومي</p>
                <p className="text-lg font-black text-yellow-400 leading-tight">{totalStars}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenWallet("main")}
                className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[9px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.3)" }}>
                <Gift className="w-2.5 h-2.5 text-yellow-400" />
                <span className="text-yellow-300">إهداء</span>
              </button>
              <button
                onClick={() => handleOpenWallet("cashout")}
                className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[9px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-300">كاش</span>
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[9px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <PulsingHelpIcon size={10} />
                <span className="text-destructive font-bold">الشروط</span>
              </button>
            </div>
          </div>

          {/* ID Rewards Row */}
          <div className="flex gap-1 mt-1.5" dir="rtl">
            {idRewards.map((r, i) => (
              <div
                key={i}
                className={`flex-1 rounded-md py-0.5 px-0.5 text-center ${totalStars >= r.stars ? 'opacity-100' : 'opacity-40'}`}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[7px] text-foreground font-bold">{r.stars}⭐</p>
                <p className="text-[9px] font-black text-foreground font-mono">{r.format}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <StarWalletDialog open={showStarWallet} onClose={() => setShowStarWallet(false)} initialView={starWalletView} />
      <StarSystemTutorial open={showTutorial} onClose={() => setShowTutorial(false)} itemType="entry" />
    </div>
  );
};

export default UserProfileCard;
