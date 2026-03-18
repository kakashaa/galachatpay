import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crown, Shield, BarChart3, Headset, ClipboardList, DollarSign,
  Hash, ShoppingBag, Settings, Briefcase, Users, ScrollText,
  Search, MessageSquare, Loader2, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { playUrgentSound } from '@/lib/notificationSound';

interface ServiceItem {
  key: string;
  label: string;
  icon: React.ElementType;
  bg: string;
  iconColor: string;
  shadowColor: string;
  badge?: number;
  route?: string;
}

// Shift countdown sub-component
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
        alertPlayedRef.current = true;
        playUrgentSound();
        setTimeout(() => playUrgentSound(), 2000);
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

  const barColor = isOvertime ? 'bg-rose-500' : progress > 75 ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = isOvertime ? 'text-rose-400' : progress > 75 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="mt-2 px-2.5 py-2 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">الدوام: {shiftStart || '—'} - {shiftEnd || '—'}</span>
        </div>
        <span className={`text-[11px] font-bold font-mono ${textColor}`}>{remaining}</span>
      </div>
      <div className="w-full h-1 rounded-full bg-white/[0.04] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.8 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const AdminHomeView: React.FC<Props> = ({
  adminDisplayName, adminRole, stats, badges,
  onServiceClick, onChatClick, recentLogs, isOwner, isSuperAdmin,
}) => {
  const navigate = useNavigate();
  const [searchUuid, setSearchUuid] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const roleLabel = adminRole === 'owner' ? 'مدير النظام الأعلى'
    : adminRole === 'super_admin' ? 'مسؤول أعلى'
    : adminRole === 'admin' ? 'مسؤول' : 'مشرف';

  const shiftStart = sessionStorage.getItem("admin_shift_start");
  const shiftEnd = sessionStorage.getItem("admin_shift_end");

  // UUID Search — uses direct API
  const searchUser = useCallback(async () => {
    if (!searchUuid.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(
        `https://galachat.site/project-z/api.php?action=admin_user_info&admin_key=ghala2026owner&uuid=${searchUuid.trim()}`
      );
      const data = await res.json();
      if (data.success) {
        setSearchResult(data);
      } else {
        toast.error("لم يتم العثور على المستخدم");
        setSearchResult(null);
      }
    } catch {
      toast.error("خطأ في الاتصال");
    }
    setSearching(false);
  }, [searchUuid]);

  // Build 3-column service grid
  const services: ServiceItem[] = [
    ...(isSuperAdmin ? [
      { key: 'vip', label: 'VIP', icon: Crown, bg: 'bg-yellow-500/[0.12]', iconColor: 'text-yellow-400', shadowColor: 'rgba(234,179,8,0.3)', badge: badges.vip || 0, route: '/admin/vip' },
      { key: 'protection', label: 'الحماية', icon: Shield, bg: 'bg-red-500/[0.12]', iconColor: 'text-red-400', shadowColor: 'rgba(239,68,68,0.3)', badge: badges.protection || 0, route: '/admin/ban' },
      { key: 'reports', label: 'المداخيل', icon: BarChart3, bg: 'bg-sky-500/[0.12]', iconColor: 'text-sky-400', shadowColor: 'rgba(56,189,248,0.3)', route: '/admin/income' },
    ] : []),
    { key: 'support', label: 'الدعم', icon: Headset, bg: 'bg-cyan-500/[0.12]', iconColor: 'text-cyan-400', shadowColor: 'rgba(6,182,212,0.3)', badge: badges.support || 0, route: '/admin/support' },
    ...(isSuperAdmin ? [
      { key: 'requests', label: 'الهدايا', icon: ShoppingBag, bg: 'bg-pink-500/[0.12]', iconColor: 'text-pink-400', shadowColor: 'rgba(236,72,153,0.3)', badge: badges.requests || 0, route: '/admin/gifts' },
      { key: 'salary', label: 'الرواتب', icon: DollarSign, bg: 'bg-emerald-500/[0.12]', iconColor: 'text-emerald-400', shadowColor: 'rgba(34,197,94,0.3)', badge: badges.salary || 0, route: '/admin/salary' },
      { key: 'change_id', label: 'آيدي', icon: Hash, bg: 'bg-purple-500/[0.12]', iconColor: 'text-purple-400', shadowColor: 'rgba(168,85,247,0.3)', route: '/admin/id-change' },
      { key: 'bd', label: 'البيدي', icon: Briefcase, bg: 'bg-violet-500/[0.12]', iconColor: 'text-violet-400', shadowColor: 'rgba(147,51,234,0.3)', route: '/admin/bd' },
    ] : []),
    ...(isOwner ? [
      { key: 'settings', label: 'الإعدادات', icon: Settings, bg: 'bg-slate-500/[0.12]', iconColor: 'text-slate-400', shadowColor: 'rgba(100,116,139,0.3)', route: '/admin/settings' },
      { key: 'agencies', label: 'الوكالات', icon: ClipboardList, bg: 'bg-amber-500/[0.12]', iconColor: 'text-amber-400', shadowColor: 'rgba(245,158,11,0.3)', route: '/admin/agencies' },
      { key: 'accounts', label: 'الأدمن', icon: Users, bg: 'bg-emerald-500/[0.12]', iconColor: 'text-emerald-400', shadowColor: 'rgba(34,197,94,0.3)', route: '/admin/accounts' },
      { key: 'audit_log', label: 'السجل', icon: ScrollText, bg: 'bg-violet-500/[0.12]', iconColor: 'text-violet-400', shadowColor: 'rgba(139,92,246,0.3)', route: '/admin/log' },
    ] : []),
  ];

  return (
    <div className="relative z-10 px-3 pb-4" dir="rtl">
      {/* Quick Search */}
      <div className="mt-3 mb-3">
        <div className="relative">
          <input
            value={searchUuid}
            onChange={e => setSearchUuid(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUser()}
            placeholder="معرف المستخدم (UUID)"
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-emerald-500/30 transition-colors font-mono text-foreground placeholder:text-muted-foreground"
            dir="ltr"
          />
          <button
            onClick={searchUser}
            disabled={searching}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Search className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Search Result Card — rich with action buttons */}
        {searchResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <img
                src={searchResult.avatar}
                className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/30"
                alt=""
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              <div>
                <p className="font-bold text-base text-foreground">{searchResult.name}</p>
                <p className="text-xs text-muted-foreground font-mono" dir="ltr">#{searchResult.uuid}</p>
                {searchResult.vip_level > 0 && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">
                    VIP {searchResult.vip_level}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'الراتب', value: `$${searchResult.salary || 0}`, color: 'text-green-400' },
                { label: 'مستوى الداعم', value: searchResult.sender_level || '0', color: 'text-blue-400' },
                { label: 'مستوى الدعم', value: searchResult.receiver_level || '0', color: 'text-purple-400' },
                { label: 'مستوى الشحن', value: searchResult.charger_level || '0', color: 'text-cyan-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                  <p className={`text-lg font-mono font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            {/* Action buttons */}
            <div className="flex gap-2">
              <button onClick={() => navigate(`/admin/ban?uuid=${searchResult.uuid}`)} className="flex-1 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold active:scale-95 transition-transform">حظر</button>
              <button onClick={() => navigate(`/admin/vip?uuid=${searchResult.uuid}`)} className="flex-1 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold active:scale-95 transition-transform">VIP</button>
              <button onClick={() => navigate(`/admin/id-change?uuid=${searchResult.uuid}`)} className="flex-1 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold active:scale-95 transition-transform">آيدي</button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Admin Profile Card — emerald themed */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/15 rounded-2xl p-4 mb-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/25 flex items-center justify-center">
            <Crown className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">أهلاً، {adminDisplayName}</p>
            <p className="text-[10px] text-emerald-400 font-bold">{roleLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-emerald-400 font-bold">متصل</span>
          </div>
        </div>

        {(shiftStart || shiftEnd) && (
          <ShiftCountdown shiftStart={shiftStart} shiftEnd={shiftEnd} />
        )}

        {/* Quick Stats Row — spring animated */}
        <motion.div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'معلقة', value: stats.pending, color: 'amber' },
            { label: 'مقبولة', value: stats.approved, color: 'emerald' },
            { label: 'مرفوضة', value: stats.rejected, color: 'rose' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
              className={`text-center py-2 rounded-xl border bg-${s.color}-500/10 border-${s.color}-500/15`}
            >
              <motion.p
                className={`text-xl font-bold font-mono text-${s.color}-400`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                {s.value}
              </motion.p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Chat Bubbles — animated */}
      <motion.div
        className="flex gap-2 mb-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => navigate("/admin/chat")}
          className="flex-1 bg-emerald-500/8 border border-emerald-500/15 rounded-full py-2.5 px-3 flex items-center justify-center gap-2 hover:bg-emerald-500/12 transition-colors active:scale-[0.97]"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-bold">مجموعة المشرفين</span>
        </button>
        <button
          onClick={() => navigate("/admin/chat")}
          className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-full py-2.5 px-3 flex items-center justify-center gap-2 hover:bg-white/[0.05] transition-colors active:scale-[0.97]"
        >
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-bold">الكل</span>
        </button>
      </motion.div>

      {/* Services Title */}
      <div className="flex items-center gap-2 mb-2.5 pr-1">
        <div className="w-1 h-3.5 rounded-full bg-primary" />
        <h3 className="text-xs font-black text-foreground">الخدمات</h3>
      </div>

      {/* 3-Column Service Grid — stagger animation */}
      <motion.div
        className="grid grid-cols-3 gap-4 px-2 mb-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {services.map(svc => {
          const Icon = svc.icon;
          return (
            <motion.button
              key={svc.key}
              variants={itemVariants}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => svc.route ? navigate(svc.route) : onServiceClick(svc.key)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="relative">
                <div
                  className={`w-14 h-14 rounded-2xl ${svc.bg} border border-white/5 flex items-center justify-center transition-all duration-300 group-active:shadow-lg`}
                  style={{ boxShadow: `0 0 0 0 ${svc.shadowColor}` }}
                >
                  <Icon className={`w-6 h-6 ${svc.iconColor} transition-transform duration-300 group-hover:scale-110`} />
                </div>
                {svc.badge && svc.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-lg shadow-red-500/30"
                  >
                    {svc.badge > 99 ? '99+' : svc.badge}
                  </motion.span>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {svc.label}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between pr-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3.5 rounded-full bg-muted-foreground/30" />
              <p className="text-xs font-bold text-muted-foreground">آخر العمليات</p>
            </div>
            {isOwner && (
              <button onClick={() => navigate("/admin/log")} className="text-[10px] text-primary font-bold hover:underline">عرض الكل</button>
            )}
          </div>
          {recentLogs.slice(0, 4).map((log: any, i: number) => (
            <motion.div
              key={log.id || i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 py-2 px-3 bg-white/[0.02] border border-white/[0.04] rounded-xl"
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.action?.includes('reject') || log.action?.includes('ban') || log.action?.includes('delete') ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <p className="text-[10px] text-foreground truncate flex-1">{log.action_label || log.action || 'عملية'}</p>
              <span className="text-[9px] text-muted-foreground whitespace-nowrap font-mono">
                {log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminHomeView;
