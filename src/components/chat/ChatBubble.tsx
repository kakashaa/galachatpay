import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Paperclip, X } from "lucide-react";
import VoiceMessage from "@/components/chat/VoiceMessage";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ChatBubbleProps {
  isMine: boolean;
  senderName?: string | null;
  senderType?: string;
  senderAvatar?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string;
  attachmentUrl?: string | null;
  voiceDuration?: number;
  time: string;
  status?: string;
  showSender?: boolean;
  children?: React.ReactNode;
}

// Deterministic color for sender name
const NAME_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F0B27A", "#82E0AA",
];

const getNameColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
};

const formatTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

const DEFAULT_AVATAR = "/placeholder.svg";

const ChatBubble: React.FC<ChatBubbleProps> = ({
  isMine, senderName, senderType, senderAvatar, content, mediaUrl, mediaType,
  attachmentUrl, voiceDuration, time, status, showSender = true, children,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const isSystem = senderType === "system";

  if (isSystem) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-1">
        <span className="text-[10px] text-muted-foreground px-3 py-1 rounded-full" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
          {content}
        </span>
      </motion.div>
    );
  }

  // Detect emoji-only messages
  const isEmojiOnly = content && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]{1,6}$/u.test(content) && !/[a-zA-Z0-9\u0600-\u06FF]/.test(content) && content.trim().length <= 6;
  const imgSrc = mediaUrl || attachmentUrl;
  const avatarSrc = senderAvatar || DEFAULT_AVATAR;
  const nameColor = senderName ? getNameColor(senderName) : undefined;
  const initials = senderName ? senderName.charAt(0).toUpperCase() : "?";

  // Resolve media type
  const resolvedMediaType = mediaType || (imgSrc ? (isImageUrl(imgSrc) ? "image" : isVideoUrl(imgSrc) ? "video" : "photo") : undefined);
  const isVoice = resolvedMediaType === "voice";
  const isImage = resolvedMediaType === "image" || resolvedMediaType === "photo";
  const isVideo = resolvedMediaType === "video";

  // Media-only check for layout decisions

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex ${isMine ? "justify-start" : "justify-end"} mb-2`}
    >
      {/* Avatar for non-mine */}
      {!isMine && showSender && (
        <div className="flex-shrink-0 ml-2 self-end mb-1">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10" style={{ background: "hsl(0 0% 100% / 0.08)" }}>
            <img
              src={avatarSrc}
              alt={senderName || ""}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:10px;font-weight:bold;color:rgba(255,255,255,0.7)">${initials}</span>`;
                }
              }}
            />
          </div>
        </div>
      )}
      {!isMine && !showSender && <div className="w-9 flex-shrink-0" />}

      <div
        className={`relative max-w-[75%] ${isEmojiOnly ? "" : "px-3 py-2"}`}
        style={isEmojiOnly ? {} : {
          background: isMine
            ? "hsl(160 84% 25%)"
            : "hsl(0 0% 100% / 0.07)",
          border: `1px solid ${isMine ? "hsl(160 84% 35% / 0.3)" : "hsl(0 0% 100% / 0.06)"}`,
          borderRadius: isMine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        }}
      >
        {/* Sender name */}
        {showSender && !isMine && senderName && !isEmojiOnly && (
          <p className="text-[10px] font-bold mb-0.5" style={{ color: nameColor || "hsl(160 84% 50%)" }}>
            {senderName}
          </p>
        )}

        {/* Image */}
        {isImage && imgSrc && (
          <div
            className="cursor-pointer rounded-xl overflow-hidden mt-1 mb-1"
            onClick={() => setPreviewImage(imgSrc)}
          >
            <img
              src={imgSrc}
              alt=""
              className="max-w-full max-h-[250px] object-cover rounded-xl hover:opacity-90 transition-opacity"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
        )}

        {/* Video */}
        {isVideo && imgSrc && (
          <div className="rounded-xl overflow-hidden mt-1 mb-1">
            <video
              src={imgSrc}
              controls
              preload="metadata"
              className="max-w-full max-h-[250px] rounded-xl"
              playsInline
              muted
            />
          </div>
        )}

        {/* Voice */}
        {isVoice && imgSrc && (
          <VoiceMessage url={imgSrc} duration={voiceDuration || 0} isMine={isMine} />
        )}

        {/* Generic attachment */}
        {imgSrc && !isImage && !isVideo && !isVoice && (
          <a href={imgSrc} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline block mb-1 flex items-center gap-1">
            <Paperclip className="w-3 h-3" /> مرفق
          </a>
        )}

        {/* Content text */}
        {content && !isEmojiOnly && (
          <p className="text-sm text-white/95 leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        )}
        {isEmojiOnly && content && (
          <span className="text-5xl leading-none">{content}</span>
        )}

        {children}

        {/* Time + status */}
        {!isEmojiOnly && (
          <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-start" : "justify-end"}`}>
            <span className="text-[9px] text-white/40">{formatTime(time)}</span>
            {isMine && status && (
              status === "read"
                ? <CheckCheck className="w-3 h-3 text-sky-400" />
                : status === "delivered"
                  ? <CheckCheck className="w-3 h-3 text-white/40" />
                  : <Check className="w-3 h-3 text-white/40" />
            )}
          </div>
        )}
      </div>

      {/* Avatar for mine */}
      {isMine && (
        <div className="flex-shrink-0 mr-2 self-end mb-1">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center border border-white/10" style={{ background: "hsl(160 84% 25%)" }}>
            <span className="text-[10px] font-bold text-white/80">{initials}</span>
          </div>
        </div>
      )}
    </motion.div>

    {/* Full-screen image preview */}
    {previewImage && (
      <Dialog open onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={previewImage} className="w-full h-full object-contain" alt="" />
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

export default ChatBubble;
