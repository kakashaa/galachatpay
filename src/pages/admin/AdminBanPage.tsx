import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Ban, Unlock, Loader2, ShieldBan, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/sendUserNotification";

const AdminBanPage: React.FC = () => {
  const { adminCall, handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [manualBans, setManualBans] = useState<any[]>([]);
  const [blockedAccounts, setBlockedAccounts] = useState<any[]>([]);
  const [banReports, setBanReports] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"ban" | "reports" | "list">("ban");
  const [banForm, setBanForm] = useState({ target_uuid: "", ban_type: "full", duration_hours: "24", reason: "", banned_elements: [] as string[] });
  const [banLoading, setBanLoading] = useState(false);

  useEffect(() => { loadData(); }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === "list" || subTab === "ban") {
        const [bans, blocked] = await Promise.all([adminCall("list_manual_bans"), adminCall("list_blocked_accounts")]);
        setManualBans(bans || []); setBlockedAccounts(blocked || []);
      }
      if (subTab === "reports") setBanReports(await adminCall("list_ban_reports") || []);
    } catch { }
    finally { setLoading(false); }
  };

  const executeBan = async () => {
    if (!banForm.target_uuid.trim()) { toast.error("يرجى إدخال UUID"); return; }
    setBanLoading(true);
    try {
      const durationHours = parseInt(banForm.duration_hours) || 24;
      await adminCall("manual_ban_user", { target_uuid: banForm.target_uuid.trim(), ban_type: banForm.ban_type, duration_hours: durationHours, reason: banForm.reason.trim(), banned_elements: banForm.ban_type === "elements" ? banForm.banned_elements : null });
      const durationText = durationHours === 999999 ? "أبدي" : `${durationHours} ساعة`;
      await sendUserNotification(
        banForm.target_uuid.trim(),
        "تم تعليق حسابك ⚠️",
        `تم تعليق حسابك بسبب: ${banForm.reason || "مخالفة"}. المدة: ${durationText}.`
      );
      toast.success("تم حظر المستخدم بنجاح");
      setBanForm({ target_uuid: "", ban_type: "full", duration_hours: "24", reason: "", banned_elements: [] });
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل الحظر"); }
    finally { setBanLoading(false); }
  };

  const ELEMENT_OPTIONS = [
    { key: "entries", label: "دخوليات" }, { key: "frames", label: "إطارات" },
    { key: "gifts", label: "هدايا مخصصة" }, { key: "animated_photos", label: "صور متحركة" },
    { key: "change_id", label: "تغيير آيدي" }, { key: "hairs", label: "تسريحات" },
    { key: "vip", label: "VIP" }, { key: "salary", label: "رواتب" },
    { key: "quick_support", label: "دعم سريع" }, { key: "works", label: "works" },
    { key: "stars", label: "نجومي" },
  ];

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  return (
    <AdminPageLayout title="إدارة الحظر" accentColor="hsl(350 89% 60%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(244,63,94,0.1)' }}>
          {[
            { key: "ban" as const, label: "حظر مستخدم" },
            { key: "reports" as const, label: "البلاغات" },
            { key: "list" as const, label: "المحظورين" },
          ].map(t => (
            <motion.button key={t.key} onClick={() => setSubTab(t.key)} whileTap={{ scale: 0.96 }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${subTab === t.key ? "text-admin-rose" : "text-muted-foreground"}`}
              style={subTab === t.key ? { background: 'rgba(244,63,94,0.12)', boxShadow: '0 2px 8px rgba(244,63,94,0.15)' } : {}}>
              {t.label}
            </motion.button>
          ))}
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-rose" /></div>}

        <AnimatePresence mode="wait">
          {!loading && subTab === "ban" && (
            <motion.div key="ban" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-5 space-y-4"
              style={{ background: 'linear-gradient(145deg, rgba(244,63,94,0.08), rgba(244,63,94,0.02))', border: '1px solid rgba(244,63,94,0.12)', boxShadow: '0 8px 32px -8px rgba(244,63,94,0.1)' }}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.15)' }}>
                  <Ban className="w-5 h-5 text-admin-rose" />
                </div>
                <span className="text-sm font-bold text-admin-rose">حظر مستخدم</span>
              </div>
              <input placeholder="UUID المستخدم" value={banForm.target_uuid} onChange={e => setBanForm(p => ({ ...p, target_uuid: e.target.value }))}
                className="w-full h-12 rounded-xl px-4 text-sm tabular-nums focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} dir="ltr" />
              <div className="grid grid-cols-2 gap-2">
                {[{ key: "full", label: "حظر كامل", color: "rgba(244,63,94,0.12)" }, { key: "elements", label: "حظر عناصر", color: "rgba(139,92,246,0.12)" }].map(t => (
                  <motion.button key={t.key} whileTap={{ scale: 0.95 }}
                    onClick={() => setBanForm(p => ({ ...p, ban_type: t.key, banned_elements: [] }))}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${banForm.ban_type === t.key ? 'text-foreground' : 'text-muted-foreground'}`}
                    style={banForm.ban_type === t.key ? { background: t.color, border: '1px solid rgba(255,255,255,0.1)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {t.label}
                  </motion.button>
                ))}
              </div>
              {banForm.ban_type === "elements" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-1.5">
                  {ELEMENT_OPTIONS.map((el, i) => (
                    <motion.button key={el.key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                      onClick={() => setBanForm(p => ({ ...p, banned_elements: p.banned_elements.includes(el.key) ? p.banned_elements.filter(e => e !== el.key) : [...p.banned_elements, el.key] }))}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all`}
                      style={banForm.banned_elements.includes(el.key) ? { background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.2)', color: 'hsl(350 89% 60%)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))' }}>
                      {el.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
              <input type="number" placeholder="مدة الحظر (ساعات)" value={banForm.duration_hours} onChange={e => setBanForm(p => ({ ...p, duration_hours: e.target.value }))}
                className="w-full h-12 rounded-xl px-4 text-sm tabular-nums focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} dir="ltr" />
              <input placeholder="سبب الحظر (اختياري)" value={banForm.reason} onChange={e => setBanForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full h-12 rounded-xl px-4 text-sm focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              <motion.button whileTap={{ scale: 0.96 }} onClick={executeBan} disabled={banLoading || !banForm.target_uuid.trim()}
                className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))', boxShadow: '0 4px 16px rgba(244,63,94,0.35)' }}>
                {banLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4" />تنفيذ الحظر</>}
              </motion.button>
            </motion.div>
          )}

          {!loading && subTab === "reports" && (
            <motion.div key="reports" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {banReports.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><ShieldBan className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد بلاغات</p></div>
              ) : banReports.map((report: any, i: number) => (
                <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl p-4 space-y-2" style={glassCard}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold tabular-nums">{report.reported_user_id}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold`}
                      style={report.is_verified ? { background: 'rgba(16,185,129,0.12)', color: 'hsl(160 84% 39%)' } : { background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)' }}>
                      {report.is_verified ? "مؤكد" : "معلق"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                  <p className="text-[10px] text-muted-foreground">نوع: {report.ban_type} • مبلّغ: {report.reporter_gala_id}</p>
                  {!report.is_verified && (
                    <div className="flex gap-2 mt-1">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={async () => { await adminCall("update_ban_report", { id: report.id, is_verified: true }); toast.success("تم التأكيد"); loadData(); }}
                        className="flex-1 h-9 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                        ✓ تأكيد
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={async () => { await adminCall("update_ban_report", { id: report.id, admin_notes: "مرفوض" }); toast.success("تم الرفض"); loadData(); }}
                        className="flex-1 h-9 rounded-xl text-xs font-bold text-muted-foreground" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        ✗ رفض
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {!loading && subTab === "list" && (
            <motion.div key="list" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {manualBans.map((ban: any, i: number) => (
                <motion.div key={ban.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl p-4 space-y-2" style={glassCard}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm tabular-nums" dir="ltr">{ban.target_uuid}</p>
                      <p className="text-xs text-muted-foreground">{ban.ban_type === "full" ? "حظر كامل" : "حظر عناصر"} • {ban.duration_hours === 999999 ? "أبدي" : `${ban.duration_hours} ساعة`}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg text-xs font-bold"
                      style={ban.status === "active" ? { background: 'rgba(244,63,94,0.12)', color: 'hsl(350 89% 60%)' } : { background: 'rgba(16,185,129,0.12)', color: 'hsl(160 84% 39%)' }}>
                      {ban.status === "active" ? "فعال" : "ملغي"}
                    </span>
                  </div>
                  {ban.reason && <p className="text-xs text-muted-foreground">السبب: {ban.reason}</p>}
                  {ban.banned_elements?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ban.banned_elements.map((el: string) => <span key={el} className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(244,63,94,0.1)', color: 'hsl(350 89% 60%)' }}>{el}</span>)}
                    </div>
                  )}
                  {ban.status === "active" && (
                    <motion.button whileTap={{ scale: 0.96 }} onClick={async () => { await adminCall("unban_manual", { ban_id: ban.id }); toast.success("تم فك الحظر"); loadData(); }}
                      className="w-full h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                      <Unlock className="w-4 h-4" />فك الحظر
                    </motion.button>
                  )}
                </motion.div>
              ))}
              {blockedAccounts.length > 0 && (
                <>
                  <p className="text-xs font-bold text-muted-foreground mt-4">حسابات محظورة تسجيل دخول ({blockedAccounts.length})</p>
                  {blockedAccounts.map((acc: any, i: number) => (
                    <motion.div key={acc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="rounded-2xl p-4" style={glassCard}>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm tabular-nums">{acc.target_uuid}</p>
                        <span className="px-2 py-1 rounded-lg text-xs font-bold"
                          style={acc.is_permanently_blocked ? { background: 'rgba(244,63,94,0.12)', color: 'hsl(350 89% 60%)' } : { background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)' }}>
                          {acc.is_permanently_blocked ? "دائم" : "مؤقت"}
                        </span>
                      </div>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={async () => { await adminCall("unblock_account", { target_uuid: acc.target_uuid }); toast.success("تم فك الحظر"); loadData(); }}
                        className="w-full h-10 mt-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                        <Unlock className="w-4 h-4" />فك الحظر
                      </motion.button>
                    </motion.div>
                  ))}
                </>
              )}
              {manualBans.length === 0 && blockedAccounts.length === 0 && (
                <div className="text-center py-10 text-muted-foreground"><Shield className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد حسابات محظورة</p></div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminBanPage;
