import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const stepData = [
  {
    imageSrc: () => import("@/assets/instructions/step1-settings.jpeg"),
    title: "افتح الإعدادات",
    description: "من تطبيق غلا لايف، اضغط على أيقونة الإعدادات الموجودة في أعلى الشاشة.",
  },
  {
    imageSrc: () => import("@/assets/instructions/step2-account.jpeg"),
    title: "إدارة الحساب",
    description: 'اختر "إدارة الحساب" من قائمة الإعدادات.',
  },
  {
    imageSrc: () => import("@/assets/instructions/step3-enable.jpeg"),
    title: "تفعيل تسجيل الدخول بالمعرّف",
    description: 'اضغط على خيار "تفعيل تسجيل الدخول بمعرف جلا" لتفعيل الميزة.',
  },
  {
    imageSrc: () => import("@/assets/instructions/step4-password.jpeg"),
    title: "أدخل الرقم السري",
    description: 'اختر رقم سري خاص فيك واضغط "تأكيد". هذا الرقم هو اللي بتستخدمه لتسجيل الدخول هنا.',
  },
];

interface LoginInstructionsProps {
  open: boolean;
  onClose: () => void;
}

const LoginInstructions: React.FC<LoginInstructionsProps> = ({ open, onClose }) => {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [images, setImages] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open) {
      setCurrent(0);
      setVisible(true);
      // Load first image immediately
      loadImage(0);
    } else {
      setVisible(false);
    }
  }, [open]);

  const loadImage = async (index: number) => {
    if (images[index]) return;
    try {
      const mod = await stepData[index].imageSrc();
      setImages(prev => ({ ...prev, [index]: mod.default }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (open) {
      loadImage(current);
      // Preload next
      if (current + 1 < stepData.length) loadImage(current + 1);
    }
  }, [current, open]);

  const next = () => setCurrent((p) => Math.min(p + 1, stepData.length - 1));
  const prev = () => setCurrent((p) => Math.max(p - 1, 0));

  if (!open && !visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm bg-card rounded-3xl overflow-hidden shadow-2xl border border-border/30 transition-all duration-300 ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
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
          {stepData.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full gold-gradient text-white text-sm font-bold flex items-center justify-center shadow-md">
              {current + 1}
            </span>
            <span className="text-sm font-bold text-foreground">{stepData[current].title}</span>
          </div>

          <div className="rounded-2xl overflow-hidden border border-border/20 bg-muted/30 mb-3 min-h-[200px] flex items-center justify-center">
            {images[current] ? (
              <img
                src={images[current]}
                alt={stepData[current].title}
                className="w-full h-auto object-contain"
              />
            ) : (
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed text-right mb-4">
            {stepData[current].description}
          </p>
        </div>

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

          {current === stepData.length - 1 ? (
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
      </div>
    </div>
  );
};

export default LoginInstructions;