import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Bell, Eye, MoreHorizontal, MessageCircle } from 'lucide-react';
import { useTapFeedback } from '@/hooks/use-tap-feedback';
import { motion, AnimatePresence } from 'framer-motion';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
  monitorBadge?: number;
}

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge, monitorBadge }) => {
  const navigate = useNavigate();
  const tap = useTapFeedback();
  const adminRole = localStorage.getItem('admin_role');
  const isRegularAdmin = adminRole === 'admin';

  const navItems: { key: BottomTab; icon: typeof Home; label: string; color: string; glow: string }[] = isRegularAdmin
    ? [
        { key: 'favorites', icon: MoreHorizontal, label: 'المزيد', color: 'hsl(220 15% 60%)', glow: 'rgba(148,163,184,0.3)' },
        { key: 'monitor', icon: MessageCircle, label: 'القروب', color: 'hsl(160 60% 50%)', glow: 'rgba(52,211,153,0.35)' },
        { key: 'home', icon: Home, label: 'الرئيسية', color: '', glow: '' },
        { key: 'chat', icon: Bell, label: 'إشعارات', color: 'hsl(0 80% 60%)', glow: 'rgba(248,113,113,0.35)' },
        { key: 'search', icon: Search, label: 'بحث', color: 'hsl(174 50% 55%)', glow: 'rgba(45,212,191,0.35)' },
      ]
    : [
        { key: 'favorites', icon: MoreHorizontal, label: 'المزيد', color: 'hsl(220 15% 60%)', glow: 'rgba(148,163,184,0.3)' },
        { key: 'monitor', icon: Eye, label: 'المراقبة', color: 'hsl(230 70% 60%)', glow: 'rgba(99,102,241,0.35)' },
        { key: 'home', icon: Home, label: 'الرئيسية', color: '', glow: '' },
        { key: 'chat', icon: Bell, label: 'إشعارات', color: 'hsl(0 80% 60%)', glow: 'rgba(248,113,113,0.35)' },
        { key: 'search', icon: Search, label: 'بحث', color: 'hsl(174 50% 55%)', glow: 'rgba(45,212,191,0.35)' },
      ];

  const handleTap = (item: typeof navItems[0]) => {
    tap();
    if (item.key === 'monitor') {
      if (isRegularAdmin) {
        navigate('/admin/chat');
      } else {
        navigate('/admin/monitor');
      }
      return;
    }
    if (item.key === 'chat') { navigate('/admin/chat'); return; }
    onChange(item.key);
  };

  const getBadge = (key: BottomTab) => {
    if (key === 'chat') return chatBadge || 0;
    if (key === 'monitor' && !isRegularAdmin) return monitorBadge || 0;
    return 0;
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 pointer-events-none z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto max-w-[448px] mx-auto px-4 mb-3">
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.15 }}
          className="flex items-end justify-evenly rounded-[26px] px-1.5 py-2"
          style={{
            background: 'linear-gradient(170deg, rgba(15, 15, 30, 0.92), rgba(8, 8, 18, 0.97))',
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 16px 48px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05) inset',
          }}
        >
          {navItems.map((item) => {
            const isActive = active === item.key;
            const Icon = item.icon;
            const isHome = item.key === 'home';
            const badge = getBadge(item.key);

            // Home button — floating elevated style
            if (isHome) {
              return (
                <button
                  key={item.key}
                  onClick={() => handleTap(item)}
                  className="relative flex flex-col items-center -mt-5 mx-1"
                >
                  <motion.div
                    whileTap={{ scale: 0.85, rotate: -8 }}
                    whileHover={{ scale: 1.1 }}
                    className="relative"
                  >
                    <motion.div
                      animate={isActive ? {
                        boxShadow: [
                          '0 6px 24px hsl(8 88% 62% / 0.45)',
                          '0 6px 32px hsl(8 88% 62% / 0.65)',
                          '0 6px 24px hsl(8 88% 62% / 0.45)',
                        ]
                      } : {
                        boxShadow: '0 6px 20px hsl(8 88% 62% / 0.35)'
                      }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                      className="w-[54px] h-[54px] rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(145deg, hsl(8 88% 65%), hsl(8 80% 48%))',
                      }}
                    >
                      <Home className="w-6 h-6 text-white" strokeWidth={2.2} />
                    </motion.div>
                    {/* Outer ring for active */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.7, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="absolute inset-[-4px] rounded-full"
                          style={{ border: '2px solid hsl(8 88% 62% / 0.35)' }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span className="text-[9px] font-bold mt-1.5" style={{ color: 'hsl(8 88% 62%)' }}>
                    {item.label}
                  </span>
                </button>
              );
            }

            // Regular nav items
            return (
              <button
                key={item.key}
                onClick={() => handleTap(item)}
                className="relative flex flex-col items-center group"
              >
                <motion.div
                  whileTap={{ scale: 0.75 }}
                  className="relative w-[48px] h-[48px] rounded-2xl flex items-center justify-center"
                >
                  {/* Active background glow */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: `radial-gradient(circle at center, ${item.glow} 0%, transparent 70%)`,
                          boxShadow: `0 0 20px ${item.glow}`,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon with lift animation */}
                  <motion.div
                    animate={isActive ? { y: -3, scale: 1.15 } : { y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  >
                    <Icon
                      className="w-[21px] h-[21px] transition-colors duration-300"
                      style={{ color: isActive ? item.color : 'hsl(220 10% 40%)' }}
                      strokeWidth={isActive ? 2.2 : 1.7}
                    />
                  </motion.div>

                  {/* Badge */}
                  <AnimatePresence>
                    {badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full text-[8px] text-white font-black flex items-center justify-center"
                        style={{
                          background: 'hsl(0 80% 55%)',
                          boxShadow: '0 2px 10px hsl(0 80% 55% / 0.5)',
                          border: '2px solid rgba(15,15,30,0.95)',
                        }}
                      >
                        {badge > 99 ? '99+' : badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Label */}
                <motion.span
                  animate={isActive ? { opacity: 1 } : { opacity: 0.4 }}
                  className="text-[9px] font-bold -mt-0.5 transition-colors duration-300"
                  style={{ color: isActive ? item.color : 'hsl(220 10% 40%)' }}
                >
                  {item.label}
                </motion.span>

                {/* Active dot */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 14, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="h-[2.5px] rounded-full mt-0.5"
                      style={{
                        background: item.color,
                        boxShadow: `0 0 8px ${item.glow}`,
                      }}
                    />
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminBottomNav;
