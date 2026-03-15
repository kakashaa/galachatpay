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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [agencySalary, setAgencySalary] = useState<number | null>(null);
  const [salaryUsd, setSalaryUsd] = useState<number | null>(null);
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

  // Fetch salary from dedicated salary API (separate from login)
  useEffect(() => {
    if (!user?.uuid) return;
    let cancelled = false;
    const fetchSalary = async () => {
      setSalaryLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("gala-salary", {
          body: { uuid: user.uuid },
        });
        if (cancelled) return;
        if (!error && data?.ok && data.salary != null) {
          setSalaryUsd(data.salary);
        }
      } catch (e) {
        console.error("Salary fetch error:", e);
      } finally {
        if (!cancelled) setSalaryLoading(false);
      }
    };
    fetchSalary();
    return () => { cancelled = true; };
  }, [user?.uuid]);

  // Calculate agency salary (net) for agents only
  // This shows ONLY the agency portion (amount_usd - cut) from Gala's agency section
  useEffect(() => {
    if (!user) return;
    const isAgent = user.type_user >= 2;
    
    if (isAgent && user.agency_salary) {
      const agencyNet = (user.agency_salary.amount_usd || 0) - (user.agency_salary.cut || 0);
      setAgencySalary(agencyNet);
    } else if (isAgent && user.agency_accumulated_salary != null) {
      setAgencySalary(user.agency_accumulated_salary);
    } else {
      setAgencySalary(0);
    }
  }, [user?.agency_salary, user?.agency_accumulated_salary, user?.type_user]);

  const handleOpenWallet = (view: "main" | "cashout") => {
    setStarWalletView(view);
    // Use requestAnimationFrame to ensure state is set before dialog opens
    requestAnimationFrame(() => {
      setShowStarWallet(true);
    });
  };

  if (!user) return null;

  const typeLabel = getUserTypeLabel(user.type_user);
  const badgeStyle = getUserTypeBadgeStyle(user.type_user);
  const userAvatar = getAvatarUrl(user.profile?.image || "");
  const avatarSrc = userAvatar || (user.profile?.gender === 2 ? avatarFemale : avatarMale);

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
    <div className="mb-3 animate-fade-in">
      <div
        className="rounded-2xl p-3 relative overflow-hidden transition-shadow duration-300 hover:shadow-lg"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Top: Avatar + Info + Mini Levels */}
        <div className="relative z-10 flex items-center gap-2.5 mb-2" dir="rtl">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden p-[1.5px] bg-gradient-to-br from-primary via-accent to-primary">
              <div className="w-full h-full rounded-[9px] overflow-hidden bg-background">
                <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <h2 className="text-sm font-black text-foreground truncate">{user.name}</h2>
              {user.vip && Object.keys(user.vip).length > 0 && (() => {
                const vipLevel = (user.vip as any).vip_level || (user.vip as any).level || Object.values(user.vip)[0];
                if (!vipLevel || vipLevel === 0) return null;
                const vipPerks: Record<number, string[]> = {
                  1: ["شارة VIP بجانب الاسم"],
                  2: ["شارة VIP", "إطار مميز"],
                  3: ["شارة VIP", "إطار مميز", "دخول غرف خاصة"],
                  4: ["شارة VIP", "إطار مميز", "دخول غرف خاصة", "هدايا حصرية"],
                  5: ["شارة VIP", "إطار مميز", "دخول غرف خاصة", "هدايا حصرية", "دعم سريع ⚡"],
                  6: ["شارة VIP", "إطار مميز", "دخول غرف خاصة", "هدايا حصرية", "دعم سريع ⚡", "مزايا خاصة 👑"],
                };
                const perks = vipPerks[vipLevel] || vipPerks[1] || [];
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
                        style={{
                          background: "linear-gradient(135deg, rgba(234,179,8,0.25), rgba(245,158,11,0.15))",
                          border: "1px solid rgba(234,179,8,0.4)",
                          boxShadow: "0 0 8px rgba(234,179,8,0.15)",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 0 20px rgba(234,179,8,0.5), 0 0 40px rgba(234,179,8,0.2)"}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 0 8px rgba(234,179,8,0.15)"}
                        onPointerDown={(e) => e.currentTarget.style.boxShadow = "0 0 30px rgba(234,179,8,0.7), 0 0 60px rgba(234,179,8,0.3)"}
                        onPointerUp={(e) => e.currentTarget.style.boxShadow = "0 0 20px rgba(234,179,8,0.5), 0 0 40px rgba(234,179,8,0.2)"}
                      >
                        <Crown className="w-2.5 h-2.5 text-yellow-400" />
                        <span className="text-yellow-300">VIP {vipLevel}</span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-48 p-3 rounded-xl border border-yellow-500/30 bg-card/95 backdrop-blur-xl"
                      style={{ boxShadow: "0 0 20px rgba(234,179,8,0.15)" }}
                    >
                      <div className="space-y-2" dir="rtl">
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs font-black text-foreground">VIP {vipLevel}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold">المزايا:</p>
                        <ul className="space-y-1">
                          {perks.map((perk, i) => (
                            <li key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className="text-yellow-400">✦</span> {perk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
              <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${badgeStyle}`}>
                {typeLabel}
              </div>
            </div>
            <button onClick={copyId} className="flex items-center gap-1 text-muted-foreground mb-1">
              <span className="text-[9px] font-mono">UUID: {user.uuid}</span>
              <Copy className="w-2.5 h-2.5" />
            </button>
            
            {/* Wallet Row */}
            <div className="flex gap-2 mb-1.5 text-[9px] flex-wrap">
              {[
                { value: user.my_store.coins, emoji: "💰", color: "yellow" },
                { value: user.my_store.diamonds, emoji: "💎", color: "purple" },
                { value: salaryLoading ? "..." : `$${salaryUsd != null ? salaryUsd : (user.salary != null ? user.salary : user.my_store.usd)}`, emoji: "💵", color: "green" },
              ].map((w, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-${w.color}-500/10 border border-${w.color}-500/20`}
                >
                  <span className={`text-${w.color}-400 font-black`}>{w.value}</span>
                  <span className="text-muted-foreground">{w.emoji}</span>
                </div>
              ))}
              {user.type_user >= 2 && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-400 font-black">${agencySalary ?? 0}</span>
                  <span className="text-muted-foreground">🏢</span>
                </div>
              )}
            </div>
            
            {/* Mini Levels Strip */}
            <div className="flex gap-2 items-end">
              {[
                { icon: Zap, level: user.level.charger_level, pct: chargerPct, from: "#22c55e", to: "#16a34a", label: "شحن" },
                { icon: Diamond, level: user.level.receiver_level, pct: receiverPct, from: "#ec4899", to: "#db2777", label: "استقبال" },
                { icon: Gift, level: user.level.sender_level, pct: senderPct, from: "#eab308", to: "#ca8a04", label: "إرسال" },
              ].map((l, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-0.5">
                    <l.icon className="w-2.5 h-2.5" style={{ color: l.from }} />
                    <span className="text-[8px] font-bold text-muted-foreground">{l.level}</span>
                  </div>
                  <div className="w-12 bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.max(l.pct, 5)}%`, background: `linear-gradient(90deg, ${l.from}, ${l.to})` }}
                    />
                  </div>
                  <span className="text-[7px] text-muted-foreground font-semibold">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ⭐ Star Banner */}
        <div
          className="rounded-xl p-2 relative overflow-hidden group"
          style={{
            background: "linear-gradient(135deg, rgba(234,179,8,0.12), rgba(45,212,191,0.08), rgba(168,85,247,0.06))",
            border: "1px solid rgba(234,179,8,0.18)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)" }} />

          <div className="flex items-center justify-between gap-2" dir="rtl">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #eab308, #f59e0b)", boxShadow: "0 0 10px rgba(234,179,8,0.35)" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground leading-none">نجومي</p>
                <p className="text-base font-black text-yellow-400 leading-tight">{totalStars}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenWallet("main")}
                className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[8px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.3)" }}
              >
                <Gift className="w-2.5 h-2.5 text-yellow-400" />
                <span className="text-yellow-300">إهداء</span>
              </button>
              <button
                onClick={() => handleOpenWallet("cashout")}
                className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[8px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}
              >
                <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-300">كاش</span>
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[8px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
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
                className={`flex-1 rounded py-0.5 px-0.5 text-center ${totalStars >= r.stars ? 'opacity-100' : 'opacity-40'}`}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
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