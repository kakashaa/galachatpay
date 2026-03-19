import React, { useState, useEffect, useRef } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import { Ban, Unlock, Loader2, ShieldBan, Shield, Image as LucideImage, Play, ExternalLink, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/sendUserNotification";

const AdminBanPage: React.FC = () => {
  const { adminCall, handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [manualBans, setManualBans] = useState<any[]>([]);
  const [blockedAccounts, setBlockedAccounts] = useState<any[]>([]);
  const [banReports, setBanReports] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"ban" | "reports" | "list">("ban");
  const [banForm, setBanForm] = useState({ target_uuid: "", ban_type: "full", duration_hours: "24", reason: "promo", custom_reason: "", banned_elements: [] as string[], ban_scope: "normal" as "normal" | "device" });
  const [banLoading, setBanLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [banImage, setBanImage] = useState<File | null>(null);
  const banFileRef = useRef<HTMLInputElement>(null);

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
    const reason = banForm.reason === 'other' ? banForm.custom_reason : banForm.reason;
    if (!reason.trim()) { toast.error("أدخل السبب"); return; }
    if (!confirm('هل أنت متأكد من تنفيذ الحظر؟')) return;

    setBanLoading(true);
    const t = toast.loading("جاري تنفيذ الحظر...");
    try {
      const effectiveBanScope = banForm.reason === 'promo' ? 'device' : banForm.ban_scope;
      const durationHours = banForm.reason === 'promo' ? 999999 : (parseInt(banForm.duration_hours) || 24);

      await adminCall("manual_ban_user", {
        target_uuid: banForm.target_uuid.trim(),
        ban_type: banForm.ban_type,
        duration_hours: durationHours,
        reason: reason.trim(),
        banned_elements: banForm.ban_type === "elements" ? banForm.banned_elements : null,
      });

      // Execute real ban on external server
      try {
        await fetch(
          `https://hola-chat.com/wares-api.php?key=ghala2026actions&action=ban-user-real&uuid=${banForm.target_uuid.trim()}&reason=${encodeURIComponent(reason)}&hours=${durationHours}&ban_type=${effectiveBanScope}`
        );
      } catch (e) { console.error("Real ban failed:", e); }

      const durationText = durationHours === 999999 ? "أبدي" : `${durationHours} ساعة`;
      await sendUserNotification(
        banForm.target_uuid.trim(),
        "تم تعليق حسابك",
        `تم تعليق حسابك بسبب: ${reason || "مخالفة"}. المدة: ${durationText}.`
      );
      toast.dismiss(t);
      toast.success("تم حظر المستخدم بنجاح");
      setBanForm({ target_uuid: "", ban_type: "full", duration_hours: "24", reason: "promo", custom_reason: "", banned_elements: [], ban_scope: "normal" });
      setBanImage(null);
      loadData();
    } catch (err: any) { toast.dismiss(t); toast.error(err?.message || "فشل الحظر"); }
    finally { setBanLoading(false); }
  };

  const handleUnban = async () => {
    if (!banForm.target_uuid.trim()) { toast.error('أدخل UUID'); return; }
    const t = toast.loading("جاري فك الحظر...");
    try {
      await fetch(`https://hola-chat.com/wares-api.php?key=ghala2026actions&action=unban-user-real&uuid=${banForm.target_uuid.trim()}`);
      toast.dismiss(t);
      toast.success("تم فك الحظر!");
    } catch { toast.dismiss(t); toast.error("فشل فك الحظر"); }
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

              {/* 1. UUID */}
              <input placeholder="UUID المستخدم" value={banForm.target_uuid} onChange={e => setBanForm(p => ({ ...p, target_uuid: e.target.value }))}
                className="w-full h-12 rounded-xl px-4 text-sm tabular-nums focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} dir="ltr" />

              {/* 2. سبب الحظر */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-2 font-bold">سبب الحظر</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'promo', label: 'ترويج', active: 'rgba(244,63,94,0.15)', border: 'rgba(244,63,94,0.3)' },
                    { value: 'insult', label: 'سب / إساءة', active: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.3)' },
                    { value: 'other', label: 'أخرى', active: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
                  ].map(r => (
                    <motion.button key={r.value} whileTap={{ scale: 0.95 }}
                      onClick={() => setBanForm(p => ({ ...p, reason: r.value }))}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all ${banForm.reason === r.value ? 'text-foreground' : 'text-muted-foreground'}`}
                      style={banForm.reason === r.value ? { background: r.active, border: `1px solid ${r.border}` } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {r.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {banForm.reason === 'other' && (
                <input placeholder="اكتب السبب..." value={banForm.custom_reason} onChange={e => setBanForm(p => ({ ...p, custom_reason: e.target.value }))}
                  className="w-full h-12 rounded-xl px-4 text-sm focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              )}

              {/* 3. نوع الحظر الداخلي (كامل / عناصر) */}
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
                      className="py-2 px-2 rounded-xl text-[11px] font-bold transition-all"
                      style={banForm.banned_elements.includes(el.key) ? { background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.2)', color: 'hsl(350 89% 60%)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))' }}>
                      {el.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* 4. نوع البند (حساب / جهاز) */}
              {banForm.reason !== 'promo' ? (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 font-bold">نوع الحظر</p>
                  <div className="flex gap-3">
                    {[
                      { key: 'normal' as const, label: 'حساب فقط', activeColor: 'rgba(59,130,246,0.12)', activeBorder: 'rgba(59,130,246,0.3)' },
                      { key: 'device' as const, label: 'جهاز كامل', activeColor: 'rgba(244,63,94,0.12)', activeBorder: 'rgba(244,63,94,0.3)' },
                    ].map(s => (
                      <motion.button key={s.key} whileTap={{ scale: 0.95 }}
                        onClick={() => setBanForm(p => ({ ...p, ban_scope: s.key }))}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${banForm.ban_scope === s.key ? 'text-foreground' : 'text-muted-foreground'}`}
                        style={banForm.ban_scope === s.key ? { background: s.activeColor, border: `1px solid ${s.activeBorder}` } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {s.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}>
                  <p className="text-xs text-admin-rose font-bold">الترويج = حظر جهاز دائم تلقائي (999,999 ساعة)</p>
                </div>
              )}

              {/* 5. مدة الحظر */}
              {banForm.reason !== 'promo' && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 font-bold">مدة الحظر</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: '3', label: '3 ساعات' },
                      { value: '6', label: '6 ساعات' },
                      { value: '12', label: '12 ساعة' },
                      { value: '24', label: '24 ساعة' },
                    ].map(d => (
                      <motion.button key={d.value} whileTap={{ scale: 0.95 }}
                        onClick={() => setBanForm(p => ({ ...p, duration_hours: d.value }))}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${banForm.duration_hours === d.value ? 'text-foreground' : 'text-muted-foreground'}`}
                        style={banForm.duration_hours === d.value ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {d.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. صورة إثبات */}
              <input type="file" ref={banFileRef} className="hidden" accept="image/*,video/*"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f && f.size <= 10 * 1024 * 1024) setBanImage(f);
                  else if (f) toast.error('الحد الأقصى 10MB');
                }}
              />
              <button onClick={() => banFileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-muted-foreground transition-all hover:text-foreground"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                {banImage ? (
                  <><LucideImage className="w-4 h-4 text-admin-rose" /> {banImage.name}</>
                ) : (
                  <><Upload className="w-4 h-4" /> رفع صورة أو فيديو إثبات (اختياري)</>
                )}
              </button>

              {/* 7. أزرار التنفيذ + فك الحظر */}
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.96 }} onClick={executeBan} disabled={banLoading || !banForm.target_uuid.trim()}
                  className="flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))', boxShadow: '0 4px 16px rgba(244,63,94,0.35)' }}>
                  {banLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4" />تنفيذ الحظر</>}
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={handleUnban} disabled={!banForm.target_uuid.trim()}
                  className="h-12 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'hsl(160 84% 39%)' }}>
                  <Unlock className="w-4 h-4" /> فك الحظر
                </motion.button>
              </div>
            </motion.div>
          )}

          {!loading && subTab === "reports" && (
                <motion.div key="reports" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {banReports.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><ShieldBan className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد بلاغات</p></div>
              ) : banReports.map((report: any, i: number) => (
                <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl overflow-hidden" style={glassCard}>
                  
                  {/* Evidence preview */}
                  {report.evidence_url && (
                    <div className="relative w-full aspect-video bg-black/40">
                      {report.evidence_type === "video" ? (
                        <video src={report.evidence_url} controls playsInline className="w-full h-full object-contain" />
                      ) : (
                        <img src={report.evidence_url} alt="دليل" className="w-full h-full object-contain" />
                      )}
                      <a href={report.evidence_url} target="_blank" rel="noopener noreferrer"
                        className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                        <ExternalLink className="w-3.5 h-3.5 text-white/80" />
                      </a>
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold text-white"
                        style={{ background: report.evidence_type === "video" ? 'rgba(139,92,246,0.85)' : 'rgba(59,130,246,0.85)' }}>
                        {report.evidence_type === "video" ? <span className="flex items-center gap-1"><Play className="w-3 h-3" /> فيديو</span> : <span className="flex items-center gap-1"><LucideImage className="w-3 h-3" /> صورة</span>}
                      </div>
                    </div>
                  )}

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold tabular-nums">{report.reported_user_id}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold`}
                        style={report.is_verified ? { background: 'rgba(16,185,129,0.12)', color: 'hsl(160 84% 39%)' } : { background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)' }}>
                        {report.is_verified ? "مؤكد" : "معلق"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{report.description}</p>
                    <p className="text-[10px] text-muted-foreground">نوع: {report.ban_type} • مبلّغ: {report.reporter_gala_id}</p>
                    {report.voice_url && (
                      <audio src={report.voice_url} controls className="w-full h-8 mt-1" style={{ filter: 'invert(1) hue-rotate(180deg)', opacity: 0.7 }} />
                    )}
                    {!report.is_verified && (
                      <div className="flex gap-2 mt-1">
                        <motion.button whileTap={{ scale: 0.95 }} disabled={!!actionInProgress}
                          onClick={async () => { if (actionInProgress) return; setActionInProgress(report.id); const t = toast.loading("جاري التأكيد..."); try { await adminCall("update_ban_report", { id: report.id, is_verified: true }); toast.dismiss(t); toast.success("تم التأكيد"); loadData(); } catch { toast.dismiss(t); toast.error("فشل التأكيد"); } finally { setActionInProgress(null); } }}
                          className="flex-1 h-9 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                          {actionInProgress === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "تأكيد"}
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} disabled={!!actionInProgress}
                          onClick={async () => { if (actionInProgress) return; setActionInProgress(report.id + "_r"); const t = toast.loading("جاري الرفض..."); try { await adminCall("update_ban_report", { id: report.id, admin_notes: "مرفوض" }); toast.dismiss(t); toast.success("تم الرفض"); loadData(); } catch { toast.dismiss(t); toast.error("فشل"); } finally { setActionInProgress(null); } }}
                          className="flex-1 h-9 rounded-xl text-xs font-bold text-muted-foreground disabled:opacity-50 flex items-center justify-center gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {actionInProgress === report.id + "_r" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "رفض"}
                        </motion.button>
                      </div>
                    )}
                  </div>
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
                    <motion.button whileTap={{ scale: 0.96 }} disabled={!!actionInProgress}
                      onClick={async () => { if (actionInProgress) return; setActionInProgress(ban.id); const t = toast.loading("جاري فك الحظر..."); try { await adminCall("unban_manual", { ban_id: ban.id }); await sendUserNotification(ban.target_uuid, "تم إعادة تفعيل حسابك", "تم رفع الحظر عن حسابك. يمكنك استخدام التطبيق بشكل طبيعي."); toast.dismiss(t); toast.success("تم فك الحظر"); loadData(); } catch { toast.dismiss(t); toast.error("فشل فك الحظر"); } finally { setActionInProgress(null); } }}
                      className="w-full h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                      {actionInProgress === ban.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Unlock className="w-4 h-4" />فك الحظر</>}
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
                      <motion.button whileTap={{ scale: 0.96 }} disabled={!!actionInProgress}
                        onClick={async () => { if (actionInProgress) return; setActionInProgress(acc.id); const t = toast.loading("جاري فك الحظر..."); try { await adminCall("unblock_account", { target_uuid: acc.target_uuid }); toast.dismiss(t); toast.success("تم فك الحظر"); loadData(); } catch { toast.dismiss(t); toast.error("فشل"); } finally { setActionInProgress(null); } }}
                        className="w-full h-10 mt-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                        {actionInProgress === acc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Unlock className="w-4 h-4" />فك الحظر</>}
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
