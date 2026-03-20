import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, Eye, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
}

const navItems = [
  { key: 'home' as BottomTab, icon: Home, label: 'الرئيسية' },
  { key: 'search' as BottomTab, icon: Search, label: 'بحث' },
  { key: 'chat' as BottomTab, icon: MessageCircle, label: 'المحادثات', center: true },
  { key: 'monitor' as BottomTab, icon: Monitor, label: 'المراقبة' },
  { key: 'favorites' as BottomTab, icon: MoreHorizontal, label: 'المزيد' },
];

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] z-50 admin-theme px-4 pb-[env(safe-area-inset-bottom,8px)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 12px)' }}>
      <nav
        className="relative h-[68px] rounded-[24px] flex items-center justify-around px-1"
        style={{
          background: 'linear-gradient(180deg, rgba(20,20,24,0.92) 0%, rgba(12,12,16,0.96) 100%)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {navItems.map((item) => {
          const isActive = active === item.key;
          const Icon = item.icon;

          if (item.center) {
            return (
              <motion.button
                key={item.key}
                onClick={() => navigate("/admin/chat")}
                whileTap={{ scale: 0.88 }}
                className="relative w-[52px] h-[52px] -translate-y-4 rounded-[16px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, hsl(160 84% 42%), hsl(160 84% 32%))',
                  boxShadow: '0 6px 28px rgba(16,185,129,0.5), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                {/* Pulse */}
                <motion.div
                  className="absolute inset-0 rounded-[16px]"
                  style={{ border: '2px solid hsl(160 84% 39%)' }}
                  animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <Icon size={22} className="text-white relative z-10" />
                {chatBadge && chatBadge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full text-[8px] text-white font-bold flex items-center justify-center px-1"
                    style={{
                      background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))',
                      boxShadow: '0 2px 8px rgba(244,63,94,0.5)',
                      border: '2px solid hsl(240 10% 5%)',
                    }}
                  >
                    {chatBadge > 99 ? '99+' : chatBadge}
                  </motion.span>
                )}
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.key}
              onClick={() => onChange(item.key)}
              whileTap={{ scale: 0.85 }}
              className="relative flex flex-col items-center gap-0.5 py-2 px-3"
            >
              {isActive && (
                <motion.div
                  layoutId="admin-dock-dot"
                  className="absolute -top-0.5 w-4 h-[2.5px] rounded-full"
                  style={{
                    background: 'hsl(160 84% 39%)',
                    boxShadow: '0 0 8px rgba(16,185,129,0.5)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <motion.div
                animate={isActive ? { y: -1 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Icon
                  size={19}
                  className={isActive ? 'text-admin-emerald' : 'text-zinc-500'}
                  style={isActive ? { filter: 'drop-shadow(0 0 5px rgba(16,185,129,0.4))' } : {}}
                />
              </motion.div>
              <span className={`text-[9px] font-medium ${isActive ? 'text-admin-emerald' : 'text-zinc-500'}`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminBottomNav;
