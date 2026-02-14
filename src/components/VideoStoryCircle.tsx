import { useState, useEffect, useRef } from 'react';
import { Play, X, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import TikTokInteraction from '@/components/TikTokInteraction';
import { AnimatePresence, motion } from 'framer-motion';

interface VideoTutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
}

// Component to extract a frame from a video as thumbnail
const VideoThumbnail = ({ src, alt }: { src: string; alt: string }) => {
  const [thumb, setThumb] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!src || attempted.current) return;
    attempted.current = true;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    video.src = src;
    video.currentTime = 1;
    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 96;
        canvas.height = video.videoHeight || 96;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumb(canvas.toDataURL('image/jpeg', 0.7));
        }
      } catch { /* CORS or other error */ }
    }, { once: true });
    video.addEventListener('error', () => {}, { once: true });
  }, [src]);

  if (thumb) {
    return <img src={thumb} alt={alt} className="w-full h-full object-cover rounded-full" />;
  }
  return (
    <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
      <Play className="w-4 h-4 text-primary" />
    </div>
  );
};

export const VideoStoryCircle = () => {
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_tutorials')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVideos((data || []) as unknown as VideoTutorial[]);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openVideo = (index: number) => {
    const video = videos[index] || demoVideos[index];
    if (!video?.video_url) return;
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const closeVideo = () => {
    setIsOpen(false);
  };

  const goNext = () => {
    const list = videos.length > 0 ? videos : demoVideos;
    if (currentIndex < list.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const currentVideo = (videos.length > 0 ? videos : [])[currentIndex];

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
          <div key={video.id} className="flex flex-col items-center gap-1 flex-shrink-0">
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
            <span className="text-[9px] font-medium text-foreground text-center max-w-[48px] line-clamp-1">
              {video.title}
            </span>
          </div>
        ))}
      </div>

      {/* Fullscreen TikTok-style Video Viewer */}
      <AnimatePresence>
        {isOpen && currentVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col"
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* Progress dots */}
              <div className="flex gap-1">
                {(videos.length > 0 ? videos : []).map((_, i) => (
                  <div
                    key={i}
                    className={`h-[3px] rounded-full transition-all ${
                      i === currentIndex ? 'w-5 bg-white' : 'w-2 bg-white/30'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={closeVideo}
                className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video area */}
            <div className="flex-1 relative flex items-center justify-center">
              <video
                ref={videoRef}
                key={currentVideo.id}
                src={currentVideo.video_url}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-contain"
              />

              {/* Tap zones for prev/next */}
              <button
                onClick={goPrev}
                className="absolute left-0 top-0 bottom-0 w-1/4 z-30"
                aria-label="السابق"
              />
              <button
                onClick={goNext}
                className="absolute right-0 top-0 bottom-0 w-1/4 z-30"
                aria-label="التالي"
              />

              {/* TikTok interaction buttons (likes/comments) */}
              <TikTokInteraction
                itemType="video_tutorial"
                itemId={currentVideo.id}
              />
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-[env(safe-area-inset-bottom,16px)] pt-12" dir="rtl">
              <h3 className="text-white text-base font-bold mb-1">{currentVideo.title}</h3>
              {currentVideo.description && (
                <p className="text-white/70 text-xs mb-2">{currentVideo.description}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
