import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScrollText, Filter, Clock } from "lucide-react";
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
      const { data } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(100);
      setLogs(data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const actionStyle = (action: string) => {
    if (action.includes("ban") || action.includes("reject") || action.includes("delete")) return { bg: 'rgba(244,63,94,0.1)', color: 'text-admin-rose' };
    if (action.includes("approve") || action.includes("add") || action.includes("create")) return { bg: 'rgba(16,185,129,0.1)', color: 'text-admin-emerald' };
    if (action.includes("update") || action.includes("change")) return { bg: 'rgba(245,158,11,0.1)', color: 'text-admin-amber' };
    return { bg: 'rgba(59,130,246,0.1)', color: 'text-admin-blue' };
  };

  const filtered = logs.filter(log => {
    if (filter === "admin" && filterValue) return log.admin_username?.toLowerCase().includes(filterValue.toLowerCase());
    if (filter === "type" && filterValue) return log.action?.toLowerCase().includes(filterValue.toLowerCase());
    return true;
  });

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  return (
    <AdminPageLayout title="سجل العمليات" accentColor="hsl(271 81% 56%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        {/* Filter bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'linear-gradient(145deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))', border: '1px solid rgba(139,92,246,0.12)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <Filter className="w-4 h-4 text-admin-purple" />
            </div>
            <span className="text-sm font-bold text-admin-purple">تصفية العمليات</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "all" as const, label: "الكل" },
              { key: "admin" as const, label: "حسب الأدمن" },
              { key: "type" as const, label: "حسب النوع" },
            ].map(f => (
              <motion.button key={f.key} whileTap={{ scale: 0.95 }} onClick={() => { setFilter(f.key); setFilterValue(""); }}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${filter === f.key ? "text-admin-purple" : "text-muted-foreground"}`}
                style={filter === f.key ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.15)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {f.label}
              </motion.button>
            ))}
          </div>
          {filter !== "all" && (
            <input placeholder={filter === "admin" ? "اسم الأدمن..." : "نوع العملية..."} value={filterValue} onChange={e => setFilterValue(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-purple" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground"><ScrollText className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد عمليات</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log: any, i: number) => {
              const style = actionStyle(log.action);
              return (
                <motion.div key={log.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-xl" style={glassCard}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: style.bg }}>
                    <Clock size={14} className={style.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate">{log.action}</p>
                    <p className="text-[9px] text-muted-foreground">{log.admin_username} • {log.admin_role}</p>
                  </div>
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap tabular-nums">
                    {new Date(log.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminLogPage;
