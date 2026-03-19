import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, ArrowRight, Loader2, Users, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: number;
  sender_type: string;
  sender_name: string;
  message: string;
  attachment_url?: string | null;
  created_at: string;
}

interface Props {
  chatKey: string;
  userUuid: string;
  userName: string;
  chatType: "quick" | "normal";
  queuePosition?: number;
  onBack: () => void;
  onEnded?: () => void;
}

const LiveSupportChat: React.FC<Props> = ({
  chatKey, userUuid, userName, chatType: _chatType, queuePosition: initialQueue, onBack, onEnded
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatStatus, setChatStatus] = useState<string>("active");
  const [queuePos, setQueuePos] = useState(initialQueue || 0);
  const [ended, setEnded] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch messages directly from external API via edge function
  const fetchMessages = useCallback(async () => {
    try {
      const result = await supabase.functions.invoke("support-chat", {
        body: { action: "messages", chat_key: chatKey, after_id: lastMsgIdRef.current },
      });
      const data = result.data;
      if (data?.ok && data?.messages?.length) {
        const newMsgs: Message[] = data.messages.map((m: any) => ({
          id: m.id,
          sender_type: m.sender_type,
          sender_name: m.sender_name || "",
          message: m.message || "",
          attachment_url: m.attachment_url || null,
          created_at: m.created_at,
        }));
        const maxId = Math.max(...newMsgs.map(m => m.id));
        if (maxId > lastMsgIdRef.current) lastMsgIdRef.current = maxId;

        setMessages(prev => {
          // Merge: add only new IDs, replace temp messages
          const existingIds = new Set(prev.filter(p => typeof p.id === "number").map(p => p.id));
          const brandNew = newMsgs.filter(m => !existingIds.has(m.id));
          if (brandNew.length === 0) return prev;

          // Remove temp messages that match new real messages
          const cleaned = prev.filter(p => {
            if (typeof p.id === "number") return true;
            return !brandNew.some(r =>
              r.sender_type === p.sender_type &&
              (r.message === p.message || (r.attachment_url && r.attachment_url === p.attachment_url))
            );
          });

          // Check system messages for end signal
          for (const m of brandNew) {
            if (m.sender_type === "system" && m.message.includes("إنهاء")) {
              setEnded(true);
              onEnded?.();
            }
            if (m.sender_type === "admin") {
              toast.success("رد جديد من الدعم!");
            }
          }

          return [...cleaned, ...brandNew].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }
      if (!initialLoaded) setInitialLoaded(true);
    } catch {
      if (!initialLoaded) setInitialLoaded(true);
    }
  }, [chatKey, onEnded, initialLoaded]);

  // Poll status from external API
  const pollStatus = useCallback(async () => {
    try {
      const result = await supabase.functions.invoke("support-chat", {
        body: { action: "status", chat_key: chatKey },
      });
      const data = result.data;
      if (data?.ok) {
        const chat = data.chat;
        const newStatus = chat?.status || data.status || "active";
        setChatStatus(newStatus);
        if (data.queue_position) setQueuePos(data.queue_position);
        if ((newStatus === "ended" || newStatus === "closed") && chat?.ended_at) {
          setEnded(true);
          onEnded?.();
        }
      }
    } catch { /* silent */ }
  }, [chatKey, onEnded]);

  // Start polling every 2 seconds
  useEffect(() => {
    fetchMessages();
    pollStatus();
    pollRef.current = setInterval(() => {
      fetchMessages();
      pollStatus();
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages, pollStatus]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `support-chat/${chatKey}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (e) {
      console.error("[LiveSupportChat] Upload error:", e);
      toast.error("فشل رفع الصورة");
      return null;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("الحد الأقصى 5 ميجابايت");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || ended || sending) return;
    const msgText = input.trim();
    setSending(true);
    setInput("");

    let attachmentUrl: string | null = null;
    if (imageFile) {
      attachmentUrl = await uploadImage(imageFile);
      clearImage();
    }

    // Optimistic: add message to UI immediately with temp id
    const tempId = `temp-${Date.now()}` as any;
    const optimisticMsg: Message = {
      id: tempId,
      sender_type: "user",
      sender_name: userName,
      message: msgText || (attachmentUrl ? "📷 صورة" : ""),
      attachment_url: attachmentUrl,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await supabase.functions.invoke("support-chat", {
        body: {
          action: "send",
          chat_key: chatKey,
          message: msgText || (attachmentUrl ? "📷 صورة" : ""),
          sender_type: "user",
          sender_name: userName,
          user_uuid: userUuid,
          attachment_url: attachmentUrl,
        },
      });
    } catch {
      toast.error("فشل إرسال الرسالة");
      setInput(msgText);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  const handleEnd = async () => {
    try {
      await supabase.functions.invoke("support-chat", {
        body: { action: "end", chat_key: chatKey },
      });
      setEnded(true);
      toast.success("تم إنهاء المحادثة");
    } catch { /* silent */ }
  };

  const formatTime = (d: string) => {
    try {
      return new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/20 bg-card/50 space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-primary text-sm font-bold">
            <ArrowRight className="w-4 h-4" /> رجوع
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${ended ? "bg-muted-foreground" : chatStatus === "active" ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
            <span className="text-xs font-bold text-foreground">
              {ended ? "انتهت المحادثة" : chatStatus === "waiting" ? "بالانتظار..." : "محادثة مباشرة"}
            </span>
          </div>
          {!ended && (
            <button onClick={handleEnd} className="text-[10px] text-destructive font-bold px-2 py-1 rounded-lg bg-destructive/10 border border-destructive/20">
              إنهاء
            </button>
          )}
          {ended && <div className="w-12" />}
        </div>
        {/* Admin profile bar */}
        {(() => {
          const adminMsg = messages.find(m => m.sender_type === "admin");
          if (!adminMsg) return null;
          return (
            <div className="flex items-center gap-2 bg-muted/20 rounded-xl px-3 py-2 border border-border/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">{(adminMsg.sender_name || "A").charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{adminMsg.sender_name || "فريق الدعم"}</p>
                <p className="text-[9px] text-muted-foreground">أدمن الدعم</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Queue banner */}
      <AnimatePresence>
        {chatStatus === "waiting" && queuePos > 0 && !ended && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400 font-bold">أنت بالانتظار • ترتيبك: #{queuePos}</span>
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map((msg) => {
          if (msg.sender_type === "system") {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-muted/20 rounded-full px-4 py-1.5 border border-border/20">
                  <p className="text-[10px] text-muted-foreground text-center">{msg.message}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`max-w-[80%] rounded-2xl p-3 ${
                  msg.sender_type === "user"
                    ? "bg-primary/15 border border-primary/25 rounded-tr-md"
                    : "bg-muted/30 border border-border/20 rounded-tl-md"
                }`}
              >
                {msg.sender_type === "admin" && (
                  <p className="text-[10px] font-bold text-emerald-400 mb-1">{msg.sender_name || "فريق الدعم"}</p>
                )}
                {/* Attachment image */}
                {msg.attachment_url && isImageUrl(msg.attachment_url) && (
                  <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                    <img
                      src={msg.attachment_url}
                      alt="مرفق"
                      className="rounded-lg max-h-48 w-auto object-cover border border-border/20"
                      loading="lazy"
                    />
                  </a>
                )}
                {msg.attachment_url && !isImageUrl(msg.attachment_url) && (
                  <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-primary underline block mb-1">📎 مرفق</a>
                )}
                {msg.message && msg.message !== "📷 صورة" && (
                  <p className="text-xs text-foreground whitespace-pre-line">{msg.message}</p>
                )}
                <p className="text-[9px] text-muted-foreground mt-1">{formatTime(msg.created_at)}</p>
              </motion.div>
            </div>
          );
        })}
        {messages.length === 0 && !ended && !initialLoaded && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">جاري الاتصال بفريق الدعم...</p>
          </div>
        )}
        {messages.length === 0 && !ended && initialLoaded && (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">ابدأ المحادثة بإرسال رسالة 💬</p>
          </div>
        )}
        {ended && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-sm font-bold text-foreground mb-1">انتهت المحادثة</p>
            <p className="text-xs text-muted-foreground">شكراً لتواصلك مع فريق الدعم</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-t border-border/10 bg-card/50"
          >
            <div className="relative inline-block">
              <img src={imagePreview} alt="preview" className="h-20 rounded-lg border border-border/30 object-cover" />
              <button
                onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
              >
                <X className="w-3 h-3 text-destructive-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      {!ended && (
        <div className="px-4 py-2 border-t border-border/10 bg-card/50">
          <div className="flex gap-2 items-center">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="w-10 h-10 rounded-xl bg-muted/20 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="اكتب رسالتك..."
              className="flex-1 h-10 px-3 bg-muted/20 rounded-xl text-foreground placeholder:text-muted-foreground border border-border/30 focus:border-primary outline-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !imageFile) || sending}
              className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            >
              {sending ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Send className="w-4 h-4 text-primary-foreground" />}
            </button>
          </div>
        </div>
      )}
      {ended && (
        <div className="px-4 py-3 border-t border-border/10 bg-card/50">
          <button onClick={onBack} className="w-full h-11 rounded-xl border border-primary/30 text-primary font-bold bg-primary/5 active:scale-95 transition-transform">
            رجوع
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveSupportChat;
