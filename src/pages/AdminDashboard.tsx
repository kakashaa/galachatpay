import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Shield, LogOut, Video, Plus, Trash2, Edit2, Save, X,
  Loader2, Eye, EyeOff, Upload, Wallet,
  ShieldBan, DollarSign, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Ban, Unlock, Star, Sparkles, Frame, ClipboardList, Gift,
  ArrowRight, Bell, ScrollText, Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { Camera, Briefcase, MessageSquare, Headset, Zap } from "lucide-react";
import AdminNotificationListener from "@/components/AdminNotificationListener";
import { useSalaryRequestsRealtime } from "@/hooks/use-salary-requests-realtime";
import { useAnimatedPhotosRealtime } from "@/hooks/use-animated-photos-realtime";
import { useSupportTicketsRealtime } from "@/hooks/use-support-tickets-realtime";
import { useSupportChatSessionsRealtime } from "@/hooks/use-support-chat-sessions-realtime";
import { useBdRequestsRealtime } from "@/hooks/use-bd-requests-realtime";
import { useBdWithdrawalsRealtime } from "@/hooks/use-bd-withdrawals-realtime";

type Tab = "videos" | "salary" | "reports" | "blocks" | "entries" | "frames" | "claims" | "gifts" | "notifications" | "all_requests" | "animated_photos" | "admin_stars" | "bd_requests" | "bd_management" | "bd_withdrawals" | "trash" | "audit_log" | "support_tickets" | "support_chats" | "quick_support" | "id_changes" | null;

interface BDRequestItem {
  id: string;
  user_uuid: string;
  user_name: string;
  request_type: string;
  status: number | string; // 0=pending, 1=approved, 2=rejected
  details: {
    description?: string;
    document_url?: string;
  };
  created_at: string;
  admin_note?: string;
}

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

interface AnimatedPhotoRequest {
  id: string;
  user_name: string;
  user_uuid: string;
  gif_url: string;
  description: string | null;
  duration_label: string;
  max_level: number;
  status: string;
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
  const [salaryFilter, setSalaryFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectImageFile, setRejectImageFile] = useState<File | null>(null);
  const [isFinalRejection, setIsFinalRejection] = useState(false);
  const [animatedPhotoAction, setAnimatedPhotoAction] = useState<{ id: string; type: "approve" | "reject" } | null>(null);

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
   const [allRequestsFilter, setAllRequestsFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
   const [allRequestsSearch, setAllRequestsSearch] = useState("");
   const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
   const [allSalaryRequests, setAllSalaryRequests] = useState<SalaryRequest[]>([]);
   const [allEntryClaims, setAllEntryClaims] = useState<ClaimRecord[]>([]);
   const [allFrameClaims, setAllFrameClaims] = useState<ClaimRecord[]>([]);
   const [allAnimatedPhotos, setAllAnimatedPhotos] = useState<AnimatedPhotoRequest[]>([]);
   const [allCustomGifts, setAllCustomGifts] = useState<any[]>([]);
   const [allBdRequests, setAllBdRequests] = useState<BDRequestItem[]>([]);
   const [allQuickSupport, setAllQuickSupport] = useState<any[]>([]);
   const [allVipRequests, setAllVipRequests] = useState<any[]>([]);
   const [requestImagePreview, setRequestImagePreview] = useState<string | null>(null);

  // Animated photos state
  const [animatedPhotos, setAnimatedPhotos] = useState<AnimatedPhotoRequest[]>([]);
  const [animatedPhotoFilter, setAnimatedPhotoFilter] = useState<"all" | "approved" | "pending" | "rejected">("pending");

  // Admin stars state
  const [adminStarUuid, setAdminStarUuid] = useState("");
  const [adminStarAmount, setAdminStarAmount] = useState("");
  const [adminStarLoading, setAdminStarLoading] = useState(false);

  // BD requests state
  const [bdRequests, setBdRequests] = useState<BDRequestItem[]>([]);
  const [expandedBD, setExpandedBD] = useState<string | null>(null);
  const [bdAction, setBdAction] = useState<{ id: string; type: "approve" | "reject" } | null>(null);
  const [bdRejectReason, setBdRejectReason] = useState("");
  const [bdActionLoading, setBdActionLoading] = useState(false);
  const [bdFilter, setBdFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const adminSessionToken = sessionStorage.getItem("admin_session_token");
  const adminUsername = sessionStorage.getItem("admin_username");
  const adminRole = sessionStorage.getItem("admin_role") as "super_admin" | "admin" | null;
  const isSuperAdmin = adminRole === "super_admin";

  // Trash state
  const [trashData, setTrashData] = useState<{ videos: any[]; entries: any[]; frames: any[]; customs: any[] }>({ videos: [], entries: [], frames: [], customs: [] });

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Support state
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [ticketReply, setTicketReply] = useState<{ id: string; text: string } | null>(null);
  const [ticketReplyLoading, setTicketReplyLoading] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [chatReplyInput, setChatReplyInput] = useState("");

  // Quick support state
  const [quickSupportRequests, setQuickSupportRequests] = useState<any[]>([]);

  // ID changes state
  const [idChanges, setIdChanges] = useState<any[]>([]);

  // BD management state
  const [bdManagementList, setBdManagementList] = useState<any[]>([]);
  const [editingBdSettings, setEditingBdSettings] = useState<any>(null);
  const [bdSettingsLoading, setBdSettingsLoading] = useState(false);
  const [bdWithdrawEnabled, setBdWithdrawEnabled] = useState(true);
  const [bdWithdrawToggleLoading, setBdWithdrawToggleLoading] = useState(false);

  // Load withdraw toggle setting
  const loadWithdrawSetting = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "bd_monthly_withdraw_enabled")
      .single();
    if (data) setBdWithdrawEnabled(data.value === "true");
  }, []);

  useEffect(() => { loadWithdrawSetting(); }, [loadWithdrawSetting]);

  const toggleBdWithdraw = async () => {
    setBdWithdrawToggleLoading(true);
    const newVal = !bdWithdrawEnabled;
    const { error } = await supabase
      .from("app_settings")
      .update({ value: String(newVal), updated_at: new Date().toISOString() })
      .eq("key", "bd_monthly_withdraw_enabled");
    if (!error) {
      setBdWithdrawEnabled(newVal);
      toast.success(newVal ? "تم تفعيل السحب الشهري" : "تم إيقاف السحب الشهري");
    } else {
      toast.error("فشل تحديث الإعداد");
    }
    setBdWithdrawToggleLoading(false);
  };

  // BD withdrawals state
  const [bdWithdrawals, setBdWithdrawals] = useState<any[]>([]);
  const [bdWithdrawLoading, setBdWithdrawLoading] = useState(false);
  const [bdWithdrawFilter, setBdWithdrawFilter] = useState<"all" | "pending" | "approved" | "info_submitted" | "completed" | "rejected">("pending");
  const [transferFormId, setTransferFormId] = useState<string | null>(null);
  const [transferNumber, setTransferNumber] = useState("");
  const [transferReceiptFile, setTransferReceiptFile] = useState<File | null>(null);
  useEffect(() => {
    if (!adminSessionToken) {
      navigate("/admin");
      return;
    }
    loadData();
    if (!activeTab) loadStats();
  }, [activeTab]);

  // Auto-refresh stats every 30 seconds on home page
  useEffect(() => {
    if (activeTab || !adminSessionToken) return;
    const interval = setInterval(() => loadStats(), 30000);
    return () => clearInterval(interval);
  }, [activeTab, adminSessionToken]);

  // Realtime subscription for salary requests
  useSalaryRequestsRealtime((updatedRequest) => {
    setAllSalaryRequests((prev) =>
      prev.map((req) => (req.id === updatedRequest.id ? { ...req, ...updatedRequest } : req))
    );
    setSalaryRequests((prev) =>
      prev.map((req) => (req.id === updatedRequest.id ? { ...req, ...updatedRequest } : req))
    );
    loadStats();
  });

  // Realtime subscription for animated photos
  useAnimatedPhotosRealtime((updatedRequest) => {
    setAnimatedPhotos((prev) =>
      prev.map((photo) => (photo.id === updatedRequest.id ? { ...photo, ...updatedRequest } : photo))
    );
    loadStats();
  });

  // Realtime subscription for support tickets
  useSupportTicketsRealtime((updatedTicket) => {
    setSupportTickets((prev) =>
      prev.map((ticket) => (ticket.id === updatedTicket.id ? { ...ticket, ...updatedTicket } : ticket))
    );
    loadStats();
  });

  // Realtime subscription for support chat sessions
  useSupportChatSessionsRealtime((updatedSession) => {
    setSupportChats((prev) =>
      prev.map((chat) => (chat.id === updatedSession.id ? { ...chat, ...updatedSession } : chat))
    );
    loadStats();
  });

  // Realtime subscription for BD requests (cached from external API)
  useBdRequestsRealtime(
    (updatedRecord) => {
      setBdRequests((prev) =>
        prev.map((r) => (String(r.id) === updatedRecord.id ? { ...r, status: updatedRecord.status, admin_note: updatedRecord.admin_note } : r))
      );
      loadStats();
    },
    (newRecord) => {
      setBdRequests((prev) => {
        if (prev.some((r) => String(r.id) === newRecord.id)) return prev;
        return [{ id: newRecord.id, user_uuid: newRecord.user_uuid, user_name: newRecord.user_name, request_type: newRecord.request_type, status: newRecord.status, details: newRecord.details || {}, created_at: newRecord.created_at, admin_note: newRecord.admin_note || undefined } as BDRequestItem, ...prev];
      });
      loadStats();
    }
  );

  // Realtime subscription for BD withdrawals
  useBdWithdrawalsRealtime(
    (updatedRecord: any) => {
      setBdWithdrawals((prev: any[]) =>
        prev.map((w) => (w.id === updatedRecord.id ? { ...w, ...updatedRecord } : w))
      );
    },
    (newRecord: any) => {
      setBdWithdrawals((prev: any[]) => {
        if (prev.some((w) => w.id === newRecord.id)) return prev;
        return [newRecord, ...prev];
      });
    }
  );

  const loadStats = async () => {
    try {
      const [salary, reports, animated, customG, tickets, quickSupport, bdCache, vipReqs, bdWithdrawalsData] = await Promise.all([
        supabase.from("salary_requests").select("status"),
        supabase.from("ban_reports").select("is_verified"),
        supabase.from("animated_photo_requests").select("status"),
        supabase.from("custom_gifts").select("status").eq("is_deleted", false),
        supabase.from("support_tickets").select("status"),
        supabase.from("quick_support_requests").select("status"),
        supabase.from("bd_requests_cache").select("status"),
        supabase.from("vip_requests").select("id"),
        supabase.from("bd_withdrawals").select("id,status,bd_name,bd_uuid,amount,created_at,updated_at,recipient_name,recipient_phone,transfer_type,country,admin_note,transfer_number,receipt_url,approved_at,completed_at,rejected_at").order("created_at", { ascending: false }),
      ]);
      
      // Also update quick support requests for badge count
      setQuickSupportRequests(prev => prev.length ? prev : (quickSupport.data || []));
      
      // Update BD withdrawals state so badge count works immediately
      if (bdWithdrawalsData.data && bdWithdrawalsData.data.length > 0) {
        setBdWithdrawals(prev => prev.length > 0 ? prev : bdWithdrawalsData.data);
      }
      
      const pending = (salary.data?.filter(r => r.status === "pending").length || 0) + 
                      (reports.data?.filter(r => !r.is_verified).length || 0) +
                      (animated.data?.filter(r => r.status === "pending").length || 0) +
                      (customG.data?.filter(r => r.status === "pending").length || 0) +
                      (tickets.data?.filter(r => r.status === "open").length || 0) +
                      (quickSupport.data?.filter((r: any) => r.status === "pending").length || 0) +
                      (bdCache.data?.filter((r: any) => r.status === 0).length || 0);
      const approved = (salary.data?.filter(r => r.status === "approved").length || 0) +
                       (reports.data?.filter(r => r.is_verified).length || 0) +
                       (animated.data?.filter(r => r.status === "approved").length || 0) +
                       (customG.data?.filter(r => r.status === "approved").length || 0) +
                       (tickets.data?.filter(r => r.status === "replied" || r.status === "closed").length || 0) +
                       (quickSupport.data?.filter((r: any) => r.status === "resolved").length || 0) +
                       (bdCache.data?.filter((r: any) => r.status === 1).length || 0) +
                       (vipReqs.data?.length || 0);
      const rejected = (salary.data?.filter(r => r.status === "rejected").length || 0) +
                       (animated.data?.filter(r => r.status === "rejected").length || 0) +
                       (customG.data?.filter(r => r.status === "rejected").length || 0) +
                       (bdCache.data?.filter((r: any) => r.status === 2).length || 0);
      
      setStats({ pending, approved, rejected });
    } catch (err) {
      console.error("فشل تحميل الإحصائيات", err);
    }
  };

  const adminCall = async (action: string, data: any = {}) => {
    const { data: result, error } = await supabase.functions.invoke("admin-manage", {
      body: { username: adminUsername, session_token: adminSessionToken, action, data },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result?.data;
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("session_token", adminSessionToken!);
    formData.append("username", adminUsername!);
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
          const [sal, ec, fc, anim, customG, qs, vip] = await Promise.all([
            adminCall("list_salary_requests"),
            adminCall("list_entry_claims"),
            adminCall("list_frame_claims"),
            adminCall("list_animated_photos"),
            adminCall("list_custom_gifts"),
            supabase.from("quick_support_requests").select("*").order("created_at", { ascending: false }).then(r => r.data),
            supabase.from("vip_requests").select("*").order("created_at", { ascending: false }).then(r => r.data),
          ]);
          setAllSalaryRequests(sal || []);
          setAllEntryClaims(ec || []);
          setAllFrameClaims(fc || []);
          setAllAnimatedPhotos(anim || []);
          setAllCustomGifts(customG || []);
          setAllQuickSupport(qs || []);
          setAllVipRequests(vip || []);
          // Load BD requests from cache
          const { data: bdCacheData } = await supabase
            .from("bd_requests_cache")
            .select("*")
            .order("created_at", { ascending: false });
          setAllBdRequests((bdCacheData || []).map((r: any) => ({
            id: r.id,
            user_uuid: r.user_uuid,
            user_name: r.user_name,
            request_type: r.request_type,
            status: r.status,
            details: r.details || {},
            created_at: r.created_at,
            admin_note: r.admin_note,
          })));
          break;
        }
        case "animated_photos": {
          setAnimatedPhotos(await adminCall("list_animated_photos") || []);
          break;
        }
        case "bd_requests": {
          const { data: bdCacheList, error: bdErr } = await supabase
            .from("bd_requests_cache")
            .select("*")
            .order("created_at", { ascending: false });
          if (bdErr) {
            console.error("Failed to load BD requests:", bdErr);
            toast.error("فشل تحميل طلبات BD");
          }
          setBdRequests((bdCacheList || []).map((r: any) => ({
            id: r.id,
            user_uuid: r.user_uuid,
            user_name: r.user_name,
            request_type: r.request_type,
            status: r.status,
            details: r.details || {},
            created_at: r.created_at,
            admin_note: r.admin_note,
          })));
          break;
        }
        case "trash": {
          if (adminRole === "super_admin") {
            setTrashData(await adminCall("list_trash") || { videos: [], entries: [], frames: [], customs: [] });
          }
          break;
        }
        case "audit_log": {
          if (adminRole === "super_admin") {
            setAuditLogs(await adminCall("list_audit_log") || []);
          }
          break;
        }
        case "support_tickets": {
          const { data } = await supabase
            .from("support_tickets")
            .select("*")
            .order("created_at", { ascending: false });
          setSupportTickets(data || []);
          break;
        }
        case "support_chats": {
          const { data } = await supabase
            .from("support_chat_sessions")
            .select("*")
            .order("created_at", { ascending: false });
          setSupportChats(data || []);
          break;
        }
        case "quick_support": {
          const { data } = await supabase
            .from("quick_support_requests")
            .select("*")
            .order("created_at", { ascending: false });
          setQuickSupportRequests(data || []);
          break;
        }
        case "id_changes": {
          const { data } = await supabase
            .from("id_changes")
            .select("*")
            .order("created_at", { ascending: false });
          setIdChanges(data || []);
          break;
        }
        case "bd_management": {
          try {
            const { data: result, error } = await supabase.functions.invoke("bd-manage", {
              body: { action: "list_all_bds" },
            });
            if (!error && result?.success) setBdManagementList(result.data || []);
          } catch { setBdManagementList([]); }
          break;
        }
        case "bd_withdrawals": {
          try {
            const { data: result, error } = await supabase.functions.invoke("bd-manage", {
              body: { action: "list_bd_withdrawals" },
            });
            if (!error && result?.success) setBdWithdrawals(result.data || []);
          } catch { setBdWithdrawals([]); }
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
    sessionStorage.removeItem("admin_session_token");
    sessionStorage.removeItem("admin_username");
    sessionStorage.removeItem("admin_role");
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
      // Optimistic update: remove from pending lists
      setSalaryRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved", transfer_image_url: receiptUrl } : r));
      setAllSalaryRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved", transfer_image_url: receiptUrl } : r));
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), approved: prev.approved + 1 }));
    } catch { toast.error("فشل التحديث"); }
    finally { setSalaryActionLoading(false); }
  };

  const handleRejectWithReason = async (id: string) => {
    if (!rejectReason.trim()) { toast.error("يرجى كتابة سبب الرفض"); return; }
    setSalaryActionLoading(true);
    try {
      let rejectionImageUrl: string | null = null;
      if (rejectImageFile) {
        rejectionImageUrl = await uploadFile(rejectImageFile);
      }
      const request = salaryRequests.find(r => r.id === id);
      await adminCall("update_salary_request", { 
        id, status: "rejected", admin_note: rejectReason.trim(),
        rejection_image_url: rejectionImageUrl,
        is_final_rejection: isFinalRejection,
      });
      
      if (request) {
        await supabase.from("notifications").insert({
          user_uuid: request.user_uuid,
          title: isFinalRejection ? "⛔ رفض نهائي" : "❌ تم رفض طلبك",
          body: isFinalRejection 
            ? `تم رفض طلبك نهائياً. السبب: ${rejectReason.trim()}`
            : `تم رفض طلبك. السبب: ${rejectReason.trim()}\n\nيمكنك تعديل البيانات وإعادة الإرسال.`,
          target: "personal"
        });
      }
      
      toast.success(isFinalRejection ? "تم الرفض النهائي" : "تم رفض الطلب");
      setSalaryAction(null); setRejectReason(""); setRejectImageFile(null); setIsFinalRejection(false);
      setSalaryRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected", admin_note: rejectReason.trim() } : r));
      setAllSalaryRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected", admin_note: rejectReason.trim() } : r));
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), rejected: prev.rejected + 1 }));
    } catch { toast.error("فشل التحديث"); }
    finally { setSalaryActionLoading(false); }
  };

  // Animated photo approve/reject handlers
  const handleAnimatedPhotoApprove = async (photo: AnimatedPhotoRequest) => {
    setSalaryActionLoading(true);
    try {
      await adminCall("update_animated_photo", { id: photo.id, status: "approved" });
      await supabase.from("notifications").insert({
        user_uuid: photo.user_uuid, title: "✅ تم قبول صورتك المتحركة",
        body: "تم قبول طلب الصورة المتحركة بنجاح!", target: "personal",
      });
      toast.success("تم قبول الصورة");
      setAnimatedPhotoAction(null);
      setAnimatedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: "approved" } : p));
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), approved: prev.approved + 1 }));
    } catch { toast.error("فشل القبول"); }
    finally { setSalaryActionLoading(false); }
  };

  const handleAnimatedPhotoReject = async (photo: AnimatedPhotoRequest) => {
    if (!rejectReason.trim()) { toast.error("يرجى كتابة سبب الرفض"); return; }
    setSalaryActionLoading(true);
    try {
      let rejectionImageUrl: string | null = null;
      if (rejectImageFile) rejectionImageUrl = await uploadFile(rejectImageFile);
      await adminCall("update_animated_photo", { 
        id: photo.id, status: "rejected", admin_note: rejectReason.trim(),
        rejection_image_url: rejectionImageUrl, is_final_rejection: isFinalRejection,
      });
      await supabase.from("notifications").insert({
        user_uuid: photo.user_uuid,
        title: isFinalRejection ? "⛔ رفض نهائي" : "❌ تم رفض صورتك",
        body: `السبب: ${rejectReason.trim()}${!isFinalRejection ? "\n\nيمكنك التعديل وإعادة الإرسال." : ""}`,
        target: "personal",
      });
      toast.success("تم رفض الصورة");
      setAnimatedPhotoAction(null); setRejectReason(""); setRejectImageFile(null); setIsFinalRejection(false);
      setAnimatedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: "rejected" } : p));
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), rejected: prev.rejected + 1 }));
    } catch { toast.error("فشل الرفض"); }
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

  // Admin send stars
  const handleAdminSendStars = async () => {
    const uuid = adminStarUuid.trim();
    const amount = parseInt(adminStarAmount);
    if (!uuid || !amount || amount <= 0) {
      toast.error("يرجى إدخال UUID وعدد نجوم صحيح");
      return;
    }
    setAdminStarLoading(true);
    try {
      await adminCall("admin_send_stars", { target_uuid: uuid, amount });
      toast.success(`تم إرسال ${amount} نجمة إلى ${uuid}`);
      setAdminStarUuid("");
      setAdminStarAmount("");
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال النجوم");
    } finally {
      setAdminStarLoading(false);
    }
  };

  // BD request actions
  const handleBDApprove = async (reqItem: BDRequestItem) => {
    setBdActionLoading(true);
    try {
      // Create BD commission settings with referral code
      const referralCode = `BD${reqItem.user_uuid.slice(-6).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
      await supabase.from("bd_commission_settings").upsert({
        bd_uuid: reqItem.user_uuid,
        bd_name: reqItem.user_name,
        referral_code: referralCode,
        is_approved: true,
        agency_commission_pct: 5,
        host_commission_pct: 3,
        user_commission_pct: 2,
      }, { onConflict: "bd_uuid" });

      // Send notification
      await supabase.from("notifications").insert({
        user_uuid: reqItem.user_uuid,
        title: "✅ تم قبول طلب BD",
        body: "مبروك! تم قبول طلبك كمطور أعمال (BD). يمكنك الآن الوصول إلى لوحة BD.",
        target: "personal",
      });
      toast.success("تم قبول طلب BD");
      setBdAction(null);
      // Optimistic update
      setBdRequests(prev => prev.map(r => r.id === reqItem.id ? { ...r, status: 1 } : r));
      setAllBdRequests(prev => prev.map(r => r.id === reqItem.id ? { ...r, status: 1 } : r));
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), approved: prev.approved + 1 }));
      // Sync cache table via admin edge function (service role)
      await adminCall("update_bd_cache", { id: reqItem.id, status: 1, user_uuid: reqItem.user_uuid, user_name: reqItem.user_name, request_type: reqItem.request_type, details: reqItem.details || {} });
    } catch { toast.error("فشل قبول الطلب"); }
    finally { setBdActionLoading(false); }
  };

  const handleBDReject = async (reqItem: BDRequestItem) => {
    if (!bdRejectReason.trim()) { toast.error("يرجى كتابة سبب الرفض"); return; }
    setBdActionLoading(true);
    try {
      await supabase.from("notifications").insert({
        user_uuid: reqItem.user_uuid,
        title: "❌ تم رفض طلب BD",
        body: `تم رفض طلبك. السبب: ${bdRejectReason.trim()}\nيمكنك إعادة التقديم مع تعديل البيانات.`,
        target: "personal",
      });
      toast.success("تم رفض الطلب");
      setBdAction(null); setBdRejectReason("");
      // Optimistic update
      setBdRequests(prev => prev.map(r => r.id === reqItem.id ? { ...r, status: 2, admin_note: bdRejectReason.trim() } : r));
      setAllBdRequests(prev => prev.map(r => r.id === reqItem.id ? { ...r, status: 2, admin_note: bdRejectReason.trim() } : r));
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), rejected: prev.rejected + 1 }));
      // Sync cache table via admin edge function (service role)
      await adminCall("update_bd_cache", { id: reqItem.id, status: 2, admin_note: bdRejectReason.trim(), user_uuid: reqItem.user_uuid, user_name: reqItem.user_name, request_type: reqItem.request_type, details: reqItem.details || {} });
    } catch { toast.error("فشل رفض الطلب"); }
    finally { setBdActionLoading(false); }
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
    { key: "animated_photos", label: "صور متحركة", icon: <Camera className="w-7 h-7" />, color: "from-orange-500/20 to-orange-600/10 text-orange-400", count: animatedPhotos.filter(p => p.status === "pending").length },
    { key: "admin_stars", label: "منح نجوم", icon: <Star className="w-7 h-7" />, color: "from-amber-500/20 to-amber-600/10 text-amber-400" },
    { key: "bd_requests", label: "طلبات BD", icon: <Briefcase className="w-7 h-7" />, color: "from-teal-500/20 to-teal-600/10 text-teal-400", count: bdRequests.filter(r => r.status === 0 || r.status === "pending").length },
    { key: "bd_management", label: "تحكم BD", icon: <Briefcase className="w-7 h-7" />, color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400", count: bdManagementList.length },
    { key: "bd_withdrawals", label: "سحب أرباح BD", icon: <Wallet className="w-7 h-7" />, color: "from-lime-500/20 to-lime-600/10 text-lime-400", count: bdWithdrawals.filter((w: any) => w.status === "pending" || w.status === "info_submitted").length },
    { key: "support_tickets", label: "تكتات الدعم", icon: <MessageSquare className="w-7 h-7" />, color: "from-sky-500/20 to-sky-600/10 text-sky-400", count: supportTickets.filter((t: any) => t.status === "open").length },
    { key: "support_chats", label: "شات VIP", icon: <Headset className="w-7 h-7" />, color: "from-rose-500/20 to-rose-600/10 text-rose-400", count: supportChats.filter((c: any) => c.status === "waiting").length },
    { key: "quick_support", label: "دعم سريع", icon: <Zap className="w-7 h-7" />, color: "from-yellow-500/20 to-yellow-600/10 text-yellow-400", count: quickSupportRequests.filter((r: any) => r.status === "pending").length },
    { key: "id_changes", label: "تغيير آيدي", icon: <Hash className="w-7 h-7" />, color: "from-indigo-500/20 to-indigo-600/10 text-indigo-400", count: idChanges.length },
    ...(adminRole === "super_admin" ? [
      { key: "trash" as const, label: "المحذوفات", icon: <Trash2 className="w-7 h-7" />, color: "from-gray-500/20 to-gray-600/10 text-gray-400", count: trashData.videos.length + trashData.entries.length + trashData.frames.length + trashData.customs.length },
      { key: "audit_log" as const, label: "سجل النشاطات", icon: <ScrollText className="w-7 h-7" />, color: "from-violet-500/20 to-violet-600/10 text-violet-400" },
    ] : []),
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">{adminUsername}</span>
            {adminRole === "super_admin" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">رئيسي</span>
            )}
            <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Home Grid */}
      {!activeTab && (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Statistics Cards - Clickable */}
          <div className="grid grid-cols-3 gap-3" dir="rtl">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setAllRequestsFilter("pending"); setActiveTab("all_requests"); }}
              className="p-4 rounded-2xl border border-orange-500/30 bg-card/50 backdrop-blur-sm hover:border-orange-500/60 transition-all cursor-pointer"
            >
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">معلقة</div>
                <div className="text-3xl font-bold text-orange-500">{stats.pending}</div>
              </div>
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setAllRequestsFilter("approved"); setActiveTab("all_requests"); }}
              className="p-4 rounded-2xl border border-green-500/30 bg-card/50 backdrop-blur-sm hover:border-green-500/60 transition-all cursor-pointer"
            >
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">مقبولة</div>
                <div className="text-3xl font-bold text-green-500">{stats.approved}</div>
              </div>
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setAllRequestsFilter("rejected"); setActiveTab("all_requests"); }}
              className="p-4 rounded-2xl border border-red-500/30 bg-card/50 backdrop-blur-sm hover:border-red-500/60 transition-all cursor-pointer"
            >
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">مرفوضة</div>
                <div className="text-3xl font-bold text-red-500">{stats.rejected}</div>
              </div>
            </motion.button>
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
                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all" as const, label: "الكل", count: salaryRequests.length, color: "bg-muted/30" },
                    { key: "pending" as const, label: "معلقة", count: salaryRequests.filter(r => r.status === "pending").length, color: "bg-yellow-500/10 border-yellow-500/30" },
                    { key: "approved" as const, label: "مقبولة", count: salaryRequests.filter(r => r.status === "approved").length, color: "bg-green-500/10 border-green-500/30" },
                    { key: "rejected" as const, label: "مرفوضة", count: salaryRequests.filter(r => r.status === "rejected").length, color: "bg-red-500/10 border-red-500/30" },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setSalaryFilter(f.key)}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors flex items-center gap-2 ${
                        salaryFilter === f.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : f.color + " border"
                      }`}
                    >
                      {f.label}
                      <span className="min-w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">{f.count}</span>
                    </button>
                  ))}
                </div>
                {salaryRequests
                  .filter(req => salaryFilter === "all" || req.status === salaryFilter)
                  .map((req) => (
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
                          <div className="col-span-2"><span className="text-muted-foreground">التاريخ:</span> {new Date(req.created_at).toLocaleDateString("ar-EG")}</div>
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
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">صورة توضيحية (اختياري)</label>
                              <input type="file" accept="image/*" onChange={(e) => setRejectImageFile(e.target.files?.[0] || null)}
                                className="w-full text-sm file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-destructive/10 file:text-destructive bg-muted/20 border border-border/30 rounded-lg p-1" />
                            </div>
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={isFinalRejection} onChange={(e) => setIsFinalRejection(e.target.checked)} className="rounded" />
                              <span className="text-destructive font-bold">⛔ رفض نهائي (لا يمكن للمستخدم التعديل)</span>
                            </label>
                            <div className="flex gap-2">
                              <Button size="sm" variant="destructive" className="flex-1" disabled={salaryActionLoading} onClick={() => handleRejectWithReason(req.id)}>
                                {salaryActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 ml-1" />{isFinalRejection ? "رفض نهائي" : "تأكيد الرفض"}</>}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setSalaryAction(null); setRejectImageFile(null); setIsFinalRejection(false); }}>إلغاء</Button>
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
                          <p><span className="text-muted-foreground">التاريخ:</span> {new Date(report.created_at).toLocaleDateString("ar-EG")}</p>
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
                          {acc.is_permanently_blocked ? "محظور دائماً" : acc.blocked_until ? `محظور حتى ${new Date(acc.blocked_until).toLocaleDateString("ar-EG")}` : "غير محظور"}
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
                        <span className="text-[10px] text-muted-foreground">{new Date(claim.created_at).toLocaleDateString("ar-EG")}</span>
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
                        <span className="text-[10px] text-muted-foreground">{new Date(claim.created_at).toLocaleDateString("ar-EG")}</span>
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
                      <span className="text-[10px] text-muted-foreground">{new Date(gift.created_at).toLocaleDateString("ar-EG")}</span>
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
                                  <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-EG")}</span>
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
                                  <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-EG")}</span>
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

                {/* Entry Claims Section - hide when filtering pending/rejected since claims are auto-completed */}
                {allRequestsFilter !== "pending" && allRequestsFilter !== "rejected" && (() => {
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
                          <span className="text-[10px] text-muted-foreground">{new Date(claim.created_at).toLocaleDateString("ar-EG")}</span>
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

                {/* Frame Claims Section - hide when filtering pending/rejected since claims are auto-completed */}
                {allRequestsFilter !== "pending" && allRequestsFilter !== "rejected" && (() => {
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
                            <span className="text-[10px] text-muted-foreground">{new Date(claim.created_at).toLocaleDateString("ar-EG")}</span>
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

                {/* Animated Photos Section */}
                {(() => {
                  const filtered = allAnimatedPhotos.filter(p => allRequestsFilter === "all" || p.status === allRequestsFilter);
                  const searched = filtered.filter(p =>
                    allRequestsSearch === "" ||
                    p.user_name.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    p.user_uuid.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  return searched.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Camera className="w-4 h-4 text-orange-500" /> صور متحركة ({searched.length})
                      </h3>
                      {searched.map((photo) => (
                        <div key={photo.id} className="bg-card border rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                photo.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                                photo.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                              }`}>
                                {photo.status === "pending" ? "معلق" : photo.status === "approved" ? "مقبول" : "مرفوض"}
                              </span>
                              <span className="text-xs font-bold">{photo.user_name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(photo.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{photo.user_uuid}</span></div>
                            <div><span className="text-muted-foreground">المدة:</span> {photo.duration_label}</div>
                            <div><span className="text-muted-foreground">أعلى لفل:</span> {photo.max_level}</div>
                            {photo.description && <div className="col-span-2"><span className="text-muted-foreground">الوصف:</span> {photo.description}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* Custom Gifts Section */}
                {(() => {
                  const filtered = allCustomGifts.filter((g: any) => allRequestsFilter === "all" || g.status === allRequestsFilter);
                  const searched = filtered.filter((g: any) =>
                    allRequestsSearch === "" ||
                    g.user_name?.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    g.user_uuid?.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  return searched.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Gift className="w-4 h-4 text-pink-500" /> هدايا مخصصة ({searched.length})
                      </h3>
                      {searched.map((gift: any) => (
                        <div key={gift.id} className="bg-card border rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                gift.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                                gift.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                              }`}>
                                {gift.status === "pending" ? "معلق" : gift.status === "approved" ? "مقبول" : "مرفوض"}
                              </span>
                              <span className="text-xs font-bold">{gift.user_name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(gift.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{gift.user_uuid}</span></div>
                            <div><span className="text-muted-foreground">العنوان:</span> {gift.title}</div>
                            <div><span className="text-muted-foreground">المدة:</span> {gift.video_duration}ث</div>
                            <div><span className="text-muted-foreground">لفل الشاحن:</span> {gift.charger_level_at_upload}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* BD Requests Section */}
                {(() => {
                  const filtered = allBdRequests.filter((r: any) => {
                    const statusNum = typeof r.status === "number" ? r.status : r.status === "pending" ? 0 : r.status === "approved" ? 1 : 2;
                    if (allRequestsFilter === "all") return true;
                    if (allRequestsFilter === "pending") return statusNum === 0;
                    if (allRequestsFilter === "approved") return statusNum === 1;
                    if (allRequestsFilter === "rejected") return statusNum === 2;
                    return true;
                  });
                  const searched = filtered.filter((r: any) =>
                    allRequestsSearch === "" ||
                    r.user_name?.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    r.user_uuid?.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  return searched.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-teal-500" /> طلبات BD ({searched.length})
                      </h3>
                      {searched.map((req: any) => {
                        const statusNum = typeof req.status === "number" ? req.status : req.status === "pending" ? 0 : req.status === "approved" ? 1 : 2;
                        return (
                          <div key={req.id} className="bg-card border rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  statusNum === 0 ? "bg-yellow-500/20 text-yellow-500" :
                                  statusNum === 1 ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                                }`}>
                                  {statusNum === 0 ? "معلق" : statusNum === 1 ? "مقبول" : "مرفوض"}
                                </span>
                                <span className="text-xs font-bold">{req.user_name}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-EG")}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{req.user_uuid}</span></div>
                              <div><span className="text-muted-foreground">النوع:</span> {req.request_type}</div>
                              {req.admin_note && <div className="col-span-2"><span className="text-muted-foreground">ملاحظة:</span> {req.admin_note}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null;
                })()}

                {/* Quick Support Section */}
                {(() => {
                  const filtered = allQuickSupport.filter((r: any) => {
                    if (allRequestsFilter === "all") return true;
                    if (allRequestsFilter === "approved") return r.status === "resolved";
                    return r.status === allRequestsFilter;
                  });
                  const searched = filtered.filter((r: any) =>
                    allRequestsSearch === "" ||
                    r.user_name?.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    r.user_uuid?.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  return searched.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" /> دعم سريع ({searched.length})
                      </h3>
                      {searched.map((req: any) => (
                        <div key={req.id} className="bg-card border rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                req.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                                req.status === "resolved" ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                              }`}>
                                {req.status === "pending" ? "معلق" : req.status === "resolved" ? "تم" : req.status}
                              </span>
                              <span className="text-xs font-bold">{req.user_name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{req.user_uuid}</span></div>
                            <div><span className="text-muted-foreground">النوع:</span> {req.request_type}</div>
                            {req.room_code && <div><span className="text-muted-foreground">كود الغرفة:</span> {req.room_code}</div>}
                            {req.description && <div className="col-span-2"><span className="text-muted-foreground">الوصف:</span> {req.description}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* VIP Requests Section - auto-completed */}
                {allRequestsFilter !== "pending" && allRequestsFilter !== "rejected" && (() => {
                  const searched = allVipRequests.filter((r: any) =>
                    allRequestsSearch === "" ||
                    r.user_name?.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    r.user_uuid?.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  return searched.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" /> طلبات VIP ({searched.length})
                      </h3>
                      {searched.map((req: any) => (
                        <div key={req.id} className="bg-card border rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500">تم</span>
                              <span className="text-xs font-bold">{req.user_name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{req.user_uuid}</span></div>
                            <div><span className="text-muted-foreground">مستوى VIP:</span> {req.vip_level}</div>
                            <div><span className="text-muted-foreground">الشهر:</span> {req.request_month}</div>
                            {req.recipient_uuid && <div><span className="text-muted-foreground">المستقبل:</span> <span className="font-mono text-[10px]">{req.recipient_uuid}</span></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* Empty State */}
                {allSalaryRequests.length === 0 && allEntryClaims.length === 0 && allFrameClaims.length === 0 && 
                 allAnimatedPhotos.length === 0 && allCustomGifts.length === 0 && allBdRequests.length === 0 && 
                 allQuickSupport.length === 0 && allVipRequests.length === 0 && (
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

            {activeTab === "admin_stars" && (
              <motion.div key="admin_stars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-card border rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />منح نجوم لمستخدم عبر UUID</h3>
                  <Input
                    placeholder="UUID المستخدم *"
                    value={adminStarUuid}
                    onChange={(e) => setAdminStarUuid(e.target.value)}
                    dir="ltr"
                  />
                  <Input
                    type="number"
                    placeholder="عدد النجوم *"
                    value={adminStarAmount}
                    onChange={(e) => setAdminStarAmount(e.target.value)}
                    min="1"
                    dir="ltr"
                  />
                  <Button
                    onClick={handleAdminSendStars}
                    disabled={adminStarLoading || !adminStarUuid.trim() || !adminStarAmount}
                    className="w-full"
                  >
                    {adminStarLoading ? (
                      <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الإرسال...</>
                    ) : (
                      <><Star className="w-4 h-4 ml-2" />إرسال النجوم</>
                    )}
                  </Button>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-xs text-amber-600 leading-relaxed">
                    ⭐ سيتم إضافة النجوم مباشرة إلى رصيد المستخدم وتسجيل العملية في سجل الإهداءات.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Animated Photos Tab */}
            {activeTab === "animated_photos" && (
              <motion.div key="animated_photos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all" as const, label: "الكل", count: animatedPhotos.length, color: "bg-muted/30" },
                    { key: "approved" as const, label: "✅ مقبولة", count: animatedPhotos.filter(p => p.status === "approved").length, color: "bg-emerald-500/10 border-emerald-500/30" },
                    { key: "pending" as const, label: "معلقة", count: animatedPhotos.filter(p => p.status === "pending").length, color: "bg-yellow-500/10 border-yellow-500/30" },
                    { key: "rejected" as const, label: "مرفوضة", count: animatedPhotos.filter(p => p.status === "rejected").length, color: "bg-red-500/10 border-red-500/30" },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setAnimatedPhotoFilter(f.key as any)}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors flex items-center gap-2 ${
                        animatedPhotoFilter === f.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : f.color + " border"
                      }`}
                    >
                      {f.label}
                      <span className="min-w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">{f.count}</span>
                    </button>
                  ))}
                </div>
                {animatedPhotos
                  .filter(photo => animatedPhotoFilter === "all" || photo.status === animatedPhotoFilter)
                  .length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد طلبات صور متحركة</p>
                  </div>
                )}
                {animatedPhotos
                  .filter(photo => animatedPhotoFilter === "all" || photo.status === animatedPhotoFilter)
                  .map((photo) => (
                  <div key={photo.id} className="bg-card border rounded-xl overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            photo.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                            photo.status === "approved" ? "bg-emerald-500/20 text-emerald-500" : "bg-destructive/20 text-destructive"
                          }`}>
                            {photo.status === "pending" ? "معلق" : photo.status === "approved" ? "✅ موافق تلقائياً" : "مرفوض"}
                          </span>
                          <div>
                            <p className="font-bold text-sm">{photo.user_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{photo.user_uuid}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(photo.created_at).toLocaleDateString("ar-EG")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">المدة:</span> {photo.duration_label}</div>
                        <div><span className="text-muted-foreground">أعلى مستوى:</span> {photo.max_level}</div>
                        {photo.description && <div className="col-span-2"><span className="text-muted-foreground">الوصف:</span> {photo.description}</div>}
                      </div>
                      {photo.gif_url && (
                        <a href={photo.gif_url} target="_blank" rel="noopener" className="text-xs text-primary underline">🖼️ عرض الصورة</a>
                      )}
                      {/* Action buttons for pending photos */}
                      {photo.status === "pending" && (
                        <div className="flex gap-2 pt-2 border-t border-border/30">
                          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAnimatedPhotoApprove(photo)} disabled={salaryActionLoading}>
                            <CheckCircle className="w-4 h-4 ml-1" />قبول
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setAnimatedPhotoAction({ id: photo.id, type: "reject" }); setRejectReason(""); setRejectImageFile(null); setIsFinalRejection(false); }}>
                            <XCircle className="w-4 h-4 ml-1" />رفض
                          </Button>
                        </div>
                      )}
                      {animatedPhotoAction?.id === photo.id && animatedPhotoAction.type === "reject" && (
                        <div className="space-y-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl mt-2">
                          <p className="text-xs font-bold text-destructive">سبب الرفض *</p>
                          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="اكتب سبب الرفض..." className="text-sm min-h-[60px]" />
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">صورة توضيحية (اختياري)</label>
                            <input type="file" accept="image/*" onChange={(e) => setRejectImageFile(e.target.files?.[0] || null)}
                              className="w-full text-sm file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-destructive/10 file:text-destructive bg-muted/20 border border-border/30 rounded-lg p-1" />
                          </div>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={isFinalRejection} onChange={(e) => setIsFinalRejection(e.target.checked)} className="rounded" />
                            <span className="text-destructive font-bold">⛔ رفض نهائي</span>
                          </label>
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" className="flex-1" disabled={salaryActionLoading} onClick={() => handleAnimatedPhotoReject(photo)}>
                              {salaryActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 ml-1" />{isFinalRejection ? "رفض نهائي" : "تأكيد الرفض"}</>}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setAnimatedPhotoAction(null); setRejectImageFile(null); setIsFinalRejection(false); }}>إلغاء</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* BD Requests Tab */}
            {activeTab === "bd_requests" && (
              <motion.div key="bd_requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all" as const, label: "الكل", count: bdRequests.length, color: "bg-muted/30" },
                    { key: "pending" as const, label: "معلقة", count: bdRequests.filter(r => (typeof r.status === "number" ? r.status === 0 : r.status === "pending")).length, color: "bg-yellow-500/10 border-yellow-500/30" },
                    { key: "approved" as const, label: "مقبولة", count: bdRequests.filter(r => (typeof r.status === "number" ? r.status === 1 : r.status === "approved")).length, color: "bg-green-500/10 border-green-500/30" },
                    { key: "rejected" as const, label: "مرفوضة", count: bdRequests.filter(r => (typeof r.status === "number" ? r.status === 2 : r.status === "rejected")).length, color: "bg-red-500/10 border-red-500/30" },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setBdFilter(f.key)}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors flex items-center gap-2 ${
                        bdFilter === f.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : f.color + " border"
                      }`}
                    >
                      {f.label}
                      <span className="min-w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">{f.count}</span>
                    </button>
                  ))}
                </div>
                {bdRequests.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد طلبات BD</p>
                    <p className="text-xs mt-1">قد يكون الخادم الخارجي غير متاح حالياً</p>
                  </div>
                )}
                {bdRequests
                  .filter(req => {
                    const statusNum = typeof req.status === "number" ? req.status : req.status === "pending" ? 0 : req.status === "approved" ? 1 : 2;
                    if (bdFilter === "all") return true;
                    if (bdFilter === "pending") return statusNum === 0;
                    if (bdFilter === "approved") return statusNum === 1;
                    if (bdFilter === "rejected") return statusNum === 2;
                    return true;
                  })
                  .map((req) => {
                  const statusNum = typeof req.status === "number" ? req.status : req.status === "pending" ? 0 : req.status === "approved" ? 1 : 2;
                  const statusLabel = statusNum === 0 ? "معلق" : statusNum === 1 ? "مقبول" : "مرفوض";
                  const statusColor = statusNum === 0 ? "bg-yellow-500/20 text-yellow-500" : statusNum === 1 ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive";

                  return (
                    <div key={req.id} className="bg-card border rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedBD(expandedBD === req.id ? null : req.id)} className="w-full p-4 flex items-center justify-between text-right">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>{statusLabel}</span>
                          <div>
                            <p className="font-bold text-sm">{req.user_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{req.user_uuid}</p>
                          </div>
                        </div>
                        {expandedBD === req.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {expandedBD === req.id && (
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          <div className="text-xs space-y-1.5">
                            <p><span className="text-muted-foreground">UUID:</span> <span className="font-mono">{req.user_uuid}</span></p>
                            <p><span className="text-muted-foreground">التاريخ:</span> {new Date(req.created_at).toLocaleDateString("ar-EG")}</p>
                            {req.details?.description && (
                              <div className="p-2 bg-muted/30 rounded-lg mt-2">
                                <p className="text-muted-foreground font-bold mb-1">التفاصيل:</p>
                                <p className="text-foreground whitespace-pre-wrap">{req.details.description}</p>
                              </div>
                            )}
                            {req.details?.document_url && (
                              <a href={req.details.document_url} target="_blank" rel="noopener" className="text-primary underline text-xs inline-block mt-1">
                                📎 عرض المستند المرفق
                              </a>
                            )}
                            {req.admin_note && (
                              <div className="p-2 bg-muted/30 rounded-lg">
                                <p className="text-muted-foreground font-bold mb-1">ملاحظة الأدمن:</p>
                                <p>{req.admin_note}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions for pending requests */}
                          {statusNum === 0 && bdAction?.id !== req.id && (
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => setBdAction({ id: req.id, type: "approve" })}>
                                <CheckCircle className="w-4 h-4 ml-1" />قبول
                              </Button>
                              <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setBdAction({ id: req.id, type: "reject" }); setBdRejectReason(""); }}>
                                <XCircle className="w-4 h-4 ml-1" />رفض
                              </Button>
                            </div>
                          )}

                          {/* Approve confirmation */}
                          {bdAction?.id === req.id && bdAction.type === "approve" && (
                            <div className="space-y-2 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                              <p className="text-xs font-bold text-green-500">هل أنت متأكد من قبول هذا الطلب؟</p>
                              <p className="text-[11px] text-muted-foreground">سيتم منح المستخدم صلاحيات BD</p>
                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={bdActionLoading} onClick={() => handleBDApprove(req)}>
                                  {bdActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 ml-1" />تأكيد القبول</>}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setBdAction(null)}>إلغاء</Button>
                              </div>
                            </div>
                          )}

                          {/* Reject with reason */}
                          {bdAction?.id === req.id && bdAction.type === "reject" && (
                            <div className="space-y-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                              <p className="text-xs font-bold text-destructive">سبب الرفض *</p>
                              <Textarea value={bdRejectReason} onChange={(e) => setBdRejectReason(e.target.value)} placeholder="اكتب سبب الرفض هنا..." className="text-sm min-h-[60px]" />
                              <div className="flex gap-2">
                                <Button size="sm" variant="destructive" className="flex-1" disabled={bdActionLoading} onClick={() => handleBDReject(req)}>
                                  {bdActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 ml-1" />تأكيد الرفض</>}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setBdAction(null)}>إلغاء</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Trash Tab - Super Admin Only */}
            {activeTab === "trash" && adminRole === "super_admin" && (
              <motion.div key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Trash sections */}
                {[
                  { key: "videos", label: "فيديوهات محذوفة", items: trashData.videos, table: "video_tutorials" },
                  { key: "entries", label: "دخوليات محذوفة", items: trashData.entries, table: "entry_gifts" },
                  { key: "frames", label: "إطارات محذوفة", items: trashData.frames, table: "frames" },
                  { key: "customs", label: "هدايا مخصصة محذوفة", items: trashData.customs, table: "custom_gifts" },
                ].map((section) => (
                  <div key={section.key} className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                      {section.label}
                      <span className="text-xs text-muted-foreground">({section.items.length})</span>
                    </h3>
                    {section.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">لا توجد عناصر محذوفة</p>
                    ) : (
                      section.items.map((item: any) => (
                        <div key={item.id} className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm">{item.title || item.user_name || "بدون عنوان"}</h4>
                            <span className="text-[10px] text-muted-foreground">
                              {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString("ar-EG") : ""}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-green-500 border-green-500/30 hover:bg-green-500/10"
                              onClick={async () => {
                                try {
                                  await adminCall("restore_item", { table: section.table, id: item.id });
                                  toast.success("تم استعادة العنصر");
                                  loadData();
                                } catch { toast.error("فشل الاستعادة"); }
                              }}
                            >
                              <CheckCircle className="w-4 h-4 ml-1" />استعادة
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={async () => {
                                if (!confirm("هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع!")) return;
                                try {
                                  await adminCall("permanent_delete", { table: section.table, id: item.id });
                                  toast.success("تم الحذف نهائياً");
                                  loadData();
                                } catch { toast.error("فشل الحذف"); }
                              }}
                            >
                              <Trash2 className="w-4 h-4 ml-1" />حذف نهائي
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* BD Management Tab */}
            {activeTab === "bd_management" && (
              <motion.div key="bd_management" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* Monthly Withdraw Toggle */}
                <div className="bg-card border rounded-xl p-4 flex items-center justify-between" dir="rtl">
                  <div>
                    <p className="text-sm font-bold text-foreground">السحب الشهري</p>
                    <p className="text-[10px] text-muted-foreground">{bdWithdrawEnabled ? "مفعّل - يمكن للبيدي تقديم طلبات سحب" : "متوقف - لا يمكن تقديم طلبات سحب"}</p>
                  </div>
                  <Switch
                    checked={bdWithdrawEnabled}
                    onCheckedChange={toggleBdWithdraw}
                    disabled={bdWithdrawToggleLoading}
                  />
                </div>

                {bdManagementList.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">لا يوجد حسابات BD مفعّلة</p>
                ) : (
                  bdManagementList.map((bd: any) => {
                    const isEditing = editingBdSettings?.bd_uuid === bd.bd_uuid;
                    return (
                    <div key={bd.id} className="bg-card border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-foreground">{bd.bd_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{bd.bd_uuid}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={isEditing ? "default" : "outline"}
                          className="h-7 text-[10px] gap-1"
                          onClick={() => {
                            if (isEditing) {
                              setEditingBdSettings(null);
                            } else {
                              setEditingBdSettings({
                                bd_uuid: bd.bd_uuid,
                                agency_commission_pct: bd.agency_commission_pct,
                                host_commission_pct: bd.host_commission_pct,
                                user_commission_pct: bd.user_commission_pct,
                                total_earned: bd.total_earned,
                                available_balance: bd.available_balance,
                              });
                            }
                          }}
                        >
                          {isEditing ? <><X className="w-3 h-3" /> إلغاء</> : <><Edit2 className="w-3 h-3" /> تعديل</>}
                        </Button>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="bg-muted/20 rounded-lg p-2">
                          <p className="font-bold text-foreground">{bd.agency_count || 0}</p>
                          <p className="text-muted-foreground">وكلاء</p>
                        </div>
                        <div className="bg-muted/20 rounded-lg p-2">
                          <p className="font-bold text-foreground">{bd.host_count || 0}</p>
                          <p className="text-muted-foreground">مضيفين</p>
                        </div>
                        <div className="bg-muted/20 rounded-lg p-2">
                          <p className="font-bold text-foreground">{bd.user_count || 0}</p>
                          <p className="text-muted-foreground">مستخدمين</p>
                        </div>
                      </div>

                      {/* Financial Info */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-emerald-500/10 rounded-lg p-2.5 text-center">
                          <p className="text-muted-foreground mb-1">إجمالي الأرباح</p>
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingBdSettings.total_earned}
                              onChange={(e) => setEditingBdSettings({ ...editingBdSettings, total_earned: parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs text-center"
                            />
                          ) : (
                            <p className="text-sm font-bold text-emerald-400">${Number(bd.total_earned || 0).toFixed(2)}</p>
                          )}
                        </div>
                        <div className="bg-primary/10 rounded-lg p-2.5 text-center">
                          <p className="text-muted-foreground mb-1">الرصيد المتاح</p>
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingBdSettings.available_balance}
                              onChange={(e) => setEditingBdSettings({ ...editingBdSettings, available_balance: parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs text-center"
                            />
                          ) : (
                            <p className="text-sm font-bold text-primary">${Number(bd.available_balance || 0).toFixed(2)}</p>
                          )}
                        </div>
                      </div>

                      {/* Commission Percentages */}
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground font-bold">النسب المئوية:</p>
                        {[
                          { label: "وكلاء", field: "agency_commission_pct" as const },
                          { label: "مضيفين", field: "host_commission_pct" as const },
                          { label: "مستخدمين", field: "user_commission_pct" as const },
                        ].map((pct) => (
                          <div key={pct.field} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-16">{pct.label}:</span>
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={editingBdSettings[pct.field]}
                                onChange={(e) => setEditingBdSettings({ ...editingBdSettings, [pct.field]: parseFloat(e.target.value) || 0 })}
                                className="h-7 text-xs text-center w-20"
                              />
                            ) : (
                              <span className="text-xs font-bold text-foreground">{bd[pct.field]}</span>
                            )}
                            <span className="text-[10px] text-muted-foreground">%</span>
                          </div>
                        ))}
                      </div>

                      {/* Save Button */}
                      {isEditing && (
                        <Button
                          size="sm"
                          className="w-full h-9 text-xs gap-1"
                          disabled={bdSettingsLoading}
                          onClick={async () => {
                            setBdSettingsLoading(true);
                            try {
                              const { error } = await supabase.functions.invoke("bd-manage", {
                                body: {
                                  action: "update_bd_settings",
                                  bd_uuid: bd.bd_uuid,
                                  agency_commission_pct: editingBdSettings.agency_commission_pct,
                                  host_commission_pct: editingBdSettings.host_commission_pct,
                                  user_commission_pct: editingBdSettings.user_commission_pct,
                                  total_earned: editingBdSettings.total_earned,
                                  available_balance: editingBdSettings.available_balance,
                                },
                              });
                              if (error) throw error;
                              toast.success("تم حفظ التعديلات بنجاح");
                              setEditingBdSettings(null);
                              loadData();
                            } catch {
                              toast.error("فشل حفظ التعديلات");
                            }
                            setBdSettingsLoading(false);
                          }}
                        >
                          {bdSettingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> حفظ التعديلات</>}
                        </Button>
                      )}

                      <div className="text-[9px] text-muted-foreground">
                        رمز الدعوة: <span className="font-mono text-primary">{bd.referral_code}</span>
                      </div>
                    </div>
                    );
                  })
                )}
              </motion.div>
            )}

            {/* BD Withdrawals Tab */}
            {activeTab === "bd_withdrawals" && (
              <motion.div key="bd_withdrawals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* Filters */}
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    { key: "pending", label: "معلقة" },
                    { key: "approved", label: "موافق عليها" },
                    { key: "info_submitted", label: "بانتظار التحويل" },
                    { key: "completed", label: "مكتملة" },
                    { key: "rejected", label: "مرفوضة" },
                    { key: "all", label: "الكل" },
                  ] as const).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setBdWithdrawFilter(f.key)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${bdWithdrawFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"}`}
                    >
                      {f.label} ({bdWithdrawals.filter((w: any) => f.key === "all" ? true : w.status === f.key).length})
                    </button>
                  ))}
                </div>

                {(() => {
                  const filtered = bdWithdrawals.filter((w: any) => bdWithdrawFilter === "all" ? true : w.status === bdWithdrawFilter);
                  if (filtered.length === 0) return <p className="text-center py-8 text-sm text-muted-foreground">لا توجد طلبات</p>;
                  return filtered.map((w: any) => {
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      pending: { label: "قيد المراجعة", cls: "bg-amber-500/10 text-amber-400" },
                      approved: { label: "تمت الموافقة", cls: "bg-emerald-500/10 text-emerald-400" },
                      info_submitted: { label: "بانتظار التحويل", cls: "bg-blue-500/10 text-blue-400" },
                      completed: { label: "مكتمل", cls: "bg-green-500/10 text-green-400" },
                      rejected: { label: "مرفوض", cls: "bg-destructive/10 text-destructive" },
                    };
                    const st = statusMap[w.status] || { label: w.status, cls: "bg-muted text-muted-foreground" };
                    return (
                      <div key={w.id} className="bg-card border rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-foreground">{w.bd_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{w.bd_uuid}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                        </div>
                        <div className="bg-muted/20 rounded-lg p-2.5 text-center">
                          <p className="text-lg font-bold text-primary">${Number(w.amount).toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(w.created_at).toLocaleString("ar-EG")}</p>
                        </div>

                        {/* Recipient info if submitted */}
                        {w.recipient_name && (
                          <div className="bg-muted/10 rounded-lg p-3 space-y-1 text-xs">
                            <p className="font-bold text-foreground mb-2">معلومات المستلم:</p>
                            <p>الاسم: <span className="font-bold">{w.recipient_name}</span></p>
                            <p>الرقم: <span className="font-mono" dir="ltr">{w.recipient_phone}</span></p>
                            <p>نوع الحوالة: <span className="font-bold">{w.transfer_type}</span></p>
                            <p>الدولة: <span className="font-bold">{w.country}</span></p>
                          </div>
                        )}

                        {/* Transfer info if completed */}
                        {w.transfer_number && (
                          <div className="bg-green-500/10 rounded-lg p-3 space-y-1 text-xs">
                            <p>رقم الحوالة: <span className="font-mono font-bold" dir="ltr">{w.transfer_number}</span></p>
                            {w.receipt_url && <a href={w.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">📎 عرض الإيصال</a>}
                          </div>
                        )}

                        {w.admin_note && (
                          <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">ملاحظة: {w.admin_note}</p>
                        )}

                        {/* Actions */}
                        {w.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 gap-1" onClick={async () => {
                              setBdWithdrawLoading(true);
                              try {
                                const { error } = await supabase.functions.invoke("bd-manage", {
                                  body: { action: "approve_withdrawal", withdrawal_id: w.id },
                                });
                                if (error) throw error;
                                toast.success("تمت الموافقة");
                                loadData();
                              } catch { toast.error("فشل"); }
                              setBdWithdrawLoading(false);
                            }}>
                              <CheckCircle className="w-3 h-3" /> موافقة
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => {
                              const reason = prompt("سبب الرفض (اختياري):");
                              (async () => {
                                setBdWithdrawLoading(true);
                                try {
                                  const { error } = await supabase.functions.invoke("bd-manage", {
                                    body: { action: "reject_withdrawal", withdrawal_id: w.id, admin_note: reason || "" },
                                  });
                                  if (error) throw error;
                                  toast.success("تم الرفض");
                                  loadData();
                                } catch { toast.error("فشل"); }
                                setBdWithdrawLoading(false);
                              })();
                            }}>
                              <XCircle className="w-3 h-3" /> رفض
                            </Button>
                          </div>
                        )}

                        {w.status === "info_submitted" && (
                          transferFormId === w.id ? (
                            <div className="space-y-2 bg-muted/20 rounded-lg p-3 border border-primary/20">
                              <p className="text-xs font-bold text-foreground">إتمام التحويل</p>
                              <Input
                                placeholder="رقم الحوالة *"
                                value={transferNumber}
                                onChange={(e) => setTransferNumber(e.target.value)}
                                className="h-9 text-sm"
                                dir="ltr"
                              />
                              <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground">صورة الإيصال (اختياري)</label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setTransferReceiptFile(e.target.files?.[0] || null)}
                                  className="h-9 text-xs"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1 gap-1" disabled={!transferNumber.trim() || bdWithdrawLoading} onClick={async () => {
                                  setBdWithdrawLoading(true);
                                  try {
                                    let receiptUrl = "";
                                    if (transferReceiptFile) {
                                      try { receiptUrl = await uploadFile(transferReceiptFile); } catch { console.error("Receipt upload failed"); }
                                    }
                                    const { error } = await supabase.functions.invoke("bd-manage", {
                                      body: { action: "complete_transfer", withdrawal_id: w.id, transfer_number: transferNumber, receipt_url: receiptUrl },
                                    });
                                    if (error) throw error;
                                    toast.success("تم إتمام التحويل");
                                    setTransferFormId(null);
                                    setTransferNumber("");
                                    setTransferReceiptFile(null);
                                    loadData();
                                  } catch { toast.error("فشل"); }
                                  setBdWithdrawLoading(false);
                                }}>
                                  {bdWithdrawLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  تأكيد
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setTransferFormId(null); setTransferNumber(""); setTransferReceiptFile(null); }}>إلغاء</Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" className="w-full gap-1" onClick={() => setTransferFormId(w.id)}>
                              <DollarSign className="w-3 h-3" /> تم التحويل
                            </Button>
                          )
                        )}
                      </div>
                    );
                  });
                })()}
              </motion.div>
            )}

            {/* Support Tickets Tab */}
            {activeTab === "support_tickets" && (
              <motion.div key="support_tickets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {supportTickets.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">لا توجد تكتات</p>
                ) : supportTickets.map((ticket: any) => (
                  <div key={ticket.id} className="bg-card border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{ticket.subject}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ticket.status === "open" ? "bg-amber-500/10 text-amber-400" : ticket.status === "replied" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {ticket.status === "open" ? "مفتوح" : ticket.status === "replied" ? "تم الرد" : "مغلق"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{ticket.user_name} • {ticket.user_uuid}</p>
                    <p className="text-xs text-foreground bg-muted/10 rounded-lg p-2">{ticket.description}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(ticket.created_at).toLocaleString("ar-EG")}</p>
                    {ticket.admin_reply && <p className="text-xs text-primary bg-primary/5 rounded-lg p-2">آخر رد: {ticket.admin_reply}</p>}
                    {ticket.status !== "closed" && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="اكتب الرد..."
                          value={chatReplyInput && expandedTicket === ticket.id ? chatReplyInput : ""}
                          onChange={(e) => { setChatReplyInput(e.target.value); setExpandedTicket(ticket.id); }}
                          className="flex-1 h-9 text-xs"
                        />
                        <Button size="sm" disabled={!chatReplyInput.trim() || expandedTicket !== ticket.id || ticketReplyLoading}
                          onClick={async () => {
                            setTicketReplyLoading(true);
                            try {
                              await adminCall("reply_ticket", { ticket_id: ticket.id, admin_reply: chatReplyInput.trim() });
                              toast.success("تم الرد");
                              setChatReplyInput(""); setExpandedTicket(null);
                              loadData();
                            } catch { toast.error("فشل الرد"); }
                            setTicketReplyLoading(false);
                          }}>رد</Button>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* Support Chats Tab */}
            {activeTab === "support_chats" && (
              <motion.div key="support_chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {supportChats.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">لا توجد محادثات VIP</p>
                ) : supportChats.map((chat: any) => (
                  <div key={chat.id} className="bg-card border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{chat.user_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${chat.status === "waiting" ? "bg-amber-500/10 text-amber-400" : chat.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {chat.status === "waiting" ? "بانتظار" : chat.status === "active" ? "نشط" : "مغلق"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">VIP {chat.vip_level} • غرفة: {chat.room_id || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(chat.created_at).toLocaleString("ar-EG")}</p>
                    {chat.status !== "closed" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={async () => {
                          try {
                            await adminCall("update_chat_session", { id: chat.id, status: "active", admin_username: adminUsername });
                            toast.success("تم قبول المحادثة");
                            loadData();
                          } catch { toast.error("فشل"); }
                        }}>
                          <CheckCircle className="w-3 h-3 ml-1" />قبول
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1" onClick={async () => {
                          try {
                            await adminCall("update_chat_session", { id: chat.id, status: "closed" });
                            toast.success("تم إغلاق المحادثة");
                            loadData();
                          } catch { toast.error("فشل"); }
                        }}>
                          <XCircle className="w-3 h-3 ml-1" />إغلاق
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* Quick Support Tab */}
            {activeTab === "quick_support" && (
              <motion.div key="quick_support" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {quickSupportRequests.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">لا توجد طلبات دعم سريع</p>
                ) : quickSupportRequests.map((req: any) => {
                  const typeLabels: Record<string, string> = {
                    admin_visit: "🏠 طلب إداري",
                    report: "⚠️ بلاغ",
                    complaint: "📋 شكوى",
                    direct_contact: "📞 تواصل مباشر",
                  };
                  return (
                    <div key={req.id} className="bg-card border rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{typeLabels[req.request_type] || req.request_type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${req.status === "pending" ? "bg-amber-500/10 text-amber-400" : req.status === "resolved" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          {req.status === "pending" ? "معلق" : req.status === "resolved" ? "تم" : req.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{req.user_name} • {req.user_uuid}</p>
                      {req.room_code && <p className="text-xs text-foreground">🏠 الغرفة: <span className="font-bold font-mono" dir="ltr">{req.room_code}</span></p>}
                      {req.description && <p className="text-xs text-foreground bg-muted/10 rounded-lg p-2">{req.description}</p>}
                      {req.phone_number && <p className="text-xs text-foreground">📞 <span className="font-mono" dir="ltr">{req.phone_number}</span></p>}
                      {req.attachment_url && (
                        <a href={req.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">📎 عرض المرفق</a>
                      )}
                      <p className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleString("ar-EG")}</p>
                      {req.status === "pending" && (
                        <Button size="sm" className="w-full" onClick={async () => {
                          try {
                            await supabase.from("quick_support_requests").update({ status: "resolved" } as any).eq("id", req.id);
                            setQuickSupportRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "resolved" } : r));
                            toast.success("تم تحديث الحالة");
                          } catch { toast.error("فشل التحديث"); }
                        }}>
                          <CheckCircle className="w-3 h-3 ml-1" />تم المعالجة
                        </Button>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* ID Changes Tab */}
            {activeTab === "id_changes" && (
              <motion.div key="id_changes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {idChanges.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Hash className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد طلبات تغيير آيدي</p>
                  </div>
                ) : (
                  idChanges.map((change: any) => (
                    <div key={change.id} className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground" dir="ltr">{change.new_id}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(change.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>UUID: <span className="font-mono text-foreground/70" dir="ltr">{change.user_uuid}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold">
                          المستوى {change.level_milestone}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Audit Log Tab - Super Admin Only */}
            {activeTab === "audit_log" && adminRole === "super_admin" && (
              <motion.div key="audit_log" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 mb-4">
                  <p className="text-xs text-violet-400 leading-relaxed">
                    📋 سجل جميع عمليات الأدمن (آخر 300 عملية). يتم تسجيل كل إجراء تلقائياً.
                  </p>
                </div>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ScrollText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد سجلات</p>
                  </div>
                ) : (
                  auditLogs.map((log: any) => {
                    const actionLabels: Record<string, string> = {
                      add_video: "إضافة فيديو",
                      update_video: "تعديل فيديو",
                      delete_video: "حذف فيديو",
                      add_entry_gift: "إضافة دخولية",
                      update_entry_gift: "تعديل دخولية",
                      delete_entry_gift: "حذف دخولية",
                      add_frame: "إضافة إطار",
                      update_frame: "تعديل إطار",
                      delete_frame: "حذف إطار",
                      update_salary_request: "تحديث طلب راتب",
                      update_ban_report: "تحديث بلاغ",
                      unblock_account: "فك حظر",
                      admin_send_stars: "منح نجوم",
                      update_animated_photo: "تحديث صورة متحركة",
                      update_custom_gift: "تعديل هدية مخصصة",
                      delete_custom_gift: "حذف هدية مخصصة",
                      restore_item: "استعادة عنصر",
                      permanent_delete: "حذف نهائي",
                    };
                    const label = actionLabels[log.action] || log.action;
                    const details = log.details || {};
                    const detailStr = Object.entries(details)
                      .filter(([k]) => k !== "password" && k !== "username")
                      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                      .join(" | ");

                    return (
                      <div key={log.id} className="bg-card border border-border/40 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${log.admin_role === "super_admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {log.admin_username}
                            </span>
                            <span className="text-xs font-bold text-foreground">{label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        {detailStr && (
                          <p className="text-[11px] text-muted-foreground font-mono truncate" dir="ltr">{detailStr}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </div>
      )}
      
      {/* Admin notifications listener */}
      <AdminNotificationListener />
    </div>
  );
};

export default AdminDashboardPage;
