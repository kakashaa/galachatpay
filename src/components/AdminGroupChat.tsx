import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle, Circle, ArrowRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API = "https://galachat.site/project-z/api.php";
const ADMIN_KEY = "ghala2026owner";

interface ChatRoom {
  id: string;
  name: string;
  members: number;
  last_message?: { text: string; sender: string; time: string };
}

interface ChatMessage {
  id: string;
  sender: string;
  sender_name: string;
  text: string;
  type: string;
  time: string;
}

interface OnlineAdmin {
  username: string;
  name: string;
  online: boolean;
  typing: boolean;
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

  // Load online admins
  const loadOnline = useCallback(async () => {
    try {
      const data = await apiGet({ action: 'admin_online' });
      if (data.admins) setOnlineAdmins(data.admins);
    } catch { /* silent */ }
  }, []);

  // Load chat rooms
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await apiPost({ action: 'admin_chat_list' });
        if (data.chats) {
          setChatRooms(data.chats);
        } else {
          setChatRooms([
            { id: 'super_group', name: 'مجموعة السوبر', members: 4 },
            { id: 'all_admins', name: 'كل الإدارة', members: 12 },
          ]);
        }
      } catch {
        setChatRooms([
          { id: 'super_group', name: 'مجموعة السوبر', members: 4 },
          { id: 'all_admins', name: 'كل الإدارة', members: 12 },
        ]);
      }
      setLoading(false);
    };
    loadRooms();
    loadOnline();
  }, [loadOnline]);

  // Load messages for active chat + polling
  useEffect(() => {
    if (!activeChatId) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const loadAll = async () => {
      try {
        const [msgData, onlineData] = await Promise.all([
          apiPost({ action: 'admin_chat_messages', chat_id: activeChatId }),
          apiGet({ action: 'admin_online' }),
        ]);
        if (msgData.messages) {
          setMessages(prev => {
            if (JSON.stringify(msgData.messages) !== JSON.stringify(prev)) {
              scrollToBottom();
              return msgData.messages;
            }
            return prev;
          });
        }
        if (onlineData.admins) {
          setOnlineAdmins(onlineData.admins);
        }
      } catch { /* silent */ }
    };

    setLoading(true);
    loadAll().then(() => setLoading(false));
    pollRef.current = setInterval(loadAll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChatId, scrollToBottom]);

  // Heartbeat every 10s
  useEffect(() => {
    if (!activeChatId) return;
    const beat = () => {
      apiPost({
        action: 'admin_heartbeat',
        typing: isTypingRef.current,
        chat_id: activeChatId,
      }).catch(() => {});
      isTypingRef.current = false;
    };
    beat();
    heartbeatRef.current = setInterval(beat, 10000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [activeChatId]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !activeChatId) return;
    setSending(true);
    try {
      const data = await apiPost({
        action: 'admin_chat_send',
        chat_id: activeChatId,
        message: newMessage.trim(),
      });
      if (data.success) {
        setNewMessage('');
        const msgData = await apiPost({ action: 'admin_chat_messages', chat_id: activeChatId });
        if (msgData.messages) {
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

  const formatTime = (t: string) => {
    try {
      const d = new Date(t);
      return d.toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' });
    } catch { return t; }
  };

  const formatDate = (t: string) => {
    try {
      const d = new Date(t);
      return d.toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh', month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const isOnline = (username: string) => onlineAdmins.some(a => a.username === username && a.online);
  const typingUsers = onlineAdmins
    .filter(a => a.typing && a.username !== adminUsername)
    .map(a => a.name || a.username);

  // Chat rooms list
  if (!activeChatId) {
    return (
      <div className="space-y-3" dir="rtl">
        {/* Online admins bar */}
        {onlineAdmins.filter(a => a.online).length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl overflow-x-auto">
            {onlineAdmins.filter(a => a.online).map(admin => (
              <div key={admin.username} className="flex flex-col items-center gap-1 min-w-[48px]">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <Circle className="absolute -bottom-0.5 -left-0.5 w-3 h-3 fill-emerald-400 text-emerald-400" />
                </div>
                <span className="text-[9px] text-muted-foreground truncate max-w-[50px]">{admin.name || admin.username}</span>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          chatRooms
            .filter(room => room.id !== 'super_group' || isSuperAdmin)
            .map(room => (
              <motion.button
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setActiveChatId(room.id)}
                className="w-full bg-card border border-border/40 rounded-xl p-4 text-right hover:border-primary/30 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{room.name}</p>
                      <p className="text-[11px] text-muted-foreground">{room.members} عضو</p>
                    </div>
                  </div>
                </div>
                {room.last_message && (
                  <p className="text-[11px] text-muted-foreground mt-2 truncate">
                    {room.last_message.sender}: {room.last_message.text}
                  </p>
                )}
              </motion.button>
            ))
        )}
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.time);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  const activeRoom = chatRooms.find(r => r.id === activeChatId);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[600px]" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <button onClick={() => setActiveChatId(null)} className="text-xs text-primary font-bold flex items-center gap-1">
          <ArrowRight className="w-3.5 h-3.5" /> رجوع
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{activeRoom?.name || activeChatId}</p>
          <p className="text-[10px] text-muted-foreground">{activeRoom?.members} عضو</p>
        </div>
        <div className="w-12" />
      </div>

      {/* Members bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 overflow-x-auto">
        {onlineAdmins.map(admin => (
          <div key={admin.username} className="flex flex-col items-center gap-0.5 min-w-[40px]">
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center">
                <Users className="w-3 h-3 text-muted-foreground" />
              </div>
              <Circle className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 ${
                admin.online ? 'fill-emerald-400 text-emerald-400' : 'fill-muted-foreground/30 text-muted-foreground/30'
              }`} />
            </div>
            <span className="text-[8px] text-muted-foreground truncate max-w-[42px]">{admin.name || admin.username}</span>
          </div>
        ))}
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
          </div>
        ) : (
          <AnimatePresence>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-3">
                  <span className="text-[10px] text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                {group.msgs.map((msg) => {
                  const isMine = msg.sender === adminUsername;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className={`flex mb-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`relative max-w-[80%] rounded-2xl px-3.5 py-2 ${
                          isMine
                            ? 'bg-primary/15 border border-primary/20 rounded-tl-md'
                            : 'bg-card border border-border/40 rounded-tr-md'
                        }`}
                      >
                        {!isMine && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Circle className={`w-2 h-2 ${isOnline(msg.sender) ? 'fill-emerald-400 text-emerald-400' : 'fill-muted-foreground/30 text-muted-foreground/30'}`} />
                            <p className="text-[10px] font-bold text-primary">
                              {msg.sender_name || msg.sender}
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                        <span className="text-[9px] text-muted-foreground mt-1 block text-left">
                          {formatTime(msg.time)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </AnimatePresence>
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

      {/* Input */}
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
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all hover:bg-primary/90 active:scale-95"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminGroupChat;
