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
  if (type >= 2) {
    return "gold-leaf-badge text-black";
  }
  return "bg-white/10 border border-white/20 text-foreground";
};

interface LevelItemProps {
  icon: React.ReactNode;
  label: string;
  level: number;
  gradientFrom: string;
  gradientTo: string;
  percentage: number;
}

const LevelItem: React.FC<LevelItemProps> = ({ icon, label, level, gradientFrom, gradientTo, percentage }) => {
  const clampedPercent = Math.min(Math.max(percentage, 5), 100);

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
      >
        {icon}
      </div>
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <span className="text-sm font-black text-foreground">Lv.{level}</span>
      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedPercent}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }}
        />
      </div>
    </div>
  );
};

const UserProfileCard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const typeLabel = getUserTypeLabel(user.type_user);
  const badgeStyle = getUserTypeBadgeStyle(user.type_user);
  
  // gender: 1 = male, 2 = female (based on API)
  const avatarSrc = user.profile?.gender === 2 ? avatarFemale : avatarMale;

  const chargerPct = Math.min((user.level.charger_level / 50) * 100, 100);
  const receiverPct = Math.min((user.level.receiver_level / 50) * 100, 100);
  const senderPct = Math.min((user.level.sender_level / 50) * 100, 100);

  const copyId = () => {
    navigator.clipboard.writeText(user.uuid);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      {/* Main Card */}
      <div
        className="rounded-3xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 32px -8px rgba(0,0,0,0.4)",
        }}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-accent/10 blur-3xl" />

        {/* Top Row: Avatar + Info */}
        <div className="relative z-10 flex items-center gap-4 mb-5" dir="rtl">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden p-[2px] bg-gradient-to-br from-primary via-accent to-primary">
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-background">
                <img
                  src={avatarSrc}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Online dot */}
            <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-background" />
          </div>

          {/* Name + ID + Badge */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-foreground truncate mb-1">
              {user.name}
            </h2>
            <button
              onClick={copyId}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <span className="text-xs font-mono tracking-wider">ID: {user.uuid}</span>
              <Copy className="w-3 h-3" />
            </button>
            <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold ${badgeStyle}`}>
              {typeLabel}
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="relative z-10 flex gap-3 mb-4" dir="rtl">
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05))", border: "1px solid rgba(234,179,8,0.2)" }}>
            <Coins className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
            <p className="text-[10px] text-muted-foreground">كوينز</p>
            <p className="text-sm font-black text-foreground">{user.my_store?.coins?.toLocaleString() ?? 0}</p>
          </div>
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))", border: "1px solid rgba(168,85,247,0.2)" }}>
            <Diamond className="w-5 h-5 mx-auto mb-1 text-purple-400" />
            <p className="text-[10px] text-muted-foreground">دايموند</p>
            <p className="text-sm font-black text-foreground">{user.my_store?.diamonds?.toLocaleString() ?? 0}</p>
          </div>
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))", border: "1px solid rgba(34,197,94,0.2)" }}>
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
            <p className="text-[10px] text-muted-foreground">الرصيد</p>
            <p className="text-sm font-black text-foreground">${user.my_store?.usd?.toLocaleString() ?? 0}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 mb-4" />

        {/* Levels Row */}
        <div className="relative z-10 flex gap-4 px-2" dir="rtl">
          <LevelItem
            icon={<Zap className="w-5 h-5 text-white" />}
            label="الشحن"
            level={user.level.charger_level}
            gradientFrom="#22c55e"
            gradientTo="#16a34a"
            percentage={chargerPct}
          />
          <LevelItem
            icon={<Diamond className="w-5 h-5 text-white" />}
            label="الاستقبال"
            level={user.level.receiver_level}
            gradientFrom="#ec4899"
            gradientTo="#db2777"
            percentage={receiverPct}
          />
          <LevelItem
            icon={<Gift className="w-5 h-5 text-white" />}
            label="الإرسال"
            level={user.level.sender_level}
            gradientFrom="#eab308"
            gradientTo="#ca8a04"
            percentage={senderPct}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default UserProfileCard;
