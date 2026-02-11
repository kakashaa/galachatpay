import React, { useState, useEffect } from "react";
import { Copy, Zap, Diamond, Gift, Coins, DollarSign, Sparkles, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import avatarMale from "@/assets/avatar-male.png";
import avatarFemale from "@/assets/avatar-female.png";
import StarWalletDialog from "@/components/StarWalletDialog";
import StarSystemTutorial from "@/components/StarSystemTutorial";

const getUserTypeLabel = (type: number): string => {
  switch (type) {
    case 2: return "مضيف";
    case 3: return "وكيل مضيفين";
    case 4: return "وكيل شحن";
    case 5: return "وكيل شحن ومضيفين";
    case 6: return "مضيف ووكيل شحن";
    default: return "مستخدم";
  }
};

const getUserTypeBadgeStyle = (type: number) => {
  if (type >= 2) return "gold-leaf-badge text-black";
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

  useEffect(() => {
    if (!user?.uuid) return;
    const fetchStars = async () => {
      const currentMonth = getCurrentMonth();
      const { data } = await supabase
        .from("user_star_balance")
        .select("total_stars")
        .eq("user_uuid", user.uuid)
        .eq("current_month", currentMonth)
        .single();
      if (data) setTotalStars((data as any).total_stars ?? 0);
      else {
        const monthly = getMonthlyStars(user.level?.charger_level ?? 0);
        setTotalStars(monthly);
      }
    };
    fetchStars();
  }, [user?.uuid]);

  if (!user) return null;

  const typeLabel = getUserTypeLabel(user.type_user);
  const badgeStyle = getUserTypeBadgeStyle(user.type_user);
  const avatarSrc = user.profile?.gender === 2 ? avatarFemale : avatarMale;

  const chargerPct = Math.min((user.level.charger_level / 100) * 100, 100);
  const receiverPct = Math.min((user.level.receiver_level / 100) * 100, 100);
  const senderPct = Math.min((user.level.sender_level / 100) * 100, 100);

  const copyId = () => navigator.clipboard.writeText(user.uuid);

  const idRewards = [
    { stars: 10, format: "AAAAA", label: "خماسي موحد" },
    { stars: 9, format: "AAAAB", label: "خماسي مع حرف" },
    { stars: 8, format: "AAABB", label: "ثلاثي + ثنائي" },
    { stars: 7, format: "AABABA", label: "نمط متكرر" },
  ];

  return (
    <div className="mb-3">
      {/* ⭐ Star Banner - Above Profile */}
      <div
        className="rounded-2xl mb-2 p-2.5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(45,212,191,0.1), rgba(168,85,247,0.08))",
          border: "1px solid rgba(234,179,8,0.2)",
        }}
      >
        <div className="flex items-center justify-between gap-2" dir="rtl">
          {/* Star count */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, #eab308, #f59e0b)", boxShadow: "0 0 12px rgba(234,179,8,0.4)" }}>
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-none">نجومي</p>
              <p className="text-lg font-black text-yellow-400 leading-tight">{totalStars}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setStarWalletView("main"); setShowStarWallet(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 transition-transform"
              style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.3)" }}
            >
              <Gift className="w-3 h-3 text-yellow-400" />
              <span className="text-yellow-300">إهداء</span>
            </button>
            <button
              onClick={() => { setStarWalletView("cashout"); setShowStarWallet(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 transition-transform"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">كاش</span>
            </button>
            <button
              onClick={() => setShowTutorial(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 transition-transform"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <HelpCircle className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">الشروط</span>
            </button>
          </div>
        </div>

        {/* ID Rewards Row */}
        <div className="flex gap-1 mt-2" dir="rtl">
          {idRewards.map((r, i) => (
            <div
              key={i}
              className={`flex-1 rounded-lg py-1 px-1 text-center ${totalStars >= r.stars ? 'opacity-100' : 'opacity-40'}`}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-[8px] text-muted-foreground">{r.stars}⭐</p>
              <p className="text-[10px] font-black text-foreground font-mono">{r.format}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl p-3 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Top: Avatar + Info */}
        <div className="relative z-10 flex items-center gap-2.5 mb-2.5" dir="rtl">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden p-[1.5px] bg-gradient-to-br from-primary via-accent to-primary">
              <div className="w-full h-full rounded-[9px] overflow-hidden bg-background">
                <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-foreground truncate">{user.name}</h2>
            <button onClick={copyId} className="flex items-center gap-1 text-muted-foreground">
              <span className="text-[9px] font-mono">ID: {user.uuid}</span>
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${badgeStyle}`}>
            {typeLabel}
          </div>
        </div>

        {/* Wallet Row - includes star wallet mini */}
        <div className="relative z-10 flex gap-1.5 mb-2.5" dir="rtl">
          {[
            { icon: Coins, label: "كوينز", value: user.my_store?.coins ?? 0, color: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.15)", iconColor: "text-yellow-400" },
            { icon: Diamond, label: "دايموند", value: user.my_store?.diamonds ?? 0, color: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.15)", iconColor: "text-purple-400" },
            { icon: DollarSign, label: "الرصيد", value: `$${user.my_store?.usd ?? 0}`, color: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.15)", iconColor: "text-emerald-400" },
          ].map((w, i) => (
            <div key={i} className="flex-1 rounded-lg py-1.5 px-1 text-center" style={{ background: w.color, border: `1px solid ${w.border}` }}>
              <w.icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${w.iconColor}`} />
              <p className="text-[8px] text-muted-foreground">{w.label}</p>
              <p className="text-[11px] font-black text-foreground">{typeof w.value === 'number' ? w.value.toLocaleString() : w.value}</p>
            </div>
          ))}
        </div>

        {/* Levels Row */}
        <div className="relative z-10 flex gap-2" dir="rtl">
          {[
            { icon: Zap, label: "الشحن", level: user.level.charger_level, pct: chargerPct, from: "#22c55e", to: "#16a34a" },
            { icon: Diamond, label: "الاستقبال", level: user.level.receiver_level, pct: receiverPct, from: "#ec4899", to: "#db2777" },
            { icon: Gift, label: "الإرسال", level: user.level.sender_level, pct: senderPct, from: "#eab308", to: "#ca8a04" },
          ].map((l, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${l.from}, ${l.to})` }}>
                <l.icon className="w-3 h-3 text-white" />
              </div>
              <span className="text-[8px] text-muted-foreground">{l.label}</span>
              <span className="text-[10px] font-black text-foreground">Lv.{l.level}</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                  style={{ width: `${Math.max(l.pct, 3)}%`, background: `linear-gradient(90deg, ${l.from}, ${l.to})` }}
                >
                  <div className="absolute inset-0 animate-water-wave opacity-40" style={{
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)`,
                    backgroundSize: '200% 100%',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <StarWalletDialog open={showStarWallet} onClose={() => setShowStarWallet(false)} initialView={starWalletView} />
      <StarSystemTutorial open={showTutorial} onClose={() => setShowTutorial(false)} itemType="entry" />
    </div>
  );
};

export default UserProfileCard;
