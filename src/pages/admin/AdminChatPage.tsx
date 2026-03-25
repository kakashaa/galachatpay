import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, MessageCircle, ArrowRight, Users, Shield, ArrowLeft, Headset, X, Settings, Phone, Video } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAdminSession } from '@/hooks/use-admin-session';
import { useNavigate } from 'react-router-dom';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import DateSeparator from '@/components/chat/DateSeparator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { galaApi } from "@/services/galaApi";

interface ChatRoom {
  id: string;
  name: string;
  type: string;
  members: number;
  last_message?: { text: string; sender: string; time: string };
  unread: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  sender_name: string;
  text: string;
  type: string;
  time: string;
  media_url?: string;
}

interface AdminMember {
  username: string;
  display_name: string;
  role: string;
  is_active: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'المالك',
  super_admin: 'سوبر أدمن',
  admin: 'أدمن',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'hsl(45 93% 58%)',
  super_admin: 'hsl(173 80% 50%)',
  admin: 'hsl(217 91% 70%)',
};

const getAdminInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAdminColor = (name: string): string => {
  const colors = [
    'hsl(217 91% 55%)', 'hsl(160 84% 39%)', 'hsl(271 81% 56%)',
    'hsl(45 93% 48%)', 'hsl(350 89% 55%)', 'hsl(173 80% 40%)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function AdminChatPage() {
  const { adminUsername, adminDisplayName, adminRole, isRegularAdmin } = useAdminSession();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([]);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const adminName = adminUsername || 'naz';

  // Fetch admin members for avatar display
  useEffect(() => {
    supabase
      .from('admin_accounts')
      .select('username, display_name, role, is_active')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setAdminMembers(data);
      });
  }, []);

  const getAdminMember = (username: string): AdminMember | undefined =>
    adminMembers.find(m => m.username === username);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await galaApi.chatList();
      if (data.success) setRooms(data.chats || []);
    } catch { }
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const data = await galaApi.chatMessages(roomId);
      if (data.success) setMessages(data.messages || []);
    } catch { }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom);
      const iv = setInterval(() => fetchMessages(activeRoom), 5000);
      return () => clearInterval(iv);
    }
  }, [activeRoom, fetchMessages]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendApiMessage = async (text: string, type = 'text', mediaUrl?: string) => {
    if (!activeRoom) return;
    setSending(true);
    try {
      const data = await galaApi.chatSend(activeRoom, text, adminName, mediaUrl);
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch { toast.error('فشل الإرسال'); }
    setSending(false);
  };

  const handleSendText = (text: string) => {
    if (!text.trim()) return;
    sendApiMessage(text, 'text');
  };

  const handleMediaUpload = async (file: File, type: "photo" | "video") => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `chat/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('chat-media').upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      const msgType = type === 'video' ? 'video' : 'image';
      await sendApiMessage('', msgType, urlData.publicUrl);
    } catch { toast.error("فشل رفع الملف"); }
    setUploading(false);
  };

  const handleVoiceSend = async (url: string, duration: number) => {
    await sendApiMessage(`${duration}`, 'voice', url);
  };

  const formatTime = (t: string) => {
    try {
      const d = new Date(t.replace(' ', 'T'));
      return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch { return t; }
  };

  const filteredRooms = rooms.filter(room => !(isRegularAdmin && room.type === 'super_group'));

  // ─── Room List View ───
  if (!activeRoom) {
    return (
      <div className="max-w-2xl mx-auto min-h-screen" dir="rtl" style={{ background: '#0c0f1d' }}>
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <button onClick={() => navigate('/admin/dashboard')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="text-center">
            <h1 className="text-base font-black" style={{ color: 'hsl(45 93% 58%)' }}>المحادثات</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">{filteredRooms.length} مجموعة نشطة</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-8 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(45 93% 58%)' }} />
            </div>
          ) : (
            <>
              {/* Support shortcut */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate('/admin/support')}
                className="w-full rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(0,219,233,0.06)', border: '1px solid rgba(0,219,233,0.12)' }}
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,219,233,0.12)' }}>
                  <Headset className="w-5 h-5" style={{ color: 'hsl(173 80% 50%)' }} />
                </div>
                <div className="text-right flex-1">
                  <p className="text-xs font-bold" style={{ color: 'hsl(173 80% 50%)' }}>التذاكر والدعم</p>
                  <p className="text-[10px] text-muted-foreground">تذاكر المستخدمين</p>
                </div>
                <ArrowRight className="w-4 h-4" style={{ color: 'hsl(173 80% 50%)' }} />
              </motion.button>

              {/* Room cards */}
              {filteredRooms.map((room, i) => {
                const isSuperGroup = room.type === 'super_group';
                const accentColor = isSuperGroup ? 'hsl(45 93% 58%)' : 'hsl(217 91% 70%)';
                const bgTint = isSuperGroup ? 'rgba(212,165,116,0.05)' : 'rgba(184,195,255,0.05)';
                const borderTint = isSuperGroup ? 'rgba(212,165,116,0.1)' : 'rgba(184,195,255,0.1)';

                return (
                  <motion.button
                    key={room.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (i + 1) * 0.08 }}
                    onClick={() => setActiveRoom(room.id)}
                    className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
                    style={{ background: bgTint, border: `1px solid ${borderTint}` }}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                        {isSuperGroup ? (
                          <Shield className="w-6 h-6" style={{ color: accentColor }} />
                        ) : (
                          <Users className="w-6 h-6" style={{ color: accentColor }} />
                        )}
                      </div>
                      {room.unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[9px] text-white font-bold flex items-center justify-center px-1" style={{ background: 'hsl(350 89% 55%)' }}>
                          {room.unread}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{room.name}</p>
                        {isSuperGroup && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${accentColor}20`, color: accentColor }}>خاص</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {room.last_message ? `${room.last_message.sender}: ${room.last_message.text}` : 'لا رسائل بعد'}
                      </p>
                    </div>
                    <div className="text-left shrink-0 flex flex-col items-end gap-1">
                      <p className="text-[9px] text-muted-foreground">
                        {room.last_message ? formatTime(room.last_message.time) : ''}
                      </p>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[9px] text-muted-foreground">{room.members}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}

              {filteredRooms.length === 0 && !loading && (
                <div className="text-center py-16">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">لا توجد مجموعات</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Chat View ───
  const currentRoom = rooms.find(r => r.id === activeRoom);
  const isSuperGroup = currentRoom?.type === 'super_group';
  const headerAccent = isSuperGroup ? 'hsl(45 93% 58%)' : 'hsl(217 91% 70%)';

  // Group messages by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const dateStr = new Date(msg.time?.replace(' ', 'T') || Date.now()).toDateString();
    const last = grouped[grouped.length - 1];
    if (last?.date === dateStr) last.msgs.push(msg);
    else grouped.push({ date: dateStr, msgs: [msg] });
  });

  // Online admin members
  const onlineMembers = adminMembers.filter(m => {
    if (isSuperGroup) return m.role === 'super_admin' || m.role === 'owner';
    return true;
  });

  return (
    <>
      <div className="max-w-2xl mx-auto flex flex-col h-screen" dir="rtl" style={{ background: '#0c0f1d' }}>
        {/* ── Premium Header ── */}
        <div className="shrink-0" style={{ background: 'rgba(17,19,24,0.95)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setActiveRoom(null)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <ArrowRight className="w-4 h-4 text-foreground" />
            </button>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${headerAccent}15` }}>
              {isSuperGroup ? (
                <Shield className="w-5 h-5" style={{ color: headerAccent }} />
              ) : (
                <Users className="w-5 h-5" style={{ color: headerAccent }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground truncate">{currentRoom?.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: headerAccent }}>{currentRoom?.members} عضو</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Members strip */}
          <div className="px-4 pb-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {/* Stacked avatars */}
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {onlineMembers.slice(0, 4).map((m, i) => (
                  <div key={m.username} className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2" style={{ background: getAdminColor(m.username), borderColor: '#111318', zIndex: 4 - i }}>
                    {getAdminInitials(m.display_name)}
                  </div>
                ))}
              </div>
              {onlineMembers.length > 4 && (
                <span className="text-[9px] text-muted-foreground mr-1">+{onlineMembers.length - 4}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(160 84% 50%)', boxShadow: '0 0 6px hsl(160 84% 50%)' }} />
              <span className="text-[10px] text-muted-foreground">{onlineMembers.length} متصل</span>
            </div>
          </div>
        </div>

        {/* ── Messages ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3" style={{ background: '#0c0f1d' }}>
          {grouped.map((group) => (
            <div key={group.date}>
              <DateSeparator date={group.msgs[0].time} />
              {group.msgs.map((msg, idx) => {
                const isMe = msg.sender === adminName;
                const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                const showSender = !isMe && (!prevMsg || prevMsg.sender !== msg.sender);
                const msgType = msg.type || 'text';
                const isMediaMsg = ['image', 'video', 'voice'].includes(msgType);
                const textContent = isMediaMsg && msg.media_url ? null : msg.text;

                // Get admin member info for sender
                const senderMember = getAdminMember(msg.sender);
                const senderRole = senderMember?.role || 'admin';
                const roleLabel = ROLE_LABELS[senderRole] || 'أدمن';
                const roleColor = ROLE_COLORS[senderRole] || 'hsl(217 91% 70%)';

                return (
                  <div key={msg.id || idx}>
                    {/* Enhanced sender info */}
                    {showSender && !isMe && (
                      <div className="flex items-center gap-2 mb-1 mr-9 mt-3">
                        <span className="text-[11px] font-bold" style={{ color: getAdminColor(msg.sender) }}>
                          {senderMember?.display_name || msg.sender_name || msg.sender}
                        </span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${roleColor}15`, color: roleColor }}>
                          {roleLabel}
                        </span>
                      </div>
                    )}
                    <ChatBubble
                      isMine={isMe}
                      senderName={senderMember?.display_name || msg.sender_name || msg.sender}
                      content={textContent}
                      mediaUrl={msg.media_url}
                      mediaType={msgType}
                      voiceDuration={msgType === 'voice' ? parseInt(msg.text) || 0 : undefined}
                      time={msg.time}
                      showSender={false}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${headerAccent}10` }}>
                <MessageCircle className="w-7 h-7" style={{ color: `${headerAccent}60` }} />
              </div>
              <p className="text-xs text-muted-foreground">لا توجد رسائل بعد</p>
              <p className="text-[10px] text-muted-foreground">ابدأ المحادثة الآن</p>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Uploading indicator */}
        {uploading && (
          <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>جاري الرفع...</span>
            </div>
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSendText}
          onMediaUpload={handleMediaUpload}
          onVoiceSend={handleVoiceSend}
          sending={sending}
          uploading={uploading}
        />
      </div>

      {/* Image Preview */}
      {previewImage && (
        <Dialog open onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
            <button onClick={() => setPreviewImage(null)} className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/50">
              <X className="w-5 h-5 text-white" />
            </button>
            <img src={previewImage} className="w-full h-full object-contain" alt="" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}