import { useCallback } from "react";

/**
 * Plays a success chime sound using Web Audio API.
 * Two ascending notes to indicate success.
 */
export const useSuccessChime = () => {
  return useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Two ascending notes for success
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

      playNote(523, 0, 0.1, 0.1);     // C5
      playNote(659, 0.12, 0.15, 0.08); // E5

      setTimeout(() => ctx.close(), 400);
    } catch {
      // Silent fail – audio not supported
    }
  }, []);
};
