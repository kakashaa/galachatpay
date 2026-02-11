import React from "react";
import { Copy, Zap, Diamond, Gift, Coins, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import avatarMale from "@/assets/avatar-male.png";
import avatarFemale from "@/assets/avatar-female.png";

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

const UserProfileCard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const typeLabel = getUserTypeLabel(user.type_user);
  const badgeStyle = getUserTypeBadgeStyle(user.type_user);
  const avatarSrc = user.profile?.gender === 2 ? avatarFemale : avatarMale;

  const chargerPct = Math.min((user.level.charger_level / 50) * 100, 100);
  const receiverPct = Math.min((user.level.receiver_level / 50) * 100, 100);
  const senderPct = Math.min((user.level.sender_level / 50) * 100, 100);

  const copyId = () => navigator.clipboard.writeText(user.uuid);

  return (
    <div className="mb-3">
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

        {/* Wallet Row */}
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
              <div className="w-full bg-white/10 h-0.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(l.pct, 5)}%`, background: `linear-gradient(90deg, ${l.from}, ${l.to})` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
