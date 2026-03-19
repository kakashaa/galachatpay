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
  // derived
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

  // Also check admin session
  const adminSession = (() => {
    try { return JSON.parse(localStorage.getItem('admin_session') || 'null'); } catch { return null; }
  })();
  const myUuid = user?.uuid || adminSession?.uuid || adminSession?.username || '';
  const myName = user?.name || adminSession?.display_name || adminSession?.username || '';

  const fetchConversations = useCallback(async () => {
    if (!myUuid) return;
    const { data } = await (supabase as any)
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    const convos = ((data || []) as Conversation[]).filter(c => {
      const parts = c.participants || [];
      return parts.includes(myUuid);
    });

    // Batch unread count - single query for all unread messages not sent by me
    const { data: unreadData } = await (supabase as any)
      .from('direct_messages')
      .select('conversation_id')
      .neq('sender_uuid', myUuid)
      .eq('status', 'sent');

    const unreadMap = new Map<string, number>();
    for (const msg of (unreadData || [])) {
      unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
    }

    for (const c of convos) {
      c.unreadCount = unreadMap.get(c.id) || 0;
      const parts = c.participants || [];
      c.otherName = parts.find((p: string) => p !== myUuid) || 'محادثة';
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
      // Check existing
      const { data: existing } = await (supabase as any)
        .from('conversations')
        .select('*')
        .eq('type', 'direct');

      const existingConvo = (existing || []).find((c: any) => {
        const p = c.participants || [];
        return p.includes(myUuid) && p.includes(targetUuid.trim());
      });

      if (existingConvo) {
        navigate(`/messages/${existingConvo.id}`);
      } else {
        const { data: newConvo } = await (supabase as any)
          .from('conversations')
          .insert({
            type: 'direct',
            participants: [myUuid, targetUuid.trim()],
          })
          .select()
          .single();
        if (newConvo) navigate(`/messages/${newConvo.id}`);
      }
    } catch { /* silent */ }
    setCreating(false);
    setShowNewChat(false);
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
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-muted/50">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">الرسائل</h1>
          <button onClick={() => setShowNewChat(true)} className="p-2 rounded-xl bg-primary/10">
            <Plus className="w-5 h-5 text-primary" />
          </button>
        </div>
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9 bg-muted/30 border-border/20 rounded-xl h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">لا توجد محادثات</p>
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {filtered.map((convo) => (
              <motion.button
                key={convo.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => navigate(`/messages/${convo.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-right"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      {(convo.otherName || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {(convo.unreadCount || 0) > 0 && (
                    <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground truncate">{convo.otherName}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(convo.last_message_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{convo.last_message || 'محادثة جديدة'}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-sm" dir="rtl">
          <div className="p-4 space-y-3">
            <p className="text-sm font-bold">محادثة جديدة</p>
            <Input
              placeholder="UUID أو اسم المستخدم"
              value={targetUuid}
              onChange={e => setTargetUuid(e.target.value)}
              dir="ltr"
            />
            <button
              onClick={startNewChat}
              disabled={!targetUuid.trim() || creating}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold disabled:opacity-50"
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
