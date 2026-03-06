import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Paperclip, CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";


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
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (newReply.sender_type === "user") {
          toast.info("💬 رسالة جديدة من المستخدم");
        }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("الحد الأقصى 10MB"); return; }
    setAttachment(file);
    if (file.type.startsWith("image/")) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendReply = async () => {
    if ((!replyText.trim() && !attachment) || !canAct) return;
    setSending(true);
    try {
      let attachUrl: string | null = null;
      if (attachment) {
        setUploading(true);
        const ts = Date.now();
        const ext = attachment.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `tickets/admin/${ticket.id}/${ts}.${ext}`;
        const { error } = await supabase.storage.from("attachments").upload(path, attachment);
        if (!error) {
          const { data } = supabase.storage.from("attachments").getPublicUrl(path);
          attachUrl = data.publicUrl;
        }
        setUploading(false);
      }

      await supabase.from("ticket_replies").insert({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_name: adminUsername || "الإدارة",
        message: replyText.trim() || (attachment ? "مرفق" : ""),
        attachment_url: attachUrl,
      } as any);

      await supabase.from("support_tickets").update({
        status: "replied",
        admin_reply: replyText.trim() || (attachment ? "مرفق" : ""),
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
      clearAttachment();
      onUpdate();
    } catch {
      toast.error("فشل إرسال الرد");
      setUploading(false);
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
        <div className="max-h-80 overflow-y-auto space-y-2 bg-muted/5 rounded-xl p-3">
          {replies.map(reply => (
            <div key={reply.id} className={`flex ${reply.sender_type === "user" ? "justify-end" : "justify-start"}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`max-w-[80%] rounded-2xl p-2.5 ${
                  reply.sender_type === "user" 
                    ? "bg-primary/10 border border-primary/20 rounded-tr-md" 
                    : "bg-emerald-500/10 border border-emerald-500/20 rounded-tl-md"
                }`}
              >
                <p className={`text-[10px] font-bold mb-0.5 ${reply.sender_type === 'admin' ? 'text-emerald-400' : 'text-primary'}`}>
                  {reply.sender_type === "admin" ? `⭐ ${reply.sender_name}` : `👤 ${reply.sender_name}`}
                </p>
                {reply.attachment_url && (
                  isImageUrl(reply.attachment_url) ? (
                    <a href={reply.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                      <img src={reply.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-40 object-cover" />
                    </a>
                  ) : (
                    <a href={reply.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mb-1 text-[10px] text-primary underline">
                      <Paperclip className="w-3 h-3" /> عرض المرفق
                    </a>
                  )
                )}
                <p className="text-xs text-foreground whitespace-pre-line">{reply.message}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{formatDate(reply.created_at)}</p>
              </motion.div>
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
          {/* Attachment preview */}
          {attachment && (
            <div className="flex items-center gap-2 bg-muted/20 rounded-lg p-2">
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="مرفق" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Paperclip className="w-5 h-5 text-primary" />
                </div>
              )}
              <span className="text-xs text-foreground flex-1 truncate">{attachment.name}</span>
              <button onClick={clearAttachment} className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                <X className="w-3 h-3 text-destructive" />
              </button>
            </div>
          )}

          {/* Chat-like input bar */}
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.mp4,video/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-xl bg-muted/20 border border-border/30 flex items-center justify-center active:scale-95 transition-transform" title="إرفاق ملف">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </button>
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
              placeholder="اكتب الرد..."
              className="flex-1 h-10 px-3 bg-muted/20 rounded-xl text-foreground placeholder:text-muted-foreground border border-border/30 focus:border-primary outline-none text-sm"
            />
            <button
              onClick={handleSendReply}
              disabled={(!replyText.trim() && !attachment) || sending || uploading}
              className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            >
              {(sending || uploading) ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
          </div>

          {/* Close ticket button */}
          <Button size="sm" variant="outline" className="w-full text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" onClick={handleCloseTicket}>
            <CheckCircle className="w-4 h-4 ml-1" />إغلاق التذكرة
          </Button>
        </div>
      )}

      {ticket.status === "closed" && (
        <p className="text-center text-xs text-muted-foreground bg-muted/10 rounded-lg py-2">✅ تم إغلاق هذه التذكرة</p>
      )}
    </div>
  );
};

export default TicketRepliesSection;
