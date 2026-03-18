import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, Monitor, MoreHorizontal } from 'lucide-react';

type BottomTab = 'home' | 'search' | 'chat' | 'monitor' | 'favorites';

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  chatBadge?: number;
}

const navItems = [
  { key: 'home' as BottomTab, icon: Home, label: 'الرئيسية' },
  { key: 'search' as BottomTab, icon: Search, label: 'بحث' },
  { key: 'chat' as BottomTab, icon: MessageCircle, label: 'المحادثات', center: true },
  { key: 'monitor' as BottomTab, icon: Monitor, label: 'المراقبة' },
  { key: 'favorites' as BottomTab, icon: MoreHorizontal, label: 'المزيد' },
];

const AdminBottomNav: React.FC<Props> = ({ active, onChange, chatBadge }) => {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] h-20 bg-background/95 backdrop-blur-md border-t border-border z-50 flex items-center justify-around px-2">
      {navItems.map((item) => {
        const isActive = active === item.key;
        const Icon = item.icon;

        if (item.center) {
          return (
            <button
              key={item.key}
              onClick={() => navigate("/admin/chat")}
              className="w-14 h-14 -translate-y-6 bg-admin-emerald rounded-2xl shadow-lg shadow-admin-emerald/40 flex items-center justify-center active:scale-95 transition-transform relative"
            >
              <Icon size={24} className="text-white" />
              {chatBadge && chatBadge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-admin-rose text-[8px] text-white font-bold flex items-center justify-center px-0.5 border-2 border-background">
                  {chatBadge > 99 ? '99+' : chatBadge}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className="flex flex-col items-center gap-1 pt-2 active:scale-95 transition-transform"
          >
            <Icon
              size={20}
              className={isActive ? 'text-admin-emerald' : 'text-muted-foreground'}
            />
            <span
              className={`text-[10px] font-medium ${isActive ? 'text-admin-emerald' : 'text-muted-foreground'}`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default AdminBottomNav;
