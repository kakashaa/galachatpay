import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, ArrowRight, Loader2, Users, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ChatBubble from "@/components/chat/ChatBubble";

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

  const fetchMessages = useCallback(async () => {
    try {
      const result = await supabase.functions.invoke("support-chat", {
        body: { action: "messages", chat_key: chatKey, after_id: lastMsgIdRef.current },
      });
      const data = result.data;
      if (data?.ok && data?.messages?.length) {
        const newMsgs: Message[] = data.messages.map((m: any) => ({
          id: m.id, sender_type: m.sender_type, sender_name: m.sender_name || "",
          message: m.message || "", attachment_url: m.attachment_url || null, created_at: m.created_at,
        }));
        const maxId = Math.max(...newMsgs.map(m => m.id));
        if (maxId > lastMsgIdRef.current) lastMsgIdRef.current = maxId;
        setMessages(prev => {
          const existingIds = new Set(prev.filter(p => typeof p.id === "number").map(p => p.id));
          const brandNew = newMsgs.filter(m => !existingIds.has(m.id));
          if (brandNew.length === 0) return prev;
          const cleaned = prev.filter(p => {
            if (typeof p.id === "number") return true;
            return !brandNew.some(r => r.sender_type === p.sender_type && (r.message === p.message || (r.attachment_url && r.attachment_url === p.attachment_url)));
          });
          for (const m of brandNew) {
            if (m.sender_type === "system" && m.message.includes("إنهاء")) { setEnded(true); onEnded?.(); }
            if (m.sender_type === "admin") toast.success("رد جديد من الدعم!");
          }
          return [...cleaned, ...brandNew].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      }
      if (!initialLoaded) setInitialLoaded(true);
    } catch { if (!initialLoaded) setInitialLoaded(true); }
  }, [chatKey, onEnded, initialLoaded]);

  const pollStatus = useCallback(async () => {
    try {
      const result = await supabase.functions.invoke("support-chat", { body: { action: "status", chat_key: chatKey } });
      const data = result.data;
      if (data?.ok) {
        const chat = data.chat;
        const newStatus = chat?.status || data.status || "active";
        setChatStatus(newStatus);
        if (data.queue_position) setQueuePos(data.queue_position);
        if ((newStatus === "ended" || newStatus === "closed") && chat?.ended_at) { setEnded(true); onEnded?.(); }
      }
    } catch { /* silent */ }
  }, [chatKey, onEnded]);

  useEffect(() => {
    fetchMessages(); pollStatus();
    pollRef.current = setInterval(() => { fetchMessages(); pollStatus(); }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages, pollStatus]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `support-chat/${chatKey}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
      return urlData.publicUrl;
    } catch { toast.error("فشل رفع الصورة"); return null; }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("يرجى اختيار صورة فقط"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("الحد الأقصى 5 ميجابايت"); return; }
    setImageFile(file); setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || ended || sending) return;
    const msgText = input.trim(); setSending(true); setInput("");
    let attachmentUrl: string | null = null;
    if (imageFile) { attachmentUrl = await uploadImage(imageFile); clearImage(); }
    const tempId = `temp-${Date.now()}` as any;
    const optimisticMsg: Message = {
      id: tempId, sender_type: "user", sender_name: userName,
      message: msgText || (attachmentUrl ? "📷 صورة" : ""), attachment_url: attachmentUrl, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    try {
      await supabase.functions.invoke("support-chat", {
        body: { action: "send", chat_key: chatKey, message: msgText || (attachmentUrl ? "📷 صورة" : ""),
          sender_type: "user", sender_name: userName, user_uuid: userUuid, attachment_url: attachmentUrl },
      });
    } catch {
      toast.error("فشل إرسال الرسالة"); setInput(msgText);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  const handleEnd = async () => {
    try { await supabase.functions.invoke("support-chat", { body: { action: "end", chat_key: chatKey } }); setEnded(true); toast.success("تم إنهاء المحادثة"); }
    catch { /* silent */ }
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: "hsl(var(--chat-bg))" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "hsl(var(--chat-header-bg))", backdropFilter: "blur(20px)", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "hsl(160 84% 39%)" }}>
          <ArrowRight className="w-4 h-4" /> رجوع
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{
            background: ended ? "hsl(var(--chat-offline))" : chatStatus === "active" ? "hsl(var(--chat-online))" : "hsl(var(--chat-away))",
            boxShadow: ended ? "none" : `0 0 6px ${chatStatus === "active" ? "hsl(var(--chat-online))" : "hsl(var(--chat-away))"}`,
            animation: ended ? "none" : "pulse 2s infinite",
          }} />
          <span className="text-xs font-bold text-foreground">
            {ended ? "انتهت المحادثة" : chatStatus === "waiting" ? "بالانتظار..." : "محادثة مباشرة"}
          </span>
        </div>
        {!ended ? (
          <button onClick={handleEnd} className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ color: "hsl(350 89% 55%)", background: "hsl(350 89% 55% / 0.1)", border: "1px solid hsl(350 89% 55% / 0.2)" }}>
            إنهاء
          </button>
        ) : <div className="w-12" />}
      </div>

      {/* Admin bar */}
      {(() => {
        const adminMsg = messages.find(m => m.sender_type === "admin");
        if (!adminMsg) return null;
        return (
          <div className="flex items-center gap-2 mx-4 mt-2 px-3 py-2 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(217 91% 40% / 0.2), hsl(160 84% 39% / 0.2))" }}>
              <span className="text-xs font-bold">{(adminMsg.sender_name || "A").charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{adminMsg.sender_name || "فريق الدعم"}</p>
              <p className="text-[9px] text-muted-foreground">أدمن الدعم</p>
            </div>
          </div>
        );
      })()}

      {/* Queue banner */}
      <AnimatePresence>
        {chatStatus === "waiting" && queuePos > 0 && !ended && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 flex items-center justify-center gap-2" style={{ background: "hsl(40 96% 53% / 0.08)", borderBottom: "1px solid hsl(40 96% 53% / 0.15)" }}>
            <Users className="w-4 h-4" style={{ color: "hsl(40 96% 53%)" }} />
            <span className="text-xs font-bold" style={{ color: "hsl(40 96% 53%)" }}>أنت بالانتظار • ترتيبك: #{queuePos}</span>
            <Loader2 className="w-3 h-3 animate-spin" style={{ color: "hsl(40 96% 53%)" }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0" dir="rtl">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            isMine={msg.sender_type === "user"}
            senderName={msg.sender_type === "admin" ? (msg.sender_name || "فريق الدعم") : undefined}
            senderType={msg.sender_type}
            content={msg.message !== "📷 صورة" ? msg.message : undefined}
            attachmentUrl={msg.attachment_url}
            time={msg.created_at}
            showSender={msg.sender_type !== "user"}
          />
        ))}
        {messages.length === 0 && !ended && !initialLoaded && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: "hsl(160 84% 39%)" }} />
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
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 pt-2">
            <div className="relative inline-block">
              <img src={imagePreview} alt="" className="h-20 rounded-lg object-cover" style={{ border: "1px solid hsl(0 0% 100% / 0.1)" }} />
              <button onClick={clearImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(350 89% 55%)" }}>
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      {!ended ? (
        <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={sending} className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40" style={{ background: "hsl(var(--chat-input-bg))" }}>
            <ImagePlus className="w-4 h-4 text-muted-foreground" />
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="اكتب رسالتك..."
            className="flex-1 py-2.5 px-4 rounded-3xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            style={{ background: "hsl(var(--chat-input-bg))" }}
          />
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend} disabled={(!input.trim() && !imageFile) || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}>
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4 text-white rotate-180" />}
          </motion.button>
        </div>
      ) : (
        <div className="px-3 py-3" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <button onClick={onBack} className="w-full h-11 rounded-xl font-bold text-sm active:scale-95 transition-transform" style={{ color: "hsl(160 84% 39%)", background: "hsl(160 84% 39% / 0.08)", border: "1px solid hsl(160 84% 39% / 0.2)" }}>
            رجوع
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveSupportChat;
