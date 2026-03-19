import React, { useState, useEffect, useRef } from "react";
import { Send, Paperclip, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `request_id=eq.${requestId}`,
      }, (payload) => {
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
    const { data } = await supabase
      .from("support_messages" as any)
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
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
      if (attachment) {
        attachUrl = await uploadFile(attachment);
      }
      await supabase.from("support_messages" as any).insert({
        request_id: requestId,
        sender_type: "user",
        sender_name: userName,
        message: input.trim() || (attachment ? "مرفق" : ""),
        attachment_url: attachUrl,
      } as any);
      setInput("");
      setAttachment(null);
    } catch {
      toast.error("فشل إرسال الرسالة");
    }
    setSending(false);
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/20 bg-card/50 space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-primary text-sm font-bold">
            <ArrowRight className="w-4 h-4" /> رجوع
          </button>
          <span className="text-xs font-bold text-foreground">محادثة الدعم</span>
          <div className="w-12" />
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
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
                <p className="text-[10px] font-bold text-emerald-400 mb-1">فريق الدعم</p>
              )}
              {msg.attachment_url && (
                isImage(msg.attachment_url) ? (
                  <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                    <img src={msg.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-48 object-cover" />
                  </a>
                ) : (
                  <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary underline mb-2">
                    <Paperclip className="w-3 h-3" /> عرض المرفق
                  </a>
                )
              )}
              {msg.message && <p className="text-xs text-foreground whitespace-pre-line">{msg.message}</p>}
              <p className="text-[9px] text-muted-foreground mt-1">{formatTime(msg.created_at)}</p>
            </motion.div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">ابدأ المحادثة مع فريق الدعم</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-2 border-t border-border/10 bg-card/50 space-y-2">
        {attachment && (
          <div className="flex items-center gap-2 bg-muted/20 rounded-lg p-2">
            <span className="text-xs text-foreground flex-1 truncate">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
              <X className="w-3 h-3 text-destructive" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input type="file" ref={fileRef} onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size <= 10 * 1024 * 1024) setAttachment(f);
            else if (f) toast.error("الحد الأقصى 10MB");
          }} accept="image/*,video/*" className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="w-10 h-10 rounded-xl bg-muted/20 border border-border/30 flex items-center justify-center">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
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
            disabled={(!input.trim() && !attachment) || sending}
            className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          >
            {sending ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Send className="w-4 h-4 text-primary-foreground" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickSupportChat;
