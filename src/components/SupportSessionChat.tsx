import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Clock, Shield, Star, Crown, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useSupportSession } from "@/hooks/use-support-session";

// Color mapping for sender types
const SENDER_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  owner: { bg: "rgba(239,68,68,0.12)", text: "text-red-400", icon: <Crown className="w-3 h-3" />, label: "Owner" },
  super_admin: { bg: "rgba(34,197,94,0.12)", text: "text-green-400", icon: <Shield className="w-3 h-3" />, label: "سوبر أدمن" },
  moderator: { bg: "rgba(234,179,8,0.12)", text: "text-yellow-400", icon: <Star className="w-3 h-3" />, label: "مشرف" },
  admin: { bg: "rgba(96,165,250,0.12)", text: "text-blue-400", icon: <User className="w-3 h-3" />, label: "أدمن" },
  system: { bg: "rgba(148,163,184,0.08)", text: "text-muted-foreground", icon: null, label: "النظام" },
  user: { bg: "rgba(168,85,247,0.12)", text: "text-purple-400", icon: null, label: "" },
};

// Wait timer component
const WaitTimer = ({ startTime }: { startTime: string }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const isLate = mins >= 2;

  return (
    <span className={`text-xs font-mono flex items-center gap-1 ${isLate ? "text-red-400 animate-pulse" : "text-muted-foreground"}`}>
      <Clock className="w-3 h-3" />
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
};

interface Props {
  sessionId: string;
  userUuid: string;
  userName: string;
  senderType?: string;
  showTimer?: boolean;
  onClose?: () => void;
  onRoomNameRequest?: boolean;
  onRoomNameSubmit?: (name: string) => void;
}

const SupportSessionChat: React.FC<Props> = ({
  sessionId,
  userUuid,
  userName,
  senderType = "user",
  showTimer = true,
  onClose,
  onRoomNameRequest,
  onRoomNameSubmit,
}) => {
  const { messages, session, loading, sendMessage } = useSupportSession(sessionId);
  const [input, setInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const msg = input.trim();
    setInput("");
    try {
      await sendMessage(userUuid, userName, senderType, msg);
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const isResolved = session?.status === "resolved" || session?.status === "closed";

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="p-3 border-b border-border/30 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            {session?.support_level === 2 ? "🆘" : session?.support_level === 3 ? "📋" : "💬"}
          </div>
          <div>
            <p className="text-sm font-bold">{session?.assigned_admin_name || "فريق الدعم"}</p>
            <p className="text-[10px] text-muted-foreground">
              {isResolved ? "✅ تم الحل" : session?.status === "escalated" ? "⚠️ تم التصعيد" : "🟢 نشط"}
            </p>
          </div>
        </div>
        {showTimer && session && !isResolved && (
          <WaitTimer startTime={session.created_at} />
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.sender_uuid === userUuid;
            const colors = SENDER_COLORS[msg.sender_type] || SENDER_COLORS.user;
            const isSystem = msg.sender_type === "system";

            if (isSystem) {
              return (
                <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-center py-1">
                  <span className="text-[10px] text-muted-foreground bg-muted/20 rounded-full px-3 py-1">
                    {msg.message}
                  </span>
                </motion.div>
              );
            }

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={{ background: isMe ? "rgba(168,85,247,0.1)" : colors.bg }}>
                  {!isMe && (
                    <div className={`flex items-center gap-1 mb-0.5 ${colors.text}`}>
                      {colors.icon}
                      <span className="text-[10px] font-bold">{msg.sender_name}</span>
                      {colors.label && <span className="text-[9px] opacity-60">({colors.label})</span>}
                    </div>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 text-left">
                    {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Room name request (SOS escalation) */}
      {onRoomNameRequest && session?.escalation_level >= 3 && !session?.room_name && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 border-t border-border/30 space-y-2" style={{ background: "rgba(239,68,68,0.05)" }}>
          <p className="text-sm font-bold text-center">😔 نعتذر على التأخير</p>
          <p className="text-xs text-muted-foreground text-center">اكتب اسم غرفتك وسنرسل أحد يساعدك</p>
          <div className="flex gap-2">
            <Input value={roomName} onChange={(e) => setRoomName(e.target.value)}
              placeholder="اسم الغرفة..." className="flex-1 bg-muted/20 text-sm" />
            <button onClick={() => { if (roomName.trim() && onRoomNameSubmit) onRoomNameSubmit(roomName.trim()); }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8))" }}>
              أرسل
            </button>
          </div>
        </motion.div>
      )}

      {/* Rating prompt (resolved) */}
      {isResolved && (
        <RatingPrompt sessionId={sessionId} userUuid={userUuid} adminUsername={session?.assigned_admin || ""} />
      )}

      {/* Input */}
      {!isResolved && (
        <div className="p-3 border-t border-border/30 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)" }}>
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="اكتب رسالتك..."
            className="flex-1 bg-muted/20 border-border/20 text-sm" />
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8))" }}>
            <Send className="w-4 h-4 text-primary-foreground" />
          </motion.button>
        </div>
      )}
    </div>
  );
};

// Rating component shown after session closes
const RatingPrompt: React.FC<{ sessionId: string; userUuid: string; adminUsername: string }> = ({
  sessionId, userUuid, adminUsername
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (submitted) {
    return (
      <div className="p-4 text-center border-t border-border/30">
        <p className="text-sm font-bold text-green-400">✅ شكراً لتقييمك!</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.functions.invoke("support-system", {
        body: {
          action: "submit_rating",
          session_id: sessionId,
          user_uuid: userUuid,
          admin_username: adminUsername,
          rating,
          comment: comment.trim() || null,
        },
      });
      setSubmitted(true);
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 border-t border-border/30 space-y-3 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
      <p className="text-sm font-bold">كيف كانت تجربتك؟</p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} onClick={() => setRating(star)}
            className={`text-2xl transition-transform ${rating >= star ? "scale-110" : "opacity-30"}`}>
            ⭐
          </button>
        ))}
      </div>
      <Input value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="ملاحظة اختيارية..." className="bg-muted/20 text-sm" />
      <button onClick={handleSubmit} disabled={rating === 0 || submitting}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8))" }}>
        إرسال التقييم
      </button>
    </motion.div>
  );
};

export default SupportSessionChat;
export { WaitTimer };
