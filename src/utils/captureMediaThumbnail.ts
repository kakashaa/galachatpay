/**
 * Capture a screenshot/thumbnail from SVGA or MP4 file (client-side).
 * - SVGA: plays animation for 2s then captures canvas
 * - MP4/video: seeks to second 3 then captures frame
 * Returns a PNG Blob or null on failure.
 */
export async function captureMediaThumbnail(fileUrl: string): Promise<Blob | null> {
  const ext = fileUrl.split('.').pop()?.toLowerCase().split('?')[0];

  if (ext === 'svga') {
    return captureSvga(fileUrl);
  } else {
    return captureMp4(fileUrl);
  }
}

async function captureSvga(url: string): Promise<Blob | null> {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => resolve(null), 8000);
    try {
      const { Downloader, Parser, Player } = await import("svga-web");

      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;

      const downloader = new Downloader();
      const parser = new Parser();
      const player = new Player(canvas);

      const fileData = await downloader.get(url);
      const svgaData = await parser.do(fileData);

      player.set({ loop: 1, fillMode: "forwards" });
      await player.mount(svgaData);
      player.start();

      // Wait 2s for animation, then capture
      setTimeout(() => {
        canvas.toBlob((blob) => {
          clearTimeout(timeout);
          try { player.destroy(); } catch {}
          resolve(blob);
        }, 'image/png');
      }, 2000);
    } catch (err) {
      console.error("SVGA capture error:", err);
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

async function captureMp4(url: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 12000);
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'auto';

      video.onloadedmetadata = () => {
        const seekTime = Math.min(3, video.duration * 0.4);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 400;
        canvas.height = video.videoHeight || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            clearTimeout(timeout);
            resolve(blob);
          }, 'image/png');
        } else {
          clearTimeout(timeout);
          resolve(null);
        }
      };

      video.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
      video.src = url;
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}
