import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Ban, Unlock, Loader2, ShieldBan, Shield } from "lucide-react";
import { motion } from "framer-motion";

const AdminBanPage: React.FC = () => {
  const { adminCall, handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [manualBans, setManualBans] = useState<any[]>([]);
  const [blockedAccounts, setBlockedAccounts] = useState<any[]>([]);
  const [banReports, setBanReports] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"ban" | "reports" | "list">("ban");

  // Ban form
  const [banForm, setBanForm] = useState({ target_uuid: "", ban_type: "full", duration_hours: "24", reason: "", banned_elements: [] as string[] });
  const [banLoading, setBanLoading] = useState(false);

  useEffect(() => { loadData(); }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === "list" || subTab === "ban") {
        const [bans, blocked] = await Promise.all([adminCall("list_manual_bans"), adminCall("list_blocked_accounts")]);
        setManualBans(bans || []);
        setBlockedAccounts(blocked || []);
      }
      if (subTab === "reports") setBanReports(await adminCall("list_ban_reports") || []);
    } catch { }
    finally { setLoading(false); }
  };

  const executeBan = async () => {
    if (!banForm.target_uuid.trim()) { toast.error("يرجى إدخال UUID"); return; }
    setBanLoading(true);
    try {
      await adminCall("manual_ban_user", {
        target_uuid: banForm.target_uuid.trim(),
        ban_type: banForm.ban_type,
        duration_hours: parseInt(banForm.duration_hours) || 24,
        reason: banForm.reason.trim(),
        banned_elements: banForm.ban_type === "elements" ? banForm.banned_elements : null,
      });
      toast.success("تم حظر المستخدم بنجاح");
      setBanForm({ target_uuid: "", ban_type: "full", duration_hours: "24", reason: "", banned_elements: [] });
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل الحظر"); }
    finally { setBanLoading(false); }
  };

  const ELEMENT_OPTIONS = [
    { key: "entries", label: "🎁 دخوليات" }, { key: "frames", label: "🖼️ إطارات" },
    { key: "gifts", label: "🎀 هدايا مخصصة" }, { key: "animated_photos", label: "📸 صور متحركة" },
    { key: "change_id", label: "🔄 تغيير آيدي" }, { key: "hairs", label: "💇 تسريحات" },
    { key: "vip", label: "⭐ VIP" }, { key: "salary", label: "💰 رواتب" },
    { key: "quick_support", label: "🎧 دعم سريع" }, { key: "works", label: "💼 works" },
    { key: "stars", label: "🌟 نجومي" },
  ];

  return (
    <AdminPageLayout title="إدارة الحظر" accentColor="#ef4444" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-rose-500/10">
          {[
            { key: "ban" as const, label: "حظر مستخدم" },
            { key: "reports" as const, label: "البلاغات" },
            { key: "list" as const, label: "المحظورين" },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${subTab === t.key ? "bg-rose-500/20 text-rose-400" : "text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>}

        {!loading && subTab === "ban" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2"><Ban className="w-6 h-6 text-rose-400" /><span className="text-sm font-bold text-rose-400">حظر مستخدم</span></div>
            <Input placeholder="UUID المستخدم" value={banForm.target_uuid} onChange={e => setBanForm(p => ({ ...p, target_uuid: e.target.value }))} className="font-mono text-sm" dir="ltr" />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setBanForm(p => ({ ...p, ban_type: "full", banned_elements: [] }))} className={`py-2 px-3 rounded-lg border text-xs font-bold ${banForm.ban_type === "full" ? "border-destructive bg-destructive/10 text-destructive" : "border-white/10 text-muted-foreground"}`}>🚫 حظر كامل</button>
              <button onClick={() => setBanForm(p => ({ ...p, ban_type: "elements", banned_elements: [] }))} className={`py-2 px-3 rounded-lg border text-xs font-bold ${banForm.ban_type === "elements" ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-muted-foreground"}`}>🧩 حظر عناصر</button>
            </div>
            {banForm.ban_type === "elements" && (
              <div className="grid grid-cols-2 gap-1.5">
                {ELEMENT_OPTIONS.map(el => (
                  <button key={el.key} onClick={() => setBanForm(p => ({ ...p, banned_elements: p.banned_elements.includes(el.key) ? p.banned_elements.filter(e => e !== el.key) : [...p.banned_elements, el.key] }))}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold ${banForm.banned_elements.includes(el.key) ? "border-destructive bg-destructive/10 text-destructive" : "border-white/10 text-muted-foreground"}`}>
                    {el.label}
                  </button>
                ))}
              </div>
            )}
            <Input type="number" placeholder="مدة الحظر (ساعات)" value={banForm.duration_hours} onChange={e => setBanForm(p => ({ ...p, duration_hours: e.target.value }))} dir="ltr" />
            <Input placeholder="سبب الحظر (اختياري)" value={banForm.reason} onChange={e => setBanForm(p => ({ ...p, reason: e.target.value }))} />
            <Button className="w-full" variant="destructive" disabled={banLoading || !banForm.target_uuid.trim()} onClick={executeBan}>
              {banLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4 ml-1" />تنفيذ الحظر</>}
            </Button>
          </motion.div>
        )}

        {!loading && subTab === "reports" && (
          <div className="space-y-3">
            {banReports.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground"><ShieldBan className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد بلاغات</p></div>
            ) : banReports.map((report: any) => (
              <div key={report.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-mono">{report.reported_user_id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${report.is_verified ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {report.is_verified ? "مؤكد" : "معلق"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{report.description}</p>
                <p className="text-[10px] text-muted-foreground">نوع: {report.ban_type} • مبلّغ: {report.reporter_gala_id}</p>
                {!report.is_verified && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={async () => {
                      await adminCall("update_ban_report", { id: report.id, is_verified: true });
                      toast.success("تم التأكيد"); loadData();
                    }}>✓ تأكيد</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={async () => {
                      await adminCall("update_ban_report", { id: report.id, admin_notes: "مرفوض" });
                      toast.success("تم الرفض"); loadData();
                    }}>✗ رفض</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && subTab === "list" && (
          <div className="space-y-3">
            {manualBans.length > 0 && manualBans.map((ban: any) => (
              <div key={ban.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm font-mono" dir="ltr">{ban.target_uuid}</p>
                    <p className="text-xs text-muted-foreground">{ban.ban_type === "full" ? "🚫 حظر كامل" : "🧩 حظر عناصر"} • {ban.duration_hours === 999999 ? "أبدي" : `${ban.duration_hours} ساعة`}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${ban.status === "active" ? "bg-destructive/20 text-destructive" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {ban.status === "active" ? "فعال" : "ملغي"}
                  </span>
                </div>
                {ban.reason && <p className="text-xs text-muted-foreground">السبب: {ban.reason}</p>}
                {ban.banned_elements?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ban.banned_elements.map((el: string) => <span key={el} className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-bold">{el}</span>)}
                  </div>
                )}
                {ban.status === "active" && (
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={async () => {
                    await adminCall("unban_manual", { ban_id: ban.id }); toast.success("تم فك الحظر"); loadData();
                  }}><Unlock className="w-4 h-4 ml-1" />فك الحظر</Button>
                )}
              </div>
            ))}
            {blockedAccounts.length > 0 && (
              <>
                <p className="text-xs font-bold text-muted-foreground mt-4">حسابات محظورة تسجيل دخول ({blockedAccounts.length})</p>
                {blockedAccounts.map((acc: any) => (
                  <div key={acc.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm font-mono">{acc.target_uuid}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${acc.is_permanently_blocked ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-400"}`}>
                        {acc.is_permanently_blocked ? "دائم" : "مؤقت"}
                      </span>
                    </div>
                    <Button size="sm" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={async () => {
                      await adminCall("unblock_account", { target_uuid: acc.target_uuid }); toast.success("تم فك الحظر"); loadData();
                    }}><Unlock className="w-4 h-4 ml-1" />فك الحظر</Button>
                  </div>
                ))}
              </>
            )}
            {manualBans.length === 0 && blockedAccounts.length === 0 && (
              <div className="text-center py-10 text-muted-foreground"><Shield className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد حسابات محظورة</p></div>
            )}
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminBanPage;
