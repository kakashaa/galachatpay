import React, { useRef, useState } from "react";
import { Send, Paperclip, Mic, Smile, Image, Video, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (text: string) => void;
  onMediaUpload?: (file: File, type: "photo" | "video") => void;
  onAttach?: (file: File) => void;
  disabled?: boolean;
  sending?: boolean;
  uploading?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend, onMediaUpload, onAttach, disabled, sending, uploading, placeholder = "اكتب رسالة...",
}) => {
  const [text, setText] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (previewFile && onAttach) {
      onAttach(previewFile.file);
      clearPreview();
      return;
    }
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
    inputRef.current?.focus();
  };

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>, type: "photo" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("الحد الأقصى 8MB"); return; }
    if (onMediaUpload) onMediaUpload(file, type);
    else if (onAttach) {
      setPreviewFile({ file, url: URL.createObjectURL(file) });
    }
    e.target.value = "";
    setShowAttach(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("الحد الأقصى 10MB"); return; }
    setPreviewFile({ file, url: URL.createObjectURL(file) });
    e.target.value = "";
    setShowAttach(false);
  };

  const clearPreview = () => {
    if (previewFile) URL.revokeObjectURL(previewFile.url);
    setPreviewFile(null);
  };

  const hasContent = text.trim() || previewFile;

  return (
    <div className="relative" style={{ background: "hsl(var(--chat-bg))", borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
      {/* Attachment sheet */}
      <AnimatePresence>
        {showAttach && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 right-0 p-3 flex gap-3 justify-center"
            style={{ background: "hsl(var(--chat-bg))", borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}
          >
            <label className="flex flex-col items-center gap-1 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(217 91% 50% / 0.15)" }}>
                <Image className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-[10px] text-muted-foreground">صورة</span>
              <input ref={photoRef} type="file" accept="image/*" onChange={e => handleMedia(e, "photo")} className="hidden" />
            </label>
            <label className="flex flex-col items-center gap-1 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(271 81% 56% / 0.15)" }}>
                <Video className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-[10px] text-muted-foreground">فيديو</span>
              <input ref={videoRef} type="file" accept="video/*" onChange={e => handleMedia(e, "video")} className="hidden" />
            </label>
            <button onClick={() => toast("قريباً ✨")} className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(160 84% 39% / 0.15)" }}>
                <Mic className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] text-muted-foreground">صوتية</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File preview */}
      <AnimatePresence>
        {previewFile && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-3 pt-2">
            <div className="relative inline-block">
              {previewFile.file.type.startsWith("image/") ? (
                <img src={previewFile.url} alt="" className="h-20 rounded-lg border border-white/10 object-cover" />
              ) : (
                <div className="h-12 px-3 rounded-lg border border-white/10 flex items-center gap-2 bg-white/5">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-foreground truncate max-w-[120px]">{previewFile.file.name}</span>
                </div>
              )}
              <button onClick={clearPreview}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setShowAttach(!showAttach)}
          className="p-2 rounded-full hover:bg-white/5 transition-colors"
        >
          <Paperclip className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={text}
            onChange={e => { setText(e.target.value); setShowAttach(false); }}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full py-2.5 px-4 rounded-3xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/10 disabled:opacity-50"
            style={{ background: "hsl(var(--chat-input-bg))" }}
            dir="rtl"
          />
        </div>

        <AnimatePresence mode="wait">
          {hasContent ? (
            <motion.button
              key="send"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              whileTap={{ scale: 0.85 }}
              onClick={handleSend}
              disabled={disabled || sending || uploading}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}
            >
              {sending || uploading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white rotate-180" />
              )}
            </motion.button>
          ) : (
            <motion.button
              key="mic"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              onClick={() => toast("قريباً ✨")}
              className="w-10 h-10 rounded-full flex items-center justify-center relative"
              style={{ background: "hsl(var(--chat-input-bg))" }}
            >
              <Mic className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" onChange={handleFile} className="hidden" />
    </div>
  );
};

export default ChatInput;
