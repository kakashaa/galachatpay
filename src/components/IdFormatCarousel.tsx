import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Hash, Crown, Lock, Sparkles } from "lucide-react";
import { LevelFormats, FormatGroup } from "@/data/idFormats";

interface IdFormatCarouselProps {
  availableLevels: LevelFormats[];
  currentLevelIndex: number;
  maxLevel: number;
}

const patternColors = [
  "from-primary/20 to-primary/5",
  "from-amber-500/20 to-amber-500/5",
  "from-emerald-500/20 to-emerald-500/5",
  "from-sky-500/20 to-sky-500/5",
  "from-violet-500/20 to-violet-500/5",
];

const PatternChip: React.FC<{ pattern: string; index: number; digitGroup: number }> = ({ pattern, index, digitGroup }) => {
  // Generate a sample number from the pattern
  const generateExample = (p: string): string => {
    const map: Record<string, number> = {};
    let nextDigit = 1;
    return p.split("").map((c) => {
      if (c === "X") return Math.floor(Math.random() * 10);
      if (!map[c]) map[c] = nextDigit++;
      return map[c];
    }).join("");
  };

  const example = React.useMemo(() => generateExample(pattern), [pattern]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 20 }}
      className="flex flex-col items-center gap-1"
    >
      <div className={`px-3 py-2 rounded-xl bg-gradient-to-br ${patternColors[digitGroup % patternColors.length]} border border-border/20 backdrop-blur-sm`}>
        <p className="text-[11px] font-mono font-bold text-foreground tracking-wider" dir="ltr">{pattern}</p>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground" dir="ltr">{example}</p>
    </motion.div>
  );
};

const DigitGroupSection: React.FC<{ group: FormatGroup; groupIndex: number }> = ({ group, groupIndex }) => (
  <div className="space-y-2.5">
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${patternColors[groupIndex % patternColors.length]} flex items-center justify-center`}>
        <Hash className="w-3.5 h-3.5 text-foreground" />
      </div>
      <span className="text-xs font-bold text-foreground">{group.digits} أرقام</span>
      <span className="text-[10px] text-muted-foreground">({group.patterns.length} صيغة)</span>
    </div>
    <div className="flex flex-wrap gap-2 pr-2">
      {group.patterns.map((pattern, idx) => (
        <PatternChip key={pattern} pattern={pattern} index={idx} digitGroup={groupIndex} />
      ))}
    </div>
  </div>
);

const IdFormatCarousel: React.FC<IdFormatCarouselProps> = ({ availableLevels, currentLevelIndex, maxLevel }) => {
  const [activeIndex, setActiveIndex] = useState(currentLevelIndex);
  const activeLevel = availableLevels[activeIndex];

  if (!activeLevel) return null;

  const isCurrentLevel = maxLevel >= activeLevel.minLevel && maxLevel <= activeLevel.maxLevel;
  const canGoLeft = activeIndex > 0;
  const canGoRight = activeIndex < availableLevels.length - 1;

  return (
    <div className="space-y-4">
      {/* Level Selector - Train Track */}
      <div className="relative">
        {/* Track line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-border/30 -translate-y-1/2 rounded-full" />
        <div
          className="absolute top-1/2 left-4 h-0.5 bg-primary/50 -translate-y-1/2 rounded-full transition-all duration-500"
          style={{ width: `${((activeIndex + 1) / availableLevels.length) * (100 - 8)}%` }}
        />

        {/* Level stops */}
        <div className="relative flex justify-between px-2">
          {availableLevels.map((level, idx) => {
            const isCurrent = maxLevel >= level.minLevel && maxLevel <= level.maxLevel;
            const isActive = idx === activeIndex;
            const isPassed = idx <= activeIndex;

            return (
              <button
                key={level.label}
                onClick={() => setActiveIndex(idx)}
                className="flex flex-col items-center gap-1.5 relative z-10"
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.3 : 1,
                    boxShadow: isActive ? "0 0 12px hsl(var(--primary) / 0.4)" : "none",
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? "gold-gradient"
                      : isPassed
                      ? "bg-primary/30 border-2 border-primary/50"
                      : "bg-muted/40 border-2 border-border/30"
                  }`}
                >
                  {isCurrent ? (
                    <Crown className="w-3.5 h-3.5 text-primary-foreground" />
                  ) : isPassed ? (
                    <Sparkles className="w-3 h-3 text-primary" />
                  ) : (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  )}
                </motion.div>
                <span className={`text-[9px] font-bold leading-none ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {level.minLevel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Level Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLevel.label}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="glass-card p-4 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">{activeLevel.minLevel}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{activeLevel.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {activeLevel.groups.reduce((sum, g) => sum + g.patterns.length, 0)} صيغة متاحة
                </p>
              </div>
            </div>
            {isCurrentLevel && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                مستواك الحالي
              </span>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => canGoLeft && setActiveIndex(activeIndex - 1)}
              disabled={!canGoLeft}
              className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center disabled:opacity-30 transition-opacity"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
            <div className="flex gap-1">
              {availableLevels.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === activeIndex ? "bg-primary" : "bg-border/40"}`}
                />
              ))}
            </div>
            <button
              onClick={() => canGoRight && setActiveIndex(activeIndex + 1)}
              disabled={!canGoRight}
              className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center disabled:opacity-30 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Format Groups */}
          <div className="space-y-4">
            {activeLevel.groups.map((group, gIdx) => (
              <DigitGroupSection key={group.digits} group={group} groupIndex={gIdx} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default IdFormatCarousel;
