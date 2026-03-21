import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import { supabase } from "@/integrations/supabase/client";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import {
  Ban, Unlock, Loader2, ShieldBan, Shield, ExternalLink, Upload,
  Image as LucideImage, Search, Clock, CheckCircle, XCircle, Gift,
  Megaphone, MessageSquareWarning, AlertTriangle, Eye, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/sendUserNotification";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { galaApi } from "@/services/galaApi";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Ban types used across the page

const BAN_TYPE_INFO: Record<string, { label: string; icon: React.ReactNode; duration: string }> = {
  promotion: { label: "ترويج", icon: <Megaphone className="w-3.5 h-3.5" />, duration: "دائم" },
  insult: { label: "شتم", icon: <MessageSquareWarning className="w-3.5 h-3.5" />, duration: "24 ساعة" },
  defamation: { label: "قذف", icon: <AlertTriangle className="w-3.5 h-3.5" />, duration: "24 ساعة" },
  other: { label: "أخرى", icon: <Shield className="w-3.5 h-3.5" />, duration: "متغير" },
};

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(d); }
};

interface TargetUser { name: string; image: string }

const glassCard = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 16px -4px rgba(0,0,0,0.3)",
};

const AdminBanPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const { confirm, ConfirmDialog } = useConfirmModal();
  const adminUsername = localStorage.getItem("admin_username") || "";

  const [filter, setFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  /* ── All reports ── */
  const [allReports, setAllReports] = useState<any[]>([]);

  /* ── Selected report dialog ── */
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [durationPick, setDurationPick] = useState<string | null>(null);

  /* ── Manual ban tab ── */
  const [showManualBan, setShowManualBan] = useState(false);
  const [banUuid, setBanUuid] = useState("");
  const [banTarget, setBanTarget] = useState<TargetUser | null>(null);
  const [banLookup, setBanLookup] = useState(false);
  const [banReason, setBanReason] = useState<"promotion" | "insult" | "other">("insult");
  const [banDuration, setBanDuration] = useState<number>(24);
  const [banCustom, setBanCustom] = useState("");
  const [banImage, setBanImage] = useState<File | null>(null);
  const [banLoading, setBanLoading] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("ban_reports")
        .select("*")
        .order("created_at", { ascending: false });
      setAllReports(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  /* ── Computed stats & filtered lists ── */
  const isPending = (r: any) => !r.is_verified && r.admin_notes !== "مرفوض";
  const isVerified = (r: any) => r.is_verified;
  const isRejected = (r: any) => !r.is_verified && r.admin_notes === "مرفوض";

  const stats = {
    pending: allReports.filter(isPending).length,
    verified: allReports.filter(isVerified).length,
    rejected: allReports.filter(isRejected).length,
    unpaidRewards: allReports.filter(r => r.is_verified && r.reward_amount && !r.reward_paid).length,
  };

  const filteredReports = allReports
    .filter(r => {
      if (filter === "pending") return isPending(r);
      if (filter === "verified") return isVerified(r);
      if (filter === "rejected") return isRejected(r);
      return true; // "all"
    })
    .filter(r =>
      !searchQuery ||
      r.reported_user_id?.includes(searchQuery) ||
      r.reporter_gala_id?.includes(searchQuery)
    );

  const isPermanentBan = (report: any) =>
    report.ban_type === "promotion" || report.ban_type === "promo" || report.ban_type === "device" ||
    (!!report.reward_amount && report.reward_amount >= 50000);

  /* ── API actions ── */
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

  /* ── Accept report ── */
  const acceptReport = async (report: any, hours: number) => {
    setActionInProgress(report.id);
    const t = toast.loading("جاري التأكيد والحظر...");
    try {
      const isPromo = report.ban_type === "promotion";
      const banType = isPromo ? "device" : "normal";
      const banHours = isPromo ? 999999 : hours;
      const reason = report.description || "بلاغ مؤكد";

      const { data: existing } = await supabase
        .from("ban_reports").select("id")
        .eq("reported_user_id", report.reported_user_id).eq("is_verified", true).limit(1);
      if (existing && existing.length > 0) {
        const proceed = await confirm({
          title: "تنبيه", message: "هذا المستخدم محظور من قبل! هل تريد زيادة المدة؟",
          danger: true, confirmText: "نعم، حظر",
        });
        if (!proceed) { toast.dismiss(t); setActionInProgress(null); setDurationPick(null); return; }
      }

      const notesWithAdmin = adminUsername
        ? `[معالج بواسطة: ${adminUsername}] ${adminNotes || ""}`.trim()
        : adminNotes || null;

      await doBan(report.reported_user_id, reason, banHours, banType);
      await supabase.from("ban_reports").update({
        is_verified: true,
        admin_notes: notesWithAdmin,
      } as any).eq("id", report.id);

      toast.dismiss(t);
      toast.success("تم الحظر!");
      setSelectedReport(null);
      setAdminNotes("");
      setDurationPick(null);
      fetchReports();
    } catch { toast.dismiss(t); toast.error("فشل"); }
    finally { setActionInProgress(null); }
  };

  /* ── Reject report ── */
  const rejectReport = async (report: any) => {
    setActionInProgress(report.id + "_r");
    const t = toast.loading("جاري الرفض...");
    try {
      const notesWithAdmin = adminUsername
        ? `[معالج بواسطة: ${adminUsername}] ${adminNotes || ""}`.trim()
        : adminNotes || null;

      await supabase.from("ban_reports").update({
        admin_notes: notesWithAdmin || "مرفوض",
      } as any).eq("id", report.id);

      toast.dismiss(t);
      toast.success("تم الرفض");
      setSelectedReport(null);
      setAdminNotes("");
      fetchReports();
    } catch { toast.dismiss(t); toast.error("فشل"); }
    finally { setActionInProgress(null); }
  };

  /* ── Pay reward ── */
  const handlePayReward = async (report: any) => {
    if (!report.reward_amount) return;
    setActionInProgress(report.id + "_pay");
    try {
      const { error } = await supabase
        .from("ban_reports").update({ reward_paid: true } as any).eq("id", report.id);
      if (error) throw error;
      toast.success("تم تسجيل دفع المكافأة");
      fetchReports();
    } catch { toast.error("حدث خطأ"); }
    finally { setActionInProgress(null); }
  };

  /* ── Unban from list ── */
  const unbanFromList = async (report: any) => {
    const ok = await confirm({
      title: "فك الحظر", message: `فك حظر ${report.reported_user_id}؟`, confirmText: "فك الحظر",
    });
    if (!ok) return;
    setActionInProgress(report.id);
    const t = toast.loading("جاري فك الحظر...");
    try {
      const unbanType = report.ban_type === "promotion" ? "device" : "normal";
      await doUnban(report.reported_user_id, unbanType);
      await supabase.from("ban_reports").delete().eq("reported_user_id", report.reported_user_id).eq("is_verified", true);
      toast.dismiss(t);
      toast.success("تم فك الحظر!");
      setSelectedReport(null);
      fetchReports();
    } catch { toast.dismiss(t); toast.error("فشل"); }
    finally { setActionInProgress(null); }
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

      const expiresAt = isPromo ? null : new Date(Date.now() + hours * 3600 * 1000).toISOString();
      let evidenceUrl = "";
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
        ban_type: isPromo ? "promotion" : "insult",
        description: reason,
        evidence_url: evidenceUrl || "manual-ban",
        evidence_type: evidenceUrl ? "image" : "none",
        is_verified: true,
        expires_at: expiresAt,
        admin_notes: `حظر يدوي بواسطة: ${adminUsername}`,
      });

      toast.dismiss(t);
      toast.success("تم الحظر!");
      setBanUuid(""); setBanTarget(null); setBanReason("insult"); setBanCustom(""); setBanImage(null);
      setShowManualBan(false);
      fetchReports();
    } catch (e: any) { toast.dismiss(t); toast.error(e?.message || "فشل"); }
    finally { setBanLoading(false); }
  };

  const executeManualUnban = async () => {
    const uuid = banUuid.trim();
    if (!uuid) { toast.error("أدخل UUID"); return; }
    const ok = await confirm({ title: "فك الحظر", message: `فك حظر ${uuid}؟`, confirmText: "فك الحظر" });
    if (!ok) return;
    const t = toast.loading("جاري فك الحظر...");
    try {
      await doUnban(uuid);
      // Also clean up from ban_reports
      await supabase.from("ban_reports").delete().eq("reported_user_id", uuid).eq("is_verified", true);
      toast.dismiss(t);
      toast.success("تم فك الحظر!");
      setBanUuid(""); setBanTarget(null);
      fetchReports();
    } catch { toast.dismiss(t); toast.error("فشل"); }
  };

  const getTypeInfo = (type: string) => BAN_TYPE_INFO[type] || BAN_TYPE_INFO.other;

  return (
    <>
      <AdminPageLayout title="إدارة الحظر" accentColor="hsl(350 89% 60%)" onLogout={handleLogout}>
        <div className="max-w-[480px] mx-auto p-4 space-y-4" dir="rtl">

          {/* ═══ Stats Cards ═══ */}
          <div className="grid grid-cols-4 gap-2">
            {([
              { key: "pending" as const, count: stats.pending, label: "معلق", icon: <Clock className="w-4 h-4" />, color: "hsl(38 92% 50%)", bg: "rgba(245,158,11,0.12)" },
              { key: "verified" as const, count: stats.verified, label: "مؤكد", icon: <CheckCircle className="w-4 h-4" />, color: "hsl(160 84% 39%)", bg: "rgba(16,185,129,0.12)" },
              { key: "rejected" as const, count: stats.rejected, label: "مرفوض", icon: <XCircle className="w-4 h-4" />, color: "hsl(350 89% 60%)", bg: "rgba(244,63,94,0.12)" },
              { key: "all" as const, count: stats.unpaidRewards, label: "مكافآت", icon: <Gift className="w-4 h-4" />, color: "hsl(262 83% 58%)", bg: "rgba(139,92,246,0.12)" },
            ] as const).map(s => (
              <motion.button
                key={s.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(s.key)}
                className="p-3 rounded-xl text-center transition-all"
                style={{
                  background: filter === s.key ? s.bg : "rgba(255,255,255,0.03)",
                  border: filter === s.key ? `2px solid ${s.color}` : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                <p className="text-lg font-black tabular-nums" style={{ color: s.color }}>{s.count}</p>
                <p className="text-[10px] text-muted-foreground font-bold">{s.label}</p>
              </motion.button>
            ))}
          </div>

          {/* ═══ Search + Manual Ban Button ═══ */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بـ UUID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-10 h-11 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                dir="ltr"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowManualBan(true)}
              className="h-11 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 text-white shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))" }}
            >
              <Ban className="w-4 h-4" /> حظر يدوي
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={fetchReports}
              disabled={loading}
              className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </motion.button>
          </div>

          {/* ═══ Reports List ═══ */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-admin-rose" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShieldBan className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold">لا توجد بلاغات</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredReports.map((report, i) => {
                const typeInfo = getTypeInfo(report.ban_type);
                const pending = isPending(report);
                const verified = isVerified(report);
                const rejected = isRejected(report);

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100, height: 0 }}
                    transition={{ delay: i * 0.03 }}
                    layout
                    className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                    style={glassCard}
                    onClick={() => { setSelectedReport(report); setAdminNotes(""); setDurationPick(null); }}
                  >
                    <div className="p-4 space-y-2.5">
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                            style={{ background: "rgba(245,158,11,0.12)", color: "hsl(38 92% 50%)" }}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                          {pending && (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold"
                              style={{ background: "rgba(245,158,11,0.12)", color: "hsl(38 92% 50%)" }}>
                              معلق
                            </span>
                          )}
                          {verified && (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold"
                              style={{ background: "rgba(16,185,129,0.12)", color: "hsl(160 84% 39%)" }}>
                              مؤكد
                            </span>
                          )}
                          {rejected && (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold"
                              style={{ background: "rgba(244,63,94,0.12)", color: "hsl(350 89% 60%)" }}>
                              مرفوض
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString("ar-SA")}
                        </span>
                      </div>

                      {/* IDs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-[11px]">
                          <span className="text-muted-foreground">المُبلَّغ عنه: </span>
                          <span className="font-bold tabular-nums">{report.reported_user_id}</span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-muted-foreground">المُبلِّغ: </span>
                          <span className="font-bold tabular-nums">{report.reporter_gala_id}</span>
                        </div>
                      </div>

                      {/* Reward badge */}
                      {report.reward_amount && verified && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-xs font-bold text-purple-400">
                              {report.reward_amount.toLocaleString()} كوينز
                            </span>
                          </div>
                          {report.reward_paid ? (
                            <span className="text-[10px] text-emerald-400 font-bold">✓ تم الدفع</span>
                          ) : (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={e => { e.stopPropagation(); handlePayReward(report); }}
                              disabled={!!actionInProgress}
                              className="px-3 py-1 rounded-lg text-[10px] font-bold text-white disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(262 83% 48%))" }}
                            >
                              {actionInProgress === report.id + "_pay" ? <Loader2 className="w-3 h-3 animate-spin" /> : "تم الدفع"}
                            </motion.button>
                          )}
                        </div>
                      )}

                      {/* Quick actions for pending */}
                      {pending && (
                        <div className="flex gap-2 pt-1">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={e => { e.stopPropagation(); setSelectedReport(report); }}
                            className="flex-1 h-8 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "hsl(var(--muted-foreground))" }}
                          >
                            <Eye className="w-3.5 h-3.5" /> عرض
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={e => { e.stopPropagation(); setSelectedReport(report); setDurationPick(report.id); }}
                            className="flex-1 h-8 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1"
                            style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> تأكيد
                          </motion.button>
                        </div>
                      )}

                      {/* Quick unban for verified */}
                      {verified && (
                        <div className="flex gap-2 pt-1">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={e => { e.stopPropagation(); setSelectedReport(report); }}
                            className="flex-1 h-8 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "hsl(var(--muted-foreground))" }}
                          >
                            <Eye className="w-3.5 h-3.5" /> تفاصيل
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={e => { e.stopPropagation(); unbanFromList(report); }}
                            disabled={!!actionInProgress}
                            className="flex-1 h-8 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "hsl(160 84% 39%)" }}
                          >
                            {actionInProgress === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Unlock className="w-3.5 h-3.5" /> فك الحظر</>}
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </AdminPageLayout>

      {/* ═══ Report Detail Dialog ═══ */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden" style={{ background: "hsl(240 10% 6%)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <ShieldBan className="w-5 h-5 text-admin-rose" />
              تفاصيل البلاغ
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="p-4 space-y-4">
              {/* Evidence */}
              {selectedReport.evidence_url && selectedReport.evidence_url !== "manual-ban" && (
                <div className="rounded-xl overflow-hidden bg-black/40 relative">
                  {selectedReport.evidence_type === "video" ? (
                    <video src={selectedReport.evidence_url} controls playsInline className="w-full max-h-60 object-contain" />
                  ) : (
                    <img src={selectedReport.evidence_url} alt="" className="w-full max-h-60 object-contain" />
                  )}
                  <a href={selectedReport.evidence_url} target="_blank" rel="noopener noreferrer"
                    className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.5)" }}>
                    <ExternalLink className="w-3.5 h-3.5 text-white/80" />
                  </a>
                </div>
              )}

              {/* Details grid */}
              <div className="space-y-2.5 rounded-xl p-3" style={glassCard}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">نوع المخالفة</span>
                  <span className="flex items-center gap-1 text-xs font-bold">
                    {getTypeInfo(selectedReport.ban_type).icon}
                    {getTypeInfo(selectedReport.ban_type).label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">مدة الحظر</span>
                  <span className="text-xs font-bold">{getTypeInfo(selectedReport.ban_type).duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">المُبلِّغ</span>
                  <span className="text-xs font-bold tabular-nums">{selectedReport.reporter_gala_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">المُبلَّغ عنه</span>
                  <span className="text-xs font-bold tabular-nums">{selectedReport.reported_user_id}</span>
                </div>
                {selectedReport.description && (
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">الوصف</span>
                    <p className="text-xs text-foreground">{selectedReport.description}</p>
                  </div>
                )}
                {selectedReport.reward_amount && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">المكافأة</span>
                    <span className="text-xs font-bold text-purple-400">
                      {selectedReport.reward_amount.toLocaleString()} كوينز
                    </span>
                  </div>
                )}
              </div>

              {/* Admin actions for pending */}
              {isPending(selectedReport) && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="ملاحظات الأدمن (اختياري)..."
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    className="rounded-xl text-sm min-h-[60px]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />

                  {/* Duration picker */}
                  {selectedReport.ban_type !== "promotion" && durationPick === selectedReport.id && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-admin-rose">اختر مدة الحظر:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[3, 12, 24, 48].map(h => (
                          <motion.button
                            key={h}
                            whileTap={{ scale: 0.95 }}
                            disabled={!!actionInProgress}
                            onClick={() => acceptReport(selectedReport, h)}
                            className="py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))" }}
                          >
                            {actionInProgress === selectedReport.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : `${h}h`}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => rejectReport(selectedReport)}
                      disabled={!!actionInProgress}
                      className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {actionInProgress === selectedReport.id + "_r" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> رفض</>}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (selectedReport.ban_type === "promotion") {
                          acceptReport(selectedReport, 999999);
                        } else {
                          setDurationPick(selectedReport.id);
                        }
                      }}
                      disabled={!!actionInProgress}
                      className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}
                    >
                      {actionInProgress === selectedReport.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> تأكيد البلاغ</>}
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Already processed banner */}
              {(isVerified(selectedReport) || isRejected(selectedReport)) && (
                <div className={`p-3 rounded-xl ${isVerified(selectedReport) ? "" : ""}`}
                  style={{
                    background: isVerified(selectedReport) ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
                    border: `1px solid ${isVerified(selectedReport) ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)"}`,
                  }}>
                  <p className="text-sm font-bold" style={{ color: isVerified(selectedReport) ? "hsl(160 84% 39%)" : "hsl(350 89% 60%)" }}>
                    {isVerified(selectedReport) ? "✓ تم تأكيد هذا البلاغ" : "✗ تم رفض هذا البلاغ"}
                  </p>
                  {selectedReport.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-1">ملاحظات: {selectedReport.admin_notes}</p>
                  )}

                  {isVerified(selectedReport) && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => unbanFromList(selectedReport)}
                      disabled={!!actionInProgress}
                      className="mt-3 w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                      style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "hsl(160 84% 39%)" }}
                    >
                      {actionInProgress === selectedReport.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Unlock className="w-4 h-4" /> فك الحظر</>}
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Manual Ban Dialog ═══ */}
      <Dialog open={showManualBan} onOpenChange={setShowManualBan}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden" style={{ background: "hsl(240 10% 6%)", border: "1px solid rgba(244,63,94,0.15)" }}>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-admin-rose">
              <Ban className="w-5 h-5" />
              حظر / فك حظر مستخدم
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4">
            {/* UUID + lookup */}
            <div className="flex gap-2">
              <input
                placeholder="UUID المستخدم"
                value={banUuid}
                onChange={e => { setBanUuid(e.target.value); setBanTarget(null); }}
                className="flex-1 h-12 rounded-xl px-4 text-sm tabular-nums focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                dir="ltr"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={lookupBanUser}
                disabled={banLookup || !banUuid.trim()}
                className="h-12 px-4 rounded-xl text-xs font-bold text-admin-rose disabled:opacity-50"
                style={{ background: "rgba(244,63,94,0.1)" }}
              >
                {banLookup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </motion.button>
            </div>

            {banTarget && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
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
                  <motion.button
                    key={r.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setBanReason(r.value)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${banReason === r.value ? "text-foreground" : "text-muted-foreground"}`}
                    style={banReason === r.value
                      ? { background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.2)" }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
                    }
                  >
                    {r.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {banReason === "promotion" && (
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)" }}>
                <p className="text-xs text-admin-rose font-bold">ترويج = حظر جهاز دائم</p>
              </div>
            )}

            {banReason === "other" && (
              <input
                placeholder="اكتب السبب..."
                value={banCustom}
                onChange={e => setBanCustom(e.target.value)}
                className="w-full h-12 rounded-xl px-4 text-sm focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            )}

            {banReason === "insult" && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-2 font-bold">مدة الحظر</p>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 12, 24, 48].map(h => (
                    <motion.button
                      key={h}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setBanDuration(h)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all ${banDuration === h ? "text-white" : "text-muted-foreground"}`}
                      style={banDuration === h
                        ? { background: "linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))", boxShadow: "0 2px 8px rgba(244,63,94,0.3)" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
                      }
                    >
                      {h}h
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Image upload */}
            <input type="file" ref={imgRef} className="hidden" accept="image/*"
              onChange={e => { const f = e.target.files?.[0]; if (f && f.size <= 10 * 1024 * 1024) setBanImage(f); else if (f) toast.error("max 10MB"); }} />
            <button
              onClick={() => imgRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-muted-foreground"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}
            >
              {banImage ? <><LucideImage className="w-4 h-4 text-admin-rose" /> {banImage.name}</> : <><Upload className="w-4 h-4" /> صورة إثبات (اختياري)</>}
            </button>

            {/* Action buttons */}
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={executeManualBan}
                disabled={banLoading || !banUuid.trim()}
                className="flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))", boxShadow: "0 4px 16px rgba(244,63,94,0.35)" }}
              >
                {banLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4" />تنفيذ الحظر</>}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={executeManualUnban}
                disabled={!banUuid.trim()}
                className="h-12 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "hsl(160 84% 39%)" }}
              >
                <Unlock className="w-4 h-4" /> فك الحظر
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
};

export default AdminBanPage;
