import React, { useState, useEffect } from "react";
import { Copy, Zap, Diamond, Gift, DollarSign, Sparkles, Crown } from "lucide-react";
import PulsingHelpIcon from "@/components/PulsingHelpIcon";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import avatarMale from "@/assets/avatar-male.png";
import avatarFemale from "@/assets/avatar-female.png";
import { getAvatar, fixAvatarUrl, getAvatarUrl } from "@/lib/avatarHelper";
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
  const [salaryDisplay, setSalaryDisplay] = useState(0);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem("gala_avatar") || "");

  // Fetch avatar using centralized helper
  useEffect(() => {
    if (!user?.uuid) return;
    getAvatar(user.uuid).then(url => {
      if (url) {
        setAvatarUrl(url);
        localStorage.setItem("gala_avatar", url);
      }
    });
  }, [user?.uuid]);

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

  // Fetch salary using salary_check_all — show remaining only
  useEffect(() => {
    if (!user?.uuid) return;
    let cancelled = false;
    setSalaryLoading(true);
    
    fetch(`https://galachat.site/project-z/api.php?action=salary_check_all&uuid=${user.uuid}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        const hostNet = data.host_salary?.net || 0;
        const agencyAmount = data.agency_salary?.amount || 0;
        const canWithdraw = data.withdrawals?.can_withdraw || false;
        const totalWithdrawn = data.withdrawals?.total_withdrawn || 0;
        
        let remaining = 0;
        if (canWithdraw) {
          remaining = Math.max(hostNet, agencyAmount) - totalWithdrawn;
          remaining = Math.max(0, remaining);
        }
        setSalaryDisplay(remaining);
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
  const avatarSrc = avatarUrl || fixAvatarUrl(user.profile?.image) || (user.profile?.gender === 2 ? avatarFemale : avatarMale);

  

  const copyId = () => navigator.clipboard.writeText(user.uuid);

  const idRewards = [
    { stars: 10, format: "AAAAA", label: "خماسي موحد" },
    { stars: 9, format: "AAAAB", label: "خماسي مع حرف" },
    { stars: 8, format: "AAABB", label: "ثلاثي + ثنائي" },
    { stars: 7, format: "AABABA", label: "نمط متكرر" },
  ];

  return (
    <div className="mb-2 animate-fade-in">
      <div className="rounded-xl p-3 relative overflow-hidden border border-white/5"
        style={{ background: "linear-gradient(145deg, rgba(18,18,26,1), rgba(26,26,46,1))" }}>

        {/* Avatar + Name + Stats in one row */}
        <div className="flex items-center gap-2.5 mb-2" dir="rtl">
          <div className="relative flex-shrink-0">
            <img src={avatarSrc} alt={user.name}
              className="w-10 h-10 rounded-lg object-cover border border-white/10" loading="lazy"
              onError={(e) => { e.currentTarget.src = user.profile?.gender === 2 ? avatarFemale : avatarMale; }} />
            <div className="absolute -bottom-px -left-px w-2 h-2 rounded-full bg-emerald-500 border border-background" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <h2 className="text-xs font-bold text-foreground truncate">{user.name}</h2>
              {hasVip && (() => {
                const vipLevel = (user.vip as any).vip_level || (user.vip as any).level || Object.values(user.vip)[0];
                if (!vipLevel || vipLevel === 0) return null;
                return (
                  <span className="inline-flex items-center gap-px px-1 rounded text-[8px] font-bold"
                    style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}>
                    <Crown className="w-2 h-2 text-yellow-400" />
                    <span className="text-yellow-300">VIP {vipLevel}</span>
                  </span>
                );
              })()}
              <span className={`px-1 rounded text-[8px] font-bold ${badgeStyle}`}>{typeLabel}</span>
            </div>
            <button onClick={copyId} className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <span className="text-[9px] font-mono">UUID: {user.uuid}</span>
              <Copy className="w-2 h-2" />
            </button>
          </div>
        </div>

        {/* Stats + Levels combined row */}
        <div className="grid grid-cols-6 gap-1.5 mb-2">
          <div className="bg-white/5 rounded-lg p-1.5 text-center col-span-2">
            <p className="text-[11px] font-bold font-mono text-yellow-400">{(user.my_store.coins || 0).toLocaleString()}</p>
            <p className="text-[8px] text-muted-foreground">كوينز</p>
          </div>
          <div className="bg-white/5 rounded-lg p-1.5 text-center col-span-2">
            <p className="text-[11px] font-bold font-mono text-blue-400">
              {user.my_store.diamonds >= 1000000 ? `${(user.my_store.diamonds / 1000000).toFixed(1)}M` : user.my_store.diamonds.toLocaleString()}
            </p>
            <p className="text-[8px] text-muted-foreground">ماسات</p>
          </div>
          <div className="bg-white/5 rounded-lg p-1.5 text-center col-span-2">
            <p className="text-[11px] font-bold font-mono text-emerald-400">{salaryLoading ? "..." : `$${salaryDisplay}`}</p>
            <p className="text-[8px] text-muted-foreground">الراتب</p>
          </div>
        </div>

        {/* Levels — inline compact */}
        <div className="flex items-center gap-3 mb-2 justify-center">
          {[
            { icon: Zap, level: user.level.charger_level, color: "#22c55e" },
            { icon: Diamond, level: user.level.receiver_level, color: "#ec4899" },
            { icon: Gift, level: user.level.sender_level, color: "#eab308" },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <l.icon className="w-2.5 h-2.5" style={{ color: l.color }} />
              <span className="text-[10px] font-bold text-foreground">{l.level}</span>
              <div className="w-8 bg-white/10 h-1 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(Math.min(l.level, 100), 5)}%`, background: l.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Star Banner — ultra compact */}
        <div className="rounded-lg p-2 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.10), rgba(45,212,191,0.06))", border: "1px solid rgba(234,179,8,0.15)" }}>
          <div className="flex items-center justify-between" dir="rtl">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #eab308, #f59e0b)" }}>
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-black text-yellow-400">{totalStars}</span>
              <span className="text-[8px] text-muted-foreground">⭐</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleOpenWallet("main")}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.3)" }}>
                <span className="text-yellow-300">إهداء</span>
              </button>
              <button onClick={() => handleOpenWallet("cashout")}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <span className="text-emerald-300">كاش</span>
              </button>
              <button onClick={() => setShowTutorial(true)}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-destructive">الشروط</span>
              </button>
            </div>
          </div>
          {/* ID Rewards — single line */}
          <div className="flex gap-1 mt-1" dir="rtl">
            {idRewards.map((r, i) => (
              <div key={i}
                className={`flex-1 rounded py-px text-center ${totalStars >= r.stars ? 'opacity-100' : 'opacity-35'}`}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[7px] font-bold text-foreground">{r.stars}⭐ <span className="font-mono">{r.format}</span></p>
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
