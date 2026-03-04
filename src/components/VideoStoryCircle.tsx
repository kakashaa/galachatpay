import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, X, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import TikTokInteraction from '@/components/TikTokInteraction';

interface VideoTutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
}

// Lightweight placeholder instead of extracting video frames (was causing heavy loading)
const VideoThumbnail = ({ alt: _alt }: { src: string; alt: string }) => {
  return (
    <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
      <Play className="w-4 h-4 text-primary" />
    </div>
  );
};

// Full-screen TikTok-style video player
const TikTokPlayer = ({
  videos,
  initialIndex,
  onClose,
}: {
  videos: VideoTutorial[];
  initialIndex: number;
  onClose: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const currentVideo = videos[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < videos.length - 1) setCurrentIndex(i => i + 1);
  }, [currentIndex, videos.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    // Only handle vertical swipes (ignore horizontal for comments interaction)
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 60) {
      if (deltaY > 0) goNext(); // swipe up = next
      else goPrev(); // swipe down = prev
    }
  };

  // Tap left/right sides for nav
  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    if (x < width * 0.25) goPrev();
    else if (x > width * 0.75) goNext();
  };

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Progress dots */}
      <div className="absolute top-3 left-0 right-0 z-30 flex justify-center gap-1 px-4">
        {videos.map((_, i) => (
          <div
            key={i}
            className={`h-[3px] rounded-full flex-1 max-w-[40px] transition-colors ${
              i === currentIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-10 right-4 z-30 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:bg-black/60 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Mute button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-10 left-4 z-30 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:bg-black/60 transition-colors"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Video area */}
      <div
        className="flex-1 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVideo.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <video
              ref={videoRef}
              src={currentVideo.video_url}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-contain"
            />
          </motion.div>
        </AnimatePresence>

        {/* TikTok interaction buttons (likes/comments) - stop propagation to prevent nav */}
        <div onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <TikTokInteraction
            itemType="entry_gift"
            itemId={currentVideo.id}
          />
        </div>

        {/* Video info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-6" dir="rtl">
          <h3 className="text-white text-base font-bold mb-1">{currentVideo.title}</h3>
          {currentVideo.description && (
            <p className="text-white/70 text-sm line-clamp-2">{currentVideo.description}</p>
          )}
        </div>

        {/* Nav arrows for desktop */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full items-center justify-center text-white hidden sm:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentIndex < videos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full items-center justify-center text-white hidden sm:flex"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const VideoStoryCircle = () => {
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_tutorials')
        .select('id,title,description,video_url,thumbnail_url')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true })
        .limit(10);

      if (error) throw error;
      setVideos((data || []) as unknown as VideoTutorial[]);
    } catch {
      // silent - don't block page load
    } finally {
      setLoading(false);
    }
  };

  const openVideo = (index: number) => {
    const video = displayVideos[index];
    if (!video.video_url) return;
    setPlayerIndex(index);
  };

  // Demo videos when DB is empty
  const demoVideos: VideoTutorial[] = [
    { id: "demo-1", title: "كيف تشحن؟", description: "طريقة الشحن", video_url: "", thumbnail_url: null },
    { id: "demo-2", title: "سحب الراتب", description: "خطوات السحب", video_url: "", thumbnail_url: null },
    { id: "demo-3", title: "طلب VIP", description: "كيف تطلب VIP", video_url: "", thumbnail_url: null },
    { id: "demo-4", title: "تغيير الآيدي", description: "خطوات التغيير", video_url: "", thumbnail_url: null },
    { id: "demo-5", title: "الدعم السريع", description: "تواصل معنا", video_url: "", thumbnail_url: null },
  ];

  const displayVideos = videos.length > 0 ? videos : demoVideos;

  if (loading) return null;

  return (
    <>
      {/* Stories Row */}
      <div className="flex gap-3 overflow-x-auto pb-1.5 px-1 scrollbar-hide z-10" dir="rtl">
        {displayVideos.map((video, index) => (
          <div key={video.id} className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <span className="text-[8px] font-bold text-primary/80">شرح</span>
            <button onClick={() => openVideo(index)} className="relative group">
              <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-primary via-accent to-primary">
                <div className="w-full h-full rounded-full bg-background p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover rounded-full" />
                    ) : video.video_url ? (
                      <VideoThumbnail src={video.video_url} alt={video.title} />
                    ) : (
                      <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                        <Play className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                <Play className="w-2 h-2 text-primary-foreground fill-current" />
              </div>
            </button>
            <div className="w-[52px] overflow-hidden mt-0.5">
              <span className={`text-[9px] font-medium text-foreground text-center block whitespace-nowrap ${video.title.length > 6 ? 'animate-marquee' : ''}`}>
                {video.title}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Full Screen TikTok Player */}
      <AnimatePresence>
        {playerIndex !== null && (
          <TikTokPlayer
            videos={displayVideos.filter(v => !!v.video_url)}
            initialIndex={Math.min(playerIndex, displayVideos.filter(v => !!v.video_url).length - 1)}
            onClose={() => setPlayerIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
