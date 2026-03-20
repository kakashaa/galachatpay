import React, { useState, useEffect, useRef } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import { supabase } from "@/integrations/supabase/client";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import { Ban, Unlock, Loader2, ShieldBan, Shield, ExternalLink, Upload, Image as LucideImage } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/sendUserNotification";
import { useConfirmModal } from "@/hooks/use-confirm-modal";

import { galaApi } from "@/services/galaApi";


const formatDate = (d: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return String(d); }
};

interface TargetUser { name: string; image: string }

const AdminBanPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const { confirm, ConfirmDialog } = useConfirmModal();

  const [subTab, setSubTab] = useState<"reports" | "ban" | "list">("reports");
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  /* ── Pending reports ── */
  const [reports, setReports] = useState<any[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [durationPick, setDurationPick] = useState<{ id: string; uuid: string; reason: string } | null>(null);

  /* ── Manual ban ── */
  const [banUuid, setBanUuid] = useState("");
  const [banTarget, setBanTarget] = useState<TargetUser | null>(null);
  const [banLookup, setBanLookup] = useState(false);
  const [banReason, setBanReason] = useState<"promotion" | "insult" | "other">("insult");
  const [banDuration, setBanDuration] = useState<number>(24);
  const [banCustom, setBanCustom] = useState("");
  const [banImage, setBanImage] = useState<File | null>(null);
  const [banLoading, setBanLoading] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  /* ── Banned list ── */
  const [bannedList, setBannedList] = useState<any[]>([]);

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  useEffect(() => { loadData(); }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === "reports") {
        const { data } = await supabase.from("ban_reports").select("*").eq("is_verified", false).neq("admin_notes", "مرفوض").order("created_at", { ascending: false });
        setReports(data || []);
      }
      if (subTab === "list") {
        const { data } = await supabase.from("ban_reports").select("*").eq("is_verified", true).order("created_at", { ascending: false });
        setBannedList(data || []);
      }
    } finally { setLoading(false); }
  };

  /* ── Lookup user for manual ban ── */
  const lookupBanUser = async () => {
    const t = banUuid.trim();
    if (!t || !/^\d+$/.test(t)) { toast.error("UUID غير صحيح"); return; }
    setBanLookup(true); setBanTarget(null);
    try {
      const data = await galaApi.checkSupporter(t);
      if (data?.data?.name) setBanTarget({ name: data.data.name, image: data.data.profile?.image || "" });
      else toast.error("المستخدم غير موجود");
    } catch { toast.error("خطأ"); }
    finally { setBanLookup(false); }
  };

  /* ── Execute ban via external API ── */
  const doBan = async (uuid: string, reason: string, hours: number, banType: string) => {
    const banRes = await supabase.functions.invoke("wares-request", {
      body: { action: "ban-user-real", uuid, reason, hours: String(hours), ban_type: banType },
    });
    if (banRes.error) throw new Error("فشل الحظر");
    const durText = hours === 999999 ? "أبدي" : `${hours} ساعة`;
    await sendUserNotification(uuid, "تم تعليق حسابك", `تم تعليق حسابك بسبب: ${reason}. المدة: ${durText}.`).catch(() => {});
  };

  const doUnban = async (uuid: string, unbanType: string = "normal") => {
    const res = await supabase.functions.invoke("wares-request", {
      body: { action: "unban-user-real", uuid, unban_type: unbanType },
    });
    if (res.error) throw new Error("فشل فك الحظر");
  };

  /* ── Accept report with duration choice ── */
  const acceptReport = async (report: any, hours: number) => {
    setActionInProgress(report.id);
    const t = toast.loading("جاري التأكيد والحظر...");
    try {
      const isPromo = report.ban_type === "promotion";
      const banType = isPromo ? "device" : "normal";
      const banHours = isPromo ? 999999 : hours;
      const reason = report.description || "بلاغ مؤكد";

      // Check if already banned
      const { data: existing } = await supabase.from("ban_reports").select("id").eq("reported_user_id", report.reported_user_id).eq("is_verified", true).limit(1);
      if (existing && existing.length > 0) {
        const proceed = await confirm({ title: "تنبيه", message: "هذا المستخدم محظور من قبل! هل تريد زيادة المدة؟", danger: true, confirmText: "نعم، حظر" });
        if (!proceed) { toast.dismiss(t); setActionInProgress(null); setDurationPick(null); return; }
      }

      await doBan(report.reported_user_id, reason, banHours, banType);
      await supabase.from("ban_reports").update({ is_verified: true } as any).eq("id", report.id);
      toast.dismiss(t);
      toast.success("تم الحظر!");
      setRemovedIds(prev => new Set(prev).add(report.id));
      setDurationPick(null);
      loadData();
    } catch { toast.dismiss(t); toast.error("فشل"); }
    finally { setActionInProgress(null); }
  };

  /* ── Reject report ── */
  const rejectReport = async (id: string) => {
    setActionInProgress(id + "_r");
    const t = toast.loading("جاري الرفض...");
    try {
      await supabase.from("ban_reports").update({ admin_notes: "مرفوض" } as any).eq("id", id);
      toast.dismiss(t); toast.success("تم الرفض");
      loadData();
    } catch { toast.dismiss(t); toast.error("فشل"); }
    finally { setActionInProgress(null); }
  };

  /* ── Manual ban ── */
  const executeManualBan = async () => {
    const uuid = banUuid.trim();
    if (!uuid) { toast.error("أدخل UUID"); return; }
    const reason = banReason === "other" ? banCustom : banReason === "insult" ? "سب/إساءة" : "ترويج";
    if (!reason.trim()) { toast.error("أدخل السبب"); return; }
    const ok = await confirm({ title: "تأكيد الحظر", message: `حظر UUID ${uuid}؟`, danger: true, confirmText: "تنفيذ" });
    if (!ok) return;
    setBanLoading(true);
    const t = toast.loading("جاري الحظر...");
    try {
      const isPromo = banReason === "promotion";
      const hours = isPromo ? 999999 : banDuration;
      await doBan(uuid, reason, hours, isPromo ? "device" : "normal");

      // Save to ban_reports so it appears in المحظورين tab
      const expiresAt = isPromo ? null : new Date(Date.now() + hours * 3600 * 1000).toISOString();
      const reportBanType = isPromo ? "promotion" : "insult";

      // Upload image if provided
      let evidenceUrl = "";
      let evidenceType = "image";
      if (banImage) {
        const ext = banImage.name.split(".").pop() || "jpg";
        const path = `ban-evidence/${uuid}_${Date.now()}.${ext}`;
        const { data: upData } = await supabase.storage.from("attachments").upload(path, banImage);
        if (upData?.path) {
          const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(upData.path);
          evidenceUrl = urlData?.publicUrl || "";
        }
      }

      await supabase.from("ban_reports").insert({
        reporter_gala_id: "admin-manual",
        reported_user_id: uuid,
        ban_type: reportBanType,
        description: reason,
        evidence_url: evidenceUrl || "manual-ban",
        evidence_type: evidenceUrl ? evidenceType : "none",
        is_verified: true,
        expires_at: expiresAt,
        admin_notes: "حظر يدوي من الأدمن",
      });

      toast.dismiss(t); toast.success("تم الحظر!");
      setBanUuid(""); setBanTarget(null); setBanReason("insult"); setBanCustom(""); setBanImage(null);
    } catch (e: any) { toast.dismiss(t); toast.error(e?.message || "فشل"); }
    finally { setBanLoading(false); }
  };

  const executeManualUnban = async () => {
    const uuid = banUuid.trim();
    if (!uuid) { toast.error("أدخل UUID"); return; }
    const ok = await confirm({ title: "فك الحظر", message: `فك حظر ${uuid}؟`, confirmText: "فك الحظر" });
    if (!ok) return;
    const t = toast.loading("جاري فك الحظر...");
    try { await doUnban(uuid); toast.dismiss(t); toast.success("تم فك الحظر!"); }
    catch { toast.dismiss(t); toast.error("فشل"); }
  };

  /* ── Unban from list ── */
  const unbanFromList = async (report: any) => {
    const ok = await confirm({ title: "فك الحظر", message: `فك حظر ${report.reported_user_id}؟`, confirmText: "فك الحظر" });
    if (!ok) return;
    setActionInProgress(report.id);
    const t = toast.loading("جاري فك الحظر...");
    try {
      const unbanType = report.ban_type === "promotion" ? "device" : "normal";
      await doUnban(report.reported_user_id, unbanType);
      await supabase.from("ban_reports").delete().eq("reported_user_id", report.reported_user_id).eq("is_verified", true);
      toast.dismiss(t); toast.success("تم فك الحظر!");
      loadData();
    } catch { toast.dismiss(t); toast.error("فشل"); }
    finally { setActionInProgress(null); }
  };

  const pendingReports = reports.filter(r => !removedIds.has(r.id));

  const isPermanentBan = (report: any) => report.ban_type === "promotion" || report.ban_type === "promo" || report.ban_type === "device" || (!!report.reward_amount && report.reward_amount >= 50000);

  const activeBans = bannedList.filter((report) => {
    if (!isPermanentBan(report) && report.expires_at) {
      return new Date(report.expires_at) >= new Date();
    }
    return true;
  });

  const permanentBans = activeBans.filter(isPermanentBan);
  const temporaryBans = activeBans.filter((report) => !isPermanentBan(report));

  const renderBannedCard = (report: any, i: number) => (
    <motion.div key={report.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
      className="rounded-xl overflow-hidden flex flex-col" style={glassCard}>

      {report.evidence_url && report.evidence_url !== "manual-ban" && (
        <div className="relative w-full aspect-square bg-black/40">
          {report.evidence_type === "video" ? (
            <video src={report.evidence_url} playsInline muted className="w-full h-full object-cover" />
          ) : (
            <img src={report.evidence_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}

      <div className="p-2 flex-1 flex flex-col gap-1">
        <span className="text-[11px] font-bold tabular-nums truncate">{report.reported_user_id}</span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold w-fit"
          style={isPermanentBan(report) ? { background: 'rgba(244,63,94,0.12)', color: 'hsl(350 89% 60%)' } : { background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)' }}>
          {isPermanentBan(report) ? "دائم" : "مؤقت"}
        </span>
        <p className="text-[9px] text-muted-foreground truncate">{report.description || report.ban_type}</p>
        <p className="text-[8px] text-muted-foreground">{formatDate(report.created_at)}</p>

        <motion.button whileTap={{ scale: 0.95 }} disabled={!!actionInProgress}
          onClick={() => unbanFromList(report)}
          className="mt-auto w-full py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))' }}>
          {actionInProgress === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Unlock className="w-3 h-3" />فك</>}
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <>
    <AdminPageLayout title="إدارة الحظر" accentColor="hsl(350 89% 60%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(244,63,94,0.1)' }}>
          {([
            { key: "reports" as const, label: "البلاغات المعلقة" },
            { key: "ban" as const, label: "حظر مستخدم" },
            { key: "list" as const, label: "المحظورين" },
          ]).map(t => (
            <motion.button key={t.key} onClick={() => setSubTab(t.key)} whileTap={{ scale: 0.96 }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${subTab === t.key ? "text-admin-rose" : "text-muted-foreground"}`}
              style={subTab === t.key ? { background: 'rgba(244,63,94,0.12)', boxShadow: '0 2px 8px rgba(244,63,94,0.15)' } : {}}>
              {t.label}
            </motion.button>
          ))}
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-rose" /></div>}

        <AnimatePresence mode="wait">
          {/* ═══ TAB 1: Pending Reports ═══ */}
          {!loading && subTab === "reports" && (
            <motion.div key="reports" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {pendingReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><ShieldBan className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد بلاغات معلقة</p></div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {pendingReports.map((report, i) => (
                    <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100, height: 0 }} transition={{ delay: i * 0.04 }}
                      layout className="rounded-2xl overflow-hidden" style={glassCard}>

                      {/* Video player */}
                      {report.evidence_url && (
                        <div className="relative w-full aspect-video bg-black/40">
                          {report.evidence_type === "video" ? (
                            <video src={report.evidence_url} controls playsInline className="w-full h-full object-contain" />
                          ) : (
                            <img src={report.evidence_url} alt="" className="w-full h-full object-contain" />
                          )}
                          <a href={report.evidence_url} target="_blank" rel="noopener noreferrer"
                            className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                            <ExternalLink className="w-3.5 h-3.5 text-white/80" />
                          </a>
                        </div>
                      )}

                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold tabular-nums">{report.reported_user_id}</span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)' }}>معلق</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{report.description}</p>
                        <p className="text-[10px] text-muted-foreground">نوع: {report.ban_type} • مبلّغ: {report.reporter_gala_id} • {formatDate(report.created_at)}</p>

                        {/* Duration picker for insult/other */}
                        {durationPick?.id === report.id && report.ban_type !== "promotion" ? (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-admin-rose">اختر مدة الحظر:</p>
                            <div className="grid grid-cols-4 gap-2">
                              {[3, 12, 24, 48].map(h => (
                                <motion.button key={h} whileTap={{ scale: 0.95 }} disabled={!!actionInProgress}
                                  onClick={() => acceptReport(report, h)}
                                  className="py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                                  style={{ background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))' }}>
                                  {actionInProgress === report.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : `${h}h`}
                                </motion.button>
                              ))}
                            </div>
                            <button onClick={() => setDurationPick(null)} className="text-xs text-muted-foreground w-full text-center">إلغاء</button>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-1">
                            <motion.button whileTap={{ scale: 0.95 }} disabled={!!actionInProgress}
                              onClick={() => {
                                if (report.ban_type === "promotion") {
                                  acceptReport(report, 999999);
                                } else {
                                  setDurationPick({ id: report.id, uuid: report.reported_user_id, reason: report.description });
                                }
                              }}
                              className="flex-1 h-9 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1"
                              style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))' }}>
                              {actionInProgress === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "قبول"}
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }} disabled={!!actionInProgress}
                              onClick={() => rejectReport(report.id)}
                              className="flex-1 h-9 rounded-xl text-xs font-bold text-muted-foreground disabled:opacity-50 flex items-center justify-center gap-1"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              {actionInProgress === report.id + "_r" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "رفض"}
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </motion.div>
          )}

          {/* ═══ TAB 2: Manual Ban ═══ */}
          {!loading && subTab === "ban" && (
            <motion.div key="ban" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-5 space-y-4"
              style={{ background: 'linear-gradient(145deg, rgba(244,63,94,0.08), rgba(244,63,94,0.02))', border: '1px solid rgba(244,63,94,0.12)' }}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.15)' }}>
                  <Ban className="w-5 h-5 text-admin-rose" />
                </div>
                <span className="text-sm font-bold text-admin-rose">حظر مستخدم</span>
              </div>

              {/* UUID + lookup */}
              <div className="flex gap-2">
                <input placeholder="UUID المستخدم" value={banUuid} onChange={e => { setBanUuid(e.target.value); setBanTarget(null); }}
                  className="flex-1 h-12 rounded-xl px-4 text-sm tabular-nums focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} dir="ltr" />
                <motion.button whileTap={{ scale: 0.95 }} onClick={lookupBanUser} disabled={banLookup || !banUuid.trim()}
                  className="h-12 px-4 rounded-xl text-xs font-bold text-admin-rose disabled:opacity-50" style={{ background: 'rgba(244,63,94,0.1)' }}>
                  {banLookup ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
                </motion.button>
              </div>

              {banTarget && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {banTarget.image ? <img src={banTarget.image} className="w-10 h-10 rounded-full object-cover" alt="" /> : <div className="w-10 h-10 rounded-full bg-muted" />}
                  <span className="text-sm font-bold">{banTarget.name}</span>
                </div>
              )}

              {/* Reason */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-2 font-bold">السبب</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "promotion" as const, label: "ترويج" },
                    { value: "insult" as const, label: "سب/إساءة" },
                    { value: "other" as const, label: "أخرى" },
                  ]).map(r => (
                    <motion.button key={r.value} whileTap={{ scale: 0.95 }} onClick={() => setBanReason(r.value)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all ${banReason === r.value ? "text-foreground" : "text-muted-foreground"}`}
                      style={banReason === r.value ? { background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.2)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {r.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {banReason === "promotion" && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}>
                  <p className="text-xs text-admin-rose font-bold">ترويج = حظر جهاز دائم (999,999h)</p>
                </div>
              )}

              {banReason === "insult" && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: 'hsl(217 91% 60%)' }}>سب/إساءة — خيارات: 3h / 12h / 24h / 48h</p>
                </div>
              )}

              {banReason === "other" && (
                <input placeholder="اكتب السبب..." value={banCustom} onChange={e => setBanCustom(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-sm focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              )}

              {/* Duration for insult */}
              {banReason === "insult" && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 font-bold">مدة الحظر</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 12, 24, 48].map(h => (
                      <motion.button key={h} whileTap={{ scale: 0.95 }}
                        onClick={() => setBanDuration(h)}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all ${banDuration === h ? "text-white" : "text-muted-foreground"}`}
                        style={banDuration === h
                          ? { background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))', boxShadow: '0 2px 8px rgba(244,63,94,0.3)' }
                          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {h}h
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Image (optional) */}
              <input type="file" ref={imgRef} className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f && f.size <= 10 * 1024 * 1024) setBanImage(f); else if (f) toast.error("max 10MB"); }} />
              <button onClick={() => imgRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-muted-foreground"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                {banImage ? <><LucideImage className="w-4 h-4 text-admin-rose" /> {banImage.name}</> : <><Upload className="w-4 h-4" /> صورة إثبات (اختياري)</>}
              </button>

              {/* Action buttons */}
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.96 }} onClick={executeManualBan} disabled={banLoading || !banUuid.trim()}
                  className="flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))', boxShadow: '0 4px 16px rgba(244,63,94,0.35)' }}>
                  {banLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4" />تنفيذ الحظر</>}
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={executeManualUnban} disabled={!banUuid.trim()}
                  className="h-12 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'hsl(160 84% 39%)' }}>
                  <Unlock className="w-4 h-4" /> فك الحظر
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══ TAB 3: Banned List ═══ */}
          {!loading && subTab === "list" && (
            <motion.div key="list" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {activeBans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Shield className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا يوجد محظورين</p></div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-bold text-admin-rose">المحظورين الدائمين</p>
                      <span className="text-[10px] text-muted-foreground">{permanentBans.length}</span>
                    </div>
                    {permanentBans.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {permanentBans.map((report, i) => renderBannedCard(report, i))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground text-center py-3">لا يوجد حظر دائم حالياً</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-bold text-amber-500">المحظورين المؤقتين</p>
                      <span className="text-[10px] text-muted-foreground">{temporaryBans.length}</span>
                    </div>
                    {temporaryBans.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {temporaryBans.map((report, i) => renderBannedCard(report, permanentBans.length + i))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground text-center py-3">لا يوجد حظر مؤقت حالياً</p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
    {ConfirmDialog}
    </>
  );
};

export default AdminBanPage;
