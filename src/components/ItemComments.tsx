import React, { useState, useEffect, useCallback } from "react";
import { Heart, MessageCircle, Send, Reply, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

interface ItemCommentsProps {
  itemType: "entry_gift" | "frame" | "custom_gift";
  itemId: string;
}

const ItemComments: React.FC<ItemCommentsProps> = ({ itemType, itemId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<{ count: number; liked: boolean }>({ count: 0, liked: false });
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [showComments, setShowComments] = useState(false);

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
      // Nest replies
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleLike = async () => {
    if (!user) { toast.error("سجل دخولك أولاً"); return; }
    if (likes.liked) {
      await (supabase.from("item_likes").delete() as any)
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .eq("user_uuid", user.uuid);
    } else {
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

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`flex gap-2 ${isReply ? "mr-6" : ""}`}>
      <div className="w-7 h-7 rounded-full bg-muted/50 overflow-hidden flex-shrink-0">
        {comment.user_image ? (
          <img src={comment.user_image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
            {comment.user_name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-muted/20 rounded-xl px-3 py-2">
          <p className="text-[11px] font-bold text-foreground">{comment.user_name}</p>
          <p className="text-xs text-foreground/80 break-words">{comment.body}</p>
        </div>
        <div className="flex items-center gap-3 mt-0.5 px-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          {!isReply && (
            <button
              onClick={() => setReplyTo(comment)}
              className="text-[10px] text-primary font-bold flex items-center gap-0.5"
            >
              <Reply className="w-3 h-3" /> رد
            </button>
          )}
          {user?.uuid === comment.user_uuid && (
            <button
              onClick={() => handleDelete(comment.id)}
              className="text-[10px] text-destructive/60 hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="border-t border-border/20">
      {/* Like & Comment toggle bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="flex items-center gap-1">
            <Heart className={`w-5 h-5 transition-colors ${likes.liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
            {likes.count > 0 && <span className="text-xs font-bold text-muted-foreground">{likes.count}</span>}
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1">
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            {totalComments > 0 && <span className="text-xs font-bold text-muted-foreground">{totalComments}</span>}
          </button>
        </div>
        {totalComments > 0 && (
          <button onClick={() => setShowComments(!showComments)} className="text-[10px] text-primary font-bold flex items-center gap-0.5">
            {showComments ? "إخفاء" : `عرض ${totalComments} تعليق`}
            {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Comments list */}
      {showComments && comments.length > 0 && (
        <div className="px-4 pb-2 space-y-3 max-h-[250px] overflow-y-auto" dir="rtl">
          {comments.map(c => (
            <div key={c.id} className="space-y-2">
              {renderComment(c)}
              {c.replies?.map(r => renderComment(r, true))}
            </div>
          ))}
        </div>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 pb-1 flex items-center gap-2">
          <span className="text-[10px] text-primary">رد على {replyTo.user_name}</span>
          <button onClick={() => setReplyTo(null)} className="text-[10px] text-destructive">✕</button>
        </div>
      )}

      {/* Comment input */}
      {user && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={replyTo ? `رد على ${replyTo.user_name}...` : "أضف تعليقاً..."}
            className="flex-1 bg-muted/20 border border-border/20 rounded-full px-3 py-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            dir="rtl"
          />
          <button
            onClick={handleSend}
            disabled={sending || !body.trim()}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemComments;
