import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle, Search, Archive, ArrowRight, ArrowUpRight, XCircle, User, Clock, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API = "https://galachat.site/project-z/api.php";
const ADMIN_KEY = "ghala2026owner";

interface SupportChat {
  id: string;
  uuid: string;
  user_name: string;
  type: string;
  assigned_to: string;
  status: string;
  message_count: number;
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
  const [tab, setTab] = useState<'active' | 'archive'>('active');
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchUuid, setSearchUuid] = useState('');
  const [searchResults, setSearchResults] = useState<SupportChat[]>([]);
  const [showSearch, setShowSearch] = useState(false);
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

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === 'active' ? 'open' : 'closed';
      const data = await apiPost({ action: 'support_list', status });
      if (data.chats) setChats(data.chats);
    } catch { /* silent */ }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    setActiveChatId(null);
    setMessages([]);
    setShowSearch(false);
    loadChats();
  }, [tab, loadChats]);

  // Polling messages
  useEffect(() => {
    if (!activeChatId) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    const loadMsgs = async () => {
      try {
        const data = await apiPost({ action: 'support_messages', chat_id: activeChatId });
        if (data.messages) {
          setMessages(data.messages);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
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
        const msgData = await apiPost({ action: 'support_messages', chat_id: activeChatId });
        if (msgData.messages) {
          setMessages(msgData.messages);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
        }
      } else toast.error('فشل إرسال الرسالة');
    } catch { toast.error('فشل إرسال الرسالة'); }
    finally { setSending(false); }
  };

  const [closingId, setClosingId] = useState<string | null>(null);
  const [transferringId, setTransferringId] = useState<string | null>(null);

  const handleClose = async (chatId: string) => {
    if (closingId) return;
    setClosingId(chatId);
    const t = toast.loading("جاري إغلاق المحادثة...");
    try {
      await apiPost({ action: 'support_close', chat_id: chatId });
      toast.dismiss(t);
      toast.success('تم إغلاق المحادثة ✅');
      setActiveChatId(null);
      loadChats();
    } catch { toast.dismiss(t); toast.error('فشل الإغلاق ❌'); }
    finally { setClosingId(null); }
  };

  const handleTransfer = async (chatId: string) => {
    if (transferringId) return;
    setTransferringId(chatId);
    const t = toast.loading("جاري التحويل...");
    try {
      await apiPost({ action: 'support_transfer', chat_id: chatId });
      toast.dismiss(t);
      toast.success('تم التحويل للسوبر أدمن ✅');
      loadChats();
    } catch { toast.dismiss(t); toast.error('فشل التحويل ❌'); }
    finally { setTransferringId(null); }
  };

  const handleSearch = async () => {
    if (!searchUuid.trim()) return;
    try {
      const data = await apiGet({ action: 'support_search', admin_key: ADMIN_KEY, uuid: searchUuid.trim() });
      if (data.chats) setSearchResults(data.chats);
      else setSearchResults([]);
    } catch { toast.error('فشل البحث'); }
  };

  const formatTime = (d: string) => {
    try { return new Date(d).toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short' }); }
    catch { return d; }
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  const isArchive = tab === 'archive';

  // Chat message view
  if (activeChatId) {
    return (
      <div className="flex flex-col h-[calc(100vh-180px)] max-h-[600px]" dir="rtl">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
          <button onClick={() => setActiveChatId(null)} className="text-xs text-primary font-bold flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" /> رجوع
          </button>
          <span className="text-sm font-bold text-foreground">محادثة الدعم</span>
          <div className="flex gap-1">
            {canAct && !isArchive && (
              <>
                <button onClick={() => handleTransfer(activeChatId)} disabled={!!transferringId} className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center gap-0.5 disabled:opacity-50">
                  {transferringId ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpRight className="w-3 h-3" />}تحويل
                </button>
                <button onClick={() => handleClose(activeChatId)} disabled={!!closingId} className="text-[10px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-bold flex items-center gap-0.5 disabled:opacity-50">
                  {closingId ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}إغلاق
                </button>
              </>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          <AnimatePresence>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                  msg.sender_type === 'admin'
                    ? 'bg-primary/15 border border-primary/20 rounded-tl-md'
                    : 'bg-card border border-border/40 rounded-tr-md'
                }`}>
                  <p className={`text-[10px] font-bold mb-0.5 ${
                    msg.sender_type === 'admin' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {msg.sender_type === 'admin' ? (msg.sender_name || 'فريق الدعم') : msg.sender_name}
                  </p>
                  {msg.attachment_url && (
                    isImage(msg.attachment_url) ? (
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                        <img src={msg.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-48 object-cover" />
                      </a>
                    ) : (
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block mb-1">عرض المرفق</a>
                    )
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{msg.message}</p>
                  <span className="text-[9px] text-muted-foreground mt-1 block text-left">{formatTime(msg.created_at)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-10">لا توجد رسائل</p>
          )}
        </div>

        {!isArchive && canAct && (
          <div className="border-t border-border/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="اكتب ردك..."
                className="flex-1 bg-muted/20 border border-border/30 rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Chat list
  const displayChats = showSearch ? searchResults : chats;

  return (
    <div className="space-y-3" dir="rtl">
      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'active' as const, label: 'المحادثات النشطة', icon: <MessageCircle className="w-3.5 h-3.5" /> },
          { key: 'archive' as const, label: 'الأرشيف', icon: <Archive className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setShowSearch(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              tab === t.key && !showSearch ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border/40 text-muted-foreground'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
            showSearch ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border/40 text-muted-foreground'
          }`}
        >
          <Search className="w-3.5 h-3.5" /> بحث
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2">
          <Input
            value={searchUuid}
            onChange={(e) => setSearchUuid(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="UUID للبحث..."
            className="flex-1 text-sm"
            dir="ltr"
          />
          <Button size="sm" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayChats.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{showSearch ? 'لا توجد نتائج' : 'لا توجد محادثات'}</p>
        </div>
      ) : (
        <AnimatePresence>
          {displayChats.map((chat, i) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card border rounded-xl p-4 space-y-2 ${
                chat.status === 'closed' ? 'opacity-60 border-border/20' : 'border-border/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{chat.user_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{chat.uuid}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    chat.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'
                  }`}>
                    {chat.status === 'open' ? 'نشطة' : 'مغلقة'}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {chat.type === 'quick' ? <><Clock className="w-3 h-3" /> سريع</> : <><MessageCircle className="w-3 h-3" /> عادي</>}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {chat.assigned_to && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {chat.assigned_to}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" /> {chat.message_count || 0} رسالة
                </span>
                <span>{formatDate(chat.created_at)}</span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => { setActiveChatId(chat.id); }}>
                  <MessageCircle className="w-3 h-3 ml-1" /> فتح
                </Button>
                {canAct && chat.status === 'open' && (
                  <>
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleTransfer(chat.id)}>
                      <ArrowUpRight className="w-3 h-3 ml-1" /> تحويل
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8 text-destructive hover:text-destructive" onClick={() => handleClose(chat.id)}>
                      <XCircle className="w-3 h-3 ml-1" /> إغلاق
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

export default AdminSupportManager;
