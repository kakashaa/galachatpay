import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, Shield, Send, FileCheck, Lock } from "lucide-react";

interface SubmissionStep {
  label: string;
  completedLabel: string;
  icon: React.ReactNode;
}

const DEFAULT_STEPS: SubmissionStep[] = [
  { label: "جاري التحقق من الحوالة...", completedLabel: "تم التحقق من الحوالة", icon: <Shield className="w-5 h-5" /> },
  { label: "جاري تسجيل الطلب...", completedLabel: "تم تسجيل الطلب", icon: <FileCheck className="w-5 h-5" /> },
  { label: "جاري إرسال الطلب...", completedLabel: "تم الإرسال", icon: <Send className="w-5 h-5" /> },
];

interface SubmissionOverlayProps {
  visible: boolean;
  steps?: SubmissionStep[];
  title?: string;
  activeStep?: number;
}

const SubmissionOverlay: React.FC<SubmissionOverlayProps> = ({
  visible,
  steps = DEFAULT_STEPS,
  title = "جاري معالجة طلبك",
  activeStep,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!visible) {
      setCurrentStep(0);
      return;
    }

    if (typeof activeStep === "number") {
      const boundedStep = Math.max(0, Math.min(activeStep, steps.length - 1));
      setCurrentStep(boundedStep);
      return;
    }

    const timers: NodeJS.Timeout[] = [];
    steps.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setCurrentStep(i), i * 1800));
    });
    return () => timers.forEach(clearTimeout);
  }, [visible, steps.length, activeStep]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)/0.98) 100%)" }}
        >
          {/* Subtle animated background circles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-primary"
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.02, 0.04, 0.02] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full bg-emerald-500"
            />
          </div>

          <div className="flex flex-col items-center gap-8 px-8 max-w-sm w-full relative z-10">
            {/* Spinner with progress ring */}
            <div className="relative w-24 h-24">
              {/* Background ring */}
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="42" fill="none" strokeWidth="3"
                  className="stroke-muted/20" />
                <motion.circle
                  cx="48" cy="48" r="42" fill="none" strokeWidth="3"
                  className="stroke-primary"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: progress / 100 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ strokeDasharray: "264", strokeDashoffset: "0" }}
                />
              </svg>
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Lock className="w-8 h-8 text-primary" />
                </motion.div>
              </div>
              {/* Step counter */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tabular-nums"
                style={{ background: "hsl(var(--primary)/0.15)", color: "hsl(var(--primary))" }}>
                {currentStep + 1}/{steps.length}
              </div>
            </div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-black text-foreground text-center"
            >
              {title}
            </motion.h2>

            {/* Steps Card */}
            <div className="w-full rounded-2xl p-5 space-y-1"
              style={{
                background: "hsl(var(--card)/0.6)",
                border: "1px solid hsl(var(--border)/0.15)",
                backdropFilter: "blur(12px)",
              }}>
              {steps.map((step, i) => {
                const isCompleted = currentStep > i;
                const isActive = currentStep === i;
                const isPending = currentStep < i;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{
                      opacity: isPending ? 0.3 : 1,
                      x: 0,
                    }}
                    transition={{ delay: i * 0.15, duration: 0.4 }}
                    className="flex items-center gap-3 py-3 rtl:flex-row-reverse"
                    style={{
                      borderBottom: i < steps.length - 1 ? "1px solid hsl(var(--border)/0.08)" : "none",
                    }}
                  >
                    {/* Status indicator */}
                    <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background: isCompleted
                          ? "hsl(152 69% 40% / 0.15)"
                          : isActive
                            ? "hsl(var(--primary)/0.15)"
                            : "hsl(var(--muted)/0.1)",
                      }}>
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", duration: 0.5 }}
                        >
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </motion.div>
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-bold block ${
                        isCompleted
                          ? "text-emerald-400"
                          : isActive
                            ? "text-foreground"
                            : "text-muted-foreground/40"
                      }`}>
                        {isCompleted ? step.completedLabel : step.label}
                      </span>
                    </div>

                    {/* Check mark for completed */}
                    {isCompleted && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-emerald-400 text-xs font-bold shrink-0"
                      >
                        ✓
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="w-full space-y-2">
              <div className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: "hsl(var(--muted)/0.15)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(152 69% 40%))" }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Reassurance */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ background: "hsl(var(--muted)/0.08)", border: "1px solid hsl(var(--border)/0.08)" }}
            >
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-[11px] text-muted-foreground text-center">
                لا تقفل الصفحة — العملية مؤمنة وجارية
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SubmissionOverlay;
