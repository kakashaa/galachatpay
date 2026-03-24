import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  attachment_url?: string | null;
  created_at: string;
}

interface Props {
  ticketId: string;
  currentUserType?: 'user' | 'admin';
}

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
const isAudio = (url: string) => /\.(mp3|ogg|webm|wav|m4a)(\?|$)/i.test(url);

const formatTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString('ar-SA', {
      timeZone: 'Asia/Riyadh',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
};

const TicketMessages: React.FC<Props> = ({ ticketId, currentUserType = 'user' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      setError(false);
      const { data, error: err } = await supabase
        .from('ticket_messages' as any)
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setMessages((data as any[]) || []);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
  }, [ticketId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-msgs-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Remove optimistic duplicates
          const cleaned = prev.filter(m => {
            if (!m.id.startsWith('local-')) return true;
            return !(m.sender_type === newMsg.sender_type && m.message === newMsg.message);
          });
          return [...cleaned, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <AlertTriangle className="w-8 h-8 mx-auto text-destructive/60" />
        <p className="text-xs text-muted-foreground">فشل تحميل المحادثة</p>
        <Button size="sm" variant="outline" onClick={() => { setLoading(true); loadMessages(); }}>
          <RefreshCw className="w-3 h-3 ml-1" /> إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[10px] text-muted-foreground rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          بانتظار الرد...
        </span>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2" dir="rtl">
      <AnimatePresence>
        {messages.map(msg => {
          const isMe = msg.sender_type === currentUserType;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${isMe ? 'rounded-tl-md' : 'rounded-tr-md'}`}
                style={{
                  background: isMe ? 'rgba(96,165,250,0.12)' : 'rgba(148,163,184,0.1)',
                  border: `1px solid ${isMe ? 'rgba(96,165,250,0.15)' : 'rgba(148,163,184,0.12)'}`,
                }}
              >
                <span className={`text-[10px] font-bold ${isMe ? 'text-blue-400' : 'text-muted-foreground'}`}>
                  {msg.sender_name}
                </span>

                {msg.attachment_url && (
                  isImage(msg.attachment_url) ? (
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block my-1">
                      <img src={msg.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-48 object-cover" />
                    </a>
                  ) : isAudio(msg.attachment_url) ? (
                    <audio controls src={msg.attachment_url} className="w-full mt-1 max-w-[220px]" />
                  ) : (
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block my-1">
                      عرض المرفق
                    </a>
                  )
                )}

                <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">{msg.message}</p>
                <span className="text-[9px] text-muted-foreground mt-1 block text-left">{formatTime(msg.created_at)}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default TicketMessages;
