import { useEffect, useRef } from "react";

/**
 * Plays a short, pleasant chime using Web Audio API.
 * No external audio file needed.
 */
export const useVipChime = (shouldPlay: boolean) => {
  const played = useRef(false);

  useEffect(() => {
    if (!shouldPlay || played.current) return;
    played.current = true;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Two-note sparkle chime
      const playNote = (freq: number, startTime: number, duration: number, gain: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        g.gain.setValueAtTime(gain, ctx.currentTime + startTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      playNote(880, 0, 0.15, 0.08);    // A5
      playNote(1318, 0.1, 0.2, 0.06);  // E6

      setTimeout(() => ctx.close(), 500);
    } catch {
      // Silent fail – audio not supported
    }
  }, [shouldPlay]);
};
