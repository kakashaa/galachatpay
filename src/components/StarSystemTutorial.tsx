import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const stepsFrames = [
  {
    title: "نظام النجوم",
    description: "كل شهر تحصل على نجوم حسب لفل الشحن بتاعك.",
  },
  {
    title: "حساب النجوم الشهرية",
    description: "لفل 30-39: نجمة واحدة 🌟\nلفل 40-49: نجمتين ⭐⭐\nلفل 50-59: 3 نجوم ⭐⭐⭐\nلفل 60-69: 4 نجوم ⭐⭐⭐⭐\nلفل 70-79: 5 نجوم ⭐⭐⭐⭐⭐",
  },
  {
    title: "مكافأة الارتفاع",
    description: "إذا لفلك ارتفع 5+ عن الشهر الماضي، تنزد نجمة بونص واحدة. كل 5 لفلات = نجمة إضافية.",
  },
  {
    title: "النجوم المتبقية",
    description: "النجوم اللي ما استخدمتها بالشهر الماضي تترحل معك للشهر الجديد.",
  },
  {
    title: "استخدام النجوم",
    description: "كل إطار أو دخولية عندها عدد نجوم محدد. بتلبسها أو تهديها لصديق، تنخصم النجوم من رصيدك.",
  },
  {
    title: "مثال عملي",
    description: "لفلك 50 = 3 نجوم شهرياً\nإطار ب نجمة = بتدفع 1 نجمة\nدخولية ب نجمتين = بتدفع 2 نجمة\nشهر جاي لفلك وصل 60 = 4 نجوم + 1 بونص (من +10 لفلات) = 5 نجوم كلي",
  },
];

const stepsEntry = [
  {
    title: "نظام النجوم",
    description: "كل شهر تحصل على نجوم حسب لفل الشحن بتاعك.",
  },
  {
    title: "حساب النجوم الشهرية",
    description: "لفل 30-39: نجمة واحدة 🌟\nلفل 40-49: نجمتين ⭐⭐\nلفل 50-59: 3 نجوم ⭐⭐⭐\nلفل 60-69: 4 نجوم ⭐⭐⭐⭐\nلفل 70-79: 5 نجوم ⭐⭐⭐⭐⭐",
  },
  {
    title: "مكافأة الارتفاع",
    description: "إذا لفلك ارتفع 5+ عن الشهر الماضي، تنزد نجمة بونص واحدة. كل 5 لفلات = نجمة إضافية.",
  },
  {
    title: "النجوم المتبقية",
    description: "النجوم اللي ما استخدمتها بالشهر الماضي تترحل معك للشهر الجديد.",
  },
  {
    title: "استخدام النجوم",
    description: "كل دخولية عندها عدد نجوم محدد. بتلبسها أو تهديها لصديق، تنخصم النجوم من رصيدك.",
  },
  {
    title: "مثال عملي",
    description: "لفلك 50 = 3 نجوم شهرياً\nدخولية ب نجمة = بتدفع 1 نجمة\nدخولية ب نجمتين = بتدفع 2 نجمة\nشهر جاي لفلك وصل 60 = 4 نجوم + 1 بونص (من +10 لفلات) = 5 نجوم كلي",
  },
];

interface StarSystemTutorialProps {
  open: boolean;
  onClose: () => void;
  itemType?: "frames" | "entry";
}

const StarSystemTutorial: React.FC<StarSystemTutorialProps> = ({ open, onClose, itemType = "frames" }) => {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const steps = itemType === "frames" ? stepsFrames : stepsEntry;

  useEffect(() => {
    if (open) {
      setCurrent(0);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [open]);

  const next = () => setCurrent((p) => Math.min(p + 1, steps.length - 1));
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
          <h2 className="text-lg font-bold text-foreground">نظام النجوم</h2>
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
        <div className="px-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full gold-gradient text-white text-sm font-bold flex items-center justify-center shadow-md">
              {current + 1}
            </span>
            <span className="text-sm font-bold text-foreground">{steps[current].title}</span>
          </div>

          <div className="bg-muted/30 rounded-2xl border border-border/20 p-4 mb-4 min-h-[120px] flex items-center">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line text-right">
              {steps[current].description}
            </p>
          </div>
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
      </div>
    </div>
  );
};

export default StarSystemTutorial;
