import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import step1 from "@/assets/instructions/step1-settings.jpeg";
import step2 from "@/assets/instructions/step2-account.jpeg";
import step3 from "@/assets/instructions/step3-enable.jpeg";
import step4 from "@/assets/instructions/step4-password.jpeg";

const steps = [
  {
    image: step1,
    title: "افتح الإعدادات",
    description: "من تطبيق غلا لايف، اضغط على أيقونة الإعدادات الموجودة في أعلى الشاشة.",
  },
  {
    image: step2,
    title: "إدارة الحساب",
    description: "اختر \"إدارة الحساب\" من قائمة الإعدادات.",
  },
  {
    image: step3,
    title: "تفعيل تسجيل الدخول بالمعرّف",
    description: "اضغط على خيار \"تفعيل تسجيل الدخول بمعرف جلا\" لتفعيل الميزة.",
  },
  {
    image: step4,
    title: "أدخل الرقم السري",
    description: "اختر رقم سري خاص فيك واضغط \"تأكيد\". هذا الرقم هو اللي بتستخدمه لتسجيل الدخول هنا.",
  },
];

interface LoginInstructionsProps {
  open: boolean;
  onClose: () => void;
}

const LoginInstructions: React.FC<LoginInstructionsProps> = ({ open, onClose }) => {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (open) setCurrent(0);
  }, [open]);

  const next = () => setCurrent((p) => Math.min(p + 1, steps.length - 1));
  const prev = () => setCurrent((p) => Math.max(p - 1, 0));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-sm bg-card rounded-3xl overflow-hidden shadow-2xl border border-border/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h2 className="text-lg font-bold text-foreground">كيف تسجل دخولك؟</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex justify-center gap-1.5 px-5 pb-3">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="px-5"
              >
                {/* Step number */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full gold-gradient text-white text-sm font-bold flex items-center justify-center shadow-md">
                    {current + 1}
                  </span>
                  <span className="text-sm font-bold text-foreground">{steps[current].title}</span>
                </div>

                {/* Image */}
                <div className="rounded-2xl overflow-hidden border border-border/20 bg-muted/30 mb-3">
                  <img
                    src={steps[current].image}
                    alt={steps[current].title}
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed text-right mb-4">
                  {steps[current].description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between px-5 pb-5">
              <button
                onClick={prev}
                disabled={current === 0}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                السابق
              </button>

              {current === steps.length - 1 ? (
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl gold-gradient text-white text-sm font-bold shadow-md"
                >
                  فهمت!
                </button>
              ) : (
                <button
                  onClick={next}
                  className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginInstructions;
