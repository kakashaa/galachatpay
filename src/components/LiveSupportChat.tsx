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
  const [initialLoaded, setInitialLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgIdRef = useRef(0);

  // Helper to merge messages without duplicates, replacing temp messages with real ones
  const mergeMessages = useCallback((prev: Message[], incoming: Message[]) => {
    const realMessages = incoming.filter(m => !m.id.startsWith("temp-"));
    // Remove temp messages that now have a real version
    const cleanedPrev = prev.filter(p => {
      if (!p.id.startsWith("temp-")) return true;
      return !realMessages.some(r => 
        r.sender_type === p.sender_type && 
        r.message === p.message &&
        Math.abs(new Date(r.created_at).getTime() - new Date(p.created_at).getTime()) < 60000
      );
    });
    const existingIds = new Set(cleanedPrev.map(m => m.id));
    const newMsgs = incoming.filter(m => {
      if (existingIds.has(m.id)) return false;
      // Prevent near-duplicate real messages (same content+sender within 10s)
      if (!m.id.startsWith("temp-")) {
        const isDupe = cleanedPrev.some(p => 
          !p.id.startsWith("temp-") &&
          p.sender_type === m.sender_type && 
          p.message === m.message &&
          Math.abs(new Date(p.created_at).getTime() - new Date(m.created_at).getTime()) < 10000
        );
        if (isDupe) return false;
      }
      return true;
    });
    if (newMsgs.length === 0 && cleanedPrev.length === prev.length) return prev;
    return [...cleanedPrev, ...newMsgs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, []);

  // Load messages directly from Supabase
  const loadFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("support_chat_messages")
        .select("*")
        .eq("chat_id", chatKey)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[LiveSupportChat] Supabase load error:", error);
        return;
      }
      if (data) {
        setMessages(prev => mergeMessages(prev, data as Message[]));
      }
    } catch (e) {
      console.error("[LiveSupportChat] Supabase load exception:", e);
    }
  }, [chatKey, mergeMessages]);

  // Initial load
  useEffect(() => {
    loadFromSupabase().then(() => setInitialLoaded(true));
  }, [loadFromSupabase]);

  // Supabase Realtime for instant messages
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
        setMessages(prev => mergeMessages(prev, [msg]));
        if (msg.sender_type === "admin") toast.success("رد جديد من الدعم!");
        if (msg.sender_type === "system" && msg.message.includes("إنهاء")) {
          setEnded(true);
          onEnded?.();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatKey, onEnded, mergeMessages]);

  // Poll: trigger edge function to sync API messages to Supabase, then refresh from Supabase
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
    // Always refresh from Supabase after polling API (catches synced admin messages)
    await loadFromSupabase();
  }, [chatKey, loadFromSupabase]);

  const pollStatus = useCallback(async () => {
    try {
      const result = await supabase.functions.invoke("support-chat", {
        body: { action: "status", chat_key: chatKey },
      });
      const data = result.data;
      if (data?.ok) {
        const newStatus = data.chat?.status || data.status || "active";
        setChatStatus(newStatus);
        if (data.queue_position) setQueuePos(data.queue_position);
        if (newStatus === "ended" || newStatus === "closed") {
          setEnded(true);
          onEnded?.();
        }
      }
    } catch { /* silent */ }
  }, [chatKey, onEnded]);

  useEffect(() => {
    pollMessages();
    pollStatus();
    pollRef.current = setInterval(() => {
      pollMessages();
      pollStatus();
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollMessages, pollStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || ended || sending) return;
    const msgText = input.trim();
    setSending(true);
    setInput("");

    // Optimistic: add message to UI immediately
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      chat_id: chatKey,
      sender_type: "user",
      sender_name: userName,
      sender_uuid: userUuid,
      message: msgText,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await supabase.functions.invoke("support-chat", {
        body: {
          action: "send",
          chat_key: chatKey,
          message: msgText,
          sender_type: "user",
          sender_name: userName,
          user_uuid: userUuid,
        },
      });
      // After send, refresh from Supabase to get the real record (replaces optimistic)
      setTimeout(() => loadFromSupabase(), 1000);
    } catch {
      toast.error("فشل إرسال الرسالة");
      setInput(msgText);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
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
