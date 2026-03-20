// Dashboard v2 - cache rebuild
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Bell, LogIn, RefreshCw, ShieldBan } from "lucide-react";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/lib/notificationSound";
import { useAuth } from "@/contexts/AuthContext";
import MarqueeBanner from "@/components/MarqueeBanner";
import { VideoStoryCircle } from "@/components/VideoStoryCircle";
import { AdminStoryCircle } from "@/components/AdminStoryCircle";
import BannerCarousel from "@/components/BannerCarousel";
import UserProfileCard from "@/components/UserProfileCard";
import GuestProfileCard from "@/components/GuestProfileCard";
import MenuGrid from "@/components/MenuGrid";
import BDInvitationBanner from "@/components/BDInvitationBanner";
import WorksInvitationBanner from "@/components/WorksInvitationBanner";
import BottomNav from "@/components/BottomNav";


import { toast } from "sonner";

const PULL_THRESHOLD = 80;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirmModal();
  const { user, logout, isAuthenticated, refreshUser } = useAuth();
  
  const [notifCount, setNotifCount] = useState(0);
  const prevNotifCountRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchNotifCount = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false)
        .or(`target.eq.all,user_uuid.eq.${user.uuid}`);
      const newCount = count ?? 0;
      // Play sound if count increased
      if (newCount > prevNotifCountRef.current && prevNotifCountRef.current > 0) {
        playNotificationSound();
      }
      prevNotifCountRef.current = newCount;
      setNotifCount(newCount);
    } catch {
      // silent
    }
  }, [user?.uuid]);

  useEffect(() => {
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 15_000);
    if (isAuthenticated) {
      refreshUser();
    }
    return () => clearInterval(interval);
  }, [fetchNotifCount, isAuthenticated, refreshUser]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || !isAuthenticated) return;
    setRefreshing(true);
    try {
      await refreshUser();
      await fetchNotifCount();
      toast.success("تم تحديث البيانات");
    } catch {
      toast.error("فشل التحديث");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, isAuthenticated, refreshUser, fetchNotifCount]);

  // Touch handlers for pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    const target = e.target as HTMLElement | null;

    if (!container || container.scrollTop > 0) return;
    if (e.touches.length !== 1) return;
    if (target?.closest("button, a, input, textarea, [role='button']")) return;

    startYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;

    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0) {
      setPullDistance(0);
      return;
    }

    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      setPullDistance(Math.min(deltaY * 0.5, 120));
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD) {
      handleRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, handleRefresh]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

    return (
    <>
      
      <div
        ref={scrollContainerRef}
        className="mobile-container text-foreground pb-44 overflow-x-hidden overflow-y-auto relative" style={{ overflow: 'hidden auto' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center transition-all duration-200"
            style={{ height: refreshing ? 48 : pullDistance > 0 ? pullDistance : 0 }}
          >
            <RefreshCw
              className={`w-5 h-5 text-primary transition-transform ${refreshing ? "animate-spin" : ""}`}
              style={{ transform: `rotate(${pullProgress * 360}deg)`, opacity: pullProgress }}
            />
          </div>
        )}

        {/* Lightweight background */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/5 rounded-full" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex justify-between items-center px-4 pt-6 pb-2">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={async () => { const ok = await confirm({ title: "تسجيل الخروج", message: "هل تريد تسجيل الخروج؟", danger: true, confirmText: "خروج" }); if (ok) { logout(); navigate("/"); } }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/15 border border-primary/30 active:bg-primary/25 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-primary" />
            </button>
          )}

          <h1 className="text-base font-black gradient-text">غلا شات</h1>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[9px] font-black text-destructive-foreground flex items-center justify-center">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </button>
          ) : (
            <div className="w-8" />
          )}
        </header>

        {/* Main */}
        <main className="relative z-10 px-3">
          <WorksInvitationBanner />
          <BDInvitationBanner />
          <MarqueeBanner />
          <BannerCarousel />
          <AdminStoryCircle />
          <VideoStoryCircle />
          <div className="mt-3" />
          
          {isAuthenticated ? <UserProfileCard /> : <GuestProfileCard />}

          {/* Services Title */}
          <div className="flex items-center gap-2 mb-3 pr-1">
            <div className="w-1 h-3.5 rounded-full gold-gradient" />
            <h3 className="text-xs font-black text-foreground">الخدمات</h3>
          </div>

          

          <MenuGrid
            extraButton={
              <button
                onClick={() => navigate("/report")}
                className="flex flex-col items-center gap-1 active:scale-90 active:-translate-y-1 transition-transform duration-150"
              >
                <div
                  className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <ShieldBan className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-[9px] font-bold text-muted-foreground leading-tight text-center">
                  حظر
                </span>
              </button>
            }
          />
        </main>
      </div>
      <BottomNav />
      {ConfirmDialog}
    </>
  );
};

export default Dashboard;
