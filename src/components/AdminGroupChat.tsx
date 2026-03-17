import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2, Trash2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  sender_username: string;
  sender_display_name: string;
  message: string;
  message_type: string;
  is_deleted: boolean;
  deleted_by: string | null;
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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const isOwner = adminRole === 'super_admin';

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('admin_chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);
      setMessages((data as ChatMessage[]) || []);
      setLoading(false);
      scrollToBottom();
    };
    loadMessages();
  }, [scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-group-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages(prev => [...prev, msg]);
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'admin_chat_messages' },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scrollToBottom]);

  // Presence for typing indicator
  useEffect(() => {
    const presenceChannel = supabase.channel('admin-chat-presence', {
      config: { presence: { key: adminUsername } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing: string[] = [];
        Object.entries(state).forEach(([key, values]) => {
          if (key !== adminUsername && (values as any[])?.[0]?.typing) {
            typing.push(key);
          }
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ typing: false });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [adminUsername]);

  const broadcastTyping = useCallback(() => {
    const presenceChannel = supabase.channel('admin-chat-presence');
    presenceChannel.track({ typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      presenceChannel.track({ typing: false });
    }, 2000);
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('admin_chat_messages').insert({
        sender_username: adminUsername,
        sender_display_name: adminUsername,
        message: newMessage.trim(),
        message_type: 'text',
      } as any);
      if (error) throw error;
      setNewMessage('');
    } catch {
      toast.error('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('admin_chat_messages').update({
        is_deleted: true,
        deleted_by: adminUsername,
      } as any).eq('id', id);
    } catch {
      toast.error('فشل حذف الرسالة');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh', month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[600px]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 px-2 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد رسائل بعد</p>
            <p className="text-xs mt-1">ابدأ المحادثة!</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span className="text-[10px] text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                  {group.date}
                </span>
              </div>
              {group.msgs.map((msg) => {
                const isMine = msg.sender_username === adminUsername;
                return (
                  <div
                    key={msg.id}
                    className={`flex mb-1.5 ${isMine ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`relative group max-w-[80%] rounded-2xl px-3.5 py-2 ${
                        msg.is_deleted
                          ? 'bg-muted/20 border border-border/30'
                          : isMine
                          ? 'bg-primary/15 border border-primary/20'
                          : 'bg-card border border-border/40'
                      }`}
                    >
                      {!isMine && (
                        <p className="text-[10px] font-bold text-primary mb-0.5">
                          {msg.sender_display_name || msg.sender_username}
                        </p>
                      )}
                      {msg.is_deleted ? (
                        <p className="text-xs text-muted-foreground italic">🗑️ تم حذف الرسالة</p>
                      ) : (
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                      </div>
                      {/* Delete button - owner can delete any, user can delete own */}
                      {!msg.is_deleted && (isOwner || isMine) && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="absolute -top-2 left-0 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-all"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1">
          <p className="text-[10px] text-muted-foreground animate-pulse">
            {typingUsers.join('، ')} يكتب...
          </p>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              broadcastTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="اكتب رسالة..."
            className="flex-1 bg-muted/20 border border-border/30 rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            dir="rtl"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all hover:bg-primary/90 active:scale-95"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminGroupChat;
