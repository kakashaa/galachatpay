import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BarChart3, Home, ClipboardList } from "lucide-react";

const navItems = [
  { icon: ClipboardList, label: "السجل", path: "/agent/history" },
  { icon: Home, label: "الرئيسية", path: "/agent" },
  { icon: BarChart3, label: "الإحصائيات", path: "/agent/stats" },
];

const AgentBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
      <nav
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-amber-500/20"
        style={{
          background: "rgba(15, 15, 25, 0.88)",
          boxShadow: "0 8px 32px -6px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.1) inset",
          backdropFilter: "blur(16px)",
        }}
      >
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all duration-300 active:scale-90 ${
                active ? "bg-amber-500/15" : "hover:bg-white/5"
              }`}
              style={active ? { boxShadow: "0 0 14px rgba(245,158,11,0.25)" } : undefined}
            >
              <Icon className={`w-5 h-5 transition-colors duration-200 ${active ? "text-amber-400" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-bold transition-colors duration-200 ${active ? "text-amber-400" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AgentBottomNav;
