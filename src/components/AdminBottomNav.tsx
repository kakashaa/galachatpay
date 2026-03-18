import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, Eye, MoreHorizontal } from 'lucide-react';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
}

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge }) => {
  const navigate = useNavigate();

  const tabs: { key: BottomTab; label: string; icon: React.ElementType }[] = [
    { key: 'home', label: 'الرئيسية', icon: Home },
    { key: 'search', label: 'بحث', icon: Search },
    { key: 'chat', label: 'الدردشة', icon: MessageCircle },
    { key: 'monitor', label: 'مراقبة', icon: Eye },
    { key: 'favorites', label: 'المزيد', icon: MoreHorizontal },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-[#09090b]/95 backdrop-blur-xl border-t border-zinc-800/50" />
      <div className="relative max-w-md mx-auto flex items-end justify-around px-8 pb-[max(env(safe-area-inset-bottom),1.75rem)] pt-2">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const isCenter = i === 2;
          const isActive = active === tab.key;

          if (isCenter) {
            return (
              <button
                key={tab.key}
                onClick={() => navigate("/admin/chat")}
                className="-mt-5 active:scale-90 transition-transform"
              >
                <div className="relative">
                  <div className="w-[50px] h-[50px] rounded-[16px] bg-emerald-500 flex items-center justify-center shadow-[0_4px_24px_rgba(34,197,94,0.3)]">
                    <Icon className="w-[22px] h-[22px] text-black" />
                  </div>
                  {chatBadge && chatBadge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-red-500 text-[8px] text-white font-bold flex items-center justify-center px-0.5">
                      {chatBadge > 99 ? '99+' : chatBadge}
                    </span>
                  )}
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            >
              <Icon className={`w-[20px] h-[20px] ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`} />
              <span className={`text-[8px] ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminBottomNav;
