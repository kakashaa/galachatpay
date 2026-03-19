import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Users, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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

interface AdminInfo {
  username: string;
  display_name: string;
  role: string;
}

interface Props {
  adminUsername: string;
  adminRole: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك",
  super_admin: "مسؤول أعلى",
  admin: "مشرف",
  moderator: "مراقب",
};

const AdminGroupChat: React.FC<Props> = ({ adminUsername, adminRole }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [onlineAdmins, setOnlineAdmins] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  const loadAdmins = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('admin_accounts')
        .select('username, display_name, role')
        .eq('is_active', true);
      if (data) setAdmins(data);
    } catch { /* silent */ }
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
    loadAdmins();
    const channel = supabase
      .channel('admin_group_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_chat_messages' }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMessages, loadAdmins]);

  // Track recently active admins as "online"
  useEffect(() => {
    const recent = new Set<string>();
    const now = Date.now();
    messages.forEach(m => {
      if (now - new Date(m.created_at).getTime() < 10 * 60 * 1000) recent.add(m.sender_username);
    });
    setOnlineAdmins(Array.from(recent));
  }, [messages]);

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

  const getAdminRole = (username: string): string => {
    return admins.find(a => a.username === username)?.role || 'admin';
  };

  const getAdminDisplayName = (username: string): string => {
    return admins.find(a => a.username === username)?.display_name || username;
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
      <div className="px-4 py-3" style={{ background: "hsl(var(--chat-header-bg))", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(160 84% 39% / 0.15)" }}>
            <Users className="w-5 h-5" style={{ color: "hsl(160 84% 39%)" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">مجموعة الإدارة</p>
            <p className="text-[10px] text-muted-foreground">{admins.length} عضو · {onlineAdmins.length} متصل</p>
          </div>
        </div>

        {/* Online admins avatars bar */}
        {admins.length > 0 && (
          <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {admins.map(admin => {
              const isOnline = onlineAdmins.includes(admin.username);
              const initial = (admin.display_name || admin.username).charAt(0).toUpperCase();
              return (
                <div key={admin.username} className="flex flex-col items-center gap-0.5 min-w-[42px]">
                  <div className="relative">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold border-2"
                      style={{
                        background: admin.role === 'owner' ? 'linear-gradient(135deg, hsl(0 70% 50%), hsl(0 70% 35%))' :
                          admin.role === 'super_admin' ? 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))' :
                          'hsl(0 0% 100% / 0.08)',
                        borderColor: isOnline ? 'hsl(160 84% 39%)' : 'transparent',
                        color: 'white',
                      }}
                    >
                      {initial}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                      style={{
                        background: isOnline ? 'hsl(160 84% 39%)' : 'hsl(0 0% 40%)',
                        borderColor: 'hsl(var(--chat-bg))',
                        boxShadow: isOnline ? '0 0 6px hsl(160 84% 39%)' : 'none',
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-muted-foreground truncate max-w-[42px]">
                    {admin.display_name || admin.username}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <MessageCircle className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">لا توجد رسائل بعد</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <DateSeparator date={group.msgs[0].created_at} />
              {group.msgs.map((msg, idx) => {
                const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                const showSender = msg.sender_username !== adminUsername &&
                  (!prevMsg || prevMsg.sender_username !== msg.sender_username);
                const role = getAdminRole(msg.sender_username);
                const roleLabel = ROLE_LABELS[role] || '';
                const displayName = `${getAdminDisplayName(msg.sender_username)}${roleLabel ? ` · ${roleLabel}` : ''}`;

                return (
                  <ChatBubble
                    key={msg.id}
                    isMine={msg.sender_username === adminUsername}
                    senderName={displayName}
                    senderType={role}
                    content={msg.message}
                    time={msg.created_at}
                    showSender={showSender}
                  />
                );
              })}
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