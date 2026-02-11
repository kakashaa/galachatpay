import React from "react";
import { HelpCircle } from "lucide-react";

interface Props {
  className?: string;
  size?: number;
}

/**
 * أيقونة مساعدة/شروط/تنبيه متحركة باللون الأحمر
 * تنبض وتقفز لجذب انتباه المستخدمين لقراءة الشروط
 */
const PulsingHelpIcon: React.FC<Props> = ({ className = "", size = 16 }) => (
  <span
    className={`relative inline-flex items-center justify-center ${className}`}
  >
    {/* Glow ring */}
    <span className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" style={{ animationDuration: "2s" }} />
    {/* Icon */}
    <HelpCircle
      className="relative z-10 text-destructive animate-bounce-slow drop-shadow-[0_0_6px_hsl(var(--destructive)/0.6)]"
      size={size}
    />
  </span>
);

export default PulsingHelpIcon;
