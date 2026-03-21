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

/* ─── Ban Inline Form ─── */
const BanInlineForm: React.FC<{ user: any; onDone: () => void }> = ({ user, onDone }) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('24');
  const [banType, setBanType] = useState('normal');
  const [loading, setLoading] = useState(false);

  const durations = [
    { label: '3 ساعات', value: '3' },
    { label: '12 ساعة', value: '12' },
    { label: '24 ساعة', value: '24' },
    { label: '3 أيام', value: '72' },
    { label: '7 أيام', value: '168' },
    { label: 'دائم', value: '8760' },
  ];

  const banTypes = [
    { label: 'عادي', value: 'normal', color: 'text-amber-400' },
    { label: 'كامل', value: 'full', color: 'text-destructive' },
  ];

  const handleBan = async () => {
    if (!reason.trim()) { toast.error('أدخل سبب الحظر'); return; }
    setLoading(true);
    try {
      await galaApi.banUserReal(user.uuid, reason, parseInt(duration), banType);
      toast.success('تم حظر المستخدم بنجاح');
      onDone();
    } catch {
      toast.error('فشل الحظر');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* User preview */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
        <div className="w-9 h-9 rounded-lg overflow-hidden border border-border">
          <img src={user.avatar || '/placeholder.svg'} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
          <p className="text-[10px] text-muted-foreground tabular-nums font-mono">#{user.uuid}</p>
        </div>
      </div>

      {/* Ban type */}
      <div>
        <p className="text-[11px] text-muted-foreground mb-2">نوع الحظر:</p>
        <div className="grid grid-cols-2 gap-1.5">
          {banTypes.map(bt => (
            <button
              key={bt.value}
              onClick={() => setBanType(bt.value)}
              className={`py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                banType === bt.value
                  ? 'bg-destructive/15 border-2 border-destructive/40 text-destructive'
                  : 'bg-muted/30 border border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {bt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <p className="text-[11px] text-muted-foreground mb-2">المدة:</p>
        <div className="grid grid-cols-3 gap-1.5">
          {durations.map(d => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              className={`py-2 rounded-xl text-[10px] font-bold transition-all ${
                duration === d.value
                  ? 'bg-destructive/15 border-2 border-destructive/40 text-destructive'
                  : 'bg-muted/30 border border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div>
        <p className="text-[11px] text-muted-foreground mb-2">سبب الحظر:</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="اكتب سبب الحظر..."
          rows={2}
          className="w-full rounded-xl bg-muted/20 border border-border/40 px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-destructive/40 resize-none transition-colors"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleBan}
        disabled={loading || !reason.trim()}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
        تأكيد الحظر
      </button>
    </div>
  );
};

/* ─── Change ID Inline Form ─── */
const ChangeIdInlineForm: React.FC<{ user: any; onDone: () => void }> = ({ user, onDone }) => {
  const [nextUuid, setNextUuid] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!nextUuid.trim()) {
      toast.error('أدخل UUID الجديد');
      return;
    }

    setLoading(true);
    try {
      await galaApi.changeUuid(user.uuid, nextUuid.trim());
      toast.success('تم تغيير UUID بنجاح');
      onDone();
    } catch {
      toast.error('فشل تغيير UUID');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <p className="text-[11px] text-muted-foreground">UUID الحالي</p>
        <p className="mt-1 text-xs font-bold tabular-nums">{user.uuid}</p>
      </div>

      <input
        value={nextUuid}
        onChange={(e) => setNextUuid(e.target.value)}
        placeholder="UUID الجديد"
        className="w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring tabular-nums"
        dir="ltr"
      />

      <button
        onClick={handleChange}
        disabled={loading || !nextUuid.trim()}
        className="w-full rounded-xl bg-secondary py-3 text-xs font-bold text-secondary-foreground disabled:opacity-50"
      >
        {loading ? 'جاري التعديل...' : 'تأكيد التعديل'}
      </button>
    </div>
  );
};

/* ─── User ID Card (New UI) ─── */
const UserIdCard: React.FC<{ user: any; onClose: () => void; adminUsername: string; onRefresh: (uuid: string) => void }> = ({ user, onClose, onRefresh }) => {
  const isBanned = Boolean(user.is_banned);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [vipLevel, setVipLevel] = useState('1');
  const [busy, setBusy] = useState(false);

  const copyUuid = () => {
    navigator.clipboard.writeText(user.uuid);
    toast.success('تم نسخ UUID');
  };

  const handleUnban = async () => {
    setBusy(true);
    try {
      const d = await galaApi.unbanUser(user.uuid);
      if (d.success) {
        toast.success('تم فك الحظر');
        onRefresh(user.uuid);
      } else {
        toast.error('فشل فك الحظر');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    }
    setBusy(false);
    setActiveAction(null);
  };

  const handleVipApply = async () => {
    setBusy(true);
    try {
      await galaApi.giveVip(user.uuid, Number(vipLevel), '30');
      toast.success(`تم تنفيذ VIP ${vipLevel}`);
      onRefresh(user.uuid);
      setActiveAction(null);
    } catch {
      toast.error('فشل تنفيذ VIP');
    }
    setBusy(false);
  };

  const handleActionClick = (key: string) => {
    if (key === 'ban' && isBanned) {
      handleUnban();
      return;
    }
    setActiveAction(key);
  };

  const actions: Array<{
    key: string;
    label: string;
    icon: typeof Star;
    tone: 'primary' | 'destructive' | 'secondary' | 'muted';
  }> = [
    { key: 'vip', label: 'VIP', icon: Star, tone: 'primary' },
    { key: 'ban', label: isBanned ? 'فك الحظر' : 'حظر', icon: isBanned ? Unlock : Ban, tone: 'destructive' },
    { key: 'id', label: 'UUID', icon: KeyRound, tone: 'secondary' },
    { key: 'salary', label: 'تصفير', icon: RotateCcw, tone: 'muted' },
    { key: 'charge', label: 'الشحن', icon: BatteryCharging, tone: 'destructive' },
    { key: 'photo', label: 'الصورة', icon: ImageIcon, tone: 'secondary' },
  ];

  const toneClasses: Record<'primary' | 'destructive' | 'secondary' | 'muted', string> = {
    primary: 'bg-primary/10 border-primary/25 text-primary',
    destructive: 'bg-destructive/10 border-destructive/25 text-destructive',
    secondary: 'bg-secondary/20 border-secondary/35 text-secondary',
    muted: 'bg-muted/55 border-border text-foreground',
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/85 p-3 backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: 'linear-gradient(140deg, hsl(var(--primary) / 0.08), transparent 55%)' }} />

        <div className="relative flex items-start gap-3">
          <div className="relative">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border border-border bg-muted/40">
              <img
                src={user.avatar || '/placeholder.svg'}
                className="h-full w-full object-cover"
                alt={user.name || 'user'}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            <span className={`absolute -bottom-1 -left-1 h-3.5 w-3.5 rounded-full border-2 border-card ${user.online ? 'bg-primary' : 'bg-muted-foreground'}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-extrabold text-foreground">{user.name}</h3>
              {user.vip_level > 0 && (
                <span className="rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                  VIP {user.vip_level}
                </span>
              )}
            </div>
            <button onClick={copyUuid} className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="tabular-nums font-mono">UUID: {user.uuid}</span>
              <Copy size={10} />
            </button>
            <p className={`mt-1 text-[10px] font-bold ${isBanned ? 'text-destructive' : 'text-primary'}`}>
              {isBanned ? 'الحساب محظور' : 'الحساب نشط'}
            </p>
          </div>

          <button onClick={onClose} className="h-8 w-8 rounded-xl border border-border bg-muted/40 text-muted-foreground">
            <X size={13} className="mx-auto" />
          </button>
        </div>

        <div className="relative mt-3 grid grid-cols-4 gap-1.5">
          {[
            { label: 'الراتب', value: `$${user.salary || 0}` },
            { label: 'الداعم', value: user.sender_level || 0 },
            { label: 'الدعم', value: user.receiver_level || 0 },
            { label: 'الشحن', value: user.charger_level || 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/60 bg-background/55 px-1.5 py-2 text-center">
              <p className="text-sm font-black tabular-nums">{item.value}</p>
              <p className="mt-0.5 text-[8px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-2 rounded-2xl border border-border/60 bg-background/45 p-2">
          {[
            { label: 'صافي الراتب', value: `$${user.net_salary || 0}` },
            { label: 'الخصومات', value: `$${user.deduction || 0}` },
            { label: 'الوكالة', value: user.agency_id || '—' },
            { label: 'العائلة', value: user.family_id || '—' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b border-border/40 py-1.5 text-[10px] last:border-b-0">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-bold tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="relative mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                onClick={() => handleActionClick(action.key)}
                className={`flex min-w-[64px] flex-col items-center rounded-2xl border px-1.5 py-2 text-[8px] font-bold ${toneClasses[action.tone]}`}
              >
                <Icon size={15} />
                <span className="mt-1 whitespace-nowrap">{action.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        <ActionDialog
          open={activeAction === 'vip'}
          onClose={() => setActiveAction(null)}
          title="تفعيل VIP"
          icon={Star}
          iconColor="hsl(var(--primary))"
        >
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">اختر مستوى VIP:</p>
            <div className="grid grid-cols-5 gap-1.5">
              {['1', '2', '3', '4', '5'].map((lv) => (
                <button
                  key={lv}
                  onClick={() => setVipLevel(lv)}
                  className={`rounded-xl py-2 text-xs font-bold ${vipLevel === lv ? 'border border-primary/35 bg-primary/15 text-primary' : 'border border-border bg-muted/40 text-muted-foreground'}`}
                >
                  {lv}
                </button>
              ))}
            </div>
            <button
              onClick={handleVipApply}
              disabled={busy}
              className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? 'جاري التنفيذ...' : `تنفيذ VIP ${vipLevel}`}
            </button>
          </div>
        </ActionDialog>

        <ActionDialog
          open={activeAction === 'ban'}
          onClose={() => setActiveAction(null)}
          title="حظر المستخدم"
          icon={Ban}
          iconColor="hsl(var(--destructive))"
        >
          <BanInlineForm user={user} onDone={() => { setActiveAction(null); onRefresh(user.uuid); }} />
        </ActionDialog>

        <ActionDialog
          open={activeAction === 'salary'}
          onClose={() => setActiveAction(null)}
          title="تصفير الراتب"
          icon={RotateCcw}
          iconColor="hsl(var(--primary))"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-muted/25 p-3 text-center">
                <p className="text-base font-black tabular-nums">${user.salary || 0}</p>
                <p className="text-[9px] text-muted-foreground">الراتب الحالي</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/25 p-3 text-center">
                <p className="text-base font-black tabular-nums">${user.net_salary || 0}</p>
                <p className="text-[9px] text-muted-foreground">صافي الراتب</p>
              </div>
            </div>
            <button
              onClick={() => { toast.info('جاري تصفير الراتب...'); setActiveAction(null); }}
              className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground"
            >
              تأكيد التصفير
            </button>
          </div>
        </ActionDialog>

        <ActionDialog
          open={activeAction === 'charge'}
          onClose={() => setActiveAction(null)}
          title="إيقاف الشحن"
          icon={BatteryCharging}
          iconColor="hsl(var(--destructive))"
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center">
              <p className="text-xl font-black tabular-nums">{user.charger_level || 0}</p>
              <p className="text-[10px] text-muted-foreground">مستوى الشحن الحالي</p>
            </div>
            <button
              onClick={() => { toast.info('جاري إيقاف الشحن...'); setActiveAction(null); }}
              className="w-full rounded-xl bg-destructive py-3 text-xs font-bold text-destructive-foreground"
            >
              تأكيد الإيقاف
            </button>
          </div>
        </ActionDialog>

        <ActionDialog
          open={activeAction === 'photo'}
          onClose={() => setActiveAction(null)}
          title="تغيير الصورة"
          icon={ImageIcon}
          iconColor="hsl(var(--secondary))"
        >
          <div className="space-y-3">
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-2xl border border-border">
              <img src={user.avatar || '/placeholder.svg'} className="h-full w-full object-cover" alt={user.name || 'avatar'} />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">{user.name} — الصورة الحالية</p>
            <button
              onClick={() => { toast.info('جاري فتح أدوات الصورة...'); setActiveAction(null); }}
              className="w-full rounded-xl bg-secondary py-3 text-xs font-bold text-secondary-foreground"
            >
              فتح أدوات الصورة
            </button>
          </div>
        </ActionDialog>

        <ActionDialog
          open={activeAction === 'id'}
          onClose={() => setActiveAction(null)}
          title="تعديل UUID"
          icon={KeyRound}
          iconColor="hsl(var(--secondary))"
        >
          <ChangeIdInlineForm user={user} onDone={() => { setActiveAction(null); onRefresh(user.uuid); }} />
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
    <div className="admin-theme relative min-h-screen overflow-hidden pb-32" dir="rtl">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -top-20 right-[-70px] h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute top-72 left-[-90px] h-56 w-56 rounded-full bg-accent/5 blur-3xl" />

      <div className="relative mx-auto max-w-[448px] px-3">
        {/* ── Header (same style as user dashboard) ── */}
        <header className="flex items-center justify-between pt-6 pb-2 px-1">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <h1 className="text-base font-black gradient-text">لوحة التحكم</h1>
          <div className="relative flex items-center gap-1.5">
            <button
              onClick={() => navigate('/admin/chat')}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowNotifPanel((prev) => !prev)}
              className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              {totalBadge > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[9px] font-black text-destructive-foreground flex items-center justify-center">
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
                    className="absolute left-0 top-11 z-[100] w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                    dir="rtl"
                  >
                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                      <span className="text-[11px] font-bold text-foreground">المهام المعلقة</span>
                      <span className="text-[9px] tabular-nums text-muted-foreground">{totalBadge} عنصر</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {[
                        { label: 'طلبات VIP', count: vipBadge, route: '/admin/vip', Icon: Crown },
                        { label: 'إدارة الحظر', count: banBadge, route: '/admin/ban', Icon: ShieldAlert },
                        { label: 'طلبات الرواتب', count: salaryBadge, route: '/admin/salary', Icon: Wallet },
                        { label: 'الطلبات العامة', count: requestsBadge, route: '/admin/requests', Icon: Inbox },
                        { label: 'الدعم الفني', count: supportBadge, route: '/admin/support', Icon: Headphones },
                      ]
                        .filter((item) => item.count > 0)
                        .map((item) => (
                          <button
                            key={item.route}
                            onClick={() => { setShowNotifPanel(false); navigate(item.route); }}
                            className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-2.5 text-right hover:bg-muted/50"
                          >
                            <item.Icon size={14} className="text-primary" />
                            <span className="flex-1 text-[11px] font-bold text-foreground">{item.label}</span>
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-destructive px-1.5 text-[9px] font-bold text-destructive-foreground">
                              {item.count}
                            </span>
                          </button>
                        ))}
                      {totalBadge === 0 && (
                        <div className="px-4 py-6 text-center">
                          <CheckCircle className="mx-auto mb-1.5 h-5 w-5 text-primary" />
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

        <main className="relative z-10 space-y-3">
          {/* ── Admin Profile Card (glass-card) ── */}
          <div className="glass-card p-3">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center border border-primary/20 bg-primary/10 text-sm font-black text-primary">
                {adminDisplayName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-extrabold text-foreground">{adminDisplayName}</h2>
                <p className="text-[10px] text-muted-foreground">{adminRole ? roleLabels[adminRole] || adminRole : 'لوحة التحكم'}</p>
              </div>
              {isOwner && (
                <button
                  onClick={() => navigate('/admin/settings')}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* KPI row — glass style */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'مقبول', value: stats.approved, icon: CheckCircle, gradient: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', glow: 'rgba(16,185,129,0.3)', color: '#10b981' },
                { label: 'معلّق', value: stats.pending, icon: Clock, gradient: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))', glow: 'rgba(59,130,246,0.3)', color: '#3b82f6' },
                { label: 'مرفوض', value: stats.rejected, icon: XCircle, gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))', glow: 'rgba(239,68,68,0.3)', color: '#ef4444' },
              ].map(k => {
                const KIcon = k.icon;
                return (
                  <div
                    key={k.label}
                    className="relative overflow-hidden rounded-2xl p-3 text-center backdrop-blur-sm"
                    style={{
                      background: k.gradient,
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: `0 4px 20px ${k.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                    }}
                  >
                    <div className="pointer-events-none absolute -top-3 -right-3 w-10 h-10 rounded-full opacity-20" style={{ background: k.color }} />
                    <div className="w-7 h-7 mx-auto rounded-xl flex items-center justify-center mb-1.5" style={{ background: `${k.color}20` }}>
                      <KIcon size={14} style={{ color: k.color }} />
                    </div>
                    <p className="text-lg font-black tabular-nums leading-none" style={{ color: k.color }}>
                      <AnimatedNumber value={k.value} />
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-1 font-bold">{k.label}</p>
                  </div>
                );
              })}
            </div>

            {(shiftStart || shiftEnd) && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>الوردية: <span className="tabular-nums font-bold text-foreground">{shiftStart || '—'} → {shiftEnd || '—'}</span></span>
              </div>
            )}
          </div>

          {/* ── Search Bar ── */}
          <div className="glass-card p-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchUuid}
                  onChange={(e) => setSearchUuid(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                  placeholder="ابحث عن مستخدم، UUID..."
                  className="h-9 w-full rounded-[10px] border border-input bg-background/60 pr-8 pl-3 text-[11px] tabular-nums outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                />
                {searchUuid && (
                  <button onClick={() => { setSearchUuid(''); setSearchResult(null); }} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                onClick={() => searchUser()}
                className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-primary text-primary-foreground flex-shrink-0"
              >
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </div>
          </div>

          {/* ── Search Result ── */}
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
              {/* ── Smart Alerts ── */}
              {smartAlerts.length > 0 && (
                <div className="glass-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-3.5 rounded-full bg-destructive" />
                    <h3 className="text-xs font-black text-foreground">التنبيهات</h3>
                    <span className="text-[9px] tabular-nums text-muted-foreground mr-auto">{smartAlerts.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {smartAlerts.map((alert, i) => (
                      <AlertItem key={i} {...alert} />
                    ))}
                  </div>
                </div>
              )}

              {isOwner && <DelayMonitor />}

              {/* ── Services Grid (same style as user MenuGrid) ── */}
              <div>
                <div className="flex items-center gap-2 mb-3 pr-1">
                  <div className="w-1 h-3.5 rounded-full gold-gradient" />
                  <h3 className="text-xs font-black text-foreground">الخدمات</h3>
                </div>

                <div className="grid grid-cols-4 gap-y-4 gap-x-1.5 px-1">
                  {visible.map((service) => {
                    const Icon = service.icon;
                    return (
                      <button
                        key={service.route + service.label}
                        onClick={() => navigate(service.route)}
                        className="flex flex-col items-center gap-1 active:scale-90 active:-translate-y-1 transition-transform duration-150"
                      >
                        <div
                          className="relative w-12 h-12 rounded-[14px] flex items-center justify-center"
                          style={{
                            background: `${service.color}1F`,
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: service.color }} />
                          {service.badge > 0 && (
                            <span
                              className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[8px] font-black text-destructive-foreground flex items-center justify-center"
                              style={{ border: '2px solid hsl(var(--background))' }}
                            >
                              {service.badge > 99 ? '99+' : service.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground leading-tight text-center">
                          {service.label}
                        </span>
                      </button>
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
