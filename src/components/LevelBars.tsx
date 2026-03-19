import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface LevelBarProps {
  level: number;
  color: "green" | "pink" | "yellow";
  icon: string;
  percentage: number;
}

const colorMap = {
  green: {
    text: "text-green-400",
    gradient: "bg-gradient-to-l from-green-300 to-green-500",
  },
  pink: {
    text: "text-pink-400",
    gradient: "bg-gradient-to-l from-pink-300 to-pink-500",
  },
  yellow: {
    text: "text-yellow-400",
    gradient: "bg-gradient-to-l from-yellow-300 to-yellow-500",
  },
};

const LevelBar: React.FC<LevelBarProps> = ({ level, color, icon, percentage }) => {
  const colors = colorMap[color];
  const clampedPercent = Math.min(Math.max(percentage, 5), 100);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(clampedPercent), 300);
    return () => clearTimeout(t);
  }, [clampedPercent]);

  return (
    <div className="glass-card rounded-2xl p-3 flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-[16px] ${colors.text}`}>{icon}</span>
        <span className={`text-[11px] font-bold ${colors.text}`}>Lv. {level}</span>
      </div>
      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden relative">
        <div
          style={{ width: `${width}%` }}
          className={`absolute top-0 right-0 h-full ${colors.gradient} rounded-full css-bar-fill`}
        >
          <div className="premium-shimmer absolute inset-0 opacity-40" />
        </div>
      </div>
    </div>
  );
};

const LevelBars: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const chargerPct = Math.min((user.level.charger_level / 50) * 100, 100);
  const receiverPct = Math.min((user.level.receiver_level / 50) * 100, 100);
  const senderPct = Math.min((user.level.sender_level / 50) * 100, 100);

  return (
    <div className="grid grid-cols-3 gap-3 mb-10">
      <LevelBar level={user.level.charger_level} color="green" icon="" percentage={chargerPct} />
      <LevelBar level={user.level.receiver_level} color="pink" icon="" percentage={receiverPct} />
      <LevelBar level={user.level.sender_level} color="yellow" icon="" percentage={senderPct} />
    </div>
  );
};

export default LevelBars;
