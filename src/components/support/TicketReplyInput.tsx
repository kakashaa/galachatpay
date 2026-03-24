import React, { useState, useRef } from 'react';
import { Send, Loader2, Paperclip, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import VoiceRecorder from './VoiceRecorder';

interface Props {
  ticketId: string;
  senderName: string;
  senderType: 'user' | 'admin';
  senderUuid?: string;
  disabled?: boolean;
  onMessageSent?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const TicketReplyInput: React.FC<Props> = ({
  ticketId,
  senderName,
  senderType,
  senderUuid,
  disabled = false,
  onMessageSent,
}) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      toast.error('الملف كبير جداً — الحد الأقصى 10MB');
      return;
    }
    setFile(f);
  };

  const uploadFile = async (f: File): Promise<string | null> => {
    try {
      const ext = f.name.split('.').pop() || 'bin';
      const path = `ticket-attachments/${ticketId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, f);
      if (error) throw error;
      const { data } = supabase.storage.from('attachments').getPublicUrl(path);
      return data.publicUrl;
    } catch {
      toast.error('فشل رفع المرفق');
      return null;
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !file) || sending || disabled) return;
    setSending(true);

    try {
      let attachmentUrl: string | null = null;
      if (file) {
        attachmentUrl = await uploadFile(file);
      }

      const { error } = await supabase.from('ticket_messages' as any).insert({
        ticket_id: ticketId,
        sender_type: senderType,
        sender_name: senderName,
        message: input.trim() || (file ? 'مرفق' : ''),
        attachment_url: attachmentUrl,
      });

      if (error) throw error;

      setInput('');
      setFile(null);
      onMessageSent?.();
    } catch {
      toast.error('فشل إرسال الرسالة — حاول مرة ثانية');
    }
    setSending(false);
  };

  const handleVoiceSent = async (voiceUrl: string) => {
    try {
      await supabase.from('ticket_messages' as any).insert({
        ticket_id: ticketId,
        sender_type: senderType,
        sender_name: senderName,
        message: 'رسالة صوتية',
        attachment_url: voiceUrl,
      });
      onMessageSent?.();
    } catch {
      toast.error('فشل إرسال الرسالة الصوتية');
    }
  };

  return (
    <div className="border-t px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      {file && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <Paperclip className="w-3 h-3 text-muted-foreground" />
          <span className="truncate flex-1 text-muted-foreground">{file.name}</span>
          <button onClick={() => setFile(null)}>
            <X className="w-3 h-3 text-destructive" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2" dir="rtl">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="اكتب رسالتك..."
          disabled={disabled}
          className="flex-1 bg-transparent border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
        />
        <VoiceRecorder
          userUuid={senderUuid || 'admin'}
          onVoiceSent={handleVoiceSent}
          disabled={disabled}
        />
        <input ref={fileRef} type="file" className="hidden" accept="image/*,audio/*,.pdf" onChange={handleFileChange} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <Paperclip className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={handleSend}
          disabled={(!input.trim() && !file) || sending || disabled}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default TicketReplyInput;
