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
  ShieldAlert, Headphones, CheckCircle, Sparkles, AlertTriangle,
  Copy, ChevronLeft, LogOut, Crown, Fingerprint, Store,
  Inbox, FileText, Landmark
} from 'lucide-react';
import { toast } from 'sonner';
import { playUrgentSound } from '@/lib/notificationSound';
import { checkPendingRequests, type DelayAlert } from '@/utils/adminMonitor';

/* ─── Animated Counter ─── */
const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <motion.span
    key={value}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={className}
  >
    {value}
  </motion.span>
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl p-4"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-admin-amber/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-admin-amber" />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">{shiftStart || '—'} → {shiftEnd || '—'}</span>
        </div>
        <motion.span
          className={`text-lg font-bold tabular-nums ${textColor} tracking-wider`}
          animate={{ scale: isOvertime ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: isOvertime ? Infinity : 0, duration: 1 }}
        >
          {remaining}
        </motion.span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
};

/* ─── User ID Card (بطاقة تعريفية) ─── */
const UserIdCard: React.FC<{ user: any; onClose: () => void; adminUsername: string; onRefresh: (uuid: string) => void }> = ({ user, onClose, adminUsername, onRefresh }) => {
  const navigate = useNavigate();
  const isBanned = user.is_banned;

  const copyUuid = () => {
    navigator.clipboard.writeText(user.uuid);
    toast.success('تم نسخ UUID');
  };

  const actions = [
    { label: "إرسال VIP", icon: Star, color: "#f59e0b", onClick: () => navigate(`/admin/vip?uuid=${user.uuid}`) },
    {
      label: isBanned ? "فك الحظر" : "حظر", icon: isBanned ? Unlock : Ban,
      color: isBanned ? "#10b981" : "#f43f5e",
      onClick: () => {
        if (isBanned) {
          fetch('https://galachat.site/project-z/api.php', {
            method: 'POST',
            body: new URLSearchParams({ action: 'admin_ban_user', admin_key: 'ghala2026owner', uuid: user.uuid, unban: 'true', reason: 'admin_action', admin_name: adminUsername }),
          }).then(r => r.json()).then(d => { if (d.success) { toast.success('تم فك الحظر'); onRefresh(user.uuid); } else toast.error('فشل فك الحظر'); }).catch(() => toast.error('خطأ في الاتصال'));
        } else navigate(`/admin/ban?uuid=${user.uuid}`);
      }
    },
    { label: "تغيير الآيدي", icon: KeyRound, color: "#8b5cf6", onClick: () => navigate(`/admin/id-change?uuid=${user.uuid}`) },
    { label: "تصفير الراتب", icon: RotateCcw, color: "#f97316", onClick: () => toast.info('جاري تصفير الراتب...') },
    { label: "إيقاف الشحن", icon: BatteryCharging, color: "#ef4444", onClick: () => toast.info('جاري إيقاف الشحن...') },
    { label: "تغيير الصورة", icon: ImageIcon, color: "#06b6d4", onClick: () => toast.info('جاري فتح تغيير الصورة...') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.92, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, y: 30, scale: 0.92 }}
      transition={{ type: "spring", damping: 22, stiffness: 260 }}
      className="rounded-3xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, rgba(16,185,129,0.12) 0%, rgba(255,255,255,0.04) 40%, rgba(245,158,11,0.06) 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 20px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      {/* Card Header — ID Card top strip */}
      <div
        className="h-2 w-full"
        style={{
          background: 'linear-gradient(90deg, hsl(160 84% 39%), hsl(38 92% 50%), hsl(160 84% 39%))',
        }}
      />

      {/* Profile Section */}
      <div className="p-5 flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <motion.div
            className="w-20 h-20 rounded-2xl overflow-hidden"
            style={{
              border: '3px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
            whileHover={{ scale: 1.05 }}
          >
            <img src={user.avatar || '/placeholder.svg'} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
          </motion.div>
          <motion.div
            className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full border-[3px] ${user.online ? 'bg-admin-emerald' : 'bg-zinc-500'}`}
            style={{ borderColor: 'hsl(240 10% 5%)' }}
            animate={user.online ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-base truncate">{user.name}</h3>
            {user.vip_level > 0 && (
              <span
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.1))',
                  color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}
              >
                VIP {user.vip_level}
              </span>
            )}
          </div>

          {/* UUID with copy */}
          <button onClick={copyUuid} className="flex items-center gap-1.5 group mb-1.5">
            <span className="text-xs text-muted-foreground tabular-nums font-mono">#{user.uuid}</span>
            <Copy size={11} className="text-muted-foreground group-active:text-admin-emerald transition-colors" />
          </button>

          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-bold ${isBanned ? 'text-admin-rose' : 'text-admin-emerald'}`}>
              {isBanned ? 'محظور' : '● نشط'}
            </span>
            {user.created_at && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString('ar-SA')}
              </span>
            )}
          </div>
        </div>

        <motion.button
          onClick={onClose}
          whileTap={{ scale: 0.85, rotate: 90 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* Stats Row */}
      <div className="px-5 grid grid-cols-4 gap-2">
        {[
          { label: "الراتب", value: `$${user.salary || 0}`, color: "#10b981" },
          { label: "الداعم", value: user.sender_level || 0, color: "#f59e0b" },
          { label: "الدعم", value: user.receiver_level || 0, color: "#3b82f6" },
          { label: "الشحن", value: user.charger_level || 0, color: "#f97316" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="text-center py-2.5 rounded-xl"
            style={{
              background: `${stat.color}10`,
              border: `1px solid ${stat.color}20`,
            }}
          >
            <p className="text-sm font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Details */}
      <div className="px-5 mt-3 space-y-1">
        {[
          { label: "صافي الراتب", value: `$${user.net_salary || 0}` },
          { label: "الخصومات", value: `$${user.deduction || 0}`, color: "#f43f5e" },
          { label: "الوكالة", value: user.agency_id || '—' },
          { label: "العائلة", value: user.family_id || '—' },
        ].map((item) => (
          <div key={item.label} className="flex justify-between text-[11px] py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium tabular-nums" style={item.color ? { color: item.color } : {}}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="p-4 grid grid-cols-3 gap-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.03 }}
              whileTap={{ scale: 0.92 }}
              onClick={action.onClick}
              className="py-2.5 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1.5"
              style={{
                background: `${action.color}12`,
                border: `1px solid ${action.color}20`,
                color: action.color,
              }}
            >
              <Icon size={18} />
              {action.label}
            </motion.button>
          );
        })}
      </div>

      {/* Card bottom strip */}
      <div
        className="h-1 w-full"
        style={{
          background: 'linear-gradient(90deg, hsl(160 84% 39%), hsl(38 92% 50%), hsl(160 84% 39%))',
          opacity: 0.5,
        }}
      />
    </motion.div>
  );
};

/* ─── Delay Monitor (Owner only) ─── */
const DelayMonitor: React.FC = () => {
  const [alerts, setAlerts] = useState<DelayAlert[]>([]);

  useEffect(() => {
    checkPendingRequests().then(setAlerts);
    const iv = setInterval(() => checkPendingRequests().then(setAlerts), 10 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 space-y-2"
      style={{
        background: 'rgba(244,63,94,0.06)',
        border: '1px solid rgba(244,63,94,0.15)',
      }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <p className="text-xs font-bold text-destructive">طلبات متأخرة (+30 دقيقة)</p>
      </div>
      {alerts.map(a => (
        <div key={a.type} className="flex justify-between text-[11px] px-1">
          <span className="text-muted-foreground">{a.type}</span>
          <span className="text-destructive font-bold">{a.count} طلب</span>
        </div>
      ))}
    </motion.div>
  );
};

/* ─── Types ─── */
/* ─── Action Info Helper ─── */
const actionInfoMap: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  approve_frame_claim: { label: "موافقة على إطار", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_frame_claim: { label: "رفض إطار", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_entry_claim: { label: "موافقة على دخولية", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  approve_entry_request: { label: "موافقة على دخولية", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_entry_claim: { label: "رفض دخولية", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  reject_entry_request: { label: "رفض دخولية", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_hair: { label: "موافقة على تسريحة", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_hair: { label: "رفض تسريحة", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_salary: { label: "موافقة على سحب", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_salary: { label: "رفض سحب", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_vip: { label: "تفعيل VIP", emoji: "", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  approve_animated_photo: { label: "موافقة صورة متحركة", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_animated_photo: { label: "رفض صورة متحركة", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_custom_gift: { label: "موافقة هدية مخصصة", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_custom_gift: { label: "رفض هدية مخصصة", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  ban_user: { label: "حظر مستخدم", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  unban_user: { label: "فك حظر", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  change_id: { label: "تغيير آيدي", emoji: "", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  change_account_type: { label: "تغيير نوع حساب", emoji: "", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  delete_message: { label: "حذف رسالة", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  login: { label: "تسجيل دخول", emoji: "🔐", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  works_approve_request: { label: "موافقة طلب وركس", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  works_reject_request: { label: "رفض طلب وركس", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  works_list_accounts: { label: "عرض حسابات وركس", emoji: "", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  works_list_requests: { label: "عرض طلبات وركس", emoji: "", color: "text-sky-400", bgColor: "bg-sky-500/10" },
};

const getActionInfo = (action: string) => {
  let info = actionInfoMap[action];
  if (!info) {
    const key = Object.keys(actionInfoMap).find(k => action.includes(k));
    info = key ? actionInfoMap[key] : undefined;
  }
  if (!info) {
    const isNeg = action.includes("reject") || action.includes("ban") || action.includes("delete");
    info = { label: action || "عملية", emoji: isNeg ? "" : "", color: isNeg ? "text-red-400" : "text-primary", bgColor: isNeg ? "bg-red-500/10" : "bg-primary/10" };
  }
  return info;
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
  onLogout?: () => void;
}

const AdminHomeView: React.FC<Props> = ({
  adminDisplayName, adminRole: _adminRole, stats, badges,
  onServiceClick: _onServiceClick, onChatClick: _onChatClick, recentLogs, isOwner, isSuperAdmin,
}: any) => {
  const navigate = useNavigate();
  const [searchUuid, setSearchUuid] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const adminUsername = localStorage.getItem("admin_username") || '';
  const adminRole = localStorage.getItem("admin_role") as string | null;
  const shiftStart = localStorage.getItem("admin_shift_start");
  const shiftEnd = localStorage.getItem("admin_shift_end");

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

  const allServices = [
    { icon: Star, label: "VIP", route: "/admin/vip", color: "#f59e0b", roles: ["owner", "super_admin"], badge: vipBadge },
    { icon: ShieldAlert, label: "الحماية", route: "/admin/ban", color: "#f43f5e", roles: ["owner", "super_admin"], badge: banBadge },
    { icon: Banknote, label: "الرواتب", route: "/admin/salary", color: "#10b981", roles: ["owner"], badge: salaryBadge },
    { icon: Package, label: "الطلبات", route: "/admin/requests", color: "#3b82f6", roles: ["owner", "super_admin", "admin"], badge: requestsBadge },
    { icon: ShoppingBag, label: "المتجر", route: "/admin/gifts", color: "#ec4899", roles: ["owner"], badge: 0 },
    { icon: Headphones, label: "الدعم", route: "/admin/support", color: "#06b6d4", roles: ["owner", "super_admin", "admin"], badge: supportBadge },
    { icon: KeyRound, label: "الآيدي", route: "/admin/id-change", color: "#8b5cf6", roles: ["owner", "super_admin"], badge: 0 },
    { icon: TrendingUp, label: "الإيرادات", route: "/admin/income", color: "#10b981", roles: ["owner"], badge: 0 },
    { icon: Building2, label: "الوكالات", route: "/admin/agencies", color: "#f97316", roles: ["owner"], badge: 0 },
    { icon: Users, label: "المشرفين", route: "/admin/accounts", color: "#14b8a6", roles: ["owner"], badge: 0 },
    { icon: ScrollText, label: "السجل", route: "/admin/log", color: "#6366f1", roles: ["owner", "super_admin"], badge: 0 },
    { icon: Briefcase, label: "البيدي", route: "/admin/works", color: "#f43f5e", roles: ["owner"], badge: 0 },
    { icon: Settings, label: "الإعدادات", route: "/admin/settings", color: "#71717a", roles: ["owner"], badge: 0 },
    { icon: ClipboardList, label: "طلبات المضيفات", route: "/admin/host-requests", color: "#14b8a6", roles: ["owner", "super_admin", "admin"], badge: 0 },
  ];

  const visibleServices = allServices.filter(s => adminRole && s.roles.includes(adminRole));

  return (
    <div className="min-h-screen bg-background pb-32 admin-theme" dir="rtl">
      <div className="max-w-[448px] mx-auto px-4 pt-5 space-y-5">

        {/* ═══ Header ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))',
                boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
              }}
              animate={{ rotateY: [0, 10, 0, -10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles size={20} className="text-white" />
            </motion.div>
            <div>
              <h2 className="text-base font-bold leading-tight">أهلاً، {adminDisplayName}</h2>
              <p className="text-[11px] text-muted-foreground">لوحة التحكم</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Bell size={17} />
            {totalBadge > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-[18px] min-w-[18px] rounded-full text-[9px] font-bold flex items-center justify-center px-1"
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
        </motion.div>

        {/* ═══ Search Bar ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="relative">
            <input
              type="text"
              value={searchUuid}
              onChange={(e) => setSearchUuid(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              placeholder="ابحث برقم UUID..."
              className="w-full h-11 rounded-2xl pr-4 pl-12 text-sm placeholder:text-muted-foreground focus:outline-none tabular-nums"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              dir="ltr"
            />
            <motion.button
              onClick={() => searchUser()}
              whileTap={{ scale: 0.9 }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))',
              }}
            >
              {searching ? <Loader2 size={14} className="text-white animate-spin" /> : <Search size={14} className="text-white" />}
            </motion.button>
            {searchUuid && (
              <button
                onClick={() => { setSearchUuid(""); setSearchResult(null); }}
                className="absolute left-11 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>

        {/* ═══ Search Result — ID Card ═══ */}
        <AnimatePresence>
          {searchResult && (
            <UserIdCard
              user={searchResult}
              onClose={() => setSearchResult(null)}
              adminUsername={adminUsername}
              onRefresh={searchUser}
            />
          )}
        </AnimatePresence>

        {!searchResult && (
          <>
            {/* ═══ Stats Row ═══ */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "معلّق", value: stats.pending, color: "#f59e0b", icon: Clock },
                { label: "مقبول", value: stats.approved, color: "#10b981", icon: CheckCircle },
                { label: "مرفوض", value: stats.rejected, color: "#f43f5e", icon: XCircle },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-2xl p-3.5 text-center relative overflow-hidden"
                    style={{
                      background: `${stat.color}10`,
                      border: `1px solid ${stat.color}18`,
                    }}
                  >
                    <Icon size={18} className="mx-auto mb-1.5" style={{ color: stat.color }} />
                    <p className="text-2xl font-bold tabular-nums font-mono" style={{ color: stat.color }}>
                      <AnimatedNumber value={stat.value} />
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* ═══ Quick Chat ═══ */}
            <div className="flex gap-2">
              <motion.button
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/admin/chat")}
                className="flex-1 h-11 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.12)',
                  color: '#10b981',
                }}
              >
                <Shield size={15} />
                مجموعة المشرفين
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/admin/chat")}
                className="flex-1 h-11 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 text-muted-foreground"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Users size={15} />
                كل الأدمن
              </motion.button>
            </div>

            {/* ═══ Shift Timer ═══ */}
            {(shiftStart || shiftEnd) && <ShiftCountdown shiftStart={shiftStart} shiftEnd={shiftEnd} />}

            {/* ═══ Owner Delay Monitor ═══ */}
            {isOwner && <DelayMonitor />}

            {/* ═══ Service Grid — 4 cols ═══ */}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-3">الخدمات</p>
              <div className="grid grid-cols-4 gap-3">
                {visibleServices.map((service, index) => {
                  const Icon = service.icon;
                  return (
                    <motion.button
                      key={service.route + service.label}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.03, type: 'spring', stiffness: 300, damping: 22 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => navigate(service.route)}
                      className="flex flex-col items-center gap-1.5 relative"
                    >
                      <div
                        className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center relative"
                        style={{
                          background: `${service.color}12`,
                          border: `1px solid ${service.color}18`,
                        }}
                      >
                        <Icon size={22} style={{ color: service.color }} />
                      </div>
                      {service.badge > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -left-1 h-[18px] min-w-[18px] rounded-full text-[9px] font-bold flex items-center justify-center px-1 text-white"
                          style={{
                            background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))',
                            boxShadow: '0 2px 6px rgba(244,63,94,0.5)',
                            border: '2px solid hsl(240 10% 3.9%)',
                          }}
                        >
                          {service.badge > 99 ? '99+' : service.badge}
                        </motion.span>
                      )}
                      <span className="text-[10px] font-medium text-muted-foreground">{service.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ═══ Recent Activity ═══ */}
            {recentLogs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3.5 rounded-full gold-gradient" />
                    <p className="text-[11px] font-bold text-foreground">آخر العمليات</p>
                  </div>
                  {isOwner && (
                    <motion.button
                      onClick={() => navigate("/admin/log")}
                      whileTap={{ scale: 0.95 }}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-primary bg-primary/10"
                    >
                      عرض الكل
                    </motion.button>
                  )}
                </div>
                <div className="space-y-2.5">
                  {recentLogs.slice(0, 5).map((log: any, i: number) => {
                    const info = getActionInfo(log.action || "");
                    const details = log.details || {};
                    const targetName = details.user_name || details.target_name || details.member_name || details.bd_name || "";
                    const targetId = details.user_uuid || details.target_uuid || details.member_uuid || details.uuid || "";
                    const thumbUrl = details.image_url || details.thumbnail_url || details.file_url || details.evidence_url || details.gif_url || "";
                    const extraInfo = details.title || (details.vip_level ? `VIP ${details.vip_level}` : "") || (details.amount_usd ? `$${details.amount_usd}` : "") || (details.new_id ? `آيدي: ${details.new_id}` : "");
                    const timeStr = log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <motion.div
                        key={log.id || i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + i * 0.05 }}
                        className="rounded-2xl overflow-hidden active:scale-[0.97] transition-transform cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                          border: '1px solid rgba(255,255,255,0.06)',
                          boxShadow: '0 4px 20px -6px rgba(0,0,0,0.4)',
                        }}
                        dir="rtl"
                        onClick={() => isOwner && navigate("/admin/log")}
                      >
                        <div className="flex items-stretch gap-0">
                          {/* Thumbnail / Icon area */}
                          {thumbUrl ? (
                            <div className="w-[72px] shrink-0 relative overflow-hidden">
                              <img src={thumbUrl} alt="" className="w-full h-full object-cover min-h-[80px]" />
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.6), transparent)' }} />
                              <div className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center ${info.bgColor}`}>
                                <span className="text-xs">{info.emoji}</span>
                              </div>
                            </div>
                          ) : (
                            <div className={`w-[56px] shrink-0 flex items-center justify-center ${info.bgColor}`}>
                              <span className="text-xl">{info.emoji}</span>
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                            <p className={`text-[12px] font-black ${info.color} leading-tight`}>{info.label}</p>
                            {targetName && (
                              <p className="text-[10px] text-foreground/80 font-bold truncate mt-1">
                                {targetName}
                                {targetId && <span className="text-muted-foreground/40 font-normal mr-1 text-[9px]">#{targetId.slice(0, 6)}</span>}
                              </p>
                            )}
                            {extraInfo && (
                              <p className="text-[9px] text-foreground/50 truncate mt-0.5">{extraInfo}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[9px] text-muted-foreground/60">{log.admin_username}</span>
                              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                              <span className="text-[9px] text-muted-foreground/50 tabular-nums">{timeStr}</span>
                            </div>
                          </div>

                          <div className="flex items-center pr-2">
                            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/20" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminHomeView;
