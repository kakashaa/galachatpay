import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Send, ArrowRight, CheckCheck, Clock, Paperclip, Image, Video, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import VoiceRecorder from "@/components/support/VoiceRecorder";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ChatMsg {
  id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const VipChat: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [roomId, setRoomId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("idle");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const vipLevel = Number(user?.vip?.vip_level ?? user?.vip?.level ?? 0);

  // Redirect if not VIP 5+
  useEffect(() => {
    if (!user || vipLevel < 5) navigate("/support");
  }, [user, vipLevel, navigate]);

  // Check for existing open session
  useEffect(() => {
    if (!user) return;
    const checkSession = async () => {
      const { data } = await supabase
        .from("support_chat_sessions")
        .select("*")
        .eq("user_uuid", user.uuid)
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const s = data[0] as any;
        setSessionId(s.id);
        setSessionStatus(s.status);
        setRoomId(s.room_id || "");
        loadMessages(s.id);
      }
    };
    checkSession();
  }, [user]);

  const loadMessages = async (chatId: string) => {
    const { data } = await supabase
      .from("support_chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as any);
  };

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`vip-chat-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_chat_messages",
        filter: `chat_id=eq.${sessionId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as any]);
        scrollToBottom();
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "support_chat_sessions",
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        setSessionStatus((payload.new as any).status);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 60);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Start new chat session
  const startSession = async () => {
    if (!user || !roomId.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("support_chat_sessions")
        .insert({
          user_uuid: user.uuid,
          user_name: user.name,
          room_id: roomId.trim(),
          vip_level: vipLevel,
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;
      const session = data as any;
      setSessionId(session.id);
      setSessionStatus("waiting");

      // Send welcome message
      await supabase.from("support_chat_messages").insert({
        chat_id: session.id,
        sender_type: "system",
        sender_name: "النظام",
        sender_uuid: "system",
        message: `مرحباً ${user.name}!\nتم فتح جلسة دعم سريع.\nرقم الغرفة: ${roomId.trim()}\nسيتم توصيلك بالسوبر أدمن قريباً...`,
      });

      // Send notification to admin
      await supabase.from("notifications").insert({
        title: "طلب دعم سريع VIP",
        body: `${user.name} (VIP ${vipLevel}) يطلب دعم سريع في الغرفة ${roomId.trim()}`,
        target: "admin",
        user_uuid: user.uuid,
      });

      loadMessages(session.id);
    } catch {
      // ignore
    }
    setSending(false);
  };

  const sendMessageWithMedia = async (text: string, mediaUrl?: string) => {
    if (!user || !sessionId) return;
    await supabase.from("support_chat_messages").insert({
      chat_id: sessionId,
      sender_type: "user",
      sender_name: user.name,
      sender_uuid: user.uuid,
      message: text,
      media_url: mediaUrl || null,
    });
  };

  const handleSendText = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    await sendMessageWithMedia(msg);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "photo" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = type === "video" ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(type === "video" ? "الحد الأقصى 8MB" : "الحد الأقصى 5MB");
      return;
    }
    setUploading(true);
    setShowAttach(false);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `vip-chat/${sessionId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path);
      await sendMessageWithMedia(type === "photo" ? "📷 صورة" : "🎥 فيديو", urlData.publicUrl);
    } catch {
      toast.error("فشل رفع الملف");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  };

  if (!user) return null;

  // Step 1: Enter room ID
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <button onClick={() => navigate("/support")} className="text-primary text-sm font-bold flex items-center gap-1">
            رجوع <ArrowRight className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-foreground">الدعم السريع</h1>
          <div className="w-12" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-6">
          <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center">
            <Crown className="w-10 h-10 text-primary-foreground" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-foreground">مرحباً {user.name}!</h2>
            <p className="text-sm text-muted-foreground">
              اكتب رقم الغرفة عشان السوبر أدمن يجي يساعدك
            </p>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="رقم الغرفة..."
              dir="ltr"
              className="w-full h-12 rounded-xl bg-muted/30 border border-border/30 text-center text-foreground placeholder:text-muted-foreground text-sm px-4 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            <button
              onClick={startSession}
              disabled={!roomId.trim() || sending}
              className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  ابدأ المحادثة
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Chat view
  return (
    <div className="min-h-screen bg-background flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/50 backdrop-blur">
        <button onClick={() => navigate("/support")} className="text-primary text-sm font-bold flex items-center gap-1">
          رجوع <ArrowRight className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold text-foreground">الدعم السريع</h1>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            {sessionStatus === "waiting" && <><Clock className="w-3 h-3 text-amber-400" /> بانتظار الأدمن...</>}
            {sessionStatus === "active" && <><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> متصل</>}
            {sessionStatus === "closed" && "المحادثة مغلقة"}
          </p>
        </div>
        <div className="w-12 text-[10px] text-muted-foreground text-left" dir="ltr">#{roomId}</div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {messages.map((msg) => {
          const isUser = msg.sender_type === "user";
          const isSystem = msg.sender_type === "system";
          const mediaUrl = (msg as any).media_url;
          const isImg = mediaUrl && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(mediaUrl);
          const isVid = mediaUrl && /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl);
          const isAudio = mediaUrl && /\.(webm|ogg|mp3|wav|m4a)(\?|$)/i.test(mediaUrl) && !isVid;

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-muted/20 rounded-xl px-4 py-2 max-w-[85%]">
                  <p className="text-[11px] text-muted-foreground text-center whitespace-pre-line">{msg.message}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                isUser
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted/30 border border-border/20 text-foreground rounded-bl-md"
              }`}>
                {!isUser && (
                  <p className="text-[10px] font-bold text-primary mb-0.5">{msg.sender_name}</p>
                )}
                {isImg && (
                  <img src={mediaUrl} alt="" className="rounded-lg max-w-full max-h-48 object-cover mb-1 cursor-pointer" onClick={() => setPreviewImage(mediaUrl)} />
                )}
                {isVid && (
                  <video src={mediaUrl} controls className="rounded-lg max-w-full max-h-48 mb-1" />
                )}
                {isAudio && (
                  <audio controls src={mediaUrl} className="max-w-full mb-1" />
                )}
                {!(isImg || isVid || isAudio) && (
                  <p className="text-[13px] leading-relaxed whitespace-pre-line">{msg.message}</p>
                )}
                <div className={`flex items-center gap-1 mt-1 ${isUser ? "justify-end" : "justify-start"}`}>
                  <span className="text-[9px] opacity-60">{formatTime(msg.created_at)}</span>
                  {isUser && <CheckCheck className={`w-3 h-3 ${msg.is_read ? "text-blue-300" : "opacity-40"}`} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/90 border-0">
          {previewImage && <img src={previewImage} alt="" className="w-full h-full object-contain" />}
        </DialogContent>
      </Dialog>

      {/* Input */}
      {sessionStatus !== "closed" ? (
        <div className="px-3 py-2.5 border-t border-border/30 bg-card/50 backdrop-blur">
          {/* Attachment sheet */}
          <AnimatePresence>
            {showAttach && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="flex gap-3 justify-center pb-2">
                <label className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-xl hover:bg-muted/20 transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10">
                    <Image className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">صورة</span>
                  <input ref={photoRef} type="file" accept="image/*" onChange={e => handleMediaUpload(e, "photo")} className="hidden" />
                </label>
                <label className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-xl hover:bg-muted/20 transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent/10">
                    <Video className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">فيديو</span>
                  <input ref={videoRef} type="file" accept="video/*" onChange={e => handleMediaUpload(e, "video")} className="hidden" />
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowAttach(!showAttach)} className="p-2 rounded-full hover:bg-muted/20 transition-colors">
              {uploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Paperclip className="w-5 h-5 text-muted-foreground" />}
            </button>
            <input
              value={input}
              onChange={(e) => { setInput(e.target.value); setShowAttach(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              placeholder="اكتب رسالتك..."
              className="flex-1 h-10 rounded-full bg-muted/30 border border-border/20 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
              dir="rtl"
            />
            {input.trim() ? (
              <button
                onClick={handleSendText}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            ) : (
              <VoiceRecorder
                userUuid={user.uuid}
                onVoiceSent={async (url) => {
                  await sendMessageWithMedia("🎤 رسالة صوتية", url);
                }}
                disabled={sending || uploading}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-center border-t border-border/30">
          <p className="text-xs text-muted-foreground">تم إغلاق المحادثة</p>
        </div>
      )}
    </div>
  );
};

export default VipChat;
