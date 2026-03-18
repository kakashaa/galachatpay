import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, Eye, Star } from 'lucide-react';
import { motion } from 'framer-motion';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
}

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge }) => {
  const navigate = useNavigate();

  const tabs: { key: BottomTab; label: string; icon: React.ElementType }[] = [
    { key: 'home', label: 'الرئيسية', icon: Home },
    { key: 'search', label: 'بحث', icon: Search },
    { key: 'chat', label: 'الدردشة', icon: MessageCircle },
    { key: 'monitor', label: 'مراقبة', icon: Eye },
    { key: 'favorites', label: 'المفضلة', icon: Star },
  ];

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="relative max-w-md mx-auto flex items-end justify-around px-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-1.5">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const isCenter = i === 2;
          const isActive = active === tab.key;

          if (isCenter) {
            return (
              <motion.button
                key={tab.key}
                whileTap={{ scale: 0.88, rotate: -5 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate("/admin/chat")}
                className="-mt-7 flex flex-col items-center"
              >
                <div className="relative">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 rounded-[18px] bg-emerald-500/30 blur-lg scale-110" />
                  <div className="relative w-[54px] h-[54px] rounded-[18px] bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-[0_8px_30px_-4px_rgba(34,197,94,0.5)]"
                    style={{ transform: 'perspective(200px) rotateX(-3deg)' }}>
                    {/* Glass shine */}
                    <div className="absolute inset-0 rounded-[18px] bg-gradient-to-b from-white/20 to-transparent h-1/2 overflow-hidden rounded-b-none" />
                    <Icon className="relative w-6 h-6 text-black drop-shadow-sm" />
                  </div>
                  {chatBadge && chatBadge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-gradient-to-b from-red-500 to-rose-600 text-[8px] text-white font-black flex items-center justify-center px-1 shadow-lg shadow-red-500/40 border border-red-400/30"
                    >
                      {chatBadge > 99 ? '99+' : chatBadge}
                    </motion.span>
                  )}
                </div>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.85 }}
              onClick={() => onChange(tab.key)}
              className="flex flex-col items-center gap-1 py-1.5 px-2 relative"
            >
              <div className="relative">
                <Icon className={`w-[22px] h-[22px] transition-colors duration-200 ${isActive ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'text-zinc-600'}`} />
              </div>
              <span className={`text-[8px] transition-colors duration-200 ${isActive ? 'text-emerald-400 font-black' : 'text-zinc-600 font-medium'}`}>
                {tab.label}
              </span>
              {/* Active dot */}
              {isActive && (
                <motion.div
                  layoutId="adminNavDot"
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AdminBottomNav;
