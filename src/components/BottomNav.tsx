import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, FileText, Headset, User } from "lucide-react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: User, label: "حسابي", path: "/dashboard" },
  { icon: Headset, label: "الدعم", path: "/support" },
  { icon: FileText, label: "طلباتي", path: "/my-requests" },
  { icon: Home, label: "الرئيسية", path: "/dashboard" },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[85%] max-w-[360px]">
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 25, delay: 0.3 }}
        className="relative flex items-center justify-around px-3 py-3 rounded-[28px] border border-white/10"
        style={{
          background: "rgba(15, 15, 25, 0.85)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 8px 40px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 -2px 20px -2px hsl(8 88% 62% / 0.15)",
        }}
      >
        {navItems.map((item, index) => {
          const Icon = item.icon;

          // Make "الرئيسية" always active on dashboard, "حسابي" needs different check
          const isReallyActive = item.label === "الرئيسية" 
            ? location.pathname === "/dashboard"
            : location.pathname === item.path;

          return (
            <motion.button
              key={index}
              whileTap={{ scale: 0.85 }}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-colors duration-200"
            >
              {isReallyActive && (
                <motion.div
                  layoutId="dock-active"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, hsl(8 88% 62% / 0.2), hsl(174 50% 55% / 0.1))",
                    border: "1px solid hsl(8 88% 62% / 0.3)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
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
            </motion.button>
          );
        })}
      </motion.nav>
      {/* Bottom indicator */}
      <div className="mx-auto mt-2 w-28 h-1 rounded-full bg-white/10" />
    </div>
  );
};

export default BottomNav;
