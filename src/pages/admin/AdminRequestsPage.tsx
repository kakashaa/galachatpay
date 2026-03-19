import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Frame, Scissors, Camera, Gift,
  CheckCircle, XCircle, Clock, Copy, Hash, Send, User,
  Calendar, ExternalLink, Play, Eye, Timer
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/sendUserNotification";
import SvgaPlayer from "@/components/SvgaPlayer";
import { captureMediaThumbnail } from "@/utils/captureMediaThumbnail";
import { supabase } from "@/integrations/supabase/client";

type ReqTab = "entries" | "frames" | "hairs" | "animated" | "custom";

const tabs: { key: ReqTab; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key: "entries", label: "دخوليات", icon: Sparkles, color: "text-admin-amber", bg: "rgba(245,158,11," },
  { key: "frames", label: "إطارات", icon: Frame, color: "text-admin-blue", bg: "rgba(59,130,246," },
  { key: "hairs", label: "شعرات", icon: Scissors, color: "text-admin-pink", bg: "rgba(236,72,153," },
  { key: "animated", label: "صور", icon: Camera, color: "text-admin-purple", bg: "rgba(139,92,246," },
  { key: "custom", label: "هدايا", icon: Gift, color: "text-admin-emerald", bg: "rgba(16,185,129," },
];

type PendingCounts = Record<ReqTab, number>;

const isSvga = (url: string) => url?.toLowerCase().endsWith(".svga");
const isVideo = (url: string) => {
  const l = url?.toLowerCase() || "";
  return l.endsWith(".mp4") || l.endsWith(".webm") || l.endsWith(".mov");
};

const AdminRequestsPage: React.FC = () => {
  const { adminCall, handleLogout } = useAdminSession();
  const [activeTab, setActiveTab] = useState<ReqTab>("entries");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ entries: 0, frames: 0, hairs: 0, animated: 0, custom: 0 });
  const [shakenTab, setShakenTab] = useState<ReqTab | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  useEffect(() => { loadAllCounts(); }, []);
  useEffect(() => { loadData(); }, [activeTab]);

  const loadAllCounts = async () => {
    const actionMap: Record<ReqTab, string> = {
      entries: "list_entry_requests", frames: "list_frame_claims",
      hairs: "list_hair_selections", animated: "list_animated_photos", custom: "list_custom_gifts",
    };
    try {
      const results = await Promise.allSettled(
        (Object.keys(actionMap) as ReqTab[]).map(async (key) => {
          const data = await adminCall(actionMap[key]);
          return { key, count: (data || []).filter((i: any) => i.status === "pending").length };
        })
      );
      const counts: PendingCounts = { entries: 0, frames: 0, hairs: 0, animated: 0, custom: 0 };
      results.forEach(r => { if (r.status === "fulfilled") counts[r.value.key] = r.value.count; });
      setPendingCounts(counts);
    } catch { /* silent */ }
  };

  const loadData = async () => {
    setLoading(true);
    setRemovedIds(new Set());
    try {
      const actionMap: Record<ReqTab, string> = {
        entries: "list_entry_requests", frames: "list_frame_claims",
        hairs: "list_hair_selections", animated: "list_animated_photos", custom: "list_custom_gifts",
      };
      const data = await adminCall(actionMap[activeTab]);
      setItems(data || []);
      setPendingCounts(prev => ({ ...prev, [activeTab]: (data || []).filter((i: any) => i.status === "pending").length }));
    } catch { toast.error("فشل تحميل البيانات"); }
    finally { setLoading(false); }
  };

  // --- capture thumbnail helper ---
  const captureThumbnailUrl = async (fileUrl: string, itemId: string): Promise<string> => {
    try {
      const blob = await captureMediaThumbnail(fileUrl);
      if (!blob) return "";
      const thumbPath = `thumbnails/${itemId}_thumb.png`;
      const { data: uploadData } = await supabase.storage
        .from("attachments")
        .upload(thumbPath, blob, { contentType: "image/png", upsert: true });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(thumbPath);
        return urlData.publicUrl;
      }
    } catch (e) { console.error("Thumbnail capture failed:", e); }
    return "";
  };

  // --- auto upload logic ---
  const WARES_API = "https://hola-chat.com/wares-api.php";
  const WARES_KEY = "ghala2026actions";
  const GALA_API = "https://galachat.site/project-z/api.php";
  const ADMIN_KEY = "ghala2026owner";

  const autoUploadToGala = async (item: any, type: ReqTab) => {
    try {
      if (type === "animated") {
        // Only update_user_avatar — nothing else
        const gifUrl = item.gif_url || item.details?.gif_url;
        if (!gifUrl) return;
        const res = await fetch(GALA_API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "update_user_avatar", admin_key: ADMIN_KEY, uuid: item.user_uuid, avatar_url: gifUrl }) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الصورة لغلا لايف ✅"); else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }

      } else if (type === "custom") {
        // Only upload_custom_gift — nothing else
        let thumbnailUrl = item.thumbnail_url || "";
        if (!thumbnailUrl && item.video_url) {
          thumbnailUrl = await captureThumbnailUrl(item.video_url, item.id);
        }
        const res = await fetch(GALA_API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "upload_custom_gift", admin_key: ADMIN_KEY, user_name: item.user_name || item.title || "", video_url: item.video_url || "", thumbnail_url: thumbnailUrl, price: "20000" }) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الهدية لغلا لايف ✅"); else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }

      } else if (type === "entries" || type === "frames") {
        // Use wares-api.php only: submit-request → approve (single upload + assign UUID)
        const fileUrl = item.file_url || item.animation_url || item.details?.file_url;
        if (!fileUrl || !item.user_uuid) return;

        const targetUuid = item.friend_uuid || item.user_uuid;
        const wareType = item.ware_type || (type === "frames" ? "frame" : "entry_profile");

        const ext = (fileUrl.split(".").pop() || "").toLowerCase().split("?")[0];
        const imageType = ext === "svga" ? "svga" : (ext === "webp" || ext === "png") ? "alpha" : "mp4";

        const toTimestamp = (value: unknown): number | null => {
          if (!value) return null;
          const text = String(value).trim();
          if (!text) return null;
          const isoLike = text.includes("T") ? text : text.replace(" ", "T") + "Z";
          const ts = Date.parse(isoLike);
          if (!Number.isNaN(ts)) return ts;
          const fallbackTs = Date.parse(text);
          return Number.isNaN(fallbackTs) ? null : fallbackTs;
        };

        // 1) Try to reuse pending request created for this claim (legacy flow)
        let pendingReqId: string | null = null;
        try {
          const myReqs = await fetch(`${WARES_API}?key=${WARES_KEY}&action=my-requests&uuid=${encodeURIComponent(targetUuid)}`).then(r => r.json());
          const requestList = Array.isArray(myReqs?.data?.requests)
            ? myReqs.data.requests
            : Array.isArray(myReqs?.requests)
              ? myReqs.requests
              : [];

          const claimTs = toTimestamp(item.created_at);
          const candidates = requestList.filter((r: any) => {
            if (String(r?.status || "").toLowerCase() !== "pending") return false;
            if (r?.ware_type !== wareType) return false;
            if (!claimTs) return false;
            const reqTs = toTimestamp(r?.created_at);
            if (!reqTs) return false;
            return Math.abs(reqTs - claimTs) <= 12 * 60 * 1000;
          });

          if (candidates.length > 0) {
            candidates.sort((a: any, b: any) => {
              const aTs = toTimestamp(a?.created_at) ?? 0;
              const bTs = toTimestamp(b?.created_at) ?? 0;
              return bTs - aTs;
            });
            pendingReqId = String(candidates[0].id);
          }
        } catch {
          // Continue with submit-request fallback
        }

        // 2) If we didn't find a matching pending request, create exactly one then approve it
        if (!pendingReqId) {
          const submitRes = await fetch(WARES_API, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              key: WARES_KEY,
              action: "submit-request",
              uuid: targetUuid,
              user_name: item.title || item.user_name || (type === "frames" ? "إطار" : "دخولية"),
              ware_type: wareType,
              image_type: imageType,
              file_url: fileUrl,
              days: String(item.duration_days || 30),
            }),
          }).then(r => r.json());

          if (submitRes.ok && submitRes.data?.request_id) {
            pendingReqId = String(submitRes.data.request_id);
          } else {
            toast.warning("تم القبول — لكن إنشاء الطلب فشل.");
            console.error("Submit-request failed:", submitRes);
            return;
          }
        }

        // 3) Approve: this is the only upload point on wares-api
        const approveRes = await fetch(`${WARES_API}?key=${WARES_KEY}&action=approve&id=${encodeURIComponent(pendingReqId)}&ware_type=${encodeURIComponent(wareType)}`).then(r => r.json());
        if (approveRes.ok) {
          toast.success(`تم رفع ${type === "frames" ? "الإطار" : "الدخولية"} لغلا لايف ✅`);
        } else {
          toast.warning("تم القبول — لكن الرفع لغلا لايف فشل.");
          console.error("Wares approve failed:", approveRes);
        }

      } else if (type === "hairs") {
        // Hairs still use upload_ware (badge type)
        const fileUrl = item.file_url || item.details?.file_url;
        if (!fileUrl || !item.user_uuid) return;
        const thumbnailUrl = await captureThumbnailUrl(fileUrl, item.id);
        const params: Record<string, string> = { action: "upload_ware", admin_key: ADMIN_KEY, ware_type: "badge", name: item.title || "شعار", file_url: fileUrl, uuid: item.user_uuid, file_format: "svga", expire: "30" };
        if (thumbnailUrl) params.show_img = thumbnailUrl;
        const res = await fetch(GALA_API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الشعار لغلا لايف ✅"); else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }
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
    const loadingToast = toast.loading(isApprove ? "جاري استخراج الصورة والرفع لغلا لايف..." : "جاري تنفيذ الطلب...");
    try {
      await adminCall(action, { id, ...extra });
      if (isApprove && item) await autoUploadToGala(item, activeTab);

      if (item?.user_uuid) {
        const typeMap: Record<ReqTab, { approveTitle: string; approveBody: string; rejectTitle: string; rejectBody: string }> = {
          entries: { approveTitle: "تم قبول طلب الدخولية ✅", approveBody: `تم تفعيل الدخولية "${item.title || ''}" على حسابك!`, rejectTitle: "تم رفض طلب الدخولية ❌", rejectBody: "للأسف تم رفض طلب الدخولية الخاص بك." },
          frames: { approveTitle: "تم قبول طلب الإطار ✅", approveBody: `تم تفعيل الإطار "${item.title || ''}" على حسابك!`, rejectTitle: "تم رفض طلب الإطار ❌", rejectBody: "للأسف تم رفض طلب الإطار الخاص بك." },
          hairs: { approveTitle: "تم قبول الشعار ✅", approveBody: "تم تفعيل الشعار المختار على ملفك الشخصي!", rejectTitle: "تم رفض الشعار ❌", rejectBody: "للأسف تم رفض طلب الشعار الخاص بك." },
          animated: { approveTitle: "تم قبول الصورة المتحركة ✅", approveBody: "تم تفعيل صورتك المتحركة على ملفك الشخصي!", rejectTitle: "تم رفض الصورة المتحركة ❌", rejectBody: "تم رفض الصورة المتحركة. تواصل مع الدعم لمزيد من المعلومات." },
          custom: { approveTitle: "تم قبول الهدية المخصصة ✅", approveBody: `تم رفع هديتك "${item.title || ''}" وأصبحت متاحة لجميع المستخدمين!`, rejectTitle: "تم رفض الهدية المخصصة ❌", rejectBody: "للأسف تم رفض الهدية المخصصة. تأكد من استيفاء الشروط." },
        };
        const msgs = typeMap[activeTab];
        if (msgs) await sendUserNotification(item.user_uuid, isApprove ? msgs.approveTitle : msgs.rejectTitle, isApprove ? msgs.approveBody : msgs.rejectBody);
      }

      toast.dismiss(loadingToast);
      toast.success(isApprove ? "تم القبول بنجاح ✅" : "تم الرفض ✅");
      setRemovedIds(prev => new Set(prev).add(id));
      setPendingCounts(prev => ({ ...prev, [activeTab]: Math.max(0, prev[activeTab] - 1) }));
      setShakenTab(activeTab);
      setTimeout(() => setShakenTab(null), 600);
      setTimeout(() => loadData(), 500);
    } catch (err: any) { toast.dismiss(loadingToast); toast.error(err?.message || "فشلت العملية ❌"); }
    finally { setProcessingId(null); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success("تم النسخ ✅"); };

  const currentTab = tabs.find(t => t.key === activeTab)!;
  const visibleItems = items.filter(i => !removedIds.has(i.id));
  const pendingItems = visibleItems.filter((i: any) => i.status === "pending");
  const otherItems = visibleItems.filter((i: any) => i.status !== "pending");

  // Get the preview URL for any item
  const getPreviewUrl = (item: any) => item.file_url || item.video_url || item.gif_url || item.thumbnail_url || null;
  const getThumbnail = (item: any) => item.thumbnail_url || item.gif_url || null;

  // Render the visual media preview
  const renderMediaPreview = (item: any, size: "grid" | "full" = "grid") => {
    const url = getPreviewUrl(item);
    if (!url) return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <Play className="w-8 h-8 text-muted-foreground/40" />
      </div>
    );

    const thumb = getThumbnail(item);
    const dim = size === "grid" ? 140 : 200;

    if (isSvga(url)) {
      return (
        <div className="w-full h-full flex items-center justify-center p-2" style={{ background: 'radial-gradient(circle, rgba(30,30,40,0.9) 0%, rgba(10,10,15,1) 100%)' }}>
          <SvgaPlayer src={url} width={dim} height={dim} loop={0} className="object-contain max-w-full max-h-full" />
        </div>
      );
    }
    if (isVideo(url)) {
      return thumb
        ? <img src={thumb} alt="" className="w-full h-full object-contain p-1" />
        : <video src={url} muted autoPlay loop playsInline className="w-full h-full object-contain p-1" />;
    }
    // Image (webp, png, gif, jpg)
    return <img src={url} alt="" className="w-full h-full object-contain p-1" />;
  };

  const approveAction: Record<ReqTab, string> = {
    entries: "approve_entry_request", frames: "approve_frame_claim",
    hairs: "approve_hair_selection", animated: "approve_animated_photo", custom: "approve_custom_gift",
  };
  const rejectAction: Record<ReqTab, string> = {
    entries: "reject_entry_request", frames: "reject_frame_claim",
    hairs: "reject_hair_selection", animated: "reject_animated_photo", custom: "reject_custom_gift",
  };

  // Visual card like user pages
  const renderVisualCard = (item: any, i: number) => {
    const isPending = item.status === "pending";
    const isProcessing = processingId === item.id;
    const statusColor = item.status === "approved" ? "hsl(160 84% 39%)" : item.status === "rejected" ? "hsl(350 89% 55%)" : "hsl(40 96% 53%)";
    const statusLabel = item.status === "approved" ? "مقبول ✅" : item.status === "rejected" ? "مرفوض ❌" : "معلّق ⏳";
    const wareLabel = item.ware_type === "entry_room" ? "غرفة" : item.ware_type === "entry_profile" ? "ملف" : item.ware_type === "frame" ? "إطار" : null;

    return (
      <motion.div key={item.id}
        layout
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.25 } }}
        transition={{ delay: i * 0.04, duration: 0.3 }}
        className="relative rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Processing overlay */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'transparent', borderTopColor: 'hsl(160 84% 39%)', borderRightColor: 'hsl(160 84% 50%)' }} />
              <p className="text-xs font-bold text-white">جاري تنفيذ الطلب...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media preview - proportional visual area */}
        <div className="relative w-full aspect-[4/3] bg-black/40">
          <div className="absolute inset-0 flex items-center justify-center">
            {renderMediaPreview(item)}
          </div>

          {/* Status badge - top right */}
          <div className="absolute top-2 right-2 z-10">
            <span className="px-2 py-1 rounded-lg text-[9px] font-bold text-white"
              style={{ background: statusColor, boxShadow: `0 2px 8px ${statusColor}40` }}>
              {statusLabel}
            </span>
          </div>

          {/* Gift type badge - top left */}
          {item.claim_type === "friend" && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-1 rounded-lg text-[9px] font-bold" style={{ background: 'rgba(236,72,153,0.85)', color: 'white' }}>
                إهداء 🎁
              </span>
            </div>
          )}

          {/* Ware type badge */}
          {wareLabel && (
            <div className="absolute top-2 left-2 z-10" style={item.claim_type === "friend" ? { top: '32px' } : {}}>
              <span className="px-2 py-0.5 rounded-md text-[8px] font-bold" style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                {wareLabel}
              </span>
            </div>
          )}

          {/* Bottom gradient overlay with title */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-8 z-10">
            <p className="text-white font-bold text-[10px] truncate">{item.title || item.user_name || "—"}</p>
          </div>

          {/* File link */}
          {getPreviewUrl(item) && (
            <a href={getPreviewUrl(item)} target="_blank" rel="noopener noreferrer"
              className="absolute bottom-3 left-3 z-10 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
              <ExternalLink className="w-3.5 h-3.5 text-white/80" />
            </a>
          )}
        </div>

        {/* User info section */}
        <div className="p-2 space-y-1.5">
          {/* User details */}
          <div className="rounded-lg p-2 space-y-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
            {item.user_uuid && (
              <div className="flex items-center gap-1 text-[8px]">
                <Hash className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                <span className="font-mono truncate flex-1">{item.user_uuid}</span>
                <button onClick={() => copyToClipboard(item.user_uuid)} className="p-0.5 rounded hover:bg-white/10 flex-shrink-0">
                  <Copy className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              </div>
            )}
            {item.user_name && (
              <div className="flex items-center gap-1 text-[8px]">
                <User className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1">{item.user_name}</span>
              </div>
            )}
            {item.friend_uuid && (
              <div className="flex items-center gap-1 text-[8px]">
                <Send className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'hsl(330 80% 60%)' }} />
                <span className="font-mono truncate flex-1" style={{ color: 'hsl(330 80% 60%)' }}>{item.friend_uuid}</span>
              </div>
            )}
            {/* Extra info row */}
            <div className="flex items-center gap-2 text-[7px] text-muted-foreground pt-1 border-t border-white/5 flex-wrap">
              {item.duration_days && <span>{item.duration_days}يوم</span>}
              {item.duration_label && <span>{item.duration_label}</span>}
              {(item.charger_level_at_claim || item.charger_level_at_upload) && <span>لفل {item.charger_level_at_claim || item.charger_level_at_upload}</span>}
              <span className="mr-auto tabular-nums">{new Date(item.created_at).toLocaleDateString("ar-SA")}</span>
            </div>
          </div>

          {/* Approve / Reject buttons */}
          {isPending && (
            <div className="flex gap-1.5">
              <motion.button whileTap={{ scale: 0.92 }} disabled={!!processingId}
                onClick={() => handleAction(approveAction[activeTab], item.id)}
                className="flex-1 h-8 rounded-lg text-[10px] font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))' }}>
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                قبول
              </motion.button>
              <motion.button whileTap={{ scale: 0.92 }} disabled={!!processingId}
                onClick={() => handleAction(rejectAction[activeTab], item.id)}
                className="flex-1 h-8 rounded-lg text-[10px] font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))' }}>
                <XCircle className="w-3 h-3" /> رفض
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Shake animation
  const shakeVariants = {
    shake: { rotate: [0, -12, 12, -8, 8, -4, 4, 0], transition: { duration: 0.5 } },
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
                <motion.div variants={shakeVariants} animate={isShaking ? "shake" : "idle"}>
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? t.color : "text-muted-foreground"}`} />
                </motion.div>
                <span className={`text-[9px] font-bold transition-colors ${isActive ? t.color : "text-muted-foreground"}`}>{t.label}</span>
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, hsl(350 89% 55%), hsl(350 89% 45%))', boxShadow: '0 2px 6px rgba(244,63,94,0.4)' }}>
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground">
            <currentTab.icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد طلبات</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
              {/* Pending section */}
              {pendingItems.length > 0 && (
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                      <Clock className="w-3.5 h-3.5 text-admin-amber" />
                    </div>
                    <span className="text-xs font-bold text-admin-amber">معلّقة ({pendingItems.length})</span>
                  </div>
                  {/* Grid: 2 columns for entries/frames/hairs/custom, 1 column for animated photos */}
                  <div className="grid grid-cols-2 gap-3">
                    <AnimatePresence>
                      {pendingItems.map((item, i) => renderVisualCard(item, i))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Previous items */}
              {otherItems.length > 0 && (
                <div className="space-y-3">
                  {pendingItems.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">السابقة</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {otherItems.slice(0, 20).map((item, i) => {
                      const isApproved = item.status === "approved";
                      const isRejected = item.status === "rejected";
                      const statusColor = isApproved ? "hsl(160 84% 39%)" : "hsl(350 89% 55%)";
                      const statusLabel = isApproved ? "مقبول ✅" : "مرفوض ❌";
                      const previewUrl = getPreviewUrl(item);

                      return (
                        <motion.div key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="rounded-xl overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          {/* Compact status header */}
                          <div className="px-3 py-1.5 flex items-center justify-between"
                            style={{ background: isApproved ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)' }}>
                            <span className="text-[9px] font-bold" style={{ color: statusColor }}>
                              {statusLabel}
                            </span>
                            <span className="text-[8px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(item.created_at).toLocaleDateString("ar-SA")}
                            </span>
                          </div>

                          {/* Compact info */}
                          <div className="px-3 py-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-foreground truncate flex-1">{item.title || item.user_name || "—"}</p>
                              {item.duration_days && (
                                <span className="text-[8px] text-muted-foreground flex items-center gap-0.5 mr-2">
                                  <Timer className="w-2.5 h-2.5" /> {item.duration_days} يوم
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                              {item.user_uuid && (
                                <span className="flex items-center gap-0.5">
                                  <Hash className="w-2.5 h-2.5" />
                                  <span className="font-mono">{item.user_uuid}</span>
                                  <button onClick={() => copyToClipboard(item.user_uuid)} className="p-0.5 rounded hover:bg-white/10">
                                    <Copy className="w-2 h-2" />
                                  </button>
                                </span>
                              )}
                              {item.friend_uuid && (
                                <span className="flex items-center gap-0.5" style={{ color: 'hsl(330 80% 60%)' }}>
                                  <Send className="w-2.5 h-2.5" /> {item.friend_uuid}
                                </span>
                              )}
                            </div>

                            {/* View button */}
                            {previewUrl && (
                              <button
                                onClick={() => setPreviewItem(item)}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-[0.98]"
                                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: 'hsl(217 91% 60%)' }}
                              >
                                <Eye className="w-3 h-3" /> اضغط للعرض
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Preview Dialog for approved/rejected items */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-sm p-0 bg-background border-0 rounded-2xl overflow-hidden [&>button]:hidden">
          <DialogHeader className="p-3 pb-0">
            <DialogTitle className="text-sm text-center font-bold">{previewItem?.title || "عرض الملف"}</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-3 p-3">
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/50 flex items-center justify-center">
                {renderMediaPreview(previewItem, "full")}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                {previewItem.user_uuid && (
                  <span className="flex items-center gap-1 font-mono">
                    <Hash className="w-3 h-3" /> {previewItem.user_uuid}
                  </span>
                )}
                <span>{new Date(previewItem.created_at).toLocaleDateString("ar-SA")}</span>
              </div>
              <button onClick={() => setPreviewItem(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-foreground"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                إغلاق
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
};

export default AdminRequestsPage;
