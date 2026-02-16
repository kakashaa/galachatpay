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
      <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}>
        <nav
          className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-white/10 css-slide-up"
          style={{
            background: "rgba(15, 15, 25, 0.88)",
            boxShadow: "0 8px 32px -6px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset",
            backdropFilter: "blur(16px)",
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
                className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${
                  isReallyActive ? "bg-primary/15" : "hover:bg-white/5"
                }`}
                style={isReallyActive ? { boxShadow: "0 0 12px hsl(8 88% 62% / 0.3)" } : undefined}
              >
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isReallyActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>
      <GuestLoginPrompt open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default BottomNav;
