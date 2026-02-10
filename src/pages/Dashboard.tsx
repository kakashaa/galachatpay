import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import UserProfileCard from "@/components/UserProfileCard";
import MenuGrid from "@/components/MenuGrid";
import galaLogo from "@/assets/gala-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

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
    <MobileLayout>
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-5 py-3 bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="flex items-center gap-3">
          <img src={galaLogo} alt="غلا لايف" className="w-9 h-9 rounded-lg" />
          <span className="text-base font-bold gold-text">غلا لايف</span>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="text-muted-foreground hover:text-destructive transition-colors p-2"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile Card */}
      <UserProfileCard
        name={user.name}
        id={user.uuid}
        receiverLevel={user.level.receiver_level}
        senderLevel={user.level.sender_level}
        chargerLevel={user.level.charger_level}
      />

      {/* Quick Actions Title */}
      <div className="px-5 mt-6">
        <h3 className="text-base font-bold text-foreground">الخدمات المتاحة</h3>
        <p className="text-xs text-muted-foreground mt-1">اختر الخدمة التي تريدها</p>
      </div>

      {/* Menu Grid */}
      <MenuGrid />
    </MobileLayout>
  );
};

export default Dashboard;
