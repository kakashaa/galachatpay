import React from 'react';
import { Home, Search, MessageSquare, Eye, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
}

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge }) => {
  const tabs: { key: BottomTab; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'الرئيسية', icon: <Home className="w-5 h-5" /> },
    { key: 'monitor', label: 'مراقبة', icon: <Eye className="w-5 h-5" /> },
    { key: 'chat', label: 'الدردشة', icon: <MessageSquare className="w-5 h-5" /> },
    { key: 'search', label: 'بحث', icon: <Search className="w-5 h-5" /> },
    { key: 'favorites', label: 'المفضلة', icon: <Star className="w-5 h-5" /> },
  ];

  return (
    <nav className="sticky bottom-0 z-30 border-t border-white/5 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)]" style={{ background: 'rgba(9,9,11,0.95)' }}>
      <div className="flex items-center justify-around max-w-2xl mx-auto">
        {tabs.map(tab => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px] transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-xl transition-colors',
                isActive && 'bg-primary/15'
              )}>
                {tab.icon}
              </div>
              <span className="text-[9px] font-medium">{tab.label}</span>
              {tab.key === 'chat' && chatBadge && chatBadge > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[8px] font-bold rounded-full">
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
