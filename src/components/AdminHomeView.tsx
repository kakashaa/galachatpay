import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Shield, Headset, ClipboardList, DollarSign,
  Hash, Settings, Briefcase, Users, ScrollText,
  Search, Loader2, Clock, Star, ShieldBan,
  Gift, Wallet, Bell
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

  const barColor = isOvertime ? 'bg-red-500' : progress > 75 ? 'bg-amber-400' : 'bg-emerald-500';
  const textColor = isOvertime ? 'text-red-400' : progress > 75 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] text-zinc-500 font-mono">{shiftStart || '—'} → {shiftEnd || '—'}</span>
        </div>
        <span className={`text-sm font-bold font-mono ${textColor} tracking-wider`}>{remaining}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
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

const AdminHomeView: React.FC<Props> = ({
  adminDisplayName, adminRole, stats, badges,
  onServiceClick: _onServiceClick, onChatClick: _onChatClick, recentLogs, isOwner, isSuperAdmin,
}: any) => {
  const navigate = useNavigate();
  const [searchUuid, setSearchUuid] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

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

  /* Badge values */
  const vipBadge = badges.vip || 0;
  const banBadge = badges.protection || 0;
  const salaryBadge = badges.salary || 0;
  const requestsBadge = badges.requests || 0;
  const supportBadge = badges.support || 0;

  const menuItems = [
    { icon: Star, label: "VIP", route: "/admin/vip", color: "text-amber-400", bg: "rgba(245,158,11,0.08)", badge: vipBadge },
    { icon: ShieldBan, label: "الحماية", route: "/admin/ban", color: "text-rose-400", bg: "rgba(244,63,94,0.08)", badge: banBadge },
    { icon: DollarSign, label: "الرواتب", route: "/admin/salary", color: "text-green-400", bg: "rgba(34,197,94,0.08)", badge: salaryBadge },
    { icon: ClipboardList, label: "الطلبات", route: "/admin/gifts", color: "text-sky-400", bg: "rgba(56,189,248,0.08)", badge: requestsBadge },
    { icon: Gift, label: "المتجر", route: "/admin/gifts", color: "text-pink-400", bg: "rgba(236,72,153,0.08)", badge: 0 },
    { icon: Headset, label: "الدعم", route: "/admin/support", color: "text-cyan-400", bg: "rgba(6,182,212,0.08)", badge: supportBadge },
    { icon: Hash, label: "آيدي", route: "/admin/id-change", color: "text-violet-400", bg: "rgba(139,92,246,0.08)", badge: 0 },
    { icon: Wallet, label: "المداخيل", route: "/admin/income", color: "text-emerald-400", bg: "rgba(52,211,153,0.08)", badge: 0 },
    { icon: Briefcase, label: "الوكالات", route: "/admin/agencies", color: "text-orange-400", bg: "rgba(251,146,60,0.08)", badge: 0 },
    { icon: Users, label: "الأدمن", route: "/admin/accounts", color: "text-teal-400", bg: "rgba(45,212,191,0.08)", badge: 0 },
    { icon: ScrollText, label: "السجل", route: "/admin/log", color: "text-indigo-400", bg: "rgba(129,140,248,0.08)", badge: 0 },
    { icon: Settings, label: "الإعدادات", route: "/admin/settings", color: "text-zinc-400", bg: "rgba(161,161,170,0.06)", badge: 0 },
  ];

  // Filter by role
  const visibleItems = menuItems.filter((_, i) => {
    // First 4 (VIP, Protection, Salary, Requests) → super admin only
    if (i < 4 && !isSuperAdmin) return false;
    // Agencies, Accounts, Log, Settings → owner only
    if (i >= 8 && !isOwner) return false;
    return true;
  });

  const { pending, approved, rejected } = stats;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#09090b' }} dir="rtl">
      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">

        {/* 1. Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-zinc-500 tracking-wide">لوحة التحكم</p>
            <p className="text-lg font-bold text-white">أهلاً، {adminDisplayName}</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Bell className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* 2. بحث */}
        <div className="relative">
          <input
            value={searchUuid}
            onChange={e => setSearchUuid(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUser()}
            placeholder="بحث بالمعرف (UUID)"
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl py-3.5 pr-4 pl-12 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition font-mono"
            dir="ltr"
          />
          <button onClick={searchUser} className="absolute left-3 top-1/2 -translate-y-1/2">
            {searching
              ? <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
              : <Search className="w-5 h-5 text-zinc-500" />
            }
          </button>
        </div>

        {/* 3. نتيجة البحث */}
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={searchResult.avatar || '/placeholder.svg'}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/20"
                  alt=""
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white truncate">{searchResult.name}</p>
                  <p className="text-[11px] text-zinc-500 font-mono" dir="ltr">#{searchResult.uuid}</p>
                </div>
                {searchResult.vip_level > 0 && (
                  <span className="text-[9px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold">
                    VIP {searchResult.vip_level}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: `$${searchResult.salary || 0}`, l: "الراتب" },
                  { v: searchResult.sender_level || '0', l: "داعم" },
                  { v: searchResult.receiver_level || '0', l: "مدعوم" },
                  { v: searchResult.charger_level || '0', l: "شحن" },
                ].map(s => (
                  <div key={s.l} className="bg-zinc-800/50 rounded-xl py-2 text-center">
                    <p className="text-sm font-mono font-bold text-white">{s.v}</p>
                    <p className="text-[8px] text-zinc-500">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'حظر', route: `/admin/ban?uuid=${searchResult.uuid}`, bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/15' },
                  { label: 'VIP', route: `/admin/vip?uuid=${searchResult.uuid}`, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/15' },
                  { label: 'آيدي', route: `/admin/id-change?uuid=${searchResult.uuid}`, bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/15' },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => navigate(btn.route)}
                    className={`flex-1 py-2 rounded-xl ${btn.bg} border ${btn.border} ${btn.text} text-xs font-bold active:scale-95 transition-transform`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. إحصائيات */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: pending, l: "معلقة", c: "text-amber-400", bg: "bg-amber-500/5", b: "border-amber-500/10" },
            { v: approved, l: "مقبولة", c: "text-emerald-400", bg: "bg-emerald-500/5", b: "border-emerald-500/10" },
            { v: rejected, l: "مرفوضة", c: "text-rose-400", bg: "bg-rose-500/5", b: "border-rose-500/10" },
          ].map(s => (
            <div key={s.l} className={`${s.bg} border ${s.b} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-mono font-bold ${s.c}`}>{s.v}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Shift Timer */}
        {(shiftStart || shiftEnd) && <ShiftCountdown shiftStart={shiftStart} shiftEnd={shiftEnd} />}

        {/* 5. دردشة سريعة */}
        <div className="flex gap-3">
          <button onClick={() => navigate("/admin/chat")} className="flex-1 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-bold">المشرفين</span>
          </button>
          <button onClick={() => navigate("/admin/chat")} className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-2xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-[11px] text-zinc-400 font-bold">كل الأدمن</span>
          </button>
        </div>

        {/* 6. الخدمات */}
        <div>
          <p className="text-[11px] text-zinc-500 mb-4 tracking-wide">الخدمات</p>
          <div className="grid grid-cols-4 gap-y-6 gap-x-2">
            {visibleItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.route + item.label}
                  onClick={() => navigate(item.route)}
                  className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
                >
                  <div className="relative">
                    <div
                      className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center"
                      style={{ background: item.bg }}
                    >
                      <Icon className={`w-[22px] h-[22px] ${item.color}`} />
                    </div>
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-red-500 text-[8px] text-white font-bold flex items-center justify-center px-0.5">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        {recentLogs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-zinc-500 tracking-wide">آخر العمليات</p>
              {isOwner && (
                <button onClick={() => navigate("/admin/log")} className="text-[10px] text-emerald-400 font-bold">عرض الكل</button>
              )}
            </div>
            <div className="space-y-2">
              {recentLogs.slice(0, 4).map((log: any, i: number) => (
                <div
                  key={log.id || i}
                  className="flex items-center gap-2.5 py-2.5 px-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl"
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    log.action?.includes('reject') || log.action?.includes('ban') || log.action?.includes('delete')
                      ? 'bg-rose-500' : 'bg-emerald-500'
                  }`} />
                  <p className="text-[11px] text-zinc-300 truncate flex-1">{log.action_label || log.action || 'عملية'}</p>
                  <span className="text-[9px] text-zinc-600 whitespace-nowrap font-mono">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminHomeView;
