import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, MessageCircle, ArrowRight, Users, Shield, ArrowLeft, Headset, X, Settings, Phone, Video, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAdminSession } from '@/hooks/use-admin-session';
import { useNavigate } from 'react-router-dom';
import ChatInput from '@/components/chat/ChatInput';
import VoiceMessage from '@/components/chat/VoiceMessage';
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
  owner: 'OWNER',
  super_admin: 'SUPER ADMIN',
  admin: 'ADMIN',
};

const ROLE_COLORS: Record<string, string> = {
  owner: '#F5A623',
  super_admin: '#00DBE9',
  admin: '#7B8CDE',
};

const getAdminInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAdminColor = (name: string): string => {
  const colors = ['#4A90D9', '#50C878', '#9B59B6', '#F5A623', '#E74C3C', '#00BCD4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const formatTime = (t: string) => {
  try {
    const d = new Date(t.replace(' ', 'T'));
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return t; }
};

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

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

  const filteredRooms = rooms.filter(room => !(isRegularAdmin && room.type === 'super_group'));

  // ─── Room List View ───
  if (!activeRoom) {
    return (
      <div className="max-w-2xl mx-auto min-h-screen" dir="rtl" style={{ background: '#0a0e1a' }}>
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <button onClick={() => navigate('/admin/dashboard')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div className="text-center">
            <h1 className="text-base font-black text-white">المحادثات</h1>
            <p className="text-[10px] text-white/40 mt-0.5">{filteredRooms.length} مجموعة نشطة</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <MessageCircle className="w-4 h-4 text-white/60" />
          </div>
        </div>

        <div className="px-4 pb-8 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate('/admin/support')}
                className="w-full rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(0,219,233,0.06)', border: '1px solid rgba(0,219,233,0.1)' }}
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,219,233,0.12)' }}>
                  <Headset className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-xs font-bold text-cyan-400">التذاكر والدعم</p>
                  <p className="text-[10px] text-white/40">تذاكر المستخدمين</p>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </motion.button>

              {filteredRooms.map((room, i) => {
                const isSuperGroup = room.type === 'super_group';
                const accent = isSuperGroup ? '#F5A623' : '#7B8CDE';

                return (
                  <motion.button
                    key={room.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (i + 1) * 0.08 }}
                    onClick={() => setActiveRoom(room.id)}
                    className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${accent}18` }}>
                        {isSuperGroup ? <Shield className="w-6 h-6" style={{ color: accent }} /> : <Users className="w-6 h-6" style={{ color: accent }} />}
                      </div>
                      {room.unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[9px] text-white font-bold flex items-center justify-center px-1 bg-red-500">
                          {room.unread}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{room.name}</p>
                        {isSuperGroup && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${accent}20`, color: accent }}>خاص</span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 truncate mt-0.5">
                        {room.last_message ? `${room.last_message.sender}: ${room.last_message.text}` : 'لا رسائل بعد'}
                      </p>
                    </div>
                    <div className="text-left shrink-0 flex flex-col items-end gap-1">
                      <p className="text-[9px] text-white/30">{room.last_message ? formatTime(room.last_message.time) : ''}</p>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-white/30" />
                        <p className="text-[9px] text-white/30">{room.members}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}

              {filteredRooms.length === 0 && !loading && (
                <div className="text-center py-16">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 text-white/20" />
                  <p className="text-sm text-white/40">لا توجد مجموعات</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Chat View (Executive Board Style) ───
  const currentRoom = rooms.find(r => r.id === activeRoom);
  const isSuperGroup = currentRoom?.type === 'super_group';
  const headerAccent = isSuperGroup ? '#F5A623' : '#7B8CDE';

  const grouped: { date: string; msgs: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const dateStr = new Date(msg.time?.replace(' ', 'T') || Date.now()).toDateString();
    const last = grouped[grouped.length - 1];
    if (last?.date === dateStr) last.msgs.push(msg);
    else grouped.push({ date: dateStr, msgs: [msg] });
  });

  const onlineMembers = adminMembers.filter(m => {
    if (isSuperGroup) return m.role === 'super_admin' || m.role === 'owner';
    return true;
  });

  return (
    <>
      <div className="max-w-2xl mx-auto flex flex-col h-screen" dir="rtl" style={{ background: '#0a0e1a' }}>
        {/* ── Executive Header ── */}
        <div className="shrink-0" style={{ background: 'rgba(10,14,26,0.97)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setActiveRoom(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <ArrowRight className="w-4 h-4 text-white/70" />
            </button>

            <div className="flex-1 min-w-0 text-center">
              <p className="text-sm font-black text-white tracking-wide">{currentRoom?.name}</p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <Lock className="w-2.5 h-2.5 text-white/30" />
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Secure end-to-end</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Phone className="w-3.5 h-3.5 text-white/40" />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Video className="w-3.5 h-3.5 text-white/40" />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Settings className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          </div>

          {/* Members strip with stacked avatars */}
          <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {onlineMembers.slice(0, 4).map((m, i) => (
                  <div key={m.username} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[#0a0e1a]" style={{ background: getAdminColor(m.username), zIndex: 4 - i }}>
                    {getAdminInitials(m.display_name)}
                  </div>
                ))}
              </div>
              {onlineMembers.length > 4 && (
                <span className="text-[9px] text-white/40 mr-1">+{onlineMembers.length - 4}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[10px] text-white/50">Active Session</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #34d399' }} />
              <span className="text-[10px] text-white/50">{onlineMembers.length} Online</span>
            </div>
          </div>
        </div>

        {/* ── Messages Area ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ background: '#0a0e1a' }}>
          {grouped.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex justify-center my-4">
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold px-4 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {new Date(group.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>

              {group.msgs.map((msg, idx) => {
                const isMe = msg.sender === adminName;
                const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                const showSenderHeader = !isMe && (!prevMsg || prevMsg.sender !== msg.sender);
                const msgType = msg.type || 'text';
                const isVoice = msgType === 'voice';
                const isImage = msgType === 'image' || msgType === 'photo';
                const isVideo = msgType === 'video';
                const senderMember = getAdminMember(msg.sender);
                const senderRole = senderMember?.role || 'admin';
                const roleLabel = ROLE_LABELS[senderRole] || 'ADMIN';
                const roleColor = ROLE_COLORS[senderRole] || '#7B8CDE';
                const senderColor = getAdminColor(msg.sender);

                return (
                  <div key={msg.id || idx} className={`flex ${isMe ? 'justify-start' : 'justify-end'} mb-1`}>
                    {/* Avatar for others (right side in RTL) */}
                    {!isMe && showSenderHeader && (
                      <div className="flex-shrink-0 ml-2.5 self-start mt-1">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2" style={{ background: senderColor, ringColor: '#0a0e1a' }}>
                          {getAdminInitials(senderMember?.display_name || msg.sender_name || msg.sender)}
                        </div>
                      </div>
                    )}
                    {!isMe && !showSenderHeader && <div className="w-[42px] flex-shrink-0" />}

                    <div className="max-w-[78%]">
                      {/* Sender name + role badge */}
                      {showSenderHeader && !isMe && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: senderColor }}>
                            {senderMember?.display_name || msg.sender_name || msg.sender}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: roleColor, background: `${roleColor}15` }}>
                            {roleLabel}
                          </span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className="relative"
                        style={{
                          background: isMe
                            ? 'linear-gradient(135deg, #1a6dff, #0052d4)'
                            : 'rgba(255,255,255,0.06)',
                          border: isMe ? 'none' : '1px solid rgba(255,255,255,0.06)',
                          borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          padding: isVoice ? '8px 12px' : '10px 14px',
                        }}
                      >
                        {/* Image */}
                        {isImage && msg.media_url && (
                          <div className="cursor-pointer rounded-xl overflow-hidden mb-1" onClick={() => setPreviewImage(msg.media_url!)}>
                            <img src={msg.media_url} alt="" className="max-w-full max-h-[220px] object-cover rounded-xl" loading="lazy" />
                          </div>
                        )}

                        {/* Video */}
                        {isVideo && msg.media_url && (
                          <div className="rounded-xl overflow-hidden mb-1">
                            <video src={msg.media_url} controls preload="metadata" className="max-w-full max-h-[220px] rounded-xl" playsInline muted />
                          </div>
                        )}

                        {/* Voice */}
                        {isVoice && msg.media_url && (
                          <VoiceMessage url={msg.media_url} duration={parseInt(msg.text) || 0} isMine={isMe} />
                        )}

                        {/* Text content */}
                        {!isVoice && !isImage && !isVideo && msg.text && (
                          <p className="text-[13px] text-white/90 leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        )}

                        {/* Time */}
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-start' : 'justify-end'}`}>
                          <span className="text-[9px] text-white/30">{formatTime(msg.time)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Avatar for mine */}
                    {isMe && showSenderHeader && (
                      <div className="flex-shrink-0 mr-2.5 self-start mt-1">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2" style={{ background: '#1a6dff', ringColor: '#0a0e1a' }}>
                          {getAdminInitials(adminDisplayName || adminName)}
                        </div>
                      </div>
                    )}
                    {isMe && !showSenderHeader && <div className="w-[42px] flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          ))}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <MessageCircle className="w-7 h-7 text-white/20" />
              </div>
              <p className="text-xs text-white/40">لا توجد رسائل بعد</p>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Uploading indicator */}
        {uploading && (
          <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center justify-center gap-2 text-xs text-white/40">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>جاري الرفع...</span>
            </div>
          </div>
        )}

        {/* Glassmorphic Input */}
        <div style={{ background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <ChatInput
            onSend={handleSendText}
            onMediaUpload={handleMediaUpload}
            onVoiceSend={handleVoiceSend}
            sending={sending}
            uploading={uploading}
            placeholder="Type secure message..."
          />
        </div>
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
