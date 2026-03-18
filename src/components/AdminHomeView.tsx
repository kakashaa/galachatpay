import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crown, Shield, BarChart3, Headset, ClipboardList, DollarSign,
  Hash, ShoppingBag, Settings, Briefcase, Users, ScrollText,
  Search, MessageSquare, Loader2, Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAvatarUrl } from '@/lib/utils';
import { playUrgentSound } from '@/lib/notificationSound';

interface ServiceItem {
  key: string;
  label: string;
  icon: React.ElementType;
  bg: string;
  iconColor: string;
  badge?: number;
  route?: string;
}

// Shift countdown sub-component
const ShiftCountdown: React.FC<{ shiftStart: string | null; shiftEnd: string | null }> = ({ shiftStart, shiftEnd }) => {
  const [remaining, setRemaining] = useState('');
  const [progress, setProgress] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);

  useEffect(() => {
    if (!shiftEnd) {
      setRemaining('—');
      return;
    }

    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
      return d;
    };

    const update = () => {
      const now = new Date();
      const endDate = parseTime(shiftEnd);
      const startDate = shiftStart ? parseTime(shiftStart) : now;

      // Handle overnight shifts
      if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);

      const totalMs = endDate.getTime() - startDate.getTime();
      const remainMs = endDate.getTime() - now.getTime();

      if (remainMs <= 0) {
        setRemaining('انتهى');
        setProgress(100);
        setIsOvertime(true);
        return;
      }

      setIsOvertime(false);
      const elapsedPct = Math.min(100, ((totalMs - remainMs) / totalMs) * 100);
      setProgress(elapsedPct);

      const hours = Math.floor(remainMs / 3600000);
      const mins = Math.floor((remainMs % 3600000) / 60000);
      const secs = Math.floor((remainMs % 60000) / 1000);
      setRemaining(
        hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                   : `${mins}:${String(secs).padStart(2, '0')}`
      );
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
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${progress}%` }}
        />
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

const AdminHomeView: React.FC<Props> = ({
  adminDisplayName, adminRole, stats, badges,
  onServiceClick, onChatClick, recentLogs, isOwner, isSuperAdmin,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const roleLabel = adminRole === 'owner' ? 'مدير النظام الأعلى'
    : adminRole === 'super_admin' ? 'مسؤول أعلى'
    : adminRole === 'admin' ? 'مسؤول'
    : 'مشرف';

  const shiftStart = sessionStorage.getItem("admin_shift_start");
  const shiftEnd = sessionStorage.getItem("admin_shift_end");

  // UUID Search
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const { data } = await supabase.functions.invoke("gala-login", {
        body: { uuid: q, password: "info_only_bypass" },
      });
      if (data?.user) {
        setSearchResult(data.user);
      } else {
        setSearchResult({ error: true });
      }
    } catch {
      setSearchResult({ error: true });
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Build 4-column service grid
  const services: ServiceItem[] = [
    ...(isSuperAdmin ? [
      { key: 'vip', label: 'VIP', icon: Crown, bg: 'rgba(234,179,8,0.12)', iconColor: 'text-yellow-400', badge: badges.vip || 0, route: '/admin/vip' },
      { key: 'protection', label: 'الحماية', icon: Shield, bg: 'rgba(239,68,68,0.12)', iconColor: 'text-red-400', badge: badges.protection || 0, route: '/admin/ban' },
      { key: 'reports', label: 'المداخيل', icon: BarChart3, bg: 'rgba(56,189,248,0.12)', iconColor: 'text-sky-400', route: '/admin/income' },
    ] : []),
    { key: 'support', label: 'الدعم', icon: Headset, bg: 'rgba(6,182,212,0.12)', iconColor: 'text-cyan-400', badge: badges.support || 0, route: '/admin/support' },
    ...(isSuperAdmin ? [
      { key: 'requests', label: 'الهدايا', icon: ShoppingBag, bg: 'rgba(236,72,153,0.12)', iconColor: 'text-pink-400', badge: badges.requests || 0, route: '/admin/gifts' },
      { key: 'salary', label: 'الرواتب', icon: DollarSign, bg: 'rgba(34,197,94,0.12)', iconColor: 'text-emerald-400', badge: badges.salary || 0, route: '/admin/salary' },
      { key: 'change_id', label: 'آيدي', icon: Hash, bg: 'rgba(168,85,247,0.12)', iconColor: 'text-purple-400', route: '/admin/id-change' },
      { key: 'bd', label: 'البيدي', icon: Briefcase, bg: 'rgba(147,51,234,0.12)', iconColor: 'text-violet-400', route: '/admin/bd' },
    ] : []),
    ...(isOwner ? [
      { key: 'settings', label: 'الإعدادات', icon: Settings, bg: 'rgba(100,116,139,0.12)', iconColor: 'text-slate-400', route: '/admin/settings' },
      { key: 'agencies', label: 'الوكالات', icon: ClipboardList, bg: 'rgba(245,158,11,0.12)', iconColor: 'text-amber-400', route: '/admin/agencies' },
      { key: 'accounts', label: 'الأدمن', icon: Users, bg: 'rgba(34,197,94,0.12)', iconColor: 'text-emerald-400', route: '/admin/accounts' },
      { key: 'audit_log', label: 'السجل', icon: ScrollText, bg: 'rgba(139,92,246,0.12)', iconColor: 'text-violet-400', route: '/admin/log' },
    ] : []),
  ];

  return (
    <div className="relative z-10 px-3 pb-4" dir="rtl">
      {/* Quick Search */}
      <div className="mt-3 mb-3">
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            placeholder="بحث بالـ UUID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground font-mono"
            dir="ltr"
          />
          {searchQuery && (
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-3 py-1 rounded-xl bg-primary/15 text-primary text-[10px] font-bold hover:bg-primary/25 transition-colors"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'بحث'}
            </button>
          )}
        </div>

        {/* Search Result */}
        {searchResult && !searchResult.error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3"
          >
            <div className="flex items-center gap-3">
              <img
                src={getAvatarUrl(searchResult.uuid || searchQuery)}
                className="w-10 h-10 rounded-xl object-cover"
                alt=""
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{searchResult.name || searchResult.nick_name || 'مستخدم'}</p>
                <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{searchResult.uuid || searchQuery}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[
                { label: 'الكوينز', value: searchResult.coin_balance?.toLocaleString() || '0' },
                { label: 'الماسات', value: searchResult.diamond?.toLocaleString() || '0' },
                { label: 'الراتب', value: searchResult.salary?.toLocaleString() || '0' },
                { label: 'المستوى', value: searchResult.charm_level || searchResult.level || '0' },
              ].map(s => (
                <div key={s.label} className="text-center py-1.5 rounded-lg bg-white/[0.02]">
                  <p className="text-[10px] font-bold text-foreground font-mono">{s.value}</p>
                  <p className="text-[8px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {searchResult?.error && (
          <p className="text-[11px] text-destructive mt-2 text-center">لم يتم العثور على المستخدم</p>
        )}
      </div>

      {/* Admin Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl p-4 mb-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">أهلاً، {adminDisplayName}</p>
            <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-emerald-400 font-bold">متصل</span>
          </div>
        </div>

        {/* Shift info with countdown */}
        {(shiftStart || shiftEnd) && (
          <ShiftCountdown shiftStart={shiftStart} shiftEnd={shiftEnd} />
        )}

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-1.5 mt-2.5">
          {[
            { label: 'معلقة', value: stats.pending, color: 'text-amber-400' },
            { label: 'مقبولة', value: stats.approved, color: 'text-emerald-400' },
            { label: 'مرفوضة', value: stats.rejected, color: 'text-rose-400' },
          ].map(s => (
            <div key={s.label} className="text-center py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[8px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Chat Bubbles */}
      <div className="flex gap-2 mb-3">
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
      </div>

      {/* Services Title */}
      <div className="flex items-center gap-2 mb-2.5 pr-1">
        <div className="w-1 h-3.5 rounded-full bg-primary" />
        <h3 className="text-xs font-black text-foreground">الخدمات</h3>
      </div>

      {/* 4-Column Service Grid - matches MenuGrid style */}
      <div className="grid grid-cols-4 gap-y-4 gap-x-1.5 mb-4 px-1">
        {services.map((svc, i) => {
          const Icon = svc.icon;
          return (
            <motion.button
              key={svc.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              onClick={() => svc.route ? navigate(svc.route) : onServiceClick(svc.key)}
              className="flex flex-col items-center gap-1 active:scale-90 active:-translate-y-1 transition-transform duration-150"
            >
              <div
                className="relative w-12 h-12 rounded-[14px] flex items-center justify-center"
                style={{
                  background: svc.bg,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Icon className={`w-5 h-5 ${svc.iconColor}`} />
                {svc.badge && svc.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[8px] font-bold rounded-full">
                    {svc.badge > 99 ? '99+' : svc.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold text-muted-foreground leading-tight text-center">
                {svc.label}
              </span>
            </motion.button>
          );
        })}
      </div>

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
