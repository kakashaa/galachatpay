import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Shield, ClipboardList, Settings, Users,
  Search, Loader2, Clock, Star,
  Wallet, Bell, X, Unlock, XCircle,
  Ban, KeyRound, RotateCcw, BatteryCharging, ImageIcon,
  TrendingUp, Building2,
  ShieldAlert, Headphones, CheckCircle, AlertTriangle,
  Copy, ChevronLeft, LogOut, Crown, Fingerprint, Store,
  Inbox, FileText, Landmark, Eye, BarChart3,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { galaApi } from '@/services/galaApi';
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
    {value.toLocaleString()}
  </motion.span>
);

/* ─── Section Header ─── */
const SectionHeader: React.FC<{ title: string; action?: { label: string; onClick: () => void } }> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2.5">
      <div className="w-[3px] h-4 rounded-full bg-primary" />
      <h3 className="text-xs font-bold text-foreground tracking-wide">{title}</h3>
    </div>
    {action && (
      <button onClick={action.onClick} className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors">
        {action.label}
      </button>
    )}
  </div>
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

  const barColor = isOvertime ? 'bg-destructive' : progress > 75 ? 'bg-amber-500' : 'bg-primary';
  const textColor = isOvertime ? 'text-destructive' : progress > 75 ? 'text-amber-500' : 'text-primary';

  return (
    <div className="rounded-2xl p-3.5 bg-card border border-border">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">الوردية</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{shiftStart || '—'} → {shiftEnd || '—'}</span>
          </div>
        </div>
        <motion.span
          className={`text-base font-bold tabular-nums ${textColor} font-mono`}
          animate={{ scale: isOvertime ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: isOvertime ? Infinity : 0, duration: 1 }}
        >
          {remaining}
        </motion.span>
      </div>
      <div className="w-full h-1 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

/* ─── Centered Dialog ─── */
const ActionDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  icon: typeof Star;
  iconColor: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, icon: Icon, iconColor, children }) => {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-card border border-border overflow-hidden shadow-2xl"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${iconColor}18` }}>
            <Icon size={17} style={{ color: iconColor }} />
          </div>
          <h3 className="text-[13px] font-bold text-foreground flex-1">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted/40 hover:bg-muted flex items-center justify-center transition-colors">
            <X size={13} className="text-muted-foreground" />
          </button>
        </div>
        {/* Body */}
        <div className="p-5" dir="rtl">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── User ID Card (Redesigned) ─── */
const UserIdCard: React.FC<{ user: any; onClose: () => void; adminUsername: string; onRefresh: (uuid: string) => void }> = ({ user, onClose, onRefresh }) => {
  const navigate = useNavigate();
  const isBanned = user.is_banned;
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [vipLevel, setVipLevel] = useState('1');

  const copyUuid = () => {
    navigator.clipboard.writeText(user.uuid);
    toast.success('تم نسخ UUID');
  };

  const handleUnban = async () => {
    setActionLoading(true);
    try {
      const d = await galaApi.unbanUser(user.uuid);
      if (d.success) { toast.success('تم فك الحظر'); onRefresh(user.uuid); }
      else toast.error('فشل فك الحظر');
    } catch { toast.error('خطأ في الاتصال'); }
    setActionLoading(false);
    setActiveAction(null);
  };

  const handleActionClick = (key: string) => {
    if (key === 'ban' && isBanned) { handleUnban(); return; }
    if (key === 'id') { navigate(`/admin/id-change?uuid=${user.uuid}`); return; }
    setActiveAction(key);
  };

  const actions = [
    { key: 'vip', label: "VIP", icon: Star, color: "#f59e0b" },
    { key: 'ban', label: isBanned ? "فك حظر" : "حظر", icon: isBanned ? Unlock : Ban, color: isBanned ? "#10b981" : "#ef4444" },
    { key: 'id', label: "آيدي", icon: KeyRound, color: "#8b5cf6" },
    { key: 'salary', label: "تصفير", icon: RotateCcw, color: "#f97316" },
    { key: 'charge', label: "شحن", icon: BatteryCharging, color: "#ef4444" },
    { key: 'photo', label: "صورة", icon: ImageIcon, color: "#06b6d4" },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="rounded-2xl overflow-hidden border border-border"
        style={{ background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--card)/0.95) 100%)' }}
      >
        {/* Header row */}
        <div className="px-4 pt-4 pb-3 flex gap-3.5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
              <img src={user.avatar || '/placeholder.svg'} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-card ${user.online ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm truncate text-foreground">{user.name}</h3>
              {user.vip_level > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-400 border border-amber-500/20">
                  VIP {user.vip_level}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={copyUuid} className="flex items-center gap-1 group">
                <span className="text-[10px] text-muted-foreground/80 tabular-nums font-mono">#{user.uuid}</span>
                <Copy size={9} className="text-muted-foreground/40 group-active:text-primary transition-colors" />
              </button>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isBanned ? 'bg-destructive animate-pulse' : 'bg-emerald-400'}`} />
                <span className={`text-[9px] font-bold ${isBanned ? 'text-destructive' : 'text-emerald-400'}`}>
                  {isBanned ? 'محظور' : 'نشط'}
                </span>
              </div>
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center bg-muted/30 hover:bg-muted/60 transition-colors flex-shrink-0 self-start">
            <X size={13} className="text-muted-foreground" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="mx-4 mb-3 grid grid-cols-4 gap-1.5">
          {[
            { label: "الراتب", value: `$${user.salary || 0}`, color: "text-primary", bg: "bg-primary/8" },
            { label: "الداعم", value: user.sender_level || 0, color: "text-amber-400", bg: "bg-amber-400/8" },
            { label: "الدعم", value: user.receiver_level || 0, color: "text-blue-400", bg: "bg-blue-400/8" },
            { label: "الشحن", value: user.charger_level || 0, color: "text-orange-400", bg: "bg-orange-400/8" },
          ].map((stat) => (
            <div key={stat.label} className={`text-center py-2 rounded-xl ${stat.bg} border border-border/30`}>
              <p className={`text-sm font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
              <p className="text-[8px] text-muted-foreground/60 mt-0.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Extra details */}
        <div className="mx-4 mb-3 rounded-xl bg-muted/15 border border-border/20 divide-y divide-border/15">
          {[
            { label: "صافي الراتب", value: `$${user.net_salary || 0}` },
            { label: "الخصومات", value: `$${user.deduction || 0}`, isDestructive: true },
            { label: "الوكالة", value: user.agency_id || '—' },
            { label: "العائلة", value: user.family_id || '—' },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-[10px] px-3 py-2">
              <span className="text-muted-foreground/60">{item.label}</span>
              <span className={`font-semibold tabular-nums ${item.isDestructive ? 'text-destructive' : 'text-foreground/90'}`}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Action buttons - pill style */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-6 gap-1.5">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.key}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleActionClick(action.key)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:opacity-80"
                  style={{ background: `${action.color}0C`, border: `1px solid ${action.color}15` }}
                >
                  <Icon size={15} style={{ color: action.color }} />
                  <span className="text-[7px] font-bold" style={{ color: action.color }}>{action.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ═══ Centered Action Dialogs ═══ */}
      <AnimatePresence>
        {/* VIP Dialog */}
        <ActionDialog
          open={activeAction === 'vip'}
          onClose={() => setActiveAction(null)}
          title="إرسال VIP"
          icon={Star}
          iconColor="#f59e0b"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-border">
                <img src={user.avatar || '/placeholder.svg'} className="w-full h-full object-cover" alt="" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">#{user.uuid}</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-2">اختر المستوى:</p>
              <div className="grid grid-cols-5 gap-1.5">
                {['1','2','3','4','5'].map(lv => (
                  <button
                    key={lv}
                    onClick={() => setVipLevel(lv)}
                    className={`py-3 rounded-xl text-xs font-bold transition-all ${
                      vipLevel === lv
                        ? 'bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/10'
                        : 'bg-muted/30 border border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { navigate(`/admin/vip?uuid=${user.uuid}&level=${vipLevel}`); setActiveAction(null); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold active:scale-[0.98] transition-transform shadow-lg shadow-amber-500/20"
            >
              إرسال VIP {vipLevel}
            </button>
          </div>
        </ActionDialog>

        {/* Ban Dialog — Full inline form */}
        <ActionDialog
          open={activeAction === 'ban'}
          onClose={() => setActiveAction(null)}
          title="حظر المستخدم"
          icon={Ban}
          iconColor="#ef4444"
        >
          <BanInlineForm user={user} onDone={() => { setActiveAction(null); onRefresh(user.uuid); }} />
        </ActionDialog>

        {/* Salary Reset Dialog */}
        <ActionDialog
          open={activeAction === 'salary'}
          onClose={() => setActiveAction(null)}
          title="تصفير الراتب"
          icon={RotateCcw}
          iconColor="#f97316"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
                <p className="text-lg font-bold text-foreground tabular-nums">${user.salary || 0}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">الراتب الحالي</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
                <p className="text-lg font-bold text-foreground tabular-nums">${user.net_salary || 0}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">صافي الراتب</p>
              </div>
            </div>
            <button
              onClick={() => { toast.info('جاري تصفير الراتب...'); setActiveAction(null); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <RotateCcw size={14} />
              تأكيد التصفير
            </button>
          </div>
        </ActionDialog>

        {/* Charge Stop Dialog */}
        <ActionDialog
          open={activeAction === 'charge'}
          onClose={() => setActiveAction(null)}
          title="إيقاف الشحن"
          icon={BatteryCharging}
          iconColor="#ef4444"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-center">
              <p className="text-2xl font-bold text-foreground tabular-nums">{user.charger_level || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-1">مستوى الشحن الحالي</p>
            </div>
            <button
              onClick={() => { toast.info('جاري إيقاف الشحن...'); setActiveAction(null); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              <BatteryCharging size={14} />
              إيقاف الشحن
            </button>
          </div>
        </ActionDialog>

        {/* Photo Change Dialog */}
        <ActionDialog
          open={activeAction === 'photo'}
          onClose={() => setActiveAction(null)}
          title="تغيير الصورة"
          icon={ImageIcon}
          iconColor="#06b6d4"
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-border ring-4 ring-cyan-500/10">
                <img src={user.avatar || '/placeholder.svg'} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">{user.name} — الصورة الحالية</p>
            <button
              onClick={() => { toast.info('جاري فتح تغيير الصورة...'); setActiveAction(null); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <ImageIcon size={14} />
              تغيير الصورة
            </button>
          </div>
        </ActionDialog>
      </AnimatePresence>
    </>
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
    <div className="rounded-xl p-3 bg-destructive/5 border border-destructive/15">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
        <p className="text-[11px] font-bold text-destructive">طلبات متأخرة (+30 دقيقة)</p>
      </div>
      {alerts.map(a => (
        <div key={a.type} className="flex justify-between text-[10px] px-1 py-0.5">
          <span className="text-muted-foreground">{a.type}</span>
          <span className="text-destructive font-bold">{a.count} طلب</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Action Info Helper ─── */
const actionInfoMap: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  approve_frame_claim: { label: "موافقة على إطار", icon: CheckCircle, color: "text-emerald-400" },
  reject_frame_claim: { label: "رفض إطار", icon: XCircle, color: "text-red-400" },
  approve_entry_claim: { label: "موافقة على دخولية", icon: CheckCircle, color: "text-emerald-400" },
  approve_entry_request: { label: "موافقة على دخولية", icon: CheckCircle, color: "text-emerald-400" },
  reject_entry_claim: { label: "رفض دخولية", icon: XCircle, color: "text-red-400" },
  reject_entry_request: { label: "رفض دخولية", icon: XCircle, color: "text-red-400" },
  approve_hair: { label: "موافقة على تسريحة", icon: CheckCircle, color: "text-emerald-400" },
  reject_hair: { label: "رفض تسريحة", icon: XCircle, color: "text-red-400" },
  approve_salary: { label: "موافقة على سحب", icon: CheckCircle, color: "text-emerald-400" },
  reject_salary: { label: "رفض سحب", icon: XCircle, color: "text-red-400" },
  approve_vip: { label: "تفعيل VIP", icon: Crown, color: "text-amber-400" },
  approve_animated_photo: { label: "موافقة صورة متحركة", icon: CheckCircle, color: "text-emerald-400" },
  reject_animated_photo: { label: "رفض صورة متحركة", icon: XCircle, color: "text-red-400" },
  approve_custom_gift: { label: "موافقة هدية مخصصة", icon: CheckCircle, color: "text-emerald-400" },
  reject_custom_gift: { label: "رفض هدية مخصصة", icon: XCircle, color: "text-red-400" },
  ban_user: { label: "حظر مستخدم", icon: Ban, color: "text-red-400" },
  unban_user: { label: "فك حظر", icon: Unlock, color: "text-emerald-400" },
  change_id: { label: "تغيير آيدي", icon: KeyRound, color: "text-sky-400" },
  change_account_type: { label: "تغيير نوع حساب", icon: Users, color: "text-purple-400" },
  delete_message: { label: "حذف رسالة", icon: XCircle, color: "text-red-400" },
  login: { label: "تسجيل دخول", icon: Shield, color: "text-sky-400" },
  works_approve_request: { label: "موافقة طلب وركس", icon: CheckCircle, color: "text-emerald-400" },
  works_reject_request: { label: "رفض طلب وركس", icon: XCircle, color: "text-red-400" },
  works_list_accounts: { label: "عرض حسابات وركس", icon: Eye, color: "text-sky-400" },
  works_list_requests: { label: "عرض طلبات وركس", icon: Eye, color: "text-sky-400" },
};

const getActionInfo = (action: string) => {
  let info = actionInfoMap[action];
  if (!info) {
    const key = Object.keys(actionInfoMap).find(k => action.includes(k));
    info = key ? actionInfoMap[key] : undefined;
  }
  if (!info) {
    const isNeg = action.includes("reject") || action.includes("ban") || action.includes("delete");
    info = { label: action || "عملية", icon: isNeg ? XCircle : CheckCircle, color: isNeg ? "text-red-400" : "text-primary" };
  }
  return info;
};

/* ─── Compact KPI Card ─── */
const KPICard: React.FC<{
  label: string; value: number; icon: typeof Clock;
  colorClass: string; bgClass: string;
  onClick?: () => void;
}> = ({ label, value, icon: Icon, colorClass, bgClass, onClick }) => (
  <motion.button
    onClick={onClick}
    whileTap={{ scale: 0.97 }}
    className={`rounded-xl px-3 py-2.5 flex items-center gap-2.5 bg-card border border-border hover:border-border/80 transition-colors ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
  >
    <div className={`w-7 h-7 rounded-lg ${bgClass} flex items-center justify-center flex-shrink-0`}>
      <Icon size={13} className={colorClass} />
    </div>
    <div className="text-right min-w-0">
      <p className={`text-base font-bold tabular-nums font-mono leading-none ${colorClass}`}>
        <AnimatedNumber value={value} />
      </p>
      <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  </motion.button>
);

/* ─── Alert Item ─── */
const AlertItem: React.FC<{
  label: string; count: number; icon: typeof Bell;
  priority: 'high' | 'medium' | 'low'; onClick: () => void;
}> = ({ label, count, icon: Icon, priority, onClick }) => {
  const colors = {
    high: 'bg-destructive/8 border-destructive/15 text-destructive',
    medium: 'bg-amber-500/8 border-amber-500/15 text-amber-500',
    low: 'bg-blue-500/8 border-blue-500/15 text-blue-500',
  };
  const dotColors = { high: 'bg-destructive', medium: 'bg-amber-500', low: 'bg-blue-500' };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors hover:opacity-90 active:scale-[0.98] ${colors[priority]}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${dotColors[priority]} flex-shrink-0`} />
      <Icon size={14} className="flex-shrink-0" />
      <span className="text-[11px] font-bold flex-1 text-right">{label}</span>
      <span className="text-xs font-bold tabular-nums min-w-[20px] text-center">{count}</span>
      <ChevronLeft size={12} className="opacity-40 flex-shrink-0" />
    </button>
  );
};

/* ─── Service Group ─── */
const ServiceGroup: React.FC<{
  title: string; items: Array<{ icon: typeof Crown; label: string; route: string; color: string; badge: number }>;
  navigate: (path: string) => void;
}> = ({ title, items, navigate }) => {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider pr-1">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {items.map((service) => {
          const Icon = service.icon;
          return (
            <motion.button
              key={service.route + service.label}
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(service.route)}
              className="flex flex-col items-center gap-1.5 relative py-1"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center relative transition-colors"
                style={{
                  background: `${service.color}0D`,
                  border: `1px solid ${service.color}1A`,
                }}
              >
                <Icon size={20} style={{ color: service.color }} />
              </div>
              {service.badge > 0 && (
                <span
                  className="absolute -top-0.5 left-1 h-4 min-w-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1 text-white"
                  style={{
                    background: 'hsl(var(--destructive))',
                    border: '2px solid hsl(var(--background))',
                  }}
                >
                  {service.badge > 99 ? '99+' : service.badge}
                </span>
              )}
              <span className="text-[9px] font-medium text-muted-foreground leading-tight text-center">{service.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   ═══ MAIN COMPONENT ═══
   ═════════════════════════════════════════════════════════════ */

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
  adminDisplayName, stats, badges,
  recentLogs, isOwner, isSuperAdmin, onLogout,
}) => {
  const navigate = useNavigate();
  const [searchUuid, setSearchUuid] = useState("");
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const adminUsername = localStorage.getItem("admin_username") || '';
  const adminRole = localStorage.getItem("admin_role") as string | null;
  const shiftStart = localStorage.getItem("admin_shift_start");
  const shiftEnd = localStorage.getItem("admin_shift_end");

  const roleLabels: Record<string, string> = {
    owner: 'مالك النظام',
    super_admin: 'مدير عام',
    admin: 'مشرف',
    moderator: 'مراقب',
  };

  const searchUser = useCallback(async (uuid?: string) => {
    const target = uuid || searchUuid.trim();
    if (!target) return;
    setSearching(true); setSearchResult(null);
    try {
      const data = await galaApi.getUserInfo(target);
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

  // Service groups
  const allServices = [
    { icon: Crown, label: "VIP", route: "/admin/vip", color: "#f59e0b", roles: ["owner", "super_admin"], badge: vipBadge, group: "operations" },
    { icon: ShieldAlert, label: "الحماية", route: "/admin/ban", color: "#f43f5e", roles: ["owner", "super_admin"], badge: banBadge, group: "security" },
    { icon: Wallet, label: "الرواتب", route: "/admin/salary", color: "#10b981", roles: ["owner"], badge: salaryBadge, group: "finance" },
    { icon: Inbox, label: "الطلبات", route: "/admin/requests", color: "#3b82f6", roles: ["owner", "super_admin", "admin"], badge: requestsBadge, group: "operations" },
    { icon: Store, label: "المتجر", route: "/admin/gifts", color: "#ec4899", roles: ["owner"], badge: 0, group: "general" },
    { icon: Headphones, label: "الدعم", route: "/admin/support", color: "#06b6d4", roles: ["owner", "super_admin", "admin"], badge: supportBadge, group: "security" },
    { icon: Fingerprint, label: "الآيدي", route: "/admin/id-change", color: "#8b5cf6", roles: ["owner", "super_admin"], badge: 0, group: "operations" },
    { icon: TrendingUp, label: "الإيرادات", route: "/admin/income", color: "#10b981", roles: ["owner"], badge: 0, group: "finance" },
    { icon: Landmark, label: "الوكالات", route: "/admin/agencies", color: "#f97316", roles: ["owner"], badge: 0, group: "operations" },
    { icon: Users, label: "المشرفين", route: "/admin/accounts", color: "#14b8a6", roles: ["owner"], badge: 0, group: "general" },
    { icon: ClipboardList, label: "السجل", route: "/admin/log", color: "#6366f1", roles: ["owner", "super_admin"], badge: 0, group: "operations" },
    { icon: Building2, label: "البيدي", route: "/admin/works", color: "#f43f5e", roles: ["owner"], badge: 0, group: "general" },
    { icon: Settings, label: "الإعدادات", route: "/admin/settings", color: "#71717a", roles: ["owner"], badge: 0, group: "general" },
    { icon: FileText, label: "طلبات المضيفات", route: "/admin/host-requests", color: "#14b8a6", roles: ["owner", "super_admin", "admin"], badge: 0, group: "operations" },
    { icon: Eye, label: "المراقبة", route: "/admin/monitor", color: "#8b5cf6", roles: ["owner", "super_admin"], badge: 0, group: "security" },
    { icon: Crown, label: "نادي الداعم", route: "/admin/supporter-club", color: "#f59e0b", roles: ["owner"], badge: 0, group: "security" },
    { icon: BarChart3, label: "البيانات الحية", route: "/admin/live-dashboard", color: "#06b6d4", roles: ["owner", "super_admin"], badge: 0, group: "finance" },
  ];

  const visible = allServices.filter(s => adminRole && s.roles.includes(adminRole));

  // Smart alerts
  const smartAlerts = [
    salaryBadge > 0 && { label: `${salaryBadge} طلب راتب بحاجة مراجعة`, count: salaryBadge, icon: Wallet, priority: 'high' as const, onClick: () => navigate('/admin/salary') },
    supportBadge > 0 && { label: `${supportBadge} محادثة دعم بدون رد`, count: supportBadge, icon: Headphones, priority: 'high' as const, onClick: () => navigate('/admin/support') },
    banBadge > 0 && { label: `${banBadge} بلاغ أمني جديد`, count: banBadge, icon: ShieldAlert, priority: 'medium' as const, onClick: () => navigate('/admin/ban') },
    requestsBadge > 0 && { label: `${requestsBadge} طلب معلق`, count: requestsBadge, icon: Inbox, priority: 'medium' as const, onClick: () => navigate('/admin/requests') },
    vipBadge > 0 && { label: `${vipBadge} طلب VIP جديد`, count: vipBadge, icon: Crown, priority: 'low' as const, onClick: () => navigate('/admin/vip') },
  ].filter(Boolean) as Array<{ label: string; count: number; icon: typeof Bell; priority: 'high' | 'medium' | 'low'; onClick: () => void }>;

  return (
    <div className="min-h-screen pb-32" dir="rtl">
      <div className="max-w-[448px] mx-auto">

        {/* ═══ 1. HEADER — same style as user dashboard ═══ */}
        <header className="flex justify-between items-center px-4 pt-6 pb-3">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 active:bg-destructive/20 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-destructive" />
            </button>
          )}

          <h1 className="text-base font-black gradient-text">لوحة التحكم</h1>

          <div className="flex items-center gap-1.5 relative">
            <button
              onClick={() => navigate("/admin/chat")}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowNotifPanel(prev => !prev)}
              className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              {totalBadge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[9px] font-black text-destructive-foreground flex items-center justify-center">
                  {totalBadge > 99 ? '99+' : totalBadge}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            <AnimatePresence>
              {showNotifPanel && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90]"
                    onClick={() => setShowNotifPanel(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    className="absolute left-0 top-10 z-[100] w-72 rounded-2xl overflow-hidden bg-card border border-border"
                    dir="rtl"
                    style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}
                  >
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground">المهام المعلقة</span>
                      <span className="text-[9px] text-muted-foreground tabular-nums">{totalBadge} عنصر</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {[
                        { label: "طلبات VIP", count: vipBadge, route: "/admin/vip", Icon: Crown, color: "text-amber-500" },
                        { label: "إدارة الحظر", count: banBadge, route: "/admin/ban", Icon: ShieldAlert, color: "text-destructive" },
                        { label: "طلبات الرواتب", count: salaryBadge, route: "/admin/salary", Icon: Wallet, color: "text-primary" },
                        { label: "الطلبات العامة", count: requestsBadge, route: "/admin/requests", Icon: Inbox, color: "text-blue-500" },
                        { label: "الدعم الفني", count: supportBadge, route: "/admin/support", Icon: Headphones, color: "text-cyan-500" },
                      ].filter(item => item.count > 0).map(item => (
                        <button
                          key={item.route}
                          onClick={() => { setShowNotifPanel(false); navigate(item.route); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                        >
                          <item.Icon size={14} className={item.color} />
                          <span className="text-[11px] font-bold text-foreground flex-1 text-right">{item.label}</span>
                          <span className="h-5 min-w-5 rounded-md text-[9px] font-bold flex items-center justify-center px-1.5 bg-destructive text-white">
                            {item.count}
                          </span>
                        </button>
                      ))}
                      {totalBadge === 0 && (
                        <div className="px-4 py-6 text-center">
                          <CheckCircle className="w-5 h-5 text-primary mx-auto mb-1.5" />
                          <p className="text-[11px] text-muted-foreground">لا توجد مهام معلقة</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="px-3 space-y-4">

          {/* Admin Profile Card — like UserProfileCard */}
          <div className="rounded-2xl overflow-hidden border border-border/40"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
            <div className="p-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-[14px] bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-primary">
                  {adminDisplayName?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-foreground truncate">{adminDisplayName}</h2>
                <p className="text-[10px] text-muted-foreground/70">{adminRole ? roleLabels[adminRole] || adminRole : 'لوحة التحكم'}</p>
              </div>
              {isOwner && (
                <button
                  onClick={() => navigate("/admin/settings")}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* KPI row inside profile card */}
            <div className="px-3.5 pb-3.5 grid grid-cols-3 gap-1.5">
              {[
                { label: "معلّق", value: stats.pending, color: "text-amber-500", bg: "bg-amber-500/8" },
                { label: "مقبول", value: stats.approved, color: "text-emerald-500", bg: "bg-emerald-500/8" },
                { label: "مرفوض", value: stats.rejected, color: "text-red-500", bg: "bg-red-500/8" },
              ].map((kpi) => (
                <div key={kpi.label} className={`text-center py-2 rounded-xl ${kpi.bg} border border-border/20`}>
                  <p className={`text-sm font-bold tabular-nums font-mono ${kpi.color}`}>
                    <AnimatedNumber value={kpi.value} />
                  </p>
                  <p className="text-[8px] text-muted-foreground/60 font-medium mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Shift timer inside profile */}
            {(shiftStart || shiftEnd) && (
              <div className="px-3.5 pb-3">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <Clock size={10} className="text-amber-500" />
                    <span className="text-muted-foreground/70">الوردية</span>
                    <span className="text-muted-foreground/50 tabular-nums font-mono">{shiftStart || '—'} → {shiftEnd || '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ SEARCH BAR ═══ */}
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
              <input
                type="text"
                value={searchUuid}
                onChange={(e) => setSearchUuid(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                placeholder="ابحث عن مستخدم، UUID، طلب..."
                className="w-full h-10 rounded-[14px] pr-9 pl-3 text-[11px] placeholder:text-muted-foreground/40 focus:outline-none transition-all tabular-nums"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                dir="rtl"
              />
              {searchUuid && (
                <button
                  onClick={() => { setSearchUuid(""); setSearchResult(null); }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <motion.button
              onClick={() => searchUser()}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-primary flex-shrink-0 active:scale-95 transition-transform"
            >
              {searching ? <Loader2 size={14} className="text-primary-foreground animate-spin" /> : <Search size={14} className="text-primary-foreground" />}
            </motion.button>
          </div>

          {/* ═══ Search Result ═══ */}
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
              {/* ═══ SMART ALERTS ═══ */}
              {smartAlerts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5 pr-1">
                    <div className="w-1 h-3.5 rounded-full bg-destructive" />
                    <h3 className="text-xs font-black text-foreground">تنبيهات</h3>
                    <span className="text-[9px] text-muted-foreground/60 tabular-nums">({smartAlerts.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {smartAlerts.map((alert, i) => (
                      <AlertItem key={i} {...alert} />
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ Owner Delay Monitor ═══ */}
              {isOwner && <DelayMonitor />}

              {/* ═══ SERVICES — same grid style as user dashboard MenuGrid ═══ */}
              <div>
                <div className="flex items-center gap-2 mb-3 pr-1">
                  <div className="w-1 h-3.5 rounded-full gold-gradient" />
                  <h3 className="text-xs font-black text-foreground">الخدمات</h3>
                </div>

                {/* All services in one clean grid */}
                <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                  {visible.map((service) => {
                    const Icon = service.icon;
                    return (
                      <motion.button
                        key={service.route + service.label}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(service.route)}
                        className="flex flex-col items-center gap-1 relative active:-translate-y-0.5 transition-transform duration-150"
                      >
                        <div
                          className="w-12 h-12 rounded-[14px] flex items-center justify-center relative"
                          style={{
                            background: `${service.color}12`,
                            border: `1px solid rgba(255,255,255,0.06)`,
                          }}
                        >
                          <Icon size={20} style={{ color: service.color }} />
                          {service.badge > 0 && (
                            <span
                              className="absolute -top-1.5 -left-1.5 h-4 min-w-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1 text-white bg-destructive"
                              style={{ border: '2px solid hsl(var(--background))' }}
                            >
                              {service.badge > 99 ? '99+' : service.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground leading-tight text-center">{service.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminHomeView;
