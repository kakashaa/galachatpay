import React from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";

interface ChatBubbleProps {
  isMine: boolean;
  senderName?: string | null;
  senderType?: string;
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string;
  attachmentUrl?: string | null;
  time: string;
  status?: string;
  showSender?: boolean;
  children?: React.ReactNode;
}

const SENDER_COLORS: Record<string, string> = {
  owner: "text-red-400",
  super_admin: "text-green-400",
  admin: "text-blue-400",
  moderator: "text-yellow-400",
  system: "text-muted-foreground",
  user: "text-purple-400",
};

const formatTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

const ChatBubble: React.FC<ChatBubbleProps> = ({
  isMine, senderName, senderType, content, mediaUrl, mediaType,
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

  // Large emoji detection
  const isEmojiOnly = content && /^[\p{Emoji}\s]{1,6}$/u.test(content) && content.length <= 6;

  const imgSrc = mediaUrl || attachmentUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isMine ? "justify-start" : "justify-end"} mb-1.5`}
    >
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
          <p className={`text-[10px] font-bold mb-0.5 ${SENDER_COLORS[senderType || "user"] || "text-primary"}`}>
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
    </motion.div>
  );
};

export default ChatBubble;
