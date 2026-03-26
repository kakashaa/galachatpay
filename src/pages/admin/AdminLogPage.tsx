import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScrollText, Filter, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

/* ─── Action Labels ─── */
const actionInfoMap: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  approve_frame_claim: { label: "موافقة على إطار", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_frame_claim: { label: "رفض إطار", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_entry_claim: { label: "موافقة على دخولية", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  approve_entry_request: { label: "موافقة على دخولية", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_entry_claim: { label: "رفض دخولية", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  reject_entry_request: { label: "رفض دخولية", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_hair: { label: "موافقة على تسريحة", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_hair: { label: "رفض تسريحة", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_salary: { label: "موافقة على سحب", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_salary: { label: "رفض سحب", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_vip: { label: "تفعيل VIP", emoji: "", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  approve_animated_photo: { label: "موافقة صورة متحركة", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_animated_photo: { label: "رفض صورة متحركة", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_custom_gift: { label: "موافقة هدية مخصصة", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_custom_gift: { label: "رفض هدية مخصصة", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  ban_user: { label: "حظر مستخدم", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  unban_user: { label: "فك حظر", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  change_id: { label: "تغيير آيدي", emoji: "", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  change_account_type: { label: "تغيير نوع حساب", emoji: "", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  delete_message: { label: "حذف رسالة", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  login: { label: "تسجيل دخول", emoji: "🔐", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  works_approve_request: { label: "موافقة طلب وركس", emoji: "", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  works_reject_request: { label: "رفض طلب وركس", emoji: "", color: "text-red-400", bgColor: "bg-red-500/10" },
  works_list_accounts: { label: "عرض حسابات وركس", emoji: "", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  works_list_requests: { label: "عرض طلبات وركس", emoji: "", color: "text-sky-400", bgColor: "bg-sky-500/10" },
};

const getActionInfo = (action: string) => {
  let info = actionInfoMap[action];
  if (!info) {
    const key = Object.keys(actionInfoMap).find(k => action.includes(k));
    info = key ? actionInfoMap[key] : undefined;
  }
  if (!info) {
    const isNeg = action.includes("reject") || action.includes("ban") || action.includes("delete");
    info = { label: action || "عملية", emoji: isNeg ? "" : "", color: isNeg ? "text-red-400" : "text-primary", bgColor: isNeg ? "bg-red-500/10" : "bg-primary/10" };
  }
  return info;
};

const formatLogDate = (d: string) => {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
};

const AdminLogPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "admin" | "type">("all");
  const [filterValue, setFilterValue] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      setLogs(data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const filtered = logs.filter(log => {
    if (filter === "admin" && filterValue) return log.admin_username?.toLowerCase().includes(filterValue.toLowerCase());
    if (filter === "type" && filterValue) return log.action?.toLowerCase().includes(filterValue.toLowerCase()) || (getActionInfo(log.action).label).includes(filterValue);
    return true;
  });

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

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
              const info = getActionInfo(log.action || "");
              const details = (log.details || {}) as Record<string, any>;
              const targetName = details.user_name || details.target_name || details.member_name || details.bd_name || "";
              const targetId = details.user_uuid || details.target_uuid || details.member_uuid || details.uuid || "";
              const extraParts: string[] = [];
              if (details.title) extraParts.push(details.title);
              if (details.new_id) extraParts.push(`آيدي جديد: ${details.new_id}`);
              if (details.vip_level) extraParts.push(`VIP ${details.vip_level}`);
              if (details.amount_usd) extraParts.push(`$${details.amount_usd}`);
              if (details.ban_type) extraParts.push(`نوع: ${details.ban_type}`);
              if (details.duration_hours) extraParts.push(`${details.duration_hours} ساعة`);
              const isExpanded = expandedId === log.id;

              return (
                <motion.div key={log.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }}
                  className="rounded-xl overflow-hidden border border-border/10 bg-card/30 backdrop-blur-sm"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-center gap-3 p-3 cursor-pointer active:scale-[0.98] transition-transform">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${info.bgColor}`}>
                      <span className="text-base">{info.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-black ${info.color}`}>{info.label}</p>
                      {targetName && (
                        <p className="text-[10px] text-foreground/80 font-bold truncate mt-0.5">
                          {targetName}
                        </p>
                      )}
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        بواسطة <span className="font-bold text-foreground/60">{log.admin_username}</span>
                        <span className="text-muted-foreground/40 mx-1">•</span>
                        <span className="tabular-nums">{formatLogDate(log.created_at)}</span>
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 border-t border-border/10 space-y-2">
                          {targetId && (
                            <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <span className="text-[9px] text-muted-foreground">آيدي المستهدف</span>
                              <button onClick={(e) => { e.stopPropagation(); copyText(targetId); }} className="flex items-center gap-1 text-[10px] text-foreground/70 font-mono">
                                {targetId.length > 20 ? targetId.slice(0, 12) + "…" : targetId}
                                <Copy className="w-3 h-3 text-primary" />
                              </button>
                            </div>
                          )}
                          {extraParts.length > 0 && (
                            <div className="rounded-lg px-2.5 py-1.5 space-y-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <span className="text-[9px] text-muted-foreground">تفاصيل</span>
                              {extraParts.map((p, idx) => (
                                <p key={idx} className="text-[10px] text-foreground/80">{p}</p>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <span className="text-[9px] text-muted-foreground">الأدمن</span>
                            <span className="text-[10px] text-foreground/70">{log.admin_username} • {log.admin_role}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
