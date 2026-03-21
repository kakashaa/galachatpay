import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useConfirmModal } from "@/hooks/use-confirm-modal";

interface Props {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
  onLogout?: () => void;
  rightContent?: React.ReactNode;
}

const AdminPageLayout: React.FC<Props> = ({ title, children, accentColor, onLogout, rightContent }) => {
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirmModal();

  const handleLogoutClick = async () => {
    if (!onLogout) return;
    const ok = await confirm({ title: "تسجيل الخروج", message: "هل تريد تسجيل الخروج؟", danger: true, confirmText: "خروج" });
    if (ok) onLogout();
  };

  // Generate random stars once
  const stars = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      w: 1 + Math.random() * 2,
      top: Math.random() * 100,
      left: Math.random() * 100,
      opacity: 0.2 + Math.random() * 0.4,
      dur: 2 + Math.random() * 4,
      delay: Math.random() * 3,
    })), []);

  return (
    <>
    <div className="admin-theme admin-starry-bg max-w-[448px] mx-auto relative flex flex-col" style={{ height: '100dvh' }}>
      {/* Stars */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {stars.map(s => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              width: `${s.w}px`, height: `${s.w}px`,
              top: `${s.top}%`, left: `${s.left}%`,
              opacity: s.opacity,
              animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 px-4 h-14 flex items-center justify-between flex-shrink-0"
        style={{
          background: 'rgba(5,8,22,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-9 h-9 rounded-full bg-white/[0.07] hover:bg-white/[0.12] flex items-center justify-center active:scale-95 transition-all"
          >
            <ArrowRight size={16} className="text-slate-400" strokeWidth={1.8} />
          </button>
          <h1
            className="text-sm font-bold text-white"
            style={accentColor ? { color: accentColor } : {}}
          >
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {rightContent}
          {onLogout && (
            <button onClick={handleLogoutClick} className="w-9 h-9 rounded-full bg-white/[0.07] hover:bg-white/[0.12] flex items-center justify-center active:scale-95 transition-all">
              <LogOut size={14} className="text-slate-500" strokeWidth={1.8} />
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
          className="relative z-10 flex-1 overflow-y-auto min-h-0 pb-6"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
    {ConfirmDialog}
    </>
  );
};

export default AdminPageLayout;
