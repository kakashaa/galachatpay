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

  // Service grid items
  const services: ServiceItem[] = [
    ...(isSuperAdmin ? [
      { key: 'vip', label: 'VIP', icon: Crown, bg: 'rgba(234,179,8,0.12)', iconColor: 'text-yellow-400', badge: badges.vip || 0 },
      { key: 'reports', label: 'البلاغات', icon: ShieldBan, bg: 'rgba(239,68,68,0.12)', iconColor: 'text-red-400', badge: badges.protection || 0 },
    ] : []),
    { key: 'blocks', label: 'الحظر', icon: Ban, bg: 'rgba(239,68,68,0.12)', iconColor: 'text-red-400' },
    { key: 'admin_support', label: 'الدعم', icon: Headset, bg: 'rgba(0,219,236,0.12)', iconColor: 'text-cyan-400', badge: badges.support || 0 },
    ...(isSuperAdmin ? [
      { key: 'salary', label: 'الرواتب', icon: DollarSign, bg: 'rgba(52,235,69,0.12)', iconColor: 'text-[#34eb45]', badge: badges.salary || 0 },
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
      { key: 'moderators', label: 'الأدمن', icon: Users, bg: 'rgba(52,235,69,0.12)', iconColor: 'text-[#34eb45]' },
      { key: 'top_agents', label: 'TOP وكلاء', icon: Crown, bg: 'rgba(245,158,11,0.12)', iconColor: 'text-amber-400' },
      { key: 'bd_management', label: 'إدارة BD', icon: Briefcase, bg: 'rgba(239,68,68,0.12)', iconColor: 'text-red-400' },
      { key: 'audit_log', label: 'السجل', icon: ScrollText, bg: 'rgba(168,85,247,0.12)', iconColor: 'text-violet-400' },
      { key: 'trash', label: 'المحذوفات', icon: Settings, bg: 'rgba(100,116,139,0.12)', iconColor: 'text-gray-400' },
    ] : []),
  ];

  return (
    <div className="pb-36" dir="rtl" style={{ background: '#0e0e0e', minHeight: '100vh' }}>
      <main className="relative z-10 px-4 space-y-5 max-w-4xl mx-auto pt-3">
        {/* 1. Search Bar */}
        <div className="relative group">
          <input
            type="text"
            inputMode="numeric"
            placeholder="البحث السريع عن المعرف (ID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full h-14 rounded-xl px-12 text-sm font-medium transition-all text-white placeholder:text-white/30"
            style={{
              background: '#000000',
              border: '1px solid rgba(72, 72, 71, 0.15)',
            }}
            dir="ltr"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[#34eb45] transition-colors" />
          {searchLoading ? (
            <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#34eb45] animate-spin" />
          ) : (
            <button onClick={handleSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#34eb45] transition-colors">
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Error */}
        {searchError && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 text-xs text-red-400 text-center"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            {searchError}
          </motion.div>
        )}

        {/* Search Result - User Card */}
        {searchedUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 relative overflow-hidden"
            style={{ background: 'rgba(26, 25, 25, 0.95)', border: '1px solid rgba(72,72,71,0.1)', boxShadow: '0 0 20px rgba(52,235,69,0.04)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <img
                  src={userAvatar || avatarMale}
                  alt={searchedUser.name}
                  className="w-14 h-14 rounded-full object-cover"
                  style={{ border: '2px solid #34eb45' }}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = avatarMale; }}
                />
                {searchedUser.is_online && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#34eb45]" style={{ border: '3px solid #1a1919' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-white">{searchedUser.name}</h2>
                  {searchedUser.vip_level && searchedUser.vip_level > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#facc15' }}>
                      <Crown className="w-3 h-3" />
                      VIP {searchedUser.vip_level}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.06)', color: '#adaaaa' }}>
                    {getUserTypeLabel(searchedUser.type_user || 0)}
                  </span>
                </div>
                <button onClick={() => copyUuid(searchedUser.uuid)} className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors mt-0.5">
                  <span className="text-[11px] font-mono">ID: #{searchedUser.uuid}</span>
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'كوينز', value: (searchedUser.coins || 0).toLocaleString(), color: '#facc15' },
                { label: 'ماسات', value: (searchedUser.diamonds || 0).toLocaleString(), color: '#22d3ee' },
                { label: 'الراتب', value: `$${searchedUser.salary || 0}`, color: '#34eb45' },
              ].map(s => (
                <div key={s.label} className="text-center py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(72,72,71,0.1)' }}>
                  <p className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-white/40">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Level bars */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'داعم', level: searchedUser.charger_level || 0, color: '#facc15' },
                { label: 'مدعوم', level: searchedUser.receiver_level || 0, color: '#22d3ee' },
                { label: 'مرسل', level: searchedUser.sender_level || 0, color: '#34eb45' },
              ].map(l => (
                <div key={l.label} className="space-y-1">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-white/40">{l.label}</span>
                    <span className="text-white/70 font-mono">{l.level}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(l.level, 100)}%`, background: l.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick action buttons */}
            <div className="flex gap-2">
              {[
                { label: 'حظر', key: 'blocks', icon: Ban, color: '#ff7162' },
                { label: 'VIP', key: 'vip', icon: Crown, color: '#facc15' },
                { label: 'آيدي', key: 'id_changes', icon: Hash, color: '#a855f7' },
                { label: 'السجل', key: 'audit_log', icon: ScrollText, color: '#8b5cf6' },
              ].map(a => (
                <button
                  key={a.key}
                  onClick={() => onServiceClick(a.key)}
                  className="flex-1 py-2.5 rounded-lg flex flex-col items-center gap-1 active:scale-95 transition-transform"
                  style={{ background: `${a.color}10`, border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <a.icon className="w-4 h-4" style={{ color: a.color }} />
                  <span className="text-[9px] font-bold text-white/50">{a.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* 2. Admin Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'rgba(19, 19, 19, 0.95)', border: '1px solid rgba(72,72,71,0.05)', boxShadow: '0 0 20px rgba(52,235,69,0.04)' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl overflow-hidden p-0.5" style={{ background: 'linear-gradient(135deg, #34eb45, #00d632)' }}>
                  <div className="w-full h-full rounded-[14px] bg-[#1a1919] flex items-center justify-center">
                    <Settings className="w-7 h-7 text-[#34eb45]" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-[#34eb45] rounded-full flex items-center justify-center" style={{ border: '3px solid #131313' }}>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{adminDisplayName}</h2>
                <p className="text-[11px] text-white/40 font-medium tracking-wide uppercase mt-0.5">{roleLabel}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(52,235,69,0.1)', color: '#34eb45' }}>
                    متصل الآن
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. Chat Bubbles */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-1">مجموعات المراسلة</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[
              { key: 'super', label: 'مجموعة الإدارة', icon: '🛡️', superOnly: true },
              { key: 'all', label: 'مجموعة السوبر', icon: '⚡' },
            ].filter(g => !g.superOnly || isSuperAdmin).map(group => (
              <button
                key={group.key}
                onClick={() => onChatClick(group.key)}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full active:scale-95 transition-all"
                style={{ background: 'rgba(32,31,31,0.95)', border: '1px solid rgba(72,72,71,0.1)' }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'rgba(52,235,69,0.15)' }}>
                  {group.icon}
                </span>
                <span className="text-sm font-bold text-white">{group.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Services */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-1">خدمات النظام</h3>
          <div className="grid grid-cols-2 gap-3">
            {services.map((svc, i) => (
              <motion.button
                key={svc.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                onClick={() => onServiceClick(svc.key)}
                className="relative p-4 rounded-xl flex flex-col items-center justify-center gap-3 group active:scale-[0.97] transition-all"
                style={{ background: 'rgba(19,19,19,0.95)', border: '1px solid rgba(72,72,71,0.05)' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: svc.bg }}
                >
                  <svc.icon className={`w-6 h-6 ${svc.iconColor}`} />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-[#34eb45] transition-colors">{svc.label}</span>
                {svc.badge && svc.badge > 0 && (
                  <span className="absolute top-2 right-2 min-w-5 h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {svc.badge > 99 ? '99+' : svc.badge}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'معلقة', value: stats.pending, color: '#facc15' },
            { label: 'مقبولة', value: stats.approved, color: '#34eb45' },
            { label: 'مرفوضة', value: stats.rejected, color: '#ff7162' },
          ].map(s => (
            <div key={s.label} className="text-center py-3 rounded-xl"
              style={{ background: 'rgba(32,31,31,0.95)', border: '1px solid rgba(72,72,71,0.1)' }}>
              <p className="text-xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        {recentLogs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="w-1 h-6 rounded-full" style={{ background: 'rgba(168,85,247,0.5)', boxShadow: '0 0 10px rgba(168,85,247,0.3)' }} />
              <h2 className="text-sm font-bold text-white tracking-tight">سجل العمليات</h2>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(19,19,19,0.95)', border: '1px solid rgba(72,72,71,0.1)' }}>
              <div className="divide-y" style={{ borderColor: 'rgba(72,72,71,0.1)' }}>
                {recentLogs.slice(0, 5).map((log: any, i: number) => (
                  <motion.div
                    key={log.id || i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 transition-colors"
                    style={{ ':hover': { background: 'rgba(38,38,38,0.3)' } } as any}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg"
                        style={{ background: log.action?.includes('reject') || log.action?.includes('ban') || log.action?.includes('delete') ? 'rgba(255,113,98,0.1)' : 'rgba(52,235,69,0.1)' }}>
                        <div className={`w-2 h-2 rounded-full ${log.action?.includes('reject') || log.action?.includes('ban') || log.action?.includes('delete') ? 'bg-red-400' : 'bg-[#34eb45]'}`} />
                      </div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">
                        {log.action_label || log.action || 'عملية'}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/30 uppercase tracking-wide whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </motion.div>
                ))}
              </div>
              <button
                className="w-full py-3 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-[#34eb45] transition-colors"
                style={{ background: 'rgba(38,38,38,0.5)', borderTop: '1px solid rgba(72,72,71,0.1)' }}
                onClick={() => onServiceClick('audit_log')}
              >
                عرض السجل الكامل
              </button>
            </div>
          </div>
        )}

        {/* Floating Chat Bubble */}
        {chatBadge && chatBadge > 0 && (
          <div className="fixed bottom-24 left-6 z-40">
            <button
              onClick={() => onChatClick('all')}
              className="w-14 h-14 rounded-full flex items-center justify-center relative hover:scale-110 active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, #34eb45, #00d632)',
                boxShadow: '0 0 30px rgba(52,235,69,0.4)',
                color: '#0e0e0e',
              }}
            >
              <MessageSquare className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-[#34eb45] text-[10px] font-black flex items-center justify-center"
                style={{ border: '3px solid #0e0e0e' }}>
                {chatBadge > 9 ? '9+' : chatBadge}
              </span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminHomeView;
