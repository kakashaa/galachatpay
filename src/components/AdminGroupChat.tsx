import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle, Circle, ArrowRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import ChatBubble from '@/components/chat/ChatBubble';
import DateSeparator from '@/components/chat/DateSeparator';

interface ChatMessage {
  id: string;
  sender_username: string;
  sender_display_name: string;
  message: string;
  message_type: string;
  is_deleted: boolean;
  created_at: string;
}

interface Props {
  adminUsername: string;
  adminRole: string | null;
}

const AdminGroupChat: React.FC<Props> = ({ adminUsername, adminRole }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isOwner = adminRole === 'owner';
  const isSuperAdmin = adminRole === 'super_admin' || isOwner;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_chat_messages')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [scrollToBottom]);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel('admin_group_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_chat_messages' }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('admin_chat_messages').insert({
        sender_username: adminUsername,
        sender_display_name: adminUsername,
        message: newMessage.trim(),
        message_type: 'text',
      });
      if (error) throw error;
      setNewMessage('');
    } catch { toast.error('فشل إرسال الرسالة'); }
    finally { setSending(false); }
  };

  const formatTime = (t: string) => {
    try { return new Date(t).toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }); }
    catch { return t; }
  };

  // Group by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const date = new Date(msg.created_at).toDateString();
    const last = grouped[grouped.length - 1];
    if (last?.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  });

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[600px] rounded-2xl overflow-hidden" dir="rtl" style={{ background: "hsl(var(--chat-bg))", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "hsl(var(--chat-header-bg))", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(160 84% 39% / 0.15)" }}>
            <Users className="w-5 h-5" style={{ color: "hsl(160 84% 39%)" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">مجموعة الإدارة</p>
            <p className="text-[10px] text-muted-foreground">الفريق الإداري</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-4xl">💬</span>
            <p className="text-sm text-muted-foreground">لا توجد رسائل بعد</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <DateSeparator date={group.msgs[0].created_at} />
              {group.msgs.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  isMine={msg.sender_username === adminUsername}
                  senderName={msg.sender_display_name || msg.sender_username}
                  senderType="admin"
                  content={msg.message}
                  time={msg.created_at}
                  showSender={msg.sender_username !== adminUsername}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="اكتب رسالة..."
          className="flex-1 py-2.5 px-4 rounded-3xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/10"
          style={{ background: "hsl(var(--chat-input-bg))" }}
        />
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
        </motion.button>
      </div>
    </div>
  );
};

export default AdminGroupChat;
