import React, { useState, useEffect, useRef } from "react";
import { Send, Paperclip, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ChatBubble from "@/components/chat/ChatBubble";

interface Message {
  id: string;
  request_id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

interface Props {
  requestId: string;
  userUuid: string;
  userName: string;
  onBack: () => void;
}

const QuickSupportChat: React.FC<Props> = ({ requestId, userUuid, userName, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`support-msg-${requestId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `request_id=eq.${requestId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.sender_type === "admin") toast.success("رد جديد من الدعم!");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [requestId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase.from("support_messages" as any).select("*").eq("request_id", requestId).order("created_at", { ascending: true });
    if (data) setMessages(data as any);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `quick-support/${userUuid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;
    setSending(true);
    try {
      let attachUrl: string | null = null;
      if (attachment) { attachUrl = await uploadFile(attachment); }
      await supabase.from("support_messages" as any).insert({
        request_id: requestId, sender_type: "user", sender_name: userName,
        message: input.trim() || (attachment ? "مرفق" : ""), attachment_url: attachUrl,
      } as any);
      setInput(""); setAttachment(null);
    } catch { toast.error("فشل إرسال الرسالة"); }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--chat-bg))" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "hsl(var(--chat-header-bg))", backdropFilter: "blur(20px)", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "hsl(160 84% 39%)" }}>
          <ArrowRight className="w-4 h-4" /> رجوع
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "hsl(217 91% 40% / 0.15)" }}>💬</div>
          <span className="text-xs font-bold text-foreground">محادثة الدعم</span>
        </div>
        <div className="w-12" />
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2" dir="rtl">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            isMine={msg.sender_type === "user"}
            senderName={msg.sender_type === "admin" ? (msg.sender_name || "فريق الدعم") : undefined}
            senderType={msg.sender_type}
            content={msg.message}
            attachmentUrl={msg.attachment_url}
            time={msg.created_at}
            showSender={msg.sender_type === "admin"}
          />
        ))}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">ابدأ المحادثة مع فريق الدعم</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 space-y-2" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
        {attachment && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
            <span className="text-xs text-foreground flex-1 truncate">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "hsl(350 89% 55% / 0.2)" }}>
              <X className="w-3 h-3 text-red-400" />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <input type="file" ref={fileRef} onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size <= 10 * 1024 * 1024) setAttachment(f);
            else if (f) toast.error("الحد الأقصى 10MB");
          }} accept="image/*,video/*" className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--chat-input-bg))" }}>
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </button>
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="اكتب رسالتك..."
            className="flex-1 py-2.5 px-4 rounded-3xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            style={{ background: "hsl(var(--chat-input-bg))" }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSend}
            disabled={(!input.trim() && !attachment) || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}
          >
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4 text-white rotate-180" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default QuickSupportChat;
