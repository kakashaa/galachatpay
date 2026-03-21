import React, { useRef, useEffect } from "react";

interface SvgaPlayerProps {
  src: string;
  loop?: number; // 0 = infinite
  className?: string;
  width?: number;
  height?: number;
}

const SvgaPlayer: React.FC<SvgaPlayerProps> = ({ src, loop = 0, className = "", width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || !src) return;
    let cancelled = false;

    const loadSvga = async () => {
      try {
        const SVGA = await import("svga-web");
        if (cancelled) return;

        const downloader = new SVGA.Downloader();
        const parser = new SVGA.Parser();
        const player = new SVGA.Player(canvasRef.current!);
        playerRef.current = player;

        const fileData = await downloader.get(src);
        if (cancelled) { player.destroy(); return; }

        const svgaData = await parser.do(fileData);
        if (cancelled) { player.destroy(); return; }

        player.set({ loop, fillMode: "forwards" });
        await player.mount(svgaData);
        player.start();
      } catch (err) {
        console.error("SVGA load error:", src, err);
      }
    };

    loadSvga();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [src, loop]);

  // Use higher resolution canvas but scale down with CSS for crisp rendering
  const canvasW = width || 300;
  const canvasH = height || 300;

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      className={className}
    />
  );
};

export default SvgaPlayer;
