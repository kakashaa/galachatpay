import React, { useState, useEffect, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScrollText, Filter, ChevronDown, ChevronUp, Copy, Search, Calendar, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

/* ─── Action Labels ─── */
const actionInfoMap: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  approve_frame_claim: { label: "موافقة على إطار", emoji: "🖼", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_frame_claim: { label: "رفض إطار", emoji: "🖼", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_entry_claim: { label: "موافقة على دخولية", emoji: "🎭", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  approve_entry_request: { label: "موافقة على دخولية", emoji: "🎭", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_entry_claim: { label: "رفض دخولية", emoji: "🎭", color: "text-red-400", bgColor: "bg-red-500/10" },
  reject_entry_request: { label: "رفض دخولية", emoji: "🎭", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_hair: { label: "موافقة على تسريحة", emoji: "💇", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_hair: { label: "رفض تسريحة", emoji: "💇", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_salary: { label: "موافقة على سحب", emoji: "💰", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_salary: { label: "رفض سحب", emoji: "💰", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_vip: { label: "تفعيل VIP", emoji: "👑", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  approve_animated_photo: { label: "موافقة صورة متحركة", emoji: "📸", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_animated_photo: { label: "رفض صورة متحركة", emoji: "📸", color: "text-red-400", bgColor: "bg-red-500/10" },
  approve_custom_gift: { label: "موافقة هدية مخصصة", emoji: "🎁", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  reject_custom_gift: { label: "رفض هدية مخصصة", emoji: "🎁", color: "text-red-400", bgColor: "bg-red-500/10" },
  ban_user: { label: "حظر مستخدم", emoji: "🚫", color: "text-red-400", bgColor: "bg-red-500/10" },
  unban_user: { label: "فك حظر", emoji: "✅", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  change_id: { label: "تغيير آيدي", emoji: "🔄", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  change_account_type: { label: "تغيير نوع حساب", emoji: "👤", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  delete_message: { label: "حذف رسالة", emoji: "🗑", color: "text-red-400", bgColor: "bg-red-500/10" },
  login: { label: "تسجيل دخول", emoji: "🔐", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  works_approve_request: { label: "موافقة طلب وركس", emoji: "✅", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  works_reject_request: { label: "رفض طلب وركس", emoji: "❌", color: "text-red-400", bgColor: "bg-red-500/10" },
  works_list_accounts: { label: "عرض حسابات وركس", emoji: "📋", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  works_list_requests: { label: "عرض طلبات وركس", emoji: "📋", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  host_request_approved: { label: "موافقة طلب هوست", emoji: "✅", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  vip_grant: { label: "إهداء VIP", emoji: "👑", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  uuid_change: { label: "تغيير UUID", emoji: "🔄", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  request_approve: { label: "قبول طلب", emoji: "✅", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  request_reject: { label: "رفض طلب", emoji: "❌", color: "text-red-400", bgColor: "bg-red-500/10" },
  charge: { label: "شحن", emoji: "💎", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  role_change: { label: "تغيير صلاحية", emoji: "🛡", color: "text-amber-400", bgColor: "bg-amber-500/10" },
};

const getActionInfo = (action: string) => {
  let info = actionInfoMap[action];
  if (!info) {
    const key = Object.keys(actionInfoMap).find(k => action.includes(k));
    info = key ? actionInfoMap[key] : undefined;
  }
  if (!info) {
    const isNeg = action.includes("reject") || action.includes("ban") || action.includes("delete");
    info = { label: action || "عملية", emoji: isNeg ? "❌" : "📌", color: isNeg ? "text-red-400" : "text-primary", bgColor: isNeg ? "bg-red-500/10" : "bg-primary/10" };
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

type FilterType = "all" | "admin" | "type" | "uuid" | "date";
const PAGE_SIZE = 30;

const AdminLogPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [filterValue, setFilterValue] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setLogs(data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const filtered = logs.filter(log => {
    if (filter === "admin" && filterValue) {
      return log.admin_username?.toLowerCase().includes(filterValue.toLowerCase());
    }
    if (filter === "type" && filterValue) {
      return log.action?.toLowerCase().includes(filterValue.toLowerCase()) || getActionInfo(log.action).label.includes(filterValue);
    }
    if (filter === "uuid" && filterValue) {
      const details = log.details || {};
      const targetUuid = details.target_uuid || details.user_uuid || details.member_uuid || details.uuid || "";
      return targetUuid.includes(filterValue);
    }
    if (filter === "date" && filterValue) {
      return log.created_at?.startsWith(filterValue);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    setFilterValue("");
    setCurrentPage(1);
  };

  return (
    <AdminPageLayout title="سجل العمليات" accentColor="hsl(271 81% 56%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        {/* Stats bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{filtered.length} عملية</span>
          <motion.button whileTap={{ scale: 0.95 }} onClick={loadLogs} disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </motion.button>
        </div>

        {/* Filter bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-3 space-y-2.5"
          style={{ background: 'linear-gradient(145deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))', border: '1px solid rgba(139,92,246,0.12)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <Filter className="w-3.5 h-3.5 text-admin-purple" />
            </div>
            <span className="text-xs font-bold text-admin-purple">تصفية</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {([
              { key: "all" as FilterType, label: "الكل" },
              { key: "admin" as FilterType, label: "الأدمن" },
              { key: "type" as FilterType, label: "النوع" },
              { key: "uuid" as FilterType, label: "UUID" },
              { key: "date" as FilterType, label: "التاريخ" },
            ]).map(f => (
              <motion.button key={f.key} whileTap={{ scale: 0.95 }} onClick={() => handleFilterChange(f.key)}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${filter === f.key ? "text-admin-purple" : "text-muted-foreground"}`}
                style={filter === f.key ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.15)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {f.label}
              </motion.button>
            ))}
          </div>
          {filter !== "all" && (
            <div className="relative">
              {filter === "date" ? (
                <Input type="date" value={filterValue} onChange={e => { setFilterValue(e.target.value); setCurrentPage(1); }}
                  className="h-9 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} dir="ltr" />
              ) : (
                <div className="relative">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder={filter === "admin" ? "اسم الأدمن..." : filter === "uuid" ? "UUID المستخدم..." : "نوع العملية..."}
                    value={filterValue}
                    onChange={e => { setFilterValue(e.target.value); setCurrentPage(1); }}
                    className="h-9 pr-8 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    dir={filter === "uuid" ? "ltr" : "rtl"}
                  />
                </div>
              )}
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-purple" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground"><ScrollText className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">لا توجد عمليات</p></div>
        ) : (
          <>
            <div className="space-y-2">
              {paginated.map((log: any, i: number) => {
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
                if (details.reason) extraParts.push(`السبب: ${details.reason}`);
                if (details.source) extraParts.push(`مصدر: ${details.source}`);
                const isExpanded = expandedId === log.id;

                return (
                  <motion.div key={log.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }}
                    className="rounded-xl overflow-hidden border border-border/10 bg-card/30 backdrop-blur-sm"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-3 p-3 cursor-pointer active:scale-[0.98] transition-transform">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${info.bgColor}`}>
                        <span className="text-sm">{info.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-black ${info.color}`}>{info.label}</p>
                        {targetName && (
                          <p className="text-[10px] text-foreground/80 font-bold truncate mt-0.5">{targetName}</p>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  السابق
                </button>
                <span className="text-xs text-muted-foreground font-bold tabular-nums">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminLogPage;
