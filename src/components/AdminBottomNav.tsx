import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, Monitor, MoreHorizontal } from 'lucide-react';
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
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] z-50 admin-theme px-3 pb-2">
      {/* Glassmorphic dock container */}
      <nav
        className="relative h-[72px] rounded-[22px] flex items-center justify-around px-2"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
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
                whileTap={{ scale: 0.88, rotateZ: -5 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="relative w-[56px] h-[56px] -translate-y-5 rounded-[18px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.45), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {/* Pulse ring */}
                <motion.div
                  className="absolute inset-0 rounded-[18px]"
                  style={{ border: '2px solid hsl(160 84% 39%)' }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <Icon size={24} className="text-white relative z-10" />
                {chatBadge && chatBadge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full text-[9px] text-white font-bold flex items-center justify-center px-1"
                    style={{
                      background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))',
                      boxShadow: '0 2px 8px rgba(244,63,94,0.5)',
                      border: '2px solid hsl(240 10% 3.9%)',
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
              className="relative flex flex-col items-center gap-1 py-2 px-3 active:bg-white/5 rounded-xl transition-colors"
            >
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="admin-dock-indicator"
                  className="absolute -top-0.5 w-5 h-[3px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, hsl(160 84% 39%), hsl(160 84% 50%))',
                    boxShadow: '0 0 10px rgba(16,185,129,0.6)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={isActive ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Icon
                  size={20}
                  className={isActive ? 'text-admin-emerald' : 'text-muted-foreground'}
                  style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.4))' } : {}}
                />
              </motion.div>
              <span
                className={`text-[10px] font-medium transition-colors ${isActive ? 'text-admin-emerald' : 'text-muted-foreground'}`}
              >
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
