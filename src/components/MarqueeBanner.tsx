import React from "react";
import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";

interface MarqueeBannerProps {
  text?: string;
}

const MarqueeBanner: React.FC<MarqueeBannerProps> = ({
  text = "🎉 مرحباً بكم في غلا شات — أسرع منصة لإدارة حسابك بسهولة وأمان! 🌟",
}) => {
  return (
    <div
      className="rounded-xl overflow-hidden mb-4 flex items-center gap-2 px-3 py-2"
      style={{
        background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Megaphone className="w-4 h-4 text-primary flex-shrink-0" />
      <div className="overflow-hidden flex-1">
        <motion.div
          animate={{ x: ["100%", "-100%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          className="whitespace-nowrap text-xs font-bold text-muted-foreground"
          dir="rtl"
        >
          {text}
        </motion.div>
      </div>
    </div>
  );
};

export default MarqueeBanner;
