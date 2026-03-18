import React from 'react';
import { Home, Search, MessageSquare, Eye, Star } from 'lucide-react';
import { motion } from 'framer-motion';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
  onChatNavigate?: () => void;
}

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge, onChatNavigate }) => {
  const tabs: { key: BottomTab; label: string; icon: React.ElementType }[] = [
    { key: 'favorites', label: 'المفضلة', icon: Star },
    { key: 'monitor', label: 'مراقبة', icon: Eye },
    { key: 'chat', label: 'الدردشة', icon: MessageSquare },
    { key: 'search', label: 'بحث', icon: Search },
    { key: 'home', label: 'الرئيسية', icon: Home },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Blur background */}
      <div className="absolute inset-0 bg-[hsl(var(--background))]/80 backdrop-blur-xl border-t border-white/5" />

      <div className="relative max-w-2xl mx-auto px-6 py-2 flex items-end justify-between">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const isCenter = i === 2; // الدردشة بالوسط
          const isActive = active === tab.key;

          return (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                if (tab.key === 'chat' && onChatNavigate) {
                  onChatNavigate();
                } else {
                  onChange(tab.key);
                }
              }}
              className={`flex flex-col items-center gap-0.5 relative ${isCenter ? '-mt-4' : ''}`}
            >
              {isCenter ? (
                /* زر الدردشة — كبير ومميز */
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Icon className="w-6 h-6 text-black" />
                  </div>
                  {chatBadge && chatBadge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center shadow-lg shadow-red-500/30"
                    >
                      {chatBadge > 99 ? '99+' : chatBadge}
                    </motion.span>
                  )}
                </div>
              ) : (
                <div className="relative py-1">
                  <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="adminActiveTab"
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400"
                    />
                  )}
                </div>
              )}
              <span className={`text-[9px] ${isActive || isCenter ? 'text-emerald-400 font-bold' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Safe area for iPhone */}
      <div className="h-[env(safe-area-inset-bottom)] bg-[hsl(var(--background))]/80" />
    </motion.nav>
  );
};

export default AdminBottomNav;
