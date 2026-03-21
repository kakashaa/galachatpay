import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playNotificationSound, playUrgentSound } from "@/lib/notificationSound";
import { RefreshCw } from "lucide-react";
import { useConfirmModal } from "@/hooks/use-confirm-modal";

import AdminNotificationListener from "@/components/AdminNotificationListener";
import { useSalaryRequestsRealtime } from "@/hooks/use-salary-requests-realtime";
import { useAnimatedPhotosRealtime } from "@/hooks/use-animated-photos-realtime";
import { useSupportTicketsRealtime } from "@/hooks/use-support-tickets-realtime";
import { useSupportChatSessionsRealtime } from "@/hooks/use-support-chat-sessions-realtime";

import AdminManualActions from "@/components/AdminManualActions";
import AdminSupportManager from "@/components/AdminSupportManager";
import AdminBottomNav from "@/components/AdminBottomNav";
import AdminHomeView from "@/components/AdminHomeView";
import { Clock, CheckCircle, XCircle } from "lucide-react";

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [bottomTab, setBottomTab] = useState<'home' | 'search' | 'chat' | 'monitor' | 'favorites'>('home');

  // Pull-to-refresh
  const PULL_THRESHOLD = 80;
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadStats();
      toast.success("تم تحديث البيانات");
    } catch {
      toast.error("فشل التحديث");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;
    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0) { setPullDistance(0); return; }
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) setPullDistance(Math.min(deltaY * 0.5, 120));
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD) handleRefresh();
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, handleRefresh]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  // Session
  const adminSessionToken = localStorage.getItem("admin_session_token");
  const adminUsername = localStorage.getItem("admin_username");
  const adminDisplayName = localStorage.getItem("admin_display_name") || adminUsername;
  const adminRole = localStorage.getItem("admin_role") as "owner" | "super_admin" | "admin" | "moderator" | null;
  const isOwner = adminRole === "owner";
  const isSuperAdmin = adminRole === "super_admin" || isOwner;

  // Validate token
  useEffect(() => {
    if (!adminSessionToken) {
      navigate("/admin", { replace: true });
      return;
    }
    try {
      JSON.parse(atob(adminSessionToken));
    } catch {
      console.warn("Invalid admin session token format, forcing re-login");
      ["admin_session_token", "admin_username", "admin_display_name", "admin_role",
       "admin_permissions", "admin_api_token", "admin_shift_start", "admin_shift_end", "admin_phone"
      ].forEach(k => localStorage.removeItem(k));
      navigate("/admin", { replace: true });
    }
  }, [adminSessionToken, navigate]);

  // Statistics
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const prevBadgesRef = useRef<{ salary: number; support: number; total: number }>({ salary: 0, support: 0, total: 0 });

  // Badge data (lightweight)
  const [badgeData, setBadgeData] = useState({
    salaryPending: 0,
    banReportsUnverified: 0,
    supportOpen: 0,
    quickSupportPending: 0,
    chatWaiting: 0,
    animatedPending: 0,
    customGiftsPending: 0,
  });

  // Audit logs for recent activity
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const [salary, reports, animated, customG, tickets, quickSupport, vipReqs, supportChatSessions] = await Promise.all([
        supabase.from("salary_requests").select("status"),
        supabase.from("ban_reports").select("is_verified"),
        supabase.from("animated_photo_requests").select("status"),
        supabase.from("custom_gifts").select("status").eq("is_deleted", false),
        supabase.from("support_tickets").select("status"),
        supabase.from("quick_support_requests").select("status"),
        supabase.from("vip_requests").select("id"),
        supabase.from("support_chat_sessions").select("status"),
      ]);

      const salaryPending = salary.data?.filter(r => r.status === "pending").length || 0;
      const banReportsUnverified = reports.data?.filter(r => !r.is_verified).length || 0;
      const supportOpen = tickets.data?.filter(r => r.status === "open").length || 0;
      const quickSupportPending = quickSupport.data?.filter((r: any) => r.status === "pending").length || 0;
      const chatWaiting = supportChatSessions.data?.filter((r: any) => r.status === "waiting").length || 0;
      const animatedPending = animated.data?.filter(r => r.status === "pending").length || 0;
      const customGiftsPending = customG.data?.filter(r => r.status === "pending").length || 0;

      setBadgeData({ salaryPending, banReportsUnverified, supportOpen, quickSupportPending, chatWaiting, animatedPending, customGiftsPending });

      const supportPendingTotal = supportOpen + quickSupportPending + chatWaiting;
      const pending = salaryPending + banReportsUnverified + animatedPending + customGiftsPending + supportOpen + quickSupportPending;
      const approved = (salary.data?.filter(r => r.status === "approved").length || 0) +
        (reports.data?.filter(r => r.is_verified).length || 0) +
        (animated.data?.filter(r => r.status === "approved").length || 0) +
        (customG.data?.filter(r => r.status === "approved").length || 0) +
        (tickets.data?.filter(r => r.status === "replied" || r.status === "closed").length || 0) +
        (quickSupport.data?.filter((r: any) => r.status === "resolved").length || 0) +
        (vipReqs.data?.length || 0);
      const rejected = (salary.data?.filter(r => r.status === "rejected").length || 0) +
        (animated.data?.filter(r => r.status === "rejected").length || 0) +
        (customG.data?.filter(r => r.status === "rejected").length || 0);

      // Notification sounds
      const prev = prevBadgesRef.current;
      if (prev.total > 0) {
        if (supportPendingTotal > prev.support) {
          playUrgentSound();
        } else if (salaryPending > prev.salary || pending > prev.total) {
          playNotificationSound();
        }
      }
      prevBadgesRef.current = { salary: salaryPending, support: supportPendingTotal, total: pending };

      setStats({ pending, approved, rejected });

      // Load recent logs for owner
      if (isOwner) {
        const { data: logs } = await supabase
          .from("admin_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentLogs(logs || []);
      }
    } catch (err) {
      console.error("فشل تحميل الإحصائيات", err);
    }
  }, [isOwner]);

  useEffect(() => {
    if (!adminSessionToken) return;
    loadStats();
  }, [adminSessionToken, loadStats]);

  // Auto-refresh stats every 30s
  useEffect(() => {
    if (!adminSessionToken) return;
    const interval = setInterval(() => loadStats(), 30000);
    return () => clearInterval(interval);
  }, [adminSessionToken, loadStats]);

  // Realtime subscriptions for badge updates
  useSalaryRequestsRealtime(() => loadStats());
  useAnimatedPhotosRealtime(() => loadStats());
  useSupportTicketsRealtime(() => loadStats());
  useSupportChatSessionsRealtime(() => loadStats());

  const { confirm, ConfirmDialog } = useConfirmModal();

  const handleLogout = async () => {
    const ok = await confirm({ title: "تسجيل الخروج", message: "هل تريد تسجيل الخروج من لوحة الإدارة؟", danger: true, confirmText: "خروج" });
    if (!ok) return;
    ["admin_session_token", "admin_username", "admin_display_name", "admin_role",
      "admin_permissions", "admin_api_token", "admin_shift_start", "admin_shift_end", "admin_phone"
    ].forEach(k => localStorage.removeItem(k));
    navigate("/admin");
  };

  if (!adminSessionToken) return null;

  return (
    <>
    <div
      ref={scrollContainerRef}
      className="mobile-container text-foreground pb-44 overflow-x-hidden overflow-y-auto relative admin-theme premium-bg"
      style={{ overflow: 'hidden auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AdminNotificationListener />

      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center transition-all duration-200 relative z-20"
          style={{ height: refreshing ? 48 : pullDistance > 0 ? pullDistance : 0 }}
        >
          <RefreshCw
            className={`w-5 h-5 text-primary transition-transform ${refreshing ? "animate-spin" : ""}`}
            style={{ transform: `rotate(${pullProgress * 360}deg)`, opacity: pullProgress }}
          />
        </div>
      )}

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'hsla(160, 84%, 39%, 0.05)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'hsla(160, 84%, 39%, 0.03)' }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto min-h-0">
        {/* Home View */}
        {bottomTab === 'home' && (
          <AdminHomeView
            adminDisplayName={adminDisplayName || ''}
            adminRole={adminRole}
            stats={stats}
            badges={{
              vip: 0,
              protection: badgeData.banReportsUnverified,
              support: badgeData.supportOpen + badgeData.quickSupportPending + badgeData.chatWaiting,
              requests: badgeData.animatedPending + badgeData.customGiftsPending,
              salary: badgeData.salaryPending,
            }}
            onServiceClick={() => {}}
            onChatClick={() => navigate("/admin/chat")}
            recentLogs={recentLogs}
            isOwner={isOwner}
            isSuperAdmin={isSuperAdmin}
            onLogout={handleLogout}
          />
        )}

        {/* Search/Manual Actions tab */}
        {bottomTab === 'search' && (
          <div className="max-w-2xl mx-auto p-4" dir="rtl">
            <AdminManualActions adminUsername={adminUsername || ''} />
          </div>
        )}

        {/* Monitor tab handled by bottom nav onChange → navigate */}

        {/* Favorites tab */}
        {bottomTab === 'favorites' && (
          <div className="max-w-2xl mx-auto p-4 space-y-3" dir="rtl">
            <p className="text-sm font-bold text-muted-foreground">الوصول السريع</p>
            {[
              { label: 'طلبات الرواتب', route: '/admin/salary', count: badgeData.salaryPending },
              { label: 'الطلبات', route: '/admin/requests', count: badgeData.animatedPending + badgeData.customGiftsPending },
              { label: 'الدعم الفني', route: '/admin/support', count: badgeData.supportOpen + badgeData.chatWaiting },
              { label: 'الحماية', route: '/admin/ban', count: badgeData.banReportsUnverified },
              { label: 'تغيير آيدي', route: '/admin/id-change', count: 0 },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className="w-full flex items-center justify-between p-4 rounded-2xl hover:border-white/10 transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span className="text-sm font-bold text-foreground">{item.label}</span>
                {item.count > 0 && (
                  <span className="min-w-6 h-6 px-2 flex items-center justify-center text-white text-xs font-bold rounded-full"
                    style={{ background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))' }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <AdminBottomNav
        active={bottomTab}
        onChange={(tab) => {
          if (tab === 'monitor') { navigate('/admin/monitor'); return; }
          setBottomTab(tab);
        }}
        chatBadge={badgeData.supportOpen + badgeData.chatWaiting}
      />
    </div>
    {ConfirmDialog}
    </>
  );
};

export default AdminDashboardPage;
