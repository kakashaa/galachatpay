import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle, Circle } from 'lucide-react';
import { toast } from 'sonner';

const API = "https://galachat.site/project-z/api.php";
const ADMIN_KEY = "ghala2026owner";

interface ChatRoom {
  id: string;
  name: string;
  member_count: number;
  last_message?: string;
  last_time?: string;
  unread?: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  sender_name: string;
  message: string;
  created_at: string;
  is_deleted?: boolean;
}

interface OnlineAdmin {
  username: string;
  typing?: boolean;
  chat_id?: string;
}

interface Props {
  adminUsername: string;
  adminRole: string | null;
}

const AdminGroupChat: React.FC<Props> = ({ adminUsername, adminRole }) => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineAdmins, setOnlineAdmins] = useState<OnlineAdmin[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const isOwner = adminRole === 'owner';
  const isSuperAdmin = adminRole === 'super_admin' || isOwner;

  const apiPost = async (body: Record<string, any>) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_key: ADMIN_KEY, ...body }),
    });
    return res.json();
  };

  const apiGet = async (params: Record<string, string>) => {
    const url = new URL(API);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    return res.json();
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  // Load chat rooms
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await apiPost({ action: 'admin_chat_list' });
        if (data.success && data.chats) {
          setChatRooms(data.chats);
        } else {
          // Default rooms
          setChatRooms([
            { id: 'super_group', name: 'مجموعة السوبر', member_count: 4 },
            { id: 'all_admins', name: 'كل الإدارة', member_count: 12 },
          ]);
        }
      } catch {
        setChatRooms([
          { id: 'super_group', name: 'مجموعة السوبر', member_count: 4 },
          { id: 'all_admins', name: 'كل الإدارة', member_count: 12 },
        ]);
      }
      setLoading(false);
    };
    loadRooms();
  }, []);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChatId) return;
    const loadMessages = async () => {
      setLoading(true);
      try {
        const data = await apiPost({ action: 'admin_chat_messages', chat_id: activeChatId });
        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      } catch { /* silent */ }
      setLoading(false);
      scrollToBottom();
    };
    loadMessages();
  }, [activeChatId, scrollToBottom]);

  // Polling for new messages + online status
  useEffect(() => {
    if (!activeChatId) return;

    const poll = async () => {
      try {
        const [msgData, onlineData] = await Promise.all([
          apiPost({ action: 'admin_chat_messages', chat_id: activeChatId }),
          apiGet({ action: 'admin_online' }),
        ]);
        if (msgData.success && msgData.messages) {
          setMessages(prev => {
            if (msgData.messages.length !== prev.length) {
              scrollToBottom();
              return msgData.messages;
            }
            return msgData.messages;
          });
        }
        if (onlineData.success && onlineData.admins) {
          setOnlineAdmins(onlineData.admins);
          const typing = onlineData.admins
            .filter((a: OnlineAdmin) => a.typing && a.chat_id === activeChatId && a.username !== adminUsername)
            .map((a: OnlineAdmin) => a.username);
          setTypingUsers(typing);
        }
      } catch { /* silent */ }
    };

    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChatId, adminUsername, scrollToBottom]);

  // Heartbeat every 10s
  useEffect(() => {
    if (!activeChatId) return;

    const beat = () => {
      apiPost({
        action: 'admin_heartbeat',
        username: adminUsername,
        typing: isTypingRef.current,
        chat_id: activeChatId,
      }).catch(() => {});
      isTypingRef.current = false;
    };

    beat();
    heartbeatRef.current = setInterval(beat, 10000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [activeChatId, adminUsername]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !activeChatId) return;
    setSending(true);
    try {
      const data = await apiPost({
        action: 'admin_chat_send',
        chat_id: activeChatId,
        message: newMessage.trim(),
        sender: adminUsername,
      });
      if (data.success) {
        setNewMessage('');
        // Immediate refresh
        const msgData = await apiPost({ action: 'admin_chat_messages', chat_id: activeChatId });
        if (msgData.success && msgData.messages) {
          setMessages(msgData.messages);
          scrollToBottom();
        }
      } else {
        toast.error('فشل إرسال الرسالة');
      }
    } catch {
      toast.error('فشل إرسال الرسالة');
    } finally {
      setSending(false);
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

  const isAdminOnline = (username: string) => onlineAdmins.some(a => a.username === username);

  // Chat rooms list view
  if (!activeChatId) {
    return (
      <div className="space-y-3">
        {/* Online admins bar */}
        {onlineAdmins.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <Circle className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-bold">
              أونلاين: {onlineAdmins.map(a => a.username).join('، ')}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chatRooms.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد مجموعات</p>
          </div>
        ) : (
          chatRooms
            .filter(room => {
              // super_group only for owner and super_admin
              if (room.id === 'super_group' && !isSuperAdmin) return false;
              return true;
            })
            .map(room => (
              <button
                key={room.id}
                onClick={() => setActiveChatId(room.id)}
                className="w-full bg-card border border-border/40 rounded-xl p-4 text-right hover:border-primary/30 transition-all active:scale-[0.98]"
                dir="rtl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{room.name}</p>
                      <p className="text-[11px] text-muted-foreground">{room.member_count} أعضاء</p>
                    </div>
                  </div>
                  {room.unread && room.unread > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {room.unread}
                    </span>
                  )}
                </div>
                {room.last_message && (
                  <p className="text-[11px] text-muted-foreground mt-2 truncate">{room.last_message}</p>
                )}
              </button>
            ))
        )}
      </div>
    );
  }

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

  const activeRoom = chatRooms.find(r => r.id === activeChatId);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[600px]">
      {/* Chat header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <button
          onClick={() => setActiveChatId(null)}
          className="text-xs text-primary font-bold flex items-center gap-1"
        >
          ← رجوع
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{activeRoom?.name || activeChatId}</p>
          <p className="text-[10px] text-muted-foreground">{activeRoom?.member_count} أعضاء</p>
        </div>
        <div className="w-12" />
      </div>

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
                const isMine = msg.sender === adminUsername;
                return (
                  <div
                    key={msg.id}
                    className={`flex mb-1.5 ${isMine ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-3.5 py-2 ${
                        msg.is_deleted
                          ? 'bg-muted/20 border border-border/30'
                          : isMine
                          ? 'bg-primary/15 border border-primary/20'
                          : 'bg-card border border-border/40'
                      }`}
                    >
                      {!isMine && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Circle className={`w-2 h-2 ${isAdminOnline(msg.sender) ? 'fill-emerald-400 text-emerald-400' : 'fill-muted-foreground/30 text-muted-foreground/30'}`} />
                          <p className="text-[10px] font-bold text-primary">
                            {msg.sender_name || msg.sender}
                          </p>
                        </div>
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
              isTypingRef.current = true;
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
