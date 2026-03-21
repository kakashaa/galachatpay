import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Users, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import DateSeparator from '@/components/chat/DateSeparator';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ChatMessage {
  id: string;
  sender_username: string;
  sender_display_name: string;
  message: string;
  message_type: string;
  is_deleted: boolean;
  created_at: string;
  media_url?: string | null;
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

const AdminGroupChat: React.FC<Props> = ({ adminUsername, adminRole: _adminRole }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [onlineAdmins, setOnlineAdmins] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  const loadAdmins = useCallback(async () => {
    try {
      const { data: accountData } = await supabase
        .from('admin_accounts')
        .select('username, display_name, role')
        .eq('is_active', true);
      if (accountData) setAdmins(accountData);
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

  useEffect(() => {
    const recent = new Set<string>();
    const now = Date.now();
    messages.forEach(m => {
      if (now - new Date(m.created_at).getTime() < 10 * 60 * 1000) recent.add(m.sender_username);
    });
    setOnlineAdmins(Array.from(recent));
  }, [messages]);

  const handleSendText = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('admin_chat_messages').insert({
        sender_username: adminUsername,
        sender_display_name: adminUsername,
        message: text,
        message_type: 'text',
      } as any);
      if (error) throw error;
    } catch { toast.error('فشل إرسال الرسالة'); }
    finally { setSending(false); }
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
      await supabase.from('admin_chat_messages').insert({
        sender_username: adminUsername,
        sender_display_name: adminUsername,
        message: '',
        message_type: msgType,
        media_url: urlData.publicUrl,
      } as any);
    } catch { toast.error("فشل رفع الملف"); }
    setUploading(false);
  };

  const handleVoiceSend = async (url: string, duration: number) => {
    try {
      await supabase.from('admin_chat_messages').insert({
        sender_username: adminUsername,
        sender_display_name: adminUsername,
        message: `${duration}`,
        message_type: 'voice',
        media_url: url,
      } as any);
    } catch { toast.error("فشل إرسال الصوت"); }
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
    <>
    <div
      className="flex flex-col h-[calc(100vh-180px)] max-h-[600px] rounded-3xl overflow-hidden backdrop-blur-xl"
      dir="rtl"
      style={{
        background: 'linear-gradient(180deg, rgba(15,15,25,0.95), rgba(8,8,16,0.98))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3.5 shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.05))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))',
              border: '1px solid rgba(16,185,129,0.15)',
              boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
            }}
          >
            <Users className="w-5 h-5" style={{ color: 'hsl(160 84% 39%)' }} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-extrabold text-foreground">مجموعة الإدارة</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] text-muted-foreground">{admins.length} عضو · {onlineAdmins.length} متصل</p>
            </div>
          </div>
        </div>

        {admins.length > 0 && (
          <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {admins.map(admin => {
              const isOnline = onlineAdmins.includes(admin.username);
              const initial = (admin.display_name || admin.username).charAt(0).toUpperCase();
              return (
                <div key={admin.username} className="flex flex-col items-center gap-1 min-w-[46px]">
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black"
                      style={{
                        background: admin.role === 'owner'
                          ? 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.1))'
                          : admin.role === 'super_admin'
                          ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.1))'
                          : 'rgba(255,255,255,0.06)',
                        border: isOnline ? '2px solid rgba(16,185,129,0.6)' : '1px solid rgba(255,255,255,0.08)',
                        color: admin.role === 'owner' ? '#ef4444' : admin.role === 'super_admin' ? '#10b981' : '#a1a1aa',
                        boxShadow: isOnline ? '0 0 12px rgba(16,185,129,0.25)' : 'none',
                      }}
                    >
                      {initial}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                      style={{
                        background: isOnline ? '#10b981' : 'rgba(113,113,122,0.5)',
                        border: '2px solid rgba(15,15,25,0.95)',
                        boxShadow: isOnline ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-muted-foreground truncate max-w-[46px] font-medium">
                    {admin.display_name || admin.username}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <MessageCircle className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-xs text-muted-foreground font-bold">لا توجد رسائل بعد</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <DateSeparator date={group.msgs[0].created_at} />
              {group.msgs.map((msg, idx) => {
                const isMine = msg.sender_username === adminUsername;
                const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                const showSender = !isMine && (!prevMsg || prevMsg.sender_username !== msg.sender_username);
                const role = getAdminRole(msg.sender_username);
                const roleLabel = ROLE_LABELS[role] || '';
                const displayName = `${getAdminDisplayName(msg.sender_username)}${roleLabel ? ` · ${roleLabel}` : ''}`;
                
                const msgType = msg.message_type || 'text';
                const isMediaMsg = ['image', 'video', 'voice'].includes(msgType);
                const textContent = isMediaMsg && msg.media_url ? (msgType === 'voice' ? null : null) : msg.message;

                return (
                  <ChatBubble
                    key={msg.id}
                    isMine={isMine}
                    senderName={displayName}
                    senderType={role}
                    content={textContent || (isMediaMsg ? null : msg.message)}
                    mediaUrl={msg.media_url}
                    mediaType={msgType}
                    voiceDuration={msgType === 'voice' ? parseInt(msg.message) || 0 : undefined}
                    time={msg.created_at}
                    showSender={showSender}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div className="px-4 py-2 text-center" style={{ background: 'rgba(59,130,246,0.05)' }}>
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span className="font-bold">جاري الرفع...</span>
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

    {/* Image Preview Dialog */}
    {previewImage && (
      <Dialog open onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 bg-black/95 border-none">
          <button onClick={() => setPreviewImage(null)} className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/50">
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={previewImage} className="w-full h-full object-contain max-h-[85vh]" />
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

export default AdminGroupChat;
