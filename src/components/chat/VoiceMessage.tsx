import React, { useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface VoiceMessageProps {
  url: string;
  duration?: number;
  isMine?: boolean;
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({ url, duration = 0, isMine }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const displayDuration = playing ? currentTime : duration;

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] py-1">
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
        style={{
          background: isMine ? "hsl(217 91% 55% / 0.3)" : "hsl(0 0% 100% / 0.1)",
        }}
      >
        {playing ? (
          <Pause className="w-3.5 h-3.5 text-white/80" />
        ) : (
          <Play className="w-3.5 h-3.5 text-white/80 ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] h-4">
          {Array.from({ length: 28 }).map((_, i) => {
            const barHeight = [3, 6, 4, 8, 5, 10, 7, 12, 6, 9, 4, 11, 8, 5, 13, 7, 10, 6, 8, 4, 11, 9, 5, 7, 12, 6, 8, 4][i] || 4;
            const filled = progress > (i / 28) * 100;
            return (
              <div
                key={i}
                className="w-[2px] rounded-full transition-all duration-100"
                style={{
                  height: `${barHeight}px`,
                  background: filled
                    ? (isMine ? "hsl(217 91% 70%)" : "hsl(160 84% 50%)")
                    : "hsl(0 0% 100% / 0.2)",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-white/40 font-mono tabular-nums">
          {formatTime(displayDuration)}
        </span>
        <Mic className="w-3 h-3 text-white/20" />
      </div>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => {
          const ct = e.currentTarget.currentTime;
          const dur = e.currentTarget.duration || 1;
          setProgress((ct / dur) * 100);
          setCurrentTime(ct);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
        onLoadedMetadata={(e) => {
          if (!duration && e.currentTarget.duration) {
            // duration will be from props ideally
          }
        }}
      />
    </div>
  );
};

export default VoiceMessage;