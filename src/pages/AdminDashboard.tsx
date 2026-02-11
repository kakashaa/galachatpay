import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Shield, LogOut, Video, Plus, Trash2, Edit2, Save, X,
  Loader2, Eye, EyeOff, Upload,
  ShieldBan, DollarSign, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Ban, Unlock, Star, Sparkles, Frame, ClipboardList, Gift,
  ArrowRight, Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";

type Tab = "videos" | "salary" | "reports" | "blocks" | "entries" | "frames" | "claims" | "gifts" | "notifications" | "all_requests" | null;

interface VideoTutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  display_order: number;
}

interface SalaryRequest {
  id: string;
  user_name: string;
  user_uuid: string;
  amount_usd: number;
  payment_method: string;
  recipient_name: string;
  recipient_country: string;
  payment_details: string;
  status: string;
  admin_note: string | null;
  transfer_image_url: string | null;
  created_at: string;
  request_type: string;
}

interface BanReport {
  id: string;
  reporter_gala_id: string;
  reported_user_id: string;
  ban_type: string;
  description: string;
  evidence_url: string;
  evidence_type: string;
  is_verified: boolean;
  reward_amount: number | null;
  reward_paid: boolean;
  admin_notes: string | null;
  created_at: string;
}

interface BlockedAccount {
  id: string;
  target_uuid: string;
  failed_attempts: number;
  block_count: number;
  blocked_until: string | null;
  is_permanently_blocked: boolean;
  admin_unblocked_at: string | null;
  updated_at: string;
}

interface EntryGift {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  gift_type: string;
  star_level: number;
  is_active: boolean;
  display_order: number;
}

interface FrameItem {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  star_level: number;
  is_active: boolean;
  display_order: number;
}

interface ClaimRecord {
  id: string;
  user_uuid: string;
  gift_id?: string;
  frame_id?: string;
  claim_type: string;
  gift_usage?: string;
  friend_uuid: string | null;
  claim_month: string;
  charger_level_at_claim: number;
  created_at: string;
}

interface StarGiftLog {
  id: string;
  sender_uuid: string;
  sender_name: string;
  recipient_uuid: string;
  amount: number;
  created_at: string;
}

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>(null);
  const [loading, setLoading] = useState(false);

  // Videos state
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [newVideo, setNewVideo] = useState({ title: "", description: "", thumbnail_url: "" });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);

  // Salary state
  const [salaryRequests, setSalaryRequests] = useState<SalaryRequest[]>([]);
  const [expandedSalary, setExpandedSalary] = useState<string | null>(null);
  const [salaryAction, setSalaryAction] = useState<{ id: string; type: "approve" | "reject" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveReceiptFile, setApproveReceiptFile] = useState<File | null>(null);
  const [salaryActionLoading, setSalaryActionLoading] = useState(false);

  // Ban reports state
  const [banReports, setBanReports] = useState<BanReport[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Blocked accounts state
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedAccount[]>([]);

  // Entry gifts state
  const [entryGifts, setEntryGifts] = useState<EntryGift[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: "", gift_type: "both", star_level: 1, thumbnail_url: "" });
  const [entryFile, setEntryFile] = useState<File | null>(null);
  const [entryUploading, setEntryUploading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editEntryData, setEditEntryData] = useState<Partial<EntryGift>>({});

  // Frames state
  const [frameItems, setFrameItems] = useState<FrameItem[]>([]);
  const [showAddFrame, setShowAddFrame] = useState(false);
  const [newFrame, setNewFrame] = useState({ title: "", star_level: 1, thumbnail_url: "" });
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [frameUploading, setFrameUploading] = useState(false);
  const [editingFrame, setEditingFrame] = useState<string | null>(null);
  const [editFrameData, setEditFrameData] = useState<Partial<FrameItem>>({});

  // Claims state
  const [entryClaims, setEntryClaims] = useState<ClaimRecord[]>([]);
  const [frameClaims, setFrameClaims] = useState<ClaimRecord[]>([]);

  // Star gifts state
  const [starGifts, setStarGifts] = useState<StarGiftLog[]>([]);

  // Notifications state
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  // Statistics state
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  // All requests state
   const [allRequestsFilter, setAllRequestsFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
   const [allRequestsSearch, setAllRequestsSearch] = useState("");
   const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
   const [allSalaryRequests, setAllSalaryRequests] = useState<SalaryRequest[]>([]);
   const [allEntryClaims, setAllEntryClaims] = useState<ClaimRecord[]>([]);
   const [allFrameClaims, setAllFrameClaims] = useState<ClaimRecord[]>([]);
   const [requestImagePreview, setRequestImagePreview] = useState<string | null>(null);

  const adminPassword = sessionStorage.getItem("admin_token");

  useEffect(() => {
    if (!adminPassword) {
      navigate("/admin");
      return;
    }
    loadData();
    if (!activeTab) loadStats();
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const [salary, reports] = await Promise.all([
        supabase.from("salary_requests").select("status"),
        supabase.from("ban_reports").select("is_verified")
      ]);
      
      const pending = (salary.data?.filter(r => r.status === "pending").length || 0) + 
                      (reports.data?.filter(r => !r.is_verified).length || 0);
      const approved = (salary.data?.filter(r => r.status === "approved").length || 0) +
                       (reports.data?.filter(r => r.is_verified).length || 0);
      const rejected = salary.data?.filter(r => r.status === "rejected").length || 0;
      
      setStats({ pending, approved, rejected });
    } catch (err) {
      console.error("فشل تحميل الإحصائيات", err);
    }
  };

  const adminCall = async (action: string, data: any = {}) => {
    const { data: result, error } = await supabase.functions.invoke("admin-manage", {
      body: { password: adminPassword, action, data },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result?.data;
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("password", adminPassword!);
    formData.append("file", file);
    const { data: uploadResult, error: uploadError } = await supabase.functions.invoke("admin-upload-video", {
      body: formData,
    });
    if (uploadError || !uploadResult?.url) throw new Error(uploadResult?.error || "فشل الرفع");
    return uploadResult.url;
  };

  const loadData = async () => {
    if (!activeTab) return;
    setLoading(true);
    try {
      switch (activeTab) {
        case "videos": setVideos(await adminCall("list_videos")); break;
        case "salary": setSalaryRequests(await adminCall("list_salary_requests")); break;
        case "reports": setBanReports(await adminCall("list_ban_reports")); break;
        case "blocks": setBlockedAccounts(await adminCall("list_blocked_accounts")); break;
        case "entries": setEntryGifts(await adminCall("list_entry_gifts")); break;
        case "frames": setFrameItems(await adminCall("list_frames")); break;
        case "claims": {
          const [ec, fc] = await Promise.all([adminCall("list_entry_claims"), adminCall("list_frame_claims")]);
          setEntryClaims(ec || []);
          setFrameClaims(fc || []);
          break;
        }
        case "gifts": {
          setStarGifts(await adminCall("list_star_gifts") || []);
          break;
        }
        case "all_requests": {
          const [sal, ec, fc] = await Promise.all([
            adminCall("list_salary_requests"),
            adminCall("list_entry_claims"),
            adminCall("list_frame_claims"),
          ]);
          setAllSalaryRequests(sal || []);
          setAllEntryClaims(ec || []);
          setAllFrameClaims(fc || []);
          break;
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    navigate("/admin");
  };

  // Video actions
  const addVideo = async () => {
    if (!newVideo.title || !videoFile) { toast.error("العنوان وملف الفيديو مطلوبان"); return; }
    if (videoFile.size > 100 * 1024 * 1024) { toast.error("حجم الفيديو يجب أن لا يتجاوز 100MB"); return; }
    try {
      setUploadProgress(true);
      const url = await uploadFile(videoFile);
      await adminCall("add_video", { title: newVideo.title, video_url: url, description: newVideo.description || null, thumbnail_url: newVideo.thumbnail_url || null, display_order: videos.length });
      toast.success("تمت إضافة الفيديو");
      setNewVideo({ title: "", description: "", thumbnail_url: "" }); setVideoFile(null); setShowAddVideo(false);
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل إضافة الفيديو"); }
    finally { setUploadProgress(false); }
  };

  const updateVideo = async (video: VideoTutorial) => {
    try { await adminCall("update_video", video); toast.success("تم التحديث"); setEditingVideo(null); loadData(); }
    catch { toast.error("فشل التحديث"); }
  };

  const deleteVideo = async (id: string) => {
    try { await adminCall("delete_video", { id }); toast.success("تم الحذف"); loadData(); }
    catch { toast.error("فشل الحذف"); }
  };

  const toggleVideoActive = async (video: VideoTutorial) => {
    try { await adminCall("update_video", { id: video.id, is_active: !video.is_active }); toast.success(video.is_active ? "تم إخفاء الفيديو" : "تم تفعيل الفيديو"); loadData(); }
    catch { toast.error("فشل التحديث"); }
  };

  // Salary actions
  const handleApproveWithReceipt = async (id: string) => {
    if (!approveReceiptFile) { toast.error("يرجى رفع صورة الإيصال"); return; }
    setSalaryActionLoading(true);
    try {
      const receiptUrl = await uploadFile(approveReceiptFile);
      const request = salaryRequests.find(r => r.id === id);
      await adminCall("update_salary_request", { id, status: "approved", transfer_image_url: receiptUrl });
      
      // إضافة إشعار للمستخدم
      if (request) {
        await supabase.from("notifications").insert({
          user_uuid: request.user_uuid,
          title: "✅ تم قبول طلبك",
          body: `تم قبول طلب سحب ${request.amount_usd}$ بنجاح. سيتم تحويل المبلغ إلى حسابك قريباً.`,
          target: "personal"
        });
      }
      
      toast.success("تم قبول الطلب ورفع الإيصال");
      setSalaryAction(null); setApproveReceiptFile(null);
      loadData();
    } catch { toast.error("فشل التحديث"); }
    finally { setSalaryActionLoading(false); }
  };

  const handleRejectWithReason = async (id: string) => {
    if (!rejectReason.trim()) { toast.error("يرجى كتابة سبب الرفض"); return; }
    setSalaryActionLoading(true);
    try {
      const request = salaryRequests.find(r => r.id === id);
      await adminCall("update_salary_request", { id, status: "rejected", admin_note: rejectReason.trim() });
      
      // إضافة إشعار للمستخدم
      if (request) {
        await supabase.from("notifications").insert({
          user_uuid: request.user_uuid,
          title: "❌ تم رفض طلبك",
          body: `للأسف، تم رفض طلبك. السبب: ${rejectReason.trim()}\n\nيمكنك إعادة إرسال الطلب مع التعديلات المطلوبة.`,
          target: "personal"
        });
      }
      
      toast.success("تم رفض الطلب");
      setSalaryAction(null); setRejectReason("");
      loadData();
    } catch { toast.error("فشل التحديث"); }
    finally { setSalaryActionLoading(false); }
  };

  // Broadcast notification action
  const sendBroadcastNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      toast.error("يرجى ملء العنوان والمحتوى");
      return;
    }
    setSendingNotification(true);
    try {
      await supabase.from("notifications").insert({
        title: notificationTitle,
        body: notificationBody,
        target: "all"
      });
      toast.success("تم إرسال الإشعار لجميع المستخدمين");
      setNotificationTitle("");
      setNotificationBody("");
    } catch {
      toast.error("فشل إرسال الإشعار");
    } finally {
      setSendingNotification(false);
    }
  };
  const updateBanReport = async (id: string, updates: Partial<BanReport>) => {
    try { await adminCall("update_ban_report", { id, ...updates }); toast.success("تم التحديث"); loadData(); }
    catch { toast.error("فشل التحديث"); }
  };

  const unblockAccount = async (targetUuid: string) => {
    try { await adminCall("unblock_account", { target_uuid: targetUuid }); toast.success("تم فك الحظر عن الحساب"); loadData(); }
    catch { toast.error("فشل فك الحظر"); }
  };

  // Entry gift actions
  const addEntryGift = async () => {
    if (!entryFile) { toast.error("الملف مطلوب"); return; }
    if (entryFile.size > 100 * 1024 * 1024) { toast.error("حجم الملف يجب أن لا يتجاوز 100MB"); return; }
    try {
      setEntryUploading(true);
      const url = await uploadFile(entryFile);
      await adminCall("add_entry_gift", { title: newEntry.title || entryFile.name.replace(/\.[^.]+$/, ""), video_url: url, thumbnail_url: newEntry.thumbnail_url || null, gift_type: newEntry.gift_type, star_level: newEntry.star_level, display_order: entryGifts.length });
      toast.success("تمت إضافة الدخولية");
      setNewEntry({ title: "", gift_type: "both", star_level: 1, thumbnail_url: "" }); setEntryFile(null); setShowAddEntry(false);
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل الإضافة"); }
    finally { setEntryUploading(false); }
  };

  const deleteEntryGift = async (id: string) => {
    try { await adminCall("delete_entry_gift", { id }); toast.success("تم الحذف"); loadData(); }
    catch { toast.error("فشل الحذف"); }
  };

  const toggleEntryActive = async (gift: EntryGift) => {
    try { await adminCall("update_entry_gift", { id: gift.id, is_active: !gift.is_active }); toast.success(gift.is_active ? "تم الإخفاء" : "تم التفعيل"); loadData(); }
    catch { toast.error("فشل التحديث"); }
  };

  const saveEntryEdit = async () => {
    if (!editingEntry) return;
    try { await adminCall("update_entry_gift", { id: editingEntry, ...editEntryData }); toast.success("تم التحديث"); setEditingEntry(null); loadData(); }
    catch { toast.error("فشل التحديث"); }
  };

  // Frame actions
  const addFrame = async () => {
    if (!frameFile) { toast.error("الملف مطلوب"); return; }
    if (frameFile.size > 100 * 1024 * 1024) { toast.error("حجم الملف يجب أن لا يتجاوز 100MB"); return; }
    try {
      setFrameUploading(true);
      const url = await uploadFile(frameFile);
      await adminCall("add_frame", { title: newFrame.title || frameFile.name.replace(/\.[^.]+$/, ""), file_url: url, thumbnail_url: newFrame.thumbnail_url || null, star_level: newFrame.star_level, display_order: frameItems.length });
      toast.success("تمت إضافة الإطار");
      setNewFrame({ title: "", star_level: 1, thumbnail_url: "" }); setFrameFile(null); setShowAddFrame(false);
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل الإضافة"); }
    finally { setFrameUploading(false); }
  };

  const deleteFrame = async (id: string) => {
    try { await adminCall("delete_frame", { id }); toast.success("تم الحذف"); loadData(); }
    catch { toast.error("فشل الحذف"); }
  };

  const toggleFrameActive = async (frame: FrameItem) => {
    try { await adminCall("update_frame", { id: frame.id, is_active: !frame.is_active }); toast.success(frame.is_active ? "تم الإخفاء" : "تم التفعيل"); loadData(); }
    catch { toast.error("فشل التحديث"); }
  };

  const saveFrameEdit = async () => {
    if (!editingFrame) return;
    try { await adminCall("update_frame", { id: editingFrame, ...editFrameData }); toast.success("تم التحديث"); setEditingFrame(null); loadData(); }
    catch { toast.error("فشل التحديث"); }
  };

  const renderStars = (level: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: level }).map((_, i) => (
        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      ))}
    </div>
  );

  const tabs: { key: Exclude<Tab, null>; label: string; icon: React.ReactNode; color: string; count?: number }[] = [
    { key: "all_requests", label: "جميع الطلبات", icon: <ClipboardList className="w-7 h-7" />, color: "from-indigo-500/20 to-indigo-600/10 text-indigo-400", count: allSalaryRequests.filter(r => r.status === "pending").length + allEntryClaims.length + allFrameClaims.length },
    { key: "entries", label: "دخوليات", icon: <Sparkles className="w-7 h-7" />, color: "from-purple-500/20 to-purple-600/10 text-purple-400" },
    { key: "frames", label: "إطارات", icon: <Frame className="w-7 h-7" />, color: "from-blue-500/20 to-blue-600/10 text-blue-400" },
    { key: "gifts", label: "إهداءات نجوم", icon: <Gift className="w-7 h-7" />, color: "from-yellow-500/20 to-yellow-600/10 text-yellow-400" },
    { key: "salary", label: "رواتب", icon: <DollarSign className="w-7 h-7" />, color: "from-green-500/20 to-green-600/10 text-green-400", count: salaryRequests.filter(r => r.status === "pending").length },
    { key: "claims", label: "طلبات", icon: <ClipboardList className="w-7 h-7" />, color: "from-orange-500/20 to-orange-600/10 text-orange-400", count: entryClaims.length + frameClaims.length },
    { key: "videos", label: "فيديوهات", icon: <Video className="w-7 h-7" />, color: "from-pink-500/20 to-pink-600/10 text-pink-400" },
    { key: "reports", label: "بلاغات", icon: <ShieldBan className="w-7 h-7" />, color: "from-red-500/20 to-red-600/10 text-red-400", count: banReports.filter(r => !r.is_verified).length },
    { key: "blocks", label: "محظورين", icon: <Ban className="w-7 h-7" />, color: "from-rose-500/20 to-rose-600/10 text-rose-400", count: blockedAccounts.filter(b => b.is_permanently_blocked).length },
    { key: "notifications", label: "إشعارات", icon: <Bell className="w-7 h-7" />, color: "from-cyan-500/20 to-cyan-600/10 text-cyan-400" },
  ];

  // Reusable item card for entries/frames with edit
  const renderMediaCard = (
    item: { id: string; title: string; star_level: number; is_active: boolean; [key: string]: any },
    type: "entry" | "frame"
  ) => {
    const isEditing = type === "entry" ? editingEntry === item.id : editingFrame === item.id;
    const editData = type === "entry" ? editEntryData : editFrameData;
    const setEditData = type === "entry" ? setEditEntryData : setEditFrameData;
    const startEdit = () => {
      if (type === "entry") { setEditingEntry(item.id); setEditEntryData({ title: item.title, star_level: item.star_level, gift_type: item.gift_type }); }
      else { setEditingFrame(item.id); setEditFrameData({ title: item.title, star_level: item.star_level }); }
    };
    const cancelEdit = () => { if (type === "entry") setEditingEntry(null); else setEditingFrame(null); };
    const save = type === "entry" ? saveEntryEdit : saveFrameEdit;
    const toggleActive = type === "entry" ? () => toggleEntryActive(item as EntryGift) : () => toggleFrameActive(item as FrameItem);
    const handleDelete = type === "entry" ? () => deleteEntryGift(item.id) : () => deleteFrame(item.id);

    return (
      <div key={item.id} className={`bg-card border rounded-xl p-4 space-y-2 ${!item.is_active ? "opacity-50" : ""}`}>
        {isEditing ? (
          <div className="space-y-2">
            <Input value={(editData as any).title || ""} onChange={(e) => setEditData({ ...editData, title: e.target.value })} placeholder="الاسم" />
            <div className="flex gap-2">
              {[1, 2, 3].map((lvl) => (
                <button key={lvl} onClick={() => setEditData({ ...editData, star_level: lvl })}
                  className={`flex-1 py-1.5 rounded-lg border text-sm font-bold flex items-center justify-center gap-0.5 ${(editData as any).star_level === lvl ? "border-primary bg-primary/10" : "border-border/30"}`}>
                  {Array.from({ length: lvl }).map((_, i) => (<Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />))}
                </button>
              ))}
            </div>
            {type === "entry" && (
              <select value={(editData as any).gift_type || "both"} onChange={(e) => setEditData({ ...editData, gift_type: e.target.value })} className="w-full bg-muted/20 border border-border/30 rounded-lg p-2 text-sm">
                <option value="both">ملف شخصي + روم</option>
                <option value="profile">ملف شخصي فقط</option>
                <option value="room">روم فقط</option>
              </select>
            )}
            <div className="flex gap-2">
              <Button onClick={save} size="sm" className="flex-1"><Save className="w-3 h-3 ml-1" />حفظ</Button>
              <Button onClick={cancelEdit} size="sm" variant="outline" className="flex-1"><X className="w-3 h-3 ml-1" />إلغاء</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">{item.title}</h3>
                {renderStars(item.star_level)}
              </div>
              <div className="flex items-center gap-1">
                {type === "entry" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {item.gift_type === "both" ? "الكل" : item.gift_type === "profile" ? "ملف" : "روم"}
                  </span>
                )}
                <button onClick={startEdit} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-primary" /></button>
                <button onClick={toggleActive} className="p-1.5 rounded-lg hover:bg-muted">
                  {item.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">{item.video_url || item.file_url}</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            {activeTab ? (
              <button onClick={() => setActiveTab(null)} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </button>
            ) : (
              <Shield className="w-6 h-6 text-primary" />
            )}
            <h1 className="font-bold text-lg">
              {activeTab ? tabs.find(t => t.key === activeTab)?.label : "لوحة التحكم"}
            </h1>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Home Grid */}
      {!activeTab && (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-3 gap-3" dir="rtl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">معلقة</div>
                <div className="text-3xl font-bold text-orange-500">{stats.pending}</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">مقبولة</div>
                <div className="text-3xl font-bold text-green-500">{stats.approved}</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">مرفوضة</div>
                <div className="text-3xl font-bold text-red-500">{stats.rejected}</div>
              </div>
            </motion.div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-3" dir="rtl">
            {tabs.map((tab) => (
              <motion.button
                key={tab.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.key)}
                className="relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-border/40 bg-card hover:border-primary/30 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tab.color} flex items-center justify-center`}>
                  {tab.icon}
                </div>
                <span className="text-xs font-bold text-foreground">{tab.label}</span>
                {tab.count && tab.count > 0 ? (
                  <span className="absolute top-2 left-2 min-w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold px-1">
                    {tab.count}
                  </span>
                ) : null}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab && (
        <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Videos Tab */}
            {activeTab === "videos" && (
              <motion.div key="videos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Button onClick={() => setShowAddVideo(!showAddVideo)} className="w-full" variant={showAddVideo ? "outline" : "default"}>
                  {showAddVideo ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><Plus className="w-4 h-4 ml-2" />إضافة فيديو</>}
                </Button>
                {showAddVideo && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-card border rounded-xl p-4 space-y-3">
                    <Input placeholder="عنوان الفيديو *" value={newVideo.title} onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })} />
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">ملف الفيديو * (حد أقصى 100MB)</label>
                      <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 bg-muted/20 border border-border/30 rounded-lg p-1" />
                      {videoFile && <p className="text-[10px] text-muted-foreground">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)</p>}
                    </div>
                    <Input placeholder="وصف (اختياري)" value={newVideo.description} onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })} />
                    <Input placeholder="رابط الصورة المصغرة (اختياري)" value={newVideo.thumbnail_url} onChange={(e) => setNewVideo({ ...newVideo, thumbnail_url: e.target.value })} dir="ltr" />
                    <Button onClick={addVideo} disabled={uploadProgress} className="w-full">
                      {uploadProgress ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الرفع...</> : <><Save className="w-4 h-4 ml-2" />حفظ</>}
                    </Button>
                  </motion.div>
                )}
                {videos.map((video) => (
                  <div key={video.id} className={`bg-card border rounded-xl p-4 space-y-2 ${!video.is_active ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">{video.title}</h3>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleVideoActive(video)} className="p-1.5 rounded-lg hover:bg-muted">
                          {video.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <button onClick={() => deleteVideo(video.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                      </div>
                    </div>
                    {video.description && <p className="text-xs text-muted-foreground">{video.description}</p>}
                    <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">{video.video_url}</p>
                  </div>
                ))}
                {videos.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><Video className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد فيديوهات</p></div>
                )}
              </motion.div>
            )}

            {/* Salary Tab */}
            {activeTab === "salary" && (
              <motion.div key="salary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {salaryRequests.map((req) => (
                  <div key={req.id} className="bg-card border rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedSalary(expandedSalary === req.id ? null : req.id)} className="w-full p-4 flex items-center justify-between text-right">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${req.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : req.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"}`}>
                          {req.status === "pending" ? "معلق" : req.status === "approved" ? "مقبول" : "مرفوض"}
                        </span>
                        <div>
                          <p className="font-bold text-sm">{req.user_name}</p>
                          <p className="text-xs text-muted-foreground">${req.amount_usd} - {req.payment_method}</p>
                        </div>
                      </div>
                      {expandedSalary === req.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSalary === req.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono">{req.user_uuid}</span></div>
                          <div><span className="text-muted-foreground">النوع:</span> {req.request_type}</div>
                          <div><span className="text-muted-foreground">المستلم:</span> {req.recipient_name}</div>
                          <div><span className="text-muted-foreground">البلد:</span> {req.recipient_country}</div>
                          <div className="col-span-2"><span className="text-muted-foreground">التفاصيل:</span> {req.payment_details}</div>
                          <div className="col-span-2"><span className="text-muted-foreground">التاريخ:</span> {new Date(req.created_at).toLocaleDateString("ar")}</div>
                        </div>
                        {req.status === "pending" && salaryAction?.id !== req.id && (
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { setSalaryAction({ id: req.id, type: "approve" }); setApproveReceiptFile(null); }}>
                              <CheckCircle className="w-4 h-4 ml-1" />قبول
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setSalaryAction({ id: req.id, type: "reject" }); setRejectReason(""); }}>
                              <XCircle className="w-4 h-4 ml-1" />رفض
                            </Button>
                          </div>
                        )}
                        {salaryAction?.id === req.id && salaryAction.type === "approve" && (
                          <div className="space-y-2 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                            <p className="text-xs font-bold text-green-500">رفع صورة إيصال التحويل</p>
                            <input type="file" accept="image/*" onChange={(e) => setApproveReceiptFile(e.target.files?.[0] || null)}
                              className="w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-green-600 file:text-white bg-muted/20 border border-border/30 rounded-lg p-1" />
                            {approveReceiptFile && <p className="text-[10px] text-muted-foreground">{approveReceiptFile.name}</p>}
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={salaryActionLoading} onClick={() => handleApproveWithReceipt(req.id)}>
                                {salaryActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 ml-1" />تأكيد القبول</>}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setSalaryAction(null)}>إلغاء</Button>
                            </div>
                          </div>
                        )}
                        {salaryAction?.id === req.id && salaryAction.type === "reject" && (
                          <div className="space-y-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                            <p className="text-xs font-bold text-destructive">سبب الرفض *</p>
                            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="اكتب سبب الرفض هنا..." className="text-sm min-h-[60px]" />
                            <div className="flex gap-2">
                              <Button size="sm" variant="destructive" className="flex-1" disabled={salaryActionLoading} onClick={() => handleRejectWithReason(req.id)}>
                                {salaryActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 ml-1" />تأكيد الرفض</>}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setSalaryAction(null)}>إلغاء</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {salaryRequests.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد طلبات رواتب</p></div>
                )}
              </motion.div>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {banReports.map((report) => (
                  <div key={report.id} className="bg-card border rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)} className="w-full p-4 flex items-center justify-between text-right">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${report.is_verified ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                          {report.is_verified ? "مؤكد" : "معلق"}
                        </span>
                        <div>
                          <p className="font-bold text-sm">{report.reported_user_id}</p>
                          <p className="text-xs text-muted-foreground">{report.ban_type}</p>
                        </div>
                      </div>
                      {expandedReport === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedReport === report.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        <div className="text-xs space-y-1">
                          <p><span className="text-muted-foreground">المُبلّغ:</span> {report.reporter_gala_id}</p>
                          <p><span className="text-muted-foreground">الوصف:</span> {report.description}</p>
                          <p><span className="text-muted-foreground">التاريخ:</span> {new Date(report.created_at).toLocaleDateString("ar")}</p>
                        </div>
                        {report.evidence_url && (
                          <a href={report.evidence_url} target="_blank" rel="noopener" className="text-xs text-primary underline">عرض الدليل</a>
                        )}
                        {!report.is_verified && (
                          <Button size="sm" className="w-full" onClick={() => updateBanReport(report.id, { is_verified: true })}>
                            <CheckCircle className="w-4 h-4 ml-1" />تأكيد البلاغ
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {banReports.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><ShieldBan className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد بلاغات</p></div>
                )}
              </motion.div>
            )}

            {/* Blocks Tab */}
            {activeTab === "blocks" && (
              <motion.div key="blocks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {blockedAccounts.map((acc) => (
                  <div key={acc.id} className="bg-card border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm font-mono">{acc.target_uuid}</p>
                        <p className="text-xs text-muted-foreground">
                          {acc.is_permanently_blocked ? "محظور دائماً" : acc.blocked_until ? `محظور حتى ${new Date(acc.blocked_until).toLocaleDateString("ar")}` : "غير محظور"}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${acc.is_permanently_blocked ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-500"}`}>
                        {acc.is_permanently_blocked ? "دائم" : "مؤقت"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">المحاولات: {acc.failed_attempts} | الحظر: {acc.block_count} مرة</div>
                    {(acc.is_permanently_blocked || acc.blocked_until) && (
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => unblockAccount(acc.target_uuid)}>
                        <Unlock className="w-4 h-4 ml-1" />فك الحظر
                      </Button>
                    )}
                  </div>
                ))}
                {blockedAccounts.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><Ban className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد حسابات محظورة</p></div>
                )}
              </motion.div>
            )}

            {/* Entries Tab */}
            {activeTab === "entries" && (
              <motion.div key="entries" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Button onClick={() => setShowAddEntry(!showAddEntry)} className="w-full" variant={showAddEntry ? "outline" : "default"}>
                  {showAddEntry ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><Plus className="w-4 h-4 ml-2" />إضافة دخولية</>}
                </Button>
                {showAddEntry && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-card border rounded-xl p-4 space-y-3">
                    <Input placeholder="اسم الدخولية (اختياري)" value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} />
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">ملف الدخولية * (MP4, WebP, SVGA - حد 100MB)</label>
                      <input type="file" accept="video/mp4,.webp,.svga,video/webm" onChange={(e) => setEntryFile(e.target.files?.[0] || null)}
                        className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 bg-muted/20 border border-border/30 rounded-lg p-1" />
                      {entryFile && <p className="text-[10px] text-muted-foreground">{entryFile.name} ({(entryFile.size / 1024 / 1024).toFixed(1)}MB)</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">نوع الدخولية</label>
                      <select value={newEntry.gift_type} onChange={(e) => setNewEntry({ ...newEntry, gift_type: e.target.value })} className="w-full bg-muted/20 border border-border/30 rounded-lg p-2 text-sm">
                        <option value="both">ملف شخصي + روم</option>
                        <option value="profile">ملف شخصي فقط</option>
                        <option value="room">روم فقط</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">مستوى النجوم</label>
                      <div className="flex gap-2">
                        {[1, 2, 3].map((lvl) => (
                          <button key={lvl} onClick={() => setNewEntry({ ...newEntry, star_level: lvl })}
                            className={`flex-1 py-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-1 ${newEntry.star_level === lvl ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"}`}>
                            {Array.from({ length: lvl }).map((_, i) => (<Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />))}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input placeholder="رابط الصورة المصغرة (اختياري)" value={newEntry.thumbnail_url} onChange={(e) => setNewEntry({ ...newEntry, thumbnail_url: e.target.value })} dir="ltr" />
                    <Button onClick={addEntryGift} disabled={entryUploading} className="w-full">
                      {entryUploading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الرفع...</> : <><Save className="w-4 h-4 ml-2" />حفظ</>}
                    </Button>
                  </motion.div>
                )}
                {entryGifts.map((gift) => renderMediaCard(gift, "entry"))}
                {entryGifts.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد دخوليات</p></div>
                )}
              </motion.div>
            )}

            {/* Frames Tab */}
            {activeTab === "frames" && (
              <motion.div key="frames" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Button onClick={() => setShowAddFrame(!showAddFrame)} className="w-full" variant={showAddFrame ? "outline" : "default"}>
                  {showAddFrame ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><Plus className="w-4 h-4 ml-2" />إضافة إطار</>}
                </Button>
                {showAddFrame && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-card border rounded-xl p-4 space-y-3">
                    <Input placeholder="اسم الإطار (اختياري)" value={newFrame.title} onChange={(e) => setNewFrame({ ...newFrame, title: e.target.value })} />
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">ملف الإطار * (SVGA, WebP - حد 100MB)</label>
                      <input type="file" accept=".svga,.webp,image/webp" onChange={(e) => setFrameFile(e.target.files?.[0] || null)}
                        className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 bg-muted/20 border border-border/30 rounded-lg p-1" />
                      {frameFile && <p className="text-[10px] text-muted-foreground">{frameFile.name} ({(frameFile.size / 1024 / 1024).toFixed(1)}MB)</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">مستوى النجوم</label>
                      <div className="flex gap-2">
                        {[1, 2, 3].map((lvl) => (
                          <button key={lvl} onClick={() => setNewFrame({ ...newFrame, star_level: lvl })}
                            className={`flex-1 py-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-1 ${newFrame.star_level === lvl ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"}`}>
                            {Array.from({ length: lvl }).map((_, i) => (<Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />))}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input placeholder="رابط الصورة المصغرة (اختياري)" value={newFrame.thumbnail_url} onChange={(e) => setNewFrame({ ...newFrame, thumbnail_url: e.target.value })} dir="ltr" />
                    <Button onClick={addFrame} disabled={frameUploading} className="w-full">
                      {frameUploading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الرفع...</> : <><Save className="w-4 h-4 ml-2" />حفظ</>}
                    </Button>
                  </motion.div>
                )}
                {frameItems.map((frame) => renderMediaCard(frame, "frame"))}
                {frameItems.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><Frame className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد إطارات</p></div>
                )}
              </motion.div>
            )}

            {/* Claims Tab */}
            {activeTab === "claims" && (
              <motion.div key="claims" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Entry Claims */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> طلبات الدخوليات ({entryClaims.length})
                  </h3>
                  {entryClaims.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد طلبات دخوليات</p>}
                  {entryClaims.map((claim) => (
                    <div key={claim.id} className="bg-card border rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500">تم</span>
                          <span className="text-xs font-bold">{claim.claim_type === "self" ? "لنفسه" : "لصديق"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(claim.created_at).toLocaleDateString("ar")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono">{claim.user_uuid}</span></div>
                        <div><span className="text-muted-foreground">الشهر:</span> {claim.claim_month}</div>
                        <div><span className="text-muted-foreground">الاستخدام:</span> {claim.gift_usage === "profile" ? "ملف شخصي" : "روم"}</div>
                        <div><span className="text-muted-foreground">لفل الشحن:</span> {claim.charger_level_at_claim}</div>
                        {claim.friend_uuid && <div className="col-span-2"><span className="text-muted-foreground">UUID الصديق:</span> <span className="font-mono">{claim.friend_uuid}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Frame Claims */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Frame className="w-4 h-4 text-primary" /> طلبات الإطارات ({frameClaims.length})
                  </h3>
                  {frameClaims.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد طلبات إطارات</p>}
                  {frameClaims.map((claim) => (
                    <div key={claim.id} className="bg-card border rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500">تم</span>
                          <span className="text-xs font-bold">{claim.claim_type === "self" ? "لنفسه" : "لصديق"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(claim.created_at).toLocaleDateString("ar")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono">{claim.user_uuid}</span></div>
                        <div><span className="text-muted-foreground">الشهر:</span> {claim.claim_month}</div>
                        <div><span className="text-muted-foreground">لفل الشحن:</span> {claim.charger_level_at_claim}</div>
                        {claim.friend_uuid && <div className="col-span-2"><span className="text-muted-foreground">UUID الصديق:</span> <span className="font-mono">{claim.friend_uuid}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Star Gifts Tab */}
            {activeTab === "gifts" && (
              <motion.div key="gifts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {starGifts.map((gift) => (
                  <div key={gift.id} className="bg-card border rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-accent">{gift.amount} ⭐</span>
                        <span className="text-xs font-bold">{gift.sender_name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(gift.created_at).toLocaleDateString("ar")}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <div><span className="text-muted-foreground">المرسل:</span> <span className="font-mono">{gift.sender_uuid}</span></div>
                      <div><span className="text-muted-foreground">المستقبل:</span> <span className="font-mono">{gift.recipient_uuid}</span></div>
                    </div>
                  </div>
                ))}
                {starGifts.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><Gift className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد عمليات إهداء</p></div>
                )}
              </motion.div>
            )}

            {/* All Requests Tab */}
            {activeTab === "all_requests" && (
              <motion.div key="all_requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Search Bar */}
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="ابحث باسم المستخدم أو UUID..."
                    value={allRequestsSearch}
                    onChange={(e) => setAllRequestsSearch(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAllRequestsFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                        allRequestsFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {f === "all" ? "الكل" : f === "pending" ? "⏳ معلقة" : f === "approved" ? "✅ مقبولة" : "❌ مرفوضة"}
                    </button>
                  ))}
                </div>

                {/* Salary Requests Section */}
                {(() => {
                  const filtered = allSalaryRequests.filter(r => allRequestsFilter === "all" || r.status === allRequestsFilter);
                  const searched = filtered.filter(r => 
                    allRequestsSearch === "" ||
                    r.user_name.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    r.user_uuid.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    r.id.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  const monthlyReqs = searched.filter(r => r.request_type === "monthly" || r.request_type === "salary");
                  const instantReqs = searched.filter(r => r.request_type === "instant" || r.request_type === "stars");
                  
                  return (
                    <>
                      {/* Monthly Salary */}
                      {monthlyReqs.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" /> راتب شهري ({monthlyReqs.length})
                          </h3>
                          {monthlyReqs.map((req) => (
                            <div key={req.id} className="bg-card border rounded-xl overflow-hidden">
                              <button onClick={() => setExpandedRequest(expandedRequest === req.id ? null : req.id)} className="w-full p-3 flex items-center justify-between text-right">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    req.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : 
                                    req.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                                  }`}>
                                    {req.status === "pending" ? "معلق" : req.status === "approved" ? "مقبول" : "مرفوض"}
                                  </span>
                                  <div>
                                    <p className="font-bold text-xs">{req.user_name}</p>
                                    <p className="text-[10px] text-muted-foreground">${req.amount_usd} - {req.payment_method}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar")}</span>
                                  {expandedRequest === req.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </button>
                              {expandedRequest === req.id && (
                                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{req.user_uuid}</span></div>
                                    <div><span className="text-muted-foreground">النوع:</span> {req.request_type}</div>
                                    <div><span className="text-muted-foreground">المستلم:</span> {req.recipient_name}</div>
                                    <div><span className="text-muted-foreground">البلد:</span> {req.recipient_country}</div>
                                    <div className="col-span-2"><span className="text-muted-foreground">التفاصيل:</span> {req.payment_details}</div>
                                  </div>
                                  
                                  {/* Transfer Image Preview */}
                                  {req.transfer_image_url && (
                                    <div className="space-y-1">
                                      <p className="text-[10px] text-muted-foreground font-bold">صورة الإيصال:</p>
                                      <img 
                                        src={req.transfer_image_url} 
                                        alt="إيصال التحويل" 
                                        className="w-full max-h-60 object-contain rounded-lg border border-border cursor-pointer"
                                        onClick={() => setRequestImagePreview(req.transfer_image_url)}
                                      />
                                    </div>
                                  )}

                                  {/* Admin Note */}
                                  {req.admin_note && (
                                    <div className="p-2 bg-muted/30 rounded-lg">
                                      <p className="text-[10px] text-muted-foreground font-bold mb-1">ملاحظة الأدمن:</p>
                                      <p className="text-xs">{req.admin_note}</p>
                                    </div>
                                  )}

                                  {/* Actions */}
                                  {req.status === "pending" && salaryAction?.id !== req.id && (
                                    <div className="flex gap-2">
                                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { setSalaryAction({ id: req.id, type: "approve" }); setApproveReceiptFile(null); }}>
                                        <CheckCircle className="w-3 h-3 ml-1" />قبول
                                      </Button>
                                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setSalaryAction({ id: req.id, type: "reject" }); setRejectReason(""); }}>
                                        <XCircle className="w-3 h-3 ml-1" />رفض
                                      </Button>
                                    </div>
                                  )}
                                  {salaryAction?.id === req.id && salaryAction.type === "approve" && (
                                    <div className="space-y-2 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                                      <p className="text-xs font-bold text-green-500">رفع صورة إيصال التحويل</p>
                                      <input type="file" accept="image/*" onChange={(e) => setApproveReceiptFile(e.target.files?.[0] || null)}
                                        className="w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-green-600 file:text-white bg-muted/20 border border-border/30 rounded-lg p-1" />
                                      {approveReceiptFile && <p className="text-[10px] text-muted-foreground">{approveReceiptFile.name}</p>}
                                      <div className="flex gap-2">
                                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={salaryActionLoading} onClick={() => handleApproveWithReceipt(req.id)}>
                                          {salaryActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-3 h-3 ml-1" />تأكيد القبول</>}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setSalaryAction(null)}>إلغاء</Button>
                                      </div>
                                    </div>
                                  )}
                                  {salaryAction?.id === req.id && salaryAction.type === "reject" && (
                                    <div className="space-y-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                                      <p className="text-xs font-bold text-destructive">سبب الرفض *</p>
                                      <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="اكتب سبب الرفض..." className="text-sm min-h-[60px]" />
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="destructive" className="flex-1" disabled={salaryActionLoading} onClick={() => handleRejectWithReason(req.id)}>
                                          {salaryActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-3 h-3 ml-1" />تأكيد الرفض</>}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setSalaryAction(null)}>إلغاء</Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Instant / Stars */}
                      {instantReqs.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500" /> فوري / نجوم ({instantReqs.length})
                          </h3>
                          {instantReqs.map((req) => (
                            <div key={req.id} className="bg-card border rounded-xl overflow-hidden">
                              <button onClick={() => setExpandedRequest(expandedRequest === req.id ? null : req.id)} className="w-full p-3 flex items-center justify-between text-right">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    req.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : 
                                    req.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                                  }`}>
                                    {req.status === "pending" ? "معلق" : req.status === "approved" ? "مقبول" : "مرفوض"}
                                  </span>
                                  <div>
                                    <p className="font-bold text-xs">{req.user_name}</p>
                                    <p className="text-[10px] text-muted-foreground">${req.amount_usd} - {req.payment_method}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar")}</span>
                                  {expandedRequest === req.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </button>
                              {expandedRequest === req.id && (
                                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{req.user_uuid}</span></div>
                                    <div><span className="text-muted-foreground">النوع:</span> {req.request_type === "stars" ? "تحويل نجوم" : "فوري"}</div>
                                    <div><span className="text-muted-foreground">المستلم:</span> {req.recipient_name}</div>
                                    <div><span className="text-muted-foreground">البلد:</span> {req.recipient_country}</div>
                                    <div className="col-span-2"><span className="text-muted-foreground">التفاصيل:</span> {req.payment_details}</div>
                                  </div>
                                  {req.transfer_image_url && (
                                    <div className="space-y-1">
                                      <p className="text-[10px] text-muted-foreground font-bold">صورة الإيصال:</p>
                                      <img src={req.transfer_image_url} alt="إيصال" className="w-full max-h-60 object-contain rounded-lg border border-border cursor-pointer" onClick={() => setRequestImagePreview(req.transfer_image_url)} />
                                    </div>
                                  )}
                                  {req.admin_note && (
                                    <div className="p-2 bg-muted/30 rounded-lg">
                                      <p className="text-[10px] text-muted-foreground font-bold mb-1">ملاحظة الأدمن:</p>
                                      <p className="text-xs">{req.admin_note}</p>
                                    </div>
                                  )}
                                  {req.status === "pending" && salaryAction?.id !== req.id && (
                                    <div className="flex gap-2">
                                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { setSalaryAction({ id: req.id, type: "approve" }); setApproveReceiptFile(null); }}>
                                        <CheckCircle className="w-3 h-3 ml-1" />قبول
                                      </Button>
                                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setSalaryAction({ id: req.id, type: "reject" }); setRejectReason(""); }}>
                                        <XCircle className="w-3 h-3 ml-1" />رفض
                                      </Button>
                                    </div>
                                  )}
                                  {salaryAction?.id === req.id && salaryAction.type === "approve" && (
                                    <div className="space-y-2 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                                      <p className="text-xs font-bold text-green-500">رفع صورة إيصال التحويل</p>
                                      <input type="file" accept="image/*" onChange={(e) => setApproveReceiptFile(e.target.files?.[0] || null)}
                                        className="w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-green-600 file:text-white bg-muted/20 border border-border/30 rounded-lg p-1" />
                                      <div className="flex gap-2">
                                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={salaryActionLoading} onClick={() => handleApproveWithReceipt(req.id)}>
                                          {salaryActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-3 h-3 ml-1" />تأكيد</>}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setSalaryAction(null)}>إلغاء</Button>
                                      </div>
                                    </div>
                                  )}
                                  {salaryAction?.id === req.id && salaryAction.type === "reject" && (
                                    <div className="space-y-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                                      <p className="text-xs font-bold text-destructive">سبب الرفض *</p>
                                      <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="اكتب سبب الرفض..." className="text-sm min-h-[60px]" />
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="destructive" className="flex-1" disabled={salaryActionLoading} onClick={() => handleRejectWithReason(req.id)}>
                                          {salaryActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-3 h-3 ml-1" />تأكيد الرفض</>}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setSalaryAction(null)}>إلغاء</Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Entry Claims Section */}
                {(() => {
                  const filtered = allEntryClaims.filter(c =>
                    allRequestsSearch === "" ||
                    c.user_uuid.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    c.id.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  return filtered.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" /> طلبات دخوليات ({filtered.length})
                      </h3>
                      {filtered.map((claim) => (
                      <div key={claim.id} className="bg-card border rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500">تم</span>
                            <span className="text-xs font-bold">{claim.claim_type === "self" ? "لنفسه" : "لصديق"}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{new Date(claim.created_at).toLocaleDateString("ar")}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{claim.user_uuid}</span></div>
                          <div><span className="text-muted-foreground">الشهر:</span> {claim.claim_month}</div>
                          <div><span className="text-muted-foreground">الاستخدام:</span> {claim.gift_usage === "profile" ? "ملف شخصي" : "روم"}</div>
                          <div><span className="text-muted-foreground">لفل:</span> {claim.charger_level_at_claim}</div>
                          {claim.friend_uuid && <div className="col-span-2"><span className="text-muted-foreground">صديق:</span> <span className="font-mono text-[10px]">{claim.friend_uuid}</span></div>}
                        </div>
                      </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Frame Claims Section */}
                {(() => {
                  const filtered = allFrameClaims.filter(c =>
                    allRequestsSearch === "" ||
                    c.user_uuid.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    c.id.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  return filtered.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Frame className="w-4 h-4 text-blue-500" /> طلبات إطارات ({filtered.length})
                      </h3>
                      {filtered.map((claim) => (
                        <div key={claim.id} className="bg-card border rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500">تم</span>
                              <span className="text-xs font-bold">{claim.claim_type === "self" ? "لنفسه" : "لصديق"}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(claim.created_at).toLocaleDateString("ar")}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{claim.user_uuid}</span></div>
                            <div><span className="text-muted-foreground">الشهر:</span> {claim.claim_month}</div>
                            <div><span className="text-muted-foreground">لفل:</span> {claim.charger_level_at_claim}</div>
                            {claim.friend_uuid && <div className="col-span-2"><span className="text-muted-foreground">صديق:</span> <span className="font-mono text-[10px]">{claim.friend_uuid}</span></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Empty State */}
                {allSalaryRequests.length === 0 && allEntryClaims.length === 0 && allFrameClaims.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد طلبات</p>
                  </div>
                )}

                {/* Image Preview Modal */}
                {requestImagePreview && (
                  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setRequestImagePreview(null)}>
                    <div className="relative max-w-lg w-full">
                      <button onClick={() => setRequestImagePreview(null)} className="absolute -top-10 right-0 text-white">
                        <X className="w-6 h-6" />
                      </button>
                      <img src={requestImagePreview} alt="معاينة" className="w-full rounded-xl" />
                    </div>
                  </div>
                )}
              </motion.div>
            )}


            {activeTab === "notifications" && (
              <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-card border rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />إرسال إشعار عام لجميع المستخدمين</h3>
                  <Input 
                    placeholder="عنوان الإشعار *" 
                    value={notificationTitle} 
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    maxLength={100}
                  />
                  <Textarea 
                    placeholder="محتوى الإشعار * (مثل: إعلان أو تحديث عن الصيانة)" 
                    value={notificationBody} 
                    onChange={(e) => setNotificationBody(e.target.value)}
                    className="min-h-[100px]"
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground">
                    {notificationTitle.length}/100 أحرف | {notificationBody.length}/500 أحرف
                  </div>
                  <Button 
                    onClick={sendBroadcastNotification} 
                    disabled={sendingNotification}
                    className="w-full"
                  >
                    {sendingNotification ? (
                      <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الإرسال...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 ml-2" />إرسال الإشعار</>
                    )}
                  </Button>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-xs text-blue-600 leading-relaxed">
                    💡 الإشعارات العامة سيتم إرسالها لجميع المستخدمين المتصلين وسيراها عند فتح صفحة الإشعارات أو عند وصول إشعار جديد.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
