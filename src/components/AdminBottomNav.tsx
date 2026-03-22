import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Bell, Eye, MoreHorizontal } from 'lucide-react';
import { useTapFeedback } from '@/hooks/use-tap-feedback';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
  monitorBadge?: number;
}

const navItems = [
  { key: 'home' as BottomTab, icon: Home, label: 'الرئيسية', gradient: 'from-amber-400 to-orange-500' },
  { key: 'search' as BottomTab, icon: Search, label: 'بحث', gradient: 'from-teal-400 to-cyan-500' },
  { key: 'chat' as BottomTab, icon: Bell, label: 'إشعارات', gradient: 'from-red-400 to-rose-500' },
  { key: 'monitor' as BottomTab, icon: Eye, label: 'المراقبة', gradient: 'from-blue-400 to-indigo-500' },
  { key: 'favorites' as BottomTab, icon: MoreHorizontal, label: 'المزيد', gradient: 'from-slate-400 to-slate-500' },
];

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge, monitorBadge }) => {
  const navigate = useNavigate();
  const tap = useTapFeedback();
  const [bouncingKey, setBouncingKey] = useState<string | null>(null);

  const handleTap = (item: typeof navItems[0]) => {
    tap();
    setBouncingKey(item.key);
    setTimeout(() => {
      setBouncingKey(null);
      if (item.key === 'monitor') { navigate('/admin/monitor'); return; }
      if (item.key === 'chat') { navigate('/admin/chat'); return; }
      onChange(item.key);
    }, 400);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 pointer-events-none z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto max-w-[448px] mx-auto px-6 mb-4">
        <div
          className="flex items-center justify-evenly rounded-[28px] px-3 py-2.5"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {navItems.map((item) => {
            const isActive = active === item.key;
            const Icon = item.icon;
            const isChatTab = item.key === 'chat';
            const isBouncing = bouncingKey === item.key;

            return (
              <button
                key={item.key}
                onClick={() => handleTap(item)}
                className="relative flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                      : 'bg-white/[0.07] hover:bg-white/[0.12]'
                  } ${isBouncing ? 'animate-mac-bounce' : ''}`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`}
                    strokeWidth={1.8}
                  />
                </div>
                {isChatTab && chatBadge && chatBadge > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full text-[8px] text-white font-bold flex items-center justify-center px-1 bg-red-500 shadow-md shadow-red-500/50"
                    style={{ border: '2px solid rgba(0,0,0,0.6)' }}
                  >
                    {chatBadge > 99 ? '99+' : chatBadge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminBottomNav;
