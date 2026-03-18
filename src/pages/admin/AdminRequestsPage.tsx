import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Frame, Scissors, Camera, Gift,
  CheckCircle, XCircle, Eye, Clock, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/sendUserNotification";

type ReqTab = "entries" | "frames" | "hairs" | "animated" | "custom";

const tabs: { key: ReqTab; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key: "entries", label: "دخوليات", icon: Sparkles, color: "text-admin-amber", bg: "rgba(245,158,11," },
  { key: "frames", label: "إطارات", icon: Frame, color: "text-admin-blue", bg: "rgba(59,130,246," },
  { key: "hairs", label: "شعرات", icon: Scissors, color: "text-admin-pink", bg: "rgba(236,72,153," },
  { key: "animated", label: "صور متحركة", icon: Camera, color: "text-admin-purple", bg: "rgba(139,92,246," },
  { key: "custom", label: "هدايا مخصصة", icon: Gift, color: "text-admin-emerald", bg: "rgba(16,185,129," },
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

const AdminRequestsPage: React.FC = () => {
  const { adminCall, handleLogout } = useAdminSession();
  const [activeTab, setActiveTab] = useState<ReqTab>("entries");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
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
    } catch { toast.error("فشل تحميل البيانات"); }
    finally { setLoading(false); }
  };

  const autoUploadToGala = async (item: any, type: "animated" | "custom") => {
    try {
      if (type === "animated") {
        const gifUrl = item.gif_url || item.details?.gif_url;
        if (!gifUrl) return;
        const res = await fetch("https://galachat.site/project-z/api.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "update_user_avatar",
            admin_key: "ghala2026owner",
            uuid: item.user_uuid,
            avatar_url: gifUrl,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("تم رفع الصورة لغلا لايف تلقائياً ✅");
        } else {
          toast.warning("تم القبول — لكن الرفع التلقائي فشل. ارفعها يدوياً.");
          console.error("Auto-upload failed:", data);
        }
      } else {
        const res = await fetch("https://galachat.site/project-z/api.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "upload_custom_gift",
            admin_key: "ghala2026owner",
            user_uuid: item.user_uuid,
            user_name: item.user_name || item.title || "",
            video_url: item.video_url || "",
            thumbnail_url: item.thumbnail_url || "",
            price: "20000",
            gift_type: "special",
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("تم رفع الهدية لغلا لايف تلقائياً ✅");
        } else {
          toast.warning("تم القبول — لكن الرفع التلقائي فشل. ارفعها يدوياً.");
          console.error("Auto-upload failed:", data);
        }
      }
    } catch (err) {
      toast.warning("تم القبول — لكن الرفع التلقائي فشل.");
      console.error("Auto-upload error:", err);
    }
  };

  const handleAction = async (action: string, id: string, extra?: any) => {
    if (processingId) return; // prevent double-click
    setProcessingId(id);
    const item = items.find((i: any) => i.id === id);
    try {
      await adminCall(action, { id, ...extra });

      const isApprove = action.startsWith("approve_");

      // Auto-upload on approval
      if (isApprove && item) {
        if (activeTab === "animated") await autoUploadToGala(item, "animated");
        if (activeTab === "custom") await autoUploadToGala(item, "custom");
      }
      
      // Send notification to user
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
          await sendUserNotification(
            item.user_uuid,
            isApprove ? msgs.approveTitle : msgs.rejectTitle,
            isApprove ? msgs.approveBody : msgs.rejectBody
          );
        }
      }
      
      toast.success("تم التنفيذ");
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل"); }
  };

  const currentTab = tabs.find(t => t.key === activeTab)!;
  const pendingItems = items.filter((i: any) => i.status === "pending");
  const otherItems = items.filter((i: any) => i.status !== "pending");

  const getActionButtons = (item: any) => {
    const approveAction: Record<ReqTab, string> = {
      entries: "approve_entry_request",
      frames: "approve_frame_claim",
      hairs: "approve_hair_selection",
      animated: "approve_animated_photo",
      custom: "approve_custom_gift",
    };
    const rejectAction: Record<ReqTab, string> = {
      entries: "reject_entry_request",
      frames: "reject_frame_claim",
      hairs: "reject_hair_selection",
      animated: "reject_animated_photo",
      custom: "reject_custom_gift",
    };

    if (item.status !== "pending") return null;
    return (
      <div className="flex gap-2 mt-3">
        <motion.button whileTap={{ scale: 0.92 }}
          onClick={() => handleAction(approveAction[activeTab], item.id)}
          className="flex-1 h-9 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5"
          style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
          <CheckCircle className="w-3.5 h-3.5" /> قبول
        </motion.button>
        <motion.button whileTap={{ scale: 0.92 }}
          onClick={() => handleAction(rejectAction[activeTab], item.id)}
          className="flex-1 h-9 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5"
          style={{ background: 'linear-gradient(135deg, hsl(350 89% 60%), hsl(350 89% 50%))', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>
          <XCircle className="w-3.5 h-3.5" /> رفض
        </motion.button>
      </div>
    );
  };

  const renderItemCard = (item: any, i: number) => {
    const badge = statusBadge(item.status);
    const BadgeIcon = badge.icon;
    return (
      <motion.div key={item.id}
        initial={{ opacity: 0, y: 15, rotateX: 5 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay: i * 0.03, duration: 0.35 }}
        className="rounded-2xl p-4"
        style={{ ...glassCard, background: `linear-gradient(145deg, ${currentTab.bg}0.05), rgba(255,255,255,0.02))` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{item.user_name || item.title || "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate tabular-nums">
              {item.user_uuid || item.id}
            </p>
            {item.title && item.user_name && (
              <p className="text-[11px] text-muted-foreground mt-1">{item.title}</p>
            )}
            {item.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            )}
            {item.duration_label && (
              <p className="text-[10px] mt-1 opacity-70">المدة: {item.duration_label}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
            <span className="px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1"
              style={{ background: badge.bg }}>
              <BadgeIcon className={`w-3 h-3 ${badge.color}`} />
              <span className={badge.color}>{badge.label}</span>
            </span>
          </div>
        </div>

        {/* Preview thumbnail/image */}
        {(item.gif_url || item.thumbnail_url || item.video_url) && (
          <div className="mt-3 rounded-xl overflow-hidden h-20 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.2)' }}>
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

  return (
    <AdminPageLayout title="الطلبات" accentColor="hsl(217 91% 60%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        {/* Tab bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex gap-1 rounded-2xl p-1 overflow-x-auto scrollbar-hide"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <motion.button key={t.key} onClick={() => setActiveTab(t.key)} whileTap={{ scale: 0.96 }}
                className={`flex-shrink-0 py-2.5 px-3 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 ${isActive ? t.color : "text-muted-foreground"}`}
                style={isActive ? { background: `${t.bg}0.12)`, boxShadow: `0 2px 8px ${t.bg}0.15)` } : {}}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </motion.button>
            );
          })}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: `${currentTab.bg}0.8)` }} />
          </div>
        ) : items.length === 0 ? (
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
                    <span className="text-xs font-bold text-admin-amber">
                      معلّقة ({pendingItems.length})
                    </span>
                  </div>
                  {pendingItems.map((item, i) => renderItemCard(item, i))}
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
