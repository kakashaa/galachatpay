import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Send, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Props {
  userUuid: string;
  onVoiceSent: (url: string) => void;
  disabled?: boolean;
}

const MAX_DURATION = 120; // 2 minutes
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const VoiceRecorder: React.FC<Props> = ({ userUuid, onVoiceSent, disabled }) => {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSupported(false);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => { cleanup(); if (recordedUrl) URL.revokeObjectURL(recordedUrl); }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > MAX_SIZE) {
          toast.error('الملف الصوتي كبير جداً — الحد 5MB');
          discard();
          return;
        }
        setRecorded(blob);
        setRecordedUrl(URL.createObjectURL(blob));
      };

      recorder.start();
      setRecording(true);
      setElapsed(0);
      setRecorded(null);
      if (recordedUrl) { URL.revokeObjectURL(recordedUrl); setRecordedUrl(null); }

      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev + 1 >= MAX_DURATION) { stopRecording(); return MAX_DURATION; }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast.error('لا يمكن الوصول للميكروفون');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setRecording(false);
  };

  const discard = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecorded(null);
    setRecordedUrl(null);
    setElapsed(0);
    cleanup();
  };

  const upload = async () => {
    if (!recorded) return;
    setUploading(true);
    try {
      const ext = recorded.type.includes('webm') ? 'webm' : 'ogg';
      const path = `voice-messages/${userUuid}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, recorded);
      if (error) throw error;
      const { data } = supabase.storage.from('attachments').getPublicUrl(path);
      onVoiceSent(data.publicUrl);
      discard();
      toast.success('تم إرسال الرسالة الصوتية');
    } catch {
      toast.error('فشل رفع الرسالة الصوتية');
    }
    setUploading(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (!supported) return null;

  // Recorded state — show preview + send/discard
  if (recorded && recordedUrl) {
    return (
      <div className="flex items-center gap-2">
        <audio controls src={recordedUrl} className="h-8 flex-1 max-w-[180px]" />
        <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(elapsed)}</span>
        <motion.button whileTap={{ scale: 0.9 }} onClick={upload} disabled={uploading}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white"
          style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))' }}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={discard} disabled={uploading}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.12)', color: 'hsl(0 72% 51%)' }}>
          <Trash2 className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    );
  }

  // Recording state
  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={stopRecording}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          animate={{ boxShadow: ['0 0 0 0 rgba(239,68,68,0.4)', '0 0 12px 4px rgba(239,68,68,0.15)', '0 0 0 0 rgba(239,68,68,0.4)'] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ background: 'rgba(239,68,68,0.2)', color: 'hsl(0 72% 51%)' }}>
          <Square className="w-4 h-4" />
        </motion.button>
        <div className="flex items-center gap-2 flex-1">
          {/* Simple waveform animation */}
          <div className="flex items-center gap-0.5 h-6">
            {[...Array(12)].map((_, i) => (
              <motion.div key={i}
                className="w-[3px] rounded-full"
                style={{ background: 'hsl(0 72% 51%)' }}
                animate={{ height: ['4px', `${8 + Math.random() * 14}px`, '4px'] }}
                transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.05 }}
              />
            ))}
          </div>
          <span className="text-xs font-mono font-bold tabular-nums" style={{ color: 'hsl(0 72% 51%)' }}>
            {formatTime(elapsed)}
          </span>
        </div>
      </div>
    );
  }

  // Idle — mic button
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={startRecording}
      disabled={disabled}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
      style={{ background: 'rgba(148,163,184,0.1)', color: 'hsl(215 14% 60%)' }}
    >
      <Mic className="w-4 h-4" />
    </motion.button>
  );
};

export default VoiceRecorder;
