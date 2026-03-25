import React, { useState, useRef, useEffect } from "react";
import { Send, Clock, Paperclip, Image, Video, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSupportSession } from "@/hooks/use-support-session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatBubble from "@/components/chat/ChatBubble";
import VoiceRecorder from "@/components/support/VoiceRecorder";

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
  sessionId, userUuid, userName, senderType = "user",
  showTimer = true, onClose, onRoomNameRequest, onRoomNameSubmit,
}) => {
  const { messages, session, loading, sendMessage } = useSupportSession(sessionId);
  const [input, setInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const msg = input.trim();
    setInput("");
    try { await sendMessage(userUuid, userName, senderType, msg); }
    catch { /* silent */ }
    finally { setSending(false); }
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
      const path = `support/${sessionId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path);
      // Send as message with attachment
      await sendMessage(userUuid, userName, senderType, type === "photo" ? "📷 صورة" : "🎥 فيديو", urlData.publicUrl);
    } catch {
      toast.error("فشل رفع الملف");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const isResolved = session?.status === "resolved" || session?.status === "closed";

  const levelEmoji = session?.support_level === 2 ? "" : session?.support_level === 3 ? "" : "";

  return (
    <div className="flex flex-col h-full" dir="rtl" style={{ background: "hsl(var(--chat-bg))" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "hsl(var(--chat-header-bg))", backdropFilter: "blur(20px)", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: "hsl(217 91% 40% / 0.15)" }}>
            {levelEmoji}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{session?.assigned_admin_name || "فريق الدعم"}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{
                background: isResolved ? "hsl(var(--chat-offline))" : "hsl(var(--chat-online))",
                boxShadow: isResolved ? "none" : "0 0 6px hsl(var(--chat-online))"
              }} />
              <p className="text-[10px] text-muted-foreground">
                {isResolved ? "تم الحل" : session?.status === "escalated" ? "تم التصعيد" : "نشط"}
              </p>
            </div>
          </div>
        </div>
        {showTimer && session && !isResolved && <WaitTimer startTime={session.created_at} />}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            // Detect media from attachment_url
            const attachUrl = (msg as any).attachment_url;
            let mediaUrl: string | undefined;
            let mediaType: string | undefined;
            if (attachUrl) {
              const isImg = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attachUrl);
              const isVid = /\.(mp4|webm|mov)(\?|$)/i.test(attachUrl);
              mediaUrl = attachUrl;
              mediaType = isImg ? "photo" : isVid ? "video" : undefined;
            }
            return (
              <ChatBubble
                key={msg.id}
                isMine={msg.sender_uuid === userUuid}
                senderName={msg.sender_name}
                senderType={msg.sender_type}
                content={msg.message}
                mediaUrl={mediaUrl}
                mediaType={mediaType}
                time={msg.created_at}
                showSender={true}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Room name request (SOS escalation) */}
      {onRoomNameRequest && session?.escalation_level >= 3 && !session?.room_name && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 space-y-2" style={{ background: "hsl(350 89% 55% / 0.05)", borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <p className="text-sm font-bold text-center">😔 نعتذر على التأخير</p>
          <p className="text-xs text-muted-foreground text-center">اكتب اسم غرفتك وسنرسل أحد يساعدك</p>
          <div className="flex gap-2">
            <Input value={roomName} onChange={(e) => setRoomName(e.target.value)}
              placeholder="اسم الغرفة..." className="flex-1 border-0 text-sm" style={{ background: "hsl(var(--chat-input-bg))" }} />
            <button onClick={() => { if (roomName.trim() && onRoomNameSubmit) onRoomNameSubmit(roomName.trim()); }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}>
              أرسل
            </button>
          </div>
        </motion.div>
      )}

      {/* Rating prompt */}
      {isResolved && (
        <RatingPrompt sessionId={sessionId} userUuid={userUuid} adminUsername={session?.assigned_admin || ""} />
      )}

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/90 border-0">
          {previewImage && <img src={previewImage} alt="" className="w-full h-full object-contain" />}
        </DialogContent>
      </Dialog>

      {/* Input */}
      {!isResolved && (
        <div className="relative" style={{ background: "hsl(var(--chat-bg))", borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
          {/* Attachment sheet */}
          <AnimatePresence>
            {showAttach && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-full left-0 right-0 p-3 flex gap-3 justify-center"
                style={{ background: "hsl(var(--chat-bg))", borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <label className="flex flex-col items-center gap-1 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(217 91% 50% / 0.15)" }}>
                    <Image className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">صورة</span>
                  <input ref={photoRef} type="file" accept="image/*" onChange={e => handleMediaUpload(e, "photo")} className="hidden" />
                </label>
                <label className="flex flex-col items-center gap-1 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(271 81% 56% / 0.15)" }}>
                    <Video className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">فيديو</span>
                  <input ref={videoRef} type="file" accept="video/*" onChange={e => handleMediaUpload(e, "video")} className="hidden" />
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 px-3 py-2.5">
            <button onClick={() => setShowAttach(!showAttach)} className="p-2 rounded-full hover:bg-white/5 transition-colors">
              {uploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Paperclip className="w-5 h-5 text-muted-foreground" />}
            </button>
            {input.trim() ? (
              <>
                <Input value={input} onChange={(e) => { setInput(e.target.value); setShowAttach(false); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 rounded-3xl border-0 text-sm py-2.5"
                  style={{ background: "hsl(var(--chat-input-bg))" }} />
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend} disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}>
                  <Send className="w-4 h-4 text-white rotate-180" />
                </motion.button>
              </>
            ) : (
              <>
                <Input value={input} onChange={(e) => { setInput(e.target.value); setShowAttach(false); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 rounded-3xl border-0 text-sm py-2.5"
                  style={{ background: "hsl(var(--chat-input-bg))" }} />
                <VoiceRecorder
                  userUuid={userUuid}
                  onVoiceSent={async (url) => {
                    await sendMessage(userUuid, userName, senderType, "🎤 رسالة صوتية", url);
                  }}
                  disabled={sending || uploading}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Rating component
const RatingPrompt: React.FC<{ sessionId: string; userUuid: string; adminUsername: string }> = ({
  sessionId, userUuid, adminUsername
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (submitted) {
    return (
      <div className="p-4 text-center" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <p className="text-sm font-bold" style={{ color: "hsl(var(--chat-online))" }}>شكراً لتقييمك!</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.functions.invoke("support-system", {
        body: { action: "submit_rating", session_id: sessionId, user_uuid: userUuid, admin_username: adminUsername, rating, comment: comment.trim() || null },
      });
      setSubmitted(true);
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-3 text-center" style={{ background: "hsl(var(--chat-bg))", borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
      <p className="text-sm font-bold">كيف كانت تجربتك؟</p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} onClick={() => setRating(star)}
            className={`text-2xl transition-transform ${rating >= star ? "scale-110" : "opacity-30"}`}>
           
          </button>
        ))}
      </div>
      <Input value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="ملاحظة اختيارية..." className="border-0 text-sm" style={{ background: "hsl(var(--chat-input-bg))" }} />
      <button onClick={handleSubmit} disabled={rating === 0 || submitting}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}>
        إرسال التقييم
      </button>
    </motion.div>
  );
};

export default SupportSessionChat;
export { WaitTimer };
