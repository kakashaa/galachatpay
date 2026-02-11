import { useState, useEffect } from 'react';
import { Play, X, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface VideoTutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
}

export const VideoStoryCircle = () => {
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const openVideo = (video: VideoTutorial) => {
    setSelectedVideo(video);
    setIsOpen(true);
  };

  const closeVideo = () => {
    setIsOpen(false);
    setSelectedVideo(null);
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
          <div key={video.id} className="flex flex-col items-center gap-1 flex-shrink-0">
            <button onClick={() => openVideo(video)} className="relative group">
              <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-primary via-accent to-primary">
                <div className="w-full h-full rounded-full bg-background p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover rounded-full" />
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

      {/* Full Screen Video Dialog */}
      <Dialog open={isOpen} onOpenChange={closeVideo}>
        <DialogContent className="max-w-[95vw] sm:max-w-md w-full h-[90vh] max-h-[800px] p-0 bg-black border-0 rounded-2xl overflow-hidden flex flex-col [&>button]:hidden">
          <VisuallyHidden>
            <DialogTitle>{selectedVideo?.title || 'فيديو تعليمي'}</DialogTitle>
          </VisuallyHidden>
          <div className="relative w-full h-full flex flex-col">
            <button onClick={closeVideo} className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className="absolute top-4 left-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            {selectedVideo && (
              <div className="flex-1 flex items-center justify-center bg-black min-h-0">
                <video key={selectedVideo.id} src={selectedVideo.video_url} autoPlay loop muted={isMuted} playsInline controls className="w-full h-full object-contain" />
              </div>
            )}
            {selectedVideo && (
              <div className="bg-gradient-to-t from-black/90 to-transparent p-4 pt-8">
                <h3 className="text-white text-lg font-bold mb-1">{selectedVideo.title}</h3>
                {selectedVideo.description && (
                  <p className="text-white/80 text-sm">{selectedVideo.description}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
