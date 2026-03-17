import React from 'react';
import { Search, MessageSquare, Users, Home, Eye, Star, Ban, Crown } from 'lucide-react';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
  /** Currently active service tab icon override */
  activeServiceIcon?: React.ReactNode;
}

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge }) => {
  const tabs: { key: BottomTab; icon: React.ReactNode; filled?: boolean }[] = [
    { key: 'search', icon: <Search className="w-5 h-5" /> },
    { key: 'home', icon: <Home className="w-5 h-5" />, filled: true },
    { key: 'chat', icon: <Users className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-4 px-4 py-2 rounded-full"
        style={{
          background: 'rgba(38, 38, 38, 0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(72, 72, 71, 0.15)',
          boxShadow: '0 0 12px rgba(52, 235, 69, 0.04)',
        }}
      >
        {tabs.map(tab => {
          const isActive = active === tab.key;
          const isCenterButton = tab.key === 'home';

          if (isCenterButton) {
            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className="rounded-full p-3 transition-all hover:scale-110 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #34eb45, #00d632)',
                  color: '#0e0e0e',
                  transform: 'scale(1.1)',
                }}
              >
                {tab.icon}
              </button>
            );
          }

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="relative p-3 rounded-full transition-all"
              style={{
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                background: isActive ? 'rgba(32,31,31,0.8)' : 'transparent',
              }}
            >
              {tab.icon}
              {tab.key === 'chat' && chatBadge && chatBadge > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center text-white text-[8px] font-bold rounded-full"
                  style={{ background: '#ff7162' }}
                >
                  {chatBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default AdminBottomNav;
