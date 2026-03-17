import React, { useState, useEffect, useRef } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";

type ChatGroup = "super_group" | "all_group";

const AdminChatPage: React.FC = () => {
  const { adminCall, adminUsername, adminDisplayName, handleLogout, isSuperAdmin } = useAdminSession();
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeGroup) loadMessages();
  }, [activeGroup]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_chat_messages" }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("admin_chat_messages")
        .select("*")
        .eq("message_type", activeGroup === "super_group" ? "super" : "general")
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(50);
      setMessages(data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeGroup) return;
    setSending(true);
    try {
      await supabase.from("admin_chat_messages").insert({
        sender_username: adminUsername || "",
        sender_display_name: adminDisplayName || "",
        message: message.trim(),
        message_type: activeGroup === "super_group" ? "super" : "general",
      });
      setMessage("");
    } catch { }
    finally { setSending(false); }
  };

  if (!activeGroup) {
    return (
      <AdminPageLayout title="دردشة الإدارة" accentColor="#10b981" onLogout={handleLogout}>
        <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {isSuperAdmin && (
              <button onClick={() => setActiveGroup("super_group")}
                className="w-full bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4 hover:border-emerald-500/40 transition-colors active:scale-[0.98]">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">مجموعة المشرفين</p>
                  <p className="text-[11px] text-muted-foreground">السوبر أدمن فقط</p>
                </div>
              </button>
            )}
            <button onClick={() => setActiveGroup("all_group")}
              className="w-full bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4 hover:border-white/15 transition-colors active:scale-[0.98]">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">المسؤولين + المنسقين</p>
                <p className="text-[11px] text-muted-foreground">جميع أعضاء الفريق</p>
              </div>
            </button>
          </motion.div>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout title={activeGroup === "super_group" ? "مجموعة المشرفين" : "مجموعة الكل"} accentColor="#10b981" onLogout={handleLogout}
      rightContent={<button onClick={() => setActiveGroup(null)} className="text-[11px] text-muted-foreground hover:text-foreground px-2">← رجوع</button>}>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground"><MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">لا توجد رسائل بعد</p></div>
          ) : messages.map((msg: any) => {
            const isMine = msg.sender_username === adminUsername;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`} dir="rtl">
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMine ? "bg-emerald-600 text-white rounded-bl-md" : "bg-white/[0.06] text-foreground rounded-br-md"}`}>
                  {!isMine && <p className="text-[10px] font-bold text-emerald-400 mb-0.5">{msg.sender_display_name}</p>}
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  <p className={`text-[9px] mt-1 ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/5 p-3 bg-background/80 backdrop-blur-xl">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Input
              placeholder="اكتب رسالتك..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              className="flex-1"
              dir="rtl"
            />
            <button onClick={sendMessage} disabled={sending || !message.trim()}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
};

export default AdminChatPage;
