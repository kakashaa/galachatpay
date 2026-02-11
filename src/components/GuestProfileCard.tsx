import React, { useState } from "react";
import { LogIn, Eye } from "lucide-react";
import GuestLoginPrompt from "./GuestLoginPrompt";

const GuestProfileCard: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <div className="mb-3">
        <div
          className="rounded-2xl p-4 relative overflow-hidden text-center"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center gap-2 justify-center mb-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground">وضع الزائر</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            يمكنك تصفح الدخوليات والإطارات والهدايا المخصصة
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gold-gradient text-primary-foreground text-xs font-bold"
          >
            <LogIn className="w-3.5 h-3.5" />
            سجّل دخولك للاستفادة الكاملة
          </button>
        </div>
      </div>
      <GuestLoginPrompt open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default GuestProfileCard;
