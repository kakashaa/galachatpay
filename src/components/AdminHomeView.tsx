import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Inbox, FileText, Landmark, Eye, BarChart3, DollarSign,
  MessageCircle, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { galaApi } from '@/services/galaApi';
import { playUrgentSound } from '@/lib/notificationSound';
import { checkPendingRequests, type DelayAlert } from '@/utils/adminMonitor';
import { useTapFeedback } from '@/hooks/use-tap-feedback';
import UserDetailAccordion from '@/components/UserDetailAccordion';

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
  const [expandedTile, setExpandedTile] = useState<'charge' | 'support' | 'supporter' | 'salary' | null>(null);

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


  const [showMoreActions, setShowMoreActions] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(160deg, #1a1d35 0%, #0f1225 100%)',
          border: '2px solid rgba(195,165,110,0.45)',
          boxShadow: '0 0 30px rgba(195,165,110,0.1), inset 0 1px 0 rgba(195,165,110,0.2), inset 0 -1px 0 rgba(195,165,110,0.1)',
        }}
      >
        {/* Inner gold frame line */}
        <div className="pointer-events-none absolute inset-[3px] rounded-xl" style={{ border: '1px solid rgba(195,165,110,0.12)' }} />

        <div className="relative p-4 space-y-3">
          {/* Close X */}
          <button onClick={onClose} className="absolute top-2 left-2 z-10 h-6 w-6 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
            <X size={11} className="text-white/40" />
          </button>

          {/* ─── Profile Header: name left, avatar right (RTL) ─── */}
          <div className="flex items-center gap-3 pt-1" dir="rtl">
            {/* Avatar - right side in RTL */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 overflow-hidden rounded-full"
                style={{
                  border: '2.5px solid rgba(160,150,130,0.6)',
                  boxShadow: '0 0 15px rgba(160,150,130,0.15), inset 0 0 10px rgba(0,0,0,0.3)',
                  background: 'linear-gradient(135deg, #3a3d50, #2a2d40)',
                }}>
                <img
                  src={user.avatar || '/placeholder.svg'}
                  className="h-full w-full object-cover"
                  alt={user.name || 'user'}
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
              </div>
              <span className={`absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-[#1a1d35] ${user.online ? 'bg-emerald-500' : 'bg-gray-500'}`}
                style={{ boxShadow: user.online ? '0 0 8px rgba(16,185,129,0.6)' : 'none' }} />
            </div>

            {/* Name + UUID - left side in RTL */}
            <div className="flex-1 text-right">
              <h3 className="text-lg font-black text-white">{user.name}</h3>
              <button onClick={copyUuid} className="flex items-center gap-1 justify-end mt-0.5 text-[10px] text-white/50 hover:text-white/70 transition-colors">
                <Copy size={9} />
                <span className="tabular-nums font-mono">UUID: {user.uuid}</span>
              </button>
              <div className="flex items-center gap-1.5 justify-end mt-1">
                <span className={`text-[10px] font-bold ${isBanned ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isBanned ? 'الحساب محظور' : 'الحساب نشط'}
                </span>
                <span className={`h-2 w-2 rounded-full ${isBanned ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ boxShadow: isBanned ? '0 0 6px rgba(239,68,68,0.6)' : '0 0 6px rgba(16,185,129,0.6)' }} />
              </div>
            </div>
          </div>

          {/* ─── 4 Stats Tiles (light cream like reference) ─── */}
          <div className="grid grid-cols-4 gap-2" dir="rtl">
            {([
              { key: 'charge' as const, label: 'الشحن', value: user.charger_level || 0, icon: <TrendingUp size={22} className="text-amber-600" /> },
              { key: 'support' as const, label: 'الدعم', value: user.receiver_level || 0, icon: <Sparkles size={22} className="text-pink-500" /> },
              { key: 'supporter' as const, label: 'الداعم', value: user.sender_level || 0, icon: <Crown size={22} className="text-amber-500" /> },
              { key: 'salary' as const, label: 'الراتب', value: `$${user.salary || 0}`, icon: <DollarSign size={22} className="text-amber-600" /> },
            ] as const).map((item) => {
              const numericVal = typeof item.value === 'string' ? parseFloat(item.value.replace('$', '')) : item.value;
              const isEmpty = !numericVal || numericVal === 0;
              return (
                <button key={item.label}
                  disabled={isEmpty}
                  onClick={() => !isEmpty && setExpandedTile(expandedTile === item.key ? null : item.key)}
                  className={`rounded-xl text-center py-2.5 px-1 transition-all ${!isEmpty ? 'active:scale-[0.95] cursor-pointer' : 'cursor-default'} ${expandedTile === item.key ? 'ring-1 ring-amber-500/40' : ''}`}
                  style={{
                    background: isEmpty
                      ? 'linear-gradient(180deg, rgba(180,180,180,0.6) 0%, rgba(160,160,160,0.5) 100%)'
                      : 'linear-gradient(180deg, rgba(220,215,200,0.95) 0%, rgba(200,195,180,0.9) 100%)',
                    border: `1px solid ${isEmpty ? 'rgba(150,150,150,0.3)' : 'rgba(180,170,150,0.4)'}`,
                    boxShadow: isEmpty ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.2)',
                    opacity: isEmpty ? 0.5 : 1,
                  }}>
                  <p className={`text-[9px] font-bold mb-1 ${isEmpty ? 'text-gray-400' : 'text-gray-600'}`}>{item.label}</p>
                  <div className="flex justify-center mb-1" style={{ opacity: isEmpty ? 0.4 : 1 }}>{item.icon}</div>
                  <p className={`text-base font-black tabular-nums font-mono ${isEmpty ? 'text-gray-400' : 'text-gray-800'}`}>{item.value}</p>
                </button>
              );
            })}
          </div>

          {/* ─── Expandable Detail Accordion ─── */}
          <AnimatePresence>
            {expandedTile && (
              <UserDetailAccordion
                key={expandedTile}
                uuid={user.uuid}
                section={expandedTile}
                onClose={() => setExpandedTile(null)}
              />
            )}
          </AnimatePresence>

          {/* ─── Detail Rows (cream/white background like reference) ─── */}
          <div className="rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(220,215,200,0.92) 0%, rgba(210,205,190,0.88) 100%)',
              border: '1px solid rgba(180,170,150,0.3)',
            }}>
            {[
              { icon: <Wallet size={14} className="text-blue-700" />, label: 'صافي الراتب', value: `$${user.net_salary || 0}` },
              { icon: <ClipboardList size={14} className="text-blue-700" />, label: 'الخصومات', value: `$${user.deduction || 0}` },
              { icon: <Building2 size={14} className="text-blue-700" />, label: 'الوكالة', value: user.agency_id || '—' },
              { icon: <Users size={14} className="text-blue-700" />, label: 'العائلة', value: user.family_id || '—' },
            ].map((row, idx) => (
              <div key={row.label} className={`flex items-center px-3 py-2.5 ${idx < 3 ? 'border-b' : ''}`} dir="rtl"
                style={{ borderColor: 'rgba(160,150,130,0.25)' }}>
                <span className="text-xs font-bold text-gray-700 flex-1">{row.label}</span>
                <span className="font-bold tabular-nums font-mono text-gray-800 text-xs mx-3">{row.value}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(0,0,0,0.05)' }}>
                  {row.icon}
                </div>
              </div>
            ))}
          </div>

          {/* ─── 4 Action Buttons (pill-shaped, matching reference exactly) ─── */}
          <div className="grid grid-cols-4 gap-1.5" dir="rtl">
            {/* حظر - Red */}
            <button onClick={() => handleActionClick('ban')}
              className="flex flex-col items-center gap-1 rounded-xl py-2.5 active:scale-[0.95] transition-all"
              style={{
                background: 'linear-gradient(180deg, #c0392b 0%, #922b21 100%)',
                boxShadow: '0 3px 8px rgba(192,57,43,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}>
              <ShieldAlert size={18} className="text-white" />
              <span className="text-[9px] font-bold text-white">{isBanned ? 'فك حظر' : 'حظر'}</span>
            </button>

            {/* VIP - Green */}
            <button onClick={() => handleActionClick('vip')}
              className="flex flex-col items-center gap-1 rounded-xl py-2.5 active:scale-[0.95] transition-all"
              style={{
                background: 'linear-gradient(180deg, #27ae60 0%, #1e8449 100%)',
                boxShadow: '0 3px 8px rgba(39,174,96,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}>
              <Crown size={18} className="text-white" />
              <span className="text-[9px] font-bold text-white">VIP</span>
            </button>

            {/* إلغاء/تصفير - Gray */}
            <button onClick={() => handleActionClick('salary')}
              className="flex flex-col items-center gap-1 rounded-xl py-2.5 active:scale-[0.95] transition-all"
              style={{
                background: 'linear-gradient(180deg, #5d6d7e 0%, #4a5568 100%)',
                boxShadow: '0 3px 8px rgba(93,109,126,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}>
              <RotateCcw size={18} className="text-white" />
              <span className="text-[9px] font-bold text-white">إلغاء</span>
            </button>

            {/* أضف - Dark blue/teal */}
            <button onClick={() => handleActionClick('charge')}
              className="flex flex-col items-center gap-1 rounded-xl py-2.5 active:scale-[0.95] transition-all"
              style={{
                background: 'linear-gradient(180deg, #2c5f7c 0%, #1a3a50 100%)',
                boxShadow: '0 3px 8px rgba(44,95,124,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}>
              <BatteryCharging size={18} className="text-white" />
              <span className="text-[9px] font-bold text-white">أضف</span>
            </button>
          </div>

          {/* More actions toggle */}
          <button onClick={() => setShowMoreActions(v => !v)}
            className="w-full text-center text-[9px] text-white/30 hover:text-white/50 py-1 transition-colors">
            {showMoreActions ? 'إخفاء الإجراءات الإضافية' : 'المزيد ▾'}
          </button>

          {showMoreActions && (
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: 'id', label: 'UUID', icon: KeyRound },
                { key: 'photo', label: 'الصورة', icon: ImageIcon },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.key} onClick={() => handleActionClick(action.key)}
                    className="flex flex-col items-center gap-1 rounded-xl py-2 active:scale-[0.95] transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Icon size={14} className="text-white/60" />
                    <span className="text-[8px] font-bold text-white/50">{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}
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

/* ─── Service Icon with Mac Bounce ─── */
const ServiceIcon: React.FC<{
  service: { icon: typeof Crown; label: string; route: string; gradient: string; shadow: string; badge: number };
  navigate: (path: string) => void;
  tap: () => void;
}> = ({ service, navigate, tap }) => {
  const [bouncing, setBouncing] = useState(false);
  const Icon = service.icon;

  const handleClick = () => {
    tap();
    setBouncing(true);
    setTimeout(() => {
      setBouncing(false);
      navigate(service.route);
    }, 450);
  };

  return (
    <button onClick={handleClick} className="relative flex flex-col items-center gap-2 group">
      <div
        className={`w-14 h-14 rounded-[18px] bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-lg ${service.shadow} transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${bouncing ? 'animate-bounce-glow' : ''}`}
      >
        <Icon className="w-6 h-6 text-white drop-shadow-sm" strokeWidth={1.8} />
      </div>
      {service.badge > 0 && (
        <span className="absolute -top-1 right-0 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[8px] font-bold flex items-center justify-center text-white shadow-md shadow-red-500/50">
          {service.badge > 99 ? '99+' : service.badge}
        </span>
      )}
      <span className="text-[10px] text-slate-400 text-center leading-tight group-hover:text-slate-200 transition-colors">
        {service.label}
      </span>
    </button>
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
  const tap = useTapFeedback();
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

  // Service groups — macOS Launchpad style with gradients
  const allServices = [
    { icon: Crown, label: "VIP", route: "/admin/vip", gradient: "from-amber-400 to-yellow-600", shadow: "shadow-amber-500/40", roles: ["owner", "super_admin"], badge: vipBadge },
    { icon: ShieldAlert, label: "الحماية", route: "/admin/ban", gradient: "from-red-500 to-rose-600", shadow: "shadow-red-500/40", roles: ["owner", "super_admin"], badge: banBadge },
    { icon: Wallet, label: "الرواتب", route: "/admin/salary", gradient: "from-emerald-400 to-green-600", shadow: "shadow-emerald-500/40", roles: ["owner"], badge: salaryBadge },
    { icon: Inbox, label: "الطلبات", route: "/admin/requests", gradient: "from-purple-500 to-violet-600", shadow: "shadow-purple-500/40", roles: ["owner", "super_admin", "admin"], badge: requestsBadge },
    { icon: Store, label: "المتجر", route: "/admin/gifts", gradient: "from-pink-500 to-rose-600", shadow: "shadow-pink-500/40", roles: ["owner"], badge: 0 },
    { icon: Headphones, label: "الدعم", route: "/admin/support", gradient: "from-cyan-400 to-blue-500", shadow: "shadow-cyan-500/40", roles: ["owner", "super_admin", "admin"], badge: supportBadge },
    { icon: Fingerprint, label: "الآيدي", route: "/admin/id-change", gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/40", roles: ["owner", "super_admin"], badge: 0 },
    { icon: TrendingUp, label: "الإيرادات", route: "/admin/income", gradient: "from-orange-400 to-amber-600", shadow: "shadow-orange-500/40", roles: ["owner"], badge: 0 },
    { icon: Landmark, label: "الوكالات", route: "/admin/agencies", gradient: "from-teal-400 to-cyan-600", shadow: "shadow-teal-500/40", roles: ["owner"], badge: 0 },
    { icon: Users, label: "المشرفين", route: "/admin/accounts", gradient: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/40", roles: ["owner"], badge: 0 },
    { icon: ClipboardList, label: "السجل", route: "/admin/log", gradient: "from-gray-400 to-slate-600", shadow: "shadow-gray-500/30", roles: ["owner", "super_admin"], badge: 0 },
    { icon: Building2, label: "البيدي", route: "/admin/works", gradient: "from-indigo-500 to-purple-700", shadow: "shadow-indigo-500/40", roles: ["owner"], badge: 0 },
    { icon: Settings, label: "الإعدادات", route: "/admin/settings", gradient: "from-slate-400 to-slate-600", shadow: "shadow-slate-500/30", roles: ["owner"], badge: 0 },
    { icon: FileText, label: "المضيفات", route: "/admin/host-requests", gradient: "from-rose-400 to-pink-600", shadow: "shadow-rose-500/40", roles: ["owner", "super_admin", "admin"], badge: 0 },
    { icon: Eye, label: "المراقبة", route: "/admin/monitor", gradient: "from-red-500 to-orange-600", shadow: "shadow-red-500/40", roles: ["owner", "super_admin"], badge: 0 },
    { icon: Crown, label: "نادي الداعم", route: "/admin/supporter-club", gradient: "from-yellow-400 to-amber-500", shadow: "shadow-yellow-500/40", roles: ["owner"], badge: 0 },
    { icon: BarChart3, label: "البيانات الحية", route: "/admin/live-dashboard", gradient: "from-green-500 to-emerald-600", shadow: "shadow-green-500/40", roles: ["owner", "super_admin"], badge: 0 },
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

  /* Floating star particles (reference design) */
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${(i * 37 + 13) % 100}%`,
      bottom: `${(i * 23) % 60}%`,
      size: i % 3 === 0 ? 2 : 1,
      duration: 8 + (i % 7) * 3,
      delay: (i % 10) * 1.5,
      reverse: i % 2 === 0,
      opacity: i % 3 === 0 ? 0.6 : 0.3,
      color: i % 5 === 0 ? '#f59e0b' : i % 4 === 0 ? '#14b8a6' : '#ffffff',
    })), []);

  const typeColor = (type: string) => {
    if (type === 'approve' || type.includes('approve')) return 'bg-teal-400';
    if (type === 'reject' || type.includes('reject') || type.includes('ban') || type.includes('delete')) return 'bg-red-400';
    if (type === 'pending') return 'bg-amber-400';
    return 'bg-slate-400';
  };

  return (
    <div className="relative overflow-hidden pb-32" dir="rtl" style={{ background: '#0c0f1d', minHeight: '100dvh' }}>
      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        {particles.map((p) => (
          <div
            key={p.id}
            className={p.reverse ? 'particle-reverse' : 'particle'}
            style={{
              position: 'absolute',
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: p.color,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Ambient gradient glow blobs */}
      <div className="fixed top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />
      <div className="fixed bottom-40 left-0 w-60 h-60 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-[448px] min-h-dvh flex flex-col pb-24">

        {/* ── Premium Profile Header Card ── */}
        <header className="mx-4 mt-10 mb-4 rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-bl from-amber-500/15 via-[#161a35] to-teal-500/10" />
          <div className="absolute inset-0 border border-amber-400/10 rounded-2xl" />

          <div className="relative px-5 pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 flex items-center justify-center text-base font-bold text-[#0c0f1d] ring-2 ring-amber-400/30 ring-offset-2 ring-offset-[#161a35]">
                    {adminDisplayName?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#161a35]" />
                </div>

                <div>
                  <h1 className="text-base font-semibold text-white leading-tight">أهلاً {adminDisplayName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/20">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-[9px] font-semibold text-amber-400">{adminRole ? roleLabels[adminRole] || adminRole : 'لوحة التحكم'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowNotifPanel((prev) => !prev)}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                aria-label="الإشعارات"
              >
                <Bell className="w-[18px] h-[18px] text-slate-300" />
                {totalBadge > 0 && (
                  <span className="absolute -top-1 -left-1 w-[17px] h-[17px] bg-gradient-to-br from-red-400 to-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white shadow-md shadow-red-500/30">
                    {totalBadge > 99 ? '99+' : totalBadge}
                  </span>
                )}
              </button>
            </div>

            {/* Last login / shift info */}
            <div className="flex items-center gap-1.5 mt-3 pr-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500">{shiftStart && shiftEnd ? `الوردية: ${shiftStart} → ${shiftEnd}` : 'آخر دخول: الآن'}</span>
            </div>
          </div>
        </header>

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
                className="absolute left-4 right-4 top-24 z-[100] max-w-sm mx-auto overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c1424]/95 backdrop-blur-2xl shadow-2xl"
                dir="rtl"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                  <span className="text-[11px] font-bold text-white">المهام المعلقة</span>
                  <span className="text-[9px] tabular-nums text-slate-500">{totalBadge} عنصر</span>
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
                        className="flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 text-right hover:bg-white/[0.04]"
                      >
                        <item.Icon size={14} className="text-amber-400" strokeWidth={1.8} />
                        <span className="flex-1 text-[11px] font-bold text-white">{item.label}</span>
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-red-500 px-1.5 text-[9px] font-bold text-white">
                          {item.count}
                        </span>
                      </button>
                    ))}
                  {totalBadge === 0 && (
                    <div className="px-4 py-6 text-center">
                      <CheckCircle className="mx-auto mb-1.5 h-5 w-5 text-emerald-400" strokeWidth={1.8} />
                      <p className="text-[11px] text-slate-500">لا توجد مهام معلقة</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 px-4 flex flex-col gap-4">

          {/* ── Search ── */}
          <div className="relative group">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-slate-400 transition-colors" strokeWidth={1.5} />
            <input
              type="text"
              value={searchUuid}
              onChange={(e) => setSearchUuid(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              placeholder="البحث بـ UUID..."
              className="w-full h-9 pr-9 pl-10 text-[11px] bg-black/30 border border-white/5 rounded-full text-white placeholder:text-slate-600 placeholder:text-right focus:outline-none focus:ring-1 focus:ring-white/15 focus:border-white/10 transition-all duration-300 font-mono"
              dir="rtl"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchUuid && (
                <button onClick={() => { setSearchUuid(''); setSearchResult(null); }}>
                  <X size={14} className="text-slate-500" />
                </button>
              )}
              {searching && <Loader2 size={14} className="animate-spin text-amber-400" />}
            </div>
          </div>

          {/* ── Stats Row — tiny colored dots ── */}
          <div className="flex items-center justify-center gap-5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              <span className="text-[12px] font-bold text-amber-400 tabular-nums"><AnimatedNumber value={stats.pending} /></span>
              <span className="text-[10px] text-slate-500">معلق</span>
            </div>
            <div className="w-px h-3 bg-slate-700/60" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
              <span className="text-[12px] font-bold text-teal-400 tabular-nums"><AnimatedNumber value={stats.approved} /></span>
              <span className="text-[10px] text-slate-500">مقبول</span>
            </div>
            <div className="w-px h-3 bg-slate-700/60" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
              <span className="text-[12px] font-bold text-rose-400 tabular-nums"><AnimatedNumber value={stats.rejected} /></span>
              <span className="text-[10px] text-slate-500">مرفوض</span>
            </div>
          </div>

          {/* ── Group Chat — amber pill buttons ── */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/admin/chat')}
              className="flex-1 flex items-center justify-center gap-2 h-9 rounded-full bg-gradient-to-l from-amber-500/20 to-amber-600/5 border border-amber-400/15 hover:border-amber-400/30 transition-all group"
            >
              <MessageCircle className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-medium text-amber-300">قروب المشرفين</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
            {isOwner && (
              <button
                onClick={() => navigate('/admin/accounts')}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-full bg-white/5 border border-white/8 hover:border-white/15 transition-all group"
              >
                <MessageCircle className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-medium text-slate-300">كل الأدمن</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}
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
                <div className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-3 space-y-1.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1 h-3.5 rounded-full bg-red-500" />
                    <h3 className="text-xs font-bold text-white">التنبيهات</h3>
                    <span className="text-[9px] tabular-nums text-slate-500 mr-auto">{smartAlerts.length}</span>
                  </div>
                  {smartAlerts.map((alert, i) => (
                    <AlertItem key={i} {...alert} />
                  ))}
                </div>
              )}

              {isOwner && <DelayMonitor />}

              {/* ── Services Section ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[12px] font-semibold text-white/90">الخدمات</h2>
                  <button className="flex items-center gap-0.5 text-[10px] text-amber-400/70 font-medium hover:text-amber-400 transition-colors">
                    <span>عرض الكل</span>
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-y-5 gap-x-4 px-1">
                  {visible.map((service) => (
                    <ServiceIcon key={service.route + service.label} service={service} navigate={navigate} tap={tap} />
                  ))}
                </div>
              </section>

              {/* ── Activity Log ── */}
              {isOwner && recentLogs.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-[12px] font-semibold text-white/90">سجل النشاط</h2>
                    <button
                      onClick={() => navigate('/admin/log')}
                      className="flex items-center gap-0.5 text-[10px] text-amber-400/70 font-medium hover:text-amber-400 transition-colors"
                    >
                      <span>عرض الكل</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                    {recentLogs.slice(0, 4).map((log, index) => {
                      const info = getActionInfo(log.action);
                      return (
                        <div
                          key={log.id}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            index !== Math.min(recentLogs.length, 4) - 1 ? 'border-b border-white/[0.04]' : ''
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColor(log.action)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-white/90 font-medium truncate">{log.admin_username}</p>
                            <p className="text-[9px] text-slate-500 truncate mt-0.5">{info.label}</p>
                          </div>
                          <div className="flex items-center gap-1 text-[8px] text-slate-600 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Shift Timer ── */}
              {shiftEnd && <ShiftCountdown shiftStart={shiftStart} shiftEnd={shiftEnd} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminHomeView;
