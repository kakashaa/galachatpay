import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminSupportManager from "@/components/AdminSupportManager";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Headset, Loader2, MessageSquare, Archive, Search } from "lucide-react";
import { motion } from "framer-motion";

const AdminSupportPage: React.FC = () => {
  const { handleLogout, adminUsername, adminDisplayName } = useAdminSession();
  const [subTab, setSubTab] = useState<"active" | "archive" | "search">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("*")
        .or(`user_uuid.eq.${searchQuery.trim()},id.eq.${searchQuery.trim()}`)
        .order("created_at", { ascending: false })
        .limit(20);
      const { data: chats } = await supabase
        .from("support_chat_sessions")
        .select("*")
        .or(`user_uuid.eq.${searchQuery.trim()},id.eq.${searchQuery.trim()}`)
        .order("created_at", { ascending: false })
        .limit(20);
      setSearchResults([
        ...(tickets || []).map(t => ({ ...t, _type: "ticket" })),
        ...(chats || []).map(c => ({ ...c, _type: "chat" })),
      ]);
    } catch { }
    finally { setSearchLoading(false); }
  };

  return (
    <AdminPageLayout title="الدعم الفني" accentColor="#06b6d4" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        {/* Tabs — Cyan themed */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-cyan-500/10">
          {[
            { key: "active" as const, label: "محادثات نشطة", icon: <MessageSquare className="w-4 h-4" /> },
            { key: "archive" as const, label: "الأرشيف", icon: <Archive className="w-4 h-4" /> },
            { key: "search" as const, label: "بحث", icon: <Search className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${subTab === t.key ? "bg-cyan-500/20 text-cyan-400" : "text-muted-foreground"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {subTab === "active" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AdminSupportManager adminUsername={adminUsername || ''} adminDisplayName={adminDisplayName || ''} canAct={true} />
          </motion.div>
        )}

        {subTab === "archive" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AdminSupportManager adminUsername={adminUsername || ''} adminDisplayName={adminDisplayName || ''} canAct={false} />
          </motion.div>
        )}

        {subTab === "search" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2"><Search className="w-5 h-5 text-cyan-400" /><span className="text-sm font-bold text-cyan-400">بحث في الدعم</span></div>
              <div className="flex gap-2">
                <Input placeholder="UUID أو رقم التذكرة" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()} className="font-mono text-sm" dir="ltr" />
                <button onClick={doSearch} disabled={searchLoading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition-colors">
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((item: any) => (
                  <div key={item.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{item.user_name || item.subject || "—"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{item.user_uuid}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-400">{item._type === "ticket" ? "تذكرة" : "محادثة"}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.status === "open" || item.status === "waiting" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    {item.subject && <p className="text-[11px] text-muted-foreground mt-1">{item.subject}</p>}
                    <p className="text-[9px] text-muted-foreground mt-1">{new Date(item.created_at).toLocaleString("ar-EG")}</p>
                  </div>
                ))}
              </div>
            )}
            {searchResults.length === 0 && searchQuery && !searchLoading && (
              <div className="text-center py-10 text-muted-foreground"><Headset className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد نتائج</p></div>
            )}
          </motion.div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminSupportPage;
