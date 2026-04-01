import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAdminPageLog } from "@/hooks/use-admin-page-log";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminSalaryWithdrawManager from "@/components/AdminSalaryWithdrawManager";
import AdminSalaryChargeManager from "@/components/AdminSalaryChargeManager";
import AdminInstantWithdrawManager from "@/components/AdminInstantWithdrawManager";
import { supabase } from "@/integrations/supabase/client";
// galaApi import removed — reset now uses Supabase directly
import { DollarSign, Loader2, TrendingUp, Wallet, CreditCard, BarChart3, Zap, Wrench, RotateCcw, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const AdminSalaryPage: React.FC = () => {
  useAdminPageLog('/admin/salary');
  const location = useLocation();
  const { handleLogout } = useAdminSession();

  /* If navigated with ?status=pending, ensure we're on the withdraw tab (default) */
  const [subTab, setSubTab] = useState<"withdraw" | "charge" | "instant" | "report" | "tools">("withdraw");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStats, setReportStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0, totalUsd: 0, approvedUsd: 0, pendingUsd: 0 });

  // Tools state
  const [resetUuid, setResetUuid] = useState("");
  const [resetType, setResetType] = useState<"host" | "agency">("agency");
  const [resetLoading, setResetLoading] = useState(false);
  const [lockUuid, setLockUuid] = useState("");
  const [lockType, setLockType] = useState<"host" | "agency">("agency");
  const [lockLoading, setLockLoading] = useState(false);

  useEffect(() => { if (subTab === "report") loadReport(); }, [subTab]);

  const loadReport = async () => {
    setReportLoading(true);
    try {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const { data } = await supabase.from("salary_requests").select("*").gte("created_at", monthStart);
      const rows = data || [];
      setReportStats({
        total: rows.length,
        approved: rows.filter(r => r.status === "approved").length,
        pending: rows.filter(r => r.status === "pending").length,
        rejected: rows.filter(r => r.status === "rejected").length,
        totalUsd: rows.reduce((s, r) => s + (r.amount_usd || 0), 0),
        approvedUsd: rows.filter(r => r.status === "approved").reduce((s, r) => s + (r.amount_usd || 0), 0),
        pendingUsd: rows.filter(r => r.status === "pending").reduce((s, r) => s + (r.amount_usd || 0), 0),
      });
    } catch { }
    finally { setReportLoading(false); }
  };

  const handleResetCashUsed = async () => {
    if (!resetUuid.trim()) { toast.error("أدخل UUID"); return; }
    setResetLoading(true);
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const settingKey = `cash_reset:${resetUuid.trim()}:${resetType}:${monthKey}`;

      const { error } = await supabase.from("app_settings").upsert({
        key: settingKey,
        value: "true",
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

      // Also delete cash_used and cash_lock flags
      const cashUsedKey = `cash_used:${resetUuid.trim()}:${resetType}:${monthKey}`;
      const cashLockKey = `cash_lock:${resetUuid.trim()}:${resetType}:${monthKey}`;
      await supabase.from("app_settings").delete().in("key", [cashUsedKey, cashLockKey]).catch(() => {});

      if (error) {
        toast.error("فشل إعادة التعيين: " + error.message);
      } else {
        toast.success(`✅ تم فتح السحب النقدي (${resetType === "agency" ? "وكالة" : "مضيف"}) للـ ${resetUuid} لهذا الشهر`);
        setResetUuid("");
      }
    } catch (e: any) {
      toast.error(e?.message || "حدث خطأ");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLockCash = async () => {
    if (!lockUuid.trim()) { toast.error("أدخل UUID"); return; }
    setLockLoading(true);
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const settingKey = `cash_lock:${lockUuid.trim()}:${lockType}:${monthKey}`;
      const { error } = await supabase.from("app_settings").upsert({ key: settingKey, value: "true", updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) { toast.error("فشل القفل: " + error.message); }
      else { toast.success(`🔒 تم قفل السحب النقدي لـ ${lockUuid}`); setLockUuid(""); }
    } catch (e: any) { toast.error(e?.message || "حدث خطأ"); }
    finally { setLockLoading(false); }
  };

  return (
    <AdminPageLayout title="إدارة الرواتب" accentColor="hsl(160 84% 39%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
          {[
            { key: "withdraw" as const, label: "السحب", icon: Wallet },
            { key: "charge" as const, label: "الشحن", icon: CreditCard },
            { key: "instant" as const, label: "فوري", icon: Zap },
            { key: "report" as const, label: "التقرير", icon: BarChart3 },
            { key: "tools" as const, label: "أدوات", icon: Wrench },
          ].map(t => {
            const Icon = t.icon;
            return (
              <motion.button key={t.key} onClick={() => setSubTab(t.key)} whileTap={{ scale: 0.96 }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${subTab === t.key ? "text-admin-emerald" : "text-muted-foreground"}`}
                style={subTab === t.key ? { background: 'rgba(16,185,129,0.12)', boxShadow: '0 2px 8px rgba(16,185,129,0.15)' } : {}}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {subTab === "withdraw" && <motion.div key="w" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><AdminSalaryWithdrawManager canAct={true} /></motion.div>}
          {subTab === "charge" && <motion.div key="c" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><AdminSalaryChargeManager canAct={true} /></motion.div>}
          {subTab === "instant" && <motion.div key="i" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><AdminInstantWithdrawManager canAct={true} /></motion.div>}

          {subTab === "tools" && (
            <motion.div key="t" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-2xl p-5 space-y-4"
                style={{ background: 'linear-gradient(145deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.12)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <RotateCcw className="w-5 h-5 text-admin-emerald" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-admin-emerald block">إعادة تعيين عداد السحب</span>
                    <span className="text-[10px] text-muted-foreground">فتح السحب النقدي لمستخدم وصل الحد الأقصى</span>
                  </div>
                </div>

                <Input
                  placeholder="UUID المستخدم"
                  value={resetUuid}
                  onChange={e => setResetUuid(e.target.value)}
                  className="bg-background/50 border-white/10 text-sm"
                  dir="ltr"
                />

                <div className="flex gap-2">
                  {[
                    { key: "agency" as const, label: "وكالة" },
                    { key: "host" as const, label: "مضيف" },
                  ].map(t => (
                    <button key={t.key} onClick={() => setResetType(t.key)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${resetType === t.key ? "text-admin-emerald" : "text-muted-foreground"}`}
                      style={resetType === t.key ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <Button onClick={handleResetCashUsed} disabled={resetLoading || !resetUuid.trim()}
                  className="w-full bg-admin-emerald hover:bg-admin-emerald/90 text-white font-bold">
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إعادة تعيين العداد"}
                </Button>
              </div>

              {/* Per-user Cash Lock Tool */}
              <div className="rounded-2xl p-5 space-y-4"
                style={{ background: 'linear-gradient(145deg, rgba(244,63,94,0.08), rgba(244,63,94,0.02))', border: '1px solid rgba(244,63,94,0.12)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.15)' }}>
                    <Lock className="w-5 h-5 text-admin-rose" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-admin-rose block">قفل السحب النقدي</span>
                    <span className="text-[10px] text-muted-foreground">إيقاف السحب النقدي لمستخدم محدد</span>
                  </div>
                </div>

                <Input
                  placeholder="UUID المستخدم"
                  value={lockUuid}
                  onChange={e => setLockUuid(e.target.value)}
                  className="bg-background/50 border-white/10 text-sm"
                  dir="ltr"
                />

                <div className="flex gap-2">
                  {[
                    { key: "agency" as const, label: "وكالة" },
                    { key: "host" as const, label: "مضيف" },
                  ].map(t => (
                    <button key={t.key} onClick={() => setLockType(t.key)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${lockType === t.key ? "text-admin-rose" : "text-muted-foreground"}`}
                      style={lockType === t.key ? { background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.2)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <Button onClick={handleLockCash} disabled={lockLoading || !lockUuid.trim()}
                  className="w-full bg-admin-rose hover:bg-admin-rose/90 text-white font-bold">
                  {lockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "قفل السحب النقدي 🔒"}
                </Button>
              </div>
            </motion.div>
          )}

          {subTab === "report" && (
            reportLoading ? (
              <motion.div key="rl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-emerald" /></motion.div>
            ) : (
              <motion.div key="r" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="rounded-2xl p-5 space-y-2"
                  style={{ background: 'linear-gradient(145deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.12)', boxShadow: '0 8px 32px -8px rgba(16,185,129,0.15)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                      <DollarSign className="w-5 h-5 text-admin-emerald" />
                    </div>
                    <span className="text-sm font-bold text-admin-emerald">تقرير الشهر الحالي</span>
                  </div>
                  <p className="text-3xl font-bold tabular-nums text-admin-emerald">${reportStats.totalUsd.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">إجمالي الرواتب ({reportStats.total} طلب)</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "مسحوب", value: `$${reportStats.approvedUsd}`, count: reportStats.approved, glow: "rgba(16,185,129,0.15)", color: "text-admin-emerald" },
                    { label: "معلق", value: `$${reportStats.pendingUsd}`, count: reportStats.pending, glow: "rgba(245,158,11,0.15)", color: "text-admin-amber" },
                    { label: "مرفوض", value: String(reportStats.rejected), count: reportStats.rejected, glow: "rgba(244,63,94,0.15)", color: "text-admin-rose" },
                  ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                      className="text-center py-3 rounded-2xl" style={{ background: s.glow, border: '1px solid rgba(255,255,255,0.06)', boxShadow: `0 4px 16px -4px ${s.glow}` }}>
                      <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] text-muted-foreground">{s.label} ({s.count})</p>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <TrendingUp className="w-4 h-4 text-admin-emerald" />
                  <span className="text-xs text-muted-foreground">نسبة القبول: <span className="text-admin-emerald font-bold">{reportStats.total ? Math.round((reportStats.approved / reportStats.total) * 100) : 0}%</span></span>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminSalaryPage;
