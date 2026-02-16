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
  { icon: User, label: "حسابي", path: "/my-requests" },
  { icon: MessageSquare, label: "الدعم", path: "/support-main", requiresAuth: true },
  { icon: Home, label: "الرئيسية", path: "/dashboard" },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);

  const handleNav = (item: NavItem, index: number) => {
    if (item.requiresAuth && !isAuthenticated) {
      setShowLogin(true);
      return;
    }
    setTappedIndex(index);
    navigate(item.path);
  };

  // Only highlight if user navigated via dock (tappedIndex set) AND path matches
  const isActive = (item: NavItem, index: number) => {
    return tappedIndex === index && location.pathname === item.path;
  };

  // Reset tapped state when navigating away from dock destinations
  React.useEffect(() => {
    const dockPaths = navItems.map(i => i.path);
    if (!dockPaths.includes(location.pathname)) {
      setTappedIndex(null);
    }
  }, [location.pathname]);

  return (
    <>
      <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
        <nav
          className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/10 css-slide-up"
          style={{
            background: "rgba(15, 15, 25, 0.88)",
            boxShadow: "0 8px 32px -6px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset",
            backdropFilter: "blur(16px)",
          }}
        >
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item, index);

            return (
              <button
                key={index}
                onClick={() => handleNav(item, index)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-300 active:scale-90 group ${
                  active ? "bg-primary/15" : "hover:bg-white/5"
                }`}
                style={active ? { boxShadow: "0 0 14px hsl(8 88% 62% / 0.25)" } : undefined}
              >
                <div className={`transition-transform duration-300 ${active ? "animate-dock-bounce" : "group-hover:animate-dock-wiggle"}`}>
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span
                  className={`text-[9px] font-bold transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
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
