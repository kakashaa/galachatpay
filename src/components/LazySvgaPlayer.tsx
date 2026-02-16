import React, { useRef, useState, useEffect } from "react";
import SvgaPlayer from "./SvgaPlayer";

interface LazySvgaPlayerProps {
  src: string;
  loop?: number;
  className?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string | null;
}

const LazySvgaPlayer: React.FC<LazySvgaPlayerProps> = ({ src, loop = 0, className = "", width, height, thumbnailUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className} style={{ width, height }}>
      {isVisible ? (
        <SvgaPlayer src={src} loop={loop} width={width} height={height} className="w-full h-full object-contain" />
      ) : (
        thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted/30 rounded animate-pulse" />
        )
      )}
    </div>
  );
};

export default LazySvgaPlayer;
