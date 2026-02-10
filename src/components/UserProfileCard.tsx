import React from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const getUserTypeLabel = (type: number): string | null => {
  switch (type) {
    case 2: return "مضيف";
    case 3: return "وكيل مضيفين";
    case 4: return "وكيل شحن";
    case 5: return "وكيل شحن ومضيفين";
    case 6: return "مضيف ووكيل شحن";
    default: return null;
  }
};

const UserProfileCard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const typeLabel = getUserTypeLabel(user.type_user);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center mb-8"
    >
      {/* Avatar */}
      <div className="relative mb-6">
        <div className="w-32 h-32 rounded-full overflow-hidden gold-glow-ring p-1 bg-black/50 backdrop-blur-md">
          {user.profile?.image ? (
            <img
              alt={user.name}
              className="w-full h-full rounded-full object-cover"
              src={user.profile.image}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>
        {typeLabel && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 gold-leaf-badge text-black px-4 py-1 rounded-full text-[11px] font-black tracking-wider shadow-xl whitespace-nowrap">
            {typeLabel}
          </div>
        )}
      </div>

      {/* Name & Info */}
      <div className="text-center">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl font-black text-foreground flex items-center justify-center gap-2">
            {user.name}
            {user.country?.name && <span className="text-2xl">🏳️</span>}
          </h2>
          {typeLabel && (
            <div className="gold-leaf-badge px-3 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
              <span className="text-[11px] font-bold text-black">{typeLabel}</span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-3 font-mono tracking-widest opacity-80">
          ID: {user.uuid}
        </p>
      </div>
    </motion.div>
  );
};

export default UserProfileCard;
