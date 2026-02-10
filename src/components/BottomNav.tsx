import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, MessageCircle, Mic, Compass, Home } from "lucide-react";

interface NavItem {
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  path: string;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  { icon: <User className="w-6 h-6" />, label: "أنا", path: "/dashboard" },
  { icon: <MessageCircle className="w-6 h-6" />, label: "الرسائل", path: "#" },
  { icon: <Mic className="w-7 h-7" />, label: "", path: "#", isCenter: true },
  { icon: <Compass className="w-6 h-6" />, label: "استكشف", path: "#" },
  { icon: <Home className="w-6 h-6" />, label: "الرئيسية", path: "#" },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-white/10 px-6 pt-3 pb-8 flex justify-between items-center rounded-t-[32px] max-w-[430px] mx-auto">
        {navItems.map((item, index) => {
          if (item.isCenter) {
            return (
              <div key={index} className="relative -top-8">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/40 border-[5px] border-background">
                  <span className="text-white">{item.icon}</span>
                </div>
              </div>
            );
          }

          const isActive = location.pathname === item.path;
          return (
            <button
              key={index}
              onClick={() => item.path !== "#" && navigate(item.path)}
              className={`flex flex-col items-center gap-1 ${isActive ? "text-primary" : "text-gray-400"}`}
            >
              {item.icon}
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-[60]" />
    </>
  );
};

export default BottomNav;
