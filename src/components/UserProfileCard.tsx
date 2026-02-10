import React from "react";
import { motion } from "framer-motion";
import { User, Gem, Zap } from "lucide-react";

interface UserProfileCardProps {
  name: string;
  id: string;
  avatarUrl?: string;
  receiverLevel: number;
  senderLevel: number;
  wealth: number;
  charisma: number;
  recharge: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  name,
  id,
  avatarUrl,
  receiverLevel,
  senderLevel,
  wealth,
  charisma,
  recharge,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-5 mx-5 mt-5 glow-gold"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full gold-gradient p-[2px]">
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>
          <div className="absolute -bottom-1 -left-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            Lv.{Math.max(receiverLevel, senderLevel)}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{name}</h2>
          <p className="text-sm text-muted-foreground font-mono" dir="ltr">ID: {id}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-around mt-5 pt-4 border-t border-border/30">
        <StatItem icon={<Gem className="w-4 h-4" />} label="المستقبل" value={receiverLevel} />
        <div className="w-px h-8 bg-border/30" />
        <StatItem icon={<Zap className="w-4 h-4" />} label="المرسل" value={senderLevel} />
        <div className="w-px h-8 bg-border/30" />
        <StatItem icon={<Gem className="w-4 h-4" />} label="الثروة" value={wealth} />
        <div className="w-px h-8 bg-border/30" />
        <StatItem icon={<Zap className="w-4 h-4" />} label="الكاريزما" value={charisma} />
        <div className="w-px h-8 bg-border/30" />
        <StatItem icon={<Zap className="w-4 h-4" />} label="الشحن" value={recharge} />
      </div>
    </motion.div>
  );
};

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="text-primary">{icon}</div>
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-bold text-foreground">{value.toLocaleString()}</span>
  </div>
);

export default UserProfileCard;
