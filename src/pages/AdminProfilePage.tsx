import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Settings, MessageCircle, Phone, Grid3X3, Clock, Heart, Eye, Plus, Image, Video, Type, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AdminPost {
  id: string;
  user_uuid: string;
  username: string;
  content_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  likes_count: number;
  views_count: number;
  created_at: string;
}

const AdminProfilePage = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"grid" | "timeline">("grid");
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostType, setNewPostType] = useState<"photo" | "video" | "text">("photo");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Get admin session
  const adminSession = (() => {
    try {
      const raw = localStorage.getItem("admin_session");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const isOwnProfile = adminSession?.username === uuid || adminSession?.uuid === uuid;
  const profileUuid = uuid || adminSession?.username || "";

  useEffect(() => {
    fetchPosts();
  }, [profileUuid]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_posts")
      .select("*")
      .eq("user_uuid", profileUuid)
      .order("created_at", { ascending: false });
    setPosts((data as AdminPost[]) || []);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً (الحد 8MB)");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmitPost = async () => {
    if (!adminSession) return;
    setUploading(true);

    try {
      let mediaUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (selectedFile && newPostType !== "text") {
        const ext = selectedFile.name.split(".").pop();
        const path = `posts/${profileUuid}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("attachments")
          .upload(path, selectedFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
        thumbnailUrl = mediaUrl;
      }

      if (newPostType === "text" && !caption.trim()) {
        toast.error("اكتب شيئاً!");
        setUploading(false);
        return;
      }

      const { error } = await supabase.from("admin_posts").insert({
        user_uuid: profileUuid,
        username: adminSession.display_name || adminSession.username,
        content_type: newPostType,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption.trim() || null,
      } as any);

      if (error) throw error;
      toast.success("تم النشر!");
      setShowNewPost(false);
      setCaption("");
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchPosts();
    } catch (err: any) {
      toast.error(err.message || "فشل النشر");
    } finally {
      setUploading(false);
    }
  };

  const stats = {
    posts: posts.length,
    likes: posts.reduce((s, p) => s + (p.likes_count || 0), 0),
    views: posts.reduce((s, p) => s + (p.views_count || 0), 0),
  };

  const displayName = adminSession?.display_name || profileUuid;
  const role = adminSession?.role === "owner" ? "مالك" : adminSession?.role === "super_admin" ? "سوبر أدمن" : "مشرف";
  const roleBadgeColor = adminSession?.role === "owner" ? "from-amber-500 to-yellow-400" : adminSession?.role === "super_admin" ? "from-purple-500 to-pink-400" : "from-blue-500 to-cyan-400";

  // Group posts by day for timeline view
  const groupedByDay = posts.reduce<Record<string, AdminPost[]>>((acc, post) => {
    const day = new Date(post.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
    if (!acc[day]) acc[day] = [];
    acc[day].push(post);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background font-['Cairo',sans-serif]" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-muted/50 text-foreground">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">الملف الشخصي</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-6 pb-4"
      >
        <div className="flex items-center gap-4 mb-5">
          {/* Avatar */}
          <div className="relative">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${roleBadgeColor} p-[3px]`}>
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-2xl font-bold text-foreground">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            {isOwnProfile && (
              <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Settings className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
            <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${roleBadgeColor}`}>
              {role}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-5">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl border-border/50 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>اتصال</span>
            <span className="text-[10px] bg-muted px-1.5 rounded-full">قريباً</span>
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary/80"
            onClick={() => navigate(`/admin/messages`)}
          >
            <MessageCircle className="w-4 h-4" />
            رسالة خاصة
          </Button>
          {isOwnProfile && (
            <Button variant="outline" size="sm" className="rounded-xl border-border/50" onClick={() => setShowNewPost(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "المنشورات", value: stats.posts, icon: Grid3X3 },
            { label: "الإعجابات", value: stats.likes, icon: Heart },
            { label: "المشاهدات", value: stats.views, icon: Eye },
          ].map((s) => (
            <div key={s.label} className="bg-card/60 backdrop-blur-sm rounded-xl p-3 text-center border border-border/20">
              <s.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold text-foreground">{s.value.toLocaleString("ar-SA")}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 px-4">
        {[
          { id: "grid" as const, icon: Grid3X3, label: "المنشورات" },
          { id: "timeline" as const, icon: Clock, label: "اليوميات" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : activeTab === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-0.5 p-0.5"
          >
            {posts.filter(p => p.content_type !== "text").map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square bg-card overflow-hidden cursor-pointer group"
              >
                {post.content_type === "video" ? (
                  <video
                    src={post.media_url || ""}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={post.media_url || "/placeholder.svg"}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-4 text-white text-sm font-semibold">
                    <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{post.likes_count}</span>
                    <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{post.views_count}</span>
                  </div>
                </div>
                {post.content_type === "video" && (
                  <div className="absolute top-2 left-2">
                    <Video className="w-4 h-4 text-white drop-shadow-lg" />
                  </div>
                )}
              </motion.div>
            ))}
            {/* Text posts at the end */}
            {posts.filter(p => p.content_type === "text").map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square bg-gradient-to-br from-primary/20 to-card overflow-hidden cursor-pointer flex items-center justify-center p-3"
              >
                <p className="text-xs text-foreground text-center line-clamp-4">{post.caption}</p>
              </motion.div>
            ))}
            {posts.length === 0 && (
              <div className="col-span-3 py-20 text-center text-muted-foreground">
                <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد منشورات بعد</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-4 space-y-6"
          >
            {Object.entries(groupedByDay).map(([day, dayPosts]) => (
              <div key={day}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="text-sm font-bold text-foreground">{day}</h3>
                  <div className="flex-1 h-px bg-border/30" />
                </div>
                <div className="space-y-3 mr-3 border-r-2 border-border/20 pr-4">
                  {dayPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-card/60 backdrop-blur-sm rounded-xl p-3 border border-border/20"
                    >
                      {post.media_url && (
                        <div className="rounded-lg overflow-hidden mb-2">
                          {post.content_type === "video" ? (
                            <video src={post.media_url} className="w-full max-h-48 object-cover rounded-lg" controls muted />
                          ) : (
                            <img src={post.media_url} alt="" className="w-full max-h-48 object-cover rounded-lg" loading="lazy" />
                          )}
                        </div>
                      )}
                      {post.caption && (
                        <p className="text-sm text-foreground/80">{post.caption}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes_count}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views_count}</span>
                        <span className="mr-auto">
                          {new Date(post.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <div className="py-20 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد يوميات بعد</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Post Dialog */}
      <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
        <DialogContent className="bg-card border-border/30 max-w-sm mx-auto font-['Cairo',sans-serif]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">منشور جديد</DialogTitle>
          </DialogHeader>

          {/* Post Type Selector */}
          <div className="flex gap-2 mb-4">
            {[
              { id: "photo" as const, icon: Image, label: "صورة" },
              { id: "video" as const, icon: Video, label: "فيديو" },
              { id: "text" as const, icon: Type, label: "نص" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setNewPostType(t.id); setSelectedFile(null); setPreviewUrl(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  newPostType === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* File Upload */}
          {newPostType !== "text" && (
            <div className="mb-4">
              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden">
                  {newPostType === "video" ? (
                    <video src={previewUrl} className="w-full max-h-48 object-cover rounded-xl" controls muted />
                  ) : (
                    <img src={previewUrl} alt="" className="w-full max-h-48 object-cover rounded-xl" />
                  )}
                  <button
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border/40 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">اختر {newPostType === "photo" ? "صورة" : "فيديو"}</span>
                  <span className="text-[11px] text-muted-foreground/60 mt-1">الحد الأقصى 8MB</span>
                  <input
                    type="file"
                    accept={newPostType === "photo" ? "image/*" : "video/*"}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Caption */}
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={newPostType === "text" ? "اكتب منشورك..." : "أضف تعليقاً (اختياري)..."}
            className="bg-muted/30 border-border/30 min-h-[80px] resize-none text-foreground"
            dir="rtl"
          />

          <Button
            onClick={handleSubmitPost}
            disabled={uploading || (newPostType !== "text" && !selectedFile)}
            className="w-full mt-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "نشر"
            )}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProfilePage;
