import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

const REFRESH_INTERVAL_MS = 46 * 60 * 1000;

interface WorksCountdownProps {
  updatedAt: string;
  onExpire?: () => void;
  /** Compact mode for admin cards */
  compact?: boolean;
}

function getRemaining(updatedAt: string) {
  const last = new Date(updatedAt).getTime();
  const next = last + REFRESH_INTERVAL_MS;
  return Math.max(0, next - Date.now());
}

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getAgeColor(updatedAt: string) {
  const age = Date.now() - new Date(updatedAt).getTime();
  if (age < 30 * 60 * 1000) return "text-emerald-400";
  if (age < 60 * 60 * 1000) return "text-amber-400";
  return "text-destructive";
}

const WorksCountdown: React.FC<WorksCountdownProps> = ({ updatedAt, onExpire, compact }) => {
  const [remaining, setRemaining] = useState(() => getRemaining(updatedAt));

  useEffect(() => {
    setRemaining(getRemaining(updatedAt));
    const id = setInterval(() => {
      const r = getRemaining(updatedAt);
      setRemaining(r);
      if (r === 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [updatedAt, onExpire]);

  const lastTime = new Date(updatedAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
  const color = getAgeColor(updatedAt);

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 text-[9px] ${color}`}>
        <Clock className="w-3 h-3" />
        <span>آخر تحديث: {lastTime}</span>
        {remaining > 0 && <span className="font-mono font-bold">⏱ {formatTime(remaining)}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-1 text-center">
      <div className="flex items-center justify-center gap-2">
        <Clock className={`w-3.5 h-3.5 ${color}`} />
        <p className="text-[10px] text-muted-foreground">
          آخر تحديث: <span className={`font-bold ${color}`}>{lastTime}</span>
        </p>
      </div>
      {remaining > 0 && (
        <p className="text-[10px] text-muted-foreground">
          التحديث القادم خلال: <span className={`font-mono font-bold ${color}`}>{formatTime(remaining)}</span>
        </p>
      )}
      <p className="text-[9px] text-muted-foreground/60">
        تُحدّث الأرباح تلقائياً — لا تقلق لو الأرقام ما تغيّرت فوراً
      </p>
    </div>
  );
};

export default WorksCountdown;
