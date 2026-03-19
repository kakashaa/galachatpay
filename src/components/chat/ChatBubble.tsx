import React from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Paperclip } from "lucide-react";
import VoiceMessage from "@/components/chat/VoiceMessage";

interface ChatBubbleProps {
  isMine: boolean;
  senderName?: string | null;
  senderType?: string;
  senderAvatar?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string;
  attachmentUrl?: string | null;
  time: string;
  status?: string;
  showSender?: boolean;
  children?: React.ReactNode;
}

// Deterministic color for sender name based on username
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

const DEFAULT_AVATAR = "/placeholder.svg";

const ChatBubble: React.FC<ChatBubbleProps> = ({
  isMine, senderName, senderType, senderAvatar, content, mediaUrl, mediaType,
  attachmentUrl, time, status, showSender = true, children,
}) => {
  const isSystem = senderType === "system";

  if (isSystem) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-1">
        <span className="text-[10px] text-muted-foreground px-3 py-1 rounded-full" style={{ background: "hsl(var(--chat-bubble-in))" }}>
          {content}
        </span>
      </motion.div>
    );
  }

  const isEmojiOnly = content && /^[\p{Emoji}\s]{1,6}$/u.test(content) && content.length <= 6;
  const imgSrc = mediaUrl || attachmentUrl;
  const avatarSrc = senderAvatar || DEFAULT_AVATAR;
  const nameColor = senderName ? getNameColor(senderName) : undefined;
  const initials = senderName ? senderName.charAt(0).toUpperCase() : "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isMine ? "justify-start" : "justify-end"} mb-2`}
    >
      {/* Avatar for non-mine messages */}
      {!isMine && showSender && (
        <div className="flex-shrink-0 ml-2 self-end mb-1">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10" style={{ background: "hsl(var(--chat-bubble-in))" }}>
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
      {/* Spacer when no avatar shown for incoming */}
      {!isMine && !showSender && <div className="w-9 flex-shrink-0" />}

      <div
        className={`relative max-w-[75%] ${isEmojiOnly ? "" : "px-3 py-2"}`}
        style={isEmojiOnly ? {} : {
          background: isMine
            ? "linear-gradient(135deg, hsl(217 91% 40%), hsl(217 91% 30%))"
            : "hsl(var(--chat-bubble-in))",
          border: `1px solid ${isMine ? "hsl(217 91% 50% / 0.3)" : "hsl(var(--chat-bubble-in-border))"}`,
          borderRadius: isMine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        }}
      >
        {/* Sender name */}
        {showSender && !isMine && senderName && !isEmojiOnly && (
          <p className="text-[10px] font-bold mb-0.5" style={{ color: nameColor || "hsl(217 91% 70%)" }}>
            {senderName}
          </p>
        )}

        {/* Media */}
        {imgSrc && (mediaType === "photo" || isImageUrl(imgSrc)) && (
          <a href={imgSrc} target="_blank" rel="noopener noreferrer" className="block mb-1">
            <img src={imgSrc} alt="" className="rounded-lg max-h-52 w-auto object-cover" loading="lazy" />
          </a>
        )}
        {imgSrc && mediaType === "video" && (
          <video src={imgSrc} className="rounded-lg max-h-52 mb-1" controls muted playsInline />
        )}
        {imgSrc && !isImageUrl(imgSrc) && mediaType !== "video" && mediaType !== "photo" && (
          <a href={imgSrc} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline block mb-1">📎 مرفق</a>
        )}

        {/* Content */}
        {content && (
          isEmojiOnly
            ? <span className="text-5xl leading-none">{content}</span>
            : <p className="text-sm text-white/95 leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        )}

        {children}

        {/* Time + status */}
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
      </div>

      {/* Avatar for mine messages */}
      {isMine && (
        <div className="flex-shrink-0 mr-2 self-end mb-1">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center border border-white/10" style={{ background: "linear-gradient(135deg, hsl(217 91% 40%), hsl(217 91% 30%))" }}>
            <span className="text-[10px] font-bold text-white/80">{initials}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ChatBubble;