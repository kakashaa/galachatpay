import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MarqueeBanner from "@/components/MarqueeBanner";
import { VideoStoryCircle } from "@/components/VideoStoryCircle";
import UserProfileCard from "@/components/UserProfileCard";
import MenuGrid from "@/components/MenuGrid";
import BottomNav from "@/components/BottomNav";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [notifCount, setNotifCount] = useState(0);

  const fetchNotifCount = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      const { count } = await supabase
        .from("salary_requests")
        .select("*", { count: "exact", head: true })
        .eq("user_uuid", user.uuid)
        .in("status", ["approved", "rejected"]);
      setNotifCount(count ?? 0);
    } catch {
      // silent
    }
  }, [user?.uuid]);

  useEffect(() => {
    if (!isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    fetchNotifCount();
  }, [fetchNotifCount]);

  if (!user) return null;

  return (
    <div className="mobile-container text-foreground min-h-screen pb-24 overflow-x-hidden relative">
      {/* Calm background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-accent/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-4 pt-6 pb-2">
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        <h1 className="text-base font-black gradient-text">غلا شات</h1>

        <button
          onClick={() => { setNotifCount(0); navigate("/my-requests"); }}
          className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
        >
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center animate-scale-in">
              {notifCount > 99 ? "99+" : notifCount}
            </span>
          )}
        </button>
      </header>

      {/* Main */}
      <main className="relative z-10 px-3">
        <MarqueeBanner />
        <VideoStoryCircle />
        <div className="mt-3" />
        <UserProfileCard />

        {/* Services Title */}
        <div className="flex items-center gap-2 mb-3 pr-1">
          <div className="w-1 h-3.5 rounded-full gold-gradient" />
          <h3 className="text-xs font-black text-foreground">الخدمات</h3>
        </div>

        <MenuGrid />
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
