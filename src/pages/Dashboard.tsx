import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserProfileCard from "@/components/UserProfileCard";
import LevelBars from "@/components/LevelBars";
import MenuGrid from "@/components/MenuGrid";
import BottomNav from "@/components/BottomNav";
import { VideoStoryCircle } from "@/components/VideoStoryCircle";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  return (
    <div className="mobile-container text-foreground min-h-screen pb-28 overflow-x-hidden relative">
      {/* Aurora Background */}
      <div className="aurora-bg" />
      <div className="particles-layer" />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 pt-8">
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="w-10 h-10 flex items-center justify-center rounded-full glass-card"
        >
          <LogOut className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex gap-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full glass-card">
            <Share2 className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6">
        <VideoStoryCircle />
        <UserProfileCard />
        <LevelBars />

        {/* Services Title */}
        <h3 className="text-base font-bold mb-5 pr-2 flex items-center gap-2 text-foreground">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          الخدمات المميزة
        </h3>

        <MenuGrid />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
