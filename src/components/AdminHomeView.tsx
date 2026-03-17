import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Crown, Ban, Hash, DollarSign, Sparkles,
  Camera, BadgeCheck, Image, Headset, Briefcase,
  Copy, MessageSquare, Loader2, Star, Frame,
  Gift, Video, Bell, Settings, Users, ScrollText,
  Zap, ShieldBan, ImageIcon, Trash2,
  Fingerprint, ChevronLeft, Shield,
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
  adminDisplayName, adminRole, badges,
  onServiceClick, onChatClick, isOwner, isSuperAdmin, chatBadge,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserInfo | null>(null);
  const [searchError, setSearchError] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [shiftTime, setShiftTime] = useState('00:00:00');

  const roleLabel = adminRole === 'owner' ? 'مدير النظام الأعلى'
    : adminRole === 'super_admin' ? 'مدير العمليات الفني'
    : adminRole === 'admin' ? 'مسؤول'
    : 'مشرف';

  // Shift timer countdown to 4 PM
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const shiftEnd = new Date();
      shiftEnd.setHours(16, 0, 0, 0);
      if (now > shiftEnd) shiftEnd.setDate(shiftEnd.getDate() + 1);
      const diff = shiftEnd.getTime() - now.getTime();
      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setShiftTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const copyUuid = (uuid: string) => navigator.clipboard.writeText(uuid);

  // Services matching mockup exactly - unique icons, no duplicates
  const services: ServiceItem[] = [
    ...(isSuperAdmin ? [
      { key: 'vip', label: 'VIP', icon: Crown, bg: 'rgba(245,158,11,0.1)', iconColor: 'text-amber-500', badge: badges.vip || 0 },
      { key: 'id_changes', label: 'iD مميز', icon: Hash, bg: 'rgba(52,235,69,0.1)', iconColor: 'text-[#34eb45]' },
    ] : []),
    { key: 'admin_support', label: 'الدعم', icon: Headset, bg: 'rgba(0,219,236,0.1)', iconColor: 'text-cyan-400', badge: badges.support || 0 },
    ...(isSuperAdmin ? [
      { key: 'entries', label: 'دخول الغرف', icon: Sparkles, bg: 'rgba(99,102,241,0.1)', iconColor: 'text-indigo-500' },
      { key: 'animated_photos', label: 'الصور الشخصية', icon: Camera, bg: 'rgba(236,72,153,0.1)', iconColor: 'text-pink-500' },
    ] : []),
    { key: 'blocks', label: 'الحظر', icon: Ban, bg: 'rgba(255,113,98,0.1)', iconColor: 'text-[#ff7162]' },
    ...(isSuperAdmin ? [
      { key: 'salary', label: 'الرواتب', icon: DollarSign, bg: 'rgba(16,185,129,0.1)', iconColor: 'text-emerald-500', badge: badges.salary || 0 },
      { key: 'bd_management', label: 'إدارة البيدي', icon: Briefcase, bg: 'rgba(59,130,246,0.1)', iconColor: 'text-blue-500' },
      { key: 'custom_gifts', label: 'صور متحركة', icon: Image, bg: 'rgba(249,115,22,0.1)', iconColor: 'text-orange-500', badge: badges.requests || 0 },
      { key: 'hairs', label: 'شعارات', icon: BadgeCheck, bg: 'rgba(168,85,247,0.1)', iconColor: 'text-purple-500' },
    ] : []),
    ...(isOwner ? [
      { key: 'frames', label: 'الإطارات', icon: Frame, bg: 'rgba(99,102,241,0.1)', iconColor: 'text-indigo-400' },
      { key: 'reports', label: 'البلاغات', icon: ShieldBan, bg: 'rgba(239,68,68,0.1)', iconColor: 'text-red-500', badge: badges.protection || 0 },
      { key: 'manual_actions', label: 'صلاحيات', icon: Zap, bg: 'rgba(168,85,247,0.1)', iconColor: 'text-violet-500' },
      { key: 'videos', label: 'فيديوهات', icon: Video, bg: 'rgba(236,72,153,0.1)', iconColor: 'text-pink-400' },
      { key: 'notifications', label: 'إشعارات', icon: Bell, bg: 'rgba(59,130,246,0.1)', iconColor: 'text-blue-400' },
      { key: 'agencies', label: 'وكالات', icon: Shield, bg: 'rgba(245,158,11,0.1)', iconColor: 'text-amber-500' },
      { key: 'banners', label: 'بنرات', icon: ImageIcon, bg: 'rgba(6,182,212,0.1)', iconColor: 'text-teal-400' },
      { key: 'admin_stars', label: 'منح نجوم', icon: Star, bg: 'rgba(234,179,8,0.1)', iconColor: 'text-yellow-500' },
      { key: 'moderators', label: 'الأدمن', icon: Users, bg: 'rgba(52,235,69,0.1)', iconColor: 'text-[#34eb45]' },
      { key: 'top_agents', label: 'TOP وكلاء', icon: Gift, bg: 'rgba(245,158,11,0.1)', iconColor: 'text-amber-400' },
      { key: 'element_settings', label: 'الإعدادات', icon: Settings, bg: 'rgba(100,116,139,0.1)', iconColor: 'text-slate-400' },
      { key: 'audit_log', label: 'السجل', icon: ScrollText, bg: 'rgba(168,85,247,0.1)', iconColor: 'text-violet-400' },
      { key: 'trash', label: 'المحذوفات', icon: Trash2, bg: 'rgba(100,116,139,0.1)', iconColor: 'text-gray-500' },
    ] : []),
  ];

  return (
    <div className="pb-36" dir="rtl" style={{ background: '#0e0e0e', minHeight: '100vh' }}>
      {/* Top App Bar */}
      <header className="flex justify-between items-center px-6 py-4 w-full sticky top-0 z-50" style={{ background: '#0e0e0e' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ border: '2px solid rgba(52,235,69,0.2)', background: '#201f1f' }}>
            <Settings className="w-5 h-5 text-[#34eb45]" />
          </div>
          <h1 className="font-black tracking-[-0.04em] uppercase text-xl text-[#34eb45]" style={{ fontFamily: "'Inter', sans-serif" }}>
            KINETIC_DASHBOARD
          </h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#262626] transition-transform hover:scale-105 text-[#34eb45]">
          <Search className="w-5 h-5" />
        </button>
      </header>

      <main className="px-6 space-y-8 max-w-4xl mx-auto mt-2">
        {/* Search Bar with fingerprint icon */}
        <section className="w-full">
          <div className="relative group">
            <input
              type="text"
              inputMode="numeric"
              placeholder="البحث السريع عن المعرف (ID)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full h-14 rounded-xl px-12 text-sm font-medium transition-all text-white placeholder:text-white/30 focus:outline-none"
              style={{ background: '#000', border: '1px solid rgba(72,72,71,0.15)' }}
              dir="ltr"
            />
            <Fingerprint className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[#34eb45] transition-colors" />
            {searchLoading ? (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#34eb45] animate-spin" />
            ) : (
              <button onClick={handleSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#34eb45] transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>
        </section>

        {/* Search Error */}
        {searchError && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 text-xs text-red-400 text-center"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            {searchError}
          </motion.div>
        )}

        {/* Search Result - User Card (matching mockup: avatar + name + VIP badge + ID + 2x2 stats) */}
        {searchedUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: '#131313', border: '1px solid rgba(72,72,71,0.05)', boxShadow: '0 0 20px rgba(52,235,69,0.06)' }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-shrink-0">
                <img
                  src={userAvatar || avatarMale}
                  alt={searchedUser.name}
                  className="w-16 h-16 rounded-full object-cover"
                  style={{ border: '2px solid #34eb45' }}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = avatarMale; }}
                />
                {searchedUser.is_online && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#34eb45]" style={{ border: '3px solid #131313' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white">{searchedUser.name}</h2>
                  {searchedUser.vip_level && searchedUser.vip_level > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase"
                      style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.25)', color: '#FFD700' }}>
                      VIP {searchedUser.vip_level > 3 ? 'GOLD' : searchedUser.vip_level > 1 ? 'SILVER' : 'BRONZE'}
                    </span>
                  )}
                </div>
                <button onClick={() => copyUuid(searchedUser.uuid)} className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors mt-0.5">
                  <span className="text-xs font-mono">#{searchedUser.uuid}</span>
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            {/* Stats grid 2x2 */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {[
                { label: 'الراتب', value: `$${(searchedUser.salary || 0).toLocaleString()}`, icon: DollarSign, color: '#34eb45' },
                { label: 'الاختبارات', value: (searchedUser.coins || 0).toLocaleString(), icon: Star, color: '#22d3ee' },
                { label: 'مستوى الداعم', value: searchedUser.charger_level || 0, icon: Zap, color: '#ff7162' },
                { label: 'مستوى الدعم', value: searchedUser.receiver_level || 0, icon: Sparkles, color: '#34eb45' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3.5"
                  style={{ background: '#000', border: '1px solid rgba(72,72,71,0.1)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                    <span className="text-[10px] text-white/40 font-bold">{s.label}</span>
                  </div>
                  <p className="text-lg font-black font-mono" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
            {/* Quick actions */}
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

        {/* Admin Profile Card - with shift timer */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: '#131313', border: '1px solid rgba(72,72,71,0.05)', boxShadow: '0 0 20px rgba(52,235,69,0.1)' }}
        >
          <div className="flex items-start justify-between relative z-10">
            <div className="flex gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden p-0.5" style={{ background: 'linear-gradient(135deg, #34eb45, #00d632)' }}>
                  <div className="w-full h-full rounded-[14px] bg-[#131313] flex items-center justify-center overflow-hidden">
                    <Settings className="w-8 h-8 text-[#34eb45]" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#34eb45', border: '4px solid #131313' }}>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{adminDisplayName}</h2>
                <p className="text-xs text-white/40 font-medium tracking-widest uppercase mt-1">{roleLabel}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(52,235,69,0.1)', color: '#34eb45' }}>
                    ● متصل الآن
                  </span>
                </div>
              </div>
            </div>
            {/* Shift Timer */}
            <div className="text-left">
              <div className="p-3 rounded-xl inline-block" style={{ background: 'rgba(38,38,38,0.5)' }}>
                <p className="text-[9px] text-white/40 font-bold uppercase tracking-tight mb-1">الوقت المتبقي للمناوبة</p>
                <p className="text-2xl font-black text-[#34eb45] tabular-nums tracking-tighter" style={{ fontFamily: "'Inter', monospace" }}>{shiftTime}</p>
              </div>
            </div>
          </div>
          {/* Shift schedule row */}
          <div className="mt-6 flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(72,72,71,0.1)' }}>
            <div className="flex gap-6">
              <div>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">بدء الدوام</p>
                <p className="text-sm font-semibold text-white">08:00 AM</p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">نهاية الدوام</p>
                <p className="text-sm font-semibold text-white">04:00 PM</p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg text-xs font-bold text-white/40 hover:text-white/70 transition-colors" style={{ background: '#262626' }}>
              تعديل الملف
            </button>
          </div>
        </motion.section>

        {/* Message Groups */}
        <section className="space-y-4">
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">مجموعات المراسلة</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[
              { key: 'super', label: 'مجموعة الإدارة', icon: Shield, iconBg: 'rgba(52,235,69,0.2)', iconColor: 'text-[#34eb45]' },
              { key: 'all', label: 'مجموعة السوبر', icon: Crown, iconBg: 'rgba(255,113,98,0.2)', iconColor: 'text-[#ff7162]' },
            ].filter(() => isSuperAdmin).map(group => (
              <button
                key={group.key}
                onClick={() => onChatClick(group.key)}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full active:scale-95 transition-all"
                style={{ background: '#201f1f', border: '1px solid rgba(72,72,71,0.1)' }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: group.iconBg }}>
                  <group.icon className={`w-4 h-4 ${group.iconColor}`} />
                </span>
                <span className="text-sm font-bold text-white">{group.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Services Grid - 2 columns */}
        <section className="space-y-4">
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">خدمات النظام</h3>
          <div className="grid grid-cols-2 gap-3">
            {services.map((svc, i) => (
              <motion.div
                key={svc.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                onClick={() => onServiceClick(svc.key)}
                className="relative p-4 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer group active:scale-[0.97] transition-all hover:scale-[1.05] hover:bg-[#201f1f]"
                style={{ background: '#131313', border: '1px solid rgba(72,72,71,0.05)' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: svc.bg }}
                >
                  <svc.icon className={`w-6 h-6 ${svc.iconColor}`} />
                </div>
                <span className="text-xs font-bold text-white transition-colors">{svc.label}</span>
                {svc.badge && svc.badge > 0 && (
                  <span className="absolute top-2 right-2 min-w-5 h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {svc.badge > 99 ? '99+' : svc.badge}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Floating Chat Bubble */}
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
          {chatBadge && chatBadge > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-[#34eb45] text-[10px] font-black flex items-center justify-center"
              style={{ border: '4px solid #0e0e0e' }}>
              {chatBadge > 9 ? '9+' : chatBadge}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminHomeView;
