import React, { useRef, useState } from "react";
import { Send, Paperclip, Mic, Image, Video, X, Play, Pause, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChatInputProps {
  onSend: (text: string) => void;
  onMediaUpload?: (file: File, type: "photo" | "video") => void;
  onAttach?: (file: File) => void;
  onVoiceSend?: (url: string, duration: number) => void;
  disabled?: boolean;
  sending?: boolean;
  uploading?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend, onMediaUpload, onAttach, onVoiceSend, disabled, sending, uploading, placeholder = "اكتب رسالة...",
}) => {
  const [text, setText] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const duration = recordingTime;
        setRecordingTime(0);
        if (timerRef.current) clearInterval(timerRef.current);

        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Upload to Supabase Storage
        setUploadingVoice(true);
        try {
          const path = `voice/${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;
          const { data, error } = await supabase.storage.from("attachments").upload(path, audioBlob, { contentType: "audio/webm" });
          if (error) throw error;
          if (data) {
            const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
            if (onVoiceSend) {
              onVoiceSend(urlData.publicUrl, duration);
            }
          }
        } catch (err) {
          console.error("Voice upload failed:", err);
          toast.error("فشل رفع الرسالة الصوتية");
        }
        setUploadingVoice(false);

        // Cleanup stream
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
      toast.error("لا يمكن الوصول للميكروفون");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const hasContent = text.trim() || previewFile;

  // Recording UI
  if (isRecording) {
    return (
      <div style={{ background: "hsl(var(--chat-bg))", borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={cancelRecording}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "hsl(350 89% 60% / 0.15)" }}
          >
            <X className="w-5 h-5 text-red-400" />
          </motion.button>

          <div className="flex-1 flex items-center gap-3">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-2.5 h-2.5 rounded-full bg-red-500"
            />
            <span className="text-sm font-mono text-red-400">{formatDuration(recordingTime)}</span>
            <div className="flex-1 flex items-center gap-0.5">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [4, Math.random() * 16 + 4, 4] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                  className="w-1 rounded-full bg-red-400/60"
                />
              ))}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={stopRecording}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}
          >
            {uploadingVoice ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white rotate-180" />
            )}
          </motion.button>
        </div>
      </div>
    );
  }

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
              whileTap={{ scale: 0.85 }}
              onClick={startRecording}
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