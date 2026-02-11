import React from "react";
import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-4"
    >
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Top: Avatar + Info */}
        <div className="relative z-10 flex items-center gap-3 mb-3" dir="rtl">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden p-[1.5px] bg-gradient-to-br from-primary via-accent to-primary">
              <div className="w-full h-full rounded-[10px] overflow-hidden bg-background">
                <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-foreground truncate">{user.name}</h2>
            <button onClick={copyId} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <span className="text-[10px] font-mono">ID: {user.uuid}</span>
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${badgeStyle}`}>
            {typeLabel}
          </div>
        </div>

        {/* Wallet Row */}
        <div className="relative z-10 flex gap-2 mb-3" dir="rtl">
          {[
            { icon: Coins, label: "كوينز", value: user.my_store?.coins ?? 0, color: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.2)", iconColor: "text-yellow-400" },
            { icon: Diamond, label: "دايموند", value: user.my_store?.diamonds ?? 0, color: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.2)", iconColor: "text-purple-400" },
            { icon: DollarSign, label: "الرصيد", value: `$${user.my_store?.usd ?? 0}`, color: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.2)", iconColor: "text-emerald-400" },
          ].map((w, i) => (
            <div key={i} className="flex-1 rounded-xl py-2 px-1 text-center" style={{ background: w.color, border: `1px solid ${w.border}` }}>
              <w.icon className={`w-4 h-4 mx-auto mb-0.5 ${w.iconColor}`} />
              <p className="text-[9px] text-muted-foreground">{w.label}</p>
              <p className="text-xs font-black text-foreground">{typeof w.value === 'number' ? w.value.toLocaleString() : w.value}</p>
            </div>
          ))}
        </div>

        {/* Levels Row - compact */}
        <div className="relative z-10 flex gap-3" dir="rtl">
          {[
            { icon: Zap, label: "الشحن", level: user.level.charger_level, pct: chargerPct, from: "#22c55e", to: "#16a34a" },
            { icon: Diamond, label: "الاستقبال", level: user.level.receiver_level, pct: receiverPct, from: "#ec4899", to: "#db2777" },
            { icon: Gift, label: "الإرسال", level: user.level.sender_level, pct: senderPct, from: "#eab308", to: "#ca8a04" },
          ].map((l, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${l.from}, ${l.to})` }}>
                <l.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[9px] text-muted-foreground">{l.label}</span>
              <span className="text-xs font-black text-foreground">Lv.{l.level}</span>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(l.pct, 5)}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${l.from}, ${l.to})` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default UserProfileCard;
