import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { playUrgentSound } from '@/lib/notificationSound';
import AdminHomeTopBar from '@/components/admin-home/AdminHomeTopBar';
import AdminQuickChats from '@/components/admin-home/AdminQuickChats';

/* ── Font Awesome icon helper ── */
const FA: React.FC<{ icon: string; className?: string }> = ({ icon, className = '' }) => (
  <i className={`fa-solid fa-${icon} ${className}`} />
);

/* ─── Load Font Awesome + Cairo fonts ─── */
const useExternalAssets = () => {
  useEffect(() => {
    const loadLink = (href: string) => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    };
    loadLink('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css');
    loadLink('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
  }, []);
};

/* ─── Shift Countdown ─── */
const ShiftCountdown: React.FC<{ shiftStart: string | null; shiftEnd: string | null }> = ({ shiftStart, shiftEnd }) => {
  const [remaining, setRemaining] = useState('');
  const [progress, setProgress] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const alertPlayedRef = React.useRef(false);

  useEffect(() => {
    if (!shiftEnd) {
      setRemaining('—');
      return;
    }
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
      if (remainMs <= 0) {
        setRemaining('انتهى');
        setProgress(100);
        setIsOvertime(true);
        return;
      }
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
      setRemaining(
        hours > 0
          ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          : `${mins}:${String(secs).padStart(2, '0')}`,
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [shiftStart, shiftEnd]);

  const barColor = isOvertime ? 'bg-red-500' : progress > 75 ? 'bg-amber-400' : 'bg-emerald-500';
  const textColor = isOvertime ? 'text-red-400' : progress > 75 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <FA icon="clock" className="text-xs text-zinc-500" />
          <span className="text-[10px] text-zinc-500 font-mono">
            {shiftStart || '—'} → {shiftEnd || '—'}
          </span>
        </div>
        <span className={`text-sm font-bold font-mono ${textColor} tracking-wider`}>{remaining}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1 }}
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
  adminDisplayName,
  stats,
  badges,
  recentLogs,
  isOwner,
  isSuperAdmin,
}) => {
  useExternalAssets();
  const navigate = useNavigate();
  const [searchUuid, setSearchUuid] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const adminUsername = sessionStorage.getItem('admin_username') || '';
  const shiftStart = sessionStorage.getItem('admin_shift_start');
  const shiftEnd = sessionStorage.getItem('admin_shift_end');

  const searchUser = useCallback(
    async (uuid?: string) => {
      const target = uuid || searchUuid.trim();
      if (!target) return;
      setSearching(true);
      setSearchResult(null);
      try {
        const res = await fetch(
          `https://galachat.site/project-z/api.php?action=admin_user_info&admin_key=ghala2026owner&uuid=${target}`,
        );
        const data = await res.json();
        if (data.success && data.name) setSearchResult(data);
        else {
          toast.error('لم يتم العثور على المستخدم');
          setSearchResult(null);
        }
      } catch {
        toast.error('خطأ في الاتصال');
      }
      setSearching(false);
    },
    [searchUuid],
  );

  const vipBadge = badges.vip || 0;
  const banBadge = badges.protection || 0;
  const salaryBadge = badges.salary || 0;
  const requestsBadge = badges.requests || 0;
  const supportBadge = badges.support || 0;

  /* Service grid items — FA icons matching the UX Pilot design */
  const menuItems = [
    { faIcon: 'crown', label: 'VIP', route: '/admin/vip', color: 'text-amber-500', hoverBorder: 'hover:border-amber-500', badge: vipBadge },
    {
      faIcon: 'shield-halved',
      label: 'الحماية',
      route: '/admin/ban',
      color: 'text-rose-500',
      hoverBorder: 'hover:border-rose-500',
      badge: banBadge,
    },
    {
      faIcon: 'money-bill-wave',
      label: 'الرواتب',
      route: '/admin/salary',
      color: 'text-green-500',
      hoverBorder: 'hover:border-green-500',
      badge: salaryBadge,
    },
    {
      faIcon: 'clipboard-list',
      label: 'الطلبات',
      route: '/admin/gifts',
      color: 'text-blue-500',
      hoverBorder: 'hover:border-blue-500',
      badge: requestsBadge,
    },
    { faIcon: 'store', label: 'المتجر', route: '/admin/gifts', color: 'text-pink-500', hoverBorder: 'hover:border-pink-500', badge: 0 },
    { faIcon: 'headset', label: 'الدعم', route: '/admin/support', color: 'text-cyan-500', hoverBorder: 'hover:border-cyan-500', badge: supportBadge },
    { faIcon: 'id-card', label: 'تغيير ID', route: '/admin/id-change', color: 'text-purple-500', hoverBorder: 'hover:border-purple-500', badge: 0 },
    { faIcon: 'chart-line', label: 'الدخل', route: '/admin/income', color: 'text-emerald-500', hoverBorder: 'hover:border-emerald-500', badge: 0 },
    { faIcon: 'building', label: 'الوكالات', route: '/admin/agencies', color: 'text-orange-500', hoverBorder: 'hover:border-orange-500', badge: 0 },
    { faIcon: 'user-shield', label: 'المشرفين', route: '/admin/accounts', color: 'text-teal-500', hoverBorder: 'hover:border-teal-500', badge: 0 },
    {
      faIcon: 'clock-rotate-left',
      label: 'السجل',
      route: '/admin/log',
      color: 'text-indigo-500',
      hoverBorder: 'hover:border-indigo-500',
      badge: 0,
    },
    { faIcon: 'gear', label: 'الإعدادات', route: '/admin/settings', color: 'text-gray-500', hoverBorder: 'hover:border-gray-500', badge: 0 },
  ];

  const visibleItems = menuItems.filter((_, i) => {
    if (i < 4 && !isSuperAdmin) return false;
    if (i >= 8 && !isOwner) return false;
    return true;
  });

  const { pending, approved, rejected } = stats;

  /* Activity icon helpers */
  const getActivityIcon = (action: string) => {
    if (action?.includes('ban') || action?.includes('reject') || action?.includes('delete')) {
      return { icon: 'ban', bgColor: 'bg-rose-500/10', iconColor: 'text-rose-500' };
    }
    if (action?.includes('vip') || action?.includes('approve')) {
      return { icon: 'crown', bgColor: 'bg-emerald-500/10', iconColor: 'text-emerald-500' };
    }
    if (action?.includes('salary') || action?.includes('transfer')) {
      return { icon: 'money-bill-transfer', bgColor: 'bg-green-500/10', iconColor: 'text-green-500' };
    }
    return { icon: 'circle-check', bgColor: 'bg-blue-500/10', iconColor: 'text-blue-500' };
  };

  return (
    <div className="min-h-screen pb-24 bg-admin-bg" style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }} dir="rtl">
      <AdminHomeTopBar />

      <div className="max-w-[448px] mx-auto px-4 pt-20 space-y-6">
        {/* ═══ SEARCH ═══ */}
        <div className="relative">
          <input
            value={searchUuid}
            onChange={(e) => setSearchUuid(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUser()}
            placeholder="بحث عن مستخدم (UUID أو الاسم)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-4 pl-12 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            dir="ltr"
          />
          <button type="button" onClick={() => searchUser()} className="absolute left-4 top-1/2 -translate-y-1/2">
            {searching ? <Loader2 className="w-5 h-5 animate-spin text-zinc-500" /> : <FA icon="magnifying-glass" className="text-zinc-500" />}
          </button>
        </div>

        {/* ═══ SEARCH RESULT — User Control Panel ═══ */}
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <button type="button" onClick={() => setSearchResult(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <span
                  className={`text-[10px] px-2 py-1 rounded-lg font-bold ${
                    searchResult.online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {searchResult.online ? '● متصل' : '○ غير متصل'}
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <img
                    src={searchResult.avatar || '/placeholder.svg'}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-zinc-800"
                    alt={`صورة ${searchResult.name || 'المستخدم'}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  {searchResult.vip_level > 0 && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/20 whitespace-nowrap">
                      VIP {searchResult.vip_level}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-white">{searchResult.name}</p>
                  <p className="text-[11px] text-zinc-500 font-mono">#{searchResult.uuid}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: `$${searchResult.salary || 0}`, l: 'الراتب', c: 'text-green-400' },
                  { v: searchResult.sender_level || 0, l: 'مستوى الداعم', c: 'text-blue-400' },
                  { v: searchResult.receiver_level || 0, l: 'مستوى الدعم', c: 'text-purple-400' },
                  { v: searchResult.charger_level || 0, l: 'الشحن', c: 'text-cyan-400' },
                ].map((s) => (
                  <div key={s.l} className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 text-center">
                    <p className={`text-sm font-mono font-bold ${s.c}`}>{s.v}</p>
                    <p className="text-[8px] text-zinc-500 mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
                {[
                  { l: 'صافي الراتب', v: `$${searchResult.net_salary || 0}`, c: 'text-white' },
                  { l: 'الخصومات', v: `$${searchResult.deduction || 0}`, c: 'text-rose-400' },
                  { l: 'الوكالة', v: searchResult.agency_id || 'بدون', c: 'text-white' },
                  { l: 'العائلة', v: searchResult.family_id || 'بدون', c: 'text-white' },
                  {
                    l: 'الحالة',
                    v: searchResult.is_banned ? '🔴 محظور' : '🟢 نشط',
                    c: searchResult.is_banned ? 'text-red-400' : 'text-emerald-400',
                  },
                ].map((r) => (
                  <div key={r.l} className="flex justify-between">
                    <span className="text-[11px] text-zinc-500">{r.l}</span>
                    <span className={`text-[11px] font-mono font-bold ${r.c}`}>{r.v}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-zinc-500">إجراءات سريعة</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/vip?uuid=${searchResult.uuid}`)}
                  className="bg-amber-500/[0.08] border border-amber-500/15 rounded-xl py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <FA icon="crown" className="text-lg text-amber-400" />
                  <span className="text-[9px] text-amber-400 font-bold">إرسال VIP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (searchResult.is_banned) {
                      fetch('https://galachat.site/project-z/api.php', {
                        method: 'POST',
                        body: new URLSearchParams({
                          action: 'admin_ban_user',
                          admin_key: 'ghala2026owner',
                          uuid: searchResult.uuid,
                          unban: 'true',
                          reason: 'admin_action',
                          admin_name: adminUsername,
                        }),
                      })
                        .then((r) => r.json())
                        .then((d) => {
                          if (d.success) {
                            toast.success('تم فك الحظر');
                            searchUser(searchResult.uuid);
                          } else toast.error('فشل فك الحظر');
                        })
                        .catch(() => toast.error('خطأ'));
                    } else navigate(`/admin/ban?uuid=${searchResult.uuid}`);
                  }}
                  className={`${
                    searchResult.is_banned
                      ? 'bg-emerald-500/[0.08] border-emerald-500/15'
                      : 'bg-rose-500/[0.08] border-rose-500/15'
                  } border rounded-xl py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}
                >
                  {searchResult.is_banned ? (
                    <Unlock className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <FA icon="shield-halved" className="text-lg text-rose-400" />
                  )}
                  <span className={`text-[9px] font-bold ${searchResult.is_banned ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {searchResult.is_banned ? 'فك الحظر' : 'حظر'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/id-change?uuid=${searchResult.uuid}`)}
                  className="bg-violet-500/[0.08] border border-violet-500/15 rounded-xl py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <FA icon="id-card" className="text-lg text-violet-400" />
                  <span className="text-[9px] text-violet-400 font-bold">تغيير آيدي</span>
                </button>
                <button
                  type="button"
                  onClick={() => toast.info('جاري تصفير الراتب...')}
                  className="bg-orange-500/[0.08] border border-orange-500/15 rounded-xl py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <FA icon="money-bill-wave" className="text-lg text-orange-400" />
                  <span className="text-[9px] text-orange-400 font-bold">تصفير الراتب</span>
                </button>
                <button
                  type="button"
                  onClick={() => toast.info('جاري إيقاف الشحن...')}
                  className="bg-red-500/[0.08] border border-red-500/15 rounded-xl py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <FA icon="circle-xmark" className="text-lg text-red-400" />
                  <span className="text-[9px] text-red-400 font-bold">إيقاف الشحن</span>
                </button>
                <button
                  type="button"
                  onClick={() => toast.info('جاري فتح تغيير الصورة...')}
                  className="bg-sky-500/[0.08] border border-sky-500/15 rounded-xl py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <FA icon="camera" className="text-lg text-sky-400" />
                  <span className="text-[9px] text-sky-400 font-bold">تغيير الصورة</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ MAIN DASHBOARD (hidden when search result) ═══ */}
        {!searchResult && (
          <>
            {/* Welcome Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5">
              <h2 className="text-xl font-bold mb-1">مرحباً، {adminDisplayName}</h2>
              <p className="text-emerald-100 text-sm mb-4">لديك {pending} طلب جديد بحاجة للمراجعة</p>
              <button
                type="button"
                onClick={() => navigate('/admin/gifts')}
                className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
              >
                عرض الطلبات
              </button>
            </div>

            {/* Chat bubbles */}
            <AdminQuickChats />

            {/* Stats Grid — 2x2 */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">إحصائيات اليوم</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FA icon="users" className="text-2xl text-emerald-500" />
                    <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full">+12%</span>
                  </div>
                  <p className="text-2xl font-bold">{pending + approved + rejected}</p>
                  <p className="text-xs text-zinc-500">إجمالي الطلبات</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FA icon="coins" className="text-2xl text-amber-500" />
                    <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full">{pending}</span>
                  </div>
                  <p className="text-2xl font-bold">{pending}</p>
                  <p className="text-xs text-zinc-500">معلقة</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FA icon="crown" className="text-2xl text-purple-500" />
                    <span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-1 rounded-full">+{approved}</span>
                  </div>
                  <p className="text-2xl font-bold">{approved}</p>
                  <p className="text-xs text-zinc-500">مقبولة</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FA icon="ticket" className="text-2xl text-cyan-500" />
                    <span className="text-xs bg-rose-500/10 text-rose-500 px-2 py-1 rounded-full">{rejected}</span>
                  </div>
                  <p className="text-2xl font-bold">{rejected}</p>
                  <p className="text-xs text-zinc-500">مرفوضة</p>
                </div>
              </div>
            </div>

            {/* Shift Timer */}
            {(shiftStart || shiftEnd) && <ShiftCountdown shiftStart={shiftStart} shiftEnd={shiftEnd} />}

            {/* Services Grid — 4 columns */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">الخدمات السريعة</h3>
              <div className="grid grid-cols-4 gap-3">
                {visibleItems.map((item) => (
                  <button
                    type="button"
                    key={item.route + item.label}
                    onClick={() => navigate(item.route)}
                    className={`flex flex-col items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${item.hoverBorder} transition-colors`}
                  >
                    <div className="relative">
                      <FA icon={item.faIcon} className={`text-2xl ${item.color}`} />
                      {item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-center text-zinc-300">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            {recentLogs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-400">النشاط الأخير</h3>
                  {isOwner && (
                    <button type="button" onClick={() => navigate('/admin/log')} className="text-xs text-emerald-500 font-medium">
                      عرض الكل
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {recentLogs.slice(0, 5).map((log: any, i: number) => {
                    const ai = getActivityIcon(log.action);
                    return (
                      <div key={log.id || i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${ai.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <FA icon={ai.icon} className={ai.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{log.action_label || log.action || 'عملية'}</p>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {log.details ? JSON.stringify(log.details).slice(0, 60) : ''}
                          </p>
                          <p className="text-xs text-zinc-600 mt-1">
                            {log.created_at
                              ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminHomeView;
