import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, Send, ChevronLeft, Paperclip, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { secureUpload } from "@/utils/secureUpload";
import { toast } from "sonner";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  admin_username: string | null;
  replied_at: string | null;
  created_at: string;
}

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

const TICKET_SUBJECTS = [
  { id: "tech", label: "مشكلة تقنية", color: "text-red-400 bg-red-500/10" },
  { id: "balance", label: "رصيد/شحن", color: "text-amber-400 bg-amber-500/10" },
  { id: "account", label: "حساب", color: "text-blue-400 bg-blue-500/10" },
  { id: "gifts", label: "هدايا", color: "text-purple-400 bg-purple-500/10" },
  { id: "voice", label: "صوت/غرف", color: "text-emerald-400 bg-emerald-500/10" },
  { id: "report", label: "بلاغ", color: "text-orange-400 bg-orange-500/10" },
  { id: "inquiry", label: "استفسار", color: "text-sky-400 bg-sky-500/10" },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "بانتظار الرد", color: "text-amber-400 bg-amber-500/10", icon: Clock },
  replied: { label: "تم الرد", color: "text-emerald-400 bg-emerald-500/10", icon: CheckCircle },
  closed: { label: "مغلق", color: "text-muted-foreground bg-muted/20", icon: XCircle },
};

const SupportTicketsEmbed: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadTickets();
    const channel = supabase
      .channel("tickets-user-embed")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, (payload) => {
        const updated = payload.new as any;
        if (updated.user_uuid === user.id.toString()) {
          setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
          if (selectedTicket?.id === updated.id) {
            setSelectedTicket((prev) => prev ? { ...prev, ...updated } : prev);
          }
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_replies" }, (payload) => {
        const newReply = payload.new as TicketReply;
        if (selectedTicket && newReply.ticket_id === selectedTicket.id) {
          setReplies((prev) => [...prev, newReply]);
          if (newReply.sender_type === "admin") toast.success("رد جديد من فريق الدعم!");
        }
        loadTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedTicket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("support_tickets").select("*").eq("user_uuid", user.id.toString()).order("created_at", { ascending: false });
    if (data) setTickets(data as any);
    setLoading(false);
  };

  const loadReplies = async (ticketId: string) => {
    const { data } = await supabase.from("ticket_replies").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    if (data) setReplies(data as any);
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await loadReplies(ticket.id);
  };

  const handleSubmit = async () => {
    if (!user || !subject || !description.trim()) return;
    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase.from("support_tickets").insert({ user_uuid: user.id.toString(), user_name: user.name, subject, description: description.trim() }).select().single();
      if (error) throw error;
      if (inserted) {
        await supabase.from("ticket_replies").insert({ ticket_id: inserted.id, sender_type: "user", sender_name: user.name, message: description.trim() });
      }
      toast.success("تم رفع التذكرة بنجاح");
      setShowForm(false); setSubject(""); setDescription(""); loadTickets();
    } catch { toast.error("فشل إرسال التذكرة"); }
    setSubmitting(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("الحد الأقصى 10 ميغابايت"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["jpg","jpeg","png","gif","webp","pdf","mp4"].includes(ext)) { toast.error("نوع الملف غير مدعوم"); return; }
    setAttachmentFile(file);
    if (file.type.startsWith("image/")) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendReply = async () => {
    if (!user || !selectedTicket || (!replyText.trim() && !attachmentFile)) return;
    setSendingReply(true);
    try {
      let attachUrl: string | null = null;
      if (attachmentFile) {
        setUploadingAttachment(true);
        const ts = Date.now();
        const ext = attachmentFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `tickets/${user.id}/${selectedTicket.id}/${ts}.${ext}`;
        attachUrl = await secureUpload({ file: attachmentFile, bucket: "attachments", path, userUuid: user.id.toString() });
        setUploadingAttachment(false);
      }
      await supabase.from("ticket_replies").insert({
        ticket_id: selectedTicket.id,
        sender_type: "user",
        sender_name: user.name,
        message: replyText.trim() || (attachmentFile ? "مرفق" : ""),
        attachment_url: attachUrl,
      } as any);
      await supabase.from("support_tickets").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", selectedTicket.id);
      setReplyText("");
      clearAttachment();
    } catch { toast.error("فشل إرسال الرد"); setUploadingAttachment(false); }
    setSendingReply(false);
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (!user) { navigate("/"); return null; }

  if (selectedTicket) {
    const config = statusConfig[selectedTicket.status] || statusConfig.open;
    return (
      <div className="flex flex-col h-[calc(100vh-120px)]" dir="rtl">
        {/* Back + ticket info */}
        <div className="px-4 py-2 border-b border-border/10 bg-card/50 flex items-center justify-between">
          <button onClick={() => { setSelectedTicket(null); setReplies([]); }} className="text-xs text-primary font-bold flex items-center gap-1">
            <ChevronLeft className="w-4 h-4 rotate-180" /> رجوع
          </button>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-md p-3">
              <p className="text-xs text-foreground whitespace-pre-line">{selectedTicket.description}</p>
              <p className="text-[9px] text-muted-foreground mt-1">{formatDate(selectedTicket.created_at)}</p>
            </div>
          </div>
          {replies.filter(r => !(r.sender_type === "user" && r.message === selectedTicket.description && Math.abs(new Date(r.created_at).getTime() - new Date(selectedTicket.created_at).getTime()) < 5000)).map((reply) => (
            <div key={reply.id} className={`flex ${reply.sender_type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl p-3 ${reply.sender_type === "user" ? "bg-primary/10 border border-primary/20 rounded-tr-md" : "bg-emerald-500/10 border border-emerald-500/20 rounded-tl-md"}`}>
                {reply.sender_type === "admin" && <p className="text-[10px] font-bold text-emerald-400 mb-1">فريق الدعم</p>}
                {reply.attachment_url && (
                  isImageUrl(reply.attachment_url) ? (
                    <a href={reply.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                      <img src={reply.attachment_url} alt="مرفق" className="max-w-full rounded-lg max-h-48 object-cover" />
                    </a>
                  ) : (
                    <a href={reply.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 mb-2 text-xs text-primary underline">
                      <Paperclip className="w-3 h-3" /> عرض المرفق
                    </a>
                  )
                )}
                <p className="text-xs text-foreground whitespace-pre-line">{reply.message}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{formatDate(reply.created_at)}</p>
              </div>
            </div>
          ))}
          {replies.length === 0 && !selectedTicket.admin_reply && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 bg-muted/10 rounded-full px-4 py-2">
                <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                <p className="text-[10px] text-muted-foreground">بانتظار رد فريق الدعم...</p>
              </div>
            </div>
          )}
          {replies.filter(r => r.sender_type === "admin").length === 0 && selectedTicket.admin_reply && (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-tl-md p-3">
                <p className="text-[10px] font-bold text-emerald-400 mb-1">فريق الدعم</p>
                <p className="text-xs text-foreground whitespace-pre-line">{selectedTicket.admin_reply}</p>
                {selectedTicket.replied_at && <p className="text-[9px] text-muted-foreground mt-1">{formatDate(selectedTicket.replied_at)}</p>}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {selectedTicket.status !== "closed" ? (
          <div className="px-4 py-2 border-t border-border/10 bg-card/50 space-y-2">
            {/* Attachment preview */}
            {attachmentFile && (
              <div className="flex items-center gap-2 bg-muted/20 rounded-lg p-2">
                {attachmentPreview ? (
                  <img src={attachmentPreview} alt="مرفق" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Paperclip className="w-5 h-5 text-primary" />
                  </div>
                )}
                <span className="text-xs text-foreground flex-1 truncate">{attachmentFile.name}</span>
                <button onClick={clearAttachment} className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.mp4" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-xl bg-muted/20 border border-border/30 flex items-center justify-center active:scale-95 transition-transform" title="إرفاق ملف">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </button>
              <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }} placeholder="اكتب ردك..." className="flex-1 h-10 px-3 bg-muted/20 rounded-xl text-foreground placeholder:text-muted-foreground border border-border/30 focus:border-primary outline-none text-sm" />
              <button onClick={handleSendReply} disabled={(!replyText.trim() && !attachmentFile) || sendingReply || uploadingAttachment} className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform">
                {(sendingReply || uploadingAttachment) ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Send className="w-4 h-4 text-primary-foreground" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-border/10 bg-card/50 text-center">
            <p className="text-xs text-muted-foreground">تم إغلاق هذه التذكرة</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3" dir="rtl">
      <button onClick={() => setShowForm(!showForm)} className="w-full glass-card p-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        <Plus className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-primary">رفع تذكرة جديدة</span>
      </button>

      {showForm && (
        <div className="glass-card p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-bold text-foreground">تذكرة جديدة</h3>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">الموضوع</label>
            <div className="grid grid-cols-2 gap-2">
              {TICKET_SUBJECTS.map((s) => (
                <button key={s.id} type="button" onClick={() => setSubject(s.label)} className={`p-2.5 rounded-xl text-[11px] font-semibold border transition-all ${subject === s.label ? "border-primary bg-primary/10 text-primary" : "border-border/30 bg-card/50 text-muted-foreground"}`}>{s.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">وصف المشكلة</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اكتب تفاصيل المشكلة أو الاستفسار..." rows={4} maxLength={1000} className="w-full p-3 bg-muted/20 rounded-xl text-foreground placeholder:text-muted-foreground border border-border/30 focus:border-primary outline-none text-sm resize-none" />
            <p className="text-[10px] text-muted-foreground text-left" dir="ltr">{description.length}/1000</p>
          </div>
          <button onClick={handleSubmit} disabled={!subject || !description.trim() || submitting} className="w-full h-11 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95">
            {submitting ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> إرسال التذكرة</>}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد تذاكر حالياً</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const config = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = config.icon;
            const hasUnreadReply = ticket.status === "replied";
            return (
              <button key={ticket.id} onClick={() => openTicket(ticket)} className="w-full glass-card p-3 flex items-center justify-between active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color} relative`}>
                    <StatusIcon className="w-4 h-4" />
                    {hasUnreadReply && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card animate-pulse" />}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-xs font-bold text-foreground truncate">{ticket.subject}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{ticket.admin_reply ? "تم الرد — اضغط للعرض" : "بانتظار الرد..."}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-[9px] text-muted-foreground">{formatDate(ticket.created_at)}</span>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupportTicketsEmbed;
