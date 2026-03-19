import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle, ArrowRight, Users, Shield, Mic, ImageIcon, Phone, StopCircle, ArrowLeft, Headset } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminSession } from '@/hooks/use-admin-session';
import { useNavigate } from 'react-router-dom';

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
}

export default function AdminChatPage() {
  const { adminUsername, adminDisplayName } = useAdminSession();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const sendMessage = async (text: string, type = 'text') => {
    if (!text.trim() || !activeRoom) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('action', 'admin_chat_send');
      fd.append('admin_key', ADMIN_KEY);
      fd.append('chat_id', activeRoom);
      fd.append('message', text);
      fd.append('sender', adminName);
      fd.append('type', type);
      const res = await fetch(API, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setInput('');
      }
    } catch { toast.error('فشل الإرسال'); }
    setSending(false);
  };

  const handleVoiceToggle = () => {
    if (recording) {
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      const duration = recordingTime;
      setRecordingTime(0);
      sendMessage('رسالة صوتية', 'voice');
    } else {
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    }
  };

  const handleImageUpload = () => { fileInputRef.current?.click(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendMessage(`صورة: ${file.name}`, 'image');
  };

  const handleCall = () => {
    toast.info('جاري بدء المكالمة الصوتية...');
    sendMessage('بدأ مكالمة صوتية', 'call');
  };

  const formatTime = (t: string) => {
    try {
      const d = new Date(t.replace(' ', 'T'));
      return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch { return t; }
  };

  const getInitial = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

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
            {/* Quick Support */}
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

            {/* Chat Groups */}
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

  return (
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
        <button onClick={handleCall} className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Phone className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <AnimatePresence>
          {messages.map((msg, i) => {
            const isMe = msg.sender === adminName;
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const showSender = !isMe && (!prevMsg || prevMsg.sender !== msg.sender);
            const initial = getInitial(msg.sender_name || msg.sender);

            return (
              <motion.div
                key={msg.id || i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-start' : 'justify-end'} mb-1.5`}
              >
                {/* Avatar for incoming */}
                {!isMe && showSender && (
                  <div className="flex-shrink-0 ml-2 self-end mb-1">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/10">
                      <span className="text-[10px] font-bold text-emerald-400">{initial}</span>
                    </div>
                  </div>
                )}
                {!isMe && !showSender && <div className="w-9 flex-shrink-0" />}

                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                  isMe
                    ? 'bg-emerald-500/20 border border-emerald-500/10'
                    : 'bg-white/[0.06] border border-white/5'
                }`} style={{
                  borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                }}>
                  {showSender && !isMe && (
                    <p className="text-[9px] font-bold text-emerald-400 mb-0.5">{msg.sender_name}</p>
                  )}
                  {msg.type === 'voice' ? (
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <div className="w-24 h-1 bg-emerald-500/30 rounded-full">
                        <div className="w-1/2 h-full bg-emerald-400 rounded-full" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">0:05</span>
                    </div>
                  ) : msg.type === 'image' ? (
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                      <span className="text-xs">{msg.text}</span>
                    </div>
                  ) : msg.type === 'call' ? (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">{msg.text}</span>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  )}
                  <p className="text-[8px] text-muted-foreground mt-1 text-left">{formatTime(msg.time)}</p>
                </div>

                {/* Avatar for mine */}
                {isMe && (
                  <div className="flex-shrink-0 mr-2 self-end mb-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center border border-emerald-500/10" style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))' }}>
                      <span className="text-[10px] font-bold text-white/80">{getInitial(adminName)}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div className="bg-[#111318] border-t border-white/5 px-3 py-2 shrink-0">
        {recording ? (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2">
            <button onClick={handleVoiceToggle} className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <StopCircle className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1 text-center">
              <span className="text-sm text-red-400 font-mono">{recordingTime}ث</span>
              <span className="text-xs text-muted-foreground mr-2">جاري التسجيل...</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            <button onClick={handleImageUpload} className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={handleVoiceToggle} className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 text-muted-foreground" />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="اكتب رسالتك..."
              className="flex-1 bg-white/[0.05] border border-white/5 rounded-full px-4 py-2 text-sm outline-none"
              dir="rtl"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 disabled:opacity-30"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}