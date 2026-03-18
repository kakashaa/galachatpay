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
  ShieldAlert, Headphones, CheckCircle, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { playUrgentSound } from '@/lib/notificationSound';

/* ─── 3D Card Wrapper ─── */
const Card3D: React.FC<{ children: React.ReactNode; className?: string; delay?: number; glow?: string }> = ({ children, className = '', delay = 0, glow }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, rotateX: 8 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -2, scale: 1.01 }}
    className={`relative rounded-2xl overflow-hidden ${className}`}
    style={{
      perspective: '1000px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: glow
        ? `0 8px 32px -8px ${glow}, 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`
        : '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
    }}
  >
    {children}
  </motion.div>
);

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
    <Card3D delay={0.3}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-admin-amber/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-admin-amber" />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{shiftStart || '—'} → {shiftEnd || '—'}</span>
          </div>
          <motion.span
            className={`text-lg font-bold tabular-nums ${textColor} tracking-wider`}
            animate={{ scale: isOvertime ? [1, 1.05, 1] : 1 }}
            transition={{ repeat: isOvertime ? Infinity : 0, duration: 1 }}
          >
            {remaining}
          </motion.span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ boxShadow: isOvertime ? '0 0 12px rgba(244,63,94,0.5)' : progress > 75 ? '0 0 12px rgba(245,158,11,0.4)' : '0 0 12px rgba(16,185,129,0.4)' }}
          />
        </div>
      </div>
    </Card3D>
  );
};

/* ─── User Control Card ─── */
const UserControlCard: React.FC<{ user: any; onClose: () => void; adminUsername: string; onRefresh: (uuid: string) => void }> = ({ user, onClose, adminUsername, onRefresh }) => {
  const navigate = useNavigate();
  const isBanned = user.is_banned;

  const stats = [
    { label: "الراتب", value: `$${user.salary || 0}`, color: "text-admin-emerald", glow: "rgba(16,185,129,0.15)" },
    { label: "مستوى الداعم", value: user.sender_level || 0, color: "text-admin-amber", glow: "rgba(245,158,11,0.15)" },
    { label: "مستوى الدعم", value: user.receiver_level || 0, color: "text-admin-blue", glow: "rgba(59,130,246,0.15)" },
    { label: "مستوى الشحن", value: user.charger_level || 0, color: "text-admin-orange", glow: "rgba(249,115,22,0.15)" },
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
    <Card3D glow="rgba(16,185,129,0.15)">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden"
              style={{ border: '2px solid rgba(255,255,255,0.1)' }}
              whileHover={{ scale: 1.05 }}
            >
              <img src={user.avatar || '/placeholder.svg'} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
            </motion.div>
            <motion.div
              className={`absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full border-2 ${user.online ? 'bg-admin-emerald' : 'bg-muted-foreground'}`}
              style={{ borderColor: 'hsl(240 10% 3.9%)' }}
              animate={user.online ? { scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">{user.name}</h3>
              {user.vip_level > 0 && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))',
                    color: 'hsl(38 92% 50%)',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  VIP {user.vip_level}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground tabular-nums mt-0.5">#{user.uuid}</p>
            <p className={`text-[10px] mt-0.5 font-medium ${isBanned ? 'text-admin-rose' : 'text-admin-emerald'}`}>
              {isBanned ? '⛔ محظور' : '✓ نشط'}
            </p>
          </div>
        </div>
        <motion.button
          onClick={onClose}
          whileTap={{ scale: 0.9, rotate: 90 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <X size={16} />
        </motion.button>
      </div>

      {/* Stats */}
      <div className="px-4 grid grid-cols-4 gap-2">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="flex flex-col items-center p-2.5 rounded-xl"
            style={{
              background: stat.glow,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span className="text-[10px] text-muted-foreground mb-1">{stat.label}</span>
            <span className={`text-sm font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Details */}
      <div className="px-4 mt-3 space-y-1.5">
        {[
          { label: "صافي الراتب", value: `$${user.net_salary || 0}` },
          { label: "الخصومات", value: `$${user.deduction || 0}`, color: "text-admin-rose" },
          { label: "الوكالة", value: user.agency_id || 'بدون' },
          { label: "العائلة", value: user.family_id || 'بدون' },
        ].map((item) => (
          <div key={item.label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={`font-medium tabular-nums ${item.color || ''}`}>{item.value}</span>
          </div>
        ))}
        {user.created_at && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">تاريخ الانضمام</span>
            <span className="font-medium tabular-nums">{new Date(user.created_at).toLocaleDateString('ar-SA')}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 grid grid-cols-2 gap-2 mt-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={action.onClick}
              className={`h-11 ${action.bg} ${action.text} border ${action.border} rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors`}
            >
              <Icon size={16} />
              {action.label}
            </motion.button>
          );
        })}
      </div>
    </Card3D>
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
  const totalBadge = vipBadge + banBadge + salaryBadge + requestsBadge + supportBadge;

  const services = [
    { icon: Star, label: "VIP", route: "/admin/vip", color: "text-admin-amber", bg: "rgba(245,158,11,0.1)", glowColor: "rgba(245,158,11,0.25)", badge: vipBadge },
    { icon: ShieldAlert, label: "الحماية", route: "/admin/ban", color: "text-admin-rose", bg: "rgba(244,63,94,0.1)", glowColor: "rgba(244,63,94,0.25)", badge: banBadge },
    { icon: Banknote, label: "الرواتب", route: "/admin/salary", color: "text-admin-emerald", bg: "rgba(16,185,129,0.1)", glowColor: "rgba(16,185,129,0.25)", badge: salaryBadge },
    { icon: Package, label: "الطلبات", route: "/admin/requests", color: "text-admin-blue", bg: "rgba(59,130,246,0.1)", glowColor: "rgba(59,130,246,0.25)", badge: requestsBadge },
    { icon: ShoppingBag, label: "المتجر", route: "/admin/gifts", color: "text-admin-pink", bg: "rgba(236,72,153,0.1)", glowColor: "rgba(236,72,153,0.25)", badge: 0 },
    { icon: Headphones, label: "الدعم", route: "/admin/support", color: "text-admin-cyan", bg: "rgba(6,182,212,0.1)", glowColor: "rgba(6,182,212,0.25)", badge: supportBadge },
    { icon: KeyRound, label: "الآيدي", route: "/admin/id-change", color: "text-admin-purple", bg: "rgba(139,92,246,0.1)", glowColor: "rgba(139,92,246,0.25)", badge: 0 },
    { icon: TrendingUp, label: "الإيرادات", route: "/admin/income", color: "text-admin-emerald", bg: "rgba(16,185,129,0.1)", glowColor: "rgba(16,185,129,0.25)", badge: 0 },
    { icon: Building2, label: "الوكالات", route: "/admin/agencies", color: "text-admin-orange", bg: "rgba(249,115,22,0.1)", glowColor: "rgba(249,115,22,0.25)", badge: 0 },
    { icon: Users, label: "المشرفين", route: "/admin/accounts", color: "text-admin-teal", bg: "rgba(20,184,166,0.1)", glowColor: "rgba(20,184,166,0.25)", badge: 0 },
    { icon: ScrollText, label: "السجل", route: "/admin/log", color: "text-admin-indigo", bg: "rgba(99,102,241,0.1)", glowColor: "rgba(99,102,241,0.25)", badge: 0 },
    { icon: Briefcase, label: "البيدي", route: "/admin/bd", color: "text-admin-rose", bg: "rgba(244,63,94,0.1)", glowColor: "rgba(244,63,94,0.25)", badge: 0 },
    { icon: Settings, label: "الإعدادات", route: "/admin/settings", color: "text-muted-foreground", bg: "rgba(255,255,255,0.04)", glowColor: "rgba(255,255,255,0.1)", badge: 0 },
  ];

  const visibleServices = services.filter((_, i) => {
    if (i < 4 && !isSuperAdmin) return false;
    if (i >= 8 && !isOwner) return false;
    return true;
  });

  const { pending, approved, rejected } = stats;

  const statsCards = [
    { label: "معلّق", value: pending, icon: Clock, color: "text-admin-amber", glow: "rgba(245,158,11,0.2)" },
    { label: "مقبول", value: approved, icon: CheckCircle, color: "text-admin-emerald", glow: "rgba(16,185,129,0.2)" },
    { label: "مرفوض", value: rejected, icon: XCircle, color: "text-admin-rose", glow: "rgba(244,63,94,0.2)" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 admin-theme" dir="rtl">
      <div className="max-w-[448px] mx-auto px-4 pt-4 space-y-4">

        {/* Welcome Card — 3D Hero */}
        <Card3D delay={0} glow="rgba(16,185,129,0.1)">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <motion.div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                  }}
                  animate={{ rotateY: [0, 5, 0, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles size={22} className="text-white" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold">أهلاً، {adminDisplayName}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">مرحباً بك في لوحة التحكم</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ rotate: 15 }}
                className="relative w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Bell size={18} />
                {totalBadge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))',
                      boxShadow: '0 2px 8px rgba(244,63,94,0.5)',
                      border: '2px solid hsl(240 10% 3.9%)',
                    }}
                  >
                    {totalBadge > 99 ? '99+' : totalBadge}
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>
        </Card3D>

        {/* Quick Search */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="relative">
            <input
              type="text"
              value={searchUuid}
              onChange={(e) => setSearchUuid(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              placeholder="ابحث برقم UUID..."
              className="w-full h-12 rounded-2xl pr-4 pl-12 text-sm placeholder:text-muted-foreground focus:outline-none transition-all tabular-nums"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
              }}
              dir="ltr"
            />
            <motion.button
              onClick={() => searchUser()}
              whileTap={{ scale: 0.9 }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))',
                boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
              }}
            >
              {searching ? <Loader2 size={16} className="text-white animate-spin" /> : <Search size={16} className="text-white" />}
            </motion.button>
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
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
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
        </motion.div>

        {/* Rest of dashboard — hidden when search result is shown */}
        {!searchResult && (
          <>
            {/* Chat Bubbles */}
            <div className="flex gap-2">
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/admin/chat")}
                className="flex-1 h-12 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 text-admin-emerald"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.15)',
                }}
              >
                <Shield size={16} />
                مجموعة المشرفين
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/admin/chat")}
                className="flex-1 h-12 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 text-muted-foreground"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Users size={16} />
                كل الأدمن
              </motion.button>
            </div>

            {/* Stats Cards — 3D */}
            <div className="grid grid-cols-3 gap-2">
              {statsCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20, rotateX: 10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: 0.2 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -3, scale: 1.03 }}
                    className="rounded-2xl p-4 flex flex-col items-center gap-1.5 cursor-default"
                    style={{
                      background: stat.glow,
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: `0 4px 20px -4px ${stat.glow}`,
                    }}
                  >
                    <motion.div
                      animate={{ rotateY: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                      <Icon size={20} className={stat.color} />
                    </motion.div>
                    <span className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Shift Timer */}
            {(shiftStart || shiftEnd) && <ShiftCountdown shiftStart={shiftStart} shiftEnd={shiftEnd} />}

            {/* Service Grid — 3D Icons */}
            <div className="grid grid-cols-4 gap-3">
              {visibleServices.map((service, index) => {
                const Icon = service.icon;
                return (
                  <motion.button
                    key={service.route + service.label}
                    initial={{ opacity: 0, scale: 0.8, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.25 + index * 0.035, type: 'spring', stiffness: 300, damping: 20 }}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ y: -4, scale: 1.05 }}
                    onClick={() => navigate(service.route)}
                    className="flex flex-col items-center gap-2 relative"
                  >
                    <div
                      className="aspect-square w-full rounded-2xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: service.bg,
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: `0 4px 16px -4px ${service.glowColor}`,
                      }}
                    >
                      {/* Shimmer overlay */}
                      <div
                        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                        }}
                      />
                      <Icon size={24} className={`${service.color} relative z-10`} />
                    </div>
                    {service.badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -left-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                        style={{
                          background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))',
                          boxShadow: '0 2px 8px rgba(244,63,94,0.5)',
                          border: '2px solid hsl(240 10% 3.9%)',
                        }}
                      >
                        {service.badge > 99 ? '99+' : service.badge}
                      </motion.span>
                    )}
                    <span className="text-[11px] font-medium text-muted-foreground">{service.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Recent Activity */}
            {recentLogs.length > 0 && (
              <Card3D delay={0.4}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-foreground">آخر العمليات</p>
                    {isOwner && (
                      <motion.button
                        onClick={() => navigate("/admin/log")}
                        whileTap={{ scale: 0.95 }}
                        className="text-[10px] text-admin-emerald font-bold px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(16,185,129,0.1)' }}
                      >
                        عرض الكل
                      </motion.button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {recentLogs.slice(0, 4).map((log: any, i: number) => {
                      const isNegative = log.action?.includes('reject') || log.action?.includes('ban') || log.action?.includes('delete');
                      return (
                        <motion.div
                          key={log.id || i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.05 }}
                          className="rounded-xl p-3 flex items-center gap-3"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: isNegative ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                            }}
                          >
                            <Clock size={14} className={isNegative ? 'text-admin-rose' : 'text-admin-emerald'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{log.action_label || log.action || 'عملية'}</p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">
                              {log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </Card3D>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminHomeView;
