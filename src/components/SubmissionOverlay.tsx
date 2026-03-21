import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, Shield, Send, FileCheck } from "lucide-react";

interface SubmissionStep {
  label: string;
  completedLabel: string;
  icon: React.ReactNode;
}

const DEFAULT_STEPS: SubmissionStep[] = [
  { label: "جاري التحقق من الحوالة...", completedLabel: "تم التحقق من الحوالة ✓", icon: <Shield className="w-5 h-5" /> },
  { label: "جاري تسجيل الطلب...", completedLabel: "تم تسجيل الطلب ✓", icon: <FileCheck className="w-5 h-5" /> },
  { label: "جاري إرسال الطلب...", completedLabel: "تم الإرسال ✓", icon: <Send className="w-5 h-5" /> },
];

interface SubmissionOverlayProps {
  visible: boolean;
  steps?: SubmissionStep[];
  title?: string;
}

const SubmissionOverlay: React.FC<SubmissionOverlayProps> = ({
  visible,
  steps = DEFAULT_STEPS,
  title = "جاري معالجة طلبك",
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!visible) {
      setCurrentStep(0);
      return;
    }
    // Animate through steps at intervals
    const timers: NodeJS.Timeout[] = [];
    steps.forEach((_, i) => {
      if (i === 0) return; // Start at 0 already
      timers.push(setTimeout(() => setCurrentStep(i), (i) * 1800));
    });
    return () => timers.forEach(clearTimeout);
  }, [visible, steps.length]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-8 px-8 max-w-sm w-full">
            {/* Spinner */}
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-primary/20 animate-pulse" />
            </div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-bold text-foreground text-center"
            >
              {title}
            </motion.h2>

            {/* Steps */}
            <div className="w-full space-y-4">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{
                    opacity: currentStep >= i ? 1 : 0.25,
                    x: 0,
                  }}
                  transition={{ delay: i * 0.3, duration: 0.4 }}
                  className="flex items-center gap-3 rtl:flex-row-reverse"
                >
                  <div className="shrink-0">
                    {currentStep > i ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.4 }}
                      >
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      </motion.div>
                    ) : currentStep === i ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/20" />
                    )}
                  </div>
                  <span className={`text-sm transition-colors duration-300 ${
                    currentStep > i
                      ? "text-emerald-400 font-bold"
                      : currentStep === i
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/40"
                  }`}>
                    {currentStep > i ? step.completedLabel : step.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Reassurance text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-xs text-muted-foreground text-center"
            >
              لا تقفل الصفحة... العملية جارية
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SubmissionOverlay;
