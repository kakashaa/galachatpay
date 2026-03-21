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
  { key: 'monitor' as BottomTab, icon: Eye, label: 'المراقبة' },
  { key: 'favorites' as BottomTab, icon: MoreHorizontal, label: 'المزيد' },
];

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] z-50 admin-theme px-3 pb-[env(safe-area-inset-bottom,8px)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 10px)' }}>
      <nav
        className="relative h-[72px] rounded-[28px] flex items-center justify-around px-2"
        style={{
          background: 'linear-gradient(180deg, hsla(160, 35%, 8%, 0.96) 0%, hsla(160, 35%, 4%, 0.98) 100%)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid hsla(160, 84%, 39%, 0.15)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5), 0 0 30px hsla(160, 84%, 39%, 0.08), inset 0 1px 0 hsla(160, 84%, 39%, 0.1)',
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
                className="relative w-[50px] h-[50px] -translate-y-3 rounded-[18px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, hsl(160 84% 42%), hsl(160 84% 28%))',
                  boxShadow: '0 8px 30px hsla(160,84%,39%,0.45), 0 0 20px hsla(160,84%,39%,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <motion.div
                  className="absolute inset-0 rounded-[18px]"
                  style={{ border: '2px solid hsla(160,84%,39%,0.4)' }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <Icon size={20} className="text-white relative z-10" />
                {chatBadge && chatBadge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full text-[8px] text-white font-black flex items-center justify-center px-1"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
                      border: '2px solid rgba(10,10,18,0.98)',
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
              className="relative flex flex-col items-center gap-1"
            >
              <motion.div
                animate={isActive ? { y: -2 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-200"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, hsla(160,84%,39%,0.18), hsla(160,84%,39%,0.06))'
                    : 'transparent',
                  border: isActive ? '1px solid hsla(160,84%,39%,0.25)' : '1px solid transparent',
                  boxShadow: isActive ? '0 4px 16px hsla(160,84%,39%,0.15), 0 0 10px hsla(160,84%,39%,0.08)' : 'none',
                }}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-admin-emerald' : 'text-zinc-500'}
                  style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.4))' } : {}}
                />
              </motion.div>
              <span className={`text-[8px] font-bold ${isActive ? 'text-admin-emerald' : 'text-zinc-600'}`}>
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
