import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Shield, BarChart3, Headset, ClipboardList, DollarSign,
  Hash, ShoppingBag, Settings, Briefcase, Users, ScrollText,
  Search, MessageSquare, Loader2, Clock, Zap, TrendingUp,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { playUrgentSound } from '@/lib/notificationSound';

/* ─── Shift Countdown ─── */
const ShiftCountdown: React.FC<{ shiftStart: string | null; shiftEnd: string | null }> = ({ shiftStart, shiftEnd }) => {
  const [remaining, setRemaining] = useState('');
  const [progress, setProgress] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const alertPlayedRef = React.useRef(false);

  useEffect(() => {
    if (!shiftEnd) { setRemaining('—'); return; }
    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    };
    const update = () => {
      const now = new Date();
      const endDate = parseTime(shiftEnd);
      const startDate = shiftStart ? parseTime(shiftStart) : now;
      if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
      const totalMs = endDate.getTime() - startDate.getTime();
      const remainMs = endDate.getTime() - now.getTime();
      if (remainMs <= 0) { setRemaining('انتهى'); setProgress(100); setIsOvertime(true); return; }
      if (remainMs <= 5 * 60 * 1000 && remainMs > 0 && !alertPlayedRef.current) {
        alertPlayedRef.current = true; playUrgentSound(); setTimeout(() => playUrgentSound(), 2000);
      }
      setIsOvertime(false);
      setProgress(Math.min(100, ((totalMs - remainMs) / totalMs) * 100));
      const hours = Math.floor(remainMs / 3600000);
      const mins = Math.floor((remainMs % 3600000) / 60000);
      const secs = Math.floor((remainMs % 60000) / 1000);
      setRemaining(hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${mins}:${String(secs).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [shiftStart, shiftEnd]);

  const barGradient = isOvertime
    ? 'from-rose-500 to-red-600'
    : progress > 75 ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500';
  const textColor = isOvertime ? 'text-rose-400' : progress > 75 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="mt-3 p-3 rounded-xl bg-black/20 backdrop-blur-sm border border-white/[0.04]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{shiftStart || '—'} → {shiftEnd || '—'}</span>
        </div>
        <span className={`text-sm font-black font-mono ${textColor} tracking-wider`}>{remaining}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

/* ─── Animated Counter ─── */
const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {value}
    </motion.span>
  );
};

/* ─── Types ─── */
interface Props {
  adminDisplayName: string;
  adminRole: string | null;
  stats: { pending: number; approved: number; rejected: number };
  badges: Record<string, number>;
  onServiceClick: (key: string) => void;
  onChatClick: () => void;
  recentLogs: any[];
  isOwner: boolean;
  isSuperAdmin: boolean;
}

interface ServiceItem {
  key: string; label: string; icon: React.ElementType;
  gradient: string; iconColor: string; glowColor: string;
  badge?: number; route?: string;
}

const AdminHomeView: React.FC<Props> = ({
  adminDisplayName, adminRole, stats, badges,
  onServiceClick, _onChatClick, recentLogs, isOwner, isSuperAdmin,
}: any) => {
  const navigate = useNavigate();
  const [searchUuid, setSearchUuid] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const roleLabel = adminRole === 'owner' ? 'مدير النظام الأعلى'
    : adminRole === 'super_admin' ? 'مسؤول أعلى'
    : adminRole === 'admin' ? 'مسؤول' : 'مشرف';
  const roleIcon = adminRole === 'owner' ? '👑' : adminRole === 'super_admin' ? '⚡' : '🛡️';

  const shiftStart = sessionStorage.getItem("admin_shift_start");
  const shiftEnd = sessionStorage.getItem("admin_shift_end");

  const searchUser = useCallback(async () => {
    if (!searchUuid.trim()) return;
    setSearching(true); setSearchResult(null);
    try {
      const res = await fetch(`https://galachat.site/project-z/api.php?action=admin_user_info&admin_key=ghala2026owner&uuid=${searchUuid.trim()}`);
      const data = await res.json();
      if (data.success) setSearchResult(data);
      else { toast.error("لم يتم العثور على المستخدم"); setSearchResult(null); }
    } catch { toast.error("خطأ في الاتصال"); }
    setSearching(false);
  }, [searchUuid]);

  const services: ServiceItem[] = [
    ...(isSuperAdmin ? [
      { key: 'vip', label: 'VIP', icon: Crown, gradient: 'from-amber-500/20 to-yellow-600/10', iconColor: 'text-amber-400', glowColor: '234,179,8', badge: badges.vip || 0, route: '/admin/vip' },
      { key: 'protection', label: 'الحماية', icon: Shield, gradient: 'from-rose-500/20 to-red-600/10', iconColor: 'text-rose-400', glowColor: '239,68,68', badge: badges.protection || 0, route: '/admin/ban' },
      { key: 'reports', label: 'المداخيل', icon: BarChart3, gradient: 'from-sky-500/20 to-blue-600/10', iconColor: 'text-sky-400', glowColor: '56,189,248', route: '/admin/income' },
    ] : []),
    { key: 'support', label: 'الدعم', icon: Headset, gradient: 'from-cyan-500/20 to-teal-600/10', iconColor: 'text-cyan-400', glowColor: '6,182,212', badge: badges.support || 0, route: '/admin/support' },
    ...(isSuperAdmin ? [
      { key: 'requests', label: 'الهدايا', icon: ShoppingBag, gradient: 'from-pink-500/20 to-rose-600/10', iconColor: 'text-pink-400', glowColor: '236,72,153', badge: badges.requests || 0, route: '/admin/gifts' },
      { key: 'salary', label: 'الرواتب', icon: DollarSign, gradient: 'from-emerald-500/20 to-green-600/10', iconColor: 'text-emerald-400', glowColor: '34,197,94', badge: badges.salary || 0, route: '/admin/salary' },
      { key: 'change_id', label: 'آيدي', icon: Hash, gradient: 'from-purple-500/20 to-violet-600/10', iconColor: 'text-purple-400', glowColor: '168,85,247', route: '/admin/id-change' },
      { key: 'bd', label: 'البيدي', icon: Briefcase, gradient: 'from-violet-500/20 to-indigo-600/10', iconColor: 'text-violet-400', glowColor: '147,51,234', route: '/admin/bd' },
    ] : []),
    ...(isOwner ? [
      { key: 'settings', label: 'الإعدادات', icon: Settings, gradient: 'from-slate-500/20 to-gray-600/10', iconColor: 'text-slate-400', glowColor: '100,116,139', route: '/admin/settings' },
      { key: 'agencies', label: 'الوكالات', icon: ClipboardList, gradient: 'from-amber-500/20 to-orange-600/10', iconColor: 'text-amber-400', glowColor: '245,158,11', route: '/admin/agencies' },
      { key: 'accounts', label: 'الأدمن', icon: Users, gradient: 'from-teal-500/20 to-emerald-600/10', iconColor: 'text-teal-400', glowColor: '20,184,166', route: '/admin/accounts' },
      { key: 'audit_log', label: 'السجل', icon: ScrollText, gradient: 'from-indigo-500/20 to-blue-600/10', iconColor: 'text-indigo-400', glowColor: '99,102,241', route: '/admin/log' },
    ] : []),
  ];

  const statItems = [
    { label: 'معلقة', value: stats.pending, icon: Clock, gradient: 'from-amber-500 to-orange-600', bgGlow: 'rgba(245,158,11,0.15)' },
    { label: 'مقبولة', value: stats.approved, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-600', bgGlow: 'rgba(34,197,94,0.15)' },
    { label: 'مرفوضة', value: stats.rejected, icon: Activity, gradient: 'from-rose-500 to-red-600', bgGlow: 'rgba(239,68,68,0.15)' },
  ];

  return (
    <div className="relative z-10 px-3 pb-24" dir="rtl">

      {/* ══════ Hero Profile Card ══════ */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="relative mt-3 mb-4 overflow-hidden rounded-3xl"
      >
        {/* 3D Glass background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-cyan-600/5" />
        <div className="absolute inset-0 backdrop-blur-xl" />
        <div className="absolute inset-0 border border-white/[0.08] rounded-3xl" />
        {/* Floating orbs for depth */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-cyan-500/10 blur-2xl" />

        <div className="relative p-5">
          {/* Header row */}
          <div className="flex items-center gap-3 mb-1">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
                style={{ transform: 'perspective(200px) rotateY(-5deg)' }}>
                <span className="text-2xl">{roleIcon}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-black" />
              </div>
            </motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-foreground truncate">أهلاً، {adminDisplayName}</h2>
              <p className="text-[11px] font-bold text-emerald-400/90">{roleLabel}</p>
            </div>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-emerald-400 font-bold">متصل</span>
            </motion.div>
          </div>

          {/* Shift Timer */}
          {(shiftStart || shiftEnd) && <ShiftCountdown shiftStart={shiftStart} shiftEnd={shiftEnd} />}

          {/* Stats Cards — 3D perspective */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {statItems.map((s, i) => {
              const SIcon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20, rotateX: -15 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 200 }}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-3 text-center"
                  style={{
                    background: s.bgGlow,
                    transform: 'perspective(500px)',
                  }}
                >
                  <div className="absolute top-1.5 right-1.5 opacity-20">
                    <SIcon className="w-4 h-4 text-white" />
                  </div>
                  <AnimatedNumber
                    value={s.value}
                    className={`text-2xl font-black font-mono bg-gradient-to-b ${s.gradient} bg-clip-text text-transparent`}
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5 font-bold">{s.label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ══════ Quick Search ══════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-4"
      >
        <div className="relative group">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
          <input
            value={searchUuid}
            onChange={e => setSearchUuid(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUser()}
            placeholder="🔍  ابحث بالـ UUID..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-emerald-500/30 focus:bg-white/[0.06] transition-all duration-300 font-mono text-foreground placeholder:text-muted-foreground/60"
            dir="ltr"
          />
          <button
            onClick={searchUser}
            disabled={searching}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 flex items-center justify-center transition-colors"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Search className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Search Result */}
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-3 relative overflow-hidden rounded-2xl border border-white/[0.08]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-md" />
              <div className="relative p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={searchResult.avatar}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/25 shadow-lg"
                    alt=""
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base text-foreground truncate">{searchResult.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">#{searchResult.uuid}</p>
                    {searchResult.vip_level > 0 && (
                      <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-400 font-bold border border-amber-500/20">
                        ⭐ VIP {searchResult.vip_level}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'الراتب', value: `$${searchResult.salary || 0}`, gradient: 'from-emerald-500 to-green-600' },
                    { label: 'مستوى الداعم', value: searchResult.sender_level || '0', gradient: 'from-blue-500 to-indigo-600' },
                    { label: 'مستوى الدعم', value: searchResult.receiver_level || '0', gradient: 'from-purple-500 to-violet-600' },
                    { label: 'مستوى الشحن', value: searchResult.charger_level || '0', gradient: 'from-cyan-500 to-teal-600' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl bg-black/20 border border-white/[0.04] p-2.5 text-center">
                      <p className={`text-lg font-black font-mono bg-gradient-to-b ${s.gradient} bg-clip-text text-transparent`}>{s.value}</p>
                      <p className="text-[8px] text-muted-foreground font-bold mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {[
                    { label: 'حظر', route: `/admin/ban?uuid=${searchResult.uuid}`, gradient: 'from-rose-500/15 to-red-500/5', border: 'border-rose-500/20', text: 'text-rose-400' },
                    { label: 'VIP', route: `/admin/vip?uuid=${searchResult.uuid}`, gradient: 'from-amber-500/15 to-yellow-500/5', border: 'border-amber-500/20', text: 'text-amber-400' },
                    { label: 'آيدي', route: `/admin/id-change?uuid=${searchResult.uuid}`, gradient: 'from-purple-500/15 to-violet-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
                  ].map(btn => (
                    <motion.button
                      key={btn.label}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => navigate(btn.route)}
                      className={`flex-1 py-2.5 rounded-xl bg-gradient-to-b ${btn.gradient} border ${btn.border} ${btn.text} text-xs font-black`}
                    >
                      {btn.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ══════ Chat Quick Access ══════ */}
      <motion.div
        className="flex gap-2.5 mb-5"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.35 }}
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/admin/chat")}
          className="flex-1 relative overflow-hidden rounded-2xl py-3 px-4 flex items-center justify-center gap-2"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 rounded-2xl" />
          <Shield className="relative w-4 h-4 text-emerald-400" />
          <span className="relative text-[11px] text-emerald-400 font-black">مجموعة المشرفين</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/admin/chat")}
          className="flex-1 relative overflow-hidden rounded-2xl py-3 px-4 flex items-center justify-center gap-2"
        >
          <div className="absolute inset-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
          <MessageSquare className="relative w-4 h-4 text-muted-foreground" />
          <span className="relative text-[11px] text-muted-foreground font-bold">الكل</span>
        </motion.button>
      </motion.div>

      {/* ══════ Services Section ══════ */}
      <div className="flex items-center gap-2 mb-3 pr-1">
        <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600" />
        <h3 className="text-sm font-black text-foreground">الخدمات</h3>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/[0.06]" />
      </div>

      <motion.div
        className="grid grid-cols-3 gap-3 px-1 mb-5"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {services.map(svc => {
          const Icon = svc.icon;
          return (
            <motion.button
              key={svc.key}
              variants={{
                hidden: { opacity: 0, y: 25, scale: 0.85 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              whileTap={{ scale: 0.88, rotateX: 8 }}
              whileHover={{ scale: 1.06, y: -3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={() => svc.route ? navigate(svc.route) : onServiceClick(svc.key)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="relative" style={{ perspective: '300px' }}>
                {/* 3D Icon Card */}
                <div
                  className={`relative w-[60px] h-[60px] rounded-[18px] bg-gradient-to-br ${svc.gradient} border border-white/[0.08] flex items-center justify-center overflow-hidden transition-all duration-300`}
                  style={{
                    boxShadow: `0 8px 24px -4px rgba(${svc.glowColor},0.2), inset 0 1px 0 rgba(255,255,255,0.06)`,
                    transform: 'perspective(300px) rotateX(0deg)',
                  }}
                >
                  {/* Glass shine */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent h-1/2" />
                  <Icon className={`relative w-6 h-6 ${svc.iconColor} drop-shadow-sm transition-transform duration-300 group-hover:scale-110`} />
                </div>

                {/* Badge */}
                {svc.badge && svc.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full bg-gradient-to-b from-red-500 to-rose-600 text-white text-[9px] font-black flex items-center justify-center px-1.5 shadow-lg shadow-red-500/40 border border-red-400/30"
                  >
                    {svc.badge > 99 ? '99+' : svc.badge}
                  </motion.span>
                )}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground/80 group-hover:text-foreground transition-colors">
                {svc.label}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* ══════ Recent Activity ══════ */}
      {recentLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-3 pr-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/10" />
              <p className="text-sm font-black text-muted-foreground">آخر العمليات</p>
            </div>
            {isOwner && (
              <button onClick={() => navigate("/admin/log")} className="text-[10px] text-emerald-400 font-bold hover:underline">عرض الكل ←</button>
            )}
          </div>
          <div className="space-y-2">
            {recentLogs.slice(0, 4).map((log: any, i: number) => (
              <motion.div
                key={log.id || i}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                className="flex items-center gap-2.5 py-2.5 px-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-sm hover:bg-white/[0.04] transition-colors"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  log.action?.includes('reject') || log.action?.includes('ban') || log.action?.includes('delete')
                    ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                    : 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                }`} />
                <p className="text-[11px] text-foreground/80 truncate flex-1 font-medium">{log.action_label || log.action || 'عملية'}</p>
                <span className="text-[9px] text-muted-foreground whitespace-nowrap font-mono">
                  {log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminHomeView;
