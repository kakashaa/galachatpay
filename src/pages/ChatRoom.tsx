import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Send, Image, Video, Mic, Smile, Check, CheckCheck, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  conversation_id: string;
  sender_uuid: string;
  sender_name: string | null;
  sender_avatar: string | null;
  message_type: string;
  content: string | null;
  media_url: string | null;
  reply_to: string | null;
  status: string;
  created_at: string;
}

const ChatRoom: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otherName, setOtherName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const adminSession = (() => {
    try { return JSON.parse(localStorage.getItem('admin_session') || 'null'); } catch { return null; }
  })();
  const myUuid = user?.uuid || adminSession?.uuid || adminSession?.username || '';
  const myName = user?.name || adminSession?.display_name || adminSession?.username || '';

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await (supabase as any)
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);
    setMessages((data || []) as Message[]);

    // Mark messages as read
    if (myUuid) {
      await (supabase as any)
        .from('direct_messages')
        .update({ status: 'read' })
        .eq('conversation_id', conversationId)
        .neq('sender_uuid', myUuid)
        .neq('status', 'read');
    }
  }, [conversationId, myUuid]);

  useEffect(() => {
    // Get conversation info
    if (conversationId) {
      (supabase as any).from('conversations').select('*').eq('id', conversationId).single().then(({ data }: any) => {
        if (data) {
          const parts = data.participants || [];
          setOtherName(parts.find((p: string) => p !== myUuid) || 'محادثة');
        }
      });
    }

    fetchMessages();

    const channel = supabase
      .channel(`dm_${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => fetchMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchMessages, myUuid]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (type = 'text', content?: string, mediaUrl?: string) => {
    if ((!newMessage.trim() && type === 'text') || !conversationId || sending) return;
    setSending(true);
    try {
      const msgContent = type === 'text' ? newMessage.trim() : content;
      await (supabase as any).from('direct_messages').insert({
        conversation_id: conversationId,
        sender_uuid: myUuid,
        sender_name: myName,
        message_type: type,
        content: msgContent || null,
        media_url: mediaUrl || null,
        status: 'sent',
      });

      // Update conversation
      await (supabase as any).from('conversations').update({
        last_message: type === 'text' ? msgContent : `📎 ${type === 'photo' ? 'صورة' : 'فيديو'}`,
        last_message_at: new Date().toISOString(),
      }).eq('id', conversationId);

      if (type === 'text') setNewMessage('');
    } catch { toast.error('فشل الإرسال'); }
    setSending(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('الحد الأقصى 8MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `dm/${conversationId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      await sendMessage(mediaType, null, urlData.publicUrl);
    } catch { toast.error('فشل الرفع'); }
    setUploading(false);
    e.target.value = '';
  };

  const getStatusIcon = (msg: Message) => {
    if (msg.sender_uuid !== myUuid) return null;
    if (msg.status === 'read') return <CheckCheck className="w-3 h-3 text-primary" />;
    if (msg.status === 'delivered') return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    return <Check className="w-3 h-3 text-muted-foreground" />;
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-muted/50">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{otherName}</p>
            <p className="text-[10px] text-muted-foreground">محادثة خاصة</p>
          </div>
          <button className="p-2 rounded-xl bg-muted/50 relative">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="absolute -top-1 -left-1 text-[7px] bg-accent text-accent-foreground px-1 rounded-full">قريباً</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isMine = msg.sender_uuid === myUuid;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                isMine
                  ? 'bg-primary/15 border border-primary/20 rounded-tr-sm'
                  : 'bg-muted/30 border border-border/20 rounded-tl-sm'
              }`}>
                {!isMine && (
                  <p className="text-[10px] font-bold text-primary mb-0.5">{msg.sender_name}</p>
                )}
                {msg.media_url && msg.message_type === 'photo' && (
                  <img src={msg.media_url} alt="" className="rounded-lg max-h-48 mb-1" loading="lazy" />
                )}
                {msg.media_url && msg.message_type === 'video' && (
                  <video src={msg.media_url} className="rounded-lg max-h-48 mb-1" controls muted playsInline />
                )}
                {msg.content && (
                  <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                )}
                <div className="flex items-center gap-1 mt-0.5 justify-end">
                  <span className="text-[9px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                  {getStatusIcon(msg)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur-xl border-t border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Media buttons */}
          <div className="flex items-center gap-1">
            <label className="p-2 rounded-xl hover:bg-muted/30 cursor-pointer transition-colors">
              <Image className="w-5 h-5 text-muted-foreground" />
              <input type="file" accept="image/*" onChange={e => handleMediaUpload(e, 'photo')} className="hidden" />
            </label>
            <label className="p-2 rounded-xl hover:bg-muted/30 cursor-pointer transition-colors">
              <Video className="w-5 h-5 text-muted-foreground" />
              <input type="file" accept="video/*" onChange={e => handleMediaUpload(e, 'video')} className="hidden" />
            </label>
            <button className="p-2 rounded-xl hover:bg-muted/30 relative transition-colors" onClick={() => toast('قريباً ✨')}>
              <Mic className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 text-[6px] bg-accent text-accent-foreground px-1 rounded-full">قريباً</span>
            </button>
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب رسالة..."
              className="w-full bg-muted/30 border border-border/20 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              dir="rtl"
            />
          </div>

          {/* Send button */}
          <AnimatePresence>
            {(newMessage.trim() || uploading) && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => sendMessage()}
                disabled={sending || uploading}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              >
                {sending || uploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5 rotate-180" />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
