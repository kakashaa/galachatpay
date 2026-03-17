import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle, X, Search, Archive, ArrowRight, ArrowUpRight, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API = "https://galachat.site/project-z/api.php";
const ADMIN_KEY = "ghala2026owner";

interface SupportChat {
  id: string;
  uuid: string;
  user_name: string;
  type: string;
  status: string;
  last_message?: string;
  last_time?: string;
  unread?: number;
  created_at: string;
}

interface SupportMessage {
  id: string;
  sender: string;
  sender_name: string;
  sender_type: string;
  message: string;
  attachment_url?: string;
  created_at: string;
}

interface Props {
  adminUsername: string;
  adminDisplayName: string;
  canAct: boolean;
}

const AdminSupportManager: React.FC<Props> = ({ adminUsername, adminDisplayName, canAct }) => {
  const [tab, setTab] = useState<'active' | 'archive' | 'search'>('active');
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchUuid, setSearchUuid] = useState('');
  const [searchResults, setSearchResults] = useState<SupportChat[]>([]);
  const [searching, setSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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

  // Load chats based on tab
  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === 'active' ? 'open' : 'closed';
      if (tab === 'search') { setLoading(false); return; }
      const data = await apiPost({ action: 'support_list', status });
      if (data.success && data.chats) {
        setChats(data.chats);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    setActiveChatId(null);
    setMessages([]);
    loadChats();
  }, [tab, loadChats]);

  // Load messages for active chat + polling
  useEffect(() => {
    if (!activeChatId) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const loadMsgs = async () => {
      try {
        const data = await apiPost({ action: 'support_messages', chat_id: activeChatId });
        if (data.success && data.messages) {
          setMessages(data.messages);
          setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }, 100);
        }
      } catch { /* silent */ }
    };

    loadMsgs();
    pollRef.current = setInterval(loadMsgs, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChatId]);

  const handleSend = async () => {
    if (!input.trim() || sending || !activeChatId) return;
    setSending(true);
    try {
      const data = await apiPost({
        action: 'support_send',
        chat_id: activeChatId,
        message: input.trim(),
        sender: adminUsername,
        sender_name: adminDisplayName,
      });
      if (data.success) {
        setInput('');
        // Refresh messages
        const msgData = await apiPost({ action: 'support_messages', chat_id: activeChatId });
        if (msgData.success && msgData.messages) {
          setMessages(msgData.messages);
          setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }, 100);
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

  const handleClose = async (chatId: string) => {
    try {
      await apiPost({ action: 'support_close', chat_id: chatId });
      toast.success('تم إغلاق المحادثة');
      setActiveChatId(null);
      loadChats();
    } catch {
      toast.error('فشل الإغلاق');
    }
  };

  const handleTransfer = async (chatId: string) => {
    try {
      await apiPost({ action: 'support_transfer', chat_id: chatId });
      toast.success('تم التحويل للسوبر أدمن');
      loadChats();
    } catch {
      toast.error('فشل التحويل');
    }
  };

  const handleSearch = async () => {
    if (!searchUuid.trim()) return;
    setSearching(true);
    try {
      const data = await apiGet({
        action: 'support_search',
        admin_key: ADMIN_KEY,
        uuid: searchUuid.trim(),
      });
      if (data.success && data.chats) {
        setSearchResults(data.chats);
      } else {
        setSearchResults([]);
      }
    } catch {
      toast.error('فشل البحث');
    }
    setSearching(false);
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: string) => new Date(d).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short' });

  const isArchive = tab === 'archive';
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

  // Chat view
  if (activeChatId) {
    return (
      <div className="flex flex-col h-[calc(100vh-180px)] max-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
          <button onClick={() => setActiveChatId(null)} className="text-xs text-primary font-bold flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" /> رجوع
          </button>
          <span className="text-sm font-bold text-foreground">محادثة الدعم</span>
          <div className="flex gap-1">
            {canAct && !isArchive && (
              <>
                <button onClick={() => handleTransfer(activeChatId)} className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold">
                  <ArrowUpRight className="w-3 h-3 inline ml-0.5" />تحويل
                </button>
                <button onClick={() => handleClose(activeChatId)} className="text-[10px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-bold">
                  <XCircle className="w-3 h-3 inline ml-0.5" />إغلاق
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                msg.sender_type === 'admin'
                  ? 'bg-primary/15 border border-primary/20'
                  : 'bg-card border border-border/40'
              }`}>
                {msg.sender_type !== 'admin' && (
                  <p className="text-[10px] font-bold text-amber-400 mb-0.5">{msg.sender_name}</p>
                )}
                {msg.sender_type === 'admin' && (
                  <p className="text-[10px] font-bold text-emerald-400 mb-0.5">{msg.sender_name || 'فريق الدعم'}</p>
                )}
                {msg.attachment_url && (
                  isImage(msg.attachment_url) ? (
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                      <img src={msg.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-48 object-cover" />
                    </a>
                  ) : (
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block mb-1">📎 مرفق</a>
                  )
                )}
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{msg.message}</p>
                <span className="text-[9px] text-muted-foreground mt-1 block">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-10">لا توجد رسائل</p>
          )}
        </div>

        {/* Input - only for active chats */}
        {!isArchive && canAct && (
          <div className="border-t border-border/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="اكتب ردك..."
                className="flex-1 bg-muted/20 border border-border/30 rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                dir="rtl"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all active:scale-95"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Chat list / tabs view
  const displayChats = tab === 'search' ? searchResults : chats;

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-2" dir="rtl">
        {[
          { key: 'active' as const, label: 'النشطة', icon: <MessageCircle className="w-3.5 h-3.5" /> },
          { key: 'archive' as const, label: 'الأرشيف', icon: <Archive className="w-3.5 h-3.5" /> },
          { key: 'search' as const, label: 'بحث', icon: <Search className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              tab === t.key ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border/40 text-muted-foreground'
            }`}
          >
            {t.icon} {t.label}
            {t.key === 'active' && chats.length > 0 && tab !== 'search' && (
              <span className="bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full">{chats.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search input */}
      {tab === 'search' && (
        <div className="flex gap-2" dir="rtl">
          <Input
            value={searchUuid}
            onChange={(e) => setSearchUuid(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="أدخل UUID للبحث..."
            className="flex-1 text-sm"
          />
          <Button size="sm" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {/* Chat list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayChats.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{tab === 'search' ? 'لا توجد نتائج' : 'لا توجد محادثات'}</p>
        </div>
      ) : (
        displayChats.map(chat => (
          <button
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            className={`w-full bg-card border rounded-xl p-4 text-right hover:border-primary/30 transition-all active:scale-[0.98] ${
              chat.status === 'closed' ? 'opacity-60 border-border/20' : 'border-border/40'
            }`}
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{chat.user_name}</p>
                <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">{chat.uuid}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  chat.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'
                }`}>
                  {chat.status === 'open' ? 'نشطة' : 'مغلقة'}
                </span>
                <span className="text-[10px] text-muted-foreground">{chat.type === 'quick' ? '⚡ سريع' : '💬 عادي'}</span>
              </div>
            </div>
            {chat.last_message && (
              <p className="text-[11px] text-muted-foreground mt-2 truncate">{chat.last_message}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">{formatDate(chat.created_at)}</p>
          </button>
        ))
      )}
    </div>
  );
};

export default AdminSupportManager;
