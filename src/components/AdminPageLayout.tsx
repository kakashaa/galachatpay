import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import AdminBottomNav from "@/components/AdminBottomNav";

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
  const [bottomTab, setBottomTab] = useState<'home' | 'search' | 'chat' | 'monitor' | 'favorites'>('home');

  const handleLogoutClick = async () => {
    if (!onLogout) return;
    const ok = await confirm({ title: "تسجيل الخروج", message: "هل تريد تسجيل الخروج؟", danger: true, confirmText: "خروج" });
    if (ok) onLogout();
  };

  // Floating particles (same as home)
  const particles = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: `${(i * 37 + 13) % 100}%`,
      bottom: `${(i * 23) % 60}%`,
      size: i % 3 === 0 ? 2 : 1,
      duration: 8 + (i % 7) * 3,
      delay: (i % 10) * 1.5,
      reverse: i % 2 === 0,
      opacity: i % 3 === 0 ? 0.5 : 0.25,
      color: i % 5 === 0 ? '#f59e0b' : i % 4 === 0 ? '#14b8a6' : '#ffffff',
    })), []);

  return (
    <>
    <div
      className="max-w-[448px] mx-auto relative flex flex-col"
      style={{ height: '100dvh', background: '#0c0f1d' }}
    >
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
        {particles.map((p) => (
          <div
            key={p.id}
            className={p.reverse ? 'particle-reverse' : 'particle'}
            style={{
              position: 'absolute',
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: p.color,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-[100px]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-40 left-0 w-60 h-60 bg-teal-500/5 rounded-full blur-[100px]" aria-hidden="true" />

      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 h-14 flex items-center justify-between flex-shrink-0"
        style={{
          background: 'rgba(12,15,29,0.85)',
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
            <ArrowLeft size={16} className="text-slate-400" strokeWidth={1.8} />
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
          className="relative z-10 flex-1 overflow-y-auto min-h-0 pb-28"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* Bottom Dock */}
      <AdminBottomNav
        active={bottomTab}
        onChange={(tab) => {
          if (tab === 'home') { navigate('/admin/dashboard'); return; }
          if (tab === 'monitor') { navigate('/admin/monitor'); return; }
          if (tab === 'chat') { navigate('/admin/chat'); return; }
          setBottomTab(tab);
        }}
      />
    </div>
    {ConfirmDialog}
    </>
  );
};

export default AdminPageLayout;
