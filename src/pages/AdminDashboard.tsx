import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Shield, LogOut, Video, Plus, Trash2, Edit2, Save, X,
  Loader2, Eye, EyeOff, ArrowUp, ArrowDown, GripVertical,
  FileText, ShieldBan, DollarSign, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, Ban, Unlock, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "videos" | "salary" | "reports" | "blocks";

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

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("videos");
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

  // Ban reports state
  const [banReports, setBanReports] = useState<BanReport[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Blocked accounts state
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedAccount[]>([]);

  const adminPassword = sessionStorage.getItem("admin_token");

  useEffect(() => {
    if (!adminPassword) {
      navigate("/admin");
      return;
    }
    loadData();
  }, [activeTab]);

  const adminCall = async (action: string, data: any = {}) => {
    const { data: result, error } = await supabase.functions.invoke("admin-manage", {
      body: { password: adminPassword, action, data },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result?.data;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "videos":
          setVideos(await adminCall("list_videos"));
          break;
        case "salary":
          setSalaryRequests(await adminCall("list_salary_requests"));
          break;
        case "reports":
          setBanReports(await adminCall("list_ban_reports"));
          break;
        case "blocks":
          setBlockedAccounts(await adminCall("list_blocked_accounts"));
          break;
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
    if (!newVideo.title || !videoFile) {
      toast.error("العنوان وملف الفيديو مطلوبان");
      return;
    }
    if (videoFile.size > 100 * 1024 * 1024) {
      toast.error("حجم الفيديو يجب أن لا يتجاوز 100MB");
      return;
    }
    try {
      setUploadProgress(true);
      // Upload video file
      const formData = new FormData();
      formData.append("password", adminPassword!);
      formData.append("file", videoFile);
      
      const { data: uploadResult, error: uploadError } = await supabase.functions.invoke("admin-upload-video", {
        body: formData,
      });
      
      if (uploadError || !uploadResult?.url) {
        throw new Error(uploadResult?.error || "فشل رفع الفيديو");
      }

      await adminCall("add_video", {
        title: newVideo.title,
        video_url: uploadResult.url,
        description: newVideo.description || null,
        thumbnail_url: newVideo.thumbnail_url || null,
        display_order: videos.length,
      });
      toast.success("تمت إضافة الفيديو");
      setNewVideo({ title: "", description: "", thumbnail_url: "" });
      setVideoFile(null);
      setShowAddVideo(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "فشل إضافة الفيديو");
    } finally {
      setUploadProgress(false);
    }
  };

  const updateVideo = async (video: VideoTutorial) => {
    try {
      await adminCall("update_video", video);
      toast.success("تم التحديث");
      setEditingVideo(null);
      loadData();
    } catch { toast.error("فشل التحديث"); }
  };

  const deleteVideo = async (id: string) => {
    try {
      await adminCall("delete_video", { id });
      toast.success("تم الحذف");
      loadData();
    } catch { toast.error("فشل الحذف"); }
  };

  const toggleVideoActive = async (video: VideoTutorial) => {
    try {
      await adminCall("update_video", { id: video.id, is_active: !video.is_active });
      toast.success(video.is_active ? "تم إخفاء الفيديو" : "تم تفعيل الفيديو");
      loadData();
    } catch { toast.error("فشل التحديث"); }
  };

  // Salary actions
  const updateSalaryStatus = async (id: string, status: string, adminNote?: string) => {
    try {
      const updateData: any = { id, status };
      if (adminNote !== undefined) updateData.admin_note = adminNote;
      await adminCall("update_salary_request", updateData);
      toast.success("تم تحديث الطلب");
      loadData();
    } catch { toast.error("فشل التحديث"); }
  };

  // Ban report actions
  const updateBanReport = async (id: string, updates: Partial<BanReport>) => {
    try {
      await adminCall("update_ban_report", { id, ...updates });
      toast.success("تم التحديث");
      loadData();
    } catch { toast.error("فشل التحديث"); }
  };

  // Unblock account
  const unblockAccount = async (targetUuid: string) => {
    try {
      await adminCall("unblock_account", { target_uuid: targetUuid });
      toast.success("تم فك الحظر عن الحساب");
      loadData();
    } catch { toast.error("فشل فك الحظر"); }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "videos", label: "الفيديوهات", icon: <Video className="w-4 h-4" /> },
    { key: "salary", label: "الرواتب", icon: <DollarSign className="w-4 h-4" />, count: salaryRequests.filter(r => r.status === "pending").length },
    { key: "reports", label: "البلاغات", icon: <ShieldBan className="w-4 h-4" />, count: banReports.filter(r => !r.is_verified).length },
    { key: "blocks", label: "المحظورين", icon: <Ban className="w-4 h-4" />, count: blockedAccounts.filter(b => b.is_permanently_blocked).length },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-bold text-lg">لوحة التحكم</h1>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[57px] z-10 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex max-w-2xl mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count && tab.count > 0 ? (
                <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {tab.count}
                </span>
              ) : null}
              {activeTab === tab.key && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
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
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 bg-muted/20 border border-border/30 rounded-lg p-1"
                      />
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
                          {video.is_active ? <Eye className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <button onClick={() => deleteVideo(video.id)} className="p-1.5 rounded-lg hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                    {video.description && <p className="text-xs text-muted-foreground">{video.description}</p>}
                    <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">{video.video_url}</p>
                  </div>
                ))}

                {videos.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Video className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد فيديوهات</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Salary Tab */}
            {activeTab === "salary" && (
              <motion.div key="salary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {salaryRequests.map((req) => (
                  <div key={req.id} className="bg-card border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedSalary(expandedSalary === req.id ? null : req.id)}
                      className="w-full p-4 flex items-center justify-between text-right"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          req.status === "pending" ? "bg-warning/20 text-warning" :
                          req.status === "approved" ? "bg-success/20 text-success" :
                          "bg-destructive/20 text-destructive"
                        }`}>
                          {req.status === "pending" ? "قيد الانتظار" : req.status === "approved" ? "مقبول" : "مرفوض"}
                        </span>
                        <span className="font-bold text-sm">${req.amount_usd}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-medium">{req.user_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-SA")}</p>
                        </div>
                        {expandedSalary === req.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedSalary === req.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border"
                        >
                          <div className="p-4 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="text-muted-foreground">UUID:</span> <span className="font-mono text-xs">{req.user_uuid}</span></div>
                              <div><span className="text-muted-foreground">الطريقة:</span> {req.payment_method}</div>
                              <div><span className="text-muted-foreground">المستلم:</span> {req.recipient_name}</div>
                              <div><span className="text-muted-foreground">البلد:</span> {req.recipient_country}</div>
                              <div className="col-span-2"><span className="text-muted-foreground">التفاصيل:</span> {req.payment_details}</div>
                              <div><span className="text-muted-foreground">النوع:</span> {req.request_type}</div>
                            </div>

                            {req.status === "pending" && (
                              <div className="flex gap-2 pt-2">
                                <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={() => updateSalaryStatus(req.id, "approved")}>
                                  <CheckCircle className="w-4 h-4 ml-1" />قبول
                                </Button>
                                <Button size="sm" variant="destructive" className="flex-1" onClick={() => updateSalaryStatus(req.id, "rejected")}>
                                  <XCircle className="w-4 h-4 ml-1" />رفض
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {salaryRequests.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد طلبات</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Ban Reports Tab */}
            {activeTab === "reports" && (
              <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {banReports.map((report) => (
                  <div key={report.id} className="bg-card border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                      className="w-full p-4 flex items-center justify-between text-right"
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-destructive/20 text-destructive px-2 py-1 rounded-full text-xs font-bold">{report.ban_type}</span>
                        {report.is_verified ? (
                          <span className="bg-success/20 text-success px-2 py-1 rounded-full text-xs font-bold">مؤكد</span>
                        ) : (
                          <span className="bg-warning/20 text-warning px-2 py-1 rounded-full text-xs font-bold">قيد المراجعة</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-medium">ضد: {report.reported_user_id}</p>
                          <p className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString("ar-SA")}</p>
                        </div>
                        {expandedReport === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedReport === report.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border"
                        >
                          <div className="p-4 space-y-3 text-sm">
                            <div><span className="text-muted-foreground">المُبلِّغ:</span> {report.reporter_gala_id}</div>
                            <div><span className="text-muted-foreground">الوصف:</span> {report.description}</div>

                            {/* Evidence */}
                            <div className="rounded-lg overflow-hidden border border-border">
                              {report.evidence_type === "video" ? (
                                <video src={report.evidence_url} controls className="w-full max-h-60 object-contain bg-black" />
                              ) : (
                                <img src={report.evidence_url} alt="دليل" className="w-full max-h-60 object-contain bg-black" />
                              )}
                            </div>

                            {!report.is_verified && (
                              <div className="flex gap-2 pt-2">
                                <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={() => updateBanReport(report.id, { is_verified: true })}>
                                  <CheckCircle className="w-4 h-4 ml-1" />تأكيد البلاغ
                                </Button>
                                <Button size="sm" variant="destructive" className="flex-1" onClick={() => updateBanReport(report.id, { admin_notes: "مرفوض" })}>
                                  <XCircle className="w-4 h-4 ml-1" />رفض
                                </Button>
                              </div>
                            )}

                            {report.is_verified && report.reward_amount && !report.reward_paid && (
                              <Button size="sm" className="w-full bg-warning hover:bg-warning/90 text-warning-foreground" onClick={() => updateBanReport(report.id, { reward_paid: true })}>
                                صرف المكافأة ({report.reward_amount.toLocaleString()} كوينز)
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {banReports.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShieldBan className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد بلاغات</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Blocked Accounts Tab */}
            {activeTab === "blocks" && (
              <motion.div key="blocks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {blockedAccounts.map((acc) => {
                  const isActive = acc.is_permanently_blocked || (acc.blocked_until && new Date(acc.blocked_until) > new Date());
                  return (
                    <div key={acc.id} className={`bg-card border rounded-xl p-4 space-y-3 ${!isActive ? "opacity-50" : ""}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {acc.is_permanently_blocked ? (
                            <span className="bg-destructive/20 text-destructive px-2 py-1 rounded-full text-xs font-bold">حظر دائم</span>
                          ) : isActive ? (
                            <span className="bg-warning/20 text-warning px-2 py-1 rounded-full text-xs font-bold">حظر مؤقت</span>
                          ) : (
                            <span className="bg-muted/50 text-muted-foreground px-2 py-1 rounded-full text-xs font-bold">منتهي</span>
                          )}
                          <span className="text-xs text-muted-foreground">تحذير {acc.block_count}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold" dir="ltr">{acc.target_uuid}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(acc.updated_at).toLocaleDateString("ar-SA")}
                          </p>
                        </div>
                      </div>

                      {acc.blocked_until && !acc.is_permanently_blocked && (
                        <p className="text-xs text-muted-foreground">
                          ينتهي الحظر: {new Date(acc.blocked_until).toLocaleString("ar-SA")}
                        </p>
                      )}

                      {acc.admin_unblocked_at && (
                        <p className="text-xs text-success">
                          تم فك الحظر بواسطة الأدمن: {new Date(acc.admin_unblocked_at).toLocaleString("ar-SA")}
                        </p>
                      )}

                      {isActive && (
                        <Button
                          size="sm"
                          className="w-full bg-success hover:bg-success/90"
                          onClick={() => unblockAccount(acc.target_uuid)}
                        >
                          <Unlock className="w-4 h-4 ml-1" />
                          فك الحظر
                        </Button>
                      )}
                    </div>
                  );
                })}

                {blockedAccounts.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Ban className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>لا توجد حسابات محظورة</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
