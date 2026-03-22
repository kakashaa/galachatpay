import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Plus, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AdminStory {
  id: string;
  user_uuid: string;
  username: string;
  media_url: string;
  media_type: string;
  duration: number;
  views: any[];
  expires_at: string;
  created_at: string;
}

interface StoryGroup {
  user_uuid: string;
  username: string;
  stories: AdminStory[];
  hasNew: boolean;
}

// Full-screen story viewer
const StoryViewer = ({
  groups,
  initialGroupIndex,
  onClose,
  currentUserUuid,
}: {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  currentUserUuid?: string;
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const duration = (currentStory?.duration || 20) * 1000;

  const goNextStory = useCallback(() => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(i => i + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(i => i + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIndex, groupIndex, currentGroup, groups.length, onClose]);

  const goPrevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(i => i - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex(i => i - 1);
      setStoryIndex(0);
      setProgress(0);
    }
  }, [storyIndex, groupIndex]);

  // Mark viewed
  useEffect(() => {
    if (!currentStory || !currentUserUuid) return;
    const views = currentStory.views || [];
    if (!views.some((v: any) => v.uuid === currentUserUuid)) {
      const newViews = [...views, { uuid: currentUserUuid, viewed_at: new Date().toISOString() }];
      (supabase as any).from('admin_stories').update({ views: newViews }).eq('id', currentStory.id).then(() => {});
    }
  }, [currentStory?.id, currentUserUuid]);

  // Progress timer
  useEffect(() => {
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const interval = 50;
    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (interval / duration) * 100;
        if (next >= 100) { goNextStory(); return 0; }
        return next;
      });
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [groupIndex, storyIndex, duration, goNextStory]);

  // Tap left/right
  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) goPrevStory();
    else if (x > rect.width * 0.7) goNextStory();
  };

  if (!currentStory) return null;

  const isOwner = currentUserUuid === currentStory.user_uuid;
  const viewCount = (currentStory.views || []).length;
  const timeAgo = (() => {
    const mins = Math.floor((Date.now() - new Date(currentStory.created_at).getTime()) / 60000);
    if (mins < 60) return `${mins}د`;
    return `${Math.floor(mins / 60)}س`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={handleTap}
    >
      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
        {currentGroup.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
            {currentGroup.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-bold">{currentGroup.username}</p>
            <p className="text-white/60 text-[10px]">{timeAgo}</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Story Media */}
      {currentStory.media_type === 'video' ? (
        <video
          ref={videoRef}
          src={currentStory.media_url}
          className="w-full h-full object-contain"
          autoPlay muted playsInline
        />
      ) : (
        <img src={currentStory.media_url} className="w-full h-full object-contain" alt="" />
      )}

      {/* Footer: views count for owner */}
      {isOwner && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowViewers(!showViewers); }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full z-20"
        >
          <Eye className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-bold">{viewCount}</span>
        </button>
      )}

      {/* Viewers list */}
      <AnimatePresence>
        {showViewers && isOwner && (
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl rounded-t-3xl p-4 z-30 max-h-[50vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-foreground mb-3">من شاف ({viewCount})</p>
            {(currentStory.views || []).map((v: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-border/10">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                  {(v.uuid || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-muted-foreground font-mono">{v.uuid?.slice(0, 12)}...</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const AdminStoryCircle = () => {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const adminSession = (() => {
    try { return JSON.parse(localStorage.getItem('admin_session') || 'null'); } catch { return null; }
  })();

  useEffect(() => {
    fetchStories();
    const channel = supabase
      .channel('admin_stories_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_stories' }, () => fetchStories())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchStories = async () => {
    const now = new Date().toISOString();
    const { data } = await (supabase as any)
      .from('admin_stories')
      .select('*')
      .gt('expires_at', now)
      .order('created_at', { ascending: true });

    const stories = (data || []) as AdminStory[];
    const map = new Map<string, StoryGroup>();
    for (const s of stories) {
      if (!map.has(s.user_uuid)) {
        map.set(s.user_uuid, { user_uuid: s.user_uuid, username: s.username, stories: [], hasNew: false });
      }
      const g = map.get(s.user_uuid)!;
      g.stories.push(s);
      const views = s.views || [];
      if (adminSession?.uuid && !views.some((v: any) => v.uuid === adminSession.uuid)) {
        g.hasNew = true;
      }
    }
    setGroups(Array.from(map.values()));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminSession) return;
    const isVideo = file.type.startsWith('video');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) { toast.error(`الحد الأقصى ${isVideo ? '100' : '20'}MB`); return; }
    setUploading(true);
    try {
      let publicUrl: string;

      if (isVideo) {
        // Use edge function for reliable large video upload
        const formData = new FormData();
        formData.append("file", file);
        const token = localStorage.getItem("admin_session_token") || "";
        formData.append("session_token", token);
        const { data, error } = await supabase.functions.invoke("admin-upload-video", {
          body: formData,
        });
        if (error || data?.error) throw new Error(data?.error || error?.message || "فشل الرفع");
        publicUrl = data.url;
      } else {
        const ext = file.name.split('.').pop();
        const path = `stories/${adminSession.username}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        publicUrl = urlData.publicUrl;
      }

      const mediaType = isVideo ? 'video' : 'photo';
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await (supabase as any).from('admin_stories').insert({
        user_uuid: adminSession.uuid || adminSession.username,
        username: adminSession.display_name || adminSession.username,
        media_url: publicUrl,
        media_type: mediaType,
        expires_at: expiresAt,
      });
      toast.success('تم نشر الستوري');
      fetchStories();
    } catch { toast.error('فشل الرفع'); }
    setUploading(false);
    e.target.value = '';
  };

  if (groups.length === 0 && !adminSession) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1.5 px-1 scrollbar-hide" dir="rtl">
        {/* Upload button for admins */}
        {adminSession && (
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <span className="text-[8px] font-bold text-primary/80">ستوري</span>
            <label className="relative cursor-pointer group">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center bg-primary/5">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 text-primary" />
                )}
              </div>
              <input type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
            <span className="text-[9px] text-muted-foreground">إضافة</span>
          </div>
        )}

        {/* Story circles */}
        {groups.map((group, gi) => (
          <div key={group.user_uuid} className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <span className="text-[8px] font-bold text-primary/80">ستوري</span>
            <button onClick={() => setViewerIndex(gi)} className="relative group">
              <div className={`w-14 h-14 rounded-full p-[2px] ${
                group.hasNew
                  ? 'bg-gradient-to-tr from-primary via-accent to-primary'
                  : 'bg-muted-foreground/30'
              }`}>
                <div className="w-full h-full rounded-full bg-background p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-foreground">
                      {group.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </button>
            <span className="text-[9px] font-medium text-foreground text-center w-[56px] truncate">
              {group.username}
            </span>
          </div>
        ))}
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewerIndex !== null && (
          <StoryViewer
            groups={groups}
            initialGroupIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
            currentUserUuid={adminSession?.uuid || adminSession?.username}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminStoryCircle;
