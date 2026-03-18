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
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl border-t border-white/[0.06]" />
      <div className="relative max-w-md mx-auto flex items-end justify-around px-4 pb-6 pt-2">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const isCenter = i === 2; // الدردشة بالوسط
          const isActive = active === tab.key;

          if (isCenter) {
            return (
              <motion.button
                key={tab.key}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/admin/chat")}
                className="-mt-6 flex flex-col items-center gap-1"
              >
                <div className="relative">
                  <div className="w-[52px] h-[52px] rounded-2xl bg-emerald-500 flex items-center justify-center shadow-[0_4px_20px_rgba(34,197,94,0.4)]">
                    <Icon className="w-6 h-6 text-black" />
                  </div>
                  {chatBadge && chatBadge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-[8px] text-white font-bold flex items-center justify-center px-1 shadow-lg shadow-red-500/30">
                      {chatBadge > 99 ? '99+' : chatBadge}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          }

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex flex-col items-center gap-1"
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className={`text-[8px] ${isActive ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminBottomNav;
