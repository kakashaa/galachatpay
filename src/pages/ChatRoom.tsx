import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import DateSeparator from '@/components/chat/DateSeparator';

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
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchMessages, myUuid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const sendText = async (text: string) => {
    if (!conversationId || sending) return;
    setSending(true);
    try {
      await (supabase as any).from('direct_messages').insert({
        conversation_id: conversationId, sender_uuid: myUuid, sender_name: myName,
        message_type: 'text', content: text, status: 'sent',
      });
      await (supabase as any).from('conversations').update({
        last_message: text, last_message_at: new Date().toISOString(),
      }).eq('id', conversationId);
    } catch { toast.error('فشل الإرسال'); }
    setSending(false);
  };

  const handleMediaUpload = async (file: File, mediaType: "photo" | "video") => {
    if (!conversationId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `dm/${conversationId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      await (supabase as any).from('direct_messages').insert({
        conversation_id: conversationId, sender_uuid: myUuid, sender_name: myName,
        message_type: mediaType, media_url: urlData.publicUrl, status: 'sent',
      });
      await (supabase as any).from('conversations').update({
        last_message: `📎 ${mediaType === 'photo' ? 'صورة' : 'فيديو'}`,
        last_message_at: new Date().toISOString(),
      }).eq('id', conversationId);
    } catch { toast.error('فشل الرفع'); }
    setUploading(false);
  };

  // Group by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const date = new Date(msg.created_at).toDateString();
    const last = grouped[grouped.length - 1];
    if (last?.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  });

  return (
    <div className="h-screen flex flex-col" dir="rtl" style={{ background: "hsl(var(--chat-bg))" }}>
      <ChatHeader title={otherName} subtitle="محادثة خاصة" showCall />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
        {grouped.map((group) => (
          <div key={group.date}>
            <DateSeparator date={group.msgs[0].created_at} />
            {group.msgs.map((msg) => (
              <ChatBubble
                key={msg.id}
                isMine={msg.sender_uuid === myUuid}
                senderName={msg.sender_name}
                content={msg.content}
                mediaUrl={msg.media_url}
                mediaType={msg.message_type}
                time={msg.created_at}
                status={msg.status}
                showSender={false}
              />
            ))}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-4xl">💬</span>
            <p className="text-sm text-muted-foreground">ابدأ المحادثة</p>
          </div>
        )}
      </div>

      <ChatInput onSend={sendText} onMediaUpload={handleMediaUpload} sending={sending} uploading={uploading} />
    </div>
  );
};

export default ChatRoom;
