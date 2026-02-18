import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, ArrowRight, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  chat_id: string;
  sender_type: string;
  sender_name: string;
  sender_uuid: string;
  message: string;
  is_read: boolean;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgIdRef = useRef(0);

  // Load initial messages
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("support_chat_messages")
        .select("*")
        .eq("chat_id", chatKey)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as any);
    };
    load();
  }, [chatKey]);

  // Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`live-support-${chatKey}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_chat_messages",
        filter: `chat_id=eq.${chatKey}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.sender_type === "admin") toast.success("رد جديد من الدعم!");
        if (msg.sender_type === "system" && msg.message.includes("إنهاء")) {
          setEnded(true);
          onEnded?.();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatKey, onEnded]);

  // Poll API for new messages (syncs admin messages to Supabase)
  const pollMessages = useCallback(async () => {
    try {
      const result = await supabase.functions.invoke("support-chat", {
        body: { action: "messages", chat_key: chatKey, after_id: lastMsgIdRef.current },
      });
      const data = result.data;
      if (data?.ok && data?.messages?.length) {
        const maxId = Math.max(...data.messages.map((m: any) => m.id || 0));
        if (maxId > lastMsgIdRef.current) lastMsgIdRef.current = maxId;
      }
    } catch { /* silent */ }
  }, [chatKey]);

  const pollStatus = useCallback(async () => {
    try {
      const result = await supabase.functions.invoke("support-chat", {
        body: { action: "status", chat_key: chatKey },
      });
      const data = result.data;
      if (data?.ok) {
        setChatStatus(data.status || "active");
        if (data.queue_position) setQueuePos(data.queue_position);
        if (data.status === "ended" || data.status === "closed") {
          setEnded(true);
          onEnded?.();
        }
      }
    } catch { /* silent */ }
  }, [chatKey, onEnded]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      pollMessages();
      pollStatus();
    }, 5000);
    pollMessages();
    pollStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollMessages, pollStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || ended) return;
    setSending(true);
    try {
      await supabase.functions.invoke("support-chat", {
        body: {
          action: "send",
          chat_key: chatKey,
          message: input.trim(),
          sender_type: "user",
          sender_name: userName,
          user_uuid: userUuid,
        },
      });
      setInput("");
    } catch {
      toast.error("فشل إرسال الرسالة");
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

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/20 bg-card/50 flex items-center justify-between">
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
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
                  <p className="text-[10px] font-bold text-emerald-400 mb-1">فريق الدعم</p>
                )}
                {msg.message && <p className="text-xs text-foreground whitespace-pre-line">{msg.message}</p>}
                <p className="text-[9px] text-muted-foreground mt-1">{formatTime(msg.created_at)}</p>
              </motion.div>
            </div>
          );
        })}
        {messages.length === 0 && !ended && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">جاري الاتصال بفريق الدعم...</p>
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

      {/* Input */}
      {!ended && (
        <div className="px-4 py-2 border-t border-border/10 bg-card/50">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="اكتب رسالتك..."
              className="flex-1 h-10 px-3 bg-muted/20 rounded-xl text-foreground placeholder:text-muted-foreground border border-border/30 focus:border-primary outline-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
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
