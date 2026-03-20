import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, MessageCircle, ArrowRight, Users, Shield, ArrowLeft, Headset, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAdminSession } from '@/hooks/use-admin-session';
import { useNavigate } from 'react-router-dom';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import DateSeparator from '@/components/chat/DateSeparator';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const API = "https://galachat.site/project-z/api.php";
const ADMIN_KEY = "ghala2026owner";

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

export default function AdminChatPage() {
  const { adminUsername, adminDisplayName } = useAdminSession();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const adminName = adminUsername || 'naz';

  const fetchRooms = useCallback(async () => {
    try {
      const fd = new FormData();
      fd.append('action', 'admin_chat_list');
      fd.append('admin_key', ADMIN_KEY);
      const res = await fetch(API, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) setRooms(data.chats || []);
    } catch { }
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const fd = new FormData();
      fd.append('action', 'admin_chat_messages');
      fd.append('admin_key', ADMIN_KEY);
      fd.append('chat_id', roomId);
      fd.append('limit', '50');
      const res = await fetch(API, { method: 'POST', body: fd });
      const data = await res.json();
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
      const fd = new FormData();
      fd.append('action', 'admin_chat_send');
      fd.append('admin_key', ADMIN_KEY);
      fd.append('chat_id', activeRoom);
      fd.append('message', text);
      fd.append('sender', adminName);
      fd.append('type', type);
      if (mediaUrl) fd.append('media_url', mediaUrl);
      const res = await fetch(API, { method: 'POST', body: fd });
      const data = await res.json();
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

  // Room list view
  if (!activeRoom) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4 min-h-screen" dir="rtl">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/admin/dashboard')} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-emerald-400">الدردشة</h1>
          <MessageCircle className="w-5 h-5 text-emerald-400" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        ) : (
          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate('/admin/support')}
              className="w-full bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Headset className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-right flex-1">
                <p className="text-sm font-bold text-cyan-400">الدعم السريع</p>
                <p className="text-[10px] text-muted-foreground">تذاكر المستخدمين</p>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </motion.button>

            {rooms.map((room, i) => (
              <motion.button
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 1) * 0.1 }}
                onClick={() => setActiveRoom(room.id)}
                className="w-full bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    {room.type === 'super_group' ? (
                      <Shield className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Users className="w-6 h-6 text-emerald-400" />
                    )}
                  </div>
                  {room.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center">
                      {room.unread}
                    </span>
                  )}
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{room.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {room.last_message ? `${room.last_message.sender}: ${room.last_message.text}` : 'لا رسائل بعد'}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-[9px] text-muted-foreground">
                    {room.last_message ? formatTime(room.last_message.time) : ''}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{room.members} عضو</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Chat view
  const currentRoom = rooms.find(r => r.id === activeRoom);

  // Group messages by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const dateStr = new Date(msg.time?.replace(' ', 'T') || Date.now()).toDateString();
    const last = grouped[grouped.length - 1];
    if (last?.date === dateStr) last.msgs.push(msg);
    else grouped.push({ date: dateStr, msgs: [msg] });
  });

  return (
    <>
    <div className="max-w-2xl mx-auto flex flex-col h-screen" dir="rtl">
      {/* Header */}
      <div className="bg-[#111318] border-b border-white/5 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => setActiveRoom(null)} className="text-muted-foreground">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          {currentRoom?.type === 'super_group' ? (
            <Shield className="w-5 h-5 text-emerald-400" />
          ) : (
            <Users className="w-5 h-5 text-emerald-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{currentRoom?.name}</p>
          <p className="text-[10px] text-emerald-400">{currentRoom?.members} عضو</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
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

              return (
                <ChatBubble
                  key={msg.id || idx}
                  isMine={isMe}
                  senderName={msg.sender_name || msg.sender}
                  content={textContent}
                  mediaUrl={msg.media_url}
                  mediaType={msgType}
                  voiceDuration={msgType === 'voice' ? parseInt(msg.text) || 0 : undefined}
                  time={msg.time}
                  showSender={showSender}
                />
              );
            })}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "hsl(160 84% 39% / 0.1)" }}>
              <MessageCircle className="w-7 h-7 text-emerald-400/60" />
            </div>
            <p className="text-sm text-muted-foreground">لا توجد رسائل بعد</p>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div className="px-4 py-2 text-center border-t border-white/5">
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
