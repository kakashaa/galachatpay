import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import GuestLoginPrompt from "./GuestLoginPrompt";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { icon: User, label: "حسابي", path: "/dashboard" },
  { icon: MessageSquare, label: "الدعم", path: "/support-main", requiresAuth: true },
  { icon: Home, label: "الرئيسية", path: "/dashboard" },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const handleNav = (item: NavItem) => {
    if (item.requiresAuth && !isAuthenticated) {
      setShowLogin(true);
      return;
    }
    navigate(item.path);
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[85%] max-w-[360px]">
        <nav
          className="relative flex items-center justify-around px-3 py-3 rounded-[28px] border border-white/10 css-slide-up"
          style={{
            background: "rgba(15, 15, 25, 0.92)",
            boxShadow: "0 8px 40px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset",
          }}
        >
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isReallyActive = item.label === "الرئيسية"
              ? location.pathname === "/dashboard"
              : location.pathname === item.path;

            return (
              <button
                key={index}
                onClick={() => handleNav(item)}
                className="relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-colors duration-200 active:scale-90"
              >
                {isReallyActive && (
                  <div
                    className="absolute inset-0 rounded-2xl transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, hsl(8 88% 62% / 0.2), hsl(174 50% 55% / 0.1))",
                      border: "1px solid hsl(8 88% 62% / 0.3)",
                    }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 transition-colors duration-200 ${
                    isReallyActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] font-bold relative z-10 transition-colors duration-200 ${
                    isReallyActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="mx-auto mt-2 w-28 h-1 rounded-full bg-white/10" />
      </div>
      <GuestLoginPrompt open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default BottomNav;
