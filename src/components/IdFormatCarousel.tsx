import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Crown, Lock, Sparkles, ArrowLeft } from "lucide-react";
import { LevelFormats } from "@/data/idFormats";
import { levelFormats } from "@/data/idFormats";

interface IdFormatCarouselProps {
  availableLevels: LevelFormats[];
  currentLevelIndex: number;
  maxLevel: number;
}

/** Deterministic example from a pattern */
function patternToExample(p: string): string {
  const map: Record<string, number> = {};
  let next = 1;
  return p
    .split("")
    .map((c) => {
      if (c === "X") return 0;
      if (c === "P") return 5;
      if (!map[c]) map[c] = next++;
      return map[c];
    })
    .join("");
}

const PatternRow: React.FC<{ pattern: string; index: number }> = ({ pattern, index }) => {
  const example = React.useMemo(() => patternToExample(pattern), [pattern]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex items-center justify-between bg-muted/15 rounded-lg px-2.5 py-1.5 gap-2"
      dir="ltr"
    >
      <span className="text-[11px] font-mono tracking-widest text-muted-foreground min-w-[55px]">
        {pattern}
      </span>
      <ArrowLeft className="w-3 h-3 text-muted-foreground/30 shrink-0" />
      <span className="text-[11px] font-mono text-foreground/70 min-w-[55px] text-right">
        مثال: {example}
      </span>
    </motion.div>
  );
};

const DigitSection: React.FC<{ digits: number; patterns: string[] }> = ({ digits, patterns }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2 mb-2" dir="rtl">
      <div className="h-6 w-6 rounded-md gold-gradient flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-[10px]">{digits}</span>
      </div>
      <span className="text-xs font-bold text-foreground">{digits} أرقام</span>
      <span className="text-[10px] text-muted-foreground mr-auto">({patterns.length} صيغة)</span>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {patterns.map((p, idx) => (
        <PatternRow key={p} pattern={p} index={idx} />
      ))}
    </div>
  </div>
);

const IdFormatCarousel: React.FC<IdFormatCarouselProps> = ({
  availableLevels,
  currentLevelIndex,
  maxLevel,
}) => {
  // Show ALL levels (including locked ones) so user can preview
  const allLevels = levelFormats;
  const activeCurrentIndex = allLevels.findIndex(
    (l) => maxLevel >= l.minLevel && maxLevel <= l.maxLevel
  );
  const [activeIndex, setActiveIndex] = useState(Math.max(0, activeCurrentIndex));
  const activeLevel = allLevels[activeIndex];

  if (!activeLevel) return null;

  const isCurrentLevel = maxLevel >= activeLevel.minLevel && maxLevel <= activeLevel.maxLevel;
  const isLocked = maxLevel < activeLevel.minLevel;
  const canGoLeft = activeIndex > 0;
  const canGoRight = activeIndex < allLevels.length - 1;

  return (
    <div className="space-y-3">
      {/* Level navigation pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" dir="rtl">
        {allLevels.map((level, idx) => {
          const isCurrent = maxLevel >= level.minLevel && maxLevel <= level.maxLevel;
          const isActive = idx === activeIndex;
          const isUnlocked = maxLevel >= level.minLevel;

          return (
            <button
              key={level.label}
              onClick={() => setActiveIndex(idx)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                isActive
                  ? "gold-gradient text-primary-foreground border-primary/30 shadow-md"
                  : isCurrent
                  ? "bg-primary/15 text-primary border-primary/25"
                  : isUnlocked
                  ? "bg-muted/20 text-muted-foreground border-border/20"
                  : "bg-muted/10 text-muted-foreground/50 border-border/10"
              }`}
            >
              {isCurrent ? (
                <Crown className="w-3 h-3" />
              ) : isUnlocked ? (
                <Sparkles className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              {level.minLevel}-{level.maxLevel}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLevel.label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Summary bar */}
          <div className="flex items-center justify-between px-1" dir="rtl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">{activeLevel.label}</span>
              {isCurrentLevel && (
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  أنت هنا
                </span>
              )}
              {isLocked && (
                <span className="text-[9px] font-bold text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> مقفل
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {activeLevel.groups.reduce((s, g) => s + g.patterns.length, 0)} صيغة
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 px-2 py-1.5 bg-muted/10 rounded-lg text-[9px] text-muted-foreground" dir="rtl">
            <span>🔤 <strong>حروف متشابهة</strong> = أرقام متشابهة</span>
            <span>✖️ <strong>X</strong> = أي رقم</span>
          </div>

          {/* Digit groups */}
          {activeLevel.groups.map((group) => (
            <DigitSection key={group.digits} digits={group.digits} patterns={group.patterns} />
          ))}

          {/* Prev / Next arrows */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => canGoRight && setActiveIndex(activeIndex + 1)}
              disabled={!canGoRight}
              className="w-7 h-7 rounded-full bg-muted/25 flex items-center justify-center disabled:opacity-20"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <div className="flex gap-1">
              {allLevels.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === activeIndex ? "bg-primary" : "bg-border/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => canGoLeft && setActiveIndex(activeIndex - 1)}
              disabled={!canGoLeft}
              className="w-7 h-7 rounded-full bg-muted/25 flex items-center justify-center disabled:opacity-20"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default IdFormatCarousel;
