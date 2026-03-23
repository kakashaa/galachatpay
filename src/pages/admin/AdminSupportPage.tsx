import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminSupportManager from "@/components/AdminSupportManager";
import AdminTicketManager from "@/components/AdminTicketManager";
import { supabase } from "@/integrations/supabase/client";
import { Headset, Loader2, MessageSquare, Archive, Search, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminSupportPage: React.FC = () => {
  const { handleLogout, adminUsername, adminDisplayName } = useAdminSession();
  const [subTab, setSubTab] = useState<"active" | "tickets" | "archive" | "search">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const { data: tickets } = await supabase.from("support_tickets").select("*").or(`user_uuid.eq.${searchQuery.trim()},id.eq.${searchQuery.trim()}`).order("created_at", { ascending: false }).limit(20);
      const { data: chats } = await supabase.from("support_chat_sessions").select("*").or(`user_uuid.eq.${searchQuery.trim()},id.eq.${searchQuery.trim()}`).order("created_at", { ascending: false }).limit(20);
      setSearchResults([...(tickets || []).map(t => ({ ...t, _type: "ticket" })), ...(chats || []).map(c => ({ ...c, _type: "chat" }))]);
    } catch { }
    finally { setSearchLoading(false); }
  };

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  return (
    <AdminPageLayout title="الدعم الفني" accentColor="hsl(188 86% 53%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(6,182,212,0.1)' }}>
          {[
            { key: "active" as const, label: "محادثات", icon: MessageSquare },
            { key: "tickets" as const, label: "تذاكر", icon: Ticket },
            { key: "archive" as const, label: "أرشيف", icon: Archive },
            { key: "search" as const, label: "بحث", icon: Search },
          ].map(t => {
            const Icon = t.icon;
            return (
              <motion.button key={t.key} onClick={() => setSubTab(t.key)} whileTap={{ scale: 0.96 }}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${subTab === t.key ? "text-admin-cyan" : "text-muted-foreground"}`}
                style={subTab === t.key ? { background: 'rgba(6,182,212,0.12)', boxShadow: '0 2px 8px rgba(6,182,212,0.15)' } : {}}>
                <Icon className="w-4 h-4" />{t.label}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {subTab === "active" && (
            <motion.div key="active" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AdminSupportManager adminUsername={adminUsername || ''} adminDisplayName={adminDisplayName || ''} canAct={true} />
            </motion.div>
          )}

          {subTab === "tickets" && (
            <motion.div key="tickets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AdminTicketManager adminUsername={adminUsername || ''} adminDisplayName={adminDisplayName || ''} canAct={true} />
            </motion.div>
          )}

          {subTab === "archive" && (
            <motion.div key="archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AdminSupportManager adminUsername={adminUsername || ''} adminDisplayName={adminDisplayName || ''} canAct={false} />
            </motion.div>
          )}

          {subTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-2xl p-4 space-y-3"
                style={{ background: 'linear-gradient(145deg, rgba(6,182,212,0.08), rgba(6,182,212,0.02))', border: '1px solid rgba(6,182,212,0.12)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
                    <Search className="w-4 h-4 text-admin-cyan" />
                  </div>
                  <span className="text-sm font-bold text-admin-cyan">بحث في الدعم</span>
                </div>
                <div className="flex gap-2">
                  <input placeholder="UUID أو رقم التذكرة" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()}
                    className="flex-1 h-11 rounded-xl px-4 text-sm tabular-nums focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} dir="ltr" />
                  <motion.button whileTap={{ scale: 0.95 }} onClick={doSearch} disabled={searchLoading}
                    className="px-4 h-11 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, hsl(188 86% 53%), hsl(188 86% 43%))', boxShadow: '0 2px 8px rgba(6,182,212,0.3)' }}>
                    {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
                  </motion.button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((item: any, i: number) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="rounded-2xl p-3.5" style={glassCard}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold">{item.user_name || item.subject || "—"}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{item.user_uuid}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold" style={{ background: 'rgba(6,182,212,0.12)', color: 'hsl(188 86% 53%)' }}>
                            {item._type === "ticket" ? "تذكرة" : "محادثة"}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                            style={item.status === "open" || item.status === "waiting" ? { background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)' } : { background: 'rgba(16,185,129,0.12)', color: 'hsl(160 84% 39%)' }}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                      {item.subject && <p className="text-[11px] text-muted-foreground mt-1">{item.subject}</p>}
                      <p className="text-[9px] text-muted-foreground mt-1 tabular-nums">{new Date(item.created_at).toLocaleString("ar-EG")}</p>
                    </motion.div>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && searchQuery && !searchLoading && (
                <div className="text-center py-10 text-muted-foreground"><Headset className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد نتائج</p></div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminSupportPage;
