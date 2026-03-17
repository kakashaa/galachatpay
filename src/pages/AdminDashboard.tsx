import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { playNotificationSound, playUrgentSound } from "@/lib/notificationSound";
import { Scissors, Palette, Clock, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Shield, LogOut, Video, Plus, Trash2, Edit2, Save, X,
  Loader2, Eye, EyeOff, Upload, Wallet,
  ShieldBan, DollarSign, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Ban, Unlock, Star, Sparkles, Frame, ClipboardList, Gift, Users,
  ArrowRight, Bell, ScrollText, Hash, Crown, Settings as SettingsIcon,
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



import AdminHairManager from "@/components/AdminHairManager";
import AdminTopAgents from "@/components/AdminTopAgents";
import AdminBDManager from "@/components/AdminBDManager";
import AdminModeratorManager from "@/components/AdminModeratorManager";
import AdminElementSettings from "@/components/AdminElementSettings";
import AdminBannerManager from "@/components/AdminBannerManager";
import { Settings, ImageIcon } from "lucide-react";
// Settings imported twice - use SettingsIcon from above
import TicketRepliesSection from "@/components/TicketRepliesSection";
import AdminAgencyManager from "@/components/AdminAgencyManager";
import AdminSalaryWithdrawManager from "@/components/AdminSalaryWithdrawManager";
import AdminSalaryChargeManager from "@/components/AdminSalaryChargeManager";
import AdminGroupChat from "@/components/AdminGroupChat";
import AdminSupportManager from "@/components/AdminSupportManager";
import AdminManualActions from "@/components/AdminManualActions";
import AdminBottomNav from "@/components/AdminBottomNav";
import AdminHomeView from "@/components/AdminHomeView";

type Tab = "videos" | "salary" | "reports" | "blocks" | "entries" | "frames" | "gifts" | "notifications" | "all_requests" | "animated_photos" | "admin_stars" | "trash" | "audit_log" | "support_tickets" | "support_chats" | "quick_support" | "id_changes" | "hairs" | "top_agents" | "bd_management" | "moderators" | "custom_gifts" | "element_settings" | "banners" | "agencies" | "admin_chat" | "admin_support" | "manual_actions" | null;


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
  const [activeSection, setActiveSection] = useState<"requests" | "settings" | "chat" | "finance" | null>(null);
  const [tabDirection, setTabDirection] = useState<1 | -1>(1);

  const tabSlideVariants = {
    enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
  };
  const [loading, setLoading] = useState(false);

  // Videos state
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [editVideoData, setEditVideoData] = useState<{ title: string; description: string }>({ title: "", description: "" });
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
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
  const [salarySubTab, setSalarySubTab] = useState<"requests" | "withdraw" | "charge">("requests");
  const [rejectImageFile, setRejectImageFile] = useState<File | null>(null);
  const [isFinalRejection, setIsFinalRejection] = useState(false);
  const [animatedPhotoAction, setAnimatedPhotoAction] = useState<{ id: string; type: "approve" | "reject" } | null>(null);

  // Ban reports state
  const [banReports, setBanReports] = useState<BanReport[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Blocked accounts state
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedAccount[]>([]);
  const [manualBans, setManualBans] = useState<any[]>([]);
  const [banForm, setBanForm] = useState({ target_uuid: "", ban_type: "full", duration_hours: "24", reason: "", banned_elements: [] as string[] });
  const [banLoading, setBanLoading] = useState(false);

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


  // Star gifts state
  const [starGifts, setStarGifts] = useState<StarGiftLog[]>([]);

  // Notifications state
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  // Statistics state
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  
  // Badge counts for notification sounds
  const prevBadgesRef = useRef<{ salary: number; support: number; total: number }>({ salary: 0, support: 0, total: 0 });

  // All requests state
   const [allRequestsFilter, setAllRequestsFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
   const [allRequestsSearch, setAllRequestsSearch] = useState("");
   const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
   const [allSalaryRequests, setAllSalaryRequests] = useState<SalaryRequest[]>([]);
   const [allEntryClaims, setAllEntryClaims] = useState<ClaimRecord[]>([]);
   const [allFrameClaims, setAllFrameClaims] = useState<ClaimRecord[]>([]);
   const [allAnimatedPhotos, setAllAnimatedPhotos] = useState<AnimatedPhotoRequest[]>([]);
   const [allCustomGifts, setAllCustomGifts] = useState<any[]>([]);
   const [customGiftFilter, setCustomGiftFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
   const [customGiftSearch, setCustomGiftSearch] = useState("");
   
   const [allQuickSupport, setAllQuickSupport] = useState<any[]>([]);
   const [allVipRequests, setAllVipRequests] = useState<any[]>([]);
   const [requestImagePreview, setRequestImagePreview] = useState<string | null>(null);
   const [allHairSelections, setAllHairSelections] = useState<any[]>([]);
   const [allIdChanges, setAllIdChanges] = useState<any[]>([]);
   type AllRequestsSubTab = "entries" | "frames" | "hairs" | "animated" | "id_changes" | "custom_gifts";
   const [allRequestsSubTab, setAllRequestsSubTab] = useState<AllRequestsSubTab>("entries");

  // Animated photos state
  const [animatedPhotos, setAnimatedPhotos] = useState<AnimatedPhotoRequest[]>([]);
  const [animatedPhotoFilter, setAnimatedPhotoFilter] = useState<"all" | "approved" | "pending" | "rejected">("pending");

  // Admin stars state
  const [adminStarUuid, setAdminStarUuid] = useState("");
  const [adminStarAmount, setAdminStarAmount] = useState("");
  const [adminStarLoading, setAdminStarLoading] = useState(false);


  const adminSessionToken = sessionStorage.getItem("admin_session_token");
  const adminUsername = sessionStorage.getItem("admin_username");
  const adminDisplayName = sessionStorage.getItem("admin_display_name") || adminUsername;
  const adminRole = sessionStorage.getItem("admin_role") as "owner" | "super_admin" | "admin" | "moderator" | null;
  const isOwner = adminRole === "owner";
  const isSuperAdmin = adminRole === "super_admin" || isOwner;
  const isRegularAdmin = adminRole === "admin";
  const adminPermissions: string[] = (() => {
    try { return JSON.parse(sessionStorage.getItem("admin_permissions") || "[]"); } catch { return []; }
  })();
  const isModeratorRole = adminRole === "moderator";

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
  const [ticketFilter, setTicketFilter] = useState("all");

  // Quick support state
  const [quickSupportRequests, setQuickSupportRequests] = useState<any[]>([]);

  // ID changes state
  const [idChanges, setIdChanges] = useState<any[]>([]);



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




  const loadStats = async () => {
    try {
      const [salary, reports, animated, customG, tickets, quickSupport, vipReqs, supportChatSessions] = await Promise.all([
        supabase.from("salary_requests").select("status"),
        supabase.from("ban_reports").select("is_verified"),
        supabase.from("animated_photo_requests").select("status"),
        supabase.from("custom_gifts").select("status").eq("is_deleted", false),
        supabase.from("support_tickets").select("status"),
        supabase.from("quick_support_requests").select("status"),
        supabase.from("vip_requests").select("id"),
        supabase.from("support_chat_sessions").select("status"),
      ]);
      
      // Also update quick support requests for badge count
      setQuickSupportRequests(prev => prev.length ? prev : (quickSupport.data || []));
      setAllCustomGifts(prev => prev.length ? prev : (customG.data || []));
      
      const salaryPending = salary.data?.filter(r => r.status === "pending").length || 0;
      const supportPending = (tickets.data?.filter(r => r.status === "open").length || 0) +
                            (quickSupport.data?.filter((r: any) => r.status === "pending").length || 0) +
                            (supportChatSessions.data?.filter((r: any) => r.status === "waiting").length || 0);
      
      const pending = salaryPending + 
                      (reports.data?.filter(r => !r.is_verified).length || 0) +
                      (animated.data?.filter(r => r.status === "pending").length || 0) +
                      (customG.data?.filter(r => r.status === "pending").length || 0) +
                      (tickets.data?.filter(r => r.status === "open").length || 0) +
                      (quickSupport.data?.filter((r: any) => r.status === "pending").length || 0);
      const approved = (salary.data?.filter(r => r.status === "approved").length || 0) +
                       (reports.data?.filter(r => r.is_verified).length || 0) +
                       (animated.data?.filter(r => r.status === "approved").length || 0) +
                       (customG.data?.filter(r => r.status === "approved").length || 0) +
                       (tickets.data?.filter(r => r.status === "replied" || r.status === "closed").length || 0) +
                       (quickSupport.data?.filter((r: any) => r.status === "resolved").length || 0) +
                       (vipReqs.data?.length || 0);
      const rejected = (salary.data?.filter(r => r.status === "rejected").length || 0) +
                       (animated.data?.filter(r => r.status === "rejected").length || 0) +
                       (customG.data?.filter(r => r.status === "rejected").length || 0);
      
      // Play notification sounds when new items arrive
      const prev = prevBadgesRef.current;
      if (prev.total > 0) { // Skip first load
        if (supportPending > prev.support) {
          playUrgentSound();
        } else if (salaryPending > prev.salary || pending > prev.total) {
          playNotificationSound();
        }
      }
      prevBadgesRef.current = { salary: salaryPending, support: supportPending, total: pending };
      
      setStats({ pending, approved, rejected });
    } catch (err) {
      console.error("فشل تحميل الإحصائيات", err);
    }
  };

  const adminCall = async (action: string, data: any = {}) => {
    const { data: result, error } = await supabase.functions.invoke("admin-manage", {
      body: { username: adminUsername, session_token: adminSessionToken, action, data },
    });
    
    // Check for auth errors in both error and result
    const authErrorMsg = "بيانات الدخول غير صحيحة";
    const isAuthError = result?.error === authErrorMsg || 
      (error && (error.message?.includes("401") || error.message?.includes(authErrorMsg)));
    
    if (isAuthError) {
      sessionStorage.removeItem("admin_session_token");
      sessionStorage.removeItem("admin_username");
      sessionStorage.removeItem("admin_role");
      sessionStorage.removeItem("admin_permissions");
      sessionStorage.removeItem("admin_api_token");
      toast.error("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى");
      navigate("/admin");
      return;
    }
    
    if (error) throw error;
    if (result?.error) {
      throw new Error(result.error);
    }
    return result?.data;
  };

  const uploadFile = async (file: File) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isVideo = ["mp4", "webm", "mov", "avi"].includes(ext);
    const isAsset = ext === "svga";
    const bucket = isVideo ? "videos" : "attachments";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    
    const defaultContentType = isAsset ? "application/octet-stream" : isVideo ? "video/mp4" : file.type || "application/octet-stream";
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: file.type || defaultContentType,
        upsert: false,
      });
    if (uploadError) throw new Error("فشل الرفع: " + uploadError.message);
    
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const loadData = async () => {
    if (!activeTab) return;
    setLoading(true);
    try {
      switch (activeTab) {
        case "videos": setVideos(await adminCall("list_videos")); break;
        case "salary": setSalaryRequests(await adminCall("list_salary_requests")); break;
        case "reports": setBanReports(await adminCall("list_ban_reports")); break;
        case "blocks": {
          const [blocked, bans] = await Promise.all([
            adminCall("list_blocked_accounts"),
            adminCall("list_manual_bans"),
          ]);
          setBlockedAccounts(blocked || []);
          setManualBans(bans || []);
          break;
        }
        case "entries": setEntryGifts(await adminCall("list_entry_gifts")); break;
        case "frames": setFrameItems(await adminCall("list_frames")); break;
        case "gifts": {
          setStarGifts(await adminCall("list_star_gifts") || []);
          break;
        }
        case "custom_gifts": {
          setAllCustomGifts(await adminCall("list_custom_gifts") || []);
          break;
        }
        case "all_requests": {
          const [sal, ec, fc, anim, customG, qs, vip, hs, idc] = await Promise.all([
            adminCall("list_salary_requests"),
            adminCall("list_entry_claims"),
            adminCall("list_frame_claims"),
            adminCall("list_animated_photos"),
            adminCall("list_custom_gifts"),
            supabase.from("quick_support_requests").select("*").order("created_at", { ascending: false }).then(r => r.data),
            supabase.from("vip_requests").select("*").order("created_at", { ascending: false }).then(r => r.data),
            supabase.from("hair_selections").select("*").order("created_at", { ascending: false }).then(r => r.data),
            supabase.from("id_changes").select("*").order("created_at", { ascending: false }).then(r => r.data),
          ]);
          setAllSalaryRequests(sal || []);
          setAllEntryClaims(ec || []);
          setAllFrameClaims(fc || []);
          setAllAnimatedPhotos(anim || []);
          setAllCustomGifts(customG || []);
          setAllQuickSupport(qs || []);
          setAllVipRequests(vip || []);
          setAllHairSelections(hs || []);
          setAllIdChanges(idc || []);
          break;
        }
        case "animated_photos": {
          setAnimatedPhotos(await adminCall("list_animated_photos") || []);
          break;
        }
        case "trash": {
          if (isOwner) {
            setTrashData(await adminCall("list_trash") || { videos: [], entries: [], frames: [], customs: [] });
          }
          break;
        }
        case "audit_log": {
          if (isOwner) {
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
    sessionStorage.removeItem("admin_display_name");
    sessionStorage.removeItem("admin_role");
    sessionStorage.removeItem("admin_permissions");
    sessionStorage.removeItem("admin_api_token");
    sessionStorage.removeItem("admin_shift_start");
    sessionStorage.removeItem("admin_shift_end");
    sessionStorage.removeItem("admin_phone");
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

  const saveVideoEdit = async (video: VideoTutorial) => {
    try {
      setUploadProgress(true);
      const updates: any = { id: video.id, title: editVideoData.title || video.title, description: editVideoData.description || null };
      if (editVideoFile) {
        if (editVideoFile.size > 100 * 1024 * 1024) { toast.error("حجم الفيديو يجب أن لا يتجاوز 100MB"); return; }
        updates.video_url = await uploadFile(editVideoFile);
      }
      await adminCall("update_video", updates);
      toast.success("تم تعديل الفيديو");
      setEditingVideo(null); setEditVideoFile(null);
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل التعديل"); }
    finally { setUploadProgress(false); }
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


  const updateBanReport = async (id: string, updates: Partial<BanReport>) => {
    try {
      await adminCall("update_ban_report", { id, ...updates });
      
      // If verifying (approving) a ban report, auto-ban the user via API
      if (updates.is_verified) {
        const report = banReports.find(r => r.id === id);
        if (report) {
          try {
            const rBanType = report.ban_type;
            const isPromotion = rBanType === "promotion" || rBanType === "ترويج";
            
            // Use admin-manage which is deployed and working
            const banResult = await adminCall("ban_user", {
              uuid: parseInt(report.reported_user_id),
              reason: report.description || rBanType,
              ban_type: isPromotion ? "promotion" : "normal",
              duration: isPromotion ? 999999 : 24,
            });
            
            if (banResult?.success || banResult?.ban_result) {
              toast.success("✅ تم حظر المستخدم تلقائياً");
            } else {
              toast.error("⚠️ تم تأكيد البلاغ لكن فشل الحظر التلقائي");
            }
          } catch (banErr) {
            console.error("Auto-ban failed:", banErr);
            toast.error("⚠️ تم تأكيد البلاغ لكن فشل الحظر التلقائي");
          }
        }
      }
      
      toast.success("تم التحديث");
      loadData();
    } catch {
      toast.error("فشل التحديث");
    }
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

  // Section definitions - filtered by role
  type SectionKey = "requests" | "settings" | "chat" | "finance";
  const ALL_SECTIONS: { id: SectionKey; title: string; description: string; icon: React.ReactNode; gradient: string; iconColor: string; tabs: Exclude<Tab, null>[]; roles: string[] }[] = [
    {
      id: "requests", title: "الطلبات والموافقات", description: "طلبات تحتاج موافقة",
      icon: <ClipboardList className="w-10 h-10" />, gradient: "from-blue-500/15 to-blue-600/5", iconColor: "text-blue-400",
      tabs: ["all_requests", "salary", "custom_gifts", "animated_photos", "id_changes", "reports", "manual_actions"],
      roles: ["owner", "super_admin"],
    },
    {
      id: "settings", title: "الإعدادات والإضافات", description: "إدارة المحتوى",
      icon: <Settings className="w-10 h-10" />, gradient: "from-violet-500/15 to-violet-600/5", iconColor: "text-violet-400",
      tabs: ["videos", "entries", "frames", "hairs", "gifts", "notifications", "banners", "admin_stars", "element_settings",
        ...(isOwner ? ["moderators" as Exclude<Tab, null>] : []),
        ...(isOwner ? ["trash" as Exclude<Tab, null>, "audit_log" as Exclude<Tab, null>] : []),
      ],
      roles: ["owner"],
    },
    {
      id: "chat", title: "الدردشة والدعم", description: "تواصل + مساعدة",
      icon: <MessageSquare className="w-10 h-10" />, gradient: "from-emerald-500/15 to-emerald-600/5", iconColor: "text-emerald-400",
      tabs: ["admin_chat", "admin_support", "support_tickets", "support_chats", "quick_support"],
      roles: ["owner", "super_admin", "admin"],
    },
    {
      id: "finance", title: "المالية والوكالات", description: "وكالات + رواتب",
      icon: <Wallet className="w-10 h-10" />, gradient: "from-amber-500/15 to-amber-600/5", iconColor: "text-amber-400",
      tabs: ["agencies", "top_agents", "bd_management", "blocks"],
      roles: ["owner"],
    },
  ];
  // Filter sections by role
  const SECTIONS = ALL_SECTIONS.filter(s => {
    if (isModeratorRole) return true; // moderators use permission-based filtering
    return adminRole ? s.roles.includes(adminRole) : false;
  });

  const allTabs: { key: Exclude<Tab, null>; label: string; icon: React.ReactNode; color: string; count?: number }[] = [
    { key: "admin_chat", label: "دردشة الإدارة", icon: <MessageSquare className="w-4 h-4" />, color: "text-emerald-400" },
    { key: "admin_support", label: "الدعم الفني", icon: <Headset className="w-4 h-4" />, color: "text-cyan-400" },
    { key: "manual_actions", label: "صلاحيات يدوية", icon: <Crown className="w-4 h-4" />, color: "text-amber-400" },
    { key: "all_requests", label: "جميع الطلبات", icon: <ClipboardList className="w-4 h-4" />, color: "text-blue-400", count: allSalaryRequests.filter(r => r.status === "pending").length + allEntryClaims.length + allFrameClaims.length },
    { key: "entries", label: "دخوليات", icon: <Sparkles className="w-4 h-4" />, color: "text-purple-400" },
    { key: "frames", label: "إطارات", icon: <Frame className="w-4 h-4" />, color: "text-blue-400" },
    { key: "hairs", label: "شعرات", icon: <Scissors className="w-4 h-4" />, color: "text-fuchsia-400" },
    { key: "gifts", label: "إهداءات نجوم", icon: <Gift className="w-4 h-4" />, color: "text-yellow-400" },
    { key: "custom_gifts", label: "هدايا مخصصة", icon: <Gift className="w-4 h-4" />, color: "text-pink-400", count: allCustomGifts.filter(g => g.status === "pending").length },
    { key: "salary", label: "رواتب", icon: <DollarSign className="w-4 h-4" />, color: "text-green-400", count: salaryRequests.filter(r => r.status === "pending").length },
    { key: "videos", label: "فيديوهات", icon: <Video className="w-4 h-4" />, color: "text-pink-400" },
    { key: "reports", label: "بلاغات", icon: <ShieldBan className="w-4 h-4" />, color: "text-red-400", count: banReports.filter(r => !r.is_verified).length },
    { key: "blocks", label: "محظورين", icon: <Ban className="w-4 h-4" />, color: "text-rose-400" },
    { key: "notifications", label: "إشعارات", icon: <Bell className="w-4 h-4" />, color: "text-cyan-400" },
    { key: "animated_photos", label: "صور متحركة", icon: <Camera className="w-4 h-4" />, color: "text-orange-400", count: animatedPhotos.filter(p => p.status === "pending").length },
    { key: "admin_stars", label: "منح نجوم", icon: <Star className="w-4 h-4" />, color: "text-amber-400" },
    { key: "support_tickets", label: "تذاكر الدعم", icon: <MessageSquare className="w-4 h-4" />, color: "text-sky-400", count: supportTickets.filter((t: any) => t.status === "open").length },
    { key: "support_chats", label: "شات VIP", icon: <Headset className="w-4 h-4" />, color: "text-rose-400", count: supportChats.filter((c: any) => c.status === "waiting").length },
    { key: "quick_support", label: "دعم سريع", icon: <Zap className="w-4 h-4" />, color: "text-yellow-400", count: quickSupportRequests.filter((r: any) => r.status === "pending").length },
    { key: "id_changes", label: "تغيير آيدي", icon: <Hash className="w-4 h-4" />, color: "text-indigo-400", count: idChanges.length },
    { key: "top_agents", label: "TOP وكلاء", icon: <Crown className="w-4 h-4" />, color: "text-amber-400" },
    { key: "bd_management", label: "إدارة BD", icon: <Briefcase className="w-4 h-4" />, color: "text-red-400" },
    { key: "element_settings", label: "إعدادات العناصر", icon: <Settings className="w-4 h-4" />, color: "text-slate-400" },
    { key: "banners", label: "بنرات", icon: <ImageIcon className="w-4 h-4" />, color: "text-teal-400" },
    { key: "agencies", label: "وكالات الشحن", icon: <Wallet className="w-4 h-4" />, color: "text-amber-400" },
    ...(isOwner ? [
      { key: "moderators" as Exclude<Tab, null>, label: "المسؤولين", icon: <Users className="w-4 h-4" />, color: "text-emerald-400" },
      { key: "trash" as Exclude<Tab, null>, label: "المحذوفات", icon: <Trash2 className="w-4 h-4" />, color: "text-gray-400", count: trashData.videos.length + trashData.entries.length + trashData.frames.length + trashData.customs.length },
      { key: "audit_log" as Exclude<Tab, null>, label: "سجل النشاطات", icon: <ScrollText className="w-4 h-4" />, color: "text-violet-400" },
    ] : []),
  ];
  const hasTabAccess = (key: string) => adminPermissions.includes(key) || adminPermissions.includes(`${key}:view`);
  const isTabViewOnly = (key: string) => adminPermissions.includes(`${key}:view`) && !adminPermissions.includes(key);
  const tabs = isModeratorRole ? allTabs.filter(t => hasTabAccess(t.key)) : allTabs;
  const canAct = !isModeratorRole || (activeTab ? !isTabViewOnly(activeTab) : true);

  // Get current section's tabs for chip navigation
  const currentSectionDef = SECTIONS.find(s => s.id === activeSection);
  const currentSectionTabs = currentSectionDef
    ? tabs.filter(t => currentSectionDef.tabs.includes(t.key))
    : [];

  // Calculate pending count per section for badges
  const getSectionBadge = (sectionId: SectionKey) => {
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return 0;
    return section.tabs.reduce((sum, tabKey) => {
      const tab = allTabs.find(t => t.key === tabKey);
      return sum + (tab?.count || 0);
    }, 0);
  };

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
                {canAct && <>
                  <button onClick={startEdit} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-primary" /></button>
                  <button onClick={toggleActive} className="p-1.5 rounded-lg hover:bg-muted">
                    {item.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">{item.video_url || item.file_url}</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="mobile-container" style={{ background: "#09090b" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 px-4 py-3" style={{ background: "rgba(9,9,11,0.92)" }}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            {(activeTab || activeSection) ? (
              <button onClick={() => {
                if (activeTab) { setActiveTab(null); setActiveSection(null); }
                else { setActiveSection(null); }
              }} className="p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </button>
            ) : (
              <Shield className="w-5 h-5 text-primary" />
            )}
            <div>
              <h1 className="font-bold text-lg tracking-tight text-foreground">
                {activeTab ? tabs.find(t => t.key === activeTab)?.label
                  : activeSection ? currentSectionDef?.title
                  : "لوحة التحكم"}
              </h1>
              {!activeTab && !activeSection && (
                <p className="text-[10px] text-muted-foreground">مرحباً، {adminDisplayName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">Owner</span>
            )}
            {adminRole === "super_admin" && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">سوبر أدمن</span>
            )}
            {adminRole === "admin" && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">أدمن</span>
            )}
            <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto min-h-0">
      {/* Home — 4 Section Cards */}
      {!activeTab && !activeSection && (
        <div className="max-w-2xl mx-auto p-4 space-y-5">
          {/* Statistics Cards */}
          <div className="grid grid-cols-3 gap-3" dir="rtl">
            {[
              { label: "معلقة", value: stats.pending, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5", onClick: () => { setAllRequestsFilter("pending"); setActiveSection("requests"); setActiveTab("all_requests"); } },
              { label: "مقبولة", value: stats.approved, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", onClick: () => { setAllRequestsFilter("approved"); setActiveSection("requests"); setActiveTab("all_requests"); } },
              { label: "مرفوضة", value: stats.rejected, color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5", onClick: () => { setAllRequestsFilter("rejected"); setActiveSection("requests"); setActiveTab("all_requests"); } },
            ].map((card, i) => (
              <motion.button
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                whileTap={{ scale: 0.97 }}
                onClick={card.onClick}
                className={`p-4 rounded-2xl border ${card.border} ${card.bg} backdrop-blur-sm hover:border-white/10 transition-all duration-300 cursor-pointer`}
              >
                <p className="text-[10px] text-muted-foreground mb-1">{card.label}</p>
                <p className={`text-3xl font-bold font-mono tabular-nums ${card.color}`}>{card.value}</p>
              </motion.button>
            ))}
          </div>

          {/* 4 Section Cards */}
          <div className="grid grid-cols-2 gap-3" dir="rtl">
            {SECTIONS.map((section, i) => {
              const badge = getSectionBadge(section.id);
              // Filter section tabs by moderator access
              const visibleTabs = isModeratorRole
                ? section.tabs.filter(tabKey => hasTabAccess(tabKey))
                : section.tabs;
              if (visibleTabs.length === 0) return null;
              return (
                <motion.button
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01, borderColor: "rgba(255,255,255,0.12)" }}
                  onClick={() => {
                    setActiveSection(section.id);
                    setActiveTab(visibleTabs[0]);
                  }}
                  className={`relative bg-gradient-to-br ${section.gradient} border border-white/5 rounded-3xl p-5 text-right hover:border-white/10 transition-all duration-300`}
                >
                  <div className={section.iconColor}>{section.icon}</div>
                  <h3 className="text-base font-bold text-foreground mt-3">{section.title}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">{section.description}</p>
                  {badge > 0 && (
                    <span className="absolute top-3 left-3 inline-flex items-center justify-center min-w-5 h-5 px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                      {badge}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section Tab Chips + Content */}
      {activeSection && !activeTab && (
        <div className="max-w-2xl mx-auto p-4">
          <p className="text-sm text-muted-foreground text-center py-10">اختر تبويباً</p>
        </div>
      )}
      {activeTab && activeSection && (
        <div className="max-w-2xl mx-auto">
          {/* Tab chips */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {(currentSectionDef?.tabs || []).map(tabKey => {
                const tabDef = tabs.find(t => t.key === tabKey);
                if (!tabDef) return null;
                const isActive = activeTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    onClick={() => {
                      const sectionTabs = currentSectionDef?.tabs || [];
                      const oldIdx = sectionTabs.indexOf(activeTab as any);
                      const newIdx = sectionTabs.indexOf(tabKey);
                      setTabDirection(newIdx >= oldIdx ? 1 : -1);
                      setActiveTab(tabKey);
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-1 min-w-[56px] px-3 py-2 rounded-2xl text-[10px] font-medium whitespace-nowrap transition-all duration-200",
                      isActive
                        ? "bg-white/10 text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-xl transition-colors",
                      isActive ? "bg-primary/20 text-primary" : "text-muted-foreground"
                    )}>
                      {React.cloneElement(tabDef.icon as React.ReactElement, { className: "w-[18px] h-[18px]" })}
                    </span>
                    <span className="leading-tight">{tabDef.label}</span>
                    {tabDef.count && tabDef.count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full">
                        {tabDef.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Stats Cards */}
          {activeSection === "requests" && (
            <div className="grid grid-cols-3 gap-3 px-4 mb-4">
              {[
                { label: "معلقة", value: stats.pending, icon: Clock, gradient: "from-amber-500/10 to-amber-600/5", border: "border-amber-500/20", iconColor: "text-amber-400" },
                { label: "مقبولة اليوم", value: stats.approved, icon: CheckCircle, gradient: "from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/20", iconColor: "text-emerald-400" },
                { label: "مرفوضة اليوم", value: stats.rejected, icon: XCircle, gradient: "from-rose-500/10 to-rose-600/5", border: "border-rose-500/20", iconColor: "text-rose-400" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn("bg-gradient-to-br rounded-2xl p-4 border", stat.gradient, stat.border)}
                >
                  <stat.icon className={cn("w-5 h-5 mb-2", stat.iconColor)} />
                  <p className="text-2xl font-bold font-mono">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeSection === "settings" && (
            <div className="grid grid-cols-3 gap-3 px-4 mb-4">
              {[
                { label: "إجمالي", value: entryGifts.length + frameItems.length + videos.length, icon: Package, gradient: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20", iconColor: "text-blue-400" },
                { label: "نشطة", value: entryGifts.filter(g => g.is_active).length + frameItems.filter(f => f.is_active).length + videos.filter(v => v.is_active).length, icon: CheckCircle, gradient: "from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/20", iconColor: "text-emerald-400" },
                { label: "معطلة", value: entryGifts.filter(g => !g.is_active).length + frameItems.filter(f => !f.is_active).length + videos.filter(v => !v.is_active).length, icon: Ban, gradient: "from-rose-500/10 to-rose-600/5", border: "border-rose-500/20", iconColor: "text-rose-400" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn("bg-gradient-to-br rounded-2xl p-4 border", stat.gradient, stat.border)}
                >
                  <stat.icon className={cn("w-5 h-5 mb-2", stat.iconColor)} />
                  <p className="text-2xl font-bold font-mono">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeSection === "chat" && (
            <div className="grid grid-cols-3 gap-3 px-4 mb-4">
              {[
                { label: "تذاكر مفتوحة", value: supportTickets.filter((t: any) => t.status === "open").length, icon: MessageSquare, gradient: "from-sky-500/10 to-sky-600/5", border: "border-sky-500/20", iconColor: "text-sky-400" },
                { label: "VIP انتظار", value: supportChats.filter((c: any) => c.status === "waiting").length, icon: Headset, gradient: "from-rose-500/10 to-rose-600/5", border: "border-rose-500/20", iconColor: "text-rose-400" },
                { label: "دعم معلق", value: quickSupportRequests.filter((r: any) => r.status === "pending").length, icon: Zap, gradient: "from-yellow-500/10 to-yellow-600/5", border: "border-yellow-500/20", iconColor: "text-yellow-400" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn("bg-gradient-to-br rounded-2xl p-4 border", stat.gradient, stat.border)}
                >
                  <stat.icon className={cn("w-5 h-5 mb-2", stat.iconColor)} />
                  <p className="text-2xl font-bold font-mono">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          <div className="px-4 pb-4 overflow-hidden">
      {loading ? (
        <div className="space-y-3 py-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card/50 border border-white/5 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
          <AnimatePresence mode="wait" custom={tabDirection}>

            {/* Videos Tab */}
            {activeTab === "videos" && (
              <motion.div key="videos" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">
                {canAct && <Button onClick={() => setShowAddVideo(!showAddVideo)} className="w-full" variant={showAddVideo ? "outline" : "default"}>
                  {showAddVideo ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><Plus className="w-4 h-4 ml-2" />إضافة فيديو</>}
                </Button>}
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
                    {editingVideo === video.id ? (
                      <div className="space-y-3">
                        <Input placeholder="عنوان الفيديو" value={editVideoData.title} onChange={(e) => setEditVideoData({ ...editVideoData, title: e.target.value })} />
                        <Input placeholder="وصف (اختياري)" value={editVideoData.description} onChange={(e) => setEditVideoData({ ...editVideoData, description: e.target.value })} />
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">استبدال الفيديو (اختياري)</label>
                          <input type="file" accept="video/*" onChange={(e) => setEditVideoFile(e.target.files?.[0] || null)} className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary" />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => saveVideoEdit(video)} disabled={uploadProgress} size="sm" className="flex-1">
                            {uploadProgress ? <><Loader2 className="w-3 h-3 ml-1 animate-spin" />جاري الحفظ...</> : <><Save className="w-3 h-3 ml-1" />حفظ</>}
                          </Button>
                          <Button onClick={() => { setEditingVideo(null); setEditVideoFile(null); }} variant="outline" size="sm">إلغاء</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm">{video.title}</h3>
                          <div className="flex items-center gap-1">
                            {canAct && <>
                              <button onClick={() => { setEditingVideo(video.id); setEditVideoData({ title: video.title, description: video.description || "" }); setEditVideoFile(null); }} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-primary" /></button>
                              <button onClick={() => toggleVideoActive(video)} className="p-1.5 rounded-lg hover:bg-muted">
                                {video.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                              </button>
                              <button onClick={() => deleteVideo(video.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                            </>}
                          </div>
                        </div>
                        {video.description && <p className="text-xs text-muted-foreground">{video.description}</p>}
                        <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">{video.video_url}</p>
                      </>
                    )}
                  </div>
                ))}
                {videos.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><Video className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد فيديوهات</p></div>
                )}
              </motion.div>
            )}

            {/* Salary Tab */}
            {activeTab === "salary" && (
              <motion.div key="salary" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-3">
                {/* Sub-tabs */}
                <div className="flex gap-1 bg-[#1c1e2e] rounded-xl p-1 border border-white/10">
                  <button
                    onClick={() => setSalarySubTab("requests")}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${salarySubTab === "requests" ? "bg-primary text-primary-foreground" : "text-slate-400 hover:text-white"}`}
                  >
                    طلبات الرواتب
                  </button>
                  <button
                    onClick={() => setSalarySubTab("withdraw")}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${salarySubTab === "withdraw" ? "bg-primary text-primary-foreground" : "text-slate-400 hover:text-white"}`}
                  >
                    سحب الرواتب
                  </button>
                  <button
                    onClick={() => setSalarySubTab("charge")}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${salarySubTab === "charge" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    شحن الراتب
                  </button>
                </div>

                {salarySubTab === "requests" && (
                  <div className="space-y-3">
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
                            {canAct && req.status === "pending" && salaryAction?.id !== req.id && (
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
                                  <span className="text-destructive font-bold">رفض نهائي (لا يمكن للمستخدم التعديل)</span>
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
                  </div>
                )}

                {salarySubTab === "withdraw" && (
                  <AdminSalaryWithdrawManager canAct={canAct} />
                )}

                {salarySubTab === "charge" && (
                  <AdminSalaryChargeManager canAct={canAct} />
                )}
              </motion.div>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <motion.div key="reports" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-3">
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
                        {canAct && !report.is_verified && (
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
              <motion.div key="blocks" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">
                {/* Ban Form */}
                {canAct && (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><ShieldBan className="w-4 h-4 text-destructive" /> حظر مستخدم</h3>
                    <Input
                      placeholder="UUID المستخدم"
                      value={banForm.target_uuid}
                      onChange={(e) => setBanForm(prev => ({ ...prev, target_uuid: e.target.value }))}
                      className="font-mono text-sm"
                      dir="ltr"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBanForm(prev => ({ ...prev, ban_type: "full", banned_elements: [] }))}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${banForm.ban_type === "full" ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground"}`}
                      >
                        🚫 حظر كامل
                      </button>
                      <button
                        onClick={() => setBanForm(prev => ({ ...prev, ban_type: "elements", banned_elements: [] }))}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${banForm.ban_type === "elements" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                      >
                        🧩 حظر عناصر
                      </button>
                    </div>
                    {banForm.ban_type === "elements" && (
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">اختر العناصر المراد حظرها:</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { key: "entries", label: "🎁 دخوليات" },
                            { key: "frames", label: "🖼️ إطارات" },
                            { key: "gifts", label: "🎀 هدايا مخصصة" },
                            { key: "animated_photos", label: "📸 صور متحركة" },
                            { key: "change_id", label: "🔄 تغيير آيدي" },
                            { key: "hairs", label: "💇 تسريحات" },
                            { key: "vip", label: "⭐ VIP" },
                            { key: "salary", label: "💰 رواتب" },
                            { key: "quick_support", label: "🎧 دعم سريع" },
                            { key: "works", label: "💼 works" },
                            { key: "stars", label: "🌟 نجومي" },
                          ].map((el) => (
                            <button
                              key={el.key}
                              onClick={() => {
                                setBanForm(prev => ({
                                  ...prev,
                                  banned_elements: prev.banned_elements.includes(el.key)
                                    ? prev.banned_elements.filter(e => e !== el.key)
                                    : [...prev.banned_elements, el.key],
                                }));
                              }}
                              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-colors ${
                                banForm.banned_elements.includes(el.key)
                                  ? "border-destructive bg-destructive/10 text-destructive"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {el.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">مدة الحظر (بالساعات)</label>
                      <Input
                        type="number"
                        placeholder="24"
                        value={banForm.duration_hours}
                        onChange={(e) => setBanForm(prev => ({ ...prev, duration_hours: e.target.value }))}
                        min="1"
                        dir="ltr"
                      />
                    </div>
                    <Input
                      placeholder="سبب الحظر (اختياري)"
                      value={banForm.reason}
                      onChange={(e) => setBanForm(prev => ({ ...prev, reason: e.target.value }))}
                    />
                    <Button
                      className="w-full"
                      variant="destructive"
                      disabled={banLoading || !banForm.target_uuid.trim()}
                      onClick={async () => {
                        setBanLoading(true);
                        try {
                          await adminCall("manual_ban_user", {
                            target_uuid: banForm.target_uuid.trim(),
                            ban_type: banForm.ban_type,
                            duration_hours: parseInt(banForm.duration_hours) || 24,
                            reason: banForm.reason.trim(),
                            banned_elements: banForm.ban_type === "elements" ? banForm.banned_elements : null,
                          });
                          toast.success("تم حظر المستخدم بنجاح");
                          setBanForm({ target_uuid: "", ban_type: "full", duration_hours: "24", reason: "", banned_elements: [] });
                          loadData();
                        } catch (err: any) {
                          toast.error(err?.message || "فشل الحظر");
                        } finally {
                          setBanLoading(false);
                        }
                      }}
                    >
                      {banLoading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Ban className="w-4 h-4 ml-1" />}
                      تنفيذ الحظر
                    </Button>
                  </div>
                )}

                {/* Manual Bans List */}
                {manualBans.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-foreground mt-4">عمليات الحظر ({manualBans.length})</h3>
                    {manualBans.map((ban) => (
                      <div key={ban.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm font-mono" dir="ltr">{ban.target_uuid}</p>
                            <p className="text-xs text-muted-foreground">
                              {ban.ban_type === "full" ? "🚫 حظر كامل" : ban.ban_type === "elements" ? "🧩 حظر عناصر" : ban.ban_type === "promotion" ? "حظر ترويج" : "حظر"} • {ban.duration_hours === 999999 ? "أبدي" : `${ban.duration_hours} ساعة`}
                            </p>
                            {ban.ban_type === "elements" && ban.banned_elements && ban.banned_elements.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {ban.banned_elements.map((el: string) => {
                                  const labels: Record<string, string> = { entries: "دخوليات", frames: "إطارات", gifts: "هدايا", animated_photos: "صور متحركة", change_id: "تغيير آيدي", hairs: "تسريحات", vip: "VIP", salary: "رواتب", quick_support: "دعم سريع", works: "works", stars: "نجومي" };
                                  return <span key={el} className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-bold">{labels[el] || el}</span>;
                                })}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${ban.status === "active" ? "bg-destructive/20 text-destructive" : "bg-green-500/20 text-green-500"}`}>
                            {ban.status === "active" ? "فعال" : "ملغي"}
                          </span>
                        </div>
                        {ban.reason && <p className="text-xs text-muted-foreground">السبب: {ban.reason}</p>}
                        <div className="text-[10px] text-muted-foreground">
                          بواسطة: {ban.banned_by} • {new Date(ban.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {ban.unbanned_at && (
                          <div className="text-[10px] text-green-500">
                            تم فك الحظر بواسطة: {ban.unbanned_by} • {new Date(ban.unbanned_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                        {canAct && ban.status === "active" && (
                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={async () => {
                              try {
                                await adminCall("unban_manual", { ban_id: ban.id });
                                toast.success("تم فك الحظر");
                                loadData();
                              } catch { toast.error("فشل فك الحظر"); }
                            }}
                          >
                            <Unlock className="w-4 h-4 ml-1" />فك الحظر
                          </Button>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* Login blocked accounts */}
                {blockedAccounts.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-foreground mt-4">حسابات محظورة تسجيل دخول ({blockedAccounts.length})</h3>
                    {blockedAccounts.map((acc) => (
                      <div key={acc.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
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
                        {canAct && (acc.is_permanently_blocked || acc.blocked_until) && (
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => unblockAccount(acc.target_uuid)}>
                            <Unlock className="w-4 h-4 ml-1" />فك الحظر
                          </Button>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {blockedAccounts.length === 0 && manualBans.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><Ban className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد حسابات محظورة</p></div>
                )}
              </motion.div>
            )}

            {/* Entries Tab */}
            {activeTab === "entries" && (
              <motion.div key="entries" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">
                {canAct && <Button onClick={() => setShowAddEntry(!showAddEntry)} className="w-full" variant={showAddEntry ? "outline" : "default"}>
                  {showAddEntry ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><Plus className="w-4 h-4 ml-2" />إضافة دخولية</>}
                </Button>}
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
              <motion.div key="frames" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">
                {canAct && <Button onClick={() => setShowAddFrame(!showAddFrame)} className="w-full" variant={showAddFrame ? "outline" : "default"}>
                  {showAddFrame ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><Plus className="w-4 h-4 ml-2" />إضافة إطار</>}
                </Button>}
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

            {/* Star Gifts Tab */}
            {activeTab === "gifts" && (
              <motion.div key="gifts" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-3">
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
              <motion.div key="all_requests" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">
                {/* Sub-tab Navigation */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {([
                    { key: "entries" as AllRequestsSubTab, label: "دخوليات", icon: "🚪" },
                    { key: "frames" as AllRequestsSubTab, label: "إطارات", icon: "🖼" },
                    { key: "hairs" as AllRequestsSubTab, label: "شعارات", icon: "💇" },
                    { key: "animated" as AllRequestsSubTab, label: "صور متحركة", icon: "📸" },
                    { key: "id_changes" as AllRequestsSubTab, label: "تغيير آيدي", icon: "🔄" },
                    { key: "custom_gifts" as AllRequestsSubTab, label: "هدية مخصصة", icon: "🎁" },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => { setAllRequestsSubTab(tab.key); setAllRequestsFilter("all"); }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        allRequestsSubTab === tab.key
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
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
                      {f === "all" ? "الكل" : f === "pending" ? "معلقة" : f === "approved" ? "مقبولة" : "مرفوضة"}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div>
                  <Input
                    type="text"
                    placeholder="ابحث باسم المستخدم أو UUID..."
                    value={allRequestsSearch}
                    onChange={(e) => setAllRequestsSearch(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* ===== ENTRIES SUB-TAB ===== */}
                {allRequestsSubTab === "entries" && (() => {
                  const filtered = allEntryClaims.filter(c =>
                    allRequestsFilter === "all" || allRequestsFilter === "approved"
                  );
                  const searched = filtered.filter(c =>
                    allRequestsSearch === "" ||
                    c.user_uuid.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    c.id.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  if (allRequestsFilter === "pending" || allRequestsFilter === "rejected") {
                    return (
                      <div className="text-center py-10 text-muted-foreground">
                        <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">الدخوليات تتم تلقائياً - لا توجد طلبات {allRequestsFilter === "pending" ? "معلقة" : "مرفوضة"}</p>
                      </div>
                    );
                  }
                  return searched.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" /> طلبات دخوليات ({searched.length})
                      </h3>
                      {searched.map((claim) => (
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
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>لا توجد طلبات دخوليات</p>
                    </div>
                  );
                })()}

                {/* ===== FRAMES SUB-TAB ===== */}
                {allRequestsSubTab === "frames" && (() => {
                  const filtered = allFrameClaims.filter(c =>
                    allRequestsFilter === "all" || allRequestsFilter === "approved"
                  );
                  const searched = filtered.filter(c =>
                    allRequestsSearch === "" ||
                    c.user_uuid.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    c.id.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  if (allRequestsFilter === "pending" || allRequestsFilter === "rejected") {
                    return (
                      <div className="text-center py-10 text-muted-foreground">
                        <Frame className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">الإطارات تتم تلقائياً - لا توجد طلبات {allRequestsFilter === "pending" ? "معلقة" : "مرفوضة"}</p>
                      </div>
                    );
                  }
                  return searched.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Frame className="w-4 h-4 text-blue-500" /> طلبات إطارات ({searched.length})
                      </h3>
                      {searched.map((claim) => (
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
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Frame className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>لا توجد طلبات إطارات</p>
                    </div>
                  );
                })()}

                {/* ===== HAIRS SUB-TAB ===== */}
                {allRequestsSubTab === "hairs" && (() => {
                  const filtered = allHairSelections.filter((h: any) => {
                    if (allRequestsFilter === "all") return true;
                    if (allRequestsFilter === "approved") return h.status === "approved";
                    if (allRequestsFilter === "rejected") return h.status === "rejected";
                    return h.status === "pending";
                  });
                  const searched = filtered.filter((h: any) =>
                    allRequestsSearch === "" ||
                    h.user_uuid?.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    h.id?.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  return searched.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-pink-500" /> طلبات شعارات ({searched.length})
                      </h3>
                      {searched.map((sel: any) => (
                        <div key={sel.id} className="bg-card border rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sel.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                                sel.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                              }`}>
                                {sel.status === "pending" ? "معلق" : sel.status === "approved" ? "مقبول" : "مرفوض"}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(sel.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{sel.user_uuid}</span></div>
                            <div><span className="text-muted-foreground">الأسبوع:</span> {sel.selection_week}</div>
                            {sel.admin_note && <div className="col-span-2"><span className="text-muted-foreground">ملاحظة:</span> {sel.admin_note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Scissors className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>لا توجد طلبات شعارات</p>
                    </div>
                  );
                })()}

                {/* ===== ANIMATED PHOTOS SUB-TAB ===== */}
                {allRequestsSubTab === "animated" && (() => {
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
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>لا توجد صور متحركة</p>
                    </div>
                  );
                })()}

                {/* ===== ID CHANGES SUB-TAB ===== */}
                {allRequestsSubTab === "id_changes" && (() => {
                  // ID changes are auto-completed, only show in all/approved
                  if (allRequestsFilter === "pending" || allRequestsFilter === "rejected") {
                    return (
                      <div className="text-center py-10 text-muted-foreground">
                        <Hash className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">تغيير الآيدي يتم تلقائياً - لا توجد طلبات {allRequestsFilter === "pending" ? "معلقة" : "مرفوضة"}</p>
                      </div>
                    );
                  }
                  const searched = allIdChanges.filter((c: any) =>
                    allRequestsSearch === "" ||
                    c.user_uuid?.toLowerCase().includes(allRequestsSearch.toLowerCase()) ||
                    c.new_id?.toLowerCase().includes(allRequestsSearch.toLowerCase())
                  );
                  return searched.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Hash className="w-4 h-4 text-cyan-500" /> تغيير آيدي ({searched.length})
                      </h3>
                      {searched.map((change: any) => (
                        <div key={change.id} className="bg-card border rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500">تم</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(change.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-[10px]">{change.user_uuid}</span></div>
                            <div><span className="text-muted-foreground">الآيدي الجديد:</span> <span className="font-mono text-[10px]">{change.new_id}</span></div>
                            <div><span className="text-muted-foreground">مستوى:</span> {change.level_milestone}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Hash className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>لا توجد تغييرات آيدي</p>
                    </div>
                  );
                })()}

                {/* ===== CUSTOM GIFTS SUB-TAB ===== */}
                {allRequestsSubTab === "custom_gifts" && (() => {
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
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Gift className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>لا توجد هدايا مخصصة</p>
                    </div>
                  );
                })()}

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
              <motion.div key="notifications" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">
                {canAct ? (
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
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>وضع المشاهدة فقط - لا يمكنك إرسال إشعارات</p>
                  </div>
                )}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-xs text-blue-600 leading-relaxed">
                    💡 الإشعارات العامة سيتم إرسالها لجميع المستخدمين المتصلين وسيراها عند فتح صفحة الإشعارات أو عند وصول إشعار جديد.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "admin_stars" && (
              <motion.div key="admin_stars" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">
                {canAct ? (
                  <>
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
                  </>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <Star className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>وضع المشاهدة فقط - لا يمكنك منح نجوم</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Custom Gifts Tab */}
            {activeTab === "custom_gifts" && (
              <motion.div key="custom_gifts" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-3">
                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all" as const, label: "الكل", count: allCustomGifts.length, color: "bg-muted/30" },
                    { key: "approved" as const, label: "مقبولة", count: allCustomGifts.filter(g => g.status === "approved").length, color: "bg-emerald-500/10 border-emerald-500/30" },
                    { key: "pending" as const, label: "معلقة", count: allCustomGifts.filter(g => g.status === "pending").length, color: "bg-yellow-500/10 border-yellow-500/30" },
                    { key: "rejected" as const, label: "مرفوضة", count: allCustomGifts.filter(g => g.status === "rejected").length, color: "bg-red-500/10 border-red-500/30" },
                  ].map(f => (
                    <button key={f.key} onClick={() => setCustomGiftFilter(f.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${customGiftFilter === f.key ? "ring-2 ring-primary/50 " + f.color : "bg-card border-border/40"}`}>
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
                {/* Search */}
                <input value={customGiftSearch} onChange={e => setCustomGiftSearch(e.target.value)} placeholder="بحث بالاسم أو UUID..."
                  className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border/40 text-sm" dir="rtl" />
                {(() => {
                  const filtered = allCustomGifts.filter(g => customGiftFilter === "all" || g.status === customGiftFilter);
                  const searched = filtered.filter(g =>
                    customGiftSearch === "" ||
                    g.user_name?.toLowerCase().includes(customGiftSearch.toLowerCase()) ||
                    g.user_uuid?.toLowerCase().includes(customGiftSearch.toLowerCase()) ||
                    g.title?.toLowerCase().includes(customGiftSearch.toLowerCase())
                  );
                  return searched.length > 0 ? (
                    <div className="space-y-2">
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
                          {gift.video_url && (
                            <a href={gift.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline mt-1 inline-block">عرض الفيديو</a>
                          )}
                          {gift.admin_note && (
                            <p className="text-[10px] text-muted-foreground mt-1">ملاحظة: {gift.admin_note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Gift className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>لا توجد هدايا مخصصة</p>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* Animated Photos Tab */}
            {activeTab === "animated_photos" && (
              <motion.div key="animated_photos" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-3">
                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all" as const, label: "الكل", count: animatedPhotos.length, color: "bg-muted/30" },
                    { key: "approved" as const, label: "مقبولة", count: animatedPhotos.filter(p => p.status === "approved").length, color: "bg-emerald-500/10 border-emerald-500/30" },
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
                            {photo.status === "pending" ? "معلق" : photo.status === "approved" ? "موافق تلقائياً" : "مرفوض"}
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
                      {canAct && photo.status === "pending" && (
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
                            <span className="text-destructive font-bold">رفض نهائي</span>
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

            {/* TOP Agents Tab */}
            {activeTab === "top_agents" && (
              <motion.div key="top_agents" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminTopAgents readOnly={isModeratorRole && isTabViewOnly("top_agents")} />
              </motion.div>
            )}

            {/* BD Management Tab */}
            {activeTab === "bd_management" && (
              <motion.div key="bd_management" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminBDManager readOnly={isModeratorRole && isTabViewOnly("bd_management")} />
              </motion.div>
            )}

            {/* Element Settings Tab */}
            {activeTab === "element_settings" && (
              <motion.div key="element_settings" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminElementSettings readOnly={isModeratorRole && isTabViewOnly("element_settings")} adminUsername={adminUsername || ""} />
              </motion.div>
            )}

            {/* Banners Tab */}
            {activeTab === "banners" && (
              <motion.div key="banners" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminBannerManager adminSessionToken={adminSessionToken!} adminUsername={adminUsername!} readOnly={isModeratorRole && isTabViewOnly("banners")} />
              </motion.div>
            )}

            {/* Moderators Management Tab */}
            {activeTab === "moderators" && (adminRole === "super_admin" || adminRole === "admin") && (
              <motion.div key="moderators" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminModeratorManager adminCall={adminCall} />
              </motion.div>
            )}


            {/* Trash Tab - Super Admin Only */}
            {activeTab === "trash" && adminRole === "super_admin" && (
              <motion.div key="trash" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-6">
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




            {/* Admin Group Chat Tab */}
            {activeTab === "admin_chat" && (
              <motion.div key="admin_chat" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminGroupChat adminUsername={adminUsername || ''} adminRole={adminRole} />
              </motion.div>
            )}

            {/* Admin Support Tab */}
            {activeTab === "admin_support" && (
              <motion.div key="admin_support" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminSupportManager adminUsername={adminUsername || ''} adminDisplayName={adminDisplayName || ''} canAct={canAct} />
              </motion.div>
            )}

            {/* Manual Actions Tab */}
            {activeTab === "manual_actions" && (
              <motion.div key="manual_actions" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminManualActions adminUsername={adminUsername || ''} />
              </motion.div>
            )}

            {/* Support Tickets Tab */}
            {activeTab === "support_tickets" && (
              <motion.div key="support_tickets" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-3">
                {/* Filter */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all", label: "الكل", count: supportTickets.length },
                    { key: "open", label: "مفتوحة", count: supportTickets.filter((t: any) => t.status === "open").length },
                    { key: "replied", label: "تم الرد", count: supportTickets.filter((t: any) => t.status === "replied").length },
                    { key: "closed", label: "مغلقة", count: supportTickets.filter((t: any) => t.status === "closed").length },
                  ].map(f => (
                    <button key={f.key} onClick={() => setTicketFilter(f.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${ticketFilter === f.key ? "ring-2 ring-primary/50 bg-primary/10 border-primary" : "bg-card border-border/40"}`}>
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
                {supportTickets
                  .filter((t: any) => ticketFilter === "all" || t.status === ticketFilter)
                  .length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد تذاكر</p>
                  </div>
                ) : supportTickets
                  .filter((t: any) => ticketFilter === "all" || t.status === ticketFilter)
                  .map((ticket: any) => (
                  <div key={ticket.id} className="bg-card border rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)} className="w-full p-4 flex items-center justify-between text-right">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          ticket.status === "open" ? "bg-amber-500/20 text-amber-500" :
                          ticket.status === "replied" ? "bg-emerald-500/20 text-emerald-500" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {ticket.status === "open" ? "مفتوح" : ticket.status === "replied" ? "تم الرد" : "مغلق"}
                        </span>
                        <div>
                          <p className="font-bold text-sm">{ticket.user_name}</p>
                          <p className="text-xs text-muted-foreground">{ticket.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString("ar-EG")}</span>
                        {expandedTicket === ticket.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    {expandedTicket === ticket.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        <div className="text-xs space-y-1">
                          <p><span className="text-muted-foreground">UUID:</span> <span className="font-mono">{ticket.user_uuid}</span></p>
                          <p><span className="text-muted-foreground">الوصف:</span> {ticket.description}</p>
                          <p><span className="text-muted-foreground">التاريخ:</span> {new Date(ticket.created_at).toLocaleString("ar-EG")}</p>
                        </div>
                        {/* Replies */}
                        <TicketRepliesSection ticket={ticket} canAct={canAct} adminUsername={adminUsername} onUpdate={() => loadData()} />
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* Quick Support Tab */}
            {activeTab === "quick_support" && (
              <motion.div key="quick_support" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-3">
                {/* Filter + Search */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all", label: "الكل", count: quickSupportRequests.length },
                    { key: "pending", label: "معلقة", count: quickSupportRequests.filter((r: any) => r.status === "pending").length },
                    { key: "resolved", label: "أرشيف", count: quickSupportRequests.filter((r: any) => r.status === "resolved").length },
                  ].map(f => (
                    <button key={f.key} onClick={() => {
                      const el = document.getElementById('qs-filter') as HTMLInputElement;
                      if (el) el.dataset.filter = f.key;
                      // Use a state-like approach with data attributes for simplicity
                      setQuickSupportRequests(prev => [...prev]); // trigger re-render
                    }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all bg-card border-border/40`}>
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="🔍 بحث بالاسم أو UUID..."
                  onChange={(e) => {
                    const el = document.getElementById('qs-search') as HTMLInputElement;
                    if (el) el.value = e.target.value;
                    setQuickSupportRequests(prev => [...prev]);
                  }}
                  className="text-sm"
                  dir="rtl"
                />
                {(() => {
                  const searchEl = document.getElementById('qs-search') as HTMLInputElement;
                  const filterEl = document.getElementById('qs-filter') as HTMLInputElement;
                  const searchVal = searchEl?.value?.toLowerCase() || '';
                  const filterVal = filterEl?.dataset?.filter || 'pending';
                  const filtered = quickSupportRequests
                    .filter((r: any) => filterVal === 'all' || r.status === filterVal)
                    .filter((r: any) => !searchVal || r.user_name?.toLowerCase().includes(searchVal) || r.user_uuid?.toLowerCase().includes(searchVal));
                  const isArchive = filterVal === 'resolved';
                  
                  return filtered.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground">لا توجد طلبات دعم سريع</p>
                  ) : filtered.map((req: any) => {
                    const typeLabels: Record<string, string> = {
                      admin_visit: "🏠 طلب إداري",
                      admin_presence: "🏠 حضور إداري",
                      report: "⚠️ بلاغ",
                      complaint: "📋 شكوى",
                      direct_contact: "📞 تواصل مباشر",
                      contact: "📞 تواصل",
                    };
                    return (
                      <div key={req.id} className={`bg-card border rounded-xl p-4 space-y-2 ${isArchive ? 'opacity-70' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{typeLabels[req.request_type] || req.request_type}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${req.status === "pending" ? "bg-amber-500/10 text-amber-400" : req.status === "resolved" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                            {req.status === "pending" ? "معلق" : req.status === "resolved" ? "✅ أرشيف" : req.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{req.user_name} • <span className="font-mono" dir="ltr">{req.user_uuid}</span></p>
                        {req.room_code && <p className="text-xs text-foreground">🏠 الغرفة: <span className="font-bold font-mono" dir="ltr">{req.room_code}</span></p>}
                        {req.description && <p className="text-xs text-foreground bg-muted/10 rounded-lg p-2">{req.description}</p>}
                        {req.phone_number && <p className="text-xs text-foreground">📞 <span className="font-mono" dir="ltr">{req.phone_number}</span></p>}
                        {req.attachment_url && (
                          <a href={req.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">📎 عرض المرفق</a>
                        )}
                        <p className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</p>
                        {canAct && req.status === "pending" && (
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
                  });
                })()}
                {/* Hidden elements for filter/search state */}
                <input id="qs-search" type="hidden" />
                <input id="qs-filter" type="hidden" data-filter="pending" />
              </motion.div>
            )}

            {/* ID Changes Tab */}
            {activeTab === "id_changes" && (
              <motion.div key="id_changes" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-3">
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

            {/* Hairs Tab */}
            {activeTab === "hairs" && (
              <motion.div key="hairs" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminHairManager adminSessionToken={adminSessionToken!} adminUsername={adminUsername!} readOnly={isModeratorRole && isTabViewOnly("hairs")} />
              </motion.div>
            )}

            {/* Audit Log Tab - Owner Only */}
            {activeTab === "audit_log" && isOwner && (
              <motion.div key="audit_log" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-3">
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

            {/* Agencies Tab */}
            {activeTab === "agencies" && (
              <motion.div key="agencies" custom={tabDirection} variants={tabSlideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                <AdminAgencyManager canAct={canAct} />
              </motion.div>
            )}
          </AnimatePresence>
      )}
          </div>
        </div>
      )}
      </div>
      
      {/* Admin notifications listener */}
      <AdminNotificationListener />
    </div>
  );
};

export default AdminDashboardPage;
