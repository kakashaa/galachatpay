import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface VoiceMessageProps {
  url: string;
  duration?: number;
  isMine?: boolean;
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({ url, duration = 0, isMine }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // RTL aware - click position from right
    const clickX = rect.right - e.clientX;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = pct * (audioRef.current.duration || totalDuration);
  };

  const displayTime = playing ? currentTime : totalDuration;

  // Generate pseudo-random waveform bars from URL hash
  const bars = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < url.length; i++) hash = url.charCodeAt(i) + ((hash << 5) - hash);
    return Array.from({ length: 36 }, (_, i) => {
      const seed = Math.abs(hash * (i + 1)) % 100;
      return 3 + (seed / 100) * 14;
    });
  }, [url]);

  const accentColor = isMine ? "hsl(217 91% 70%)" : "hsl(160 84% 50%)";
  const dimColor = "hsl(0 0% 100% / 0.15)";

  return (
    <div className="flex items-center gap-2 min-w-[200px] max-w-[260px] py-0.5">
      {/* Play/Pause button */}
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95"
        style={{
          background: accentColor,
          boxShadow: `0 2px 8px ${isMine ? "hsl(217 91% 50% / 0.3)" : "hsl(160 84% 39% / 0.3)"}`,
        }}
      >
        {playing ? (
          <Pause className="w-4 h-4 text-white" fill="white" />
        ) : (
          <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1.5">
        {/* Waveform - clickable for seeking */}
        <div
          className="flex items-center gap-[1.5px] h-[22px] cursor-pointer"
          onClick={handleSeek}
          dir="rtl"
        >
          {bars.map((h, i) => {
            const filled = progress > (i / bars.length) * 100;
            return (
              <div
                key={i}
                className="rounded-full transition-all duration-75"
                style={{
                  width: "2.5px",
                  height: `${h}px`,
                  background: filled ? accentColor : dimColor,
                }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-white/35 font-mono tabular-nums leading-none">
            {formatTime(displayTime)}
          </span>
        </div>
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
          const dur = e.currentTarget.duration;
          if (dur && isFinite(dur) && dur > 0) setTotalDuration(dur);
        }}
      />
    </div>
  );
};

export default VoiceMessage;
