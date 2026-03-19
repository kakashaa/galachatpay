import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MessageCircle, Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Conversation {
  id: string;
  type: string;
  participants: string[];
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  otherName?: string;
  unreadCount?: number;
}

const DirectMessages: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [targetUuid, setTargetUuid] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const adminSession = (() => {
    try { return JSON.parse(localStorage.getItem('admin_session') || 'null'); } catch { return null; }
  })();
  const myUuid = user?.uuid || adminSession?.uuid || adminSession?.username || '';

  const fetchConversations = useCallback(async () => {
    if (!myUuid) return;
    const { data } = await (supabase as any)
      .from('conversations').select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    const convos = ((data || []) as Conversation[]).filter(c => (c.participants || []).includes(myUuid));

    const { data: unreadData } = await (supabase as any)
      .from('direct_messages').select('conversation_id')
      .neq('sender_uuid', myUuid).eq('status', 'sent');

    const unreadMap = new Map<string, number>();
    for (const msg of (unreadData || [])) {
      unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
    }
    for (const c of convos) {
      c.unreadCount = unreadMap.get(c.id) || 0;
      c.otherName = (c.participants || []).find((p: string) => p !== myUuid) || 'محادثة';
    }
    setConversations(convos);
    setLoading(false);
  }, [myUuid]);

  useEffect(() => {
    fetchConversations();
    const channel = supabase
      .channel('dm_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  const startNewChat = async () => {
    if (!targetUuid.trim() || creating || !myUuid) return;
    setCreating(true);
    try {
      const { data: existing } = await (supabase as any).from('conversations').select('*').eq('type', 'direct');
      const existingConvo = (existing || []).find((c: any) => {
        const p = c.participants || [];
        return p.includes(myUuid) && p.includes(targetUuid.trim());
      });
      if (existingConvo) { navigate(`/messages/${existingConvo.id}`); }
      else {
        const { data: newConvo } = await (supabase as any).from('conversations')
          .insert({ type: 'direct', participants: [myUuid, targetUuid.trim()] }).select().single();
        if (newConvo) navigate(`/messages/${newConvo.id}`);
      }
    } catch { /* silent */ }
    setCreating(false); setShowNewChat(false);
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `${mins}د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}س`;
    return `${Math.floor(hours / 24)}ي`;
  };

  const filtered = conversations.filter(c =>
    !searchQuery || (c.otherName || '').includes(searchQuery) || (c.last_message || '').includes(searchQuery)
  );

  return (
    <div className="h-screen flex flex-col" dir="rtl" style={{ background: "hsl(var(--chat-bg))" }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: "hsl(var(--chat-header-bg))", backdropFilter: "blur(20px)", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">الرسائل</h1>
          <button onClick={() => setShowNewChat(true)} className="p-2 rounded-xl" style={{ background: "hsl(160 84% 39% / 0.15)" }}>
            <Plus className="w-5 h-5" style={{ color: "hsl(160 84% 39%)" }} />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9 h-10 rounded-2xl text-sm border-0"
              style={{ background: "hsl(var(--chat-input-bg))" }}
            />
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
              <MessageCircle className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">لا توجد محادثات</p>
          </div>
        ) : (
          <div>
            {filtered.map((convo, i) => (
              <motion.button
                key={convo.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/messages/${convo.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-right transition-colors active:bg-white/5"
                style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-13 h-13 rounded-full flex items-center justify-center" style={{ width: 52, height: 52, background: "linear-gradient(135deg, hsl(217 91% 40% / 0.2), hsl(160 84% 39% / 0.2))" }}>
                    <span className="text-lg font-bold text-foreground">
                      {(convo.otherName || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Online dot */}
                  <div className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: "hsl(var(--chat-bg))", background: "hsl(var(--chat-online))" }} />
                  {/* Unread badge */}
                  {(convo.unreadCount || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: "hsl(350 89% 55%)", color: "#fff" }}>
                      {convo.unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground truncate">{convo.otherName}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(convo.last_message_at)}</span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${(convo.unreadCount || 0) > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {convo.last_message || 'محادثة جديدة'}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-sm" dir="rtl" style={{ background: "hsl(var(--chat-bg))", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
          <div className="p-4 space-y-4">
            <p className="text-sm font-bold text-center">محادثة جديدة</p>
            <Input
              placeholder="UUID أو اسم المستخدم"
              value={targetUuid}
              onChange={e => setTargetUuid(e.target.value)}
              dir="ltr"
              className="border-0"
              style={{ background: "hsl(var(--chat-input-bg))" }}
            />
            <button
              onClick={startNewChat}
              disabled={!targetUuid.trim() || creating}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}
            >
              {creating ? 'جاري الإنشاء...' : 'بدء محادثة'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DirectMessages;
