import React from "react";
import { Megaphone } from "lucide-react";

interface MarqueeBannerProps {
  text?: string;
}

const MarqueeBanner: React.FC<MarqueeBannerProps> = ({
  text = "🎉 مرحباً بكم في غلا شات — أسرع منصة لإدارة حسابك بسهولة وأمان! 🌟",
}) => {
  return (
    <div
      className="rounded-lg overflow-hidden mb-3 flex items-center gap-2 px-2.5 py-1.5"
      style={{
        background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Megaphone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <div className="overflow-hidden flex-1">
        <div
          className="whitespace-nowrap text-[10px] font-bold text-muted-foreground animate-marquee"
          dir="rtl"
        >
          {text}
        </div>
      </div>
    </div>
  );
};

export default MarqueeBanner;
