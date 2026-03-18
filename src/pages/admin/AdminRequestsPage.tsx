import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Frame, Scissors, Camera, Gift,
  CheckCircle, XCircle, Eye, Clock, Copy, Calendar, User, Hash
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/sendUserNotification";

type ReqTab = "entries" | "frames" | "hairs" | "animated" | "custom";

const tabs: { key: ReqTab; label: string; icon: React.ElementType; color: string; bg: string; gradient: string }[] = [
  { key: "entries", label: "دخوليات", icon: Sparkles, color: "text-admin-amber", bg: "rgba(245,158,11,", gradient: "from-amber-500/20 to-amber-600/5" },
  { key: "frames", label: "إطارات", icon: Frame, color: "text-admin-blue", bg: "rgba(59,130,246,", gradient: "from-blue-500/20 to-blue-600/5" },
  { key: "hairs", label: "شعرات", icon: Scissors, color: "text-admin-pink", bg: "rgba(236,72,153,", gradient: "from-pink-500/20 to-pink-600/5" },
  { key: "animated", label: "صور", icon: Camera, color: "text-admin-purple", bg: "rgba(139,92,246,", gradient: "from-violet-500/20 to-violet-600/5" },
  { key: "custom", label: "هدايا", icon: Gift, color: "text-admin-emerald", bg: "rgba(16,185,129,", gradient: "from-emerald-500/20 to-emerald-600/5" },
];

const statusBadge = (status: string) => {
  if (status === "pending") return { label: "معلّق", icon: Clock, color: "text-admin-amber", bg: "rgba(245,158,11,0.1)" };
  if (status === "approved") return { label: "مقبول", icon: CheckCircle, color: "text-admin-emerald", bg: "rgba(16,185,129,0.1)" };
  return { label: "مرفوض", icon: XCircle, color: "text-admin-rose", bg: "rgba(244,63,94,0.1)" };
};

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)',
};

// Store all tab pending counts
type PendingCounts = Record<ReqTab, number>;

const AdminRequestsPage: React.FC = () => {
  const { adminCall, handleLogout } = useAdminSession();
  const [activeTab, setActiveTab] = useState<ReqTab>("entries");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ entries: 0, frames: 0, hairs: 0, animated: 0, custom: 0 });
  const [shakenTab, setShakenTab] = useState<ReqTab | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Load all pending counts on mount
  useEffect(() => {
    loadAllCounts();
  }, []);

  useEffect(() => { loadData(); }, [activeTab]);

  const loadAllCounts = async () => {
    const actionMap: Record<ReqTab, string> = {
      entries: "list_entry_requests",
      frames: "list_frame_claims",
      hairs: "list_hair_selections",
      animated: "list_animated_photos",
      custom: "list_custom_gifts",
    };
    try {
      const results = await Promise.allSettled(
        (Object.keys(actionMap) as ReqTab[]).map(async (key) => {
          const data = await adminCall(actionMap[key]);
          return { key, count: (data || []).filter((i: any) => i.status === "pending").length };
        })
      );
      const counts: PendingCounts = { entries: 0, frames: 0, hairs: 0, animated: 0, custom: 0 };
      results.forEach(r => {
        if (r.status === "fulfilled") counts[r.value.key] = r.value.count;
      });
      setPendingCounts(counts);
    } catch { /* silent */ }
  };

  const loadData = async () => {
    setLoading(true);
    setRemovedIds(new Set());
    try {
      const actionMap: Record<ReqTab, string> = {
        entries: "list_entry_requests",
        frames: "list_frame_claims",
        hairs: "list_hair_selections",
        animated: "list_animated_photos",
        custom: "list_custom_gifts",
      };
      const data = await adminCall(actionMap[activeTab]);
      setItems(data || []);
      // Update pending count for this tab
      setPendingCounts(prev => ({ ...prev, [activeTab]: (data || []).filter((i: any) => i.status === "pending").length }));
    } catch { toast.error("فشل تحميل البيانات"); }
    finally { setLoading(false); }
  };

  // --- auto upload logic (kept as-is) ---
  const autoUploadToGala = async (item: any, type: ReqTab) => {
    const API = "https://galachat.site/project-z/api.php";
    const ADMIN_KEY = "ghala2026owner";
    try {
      if (type === "animated") {
        const gifUrl = item.gif_url || item.details?.gif_url;
        if (!gifUrl) return;
        const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "update_user_avatar", admin_key: ADMIN_KEY, uuid: item.user_uuid, avatar_url: gifUrl }) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الصورة لغلا لايف ✅");
        else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }
      } else if (type === "custom") {
        const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "upload_custom_gift", admin_key: ADMIN_KEY, user_name: item.user_name || item.title || "", video_url: item.video_url || "", thumbnail_url: item.thumbnail_url || "", price: "20000" }) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الهدية لغلا لايف ✅");
        else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }
      } else if (type === "entries") {
        const fileUrl = item.file_url || item.animation_url || item.details?.file_url;
        if (!fileUrl || !item.user_uuid) return;
        const wareType = item.ware_type === "entry_profile" ? "entry" : "room_entry";
        const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "upload_ware", admin_key: ADMIN_KEY, ware_type: wareType, name: item.title || item.user_name || "دخولية", file_url: fileUrl, uuid: item.user_uuid, file_format: fileUrl.endsWith(".svga") ? "svga" : fileUrl.endsWith(".mp4") ? "mp4" : "svga", expire: String(item.duration_days || 30) }) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الدخولية لغلا لايف ✅");
        else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }
      } else if (type === "frames") {
        const fileUrl = item.file_url || item.animation_url || item.details?.file_url;
        if (!fileUrl || !item.user_uuid) return;
        const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "upload_ware", admin_key: ADMIN_KEY, ware_type: "frame", name: item.title || item.user_name || "إطار", file_url: fileUrl, uuid: item.user_uuid, file_format: fileUrl.endsWith(".svga") ? "svga" : "mp4", expire: String(item.duration_days || 30) }) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الإطار لغلا لايف ✅");
        else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }
      } else if (type === "hairs") {
        const fileUrl = item.file_url || item.details?.file_url;
        if (!fileUrl || !item.user_uuid) return;
        const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "upload_ware", admin_key: ADMIN_KEY, ware_type: "badge", name: item.title || "شعار", file_url: fileUrl, uuid: item.user_uuid, file_format: "svga", expire: "30" }) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الشعار لغلا لايف ✅");
        else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }
      }
    } catch (err) {
      toast.warning("تم القبول — لكن الرفع التلقائي فشل.");
      console.error("Auto-upload error:", err);
    }
  };

  const handleAction = async (action: string, id: string, extra?: any) => {
    if (processingId) return;
    setProcessingId(id);
    const item = items.find((i: any) => i.id === id);
    const isApprove = action.startsWith("approve_");
    const loadingToast = toast.loading(isApprove ? "جاري قبول الطلب ورفعه لغلا لايف..." : "جاري تنفيذ الطلب...");
    try {
      await adminCall(action, { id, ...extra });
      if (isApprove && item) await autoUploadToGala(item, activeTab);

      // Send notification
      if (item?.user_uuid) {
        const typeMap: Record<ReqTab, { approveTitle: string; approveBody: string; rejectTitle: string; rejectBody: string }> = {
          entries: { approveTitle: "تم قبول طلب الدخولية ✅", approveBody: `تم تفعيل الدخولية "${item.title || ''}" على حسابك!`, rejectTitle: "تم رفض طلب الدخولية ❌", rejectBody: "للأسف تم رفض طلب الدخولية الخاص بك." },
          frames: { approveTitle: "تم قبول طلب الإطار ✅", approveBody: `تم تفعيل الإطار "${item.title || ''}" على حسابك!`, rejectTitle: "تم رفض طلب الإطار ❌", rejectBody: "للأسف تم رفض طلب الإطار الخاص بك." },
          hairs: { approveTitle: "تم قبول الشعار ✅", approveBody: "تم تفعيل الشعار المختار على ملفك الشخصي!", rejectTitle: "تم رفض الشعار ❌", rejectBody: "للأسف تم رفض طلب الشعار الخاص بك." },
          animated: { approveTitle: "تم قبول الصورة المتحركة ✅", approveBody: "تم تفعيل صورتك المتحركة على ملفك الشخصي!", rejectTitle: "تم رفض الصورة المتحركة ❌", rejectBody: "تم رفض الصورة المتحركة. تواصل مع الدعم لمزيد من المعلومات." },
          custom: { approveTitle: "تم قبول الهدية المخصصة ✅", approveBody: `تم رفع هديتك "${item.title || ''}" وأصبحت متاحة لجميع المستخدمين!`, rejectTitle: "تم رفض الهدية المخصصة ❌", rejectBody: "للأسف تم رفض الهدية المخصصة. تأكد من استيفاء الشروط." },
        };
        const msgs = typeMap[activeTab];
        if (msgs) {
          await sendUserNotification(item.user_uuid, isApprove ? msgs.approveTitle : msgs.rejectTitle, isApprove ? msgs.approveBody : msgs.rejectBody);
        }
      }

      toast.dismiss(loadingToast);
      toast.success(isApprove ? "تم القبول بنجاح ✅" : "تم الرفض ✅");

      // Animate removal + shake the tab icon
      setRemovedIds(prev => new Set(prev).add(id));
      setPendingCounts(prev => ({ ...prev, [activeTab]: Math.max(0, prev[activeTab] - 1) }));
      setShakenTab(activeTab);
      setTimeout(() => setShakenTab(null), 600);

      // Reload after animation
      setTimeout(() => loadData(), 500);
    } catch (err: any) { toast.dismiss(loadingToast); toast.error(err?.message || "فشلت العملية ❌"); }
    finally { setProcessingId(null); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ ✅");
  };

  const currentTab = tabs.find(t => t.key === activeTab)!;
  const visibleItems = items.filter(i => !removedIds.has(i.id));
  const pendingItems = visibleItems.filter((i: any) => i.status === "pending");
  const otherItems = visibleItems.filter((i: any) => i.status !== "pending");

  const getActionButtons = (item: any) => {
    const approveAction: Record<ReqTab, string> = {
      entries: "approve_entry_request", frames: "approve_frame_claim",
      hairs: "approve_hair_selection", animated: "approve_animated_photo", custom: "approve_custom_gift",
    };
    const rejectAction: Record<ReqTab, string> = {
      entries: "reject_entry_request", frames: "reject_frame_claim",
      hairs: "reject_hair_selection", animated: "reject_animated_photo", custom: "reject_custom_gift",
    };
    if (item.status !== "pending") return null;
    const isProcessing = processingId === item.id;
    return (
      <div className="flex gap-2 mt-3">
        <motion.button whileTap={{ scale: 0.92 }} disabled={!!processingId}
          onClick={() => handleAction(approveAction[activeTab], item.id)}
          className="flex-1 h-9 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} قبول
        </motion.button>
        <motion.button whileTap={{ scale: 0.92 }} disabled={!!processingId}
          onClick={() => handleAction(rejectAction[activeTab], item.id)}
          className="flex-1 h-9 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>
          <XCircle className="w-3.5 h-3.5" /> رفض
        </motion.button>
      </div>
    );
  };

  const renderItemCard = (item: any, i: number) => {
    const badge = statusBadge(item.status);
    const BadgeIcon = badge.icon;
    const isProcessing = processingId === item.id;

    // Build detail rows
    const details: { icon: React.ElementType; label: string; value: string; copyable?: boolean }[] = [];
    if (item.user_uuid) details.push({ icon: Hash, label: "UUID", value: item.user_uuid, copyable: true });
    if (item.user_name) details.push({ icon: User, label: "الاسم", value: item.user_name });
    if (item.duration_label) details.push({ icon: Calendar, label: "المدة", value: item.duration_label });
    if (item.duration_days) details.push({ icon: Calendar, label: "الأيام", value: `${item.duration_days} يوم` });
    if (item.max_level) details.push({ icon: Sparkles, label: "المستوى", value: String(item.max_level) });
    if (item.charger_level_at_upload) details.push({ icon: Sparkles, label: "مستوى الشحن", value: String(item.charger_level_at_upload) });
    if (item.video_duration) details.push({ icon: Clock, label: "مدة الفيديو", value: `${item.video_duration}ث` });

    return (
      <motion.div key={item.id}
        layout
        initial={{ opacity: 0, y: 15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: -80, scale: 0.9, transition: { duration: 0.3 } }}
        transition={{ delay: i * 0.03, duration: 0.35 }}
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{ ...glassCard, background: `linear-gradient(145deg, ${currentTab.bg}0.05), rgba(255,255,255,0.02))` }}
      >
        {/* Processing overlay */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'transparent', borderTopColor: 'hsl(160 84% 39%)', borderRightColor: 'hsl(160 84% 50%)' }} />
              <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-xs font-bold text-white">جاري تنفيذ الطلب...</motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header: title + badge */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{item.title || item.user_name || "—"}</p>
            {item.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
          <span className="px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 mr-2 flex-shrink-0" style={{ background: badge.bg }}>
            <BadgeIcon className={`w-3 h-3 ${badge.color}`} />
            <span className={badge.color}>{badge.label}</span>
          </span>
        </div>

        {/* Detail rows */}
        {details.length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
            {details.map((d, idx) => {
              const DIcon = d.icon;
              return (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <DIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground flex-shrink-0">{d.label}:</span>
                  <span className="font-mono truncate flex-1">{d.value}</span>
                  {d.copyable && (
                    <button onClick={() => copyToClipboard(d.value)} className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0">
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Preview thumbnail */}
        {(item.gif_url || item.thumbnail_url || item.video_url) && (
          <div className="mt-3 rounded-xl overflow-hidden h-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
            {item.gif_url || item.thumbnail_url ? (
              <img src={item.gif_url || item.thumbnail_url} alt="" className="h-full object-contain" />
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                <Eye className="w-3.5 h-3.5" /> ملف مرفق
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[9px] text-muted-foreground mt-2 tabular-nums">
          {new Date(item.created_at).toLocaleString("ar-EG")}
        </p>

        {getActionButtons(item)}
      </motion.div>
    );
  };

  // Shake animation variants
  const shakeVariants = {
    shake: {
      rotate: [0, -12, 12, -8, 8, -4, 4, 0],
      transition: { duration: 0.5 }
    },
    idle: { rotate: 0 }
  };

  return (
    <AdminPageLayout title="الطلبات" accentColor="hsl(217 91% 60%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">

        {/* Icon strip nav */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-around rounded-2xl py-2.5 px-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.3)' }}>
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            const count = pendingCounts[t.key];
            const isShaking = shakenTab === t.key;
            return (
              <motion.button key={t.key} onClick={() => setActiveTab(t.key)} whileTap={{ scale: 0.85 }}
                className="relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all"
                style={isActive ? { background: `${t.bg}0.12)`, boxShadow: `0 2px 12px ${t.bg}0.2)` } : {}}>
                <motion.div
                  variants={shakeVariants}
                  animate={isShaking ? "shake" : "idle"}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? t.color : "text-muted-foreground"}`} />
                </motion.div>
                <span className={`text-[9px] font-bold transition-colors ${isActive ? t.color : "text-muted-foreground"}`}>
                  {t.label}
                </span>
                {/* Pending count badge */}
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, hsl(350 89% 55%), hsl(350 89% 45%))', boxShadow: '0 2px 6px rgba(244,63,94,0.4)' }}>
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div layoutId="activeRequestDot"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                    style={{ background: `${t.bg}0.8)` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: `${currentTab.bg}0.8)` }} />
          </div>
        ) : visibleItems.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 text-muted-foreground">
            <currentTab.icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد طلبات</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-4">
              {/* Pending section */}
              {pendingItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                      <Clock className="w-3.5 h-3.5 text-admin-amber" />
                    </div>
                    <span className="text-xs font-bold text-admin-amber">معلّقة ({pendingItems.length})</span>
                  </div>
                  <AnimatePresence>
                    {pendingItems.map((item, i) => renderItemCard(item, i))}
                  </AnimatePresence>
                </div>
              )}

              {/* Other items */}
              {otherItems.length > 0 && (
                <div className="space-y-2">
                  {pendingItems.length > 0 && (
                    <div className="flex items-center gap-2 mt-4">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">السابقة</span>
                    </div>
                  )}
                  {otherItems.slice(0, 20).map((item, i) => renderItemCard(item, i + pendingItems.length))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminRequestsPage;
