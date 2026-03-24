import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Props {
  escalationTimerStartedAt: string | null;
  escalationLevel: number;
  escalationMinutes?: number;
}

const EscalationCountdown: React.FC<Props> = ({
  escalationTimerStartedAt,
  escalationLevel,
  escalationMinutes = 5,
}) => {
  const [remaining, setRemaining] = useState<number>(escalationMinutes * 60);
  const totalSeconds = escalationMinutes * 60;

  useEffect(() => {
    if (!escalationTimerStartedAt || escalationLevel > 0) return;

    const calc = () => {
      const started = new Date(escalationTimerStartedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - started) / 1000);
      return Math.max(0, totalSeconds - elapsed);
    };

    setRemaining(calc());
    const interval = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(interval);
  }, [escalationTimerStartedAt, escalationLevel, totalSeconds]);

  if (escalationLevel > 0) {
    return (
      <div className="rounded-xl p-3 border border-red-500/30" style={{ background: 'rgba(239,68,68,0.08)' }}>
        <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span>تم التصعيد للسوبر أدمن</span>
        </div>
      </div>
    );
  }

  if (!escalationTimerStartedAt) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = (remaining / totalSeconds) * 100;
  const isUrgent = remaining <= 60;
  const isDone = remaining === 0;

  if (isDone) {
    return (
      <div className="rounded-xl p-3 border border-red-500/30" style={{ background: 'rgba(239,68,68,0.08)' }}>
        <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span>جاري التصعيد...</span>
        </div>
        <Progress value={0} className="h-1.5 mt-2 bg-red-900/30" />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3 border border-amber-500/30" style={{ background: 'rgba(245,158,11,0.08)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: isUrgent ? '#f87171' : '#fbbf24' }}>
          <Clock className="w-4 h-4" />
          <span>سيتم التصعيد خلال {minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
      </div>
      <Progress
        value={progress}
        className="h-1.5 mt-2"
        style={{ background: 'rgba(245,158,11,0.15)' }}
      />
    </div>
  );
};

export default EscalationCountdown;
