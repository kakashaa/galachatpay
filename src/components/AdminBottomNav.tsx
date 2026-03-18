import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
}

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
      document.head.appendChild(link);
    }
  }, []);

  const tabs: { key: BottomTab; label: string; iconClass: string; isCenter?: boolean }[] = [
    { key: 'home', label: 'الرئيسية', iconClass: 'fa-solid fa-house' },
    { key: 'search', label: 'بحث', iconClass: 'fa-solid fa-magnifying-glass' },
    { key: 'chat', label: 'الدردشة', iconClass: 'fa-solid fa-comments', isCenter: true },
    { key: 'monitor', label: 'المراقبة', iconClass: 'fa-solid fa-chart-simple' },
    { key: 'favorites', label: 'المزيد', iconClass: 'fa-solid fa-bars' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-admin-bg/95 backdrop-blur-sm border-t border-border z-50">
      <div className="max-w-[448px] mx-auto px-4 py-2" dir="rtl">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            if (tab.isCenter) {
              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => navigate('/admin/chat')}
                  className="relative -mt-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--admin-emerald)), hsl(var(--success)))',
                    boxShadow: '0 12px 30px -14px hsl(var(--admin-emerald) / 0.9)',
                  }}
                >
                  <i className={`${tab.iconClass} text-2xl text-primary-foreground`} />
                  {chatBadge && chatBadge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-admin-rose rounded-full text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                      {chatBadge > 99 ? '99+' : chatBadge}
                    </span>
                  )}
                </button>
              );
            }

            const isActive = active === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className="flex flex-col items-center gap-1 p-2 active:scale-95 transition-transform"
              >
                <i className={`${tab.iconClass} text-xl ${isActive ? 'text-admin-emerald' : 'text-admin-muted'}`} />
                <span className={`text-[10px] ${isActive ? 'text-admin-emerald' : 'text-admin-muted'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default AdminBottomNav;
