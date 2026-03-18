import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Shield, Headset, ClipboardList, DollarSign,
  Hash, Settings, Briefcase, Users, ScrollText,
  Search, Loader2, Clock, Star, ShieldBan,
  Gift, Wallet, Bell, X, Unlock, XCircle, Camera,
  Ban, KeyRound, RotateCcw, BatteryCharging, ImageIcon,
  ShoppingBag, TrendingUp, Building2, Banknote, Package,
  ShieldAlert, Headphones, CheckCircle
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

  const barColor = isOvertime ? 'bg-admin-rose' : progress > 75 ? 'bg-admin-amber' : 'bg-admin-emerald';
  const textColor = isOvertime ? 'text-admin-rose' : progress > 75 ? 'text-admin-amber' : 'text-admin-emerald';

  return (
    <div className="bg-card rounded-xl border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground tabular-nums">{shiftStart || '—'} → {shiftEnd || '—'}</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${textColor} tracking-wider`}>{remaining}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
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

/* ─── User Control Card ─── */
const UserControlCard: React.FC<{ user: any; onClose: () => void; adminUsername: string; onRefresh: (uuid: string) => void }> = ({ user, onClose, adminUsername, onRefresh }) => {
  const navigate = useNavigate();
  const isBanned = user.is_banned;

  const stats = [
    { label: "الراتب", value: `$${user.salary || 0}`, color: "text-admin-emerald" },
    { label: "مستوى الداعم", value: user.sender_level || 0, color: "text-admin-amber" },
    { label: "مستوى الدعم", value: user.receiver_level || 0, color: "text-admin-blue" },
    { label: "مستوى الشحن", value: user.charger_level || 0, color: "text-admin-orange" },
  ];

  const actions = [
    { label: "إرسال VIP", icon: Star, bg: "bg-admin-amber/10", text: "text-admin-amber", border: "border-admin-amber/20", onClick: () => navigate(`/admin/vip?uuid=${user.uuid}`) },
    {
      label: isBanned ? "فك الحظر" : "حظر", icon: Ban,
      bg: isBanned ? "bg-admin-emerald/10" : "bg-admin-rose/10",
      text: isBanned ? "text-admin-emerald" : "text-admin-rose",
      border: isBanned ? "border-admin-emerald/20" : "border-admin-rose/20",
      onClick: () => {
        if (isBanned) {
          fetch('https://galachat.site/project-z/api.php', {
            method: 'POST',
            body: new URLSearchParams({ action: 'admin_ban_user', admin_key: 'ghala2026owner', uuid: user.uuid, unban: 'true', reason: 'admin_action', admin_name: adminUsername }),
          }).then(r => r.json()).then(d => { if (d.success) { toast.success('تم فك الحظر'); onRefresh(user.uuid); } else toast.error('فشل فك الحظر'); }).catch(() => toast.error('خطأ في الاتصال'));
        } else {
          navigate(`/admin/ban?uuid=${user.uuid}`);
        }
      }
    },
    { label: "تغيير الآيدي", icon: KeyRound, bg: "bg-admin-purple/10", text: "text-admin-purple", border: "border-admin-purple/20", onClick: () => navigate(`/admin/id-change?uuid=${user.uuid}`) },
    { label: "تصفير الراتب", icon: RotateCcw, bg: "bg-admin-orange/10", text: "text-admin-orange", border: "border-admin-orange/20", onClick: () => toast.info('جاري تصفير الراتب...') },
    { label: "إيقاف الشحن", icon: BatteryCharging, bg: "bg-admin-rose/10", text: "text-admin-rose", border: "border-admin-rose/20", onClick: () => toast.info('جاري إيقاف الشحن...') },
    { label: "تغيير الصورة", icon: ImageIcon, bg: "bg-admin-blue/10", text: "text-admin-blue", border: "border-admin-blue/20", onClick: () => toast.info('جاري فتح تغيير الصورة...') },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              <img src={user.avatar || '/placeholder.svg'} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
            </div>
            <div className={`absolute bottom-0 left-0 w-4 h-4 rounded-full border-2 border-card ${user.online ? 'bg-admin-emerald' : 'bg-muted-foreground'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">{user.name}</h3>
              {user.vip_level > 0 && (
                <span className="px-1.5 py-0.5 bg-admin-amber/20 text-admin-amber text-[10px] font-bold rounded-md">
                  VIP {user.vip_level}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">#{user.uuid}</p>
            <p className={`text-[10px] mt-0.5 ${isBanned ? 'text-admin-rose' : 'text-admin-emerald'}`}>
              {isBanned ? 'محظور' : 'نشط'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <X size={16} />
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center p-2 bg-muted/50 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground mb-1">{stat.label}</span>
            <span className={`text-sm font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="px-4 mt-3 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">صافي الراتب</span>
          <span className="font-medium tabular-nums">${user.net_salary || 0}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">الخصومات</span>
          <span className="font-medium tabular-nums text-admin-rose">${user.deduction || 0}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">الوكالة</span>
          <span className="font-medium">{user.agency_id || 'بدون'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">العائلة</span>
          <span className="font-medium">{user.family_id || 'بدون'}</span>
        </div>
        {user.created_at && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">تاريخ الانضمام</span>
            <span className="font-medium tabular-nums">{new Date(user.created_at).toLocaleDateString('ar-SA')}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 grid grid-cols-2 gap-2 mt-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              whileTap={{ scale: 0.96 }}
              onClick={action.onClick}
              className={`h-11 ${action.bg} ${action.text} border ${action.border} rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors`}
            >
              <Icon size={16} />
              {action.label}
            </motion.button>
          );
        })}
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
  adminDisplayName, adminRole: _adminRole, stats, badges,
  onServiceClick: _onServiceClick, onChatClick: _onChatClick, recentLogs, isOwner, isSuperAdmin,
}: any) => {
  const navigate = useNavigate();
  const [searchUuid, setSearchUuid] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const adminUsername = sessionStorage.getItem("admin_username") || '';
  const shiftStart = sessionStorage.getItem("admin_shift_start");
  const shiftEnd = sessionStorage.getItem("admin_shift_end");

  const searchUser = useCallback(async (uuid?: string) => {
    const target = uuid || searchUuid.trim();
    if (!target) return;
    setSearching(true); setSearchResult(null);
    try {
      const res = await fetch(`https://galachat.site/project-z/api.php?action=admin_user_info&admin_key=ghala2026owner&uuid=${target}`);
      const data = await res.json();
      if (data.success && data.name) setSearchResult(data);
      else { toast.error("لم يتم العثور على المستخدم"); setSearchResult(null); }
    } catch { toast.error("خطأ في الاتصال"); }
    setSearching(false);
  }, [searchUuid]);

  const vipBadge = badges.vip || 0;
  const banBadge = badges.protection || 0;
  const salaryBadge = badges.salary || 0;
  const requestsBadge = badges.requests || 0;
  const supportBadge = badges.support || 0;

  const services = [
    { icon: Star, label: "VIP", route: "/admin/vip", color: "text-admin-amber", bg: "bg-admin-amber/10", badge: vipBadge },
    { icon: ShieldAlert, label: "الحماية", route: "/admin/ban", color: "text-admin-rose", bg: "bg-admin-rose/10", badge: banBadge },
    { icon: Banknote, label: "الرواتب", route: "/admin/salary", color: "text-admin-emerald", bg: "bg-admin-emerald/10", badge: salaryBadge },
    { icon: Package, label: "الطلبات", route: "/admin/gifts", color: "text-admin-blue", bg: "bg-admin-blue/10", badge: requestsBadge },
    { icon: ShoppingBag, label: "المتجر", route: "/admin/gifts", color: "text-admin-pink", bg: "bg-admin-pink/10", badge: 0 },
    { icon: Headphones, label: "الدعم", route: "/admin/support", color: "text-admin-cyan", bg: "bg-admin-cyan/10", badge: supportBadge },
    { icon: KeyRound, label: "الآيدي", route: "/admin/id-change", color: "text-admin-purple", bg: "bg-admin-purple/10", badge: 0 },
    { icon: TrendingUp, label: "الإيرادات", route: "/admin/income", color: "text-admin-emerald", bg: "bg-admin-emerald/10", badge: 0 },
    { icon: Building2, label: "الوكالات", route: "/admin/agencies", color: "text-admin-orange", bg: "bg-admin-orange/10", badge: 0 },
    { icon: Users, label: "المشرفين", route: "/admin/accounts", color: "text-admin-teal", bg: "bg-admin-teal/10", badge: 0 },
    { icon: ScrollText, label: "السجل", route: "/admin/log", color: "text-admin-indigo", bg: "bg-admin-indigo/10", badge: 0 },
    { icon: Settings, label: "الإعدادات", route: "/admin/settings", color: "text-muted-foreground", bg: "bg-muted/50", badge: 0 },
  ];

  const visibleServices = services.filter((_, i) => {
    if (i < 4 && !isSuperAdmin) return false;
    if (i >= 8 && !isOwner) return false;
    return true;
  });

  const { pending, approved, rejected } = stats;

  const statsCards = [
    { label: "معلّق", value: pending, icon: Clock, color: "text-admin-amber", bg: "bg-admin-amber/10", border: "border-admin-amber/20" },
    { label: "مقبول", value: approved, icon: CheckCircle, color: "text-admin-emerald", bg: "bg-admin-emerald/10", border: "border-admin-emerald/20" },
    { label: "مرفوض", value: rejected, icon: XCircle, color: "text-admin-rose", bg: "bg-admin-rose/10", border: "border-admin-rose/20" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 admin-theme" dir="rtl">
      <div className="max-w-[448px] mx-auto px-4 pt-4 space-y-5">

        {/* Welcome Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-balance">أهلاً، {adminDisplayName} 👋</h2>
              <p className="text-xs text-muted-foreground mt-0.5">مدير النظام</p>
            </div>
            <button className="relative w-10 h-10 bg-muted rounded-xl flex items-center justify-center active:scale-95 transition-transform">
              <Bell size={18} />
              {(vipBadge + banBadge + salaryBadge + requestsBadge + supportBadge) > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-admin-rose rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-card">
                  {vipBadge + banBadge + salaryBadge + requestsBadge + supportBadge}
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Quick Search */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchUuid}
              onChange={(e) => setSearchUuid(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              placeholder="ابحث برقم UUID..."
              className="w-full h-12 bg-muted rounded-xl pr-4 pl-12 text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all tabular-nums"
              dir="ltr"
            />
            <button
              onClick={() => searchUser()}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-admin-emerald rounded-lg flex items-center justify-center active:scale-95 transition-transform"
            >
              {searching ? <Loader2 size={16} className="text-white animate-spin" /> : <Search size={16} className="text-white" />}
            </button>
            {searchUuid && (
              <button
                onClick={() => { setSearchUuid(""); setSearchResult(null); }}
                className="absolute left-12 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <UserControlCard
                  user={searchResult}
                  onClose={() => setSearchResult(null)}
                  adminUsername={adminUsername}
                  onRefresh={searchUser}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!searching && searchUuid && !searchResult && searchUuid.length > 3 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              لم يتم العثور على مستخدم بهذا الرقم
            </div>
          )}
        </div>

        {/* Rest of dashboard — hidden when search result is shown */}
        {!searchResult && (
          <>
            {/* Chat Bubbles */}
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/admin/chat")}
                className="flex-1 h-11 bg-admin-emerald/10 text-admin-emerald border border-admin-emerald/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Shield size={16} />
                مجموعة المشرفين
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/admin/chat")}
                className="flex-1 h-11 bg-muted text-muted-foreground border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Users size={16} />
                كل الأدمن
              </motion.button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
              {statsCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-xl p-3 flex flex-col items-center gap-1`}>
                    <Icon size={18} className={stat.color} />
                    <span className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Shift Timer */}
            {(shiftStart || shiftEnd) && <ShiftCountdown shiftStart={shiftStart} shiftEnd={shiftEnd} />}

            {/* Service Grid */}
            <div className="grid grid-cols-4 gap-3">
              {visibleServices.map((service, index) => {
                const Icon = service.icon;
                return (
                  <motion.button
                    key={service.route + service.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate(service.route)}
                    className="flex flex-col items-center gap-1.5 relative"
                  >
                    <div className={`aspect-square w-full rounded-2xl ${service.bg} border border-border flex items-center justify-center`}>
                      <Icon size={24} className={service.color} />
                    </div>
                    {service.badge > 0 && (
                      <span className="absolute -top-1 -left-1 h-5 w-5 bg-admin-rose rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-background text-foreground">
                        {service.badge > 99 ? '99+' : service.badge}
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-muted-foreground">{service.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Recent Activity */}
            {recentLogs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground">آخر العمليات</p>
                  {isOwner && (
                    <button onClick={() => navigate("/admin/log")} className="text-[10px] text-admin-emerald font-bold">عرض الكل</button>
                  )}
                </div>
                <div className="space-y-2">
                  {recentLogs.slice(0, 4).map((log: any, i: number) => (
                    <div key={log.id || i} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        log.action?.includes('reject') || log.action?.includes('ban') || log.action?.includes('delete')
                          ? 'bg-admin-rose/10' : 'bg-admin-emerald/10'
                      }`}>
                        <Clock size={14} className={
                          log.action?.includes('reject') || log.action?.includes('ban') || log.action?.includes('delete')
                            ? 'text-admin-rose' : 'text-admin-emerald'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{log.action_label || log.action || 'عملية'}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  ))}
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
