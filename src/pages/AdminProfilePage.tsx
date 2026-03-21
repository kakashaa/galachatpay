import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageCircle, Grid3X3, Clock, Heart, Eye, Plus,
  Image, Video, Type, X, Upload, Star, Send, Loader2, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AdminPageLayout from "@/components/AdminPageLayout";

/* ─── Types ─── */
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

interface PostComment {
  id: string;
  post_id: string;
  commenter_name: string;
  commenter_uuid: string | null;
  is_admin: boolean;
  comment: string;
  created_at: string;
}

interface Rating {
  id: string;
  admin_username: string;
  user_uuid: string;
  user_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

/* ─── Star Rating Component ─── */
const StarRatingInput: React.FC<{ value: number; onChange: (v: number) => void; size?: number }> = ({ value, onChange, size = 24 }) => (
  <div className="flex gap-1" dir="ltr">
    {[1, 2, 3, 4, 5].map((s) => (
      <button key={s} onClick={() => onChange(s)} className="transition-transform active:scale-90">
        <Star size={size} className={s <= value ? "text-amber-400 fill-amber-400" : "text-white/15"} />
      </button>
    ))}
  </div>
);

const StarDisplay: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <div className="flex gap-0.5" dir="ltr">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} size={size} className={s <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-white/10"} />
    ))}
  </div>
);

/* ─── Main Component ─── */
const AdminProfilePage = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"grid" | "timeline">("grid");

  // New post
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostType, setNewPostType] = useState<"photo" | "video" | "text">("photo");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Post detail / comments
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Ratings
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [showRatings, setShowRatings] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [rateStars, setRateStars] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [hasRated, setHasRated] = useState(false);

  // Admin session
  const adminSession = (() => {
    try {
      const raw = localStorage.getItem("admin_session");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const isOwnProfile = adminSession?.username === uuid;
  const profileUsername = uuid || adminSession?.username || "";
  const currentUserUuid = adminSession?.username || "";

  // Display info
  const displayName = profileUsername;
  const role = adminSession?.role === "owner" ? "مالك" : adminSession?.role === "super_admin" ? "سوبر أدمن" : "مشرف";
  const roleBadgeColor = adminSession?.role === "owner"
    ? "from-amber-500 to-yellow-400"
    : adminSession?.role === "super_admin"
      ? "from-purple-500 to-pink-400"
      : "from-blue-500 to-cyan-400";

  /* ─── Fetch Posts ─── */
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("admin_posts")
      .select("*")
      .eq("username", profileUsername)
      .order("created_at", { ascending: false });
    setPosts((data as AdminPost[]) || []);
    setLoading(false);
  }, [profileUsername]);

  /* ─── Fetch Ratings ─── */
  const fetchRatings = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("admin_ratings")
      .select("*")
      .eq("admin_username", profileUsername)
      .order("created_at", { ascending: false });
    const arr = (data as Rating[]) || [];
    setRatings(arr);
    if (arr.length > 0) {
      setAvgRating(arr.reduce((s, r) => s + r.rating, 0) / arr.length);
    }
    // Check if current user already rated
    if (currentUserUuid) {
      setHasRated(arr.some(r => r.user_uuid === currentUserUuid));
    }
  }, [profileUsername, currentUserUuid]);

  /* ─── Fetch Likes for current user ─── */
  const fetchMyLikes = useCallback(async () => {
    if (!currentUserUuid) return;
    const { data } = await (supabase as any)
      .from("admin_post_likes")
      .select("post_id")
      .eq("liker_uuid", currentUserUuid);
    if (data) setLikedPosts(new Set(data.map((d: any) => d.post_id)));
  }, [currentUserUuid]);

  useEffect(() => {
    fetchPosts();
    fetchRatings();
    fetchMyLikes();
  }, [fetchPosts, fetchRatings, fetchMyLikes]);

  /* ─── Post Actions ─── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("حجم الملف كبير (الحد 8MB)"); return; }
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
        const path = `posts/${profileUsername}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("attachments").upload(path, selectedFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
        thumbnailUrl = mediaUrl;
      }
      if (newPostType === "text" && !caption.trim()) { toast.error("اكتب شيئاً!"); setUploading(false); return; }
      const { error } = await (supabase as any).from("admin_posts").insert({
        user_uuid: profileUsername,
        username: adminSession.display_name || adminSession.username,
        content_type: newPostType,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption.trim() || null,
      });
      if (error) throw error;
      toast.success("تم النشر!");
      setShowNewPost(false);
      setCaption(""); setSelectedFile(null); setPreviewUrl(null);
      fetchPosts();
    } catch (err: any) {
      toast.error(err.message || "فشل النشر");
    } finally { setUploading(false); }
  };

  /* ─── Like ─── */
  const handleLike = async (postId: string) => {
    if (!currentUserUuid) return;
    const isLiked = likedPosts.has(postId);
    if (isLiked) {
      await (supabase as any).from("admin_post_likes").delete().eq("post_id", postId).eq("liker_uuid", currentUserUuid);
      setLikedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p));
    } else {
      await (supabase as any).from("admin_post_likes").insert({ post_id: postId, liker_uuid: currentUserUuid, liker_name: adminSession?.display_name || "" });
      setLikedPosts(prev => new Set(prev).add(postId));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));
    }
  };

  /* ─── Comments ─── */
  const openPostDetail = async (post: AdminPost) => {
    setSelectedPost(post);
    setCommentsLoading(true);
    const { data } = await (supabase as any)
      .from("admin_post_comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments((data as PostComment[]) || []);
    setCommentsLoading(false);
  };

  const submitComment = async () => {
    if (!selectedPost || !newComment.trim()) return;
    const { error } = await (supabase as any).from("admin_post_comments").insert({
      post_id: selectedPost.id,
      commenter_name: adminSession?.display_name || adminSession?.username || "زائر",
      commenter_uuid: currentUserUuid || null,
      is_admin: !!adminSession,
      comment: newComment.trim(),
    });
    if (error) { toast.error("فشل إرسال التعليق"); return; }
    setNewComment("");
    openPostDetail(selectedPost); // refresh
  };

  /* ─── Rating ─── */
  const submitRating = async () => {
    if (!currentUserUuid) return;
    const { error } = await (supabase as any).from("admin_ratings").insert({
      admin_username: profileUsername,
      user_uuid: currentUserUuid,
      user_name: adminSession?.display_name || adminSession?.username || "",
      rating: rateStars,
      comment: rateComment.trim() || null,
    });
    if (error) {
      if (error.code === "23505") toast.error("سبق أن قيّمت هذا الأدمن");
      else toast.error("فشل إرسال التقييم");
      return;
    }
    toast.success("شكراً لتقييمك!");
    setShowRateForm(false);
    setRateStars(5); setRateComment("");
    fetchRatings();
  };

  /* ─── Stats ─── */
  const stats = {
    posts: posts.length,
    rating: avgRating,
    ratingCount: ratings.length,
  };

  const groupedByDay = posts.reduce<Record<string, AdminPost[]>>((acc, post) => {
    const day = new Date(post.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
    if (!acc[day]) acc[day] = [];
    acc[day].push(post);
    return acc;
  }, {});

  return (
    <AdminPageLayout title="الملف الشخصي" showBackButton>
      <div className="px-4 space-y-4 pb-8">

        {/* ─── Profile Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 text-center"
          style={{
            background: 'linear-gradient(160deg, rgba(26,29,53,0.95), rgba(15,18,37,0.98))',
            border: '1.5px solid rgba(195,165,110,0.3)',
            boxShadow: '0 0 30px rgba(195,165,110,0.06)',
          }}
        >
          {/* Avatar */}
          <div className="relative mx-auto w-20 h-20 mb-3">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${roleBadgeColor} p-[2.5px]`}>
              <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-black"
                style={{ background: 'linear-gradient(135deg, #2a2d45, #1a1d35)', color: 'rgba(195,165,110,0.8)' }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#1a1d35]"
              style={{ boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
          </div>

          <h2 className="text-lg font-black text-white">{displayName}</h2>
          <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${roleBadgeColor}`}>
            {role}
          </span>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-xl py-2 px-1"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-lg font-black text-white tabular-nums">{stats.posts}</p>
              <p className="text-[9px] text-white/40 font-bold">المنشورات</p>
            </div>
            <button onClick={() => setShowRatings(true)}
              className="rounded-xl py-2 px-1 text-center transition-colors hover:bg-white/[0.05]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-center gap-1">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="text-lg font-black text-amber-400 tabular-nums">{avgRating.toFixed(1)}</span>
              </div>
              <p className="text-[9px] text-white/40 font-bold">التقييم ({stats.ratingCount})</p>
            </button>
            <div className="rounded-xl py-2 px-1"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-lg font-black text-white tabular-nums">
                {posts.reduce((s, p) => s + (p.likes_count || 0), 0)}
              </p>
              <p className="text-[9px] text-white/40 font-bold">الإعجابات</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            {isOwnProfile && (
              <button onClick={() => setShowNewPost(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))', border: '1px solid rgba(16,185,129,0.3)' }}>
                <Plus size={14} /> نشر حالة جديدة
              </button>
            )}
            {!isOwnProfile && !hasRated && (
              <button onClick={() => setShowRateForm(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold text-amber-400 active:scale-[0.97] transition-all"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Star size={14} /> قيّم هذا الأدمن
              </button>
            )}
            {!isOwnProfile && (
              <button onClick={() => navigate("/admin/chat")}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold text-white/70 active:scale-[0.97] transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <MessageCircle size={14} /> رسالة
              </button>
            )}
          </div>
        </motion.div>

        {/* ─── Tabs ─── */}
        <div className="flex rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: "grid" as const, icon: Grid3X3, label: "المنشورات" },
            { id: "timeline" as const, icon: Clock, label: "اليوميات" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "text-white bg-white/[0.06]"
                  : "text-white/30"
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Content ─── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-white/30" />
            </div>
          ) : activeTab === "grid" ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {posts.map((post) => (
                <button key={post.id} onClick={() => openPostDetail(post)}
                  className="relative aspect-square overflow-hidden group">
                  {post.content_type === "text" ? (
                    <div className="w-full h-full flex items-center justify-center p-2"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(16,185,129,0.1))' }}>
                      <p className="text-[10px] text-white/70 text-center line-clamp-4">{post.caption}</p>
                    </div>
                  ) : post.content_type === "video" ? (
                    <video src={post.media_url || ""} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={post.media_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-3 text-white text-[10px] font-bold">
                      <span className="flex items-center gap-0.5"><Heart size={12} />{post.likes_count}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={12} /></span>
                    </div>
                  </div>
                  {post.content_type === "video" && (
                    <div className="absolute top-1.5 left-1.5"><Video size={12} className="text-white drop-shadow-lg" /></div>
                  )}
                </button>
              ))}
              {posts.length === 0 && (
                <div className="col-span-3 py-16 text-center">
                  <Grid3X3 className="w-10 h-10 mx-auto mb-2 text-white/10" />
                  <p className="text-xs text-white/30">لا توجد منشورات بعد</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4">
              {Object.entries(groupedByDay).map(([day, dayPosts]) => (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <h3 className="text-[11px] font-bold text-white/60">{day}</h3>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>
                  <div className="space-y-2 mr-2 border-r border-white/[0.06] pr-3">
                    {dayPosts.map((post) => (
                      <button key={post.id} onClick={() => openPostDetail(post)} className="w-full text-right">
                        <div className="rounded-xl p-3"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {post.media_url && (
                            <div className="rounded-lg overflow-hidden mb-2">
                              {post.content_type === "video" ? (
                                <video src={post.media_url} className="w-full max-h-40 object-cover rounded-lg" muted />
                              ) : (
                                <img src={post.media_url} alt="" className="w-full max-h-40 object-cover rounded-lg" loading="lazy" />
                              )}
                            </div>
                          )}
                          {post.caption && <p className="text-xs text-white/70 mb-2">{post.caption}</p>}
                          <div className="flex items-center gap-3 text-[10px] text-white/30">
                            <span className="flex items-center gap-0.5"><Heart size={10} />{post.likes_count}</span>
                            <span className="flex items-center gap-0.5"><Eye size={10} />{post.views_count}</span>
                            <span className="mr-auto font-mono">
                              {new Date(post.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {posts.length === 0 && (
                <div className="py-16 text-center">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-white/10" />
                  <p className="text-xs text-white/30">لا توجد يوميات بعد</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ POST DETAIL SHEET (with comments + like) ═══ */}
      <Sheet open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#0c0f1d] border-white/[0.06]" dir="rtl">
          <SheetHeader className="pb-2 border-b border-white/[0.06]">
            <SheetTitle className="text-sm font-bold text-white">تفاصيل المنشور</SheetTitle>
          </SheetHeader>
          {selectedPost && (
            <div className="space-y-3 pt-3">
              {/* Media */}
              {selectedPost.media_url && (
                <div className="rounded-xl overflow-hidden">
                  {selectedPost.content_type === "video" ? (
                    <video src={selectedPost.media_url} className="w-full max-h-64 object-cover rounded-xl" controls />
                  ) : (
                    <img src={selectedPost.media_url} alt="" className="w-full max-h-64 object-cover rounded-xl" />
                  )}
                </div>
              )}

              {/* Caption */}
              {selectedPost.caption && <p className="text-sm text-white/80">{selectedPost.caption}</p>}

              {/* Like + info */}
              <div className="flex items-center gap-3">
                <button onClick={() => handleLike(selectedPost.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                    likedPosts.has(selectedPost.id)
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                      : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
                  }`}>
                  <Heart size={14} className={likedPosts.has(selectedPost.id) ? "fill-rose-400" : ""} />
                  {selectedPost.likes_count}
                </button>
                <span className="text-[10px] text-white/30 font-mono">
                  {new Date(selectedPost.created_at).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {/* Comments */}
              <div className="border-t border-white/[0.06] pt-3">
                <p className="text-[10px] font-bold text-white/40 mb-2">التعليقات</p>
                {commentsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white/20 mx-auto my-4" />
                ) : comments.length === 0 ? (
                  <p className="text-[10px] text-white/20 text-center py-4">لا توجد تعليقات</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-lg px-3 py-2"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-white/70">{c.commenter_name}</span>
                          {c.is_admin && (
                            <span className="text-[7px] px-1 py-px rounded bg-amber-500/15 text-amber-400 font-bold">أدمن</span>
                          )}
                          <span className="text-[8px] text-white/20 mr-auto font-mono">
                            {new Date(c.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                <div className="flex gap-2 mt-2">
                  <Input value={newComment} onChange={e => setNewComment(e.target.value)}
                    placeholder="اكتب تعليقاً..."
                    className="flex-1 bg-white/[0.04] border-white/[0.08] text-xs h-9 rounded-xl" dir="rtl"
                    onKeyDown={e => e.key === "Enter" && submitComment()} />
                  <button onClick={submitComment} disabled={!newComment.trim()}
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30 transition-all"
                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <Send size={14} className="text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ RATINGS LIST SHEET ═══ */}
      <Sheet open={showRatings} onOpenChange={setShowRatings}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[75vh] overflow-y-auto bg-[#0c0f1d] border-white/[0.06]" dir="rtl">
          <SheetHeader className="pb-2 border-b border-white/[0.06]">
            <SheetTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400" /> التقييمات ({ratings.length})
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 pt-3">
            {/* Average */}
            <div className="text-center py-3 rounded-xl mb-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-3xl font-black text-amber-400 tabular-nums">{avgRating.toFixed(1)}</span>
                <StarDisplay value={avgRating} size={18} />
              </div>
              <p className="text-[10px] text-white/30">{ratings.length} تقييم</p>
            </div>

            {ratings.map(r => (
              <div key={r.id} className="rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white/70">{r.user_name || "مجهول"}</span>
                  <StarDisplay value={r.rating} size={12} />
                </div>
                {r.comment && <p className="text-[10px] text-white/40">{r.comment}</p>}
                <p className="text-[8px] text-white/15 mt-1 font-mono">
                  {new Date(r.created_at).toLocaleDateString("ar-SA")}
                </p>
              </div>
            ))}
            {ratings.length === 0 && (
              <p className="text-center text-xs text-white/20 py-8">لا توجد تقييمات بعد</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ RATE FORM SHEET ═══ */}
      <Sheet open={showRateForm} onOpenChange={setShowRateForm}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-[#0c0f1d] border-white/[0.06]" dir="rtl">
          <SheetHeader className="pb-2 border-b border-white/[0.06]">
            <SheetTitle className="text-sm font-bold text-white">قيّم {displayName}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            <div className="text-center">
              <p className="text-xs text-white/40 mb-3">اختر عدد النجوم:</p>
              <div className="flex justify-center">
                <StarRatingInput value={rateStars} onChange={setRateStars} size={32} />
              </div>
            </div>
            <Textarea value={rateComment} onChange={e => setRateComment(e.target.value)}
              placeholder="تعليق (اختياري)..."
              className="bg-white/[0.04] border-white/[0.08] min-h-[60px] rounded-xl text-xs" dir="rtl" />
            <button onClick={submitRating}
              className="w-full h-10 rounded-xl text-xs font-bold text-white active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))', border: '1px solid rgba(245,158,11,0.3)' }}>
              إرسال التقييم
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ NEW POST DIALOG ═══ */}
      <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
        <DialogContent className="bg-[#0c0f1d] border-white/[0.06] max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white">منشور جديد</DialogTitle>
          </DialogHeader>
          <div className="flex gap-1.5 mb-3">
            {([
              { id: "photo" as const, icon: Image, label: "صورة" },
              { id: "video" as const, icon: Video, label: "فيديو" },
              { id: "text" as const, icon: Type, label: "نص" },
            ]).map((t) => (
              <button key={t.id} onClick={() => { setNewPostType(t.id); setSelectedFile(null); setPreviewUrl(null); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                  newPostType === t.id
                    ? "bg-white/[0.08] text-white border border-white/[0.12]"
                    : "text-white/30 border border-transparent"
                }`}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
          {newPostType !== "text" && (
            <div className="mb-3">
              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden">
                  {newPostType === "video" ? (
                    <video src={previewUrl} className="w-full max-h-48 object-cover rounded-xl" controls muted />
                  ) : (
                    <img src={previewUrl} alt="" className="w-full max-h-48 object-cover rounded-xl" />
                  )}
                  <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-8 rounded-xl cursor-pointer transition-colors"
                  style={{ border: '2px dashed rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                  <Upload size={24} className="text-white/20 mb-2" />
                  <span className="text-[10px] text-white/30">اختر {newPostType === "photo" ? "صورة" : "فيديو"} (حد 8MB)</span>
                  <input type="file" accept={newPostType === "photo" ? "image/*" : "video/*"} onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>
          )}
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)}
            placeholder={newPostType === "text" ? "اكتب منشورك..." : "تعليق (اختياري)..."}
            className="bg-white/[0.04] border-white/[0.08] min-h-[60px] rounded-xl text-xs" dir="rtl" />
          <button onClick={handleSubmitPost} disabled={uploading || (newPostType !== "text" && !selectedFile)}
            className="w-full h-10 rounded-xl text-xs font-bold text-white disabled:opacity-30 mt-2 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))', border: '1px solid rgba(16,185,129,0.3)' }}>
            {uploading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "نشر"}
          </button>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
};

export default AdminProfilePage;
