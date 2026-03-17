import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  title: string;
  badge?: string;
  children: React.ReactNode;
  onBack: () => void;
}

const AdminServiceWrapper: React.FC<Props> = ({ title, badge, children, onBack }) => {
  return (
    <div className="min-h-screen pb-24" dir="rtl" style={{ background: '#0e0e0e' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between w-full px-4 h-14 border-b border-white/[0.04]" style={{ background: 'rgba(14,14,14,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-white/[0.06] active:scale-95 transition-all"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-emerald-400" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
            {title}
          </h1>
        </div>
        {badge && (
          <span className="text-xs font-black tracking-tighter text-emerald-400">{badge}</span>
        )}
      </header>
      
      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto px-4 py-6 space-y-6"
      >
        {children}
      </motion.main>
    </div>
  );
};

/** Section header with colored bar */
export const SectionHeader: React.FC<{
  title: string;
  badge?: string;
  badgeColor?: string;
  barColor?: string;
  action?: React.ReactNode;
}> = ({ title, badge, badgeColor = 'bg-emerald-500/10 text-emerald-400', barColor = 'bg-emerald-500', action }) => (
  <div className="flex items-center justify-between px-1">
    <div className="flex items-center gap-2">
      <span className={`w-1 h-6 rounded-full ${barColor}`} />
      <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
      {badge && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
      )}
    </div>
    {action}
  </div>
);

/** Glass panel card */
export const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}> = ({ children, className = '', glow }) => (
  <div
    className={`rounded-xl p-5 border border-white/[0.06] ${className}`}
    style={{
      background: 'rgba(19, 19, 19, 0.95)',
      backdropFilter: 'blur(20px)',
      ...(glow ? { boxShadow: '0 0 20px rgba(52, 235, 69, 0.06)' } : {}),
    }}
  >
    {children}
  </div>
);

/** Kinetic green gradient button */
export const KineticButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }> = ({
  children, loading, className = '', ...props
}) => (
  <button
    {...props}
    className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 ${className}`}
    style={{
      background: 'linear-gradient(135deg, #34eb45 0%, #00d632 100%)',
      color: '#004108',
      boxShadow: '0 0 20px rgba(52, 235, 69, 0.15)',
    }}
  >
    {children}
  </button>
);

export default AdminServiceWrapper;
