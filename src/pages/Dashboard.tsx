import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
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
      <header className="relative z-10 flex justify-between items-center p-5 pt-8">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => { logout(); navigate("/"); }}
          className="w-10 h-10 flex items-center justify-center rounded-full glass-card hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </motion.button>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-black gradient-text"
        >
          غلا شات
        </motion.h1>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-5">
        <VideoStoryCircle />
        <UserProfileCard />
        <LevelBars />

        {/* Services Title */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-5 pr-1"
        >
          <div className="w-1 h-5 rounded-full gold-gradient" />
          <h3 className="text-base font-black text-foreground">الخدمات</h3>
        </motion.div>

        <MenuGrid />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
