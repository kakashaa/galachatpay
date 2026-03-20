import React, { useState, useEffect, useRef } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Frame, Scissors, Camera, Gift, MonitorPlay,
  CheckCircle, XCircle, Clock, Copy, Hash, Send, User,
  Calendar, ExternalLink, Play, Eye, Timer, Upload, ImagePlus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/sendUserNotification";
import SvgaPlayer from "@/components/SvgaPlayer";
import { captureMediaThumbnail } from "@/utils/captureMediaThumbnail";
import { supabase } from "@/integrations/supabase/client";

type ReqTab = "entries" | "frames" | "hairs" | "animated" | "custom" | "rooms";

const tabs: { key: ReqTab; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key: "entries", label: "دخوليات", icon: Sparkles, color: "text-admin-amber", bg: "rgba(245,158,11," },
  { key: "frames", label: "إطارات", icon: Frame, color: "text-admin-blue", bg: "rgba(59,130,246," },
  { key: "hairs", label: "شعرات", icon: Scissors, color: "text-admin-pink", bg: "rgba(236,72,153," },
  { key: "animated", label: "صور", icon: Camera, color: "text-admin-purple", bg: "rgba(139,92,246," },
  { key: "custom", label: "هدايا", icon: Gift, color: "text-admin-emerald", bg: "rgba(16,185,129," },
  { key: "rooms", label: "خلفيات", icon: MonitorPlay, color: "text-admin-cyan", bg: "rgba(6,182,212," },
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
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ entries: 0, frames: 0, hairs: 0, animated: 0, custom: 0, rooms: 0 });
  const [shakenTab, setShakenTab] = useState<ReqTab | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [showDirectUpload, setShowDirectUpload] = useState(false);
  const [directUuid, setDirectUuid] = useState("");
  const [directFile, setDirectFile] = useState<File | null>(null);
  const [directUploading, setDirectUploading] = useState(false);
  const directFileRef = useRef<HTMLInputElement>(null);

  const handleDirectUpload = async () => {
    if (!directUuid.trim() || !directFile) {
      toast.error("أدخل UUID واختر صورة");
      return;
    }
    setDirectUploading(true);
    try {
      const path = `room-backgrounds/direct/${directUuid.trim()}_${Date.now()}.png`;
      const { data: uploadData } = await supabase.storage
        .from("attachments")
        .upload(path, directFile, { contentType: directFile.type, upsert: true });
      if (!uploadData) { toast.error("فشل رفع الصورة"); return; }
      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;
      const res = await fetch(
        `${HOLA_API}?key=${HOLA_KEY}&action=upload-room-background&uuid=${directUuid.trim()}&image_url=${encodeURIComponent(imageUrl)}`
      );
      const data = await res.json();
      if (data.ok || data.success) {
        toast.success("تم تغيير خلفية الغرفة!");
        setShowDirectUpload(false);
        setDirectUuid("");
        setDirectFile(null);
      } else {
        toast.error("فشل: " + (data.error || "خطأ غير معروف"));
      }
    } catch (e: any) {
      toast.error("خطأ: " + (e.message || "غير معروف"));
    } finally {
      setDirectUploading(false);
    }
  };

  useEffect(() => { loadAllCounts(); }, []);
  useEffect(() => { loadData(); }, [activeTab]);

  const HOLA_API = "https://hola-chat.com/wares-api.php";
  const HOLA_KEY = "ghala2026actions";

  // Fetch room bg requests from external dashboard
  const fetchRoomRequests = async (): Promise<any[]> => {
    try {
      const res = await fetch(`${HOLA_API}?key=${HOLA_KEY}&action=list-room-bg-requests`);
      const data = await res.json();
      const raw = data.data?.requests || data.requests || [];
      return raw.map((r: any) => ({
        id: String(r.id),
        user_uuid: r.uuid || r.user_uuid,
        user_name: r.uuid || r.user_uuid,
        file_url: r.image_url,
        image_url: r.image_url,
        status: r.status === "قيد الانتظار" ? "pending" : r.status === "مقبول" ? "approved" : r.status === "مرفوض" ? "rejected" : (r.status || "pending"),
        created_at: r.created_at,
      }));
    } catch { return []; }
  };

  const loadAllCounts = async () => {
    const actionMap: Record<Exclude<ReqTab, "rooms">, string> = {
      entries: "list_entry_requests", frames: "list_frame_claims",
      hairs: "list_hair_selections", animated: "list_animated_photos", custom: "list_custom_gifts",
    };
    try {
      const [supaResults, roomRequests] = await Promise.all([
        Promise.allSettled(
          (Object.keys(actionMap) as Exclude<ReqTab, "rooms">[]).map(async (key) => {
            const data = await adminCall(actionMap[key]);
            return { key, count: (data || []).filter((i: any) => i.status === "pending").length };
          })
        ),
        fetchRoomRequests(),
      ]);
      const counts: PendingCounts = { entries: 0, frames: 0, hairs: 0, animated: 0, custom: 0, rooms: 0 };
      supaResults.forEach(r => { if (r.status === "fulfilled") counts[r.value.key] = r.value.count; });
      counts.rooms = roomRequests.filter((i: any) => i.status === "pending").length;
      setPendingCounts(counts);
    } catch { /* silent */ }
  };

  const loadData = async () => {
    setLoading(true);
    setRemovedIds(new Set());
    try {
      if (activeTab === "rooms") {
        const data = await fetchRoomRequests();
        setItems(data || []);
        setPendingCounts(prev => ({ ...prev, rooms: (data || []).filter((i: any) => i.status === "pending").length }));
      } else {
        const actionMap: Record<Exclude<ReqTab, "rooms">, string> = {
          entries: "list_entry_requests", frames: "list_frame_claims",
          hairs: "list_hair_selections", animated: "list_animated_photos", custom: "list_custom_gifts",
        };
        const data = await adminCall(actionMap[activeTab as Exclude<ReqTab, "rooms">]);
        setItems(data || []);
        setPendingCounts(prev => ({ ...prev, [activeTab]: (data || []).filter((i: any) => i.status === "pending").length }));
      }
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
  const GALA_API = "https://galachat.site/project-z/api.php";
  const ADMIN_KEY = "ghala2026owner";

  // Helper to call wares-api through edge function proxy
  const callWaresApi = async (action: string, params: Record<string, string>) => {
    const { data, error } = await supabase.functions.invoke("wares-request", {
      body: { action, ...params },
    });
    if (error) throw error;
    return data;
  };

  const autoUploadToGala = async (item: any, type: ReqTab) => {
    try {
      if (type === "animated") {
        // Only update_user_avatar — nothing else
        const gifUrl = item.gif_url || item.details?.gif_url;
        if (!gifUrl) return;
        const res = await fetch(GALA_API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "update_user_avatar", admin_key: ADMIN_KEY, uuid: item.user_uuid, avatar_url: gifUrl }) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الصورة لغلا لايف"); else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }

      } else if (type === "custom") {
        // Only upload_custom_gift — nothing else
        let thumbnailUrl = item.thumbnail_url || "";
        if (!thumbnailUrl && item.video_url) {
          thumbnailUrl = await captureThumbnailUrl(item.video_url, item.id);
        }
        const res = await fetch(GALA_API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "upload_custom_gift", admin_key: ADMIN_KEY, user_name: item.user_name || item.title || "", video_url: item.video_url || "", thumbnail_url: thumbnailUrl, price: "20000" }) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الهدية لغلا لايف"); else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }

      } else if (type === "entries" || type === "frames") {
        const fileUrl = item.file_url || item.animation_url || item.details?.file_url;
        if (!fileUrl || !item.user_uuid) return;

        const targetUuid = item.friend_uuid || item.user_uuid;
        const wareType = item.ware_type || (type === "frames" ? "frame" : "entry_profile");
        const ext = (fileUrl.split(".").pop() || "").toLowerCase().split("?")[0];
        const imageType = ext === "svga" ? "svga" : (ext === "webp" || ext === "png") ? "alpha" : "mp4";

        // Step 1: Submit request (downloads file to server)
        const submitRes = await callWaresApi("submit-request", {
          uuid: targetUuid,
          user_name: item.title || item.user_name || (type === "frames" ? "إطار" : "دخولية"),
          ware_type: wareType,
          image_type: imageType,
          file_url: fileUrl,
          days: String(item.duration_days || 30),
        });

        const requestId = submitRes.data?.request_id || submitRes.request_id;
        if (!requestId) {
          toast.warning("تم القبول — لكن الرفع لغلا لايف فشل.");
          console.error("Submit-request failed:", submitRes);
          return;
        }

        // Step 2: Approve (uploads to dashboard + assigns to user)
        const approveRes = await callWaresApi("approve", {
          id: String(requestId),
          ware_type: wareType,
        });

        if (approveRes.ok || approveRes.success) {
          toast.success(`تم رفع ${type === "frames" ? "الإطار" : "الدخولية"} لغلا لايف`);
        } else {
          toast.warning("تم القبول — لكن الرفع لغلا لايف فشل.");
          console.error("Approve failed:", approveRes);
        }

      } else if (type === "rooms") {
        const imageUrl = item.image_url || item.file_url || item.details?.image_url;
        if (!imageUrl || !item.user_uuid) return;
        const data = await callWaresApi("upload-room-background", {
          uuid: item.user_uuid,
          image_url: imageUrl,
        });
        // Also call hola-chat direct endpoint
        try {
          await fetch("https://hola-chat.com/wares-api.php?key=ghala2026actions&action=upload-room-background&uuid=" + item.user_uuid + "&image_url=" + encodeURIComponent(imageUrl));
        } catch { /* silent fallback */ }
        if (data.ok || data.success) toast.success("تم تغيير خلفية الغرفة"); else { toast.warning("تم القبول — تغيير الخلفية فشل."); console.error("Room bg upload failed:", data); }

      } else if (type === "hairs") {
        // Hairs still use upload_ware (badge type)
        const fileUrl = item.file_url || item.details?.file_url;
        if (!fileUrl || !item.user_uuid) return;
        const thumbnailUrl = await captureThumbnailUrl(fileUrl, item.id);
        const params: Record<string, string> = { action: "upload_ware", admin_key: ADMIN_KEY, ware_type: "badge", name: item.title || "شعار", file_url: fileUrl, uuid: item.user_uuid, file_format: "svga", expire: "30" };
        if (thumbnailUrl) params.show_img = thumbnailUrl;
        const res = await fetch(GALA_API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
        const data = await res.json();
        if (data.success) toast.success("تم رفع الشعار لغلا لايف"); else { toast.warning("تم القبول — الرفع التلقائي فشل."); console.error("Auto-upload failed:", data); }
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
      if (activeTab === "rooms") {
        // Use external API for rooms
        const endpoint = isApprove ? "approve-room-bg" : "reject-room-bg";
        const res = await fetch(`${HOLA_API}?key=${HOLA_KEY}&action=${endpoint}&id=${id}`);
        const result = await res.json();
        if (!result.ok && !result.success) throw new Error(result.error || "فشلت العملية");
        // Also upload to gala if approving
        if (isApprove && item) {
          const imageUrl = item.image_url || item.file_url;
          if (imageUrl && item.user_uuid) {
            try {
              await fetch(`${HOLA_API}?key=${HOLA_KEY}&action=upload-room-background&uuid=${item.user_uuid}&image_url=${encodeURIComponent(imageUrl)}`);
            } catch { /* silent */ }
          }
        }
      } else {
        await adminCall(action, { id, ...extra });
        if (isApprove && item) await autoUploadToGala(item, activeTab);
      }

      if (item?.user_uuid) {
        const typeMap: Record<ReqTab, { approveTitle: string; approveBody: string; rejectTitle: string; rejectBody: string }> = {
          entries: { approveTitle: "تم قبول طلب الدخولية", approveBody: `تم تفعيل الدخولية "${item.title || ''}" على حسابك!`, rejectTitle: "تم رفض طلب الدخولية", rejectBody: "للأسف تم رفض طلب الدخولية الخاص بك." },
          frames: { approveTitle: "تم قبول طلب الإطار", approveBody: `تم تفعيل الإطار "${item.title || ''}" على حسابك!`, rejectTitle: "تم رفض طلب الإطار", rejectBody: "للأسف تم رفض طلب الإطار الخاص بك." },
          hairs: { approveTitle: "تم قبول الشعار", approveBody: "تم تفعيل الشعار المختار على ملفك الشخصي!", rejectTitle: "تم رفض الشعار", rejectBody: "للأسف تم رفض طلب الشعار الخاص بك." },
          animated: { approveTitle: "تم قبول الصورة المتحركة", approveBody: "تم تفعيل صورتك المتحركة على ملفك الشخصي!", rejectTitle: "تم رفض الصورة المتحركة", rejectBody: "تم رفض الصورة المتحركة. تواصل مع الدعم لمزيد من المعلومات." },
          custom: { approveTitle: "تم قبول الهدية المخصصة", approveBody: `تم رفع هديتك "${item.title || ''}" وأصبحت متاحة لجميع المستخدمين!`, rejectTitle: "تم رفض الهدية المخصصة", rejectBody: "للأسف تم رفض الهدية المخصصة. تأكد من استيفاء الشروط." },
          rooms: { approveTitle: "تم قبول خلفية الغرفة", approveBody: "تم تغيير خلفية غرفتك بنجاح!", rejectTitle: "تم رفض خلفية الغرفة", rejectBody: "للأسف تم رفض طلب تغيير خلفية الغرفة." },
        };
        const msgs = typeMap[activeTab];
        if (msgs) await sendUserNotification(item.user_uuid, isApprove ? msgs.approveTitle : msgs.rejectTitle, isApprove ? msgs.approveBody : msgs.rejectBody);
      }

      toast.dismiss(loadingToast);
      toast.success(isApprove ? "تم القبول بنجاح" : "تم الرفض");
      setRemovedIds(prev => new Set(prev).add(id));
      setPendingCounts(prev => ({ ...prev, [activeTab]: Math.max(0, prev[activeTab] - 1) }));
      setShakenTab(activeTab);
      setTimeout(() => setShakenTab(null), 600);
      setTimeout(() => loadData(), 500);
    } catch (err: any) { toast.dismiss(loadingToast); toast.error(err?.message || "فشلت العملية"); }
    finally { setProcessingId(null); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success("تم النسخ"); };

  const currentTab = tabs.find(t => t.key === activeTab)!;
  const visibleItems = items.filter(i => !removedIds.has(i.id));
  const pendingItems = visibleItems.filter((i: any) => i.status === "pending");
  const approvedItems = visibleItems.filter((i: any) => i.status === "approved");
  const rejectedItems = visibleItems.filter((i: any) => i.status === "rejected");
  const filteredItems = statusFilter === "pending" ? pendingItems : statusFilter === "approved" ? approvedItems : rejectedItems;

  // Get the preview URL for any item
  const getPreviewUrl = (item: any) => item.file_url || item.video_url || item.gif_url || item.thumbnail_url || item.image_url || null;
  const getThumbnail = (item: any) => item.thumbnail_url || item.gif_url || item.image_url || null;

  // Render the visual media preview
  const renderMediaPreview = (item: any, size: "grid" | "full" = "grid") => {
    // Rooms: always show image_url as <img>
    if (activeTab === "rooms" && item.image_url) {
      return <img src={item.image_url} alt="خلفية" className="w-full h-full object-contain" />;
    }
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
    rooms: "approve_room_background",
  };
  const rejectAction: Record<ReqTab, string> = {
    entries: "reject_entry_request", frames: "reject_frame_claim",
    hairs: "reject_hair_selection", animated: "reject_animated_photo", custom: "reject_custom_gift",
    rooms: "reject_room_background",
  };

  // Visual card like user pages
  const renderVisualCard = (item: any, i: number) => {
    const isPending = item.status === "pending";
    const isProcessing = processingId === item.id;
    const statusColor = item.status === "approved" ? "hsl(160 84% 39%)" : item.status === "rejected" ? "hsl(350 89% 55%)" : "hsl(40 96% 53%)";
    const statusLabel = item.status === "approved" ? "مقبول" : item.status === "rejected" ? "مرفوض" : "معلّق";
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
        <div className="relative w-full aspect-[16/9] bg-black/40">
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
                إهداء
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

        {/* Status sub-tabs */}
        <div className="flex items-center gap-2 rounded-xl p-1"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            { key: "pending" as const, label: "معلّقة", icon: Clock, color: "hsl(40 96% 53%)", count: pendingItems.length },
            { key: "approved" as const, label: "مقبولة", icon: CheckCircle, color: "hsl(160 84% 39%)", count: approvedItems.length },
            { key: "rejected" as const, label: "مرفوضة", icon: XCircle, color: "hsl(350 89% 55%)", count: rejectedItems.length },
          ]).map(st => {
            const StIcon = st.icon;
            const isActive = statusFilter === st.key;
            return (
              <button key={st.key} onClick={() => setStatusFilter(st.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all"
                style={isActive ? { background: `${st.color}15`, color: st.color, boxShadow: `0 2px 8px ${st.color}20` } : { color: 'hsl(0 0% 55%)' }}>
                <StIcon className="w-3.5 h-3.5" />
                {st.label}
                {st.count > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full text-[8px] font-bold text-white flex items-center justify-center"
                    style={{ background: st.color }}>
                    {st.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Direct upload button for rooms tab */}
        {activeTab === "rooms" && (
          <button
            onClick={() => setShowDirectUpload(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: 'hsl(187 92% 43%)' }}
          >
            <Upload className="w-4 h-4" />
            رفع مباشر
          </button>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: `${currentTab.bg}0.8)` }} />
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground">
            <currentTab.icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {statusFilter === "pending" ? "لا توجد طلبات معلّقة" : statusFilter === "approved" ? "لا توجد طلبات مقبولة" : "لا توجد طلبات مرفوضة"}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={`${activeTab}-${statusFilter}`} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
              {statusFilter === "pending" ? (
                <div className="grid grid-cols-2 gap-3">
                  <AnimatePresence>
                    {filteredItems.map((item, i) => renderVisualCard(item, i))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.slice(0, 30).map((item, i) => {
                    const isApproved = item.status === "approved";
                    const statusColor = isApproved ? "hsl(160 84% 39%)" : "hsl(350 89% 55%)";
                    const statusLabel = isApproved ? "مقبول" : "مرفوض";
                    const previewUrl = getPreviewUrl(item);

                    return (
                      <motion.div key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="rounded-xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
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

      {/* Direct Upload Modal */}
      <Dialog open={showDirectUpload} onOpenChange={setShowDirectUpload}>
        <DialogContent className="max-w-sm bg-background border-0 rounded-2xl [&>button]:hidden"
          style={{ background: 'rgba(20,20,30,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <DialogHeader>
            <DialogTitle className="text-sm text-center font-bold flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" style={{ color: 'hsl(187 92% 43%)' }} />
              رفع خلفية غرفة مباشر
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground">UUID صاحب الغرفة</label>
              <input
                type="number"
                value={directUuid}
                onChange={(e) => setDirectUuid(e.target.value)}
                placeholder="مثال: 123456"
                className="w-full h-10 rounded-xl px-3 text-sm bg-transparent outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground">صورة الخلفية</label>
              <input
                ref={directFileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setDirectFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                onClick={() => directFileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                style={{
                  background: directFile ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                  border: directFile ? '1px solid rgba(16,185,129,0.3)' : '1px dashed rgba(255,255,255,0.15)',
                  color: directFile ? 'hsl(160 84% 39%)' : 'inherit',
                }}
              >
                {directFile ? (
                  <><CheckCircle className="w-4 h-4" /> {directFile.name}</>
                ) : (
                  <><ImagePlus className="w-4 h-4 text-muted-foreground" /> اختر صورة</>
                )}
              </button>
              {directFile && (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/30 mt-2">
                  <img src={URL.createObjectURL(directFile)} alt="معاينة" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowDirectUpload(false); setDirectUuid(""); setDirectFile(null); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-foreground"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleDirectUpload}
                disabled={directUploading || !directUuid.trim() || !directFile}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ background: 'hsl(187 92% 43%)' }}
              >
                {directUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {directUploading ? "جاري الرفع..." : "حفظ"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
};

export default AdminRequestsPage;
