import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, Send, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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

const TICKET_SUBJECTS = [
  "مشكلة تقنية", "مشكلة في الشحن", "مشكلة في البث",
  "استفسار عن الحساب", "طلب استرجاع", "بلاغ عن مستخدم", "أخرى",
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "مفتوح", color: "text-amber-400 bg-amber-500/10", icon: Clock },
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
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [hasNewReply, setHasNewReply] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTickets();
    const channel = supabase
      .channel("tickets-user-embed")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets" }, (payload) => {
        const updated = payload.new as any;
        if (updated.user_uuid === user.id.toString()) {
          setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
          if (updated.admin_reply) { setHasNewReply(true); toast.success("تم الرد على تكتك!"); }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("support_tickets").select("*").eq("user_uuid", user.id.toString()).order("created_at", { ascending: false });
    if (data) { setTickets(data as any); setHasNewReply((data as any[]).some((t: any) => t.status === "replied" && t.admin_reply)); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !subject || !description.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({ user_uuid: user.id.toString(), user_name: user.name, subject, description: description.trim() });
      if (error) throw error;
      toast.success("تم رفع التكت بنجاح");
      setShowForm(false); setSubject(""); setDescription(""); loadTickets();
    } catch { toast.error("فشل إرسال التكت"); }
    setSubmitting(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (!user) { navigate("/"); return null; }

  return (
    <div className="px-4 py-3 space-y-3" dir="rtl">
      {/* New Ticket Button */}
      <button onClick={() => setShowForm(!showForm)} className="w-full glass-card p-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        <Plus className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-primary">رفع تكت جديد</span>
      </button>

      {/* New Ticket Form */}
      {showForm && (
        <div className="glass-card p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-bold text-foreground">تكت جديد</h3>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">الموضوع</label>
            <div className="grid grid-cols-2 gap-2">
              {TICKET_SUBJECTS.map((s) => (
                <button key={s} type="button" onClick={() => setSubject(s)} className={`p-2.5 rounded-xl text-[11px] font-semibold border transition-all ${subject === s ? "border-primary bg-primary/10 text-primary" : "border-border/30 bg-card/50 text-muted-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">وصف المشكلة</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اكتب تفاصيل المشكلة أو الاستفسار..." rows={4} maxLength={1000} className="w-full p-3 bg-muted/20 rounded-xl text-foreground placeholder:text-muted-foreground border border-border/30 focus:border-primary outline-none text-sm resize-none" />
            <p className="text-[10px] text-muted-foreground text-left" dir="ltr">{description.length}/1000</p>
          </div>
          <button onClick={handleSubmit} disabled={!subject || !description.trim() || submitting} className="w-full h-11 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95">
            {submitting ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> إرسال التكت</>}
          </button>
        </div>
      )}

      {/* New reply notification */}
      {hasNewReply && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-xs font-bold text-emerald-400">لديك رد جديد من فريق الدعم!</p>
        </div>
      )}

      {/* Tickets List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد تكتات حالياً</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">ارفع تكت جديد للتواصل مع فريق الدعم</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const config = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = config.icon;
            const isExpanded = expandedTicket === ticket.id;
            return (
              <div key={ticket.id} className="glass-card overflow-hidden">
                <button onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)} className="w-full p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}><StatusIcon className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-xs font-bold text-foreground truncate">{ticket.subject}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(ticket.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/10 pt-2">
                    <div className="bg-muted/10 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-muted-foreground mb-1">رسالتك:</p>
                      <p className="text-xs text-foreground whitespace-pre-line">{ticket.description}</p>
                    </div>
                    {ticket.admin_reply ? (
                      <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-primary">رد الدعم:</p>
                          {ticket.replied_at && <p className="text-[9px] text-muted-foreground">{formatDate(ticket.replied_at)}</p>}
                        </div>
                        <p className="text-xs text-foreground whitespace-pre-line">{ticket.admin_reply}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <p className="text-[10px] text-muted-foreground">بانتظار رد فريق الدعم...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupportTicketsEmbed;
