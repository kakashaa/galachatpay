import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crown, Shield, BarChart3, Headset, ClipboardList, DollarSign,
  Hash, ShoppingBag, Settings, Briefcase, Users, ScrollText, MessageSquare
} from 'lucide-react';

interface ServiceItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  badge?: number;
  route?: string;
}

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
  const roleLabel = adminRole === 'owner' ? 'مدير النظام الأعلى'
    : adminRole === 'super_admin' ? 'مسؤول أعلى'
    : adminRole === 'admin' ? 'مسؤول'
    : 'مشرف';

  // Build services grid based on role
  const services: ServiceItem[] = [
    ...(isSuperAdmin ? [
      { key: 'vip', label: 'طلبات VIP', icon: <Crown className="w-7 h-7" />, gradient: 'from-amber-500/20 to-amber-600/5', borderColor: 'border-amber-500/20', badge: badges.vip || 0, route: '/admin/vip' },
      { key: 'protection', label: 'الحماية', icon: <Shield className="w-7 h-7" />, gradient: 'from-red-500/20 to-red-600/5', borderColor: 'border-red-500/20', badge: badges.protection || 0, route: '/admin/ban' },
      { key: 'reports', label: 'المداخيل', icon: <BarChart3 className="w-7 h-7" />, gradient: 'from-sky-500/20 to-sky-600/5', borderColor: 'border-sky-500/20', route: '/admin/income' },
    ] : []),
    { key: 'support', label: 'الدعم الفني', icon: <Headset className="w-7 h-7" />, gradient: 'from-cyan-500/20 to-cyan-600/5', borderColor: 'border-cyan-500/20', badge: badges.support || 0, route: '/admin/support' },
    ...(isSuperAdmin ? [
      { key: 'requests', label: 'الهدايا', icon: <ShoppingBag className="w-7 h-7" />, gradient: 'from-blue-500/20 to-blue-600/5', borderColor: 'border-blue-500/20', badge: badges.requests || 0, route: '/admin/gifts' },
      { key: 'salary', label: 'الرواتب', icon: <DollarSign className="w-7 h-7" />, gradient: 'from-emerald-500/20 to-emerald-600/5', borderColor: 'border-emerald-500/20', badge: badges.salary || 0, route: '/admin/salary' },
      { key: 'change_id', label: 'تغيير آيدي', icon: <Hash className="w-7 h-7" />, gradient: 'from-indigo-500/20 to-indigo-600/5', borderColor: 'border-indigo-500/20', route: '/admin/id-change' },
      { key: 'bd', label: 'فريق البيدي', icon: <Briefcase className="w-7 h-7" />, gradient: 'from-purple-500/20 to-purple-600/5', borderColor: 'border-purple-500/20', route: '/admin/bd' },
    ] : []),
    ...(isOwner ? [
      { key: 'settings', label: 'الإعدادات', icon: <Settings className="w-7 h-7" />, gradient: 'from-slate-500/20 to-slate-600/5', borderColor: 'border-slate-500/20', route: '/admin/settings' },
      { key: 'agencies', label: 'الوكالات', icon: <ClipboardList className="w-7 h-7" />, gradient: 'from-amber-500/20 to-amber-600/5', borderColor: 'border-amber-500/20', route: '/admin/agencies' },
      { key: 'moderators', label: 'الأدمن', icon: <Users className="w-7 h-7" />, gradient: 'from-emerald-500/20 to-emerald-600/5', borderColor: 'border-emerald-500/20', route: '/admin/settings' },
      { key: 'audit_log', label: 'السجل', icon: <ScrollText className="w-7 h-7" />, gradient: 'from-violet-500/20 to-violet-600/5', borderColor: 'border-violet-500/20' },
    ] : []),
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 pb-4" dir="rtl">
      {/* Admin Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-3xl p-5 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">أهلاً، {adminDisplayName}</p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>

        {/* Chat Button */}
        <button
          onClick={onChatClick}
          className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
        >
          <MessageSquare className="w-5 h-5" />
          دخول مجموعة الإدارة
        </button>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
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
      </motion.div>

      {/* Service Grid */}
      <div className="grid grid-cols-3 gap-3">
        {services.map((svc, i) => (
          <motion.button
            key={svc.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => svc.route ? navigate(svc.route) : onServiceClick(svc.key)}
            className={`relative bg-gradient-to-br ${svc.gradient} border ${svc.borderColor} rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-white/15 transition-all`}
          >
            {svc.icon}
            <span className="text-[11px] font-bold text-foreground leading-tight text-center">{svc.label}</span>
            {svc.badge && svc.badge > 0 && (
              <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1.5 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full">
                {svc.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground">آخر العمليات</p>
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
    </div>
  );
};

export default AdminHomeView;
