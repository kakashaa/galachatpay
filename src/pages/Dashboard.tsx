import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MarqueeBanner from "@/components/MarqueeBanner";
import { VideoStoryCircle } from "@/components/VideoStoryCircle";
import UserProfileCard from "@/components/UserProfileCard";
import MenuGrid from "@/components/MenuGrid";
import BottomNav from "@/components/BottomNav";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

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
