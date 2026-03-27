import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Bell, Eye, MoreHorizontal, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTapFeedback } from '@/hooks/use-tap-feedback';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
  monitorBadge?: number;
}

interface NavItem {
  key: BottomTab;
  icon: typeof Home;
  label: string;
}

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge = 0, monitorBadge = 0 }) => {
  const navigate = useNavigate();
  const tap = useTapFeedback();
  const adminRole = localStorage.getItem('admin_role');
  const isRegularAdmin = adminRole === 'admin';

  const navItems: NavItem[] = isRegularAdmin
    ? [
        { key: 'favorites', icon: MoreHorizontal, label: 'المزيد' },
        { key: 'monitor', icon: MessageCircle, label: 'القروب' },
        { key: 'home', icon: Home, label: 'الرئيسية' },
        { key: 'chat', icon: Bell, label: 'الإشعارات' },
        { key: 'search', icon: Search, label: 'بحث' },
      ]
    : [
        { key: 'favorites', icon: MoreHorizontal, label: 'المزيد' },
        { key: 'monitor', icon: Eye, label: 'المراقبة' },
        { key: 'home', icon: Home, label: 'الرئيسية' },
        { key: 'chat', icon: Bell, label: 'الإشعارات' },
        { key: 'search', icon: Search, label: 'بحث' },
      ];

  const handleTap = (item: NavItem) => {
    tap();
    if (item.key === 'monitor') {
      navigate(isRegularAdmin ? '/admin/chat' : '/admin/monitor');
      return;
    }
    if (item.key === 'chat') {
      navigate('/admin/chat');
      return;
    }
    onChange(item.key);
  };

  const getBadge = (key: BottomTab) => {
    if (key === 'chat') return chatBadge;
    if (key === 'monitor' && !isRegularAdmin) return monitorBadge;
    return 0;
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto mx-auto mb-3 max-w-[460px] px-4">
        <motion.nav
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
          className="relative flex items-end justify-evenly rounded-[28px] px-1.5 py-2"
          style={{
            background: 'linear-gradient(170deg, rgba(20, 16, 8, 0.94), rgba(10, 8, 4, 0.97))',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            boxShadow: '0 20px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,158,11,0.08) inset, 0 -4px 20px -4px rgba(245,158,11,0.06) inset',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;
            const isHome = item.key === 'home';
            const badge = getBadge(item.key);

            if (isHome) {
              return (
                <button
                  key={item.key}
                  onClick={() => handleTap(item)}
                  className="relative -mt-5 flex flex-col items-center"
                >
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.05 }}
                    animate={isActive ? {
                      boxShadow: [
                        '0 8px 28px -6px rgba(245,158,11,0.6)',
                        '0 8px 36px -6px rgba(245,158,11,0.8)',
                        '0 8px 28px -6px rgba(245,158,11,0.6)',
                      ],
                    } : {
                      boxShadow: '0 8px 24px -6px rgba(245,158,11,0.5)',
                    }}
                    transition={isActive ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring' }}
                    className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full"
                    style={{
                      background: 'linear-gradient(140deg, #f59e0b, #d97706)',
                    }}
                  >
                    <Home className="h-6 w-6 text-black" strokeWidth={2.2} />

                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="absolute inset-[-3px] rounded-full"
                          style={{ border: '2px solid rgba(245,158,11,0.4)' }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span className="mt-1 text-[10px] font-bold" style={{ color: '#f59e0b' }}>{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.key}
                onClick={() => handleTap(item)}
                className="relative flex min-w-[58px] flex-col items-center"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  animate={{ y: isActive ? -2 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-2xl"
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: 'rgba(245,158,11,0.12)' }}
                      />
                    )}
                  </AnimatePresence>

                  <Icon
                    className="relative h-5 w-5 transition-colors duration-200"
                    style={{ color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}
                    strokeWidth={isActive ? 2.2 : 1.7}
                  />

                  <AnimatePresence>
                    {badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -right-1 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[8px] font-black text-white"
                        style={{
                          background: '#ef4444',
                          boxShadow: '0 4px 12px -3px rgba(239,68,68,0.7)',
                        }}
                      >
                        {badge > 99 ? '99+' : badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                <span
                  className="mt-0.5 text-[9px] font-bold transition-colors duration-200"
                  style={{ color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.35)' }}
                >
                  {item.label}
                </span>

                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 14, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="mt-0.5 h-[2px] rounded-full"
                      style={{ background: '#f59e0b' }}
                    />
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </motion.nav>
      </div>
    </div>
  );
};

export default AdminBottomNav;
