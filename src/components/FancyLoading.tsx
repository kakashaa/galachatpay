import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface FancyLoadingProps {
  title?: string;
  subtitle?: string;
  tips?: string[];
}

const LOADING_TIPS = [
  "جاري جلب البيانات من السيرفر...",
  "نحضّر لك أحدث المعلومات...",
  "ثواني وتظهر لك البيانات...",
  "جاري تحديث الأرقام...",
];

const FancyLoading: React.FC<FancyLoadingProps> = ({
  title = "جاري التحميل",
  subtitle,
  tips = LOADING_TIPS,
}) => {
  const [tipIndex, setTipIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 gap-6" dir="rtl">
      {/* Animated logo/spinner */}
      <div className="relative w-20 h-20">
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{
            border: "2.5px solid transparent",
            borderTopColor: "hsl(var(--primary))",
            borderRightColor: "hsl(var(--primary)/0.3)",
          }}
        />
        {/* Inner ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full"
          style={{
            border: "2px solid transparent",
            borderBottomColor: "hsl(152 69% 40%)",
            borderLeftColor: "hsl(152 69% 40% / 0.3)",
          }}
        />
        {/* Center dot */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-3 h-3 rounded-full bg-primary" />
        </motion.div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1.5">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Animated tip text */}
      <div className="h-5 overflow-hidden relative w-full max-w-[260px]">
        <motion.p
          key={tipIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-xs text-muted-foreground text-center absolute inset-0"
        >
          {tips[tipIndex]}
        </motion.p>
      </div>

      {/* Skeleton preview cards */}
      <div className="w-full max-w-sm space-y-3 mt-2">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: "hsl(var(--muted)/0.06)",
              border: "1px solid hsl(var(--border)/0.08)",
            }}
          >
            {/* Avatar skeleton */}
            <motion.div
              animate={{ opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="w-10 h-10 rounded-full bg-muted-foreground/10 shrink-0"
            />
            {/* Text skeletons */}
            <div className="flex-1 space-y-2">
              <motion.div
                animate={{ opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="h-3 rounded-full bg-muted-foreground/10"
                style={{ width: `${70 - i * 15}%` }}
              />
              <motion.div
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 + 0.3 }}
                className="h-2.5 rounded-full bg-muted-foreground/8"
                style={{ width: `${50 - i * 10}%` }}
              />
            </div>
            {/* Number skeleton */}
            <motion.div
              animate={{ opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 + 0.1 }}
              className="w-12 h-4 rounded-lg bg-muted-foreground/10 shrink-0"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FancyLoading;
