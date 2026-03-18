import React from 'react';
import { Home, Search, MessageSquare, Eye, Star } from 'lucide-react';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
}

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge }) => {
  const tabs: { key: BottomTab; label: string; icon: React.ElementType }[] = [
    { key: 'favorites', label: 'المفضلة', icon: Star },
    { key: 'monitor', label: 'مراقبة', icon: Eye },
    { key: 'home', label: 'الرئيسية', icon: Home },
    { key: 'search', label: 'بحث', icon: Search },
    { key: 'chat', label: 'الدردشة', icon: MessageSquare },
  ];

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
      <nav
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/10"
        style={{
          background: "rgba(15, 15, 25, 0.88)",
          boxShadow: "0 8px 32px -6px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset",
          backdropFilter: "blur(16px)",
        }}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-300 active:scale-90 group ${
                isActive ? 'bg-primary/15' : 'hover:bg-white/5'
              }`}
              style={isActive ? { boxShadow: '0 0 14px hsl(8 88% 62% / 0.25)' } : undefined}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'animate-dock-bounce' : 'group-hover:animate-dock-wiggle'}`}>
                <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-[9px] font-bold transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
              {tab.key === 'chat' && chatBadge && chatBadge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[8px] font-bold rounded-full">
                  {chatBadge > 99 ? '99+' : chatBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminBottomNav;
