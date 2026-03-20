import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSavedRequests } from "@/hooks/use-saved-requests";
import { notifyNewBanReport } from "@/hooks/use-webhook-notification";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShieldBan,
  Search,
  Megaphone,
  MessageSquareWarning,
  AlertTriangle,
  Gift,
  ArrowRight,
  ArrowLeft,
  Upload,
  Video,
  CheckCircle2,
  Loader2,
  Eye,
  Clock,
  FileText,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BanType = "promotion" | "behavior" | "insult" | "violation" | "other";
type ViewMode = "menu" | "report" | "search";

interface BanReport {
  id: string;
  reported_user_id: string;
  reporter_gala_id: string;
  ban_type: string;
  description: string;
  evidence_url: string;
  evidence_type: string;
  created_at: string;
  is_verified: boolean;
  is_rejected?: boolean;
  status?: string;
  duration_hours?: number | null;
  expires_at: string | null;
  reward_amount: number | null;
  reward_paid: boolean;
  admin_notes: string | null;
}

const BAN_TYPES: {
  value: BanType;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresVideo: boolean;
  rewardRequiresVideo?: boolean;
  reward?: number;
  duration?: string;
  apiType: string;
  apiDuration?: number;
}[] = [
  {
    value: "promotion",
    label: "ترويج",
    icon: <Megaphone className="w-6 h-6" />,
    description: "الترويج لتطبيق آخر",
    requiresVideo: false,
    reward: 50000,
    rewardRequiresVideo: true,
    duration: "دائم (حظر الجهاز)",
    apiType: "promotion",
  },
  {
    value: "behavior",
    label: "مخالفة سلوك",
    icon: <AlertTriangle className="w-6 h-6" />,
    description: "سلوك مخالف لآداب التطبيق",
    requiresVideo: false,
    duration: "24 ساعة",
    apiType: "behavior",
    apiDuration: 24,
  },
  {
    value: "insult",
    label: "سب وشتم",
    icon: <MessageSquareWarning className="w-6 h-6" />,
    description: "شتم أو إساءة لفظية",
    requiresVideo: false,
    duration: "24 ساعة",
    apiType: "insult",
    apiDuration: 24,
  },
  {
    value: "violation",
    label: "مخالفة نظام وقوانين",
    icon: <ShieldBan className="w-6 h-6" />,
    description: "مخالفة نظام وقوانين التطبيق",
    requiresVideo: false,
    duration: "24 ساعة",
    apiType: "rules",
    apiDuration: 24,
  },
  {
    value: "other",
    label: "أخرى",
    icon: <FileText className="w-6 h-6" />,
    description: "سبب آخر (حدد السبب)",
    requiresVideo: false,
    duration: "24 ساعة",
    apiType: "other",
    apiDuration: 24,
  },
];

const VERIFIED_STATUSES = new Set([
  "verified",
  "approve",
  "approved",
  "accept",
  "accepted",
  "success",
  "done",
  "1",
  "true",
]);

const REJECTED_STATUSES = new Set([
  "rejected",
  "reject",
  "denied",
  "declined",
  "refused",
  "2",
  "-1",
  "false",
]);

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "on"].includes(normalized);
  }
  return false;
};

const normalizeStatus = (raw: Record<string, unknown>): "verified" | "rejected" | "pending" => {
  const statusCandidates = [
    raw.status,
    raw.review_status,
    raw.result_status,
    raw.result,
    raw.state,
  ];

  for (const candidate of statusCandidates) {
    if (candidate === null || candidate === undefined) continue;
    const normalized = String(candidate).trim().toLowerCase();
    if (REJECTED_STATUSES.has(normalized)) return "rejected";
    if (VERIFIED_STATUSES.has(normalized)) return "verified";
  }

  if (
    toBoolean(raw.is_rejected) ||
    toBoolean(raw.rejected) ||
    toBoolean(raw.is_denied)
  ) {
    return "rejected";
  }

  if (
    toBoolean(raw.is_verified) ||
    toBoolean(raw.verified) ||
    toBoolean(raw.is_approved) ||
    toBoolean(raw.approved)
  ) {
    return "verified";
  }

  return "pending";
};

const extractDurationHours = (raw: Record<string, unknown>): number | null => {
  const candidates = [
    raw.duration_hours,
    raw.ban_duration_hours,
    raw.duration,
    raw.ban_duration,
    raw.hours,
    raw.ban_hours,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const normalizeBanType = (raw: Record<string, unknown>): string => {
  return String(
    raw.ban_type ?? raw.reason_type ?? raw.report_type ?? raw.violation_type ?? "other"
  )
    .trim()
    .toLowerCase();
};

const normalizeReportFromApi = (raw: Record<string, unknown>): BanReport => {
  const normalizedStatus = normalizeStatus(raw);
  const rewardRaw = raw.reward_amount;

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    reported_user_id: String(raw.reported_user_id ?? raw.target_uuid ?? raw.target_id ?? ""),
    reporter_gala_id: String(raw.reporter_gala_id ?? raw.reporter_uuid ?? raw.reporter_id ?? ""),
    ban_type: normalizeBanType(raw),
    description: String(raw.description ?? raw.reason ?? ""),
    evidence_url: String(raw.evidence_url ?? raw.proof_url ?? raw.media_url ?? ""),
    evidence_type: String(raw.evidence_type ?? raw.media_type ?? "image"),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    is_verified: normalizedStatus === "verified",
    is_rejected: normalizedStatus === "rejected",
    status: normalizedStatus,
    duration_hours: extractDurationHours(raw),
    expires_at: raw.expires_at ? String(raw.expires_at) : raw.expire_at ? String(raw.expire_at) : null,
    reward_amount:
      rewardRaw === null || rewardRaw === undefined || rewardRaw === ""
        ? null
        : Number(rewardRaw),
    reward_paid: toBoolean(raw.reward_paid),
    admin_notes: raw.admin_notes ? String(raw.admin_notes) : null,
  };
};

const ReportPage = () => {
  const navigate = useNavigate();
  const { saveTrackingCode } = useSavedRequests();
  const { user: galaUser } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>("menu");
  const [currentStep, setCurrentStep] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reporterGalaId = galaUser?.uuid ? String(galaUser.uuid) : "";

  const [banType, setBanType] = useState<BanType | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [reportedUserId, setReportedUserId] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BanReport[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BanReport | null>(null);

  // Confirmed reports shown inline
  const [confirmedReports, setConfirmedReports] = useState<BanReport[]>([]);

  // My previous reports (inside report flow)
  const [showMyReports, setShowMyReports] = useState(false);
  const [myReports, setMyReports] = useState<BanReport[]>([]);
  const [isLoadingMyReports, setIsLoadingMyReports] = useState(false);

  const [resolvedEvidenceUrl, setResolvedEvidenceUrl] = useState("");
  const [isResolvingEvidence] = useState(false);
  const [evidenceLoadError, setEvidenceLoadError] = useState<string | null>(null);


  useEffect(() => {
    if (selectedReport?.evidence_url) {
      setResolvedEvidenceUrl(selectedReport.evidence_url);
    }
  }, [selectedReport]);

  const selectedBanType = BAN_TYPES.find((t) => t.value === banType);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");

    if (!isVideo) {
      toast.error("يجب رفع فيديو كدليل على المخالفة");
      e.target.value = "";
      return;
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("حجم الملف يجب أن لا يتجاوز 100MB");
      return;
    }

    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
  };

  const canProceedToConfirmation = () => {
    return !!evidenceFile;
  };

  const handleSubmit = async () => {
    if (!banType || !reportedUserId || !evidenceFile || !reporterGalaId) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload evidence to storage
      const fileExt = evidenceFile.name.split(".").pop();
      const fileName = `ban-reports/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const isVideo = evidenceFile.type.startsWith("video/");

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(fileName, evidenceFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(fileName);

      // 2. Submit to external API via edge function
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const submitRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ban-report?action=submit-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
            "apikey": anonKey,
          },
          body: JSON.stringify({
            reporter_uuid: reporterGalaId,
            reporter_name: galaUser?.name || reporterGalaId,
            target_uuid: reportedUserId,
            target_name: reportedUserId,
            reason_type: selectedBanType?.apiType || banType,
            evidence_url: urlData.publicUrl,
            evidence_type: isVideo ? "video" : "image",
            description: banType === "other" && customReason ? `${customReason}\n${description}` : description,
          }),
        }
      );
      let apiResult: any = {};
      try {
        apiResult = await submitRes.json();
        console.log("External API result:", apiResult);
      } catch {
        console.warn("Could not parse API response");
      }

      // If duplicate from external API, still save locally and show success
      const isDuplicate = !submitRes.ok && apiResult?.error?.includes?.("Duplicate");
      if (!submitRes.ok && !isDuplicate) {
        console.error("External API error:", apiResult);
      }

      let recordId: string = crypto.randomUUID();
      try {
        const { data, error } = await supabase
          .from("ban_reports")
          .insert({
            reporter_gala_id: reporterGalaId,
            reported_user_id: reportedUserId,
            ban_type: banType,
            description: banType === "other" && customReason ? `${customReason}\n${description}` : description,
            evidence_url: urlData.publicUrl,
            evidence_type: isVideo ? "video" : "image",
            reward_amount: selectedBanType?.reward || null,
          })
          .select()
          .single();

        if (error) {
          console.error("Local DB insert error:", error);
        } else if (data?.id) {
          recordId = data.id;
        }
      } catch (dbErr) {
        console.error("DB insert exception:", dbErr);
      }

      try {
        await notifyNewBanReport({
          id: recordId,
          reporter_gala_id: reporterGalaId,
          reported_user_id: reportedUserId,
          ban_type: banType,
          created_at: new Date().toISOString(),
        });
      } catch (webhookError) {
        console.error("Webhook notification failed:", webhookError);
      }

      saveTrackingCode(recordId, "ban_report", reporterGalaId);

      // Add to confirmed reports list (shown inline)
      const newReport: BanReport = {
        id: recordId,
        reported_user_id: reportedUserId,
        reporter_gala_id: reporterGalaId,
        ban_type: banType,
        description: banType === "other" && customReason ? `${customReason}\n${description}` : description,
        evidence_url: evidencePreview,
        evidence_type: evidenceFile.type.startsWith("video/") ? "video" : "image",
        created_at: new Date().toISOString(),
        is_verified: false,
        status: "pending",
        duration_hours: selectedBanType?.apiDuration || null,
        expires_at: null,
        reward_amount: selectedBanType?.reward || null,
        reward_paid: false,
        admin_notes: null,
      };
      setConfirmedReports(prev => [newReport, ...prev]);

      // Reset form but stay on same page
      resetForm();
      setViewMode("menu");

      toast.success("تم إرسال البلاغ بنجاح!\nسيتم مراجعته من الإدارة وتنفيذ الحظر بعد الموافقة", {
        duration: 6000,
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("حدث خطأ أثناء إرسال البلاغ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("يرجى إدخال الآيدي للبحث");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedReport(null);

    try {
      // Use direct fetch with query params
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ban-report?action=search-bans&uuid=${encodeURIComponent(searchQuery.trim())}`,
        {
          headers: {
            "Authorization": `Bearer ${anonKey}`,
            "apikey": anonKey,
          },
        }
      );
      const apiData = await res.json();

      if (apiData?.data && Array.isArray(apiData.data)) {
        const normalizedReports = apiData.data.map((item: Record<string, unknown>) =>
          normalizeReportFromApi(item)
        );

        const activeBans = normalizedReports.filter(
          (report) => report.is_verified && !report.is_rejected
        );

        setSearchResults(activeBans);

        if (activeBans.length === 0) {
          if (normalizedReports.some((report) => report.is_rejected)) {
            toast.info("لا يوجد حظر فعّال: البلاغات على هذا الآيدي مرفوضة");
          } else {
            toast.info("لا توجد حالات حظر فعّالة على هذا الآيدي");
          }
        }
      } else {
        // Fallback to local
        const { data: localData, error: localError } = await supabase
          .from("ban_reports")
          .select("*")
          .eq("reported_user_id", searchQuery.trim())
          .eq("is_verified", true)
          .order("created_at", { ascending: false });

        if (localError) throw localError;

        const normalizedLocal = (localData || []).map((item) =>
          normalizeReportFromApi(item as unknown as Record<string, unknown>)
        );

        setSearchResults(normalizedLocal.filter((report) => report.is_verified && !report.is_rejected));

        if (!normalizedLocal.length) {
          toast.info("لا توجد حالات حظر فعّالة على هذا الآيدي");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setIsSearching(false);
    }
  };

  const loadMyReports = async () => {
    if (!reporterGalaId.trim()) return;
    setIsLoadingMyReports(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ban-report?action=my-reports&uuid=${encodeURIComponent(reporterGalaId.trim())}`,
        {
          headers: {
            "Authorization": `Bearer ${anonKey}`,
            "apikey": anonKey,
          },
        }
      );
      const apiData = await res.json();

      if (apiData?.data && Array.isArray(apiData.data)) {
        const normalizedReports = apiData.data.map((item: Record<string, unknown>) =>
          normalizeReportFromApi(item)
        );
        setMyReports(normalizedReports);
      } else {
        // Fallback to local
        const { data, error } = await supabase
          .from("ban_reports")
          .select("*")
          .eq("reporter_gala_id", reporterGalaId.trim())
          .order("created_at", { ascending: false });

        if (error) throw error;
        setMyReports(
          (data || []).map((item) =>
            normalizeReportFromApi(item as unknown as Record<string, unknown>)
          )
        );
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoadingMyReports(false);
    }
  };

  const toggleMyReports = () => {
    if (!showMyReports && myReports.length === 0) {
      loadMyReports();
    }
    setShowMyReports(!showMyReports);
  };

  const resetForm = () => {
    setCurrentStep(2);
    setBanType(null);
    setCustomReason("");
    setReportedUserId("");
    setDescription("");
    setEvidenceFile(null);
    setEvidencePreview("");
  };

  const getBanTypeMeta = (type: string) => {
    const normalizedType = String(type || "").trim().toLowerCase();
    const aliasedType = normalizedType === "rules" ? "violation" : normalizedType;
    return BAN_TYPES.find((t) => t.value === aliasedType || t.apiType === aliasedType);
  };

  const getBanTypeLabel = (type: string) => {
    const typeMeta = getBanTypeMeta(type);
    return typeMeta?.label || type || "غير محدد";
  };

  const getStatusBadge = (report: BanReport) => {
    const normalizedStatus = normalizeStatus(report as unknown as Record<string, unknown>);

    if (normalizedStatus === "rejected") {
      return (
        <span className="flex items-center gap-1 bg-destructive/20 text-destructive px-2 py-1 rounded-full text-xs font-bold">
          <AlertTriangle className="w-3 h-3" />
          مرفوض
        </span>
      );
    }

    if (normalizedStatus === "verified") {
      return (
        <span className="flex items-center gap-1 bg-success/20 text-success px-2 py-1 rounded-full text-xs font-bold">
          <CheckCircle className="w-3 h-3" />
          تم الحظر
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 bg-warning/20 text-warning px-2 py-1 rounded-full text-xs font-bold">
        <Clock className="w-3 h-3" />
        قيد المراجعة
      </span>
    );
  };

  const getBanDurationLabel = (report: BanReport) => {
    if (report.duration_hours && report.duration_hours > 0) {
      return { label: `⏰ ${report.duration_hours} ساعة`, className: "bg-warning/20 text-warning" };
    }

    if (report.expires_at) {
      return { label: "⏰ مؤقت", className: "bg-warning/20 text-warning" };
    }

    const typeMeta = getBanTypeMeta(report.ban_type);
    if (typeMeta?.apiDuration) {
      return { label: `⏰ ${typeMeta.duration}`, className: "bg-warning/20 text-warning" };
    }

    const normalizedType = String(report.ban_type || "").toLowerCase();
    if (normalizedType === "promotion") {
      return { label: "دائم", className: "bg-purple-500/20 text-purple-500" };
    }

    return { label: "⏰ 24 ساعة", className: "bg-warning/20 text-warning" };
  };

  // No separate success view - confirmed reports shown inline in menu

  return (
    <div className="mobile-container bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => {
              if (viewMode !== "menu") {
                if (currentStep > 1 && viewMode === "report") {
                  setCurrentStep(currentStep - 1);
                } else {
                  setViewMode("menu");
                  resetForm();
                  setShowMyReports(false);
                  setMyReports([]);
                }
              } else {
                navigate("/dashboard");
              }
            }}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <ShieldBan className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="font-bold">الحظر</h1>
              <p className="text-xs text-muted-foreground">
                {viewMode === "menu" ? "بلّغ أو ابحث عن سبب الحظر" :
                 viewMode === "report" ? "تقديم بلاغ جديد" :
                 "البحث عن سبب الحظر"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        <AnimatePresence mode="popLayout">
          {/* Menu View - Only 2 options */}
          {viewMode === "menu" && (
            <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              {/* Report Button */}
              <button onClick={() => setViewMode("report")} className="w-full bg-gradient-to-r from-destructive/10 to-orange-600/10 border border-destructive/20 rounded-2xl p-6 text-right">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
                    <ShieldBan className="w-7 h-7 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold">بلّغ</p>
                    <p className="text-sm text-muted-foreground">بلّغ عن مخالفة واحصل على مكافأة</p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>

              {/* Search Button */}
              <button onClick={() => setViewMode("search")} className="w-full bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-blue-500/20 rounded-2xl p-6 text-right">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Search className="w-7 h-7 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold">بحث عن سبب الحظر</p>
                    <p className="text-sm text-muted-foreground">ابحث عن آيدي لمعرفة سبب حظره والدليل</p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>

              {/* Reward Banner */}
              <div className="bg-gradient-to-r from-warning/20 to-amber-600/20 border border-warning/30 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Gift className="w-8 h-8 text-warning shrink-0" />
                  <div>
                    <p className="font-bold text-warning">مكافأة 50,000 كوينز!</p>
                    <p className="text-sm text-muted-foreground">بلّغ عن ترويج لتطبيق آخر بالفيديو واحصل على المكافأة</p>
                  </div>
                </div>
              </div>

              {/* Confirmed Reports Section - Inline */}
              {confirmedReports.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldBan className="w-5 h-5 text-destructive" />
                    <h3 className="font-bold text-destructive">محظور ({confirmedReports.length})</h3>
                  </div>
                  {confirmedReports.map((report) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-destructive/20 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-destructive/20 text-destructive px-2 py-0.5 rounded-full text-xs font-bold">
                            {getBanTypeLabel(report.ban_type)}
                          </span>
                          {getStatusBadge(report)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">المُبلَّغ عنه:</span>
                        <span className="font-bold">{report.reported_user_id}</span>
                      </div>
                      {report.description && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                          {report.description}
                        </p>
                      )}
                      {report.evidence_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="w-3 h-3 ml-1" />
                          عرض الإثبات
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Report View */}
          {viewMode === "report" && (
            <motion.div key="report" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              
              {/* My Previous Reports Toggle */}
              <button
                onClick={toggleMyReports}
                className="w-full flex items-center justify-between bg-muted/50 border border-border rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold">طلباتي السابقة</span>
                  {myReports.length > 0 && (
                    <span className="bg-destructive/20 text-destructive px-2 py-0.5 rounded-full text-xs font-bold">{myReports.length}</span>
                  )}
                </div>
                {showMyReports ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {/* My Reports List */}
              <AnimatePresence>
                {showMyReports && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    {isLoadingMyReports ? (
                      <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">جاري التحميل...</span>
                      </div>
                    ) : myReports.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        لا توجد بلاغات سابقة
                      </div>
                    ) : (
                      myReports.map((report) => (
                        <div key={report.id} className="bg-card border rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="bg-destructive/20 text-destructive px-2 py-0.5 rounded-full text-xs font-bold">{getBanTypeLabel(report.ban_type)}</span>
                              {getStatusBadge(report)}
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <div className="text-sm flex justify-between">
                            <span className="text-muted-foreground">المُبلَّغ عنه:</span>
                            <span className="font-bold">{report.reported_user_id}</span>
                          </div>
                          {report.admin_notes && (
                            <div className="bg-muted/50 rounded-lg p-2 text-xs">
                              <span className="text-muted-foreground">ملاحظة الإدارة: </span>{report.admin_notes}
                            </div>
                          )}
                          {report.is_verified && report.reward_amount && (
                            <div className={`text-xs rounded-lg p-2 ${report.reward_paid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                              <Gift className="w-3 h-3 inline ml-1" />
                              {report.reward_paid ? `تم صرف ${report.reward_amount.toLocaleString()} كوينز` : `مكافأة مستحقة: ${report.reward_amount.toLocaleString()} كوينز`}
                            </div>
                          )}
                          <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setSelectedReport(report)}>
                            <Eye className="w-3 h-3 ml-1" />عرض التفاصيل
                          </Button>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Steps Progress */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {[2, 3, 4, 5].map((step) => (
                  <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    currentStep > step ? "bg-success text-success-foreground" :
                    currentStep === step ? "bg-gradient-to-r from-destructive to-orange-500 text-white" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {currentStep > step ? <CheckCircle2 className="w-4 h-4" /> : step - 1}
                  </div>
                ))}
              </div>

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-center">اختر نوع البلاغ</h2>
                  <div className="space-y-3">
                    {BAN_TYPES.map((type) => (
                      <button key={type.value} onClick={() => { setBanType(type.value); if (type.value !== "other") { setCustomReason(""); setCurrentStep(3); } }} className={`w-full p-4 rounded-xl border-2 transition-all ${banType === type.value ? "border-destructive bg-destructive/10" : "border-border bg-card hover:border-destructive/50"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center text-destructive">{type.icon}</div>
                          <div className="flex-1 text-right">
                            <p className="font-bold">{type.label}</p>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                            {type.duration && <p className="text-xs text-warning mt-1">⏰ مدة الحظر: {type.duration}</p>}
                          </div>
                          {type.reward && (
                            <div className="bg-warning/20 text-warning px-2 py-1 rounded-lg text-xs font-bold">{type.reward.toLocaleString()} كوينز</div>
                          )}
                        </div>
                        {/* Show promotion reward detail when selected */}
                        {type.value === "promotion" && banType === "promotion" && (
                          <div className="mt-3 bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning text-center">
                            <Gift className="w-4 h-4 inline ml-1" />
                            مكافأة 50,000 كوينز عند رفع فيديو كإثبات!
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {banType === "other" && (
                    <div className="space-y-3 mt-4">
                      <label className="block text-sm font-medium">حدد السبب <span className="text-destructive">*</span></label>
                      <Input placeholder="اكتب سبب الحظر" value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
                      <Button className="w-full h-12 bg-gradient-to-r from-destructive to-orange-600" disabled={!customReason.trim()} onClick={() => setCurrentStep(3)}>
                        التالي <ArrowLeft className="w-4 h-4 mr-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-center">آيدي المُبلَّغ عنه</h2>
                  <Input type="text" inputMode="numeric" placeholder="أدخل آيدي المستخدم المخالف" value={reportedUserId} onChange={(e) => setReportedUserId(e.target.value)} className="text-center text-lg h-14" />
                  <Button className="w-full h-12 bg-gradient-to-r from-destructive to-orange-600" disabled={!reportedUserId.trim()} onClick={() => setCurrentStep(4)}>
                    التالي <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-center">شرح المخالفة والإثبات</h2>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">وصف المخالفة <span className="text-xs text-muted-foreground">(اختياري)</span></label>
                    <Textarea placeholder="أضف تفاصيل إضافية إن وجدت..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px]" />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">رفع صورة أو فيديو الإثبات <span className="text-destructive">*</span></label>
                    <p className="text-xs text-muted-foreground">الحد الأقصى 100MB</p>
                    {selectedBanType?.rewardRequiresVideo && (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
                        <Video className="w-4 h-4 inline ml-2" />يفضّل رفع فيديو للحصول على المكافأة (50,000 كوينز)
                      </div>
                    )}
                    {evidencePreview ? (
                      <div className="relative">
                        {evidenceFile?.type.startsWith("video/") ? (
                          <video src={evidencePreview} controls className="w-full rounded-xl" />
                        ) : (
                          <img src={evidencePreview} alt="Evidence" className="w-full rounded-xl" />
                        )}
                        <Button variant="destructive" size="sm" className="absolute top-2 left-2" onClick={() => { setEvidenceFile(null); setEvidencePreview(""); }}>حذف</Button>
                      </div>
                    ) : (
                      <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-destructive/50 transition-colors">
                        <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="w-10 h-10" />
                          <span>اضغط لرفع صورة أو فيديو</span>
                          <span className="text-xs">الحد الأقصى 100MB</span>
                        </div>
                      </label>
                    )}
                  </div>

                  <Button className="w-full h-12 bg-gradient-to-r from-destructive to-orange-600" disabled={!canProceedToConfirmation()} onClick={() => setCurrentStep(5)}>
                    التالي <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                  {!canProceedToConfirmation() && (
                    <p className="text-xs text-center text-muted-foreground">يجب رفع صورة أو فيديو الإثبات للمتابعة</p>
                  )}
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-center">تأكيد البلاغ</h2>
                  <div className="bg-card rounded-xl p-4 space-y-3 border">
                    <div className="flex justify-between"><span className="text-muted-foreground">آيدي المُبلِّغ:</span><span className="font-bold">{reporterGalaId}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">نوع المخالفة:</span><span className="font-bold">{selectedBanType?.label}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">الآيدي المُبلَّغ عنه:</span><span className="font-bold">{reportedUserId}</span></div>
                    <div><span className="text-muted-foreground">الوصف:</span><p className="text-sm mt-1">{description}</p></div>
                    {selectedBanType?.reward && (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-center">
                        <Gift className="w-5 h-5 text-warning inline ml-2" />
                        <span className="text-warning font-bold">مكافأة محتملة: {selectedBanType.reward.toLocaleString()} كوينز</span>
                      </div>
                    )}
                  </div>
                  <Button className="w-full h-12 bg-gradient-to-r from-destructive to-orange-600" disabled={isSubmitting} onClick={handleSubmit}>
                    {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الإرسال...</>) : "إرسال البلاغ"}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Search View */}
          {viewMode === "search" && (
            <motion.div key="search" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-lg font-bold text-center">البحث عن سبب الحظر</h2>
              <p className="text-sm text-muted-foreground text-center">أدخل آيدي المستخدم المحظور لمعرفة السبب ومشاهدة الدليل</p>
              <div className="flex gap-2">
                <Input type="text" inputMode="numeric" placeholder="أدخل الآيدي للبحث" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1" />
                <Button onClick={handleSearch} disabled={isSearching} className="bg-gradient-to-r from-blue-600 to-cyan-600">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-muted-foreground">نتائج البحث ({searchResults.length})</h3>
                  {searchResults.map((report) => (
                    <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-destructive/20 text-destructive px-3 py-1 rounded-full text-sm font-bold">{getBanTypeLabel(report.ban_type)}</span>
                          {(() => { const dur = getBanDurationLabel(report); return <span className={`px-2 py-1 rounded-full text-xs font-bold ${dur.className}`}>{dur.label}</span>; })()}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString("ar-EG")}</span>
                      </div>
                      {report.expires_at && (
                        <div className="text-xs text-warning bg-warning/10 px-3 py-1.5 rounded-lg">
                          ⏰ ينتهي: {new Date(report.expires_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      )}
                      {report.description && <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">{report.description}</p>}
                      <div className="relative rounded-lg overflow-hidden border border-border cursor-pointer group" onClick={() => setSelectedReport(report)}>
                        {report.evidence_type === "video" ? (
                          <div className="relative bg-muted/50 p-6 flex flex-col items-center justify-center gap-2">
                            <Video className="w-10 h-10 text-destructive" />
                            <span className="text-sm text-muted-foreground">فيديو - اضغط للمشاهدة</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <img src={report.evidence_url} alt="دليل البلاغ" className="w-full h-40 object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedReport(report)}>
                        <Eye className="w-4 h-4 ml-2" />عرض الإثبات بالكامل
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Evidence Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
            <button onClick={() => setSelectedReport(null)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10">
              <span className="text-white text-2xl font-light">×</span>
            </button>
            <div className="max-w-3xl w-full bg-card rounded-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <ShieldBan className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-bold">إثبات الحظر</h3>
                    <p className="text-xs text-muted-foreground">الآيدي: {selectedReport.reported_user_id}</p>
                  </div>
                </div>
                <span className="bg-destructive/20 text-destructive px-3 py-1 rounded-full text-sm font-bold">{getBanTypeLabel(selectedReport.ban_type)}</span>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="rounded-lg overflow-hidden border border-border bg-black">
                  {isResolvingEvidence ? (
                    <div className="p-10 flex items-center justify-center text-muted-foreground gap-2"><Loader2 className="w-5 h-5 animate-spin" />جاري تحميل الدليل...</div>
                  ) : !resolvedEvidenceUrl ? (
                    <div className="p-10 text-center text-muted-foreground">لا يوجد دليل لهذا البلاغ.</div>
                  ) : selectedReport.evidence_type === "video" ? (
                    <video key={resolvedEvidenceUrl} src={resolvedEvidenceUrl} controls autoPlay playsInline preload="auto" className="w-full max-h-[60vh] object-contain" onError={() => setEvidenceLoadError("تعذر تحميل الفيديو داخل التطبيق.")} />
                  ) : (
                    <img key={resolvedEvidenceUrl} src={resolvedEvidenceUrl} alt="دليل البلاغ" className="w-full max-h-[60vh] object-contain" loading="eager" onError={() => setEvidenceLoadError("تعذر تحميل الصورة داخل التطبيق.")} />
                  )}
                </div>
                {evidenceLoadError && <div className="mt-3 text-sm text-muted-foreground bg-muted/40 border border-border rounded-lg p-3">{evidenceLoadError}</div>}
                <div className="mt-4 space-y-2 bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">نوع الحظر:</span><span className="font-bold text-destructive">{getBanTypeLabel(selectedReport.ban_type)}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">مدة الحظر:</span><span className="font-bold">{(() => { const dur = getBanDurationLabel(selectedReport); return selectedReport.expires_at ? "مؤقت ⏰" : dur.label; })()}</span></div>
                  {selectedReport.expires_at && (
                    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">ينتهي في:</span><span className="font-bold text-warning">{new Date(selectedReport.expires_at).toLocaleString("ar-EG")}</span></div>
                  )}
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">تاريخ البلاغ:</span><span>{new Date(selectedReport.created_at).toLocaleString("ar-EG")}</span></div>
                  {selectedReport.description && (
                    <div className="pt-2 border-t border-border"><span className="text-muted-foreground text-sm">السبب:</span><p className="mt-1 text-sm">{selectedReport.description}</p></div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-border">
                <Button variant="outline" className="w-full" onClick={() => setSelectedReport(null)}>إغلاق</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPage;
