import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Paperclip, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TicketReply {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
}

interface Props {
  ticket: any;
  canAct: boolean;
  adminUsername: string | null;
  onUpdate: () => void;
}

const TicketRepliesSection: React.FC<Props> = ({ ticket, canAct, adminUsername, onUpdate }) => {
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReplies();
    const channel = supabase
      .channel(`admin-ticket-replies-${ticket.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_replies", filter: `ticket_id=eq.${ticket.id}` }, (payload) => {
        const newReply = payload.new as TicketReply;
        setReplies(prev => {
          if (prev.some(r => r.id === newReply.id)) return prev;
          return [...prev, newReply];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const loadReplies = async () => {
    setLoading(true);
    const { data } = await supabase.from("ticket_replies").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    if (data) setReplies(data as any);
    setLoading(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !canAct) return;
    setSending(true);
    try {
      await supabase.from("ticket_replies").insert({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_name: adminUsername || "الإدارة",
        message: replyText.trim(),
      } as any);
      await supabase.from("support_tickets").update({
        status: "replied",
        admin_reply: replyText.trim(),
        admin_username: adminUsername,
        replied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", ticket.id);
      // Send notification to user
      await supabase.from("notifications").insert({
        user_uuid: ticket.user_uuid,
        title: "💬 رد على تذكرتك",
        body: `تم الرد على تذكرة "${ticket.subject}" من فريق الدعم.`,
        target: "personal",
      });
      toast.success("تم إرسال الرد");
      setReplyText("");
      onUpdate();
    } catch {
      toast.error("فشل إرسال الرد");
    }
    setSending(false);
  };

  const handleCloseTicket = async () => {
    try {
      await supabase.from("support_tickets").update({
        status: "closed",
        updated_at: new Date().toISOString(),
      }).eq("id", ticket.id);
      await supabase.from("notifications").insert({
        user_uuid: ticket.user_uuid,
        title: "✅ تم إغلاق التذكرة",
        body: `تم إنهاء تذكرة "${ticket.subject}". شكراً لتواصلك.`,
        target: "personal",
      });
      toast.success("تم إغلاق التذكرة");
      onUpdate();
    } catch {
      toast.error("فشل إغلاق التذكرة");
    }
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  const formatDate = (d: string) => new Date(d).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-muted-foreground">المحادثة ({replies.length} رسالة)</h4>
      
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-2 bg-muted/5 rounded-xl p-2">
          {replies.map(reply => (
            <div key={reply.id} className={`flex ${reply.sender_type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl p-2.5 ${
                reply.sender_type === "user" 
                  ? "bg-primary/10 border border-primary/20" 
                  : "bg-emerald-500/10 border border-emerald-500/20"
              }`}>
                <p className="text-[10px] font-bold mb-0.5 ${reply.sender_type === 'admin' ? 'text-emerald-400' : 'text-primary'}">
                  {reply.sender_type === "admin" ? `⭐ ${reply.sender_name}` : `👤 ${reply.sender_name}`}
                </p>
                {reply.attachment_url && (
                  isImageUrl(reply.attachment_url) ? (
                    <a href={reply.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                      <img src={reply.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-32 object-cover" />
                    </a>
                  ) : (
                    <a href={reply.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mb-1 text-[10px] text-primary underline">
                      <Paperclip className="w-3 h-3" /> مرفق
                    </a>
                  )
                )}
                <p className="text-xs text-foreground whitespace-pre-line">{reply.message}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{formatDate(reply.created_at)}</p>
              </div>
            </div>
          ))}
          {replies.length === 0 && (
            <p className="text-center text-[10px] text-muted-foreground py-3">لا توجد ردود بعد</p>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {canAct && ticket.status !== "closed" && (
        <div className="space-y-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="اكتب الرد..."
            className="text-sm min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={!replyText.trim() || sending} onClick={handleSendReply}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 ml-1" />إرسال الرد</>}
            </Button>
            <Button size="sm" variant="outline" className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" onClick={handleCloseTicket}>
              <CheckCircle className="w-4 h-4 ml-1" />إغلاق التذكرة
            </Button>
          </div>
        </div>
      )}

      {ticket.status === "closed" && (
        <p className="text-center text-xs text-muted-foreground bg-muted/10 rounded-lg py-2">✅ تم إغلاق هذه التذكرة</p>
      )}
    </div>
  );
};

export default TicketRepliesSection;
