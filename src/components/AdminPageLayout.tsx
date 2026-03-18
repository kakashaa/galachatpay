import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
  onLogout?: () => void;
  rightContent?: React.ReactNode;
}

const AdminPageLayout: React.FC<Props> = ({ title, children, accentColor, onLogout, rightContent }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-[448px] mx-auto relative flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowRight size={18} />
          </button>
          <h1
            className="text-base font-bold tracking-tight"
            style={accentColor ? { color: accentColor } : {}}
          >
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {rightContent}
          {onLogout && (
            <button onClick={onLogout} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
              <LogOut size={16} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.main
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="flex-1 overflow-y-auto min-h-0 pb-6"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
};

export default AdminPageLayout;
