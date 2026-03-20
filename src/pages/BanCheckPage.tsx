import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShieldBan, Search, ArrowRight, Loader2, ShieldCheck, AlertTriangle,
  Video, CheckCircle2, Megaphone, MessageSquareWarning, FileText, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileLayout from "@/components/MobileLayout";
import { secureUpload } from "@/utils/secureUpload";

/* ─── helpers ─── */
const CHECK_API = "https://hola-chat.com/wares-api.php?key=ghala2026actions&action=check-supporter&uuid=";

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return d; }
};

interface TargetUser { name: string; image: string; uuid: string }

const BanCheckPage = () => {
  const navigate = useNavigate();
  const { user: galaUser } = useAuth();

  /* ── Report tab state ── */
  const [targetUuid, setTargetUuid] = useState("");
  const [targetUser, setTargetUser] = useState<TargetUser | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [banReason, setBanReason] = useState<"insult" | "promotion" | "other">("insult");
  const [customReason, setCustomReason] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);

  /* ── Search tab state ── */
  const [searchUuid, setSearchUuid] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any[] | null>(null);

  /* ── Step 1: Lookup user ── */
  const lookupUser = async () => {
    const trimmed = targetUuid.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) { toast.error("أدخل UUID صحيح (أرقام فقط)"); return; }
    setLookupLoading(true);
    setTargetUser(null);
    setConfirmed(false);
    try {
      const res = await fetch(CHECK_API + encodeURIComponent(trimmed));
      const data = await res.json();
      if (data?.data?.name) {
        setTargetUser({ name: data.data.name, image: data.data.profile?.image || "", uuid: trimmed });
      } else {
        toast.error("المستخدم غير موجود");
      }
    } catch { toast.error("خطأ في البحث"); }
    finally { setLookupLoading(false); }
  };

  /* ── Step 3: Video ── */
  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast.error("يجب رفع فيديو فقط"); e.target.value = ""; return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("الحد الأقصى 10MB"); e.target.value = ""; return; }
    setVideoFile(f);
  };

  /* ── Submit report ── */
  const submitReport = async () => {
    if (!targetUser || !videoFile || !galaUser?.uuid) return;
    setSubmitting(true);
    try {
      const ext = videoFile.name.split(".").pop() || "mp4";
      const path = `ban-reports/${galaUser.uuid}/${Date.now()}.${ext}`;
      const videoUrl = await secureUpload({ file: videoFile, bucket: "attachments", path, userUuid: String(galaUser.uuid) });

      const reasonText = banReason === "other" ? customReason : banReason === "insult" ? "سب/شتم/قذف" : "ترويج";
      const fullDesc = description ? `${reasonText}\n${description}` : reasonText;

      await supabase.from("ban_reports").insert({
        reporter_gala_id: String(galaUser.uuid),
        reported_user_id: targetUser.uuid,
        ban_type: banReason,
        description: fullDesc,
        evidence_url: videoUrl,
        evidence_type: "video",
        is_verified: false,
        reward_amount: banReason === "promotion" ? 50000 : 0,
      });

      toast.success("تم رفع البلاغ بنجاح");
      // reset
      setTargetUuid(""); setTargetUser(null); setConfirmed(false);
      setBanReason("insult"); setCustomReason(""); setDescription("");
      setVideoFile(null);
    } catch (err: any) { toast.error(err?.message || "فشل رفع البلاغ"); }
    finally { setSubmitting(false); }
  };

  /* ── Search ban ── */
  const searchBan = async () => {
    const trimmed = searchUuid.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) { toast.error("أدخل UUID صحيح"); return; }
    setSearching(true);
    setSearchResult(null);
    try {
      const { data } = await supabase
        .from("ban_reports")
        .select("*")
        .eq("reported_user_id", trimmed)
        .eq("is_verified", true)
        .order("created_at", { ascending: false });
      setSearchResult(data || []);
    } catch { toast.error("خطأ في البحث"); }
    finally { setSearching(false); }
  };

  const canSubmit = confirmed && videoFile && targetUser;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background p-4 pb-24" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5" /></Button>
          <h1 className="text-xl font-bold">نظام البلاغات</h1>
        </div>

        <Tabs defaultValue="report" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="report" className="flex-1 text-xs gap-1"><Megaphone className="w-3.5 h-3.5" /> بلّغ عن حساب</TabsTrigger>
            <TabsTrigger value="search" className="flex-1 text-xs gap-1"><Search className="w-3.5 h-3.5" /> بحث عن سبب الحظر</TabsTrigger>
          </TabsList>

          {/* ═══ TAB 1: Report ═══ */}
          <TabsContent value="report" className="space-y-4">
            {/* Step 1: UUID lookup */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-bold">1. UUID المستخدم</p>
              <div className="flex gap-2">
                <Input type="text" inputMode="numeric" placeholder="ادخل UUID..." value={targetUuid}
                  onChange={e => { setTargetUuid(e.target.value.replace(/\D/g, "")); setTargetUser(null); setConfirmed(false); }}
                  className="flex-1" dir="ltr" />
                <Button onClick={lookupUser} disabled={lookupLoading || !targetUuid.trim()} size="sm">
                  {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              <AnimatePresence>
                {targetUser && !confirmed && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {targetUser.image ? (
                      <img src={targetUser.image} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{targetUser.name?.[0]}</div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-bold">{targetUser.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums" dir="ltr">{targetUser.uuid}</p>
                    </div>
                    <Button size="sm" onClick={() => setConfirmed(true)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> هذا هو
                    </Button>
                  </motion.div>
                )}
                {targetUser && confirmed && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" /> تم تأكيد: {targetUser.name}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step 2: Reason (after confirm) */}
            {confirmed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-bold">2. سبب البلاغ</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "insult" as const, label: "سب/شتم/قذف", icon: MessageSquareWarning },
                    { value: "promotion" as const, label: "ترويج", icon: Megaphone },
                    { value: "other" as const, label: "أخر", icon: FileText },
                  ]).map(r => (
                    <button key={r.value} onClick={() => setBanReason(r.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-bold transition-all border ${banReason === r.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                      <r.icon className="w-5 h-5" />
                      {r.label}
                    </button>
                  ))}
                </div>

                {banReason === "promotion" && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400 font-bold text-center">
                    🎁 ستتم مكافأتك بـ 50,000 كوينز إذا كان الترويج صحيح
                  </div>
                )}

                {banReason === "other" && (
                  <Input placeholder="اكتب السبب..." value={customReason} onChange={e => setCustomReason(e.target.value)} />
                )}
              </motion.div>
            )}

            {/* Step 3: Video (mandatory) */}
            {confirmed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-bold">3. فيديو إثبات <span className="text-destructive">*</span></p>
                <input type="file" ref={videoRef} className="hidden" accept="video/*" onChange={handleVideo} />
                <button onClick={() => videoRef.current?.click()}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed transition-all ${videoFile ? "border-primary bg-primary/5" : "border-border"}`}>
                  {videoFile ? (
                    <><Video className="w-5 h-5 text-primary" /><span className="text-xs font-bold text-primary">{videoFile.name}</span></>
                  ) : (
                    <><Upload className="w-5 h-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">اضغط لرفع فيديو (max 10MB)</span></>
                  )}
                </button>
              </motion.div>
            )}

            {/* Step 4: Description (optional) */}
            {confirmed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-bold">4. وصف <span className="text-muted-foreground font-normal">(اختياري)</span></p>
                <Textarea placeholder="أضف تفاصيل إضافية..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </motion.div>
            )}

            {/* Step 5: Submit */}
            {confirmed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Button onClick={submitReport} disabled={!canSubmit || submitting} className="w-full h-12 text-sm font-bold gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldBan className="w-4 h-4" />}
                  رفع البلاغ
                </Button>
              </motion.div>
            )}
          </TabsContent>

          {/* ═══ TAB 2: Search ═══ */}
          <TabsContent value="search" className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-bold">بحث بـ UUID</p>
              <div className="flex gap-2">
                <Input type="text" inputMode="numeric" placeholder="ادخل UUID..." value={searchUuid}
                  onChange={e => setSearchUuid(e.target.value.replace(/\D/g, ""))} className="flex-1" dir="ltr" />
                <Button onClick={searchBan} disabled={searching || !searchUuid.trim()} size="sm">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {searching && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </motion.div>
              )}

              {!searching && searchResult !== null && searchResult.length === 0 && (
                <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                  <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-emerald-500">هذا الحساب غير محظور</p>
                </motion.div>
              )}

              {!searching && searchResult && searchResult.length > 0 && (
                <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <ShieldBan className="w-5 h-5" />
                    <span className="font-bold text-sm">محظور — {searchResult.length} بلاغ مؤكد</span>
                  </div>
                  {searchResult.map((r: any) => (
                    <div key={r.id} className="rounded-xl border border-destructive/20 bg-card overflow-hidden">
                      {r.evidence_url && r.evidence_type === "video" && (
                        <video src={r.evidence_url} controls playsInline className="w-full aspect-video object-contain bg-black/40" />
                      )}
                      <div className="p-4 space-y-2">
                        <p className="text-sm font-bold">السبب: {r.description || r.ban_type}</p>
                        <p className="text-xs text-muted-foreground">تاريخ البلاغ: {formatDate(r.created_at)}</p>
                        {r.expires_at && <p className="text-xs text-muted-foreground">ينتهي: {formatDate(r.expires_at)}</p>}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default BanCheckPage;
