import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Crown, Lock, Sparkles, ArrowLeft } from "lucide-react";
import { LevelFormats } from "@/data/idFormats";

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
      if (c === "P") return 5; // special letter in ABCDEP
      if (!map[c]) map[c] = next++;
      return map[c];
    })
    .join("");
}

/** Colour the example digits so repeated ones share a colour */
function colourDigits(example: string, pattern: string) {
  const palette = [
    "text-amber-400",
    "text-sky-400",
    "text-emerald-400",
    "text-rose-400",
    "text-violet-400",
    "text-orange-400",
    "text-teal-400",
  ];
  const letterColor: Record<string, string> = {};
  let colorIdx = 0;

  return example.split("").map((digit, i) => {
    const letter = pattern[i];
    if (letter === "X") {
      return (
        <span key={i} className="text-muted-foreground/60">
          {digit}
        </span>
      );
    }
    if (!letterColor[letter]) {
      letterColor[letter] = palette[colorIdx % palette.length];
      colorIdx++;
    }
    return (
      <span key={i} className={`${letterColor[letter]} font-bold`}>
        {digit}
      </span>
    );
  });
}

const PatternRow: React.FC<{ pattern: string; index: number }> = ({ pattern, index }) => {
  const example = React.useMemo(() => patternToExample(pattern), [pattern]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex items-center justify-between bg-muted/15 rounded-lg px-2.5 py-1.5 gap-3"
      dir="ltr"
    >
      {/* Pattern */}
      <span className="text-[11px] font-mono tracking-widest text-muted-foreground min-w-[60px]">
        {pattern}
      </span>
      {/* Arrow */}
      <ArrowLeft className="w-3 h-3 text-muted-foreground/40 shrink-0" />
      {/* Coloured example */}
      <span className="text-sm font-mono tracking-[0.2em] min-w-[60px] text-right">
        {colourDigits(example, pattern)}
      </span>
    </motion.div>
  );
};

const DigitSection: React.FC<{ digits: number; patterns: string[]; groupIdx: number }> = ({
  digits,
  patterns,
  groupIdx,
}) => (
  <div className="space-y-1.5">
    {/* Digit count header */}
    <div className="flex items-center gap-2 mb-2" dir="rtl">
      <div className="h-6 w-6 rounded-md gold-gradient flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-[10px]">{digits}</span>
      </div>
      <span className="text-xs font-bold text-foreground">{digits} أرقام</span>
      <span className="text-[10px] text-muted-foreground mr-auto">({patterns.length} صيغة)</span>
    </div>
    {/* Patterns grid — 2 columns for compact view */}
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
  const [activeIndex, setActiveIndex] = useState(currentLevelIndex);
  const activeLevel = availableLevels[activeIndex];

  if (!activeLevel) return null;

  const isCurrentLevel = maxLevel >= activeLevel.minLevel && maxLevel <= activeLevel.maxLevel;
  const canGoLeft = activeIndex > 0;
  const canGoRight = activeIndex < availableLevels.length - 1;

  return (
    <div className="space-y-3">
      {/* Level navigation pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" dir="rtl">
        {availableLevels.map((level, idx) => {
          const isCurrent = maxLevel >= level.minLevel && maxLevel <= level.maxLevel;
          const isActive = idx === activeIndex;

          return (
            <button
              key={level.label}
              onClick={() => setActiveIndex(idx)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                isActive
                  ? "gold-gradient text-primary-foreground border-primary/30 shadow-md"
                  : isCurrent
                  ? "bg-primary/15 text-primary border-primary/25"
                  : "bg-muted/20 text-muted-foreground border-border/20"
              }`}
            >
              {isCurrent ? (
                <Crown className="w-3 h-3" />
              ) : idx <= currentLevelIndex ? (
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
          {activeLevel.groups.map((group, gIdx) => (
            <DigitSection
              key={group.digits}
              digits={group.digits}
              patterns={group.patterns}
              groupIdx={gIdx}
            />
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
              {availableLevels.map((_, idx) => (
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
