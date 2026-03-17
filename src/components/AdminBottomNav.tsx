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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-6">
      <div
        className="flex items-center justify-around w-full max-w-md rounded-2xl h-16 px-4"
        style={{
          background: 'rgba(19, 19, 19, 0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(72, 72, 71, 0.15)',
          boxShadow: '0 0 20px rgba(52, 235, 69, 0.06)',
        }}
      >
        {tabs.map(tab => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[48px] transition-all duration-200',
                isActive ? 'text-[#34eb45] -translate-y-1 scale-110' : 'text-white/40 hover:text-white/70'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
                isActive && 'bg-[#34eb45]/10'
              )}>
                {tab.icon}
              </div>
              <span className="text-[9px] font-medium">{tab.label}</span>
              {tab.key === 'chat' && chatBadge && chatBadge > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[8px] font-bold rounded-full">
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
