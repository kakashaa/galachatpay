import React, { useState, useEffect, useCallback } from "react";
import { useAdminPageLog } from "@/hooks/use-admin-page-log";
import { useAdminSession } from "@/hooks/use-admin-session";
import { supabase } from "@/integrations/supabase/client";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import { Unlock, Loader2, Search, ShieldAlert, RefreshCw, Trash2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { Input } from "@/components/ui/input";

interface LoginAttemptRow {
  id: string;
  target_uuid: string;
  failed_attempts: number;
  block_count: number;
  blocked_until: string | null;
  is_permanently_blocked: boolean;
  admin_unblocked_at: string | null;
  created_at: string;
  updated_at: string;
}

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
};

const AdminLoginBansPage: React.FC = () => {
  useAdminPageLog("/admin/login-bans");
  const { handleLogout } = useAdminSession();
  const { confirm, ConfirmDialog } = useConfirmModal();
  const adminUsername = localStorage.getItem("admin_username") || "";
  const adminRole = localStorage.getItem("admin_role") || "admin";

  const [rows, setRows] = useState<LoginAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch users who are currently blocked (have blocked_until or permanent block)
      const { data, error } = await supabase
        .from("login_attempts")
        .select("*")
        .or("is_permanently_blocked.eq.true,blocked_until.not.is.null,failed_attempts.gt.0")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setRows((data as LoginAttemptRow[]) || []);
    } catch {
      toast.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = rows.filter(r =>
    !searchQuery || r.target_uuid.includes(searchQuery)
  );

  const isBlocked = (r: LoginAttemptRow) => {
    if (r.is_permanently_blocked) return true;
    if (r.blocked_until && new Date(r.blocked_until) > new Date()) return true;
    return false;
  };

  const blockedCount = rows.filter(isBlocked).length;

  const handleUnban = async (row: LoginAttemptRow) => {
    const ok = await confirm({
      title: "فك حظر تسجيل الدخول",
      message: `هل تريد فك حظر تسجيل الدخول عن UUID: ${row.target_uuid}؟`,
      confirmText: "فك الحظر",
    });
    if (!ok) return;

    setActionId(row.id);
    try {
      // Reset login_attempts
      await supabase
        .from("login_attempts")
        .update({
          failed_attempts: 0,
          blocked_until: null,
          is_permanently_blocked: false,
          block_count: 0,
          admin_unblocked_at: new Date().toISOString(),
        } as any)
        .eq("id", row.id);

      // Remove active portal_bans for login
      await supabase
        .from("portal_bans")
        .delete()
        .eq("uuid", row.target_uuid)
        .eq("is_active", true);

      // Audit log
      await supabase.from("admin_audit_log").insert({
        admin_username: adminUsername || "admin",
        admin_role: adminRole,
        action: "login_unban",
        details: { uuid: row.target_uuid },
      });

      toast.success(`تم فك الحظر عن ${row.target_uuid} ✅`);
      fetchData();
    } catch {
      toast.error("فشل فك الحظر");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (row: LoginAttemptRow) => {
    const ok = await confirm({
      title: "حذف السجل",
      message: `حذف سجل المحاولات بالكامل لـ ${row.target_uuid}؟`,
      danger: true,
      confirmText: "حذف",
    });
    if (!ok) return;

    setActionId(row.id + "_del");
    try {
      await supabase.from("login_attempts").delete().eq("id", row.id);
      await supabase.from("portal_bans").delete().eq("uuid", row.target_uuid).eq("is_active", true);
      toast.success("تم الحذف");
      fetchData();
    } catch {
      toast.error("فشل الحذف");
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <AdminPageLayout title="حظر تسجيل الدخول" accentColor="hsl(350 89% 60%)" onLogout={handleLogout}>
        <div className="max-w-[480px] mx-auto p-4 space-y-4" dir="rtl">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4 text-center" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}>
              <ShieldAlert className="w-5 h-5 mx-auto mb-1 text-destructive" />
              <p className="text-2xl font-black text-destructive">{blockedCount}</p>
              <p className="text-[11px] text-muted-foreground font-bold">محظور حالياً</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <User className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-black text-foreground">{rows.length}</p>
              <p className="text-[11px] text-muted-foreground font-bold">إجمالي السجلات</p>
            </div>
          </div>

          {/* Search + Refresh */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالـ UUID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-9 text-sm"
                dir="ltr"
              />
            </div>
            <button
              onClick={fetchData}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              لا توجد سجلات حظر
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filtered.map(row => {
                  const blocked = isBlocked(row);
                  return (
                    <motion.div
                      key={row.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="rounded-xl p-3 space-y-2"
                      style={{
                        background: blocked ? "rgba(244,63,94,0.08)" : "rgba(255,255,255,0.03)",
                        border: blocked ? "1px solid rgba(244,63,94,0.2)" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {blocked ? (
                            <ShieldAlert className="w-4 h-4 text-destructive" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-mono font-bold" dir="ltr">{row.target_uuid}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          blocked
                            ? row.is_permanently_blocked
                              ? "bg-destructive/20 text-destructive"
                              : "bg-amber-500/20 text-amber-400"
                            : "bg-green-500/20 text-green-400"
                        }`}>
                          {blocked
                            ? row.is_permanently_blocked ? "حظر دائم" : "حظر مؤقت"
                            : "محاولات فاشلة"
                          }
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                        <div>
                          <span className="block text-[10px] opacity-60">محاولات فاشلة</span>
                          <span className="font-bold text-foreground">{row.failed_attempts}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] opacity-60">عدد الحظر</span>
                          <span className="font-bold text-foreground">{row.block_count}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] opacity-60">ينتهي</span>
                          <span className="font-bold text-foreground">
                            {row.is_permanently_blocked ? "أبدي" : formatDate(row.blocked_until)}
                          </span>
                        </div>
                      </div>

                      {row.admin_unblocked_at && (
                        <p className="text-[10px] text-green-400">
                          آخر فك حظر: {formatDate(row.admin_unblocked_at)}
                        </p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleUnban(row)}
                          disabled={!!actionId}
                          className="flex-1 h-8 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                        >
                          {actionId === row.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                          فك الحظر
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          disabled={!!actionId}
                          className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition-colors disabled:opacity-40"
                        >
                          {actionId === row.id + "_del" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </AdminPageLayout>
      <ConfirmDialog />
    </>
  );
};

export default AdminLoginBansPage;
