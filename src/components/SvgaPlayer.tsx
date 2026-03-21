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
        const { Downloader, Parser, Player } = await import("svga-web");
        if (cancelled) return;

        const downloader = new Downloader();
        const parser = new Parser();
        const player = new Player(canvasRef.current!);
        playerRef.current = player;

        const fileData = await downloader.get(src);
        if (cancelled) { player.destroy(); return; }

        const svgaData = await parser.do(fileData);
        if (cancelled) { player.destroy(); return; }

        player.set({ loop, fillMode: "forwards" });
        await player.mount(svgaData);
        player.start();
      } catch (err) {
        console.error("SVGA load error:", err);
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

  return (
    <canvas
      ref={canvasRef}
      width={width || 300}
      height={height || 300}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
};

export default SvgaPlayer;
