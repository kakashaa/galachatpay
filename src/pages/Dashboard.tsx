import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import UserProfileCard from "@/components/UserProfileCard";
import MenuGrid from "@/components/MenuGrid";
import galaLogo from "@/assets/gala-logo.png";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Demo data - will be replaced with real API data
  const user = {
    name: "محمد أحمد",
    id: "123456789",
    receiverLevel: 0,
    senderLevel: 1,
    wealth: 52300,
    charisma: 1240,
    recharge: 8900,
  };

  return (
    <MobileLayout>
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-5 py-3 bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="flex items-center gap-3">
          <img src={galaLogo} alt="غلا لايف" className="w-9 h-9 rounded-lg" />
          <span className="text-base font-bold gold-text">غلا لايف</span>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-destructive transition-colors p-2"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile Card */}
      <UserProfileCard
        name={user.name}
        id={user.id}
        receiverLevel={user.receiverLevel}
        senderLevel={user.senderLevel}
        wealth={user.wealth}
        charisma={user.charisma}
        recharge={user.recharge}
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
