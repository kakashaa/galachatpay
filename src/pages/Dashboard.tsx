import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
    <div className="mobile-container text-foreground min-h-screen pb-28 overflow-x-hidden relative">
      {/* Calm background matching login */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-accent/15 rounded-full blur-[120px]" />
        <div className="absolute w-1 h-1 bg-white/20 rounded-full top-1/4 left-1/4 animate-pulse" />
        <div className="absolute w-1.5 h-1.5 bg-white/20 rounded-full top-1/2 right-1/3 animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-5 pt-8 pb-3">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => { logout(); navigate("/"); }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </motion.button>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-black gradient-text"
        >
          غلا شات
        </motion.h1>
      </header>

      {/* Main */}
      <main className="relative z-10 px-4">
        <MarqueeBanner />
        <VideoStoryCircle />
        <div className="mt-4" />
        <UserProfileCard />

        {/* Services Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-4 pr-1"
        >
          <div className="w-1 h-4 rounded-full gold-gradient" />
          <h3 className="text-sm font-black text-foreground">الخدمات</h3>
        </motion.div>

        <MenuGrid />
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
