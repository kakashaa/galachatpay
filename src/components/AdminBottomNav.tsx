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
      if (isRegularAdmin) {
        navigate('/admin/chat');
      } else {
        navigate('/admin/monitor');
      }
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
          initial={{ y: 70, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.05 }}
          className="relative flex items-end justify-between rounded-[30px] border border-border/50 px-2 py-2"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--card) / 0.98), hsl(var(--background) / 0.95))',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: '0 18px 50px -16px hsl(var(--background) / 0.9), 0 0 0 1px hsl(var(--foreground) / 0.05) inset',
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
                  className="relative -mt-6 flex flex-col items-center"
                >
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.06 }}
                    animate={{ y: isActive ? -1 : 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                    className="relative flex h-14 w-14 items-center justify-center rounded-full"
                    style={{
                      background: 'linear-gradient(140deg, hsl(var(--primary)), hsl(var(--primary) / 0.72))',
                      boxShadow: '0 12px 26px -10px hsl(var(--primary) / 0.8)',
                    }}
                  >
                    <Home className="h-6 w-6 text-primary-foreground" strokeWidth={2.2} />
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.7, opacity: 0 }}
                          className="absolute inset-[-4px] rounded-full border-2 border-primary/40"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span className="mt-1 text-[10px] font-bold text-primary">{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.key}
                onClick={() => handleTap(item)}
                className="relative flex min-w-[66px] flex-col items-center"
              >
                <motion.div
                  whileTap={{ scale: 0.84 }}
                  animate={{ y: isActive ? -2 : 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl"
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        className="absolute inset-0 rounded-2xl bg-primary/15"
                      />
                    )}
                  </AnimatePresence>

                  <Icon
                    className={`relative h-5 w-5 transition-colors duration-200 ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />

                  <AnimatePresence>
                    {badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -right-1 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-black text-destructive-foreground"
                        style={{ boxShadow: '0 4px 10px -4px hsl(var(--destructive) / 0.8)' }}
                      >
                        {badge > 99 ? '99+' : badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                <span
                  className={`mt-0.5 text-[9px] font-bold transition-colors duration-200 ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>

                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 16, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="mt-1 h-[2px] rounded-full bg-primary"
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
