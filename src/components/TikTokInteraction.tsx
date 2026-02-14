import React, { useState, useEffect, useCallback } from "react";
import { Heart, MessageCircle, Send, Reply, Trash2, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Comment {
  id: string;
  item_type: string;
  item_id: string;
  user_uuid: string;
  user_name: string;
  user_image: string | null;
  parent_id: string | null;
  body: string;
  created_at: string;
  replies?: Comment[];
}

interface TikTokInteractionProps {
  itemType: "entry_gift" | "frame" | "custom_gift" | "video_tutorial";
  itemId: string;
}

const TikTokInteraction: React.FC<TikTokInteractionProps> = ({ itemType, itemId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<{ count: number; liked: boolean }>({ count: 0, liked: false });
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [animateLike, setAnimateLike] = useState(false);

  const fetchData = useCallback(async () => {
    const [commentsRes, likesRes] = await Promise.all([
      supabase
        .from("item_comments")
        .select("*")
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .order("created_at", { ascending: true }) as any,
      supabase
        .from("item_likes")
        .select("*")
        .eq("item_type", itemType)
        .eq("item_id", itemId) as any,
    ]);

    if (commentsRes.data) {
      const all = commentsRes.data as Comment[];
      const topLevel = all.filter(c => !c.parent_id);
      topLevel.forEach(c => {
        c.replies = all.filter(r => r.parent_id === c.id);
      });
      setComments(topLevel);
    }

    if (likesRes.data) {
      const likesData = likesRes.data as any[];
      setLikes({
        count: likesData.length,
        liked: user ? likesData.some(l => l.user_uuid === user.uuid) : false,
      });
    }
  }, [itemType, itemId, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleLike = async () => {
    if (!user) { toast.error("سجل دخولك أولاً"); return; }
    if (likes.liked) {
      await (supabase.from("item_likes").delete() as any)
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .eq("user_uuid", user.uuid);
    } else {
      setAnimateLike(true);
      setTimeout(() => setAnimateLike(false), 600);
      await supabase.from("item_likes").insert({
        item_type: itemType,
        item_id: itemId,
        user_uuid: user.uuid,
      } as any);
    }
    fetchData();
  };

  const handleSend = async () => {
    if (!user) { toast.error("سجل دخولك أولاً"); return; }
    if (!body.trim()) return;
    setSending(true);
    try {
      await supabase.from("item_comments").insert({
        item_type: itemType,
        item_id: itemId,
        user_uuid: user.uuid,
        user_name: user.name,
        user_image: user.profile?.image || null,
        parent_id: replyTo?.id || null,
        body: body.trim(),
      } as any);
      setBody("");
      setReplyTo(null);
      fetchData();
    } catch {
      toast.error("فشل الإرسال");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;
    await (supabase.from("item_comments").delete() as any)
      .eq("id", commentId)
      .eq("user_uuid", user.uuid);
    fetchData();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `${mins}د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}س`;
    return `${Math.floor(hrs / 24)}ي`;
  };

  const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <>
      {/* TikTok-style sidebar buttons - positioned absolute on the right */}
      <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-5">
        {/* Like button */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <motion.div
            animate={animateLike ? { scale: [1, 1.5, 1] } : {}}
            transition={{ duration: 0.4 }}
            className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <Heart className={`w-6 h-6 transition-all ${likes.liked ? "fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "text-white"}`} />
          </motion.div>
          <span className="text-[11px] font-bold text-white drop-shadow-lg">{likes.count || ""}</span>
        </button>

        {/* Comment button */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-lg">{totalComments || ""}</span>
        </button>
      </div>

      {/* Comments Bottom Sheet */}
      <AnimatePresence>
        {showComments && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="absolute inset-0 bg-black/40 z-40"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[65vh] flex flex-col"
            >
              {/* Handle + header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{totalComments} تعليق</span>
                </div>
                <button onClick={() => setShowComments(false)} className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" dir="rtl">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">لا توجد تعليقات بعد</p>
                    <p className="text-[10px] text-muted-foreground/60">كن أول من يعلق!</p>
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="space-y-2.5">
                      <CommentBubble
                        comment={c}
                        isOwn={user?.uuid === c.user_uuid}
                        onReply={() => setReplyTo(c)}
                        onDelete={() => handleDelete(c.id)}
                        timeAgo={timeAgo}
                      />
                      {c.replies?.map(r => (
                        <div key={r.id} className="mr-8">
                          <CommentBubble
                            comment={r}
                            isOwn={user?.uuid === r.user_uuid}
                            onDelete={() => handleDelete(r.id)}
                            timeAgo={timeAgo}
                            isReply
                          />
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* Reply indicator */}
              {replyTo && (
                <div className="px-4 py-1.5 bg-primary/5 flex items-center justify-between" dir="rtl">
                  <span className="text-[11px] text-primary font-medium">↩ رد على {replyTo.user_name}</span>
                  <button onClick={() => setReplyTo(null)} className="text-[11px] text-destructive font-bold">✕</button>
                </div>
              )}

              {/* Input */}
              {user ? (
                <div className="flex items-center gap-2 px-4 py-3 border-t border-border/20 bg-background">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted/50 flex-shrink-0">
                    {user.profile?.image ? (
                      <img src={user.profile.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {user.name?.[0]}
                      </div>
                    )}
                  </div>
                  <input
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={replyTo ? `رد على ${replyTo.user_name}...` : "أضف تعليقاً..."}
                    className="flex-1 bg-muted/20 border border-border/20 rounded-full px-4 py-2.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    dir="rtl"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !body.trim()}
                    className="w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                  >
                    <Send className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-border/20 text-center">
                  <p className="text-xs text-muted-foreground">سجل دخولك للتعليق</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

/* ---- Sub-component ---- */
const CommentBubble: React.FC<{
  comment: Comment;
  isOwn: boolean;
  onReply?: () => void;
  onDelete: () => void;
  timeAgo: (s: string) => string;
  isReply?: boolean;
}> = ({ comment, isOwn, onReply, onDelete, timeAgo, isReply }) => (
  <div className="flex gap-2.5">
    <div className="w-8 h-8 rounded-full bg-muted/50 overflow-hidden flex-shrink-0">
      {comment.user_image ? (
        <img src={comment.user_image} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
          {comment.user_name[0]}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-foreground">{comment.user_name}</span>
        <span className="text-[9px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-xs text-foreground/80 break-words mt-0.5 leading-relaxed">{comment.body}</p>
      <div className="flex items-center gap-3 mt-1">
        {!isReply && onReply && (
          <button onClick={onReply} className="text-[10px] text-primary font-bold flex items-center gap-0.5">
            <Reply className="w-3 h-3" /> رد
          </button>
        )}
        {isOwn && (
          <button onClick={onDelete} className="text-[10px] text-destructive/60 hover:text-destructive">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  </div>
);

export default TikTokInteraction;
