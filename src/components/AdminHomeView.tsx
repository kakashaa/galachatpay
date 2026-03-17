import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Crown, ShieldBan, Hash, DollarSign, Gift, Sparkles, Frame,
  Camera, BadgeCheck, Video, Bell, Briefcase, Settings, Users, ScrollText,
  Zap, Star, Headset, Ban, ImageIcon, Wallet, Copy, MessageSquare,
  Loader2, Scissors,
} from 'lucide-react';
import { getAvatar, fixAvatarUrl } from '@/lib/avatarHelper';
import avatarMale from '@/assets/avatar-male.png';

interface UserInfo {
  name: string;
  uuid: string;
  avatar?: string;
  vip_level?: number;
  type_user?: number;
  coins?: number;
  diamonds?: number;
  salary?: number;
  charger_level?: number;
  receiver_level?: number;
  sender_level?: number;
  is_online?: boolean;
}

interface ServiceItem {
  key: string;
  label: string;
  icon: React.ElementType;
  bg: string;
  iconColor: string;
  badge?: number;
  ownerOnly?: boolean;
  superOnly?: boolean;
}

interface Props {
  adminDisplayName: string;
  adminRole: string | null;
  stats: { pending: number; approved: number; rejected: number };
  badges: Record<string, number>;
  onServiceClick: (key: string) => void;
  onChatClick: (room: string) => void;
  recentLogs: any[];
  isOwner: boolean;
  isSuperAdmin: boolean;
  chatBadge?: number;
}

const getUserTypeLabel = (type: number): string => {
  switch (type) {
    case 0: return 'مستخدم';
    case 1: return 'مضيف';
    case 2: return 'وكيل مضيفين';
    case 3: return 'وكيل شحن';
    case 4: return 'وكيل شحن ومضيفين';
    case 5: return 'وكيل شحن ومضيف';
    case 6: return 'الكل';
    default: return 'مستخدم';
  }
};

const AdminHomeView: React.FC<Props> = ({
  adminDisplayName, adminRole, stats, badges,
  onServiceClick, onChatClick, recentLogs, isOwner, isSuperAdmin, chatBadge,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserInfo | null>(null);
  const [searchError, setSearchError] = useState('');
  const [userAvatar, setUserAvatar] = useState('');

  const roleLabel = adminRole === 'owner' ? 'مدير النظام الأعلى'
    : adminRole === 'super_admin' ? 'مسؤول أعلى'
    : adminRole === 'admin' ? 'مسؤول'
    : 'مشرف';

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchedUser(null);
    setUserAvatar('');
    try {
      const res = await fetch(`https://galachat.site/project-z/api.php?action=admin_user_info&admin_key=ghala2026owner&uuid=${q}`);
      const data = await res.json();
      if (data.success && data.user) {
        setSearchedUser(data.user);
        // Try to get avatar
        const av = await getAvatar(q);
        if (av) setUserAvatar(fixAvatarUrl(av) || av);
      } else {
        setSearchError(data.error || 'لم يتم العثور على المستخدم');
      }
    } catch {
      setSearchError('فشل الاتصال بالسيرفر');
    } finally {
      setSearchLoading(false);
    }
  };

  const copyUuid = (uuid: string) => {
    navigator.clipboard.writeText(uuid);
  };

  // Service grid items - same style as user MenuGrid
  const services: ServiceItem[] = [
    ...(isSuperAdmin ? [
      { key: 'all_requests', label: 'VIP', icon: Crown, bg: 'rgba(234,179,8,0.12)', iconColor: 'text-yellow-400', badge: badges.vip || 0 },
      { key: 'reports', label: 'البلاغات', icon: ShieldBan, bg: 'rgba(239,68,68,0.12)', iconColor: 'text-red-400', badge: badges.protection || 0 },
    ] : []),
    { key: 'blocks', label: 'الحظر', icon: Ban, bg: 'rgba(239,68,68,0.12)', iconColor: 'text-red-400' },
    { key: 'admin_support', label: 'الدعم', icon: Headset, bg: 'rgba(59,130,246,0.12)', iconColor: 'text-blue-400', badge: badges.support || 0 },
    ...(isSuperAdmin ? [
      { key: 'salary', label: 'الرواتب', icon: DollarSign, bg: 'rgba(34,197,94,0.12)', iconColor: 'text-green-400', badge: badges.salary || 0 },
      { key: 'manual_actions', label: 'صلاحيات', icon: Zap, bg: 'rgba(168,85,247,0.12)', iconColor: 'text-purple-400' },
      { key: 'custom_gifts', label: 'هدايا', icon: Gift, bg: 'rgba(236,72,153,0.12)', iconColor: 'text-pink-400', badge: badges.requests || 0 },
      { key: 'animated_photos', label: 'صور متحركة', icon: Camera, bg: 'rgba(249,115,22,0.12)', iconColor: 'text-orange-400' },
      { key: 'id_changes', label: 'تغيير آيدي', icon: Hash, bg: 'rgba(168,85,247,0.12)', iconColor: 'text-purple-400' },
    ] : []),
    ...(isOwner ? [
      { key: 'entries', label: 'دخوليات', icon: Sparkles, bg: 'rgba(6,182,212,0.12)', iconColor: 'text-cyan-400' },
      { key: 'frames', label: 'إطارات', icon: Frame, bg: 'rgba(99,102,241,0.12)', iconColor: 'text-indigo-400' },
      { key: 'hairs', label: 'شعرات', icon: Scissors, bg: 'rgba(251,191,36,0.12)', iconColor: 'text-amber-400' },
      { key: 'videos', label: 'فيديوهات', icon: Video, bg: 'rgba(236,72,153,0.12)', iconColor: 'text-pink-400' },
      { key: 'notifications', label: 'إشعارات', icon: Bell, bg: 'rgba(59,130,246,0.12)', iconColor: 'text-blue-400' },
      { key: 'agencies', label: 'وكالات', icon: Briefcase, bg: 'rgba(245,158,11,0.12)', iconColor: 'text-amber-400' },
      { key: 'banners', label: 'بنرات', icon: ImageIcon, bg: 'rgba(6,182,212,0.12)', iconColor: 'text-teal-400' },
      { key: 'element_settings', label: 'الإعدادات', icon: Settings, bg: 'rgba(100,116,139,0.12)', iconColor: 'text-slate-400' },
      { key: 'admin_stars', label: 'منح نجوم', icon: Star, bg: 'rgba(234,179,8,0.12)', iconColor: 'text-yellow-400' },
      { key: 'moderators', label: 'الأدمن', icon: Users, bg: 'rgba(34,197,94,0.12)', iconColor: 'text-emerald-400' },
      { key: 'top_agents', label: 'TOP وكلاء', icon: Crown, bg: 'rgba(245,158,11,0.12)', iconColor: 'text-amber-400' },
      { key: 'bd_management', label: 'إدارة BD', icon: Briefcase, bg: 'rgba(239,68,68,0.12)', iconColor: 'text-red-400' },
      { key: 'audit_log', label: 'السجل', icon: ScrollText, bg: 'rgba(168,85,247,0.12)', iconColor: 'text-violet-400' },
      { key: 'trash', label: 'المحذوفات', icon: Settings, bg: 'rgba(100,116,139,0.12)', iconColor: 'text-gray-400' },
    ] : []),
  ];

  return (
    <div className="pb-36" dir="rtl">
      {/* Lightweight background - same as user Dashboard */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/5 rounded-full" />
      </div>

      <main className="relative z-10 px-3 space-y-3">
        {/* 1. Search Bar */}
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              inputMode="numeric"
              placeholder="بحث سريع بالآيدي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
              dir="ltr"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchLoading || !searchQuery.trim()}
            className="px-4 rounded-xl bg-primary/15 border border-primary/20 text-primary font-bold text-xs active:scale-95 transition-transform disabled:opacity-40"
          >
            {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'بحث'}
          </button>
        </div>

        {/* Search Error */}
        {searchError && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs text-destructive text-center">
            {searchError}
          </motion.div>
        )}

        {/* Search Result - User Card */}
        {searchedUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 relative overflow-hidden border border-white/5"
            style={{ background: 'linear-gradient(145deg, rgba(18,18,26,1), rgba(26,26,46,1))' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="relative flex-shrink-0">
                <img
                  src={userAvatar || avatarMale}
                  alt={searchedUser.name}
                  className="w-10 h-10 rounded-lg object-cover border border-white/10"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = avatarMale; }}
                />
                {searchedUser.is_online && (
                  <div className="absolute -bottom-px -left-px w-2 h-2 rounded-full bg-emerald-500 border border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <h2 className="text-xs font-bold text-foreground truncate">{searchedUser.name}</h2>
                  {searchedUser.vip_level && searchedUser.vip_level > 0 && (
                    <span className="inline-flex items-center gap-px px-1 rounded text-[8px] font-bold"
                      style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)' }}>
                      <Crown className="w-2 h-2 text-yellow-400" />
                      <span className="text-yellow-300">VIP {searchedUser.vip_level}</span>
                    </span>
                  )}
                  <span className="px-1 rounded text-[8px] font-bold bg-white/10 border border-white/20 text-foreground">
                    {getUserTypeLabel(searchedUser.type_user || 0)}
                  </span>
                </div>
                <button onClick={() => copyUuid(searchedUser.uuid)} className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
                  <span className="text-[9px] font-mono">UUID: {searchedUser.uuid}</span>
                  <Copy className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[
                { label: 'كوينز', value: (searchedUser.coins || 0).toLocaleString(), color: 'text-yellow-400' },
                { label: 'ماسات', value: (searchedUser.diamonds || 0).toLocaleString(), color: 'text-cyan-400' },
                { label: 'الراتب', value: `$${searchedUser.salary || 0}`, color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="text-center py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <p className={`text-[10px] font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-[8px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Level bars */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[
                { label: 'داعم', level: searchedUser.charger_level || 0, color: 'bg-yellow-400' },
                { label: 'مدعوم', level: searchedUser.receiver_level || 0, color: 'bg-cyan-400' },
                { label: 'مرسل', level: searchedUser.sender_level || 0, color: 'bg-emerald-400' },
              ].map(l => (
                <div key={l.label} className="space-y-0.5">
                  <div className="flex justify-between text-[8px]">
                    <span className="text-muted-foreground">{l.label}</span>
                    <span className="text-foreground font-mono">{l.level}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5">
                    <div className={`h-full rounded-full ${l.color}`} style={{ width: `${Math.min(l.level, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick action buttons */}
            <div className="flex gap-1.5">
              {[
                { label: 'حظر', key: 'blocks', icon: Ban, color: 'text-red-400', bg: 'bg-red-500/10' },
                { label: 'VIP', key: 'all_requests', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                { label: 'آيدي', key: 'id_changes', icon: Hash, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'السجل', key: 'audit_log', icon: ScrollText, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              ].map(a => (
                <button
                  key={a.key}
                  onClick={() => onServiceClick(a.key)}
                  className={`flex-1 py-2 rounded-lg ${a.bg} border border-white/5 flex flex-col items-center gap-0.5 active:scale-95 transition-transform`}
                >
                  <a.icon className={`w-3.5 h-3.5 ${a.color}`} />
                  <span className="text-[8px] font-bold text-muted-foreground">{a.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* 2. Admin Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-3 relative overflow-hidden border border-white/5"
          style={{ background: 'linear-gradient(145deg, rgba(18,18,26,1), rgba(26,26,46,1))' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-foreground truncate">أهلاً، {adminDisplayName}</h2>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[9px] text-muted-foreground">{roleLabel} • أونلاين</p>
            </div>
          </div>
        </motion.div>

        {/* 3. Chat Bubbles */}
        <div className="flex gap-3 overflow-x-auto py-1 scrollbar-hide">
          {[
            { key: 'super', label: 'مجموعة السوبر', icon: '⚡', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30', superOnly: true },
            { key: 'all', label: 'مجموعة الكل', icon: '👥', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
          ].filter(g => !g.superOnly || isSuperAdmin).map(group => (
            <button
              key={group.key}
              onClick={() => onChatClick(group.key)}
              className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition-transform"
            >
              <div className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${group.color} border ${group.border} flex items-center justify-center text-lg`}>
                {group.icon}
                {chatBadge && chatBadge > 0 && group.key === 'all' && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] text-white font-bold flex items-center justify-center">
                    {chatBadge > 9 ? '9+' : chatBadge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold text-muted-foreground leading-tight text-center">{group.label}</span>
            </button>
          ))}
        </div>

        {/* 4. Services Title */}
        <div className="flex items-center gap-2 pr-1">
          <div className="w-1 h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.3))' }} />
          <h3 className="text-xs font-black text-foreground">الخدمات</h3>
        </div>

        {/* 5. Service Grid - 4 columns like user MenuGrid */}
        <div className="grid grid-cols-4 gap-y-4 gap-x-1.5 px-1">
          {services.map((svc, i) => (
            <motion.button
              key={svc.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02, duration: 0.2 }}
              onClick={() => onServiceClick(svc.key)}
              className="flex flex-col items-center gap-1 active:scale-90 active:-translate-y-1 transition-transform duration-150"
            >
              <div
                className="relative w-12 h-12 rounded-[14px] flex items-center justify-center"
                style={{ background: svc.bg, border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <svc.icon className={`w-5 h-5 ${svc.iconColor}`} />
                {svc.badge && svc.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] text-white font-bold flex items-center justify-center">
                    {svc.badge > 99 ? '99' : svc.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold text-muted-foreground leading-tight text-center">{svc.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { label: 'معلقة', value: stats.pending, color: 'text-amber-400' },
            { label: 'مقبولة', value: stats.approved, color: 'text-emerald-400' },
            { label: 'مرفوضة', value: stats.rejected, color: 'text-rose-400' },
          ].map(s => (
            <div key={s.label} className="text-center py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        {recentLogs.length > 0 && (
          <div className="space-y-2 mt-1">
            <div className="flex items-center gap-2 pr-1">
              <div className="w-1 h-3.5 rounded-full bg-violet-500/50" />
              <h3 className="text-xs font-black text-foreground">آخر العمليات</h3>
            </div>
            {recentLogs.slice(0, 5).map((log: any, i: number) => (
              <motion.div
                key={log.id || i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 py-2 px-3 bg-white/[0.02] border border-white/[0.04] rounded-xl"
              >
                <div className={`w-2 h-2 rounded-full ${log.action?.includes('reject') || log.action?.includes('ban') || log.action?.includes('delete') ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-foreground truncate">
                    {log.action_label || log.action || 'عملية'}
                  </p>
                </div>
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                  {log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminHomeView;
