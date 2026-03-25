import React, { useState } from "react";
import { useAdminPageLog } from "@/hooks/use-admin-page-log";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminModeratorManager from "@/components/AdminModeratorManager";
import AdminElementSettings from "@/components/AdminElementSettings";
import AdminBannerManager from "@/components/AdminBannerManager";
import { Video, ImageIcon, Settings, Star, Users, Trash2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, Save, X, Edit2, Eye, EyeOff, CheckCircle } from "lucide-react";

type SubPage = null | "videos" | "banners" | "elements" | "stars" | "moderators" | "trash";

const AdminSettingsPage: React.FC = () => {
  useAdminPageLog('/admin/settings');
  const { handleLogout, adminCall, adminSessionToken, adminUsername, uploadFile } = useAdminSession();
  const { confirm, ConfirmDialog } = useConfirmModal();
  const [activeSub, setActiveSub] = useState<SubPage>(null);

  const sections = [
    { key: "videos" as const, label: "فيديوهات تعليمية", icon: Video, color: "text-admin-pink", bg: "rgba(236,72,153,0.1)", glow: "rgba(236,72,153,0.25)" },
    { key: "banners" as const, label: "البانرات", icon: ImageIcon, color: "text-admin-teal", bg: "rgba(20,184,166,0.1)", glow: "rgba(20,184,166,0.25)" },
    { key: "elements" as const, label: "إعدادات العناصر", icon: Settings, color: "text-muted-foreground", bg: "rgba(255,255,255,0.04)", glow: "rgba(255,255,255,0.1)" },
    { key: "stars" as const, label: "إدارة النجوم", icon: Star, color: "text-admin-amber", bg: "rgba(245,158,11,0.1)", glow: "rgba(245,158,11,0.25)" },
    { key: "moderators" as const, label: "المشرفين", icon: Users, color: "text-admin-emerald", bg: "rgba(16,185,129,0.1)", glow: "rgba(16,185,129,0.25)" },
    { key: "trash" as const, label: "المحذوفات", icon: Trash2, color: "text-admin-rose", bg: "rgba(244,63,94,0.1)", glow: "rgba(244,63,94,0.25)" },
  ];

  return (
    <AdminPageLayout
      title={activeSub ? sections.find(s => s.key === activeSub)?.label || "الإعدادات" : "الإعدادات"}
      onLogout={handleLogout}
      rightContent={activeSub ? (
        <button onClick={() => setActiveSub(null)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
          <ArrowRight size={16} />
        </button>
      ) : undefined}
    >
      <div className="max-w-[448px] mx-auto p-4" dir="rtl">
        <AnimatePresence mode="wait">
          {!activeSub ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-3">
              {sections.map((section, i) => {
                const Icon = section.icon;
                return (
                  <motion.button
                    key={section.key}
                    initial={{ opacity: 0, scale: 0.8, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ y: -4, scale: 1.05 }}
                    onClick={() => setActiveSub(section.key)}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="aspect-square w-full rounded-2xl flex items-center justify-center"
                      style={{
                        background: section.bg,
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: `0 4px 16px -4px ${section.glow}`,
                      }}
                    >
                      <Icon size={28} className={section.color} />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">{section.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key={activeSub} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {activeSub === "videos" && <VideosSection adminCall={adminCall} uploadFile={uploadFile} />}
              {activeSub === "banners" && <AdminBannerManager adminSessionToken={adminSessionToken!} adminUsername={adminUsername!} readOnly={false} />}
              {activeSub === "elements" && <AdminElementSettings readOnly={false} adminUsername={adminUsername || ""} />}
              {activeSub === "stars" && <StarsSection adminCall={adminCall} />}
              {activeSub === "moderators" && <AdminModeratorManager adminCall={adminCall} />}
              {activeSub === "trash" && <TrashSection adminCall={adminCall} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

/* ─── Videos Sub-page ─── */
const VideosSection: React.FC<{ adminCall: any; uploadFile: any }> = ({ adminCall, uploadFile }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newVideo, setNewVideo] = useState({ title: "", description: "" });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); try { setVideos(await adminCall("list_videos") || []); } catch {} finally { setLoading(false); } };

  const addVideo = async () => {
    if (!newVideo.title || !videoFile) { toast.error("العنوان والملف مطلوبان"); return; }
    setUploading(true);
    try {
      const url = await uploadFile(videoFile);
      await adminCall("add_video", { title: newVideo.title, video_url: url, description: newVideo.description || null, display_order: videos.length });
      toast.success("تمت إضافة الفيديو");
      setNewVideo({ title: "", description: "" }); setVideoFile(null); setShowAdd(false);
      load();
    } catch (e: any) { toast.error(e?.message || "فشل"); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowAdd(!showAdd)} className="w-full" variant={showAdd ? "outline" : "default"}>
        {showAdd ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><Plus className="w-4 h-4 ml-2" />إضافة فيديو</>}
      </Button>
      {showAdd && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Input placeholder="عنوان الفيديو *" value={newVideo.title} onChange={e => setNewVideo({ ...newVideo, title: e.target.value })} />
          <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)}
            className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground bg-muted/20 border border-border/30 rounded-lg p-1" />
          <Input placeholder="وصف (اختياري)" value={newVideo.description} onChange={e => setNewVideo({ ...newVideo, description: e.target.value })} />
          <Button onClick={addVideo} disabled={uploading} className="w-full">
            {uploading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}حفظ
          </Button>
        </div>
      )}
      {videos.map(video => (
        <div key={video.id} className={`rounded-2xl p-4 space-y-2 ${!video.is_active ? "opacity-50" : ""}`}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">{video.title}</h3>
            <div className="flex items-center gap-1">
              <button onClick={async () => { await adminCall("update_video", { id: video.id, is_active: !video.is_active }); load(); }} className="p-1.5 rounded-lg hover:bg-muted">
                {video.is_active ? <Eye className="w-4 h-4 text-admin-emerald" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button onClick={async () => { await adminCall("delete_video", { id: video.id }); toast.success("تم الحذف"); load(); }} className="p-1.5 rounded-lg hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
          {video.description && <p className="text-xs text-muted-foreground">{video.description}</p>}
        </div>
      ))}
      {videos.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">لا توجد فيديوهات</p>}
    </div>
  );
};

/* ─── Stars Sub-page ─── */
const StarsSection: React.FC<{ adminCall: any }> = ({ adminCall }) => {
  const [uuid, setUuid] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!uuid.trim() || !amount || parseInt(amount) <= 0) { toast.error("يرجى إدخال UUID وعدد صحيح"); return; }
    setLoading(true);
    try {
      await adminCall("admin_send_stars", { target_uuid: uuid.trim(), amount: parseInt(amount) });
      toast.success(`تم إرسال ${amount} نجمة`);
      setUuid(""); setAmount("");
    } catch (e: any) { toast.error(e?.message || "فشل"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-admin-amber" />
          <h3 className="text-sm font-bold">إرسال نجوم لمستخدم</h3>
        </div>
        <Input placeholder="UUID المستخدم" value={uuid} onChange={e => setUuid(e.target.value)} dir="ltr" className="font-mono" />
        <Input type="number" placeholder="عدد النجوم" value={amount} onChange={e => setAmount(e.target.value)} dir="ltr" />
        <Button onClick={send} disabled={loading} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Star className="w-4 h-4 ml-2" />}إرسال النجوم
        </Button>
      </div>
    </div>
  );
};

/* ─── Trash Sub-page ─── */
const TrashSection: React.FC<{ adminCall: any }> = ({ adminCall }) => {
  const { confirm: confirmDelete, ConfirmDialog: TrashConfirmDialog } = useConfirmModal();
  const [data, setData] = useState<{ videos: any[]; entries: any[]; frames: any[]; customs: any[] }>({ videos: [], entries: [], frames: [], customs: [] });
  const [loading, setLoading] = useState(true);

  React.useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); try { setData(await adminCall("list_trash") || { videos: [], entries: [], frames: [], customs: [] }); } catch {} finally { setLoading(false); } };

  if (loading) return <div className="text-center py-10"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></div>;

  const sections = [
    { key: "videos", label: "فيديوهات", items: data.videos, table: "video_tutorials" },
    { key: "entries", label: "دخوليات", items: data.entries, table: "entry_gifts" },
    { key: "frames", label: "إطارات", items: data.frames, table: "frames" },
    { key: "customs", label: "هدايا مخصصة", items: data.customs, table: "custom_gifts" },
  ];

  const totalItems = sections.reduce((s, sec) => s + sec.items.length, 0);
  if (totalItems === 0) return <p className="text-center py-10 text-muted-foreground text-sm">لا توجد عناصر محذوفة</p>;

  return (
    <>
    <div className="space-y-6">
      {sections.filter(s => s.items.length > 0).map(section => (
        <div key={section.key} className="space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
            {section.label} ({section.items.length})
          </h3>
          {section.items.map((item: any) => (
            <div key={item.id} className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">{item.title || item.user_name || "بدون عنوان"}</h4>
                <span className="text-[10px] text-muted-foreground">{item.deleted_at ? new Date(item.deleted_at).toLocaleDateString("ar-EG") : ""}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-admin-emerald border-admin-emerald/30 hover:bg-admin-emerald/10"
                  onClick={async () => { try { await adminCall("restore_item", { table: section.table, id: item.id }); toast.success("تم الاستعادة"); load(); } catch { toast.error("فشل"); } }}>
                  <CheckCircle className="w-4 h-4 ml-1" />استعادة
                </Button>
                <Button size="sm" variant="destructive" className="flex-1"
                  onClick={async () => { const ok = await confirmDelete({ title: "حذف نهائي", message: "هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع.", danger: true, confirmText: "حذف نهائي" }); if (!ok) return; try { await adminCall("permanent_delete", { table: section.table, id: item.id }); toast.success("تم"); load(); } catch { toast.error("فشل"); } }}>
                  <Trash2 className="w-4 h-4 ml-1" />حذف نهائي
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
    {TrashConfirmDialog}
    </>
  );
};

export default AdminSettingsPage;
