import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScrollText, Filter } from "lucide-react";
import { motion } from "framer-motion";

const AdminLogPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "admin" | "type">("all");
  const [filterValue, setFilterValue] = useState("");

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const actionIcon = (action: string) => {
    if (action.includes("ban") || action.includes("reject") || action.includes("delete")) return "🔴";
    if (action.includes("approve") || action.includes("add") || action.includes("create")) return "🟢";
    if (action.includes("update") || action.includes("change")) return "🟡";
    return "🔵";
  };

  const filtered = logs.filter(log => {
    if (filter === "admin" && filterValue) return log.admin_username?.toLowerCase().includes(filterValue.toLowerCase());
    if (filter === "type" && filterValue) return log.action?.toLowerCase().includes(filterValue.toLowerCase());
    return true;
  });

  return (
    <AdminPageLayout title="سجل العمليات" accentColor="#8b5cf6" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        {/* Filter bar */}
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-violet-400" />
            <span className="text-sm font-bold text-violet-400">تصفية العمليات</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "all" as const, label: "الكل" },
              { key: "admin" as const, label: "حسب الأدمن" },
              { key: "type" as const, label: "حسب النوع" },
            ].map(f => (
              <button key={f.key} onClick={() => { setFilter(f.key); setFilterValue(""); }}
                className={`py-2 rounded-lg border text-xs font-bold transition-all ${filter === f.key ? "border-violet-500 bg-violet-500/15 text-violet-400" : "border-white/10 text-muted-foreground"}`}>
                {f.label}
              </button>
            ))}
          </div>
          {filter !== "all" && (
            <input placeholder={filter === "admin" ? "اسم الأدمن..." : "نوع العملية..."} value={filterValue} onChange={e => setFilterValue(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none" />
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground"><ScrollText className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد عمليات</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log: any, i: number) => (
              <motion.div key={log.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-base">{actionIcon(log.action)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate">{log.action}</p>
                  <p className="text-[9px] text-muted-foreground">{log.admin_username} • {log.admin_role}</p>
                </div>
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminLogPage;
